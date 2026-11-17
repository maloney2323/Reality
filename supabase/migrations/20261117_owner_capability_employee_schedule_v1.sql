-- Capability opportunities are assigned to Reality's EXISTING employee roles.
-- The only automatic authorization is the owner's expiring, bounded
-- evidence-only grant. Original jobs still require existing signed warrants.
create table if not exists reality_internal.owner_capability_employee_schedule_v1(
 owner_id uuid not null,
 capability_key text not null check(length(capability_key) between 3 and 180),
 evidence_fingerprint text not null check(evidence_fingerprint ~ '^[a-f0-9]{64}$'),
 claim_id uuid not null unique default gen_random_uuid(),
 phase text not null default 'CLAIMED_FOR_ROLE_TRIAGE'
  check(phase in ('CLAIMED_FOR_ROLE_TRIAGE','INQUIRY_SCHEDULED_REQUIRES_INDEPENDENT_GAP_PROOF','BLOCKED_UNVERIFIED')),
 source_title text not null,
 source_url text,
 source_last_seen_at timestamptz,
 priority integer not null check(priority between 0 and 10),
 capability_kind text not null,
 assigned_employee text,
 assigned_function_id text,
 independent_reviewer text,
 reviewer_function_id text,
 role_rationale text,
 investigation_scope text,
 independent_test_requirement text,
 evidence_limitations text,
 provisional_minutes_low integer,
 provisional_minutes_high integer,
 model_response_id text,
 planned_inquiry_at timestamptz,
 claimed_at timestamptz not null default clock_timestamp(),
 recorded_at timestamptz,
 primary key(owner_id,capability_key,evidence_fingerprint),
 check(phase <> 'INQUIRY_SCHEDULED_REQUIRES_INDEPENDENT_GAP_PROOF' or (
  assigned_employee is not null and assigned_function_id is not null
  and independent_reviewer is not null and reviewer_function_id is not null
  and assigned_employee<>independent_reviewer
  and role_rationale is not null and investigation_scope is not null
  and independent_test_requirement is not null
  and evidence_limitations is not null
  and model_response_id is not null
  and provisional_minutes_low is not null
  and provisional_minutes_high is not null
  and provisional_minutes_low<=provisional_minutes_high
  and planned_inquiry_at is not null
 ))
);
alter table reality_internal.owner_capability_employee_schedule_v1 enable row level security;
revoke all on reality_internal.owner_capability_employee_schedule_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.owner_capability_employee_schedule_v1 to service_role;
create index if not exists owner_capability_employee_schedule_owner_v1
 on reality_internal.owner_capability_employee_schedule_v1(owner_id,phase,priority,planned_inquiry_at);

-- Atomically reserve one owner-enabled capability triage per signed worker
-- wake. This is an investigation budget reservation, NEVER job admission.
create or replace function public.reality_claim_next_standing_capability_schedule_v1()
returns jsonb language plpgsql security invoker set search_path to '' as $f$
declare g reality_internal.owner_routine_delegations_v1%rowtype;
 feed jsonb; candidate jsonb; item jsonb; fp text;
 record_v reality_internal.owner_capability_employee_schedule_v1%rowtype;
begin
 if current_user<>'service_role'
 then raise exception 'CAPABILITY_CLAIM_SIGNED_SERVICE_REQUIRED';end if;
 for g in select * from reality_internal.owner_routine_delegations_v1
  where enabled=true and scope='EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1'
   and expires_at>clock_timestamp()
   and (case when daily_date=current_date then daily_reserved else 0 end)
    <max_daily_inquiries
  order by last_reserved_at nulls first,updated_at
  for update skip locked
 loop
  feed:=public.reality_read_owner_capability_gap_feed_v1(g.owner_id);
  if feed->>'status'<>'OWNER_GAP_INTAKE_RECONCILED'
   or feed->>'ok'<>'true' or feed->>'owner_id'<>g.owner_id::text
   or feed->>'read_only'<>'true' or feed->>'production_changed'<>'false'
   or pg_catalog.jsonb_typeof(feed->'items')<>'array'
   or pg_catalog.jsonb_array_length(feed->'items')>20
  then continue;end if;
  candidate:=null;
  for item in
   select value from pg_catalog.jsonb_array_elements(feed->'items') value
   where value->>'executable_job'='false'
    and value->>'installation_authorized'='false'
    and value->>'verified_missing_capability'='false'
    and value->>'kind' in
     ('RESEARCH_OPPORTUNITY','INDEPENDENTLY_TESTED_CANDIDATE',
      'FROZEN_UNBOUND_SOURCE','VERIFIED_SOURCE_CANDIDATE')
   order by
    case when value->>'priority'~'^[0-9]{1,2}$'
     then (value->>'priority')::integer else 9 end,
    value->>'key'
  loop
   if length(item->>'key') not between 3 and 180 or
     length(item->>'title') not between 8 and 240 or
     (item->>'source_url') !~ '^https://'
   then continue;end if;
   fp:=pg_catalog.encode(pg_catalog.sha256(
      pg_catalog.convert_to(item::text,'UTF8')),'hex');
   if exists(select 1 from reality_internal.owner_capability_employee_schedule_v1 t
    where t.owner_id=g.owner_id and t.capability_key=item->>'key'
     and t.evidence_fingerprint=fp) then continue;end if;
   candidate:=item;
   exit;
  end loop;
  if candidate is null then continue;end if;
  insert into reality_internal.owner_capability_employee_schedule_v1(
   owner_id,capability_key,evidence_fingerprint,source_title,
   source_url,source_last_seen_at,priority,capability_kind)
  values(g.owner_id,candidate->>'key',fp,candidate->>'title',
    candidate->>'source_url',
    case when (candidate->>'last_seen_at')~'^20[0-9]{2}-'
     then (candidate->>'last_seen_at')::timestamptz else null end,
    case when (candidate->>'priority')~'^[0-9]{1,2}$'
      then least((candidate->>'priority')::integer,10) else 9 end,
    candidate->>'kind')
  on conflict do nothing returning * into record_v;
  if not found then continue;end if;
  update reality_internal.owner_routine_delegations_v1
   set daily_reserved=case when daily_date=current_date
      then daily_reserved+1 else 1 end,
    daily_date=current_date,last_reserved_at=clock_timestamp(),
    updated_at=clock_timestamp()
   where owner_id=g.owner_id;
  return pg_catalog.jsonb_build_object(
   'status','STANDING_CAPABILITY_ROLE_TRIAGE_CLAIMED',
   'owner_id',g.owner_id,'claim_id',record_v.claim_id,
   'capability_key',record_v.capability_key,
   'evidence_fingerprint',record_v.evidence_fingerprint,
   'source_title',record_v.source_title,'source_url',record_v.source_url,
   'source_last_seen_at',record_v.source_last_seen_at,
   'capability_kind',record_v.capability_kind,
   'priority',record_v.priority,
   'source_observation',candidate,'scope',g.scope,
   'model_triage_authorized',true,
   'execution_authorized',false,'new_original_jobs_created',0,
   'installation_authorized',false,'production_changed',false);
 end loop;
 return pg_catalog.jsonb_build_object(
  'status','NO_NEW_STANDING_CAPABILITY_REQUIRING_ROLE_TRIAGE',
  'model_triage_authorized',false,'new_original_jobs_created',0,
  'execution_authorized',false,'installation_authorized',false,
  'production_changed',false);
end $f$;

create or replace function public.reality_record_owner_capability_role_schedule_v1(
 p_owner_id uuid,p_claim_id uuid,p_evidence_fingerprint text,
 p_function_id text,p_employee text,p_reviewer_function_id text,p_reviewer text,
 p_rationale text,p_scope text,p_test_requirement text,p_limitations text,
 p_estimate_low integer,p_estimate_high integer,p_model_response_id text)
returns jsonb language plpgsql security invoker set search_path to '' as $f$
declare r reality_internal.owner_capability_employee_schedule_v1%rowtype;
 g reality_internal.owner_routine_delegations_v1%rowtype;
 current_item jsonb; current_feed jsonb; latest_fp text;
begin
 if current_user<>'service_role' or p_owner_id is null or p_claim_id is null
 then raise exception 'CAPABILITY_ROLE_RECORD_OWNER_REQUIRED';end if;
 if p_evidence_fingerprint !~ '^[a-f0-9]{64}$' or
    p_function_id !~ '^[a-z][a-z0-9_]{2,95}$' or
    p_reviewer_function_id !~ '^[a-z][a-z0-9_]{2,95}$' or
    p_function_id=p_reviewer_function_id or
    length(trim(coalesce(p_employee,''))) not between 2 and 100 or
    length(trim(coalesce(p_reviewer,''))) not between 2 and 100 or
    p_employee=p_reviewer or
    length(trim(coalesce(p_rationale,''))) not between 20 and 1000 or
    length(trim(coalesce(p_scope,''))) not between 20 and 1500 or
    length(trim(coalesce(p_test_requirement,''))) not between 20 and 1600 or
    length(trim(coalesce(p_limitations,''))) not between 15 and 1200 or
    p_estimate_low not between 15 and 1440 or
    p_estimate_high not between 15 and 2880 or
    p_estimate_low>p_estimate_high or
    p_model_response_id !~ '^resp_[A-Za-z0-9_-]{4,160}$'
 then raise exception 'CAPABILITY_ROLE_PROPOSAL_INVALID';end if;
 select * into g from reality_internal.owner_routine_delegations_v1
  where owner_id=p_owner_id and enabled=true
   and scope='EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1'
   and expires_at>clock_timestamp();
 if not found then raise exception 'CAPABILITY_STANDING_OWNER_GRANT_REVOKED';end if;
 select * into r from reality_internal.owner_capability_employee_schedule_v1
  where owner_id=p_owner_id and claim_id=p_claim_id
   and evidence_fingerprint=p_evidence_fingerprint
   and phase='CLAIMED_FOR_ROLE_TRIAGE' for update;
 if not found then raise exception 'CAPABILITY_ROLE_LEASE_STALE_OR_REPLAYED';end if;
 current_feed:=public.reality_read_owner_capability_gap_feed_v1(p_owner_id);
 select value into current_item from pg_catalog.jsonb_array_elements(
  current_feed->'items') value
 where value->>'key'=r.capability_key
 limit 1;
 if current_item is null or
  current_item->>'executable_job'<>'false' or
  current_item->>'installation_authorized'<>'false' or
  current_item->>'verified_missing_capability'<>'false'
 then raise exception 'CAPABILITY_ROLE_SOURCE_CHANGED_OR_QUALIFIED_ELSEWHERE';end if;
 latest_fp:=pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(current_item::text,'UTF8')),'hex');
 if latest_fp<>r.evidence_fingerprint
 then raise exception 'CAPABILITY_ROLE_EVIDENCE_DRIFT_NO_REPLAY';end if;
 update reality_internal.owner_capability_employee_schedule_v1
  set phase='INQUIRY_SCHEDULED_REQUIRES_INDEPENDENT_GAP_PROOF',
  assigned_employee=p_employee,assigned_function_id=p_function_id,
  independent_reviewer=p_reviewer,reviewer_function_id=p_reviewer_function_id,
  role_rationale=trim(p_rationale),investigation_scope=trim(p_scope),
  independent_test_requirement=trim(p_test_requirement),
  evidence_limitations=trim(p_limitations),
  provisional_minutes_low=p_estimate_low,
  provisional_minutes_high=p_estimate_high,
  model_response_id=p_model_response_id,
  planned_inquiry_at=clock_timestamp(),recorded_at=clock_timestamp()
 where owner_id=p_owner_id and claim_id=p_claim_id
  and phase='CLAIMED_FOR_ROLE_TRIAGE'
 returning * into r;
 if not found then raise exception 'CAPABILITY_ROLE_RECORD_REPLAY';end if;
 return pg_catalog.jsonb_build_object(
  'status','EMPLOYEE_CAPABILITY_INVESTIGATION_SCHEDULED',
  'owner_id',r.owner_id,'claim_id',r.claim_id,
  'capability_key',r.capability_key,
  'evidence_fingerprint',r.evidence_fingerprint,
  'assigned_employee',r.assigned_employee,
  'assigned_function_id',r.assigned_function_id,
  'independent_reviewer',r.independent_reviewer,
  'reviewer_function_id',r.reviewer_function_id,
  'planned_inquiry_at',r.planned_inquiry_at,
  'estimate_minutes_low',r.provisional_minutes_low,
  'estimate_minutes_high',r.provisional_minutes_high,
  'estimated_only_not_measured',true,
  'independent_current_gap_proven',false,
  'existing_governed_worker_required',true,
  'execution_authorized',false,'new_original_jobs_created',0,
  'installation_authorized',false,'production_changed',false);
end $f$;

create or replace function public.reality_block_owner_capability_role_schedule_v1(
 p_owner_id uuid,p_claim_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $f$
begin
 if current_user<>'service_role' or p_owner_id is null or p_claim_id is null
 then raise exception 'CAPABILITY_ROLE_BLOCK_SERVICE_OWNER_REQUIRED';end if;
 update reality_internal.owner_capability_employee_schedule_v1
 set phase='BLOCKED_UNVERIFIED',recorded_at=clock_timestamp()
 where owner_id=p_owner_id and claim_id=p_claim_id and phase='CLAIMED_FOR_ROLE_TRIAGE';
 return pg_catalog.jsonb_build_object('status','CAPABILITY_ROLE_CLAIM_FENCED_NO_REPLAY',
  'original_job_admitted',false,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false);
end $f$;

-- A read-only reconciliation of assignments with THE ORIGINAL capability
-- queue's independent frozen-red receipt. No model or schedule can manufacture
-- an original work ID, verification, owner approval or executor grant.
create or replace function public.reality_read_owner_capability_employee_schedule_v1(p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $f$
declare result jsonb;
begin
 if current_user<>'service_role' or p_owner_id is null
 then raise exception 'CAPABILITY_SCHEDULE_OWNER_SERVICE_REQUIRED';end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
   'capability_key',t.capability_key,'evidence_fingerprint',t.evidence_fingerprint,
   'phase',t.phase,'employee',t.assigned_employee,
   'function_id',t.assigned_function_id,
   'reviewer',t.independent_reviewer,
   'reviewer_function_id',t.reviewer_function_id,
   'planned_inquiry_at',t.planned_inquiry_at,
   'assigned_at',t.recorded_at,
   'scope',t.investigation_scope,
   'independent_test_requirement',t.independent_test_requirement,
   'source_limitations',t.evidence_limitations,
   'estimate_minutes_low',t.provisional_minutes_low,
   'estimate_minutes_high',t.provisional_minutes_high,
   'estimate_is_model_provisional_only',true,
   'independent_current_gap_proven',(
    q.trigger_id is not null
    and q.verified_frozen_reproduction->>'status'='ORIGINAL_FROZEN_REPRODUCED_RED'
    and q.verified_frozen_reproduction->>'original_work_id'=q.original_work_id
   ),
   'existing_original_work_id',case when q.trigger_id is not null
    and q.verified_frozen_reproduction->>'status'='ORIGINAL_FROZEN_REPRODUCED_RED'
    and q.verified_frozen_reproduction->>'original_work_id'=q.original_work_id
     then q.original_work_id else null end,
   'existing_governance_phase',q.phase,
   'execution_authorized_by_schedule',false,
   'original_job_created_by_schedule',false,
   'installation_authorized',false
  ) order by t.priority,t.claimed_at),'[]'::jsonb)
 into result
 from (select t.* from reality_internal.owner_capability_employee_schedule_v1 t
  where t.owner_id=p_owner_id order by t.priority,t.claimed_at limit 50) t
 left join reality_internal.genuine_capability_queue_v1 q
  on t.capability_key='queue:'||q.trigger_id::text
   and q.owner_id=t.owner_id;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_CAPABILITY_EMPLOYEE_SCHEDULE_READ_ONLY',
  'owner_id',p_owner_id,'owner_scope_verified',true,'read_only',true,
  'items',result,'count',pg_catalog.jsonb_array_length(result),
  'new_original_jobs_created',0,'execution_authorized_by_schedule',false,
  'installation_authorized',false,'production_changed',false);
end $f$;
revoke execute on function public.reality_claim_next_standing_capability_schedule_v1() from public,anon,authenticated;
revoke execute on function public.reality_record_owner_capability_role_schedule_v1(uuid,uuid,text,text,text,text,text,text,text,text,text,integer,integer,text) from public,anon,authenticated;
revoke execute on function public.reality_block_owner_capability_role_schedule_v1(uuid,uuid) from public,anon,authenticated;
revoke execute on function public.reality_read_owner_capability_employee_schedule_v1(uuid) from public,anon,authenticated;
grant execute on function public.reality_claim_next_standing_capability_schedule_v1() to service_role;
grant execute on function public.reality_record_owner_capability_role_schedule_v1(uuid,uuid,text,text,text,text,text,text,text,text,text,integer,integer,text) to service_role;
grant execute on function public.reality_block_owner_capability_role_schedule_v1(uuid,uuid) to service_role;
grant execute on function public.reality_read_owner_capability_employee_schedule_v1(uuid) to service_role;
