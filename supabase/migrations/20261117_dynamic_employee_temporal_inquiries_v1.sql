-- Reality temporal inquiry: dynamic model questions over existing owner-scoped
-- employee discovery. A question is a source-grounded investigation receipt,
-- NEVER an executable original job or shift/install authorization.
create table if not exists reality_internal.employee_temporal_inquiries_v1 (
 owner_id uuid not null,
 employee text not null check(length(employee) between 1 and 160),
 source_ref text not null check(length(source_ref) between 10 and 1024),
 evidence_sha256 text not null check(evidence_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 claim_id uuid not null default gen_random_uuid(),
 phase text not null default 'CLAIMED' check(phase in ('CLAIMED','RECORDED','BLOCKED')),
 source_scan_at timestamptz not null,
 claimed_at timestamptz not null default clock_timestamp(),
 provider_proof_sha256 text check(provider_proof_sha256 is null or provider_proof_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 provider_checked_at timestamptz,
 model_response_id text,
 question text,
 investigation text,
 next_proof text,
 recommendation text check(recommendation is null or recommendation in ('INVESTIGATE_MORE','OWNER_REVIEW','NO_NEW_WORK')),
 finished_at timestamptz,
 primary key(owner_id,employee,source_ref,evidence_sha256),
 unique(claim_id),
 check(phase <> 'RECORDED' or
  (question is not null and investigation is not null and next_proof is not null
   and provider_proof_sha256 is not null and model_response_id is not null))
);
alter table reality_internal.employee_temporal_inquiries_v1 enable row level security;
revoke all on reality_internal.employee_temporal_inquiries_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.employee_temporal_inquiries_v1 to service_role;

create or replace function public.reality_claim_owner_employee_time_inquiry_v1(p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare s record; v reality_internal.employee_temporal_inquiries_v1%rowtype;
begin
 if current_user <> 'service_role' or p_owner_id is null then
  raise exception 'TIME_INQUIRY_SERVICE_OWNER_REQUIRED';end if;
 -- The already reconciled owner discovery inventory is the source of truth.
 -- A source may be reviewed only while its role inventory is fresh.
 select o.* into s
 from reality_internal.employee_discovery_observations_v1 o
 join reality_internal.employee_discovery_role_coverage_v1 c
  on c.owner_id=o.owner_id and c.employee=o.employee
 where o.owner_id=p_owner_id
  and o.disposition in ('NEEDS_CURRENT_VALIDATION','HISTORICAL_REVALIDATION_REQUIRED')
  and o.qualified_job_created=false and o.shift_authorized=false
  and o.installation_authorized=false and o.production_changed=false
  and c.execution_authorized=false and c.qualified_jobs=0
  and c.checked_at>=clock_timestamp()-interval '12 hours'
  and o.last_reconciled_at>=clock_timestamp()-interval '12 hours'
  and o.evidence_sha256 ~ '^sha256:[a-f0-9]{64}$'
  and (o.source_ref ~ '^https://github.com/[^/]+/[^/]+/issues/[1-9][0-9]*$'
    or o.source_ref ~ '^https://github.com/[^/]+/[^/]+/pull/[1-9][0-9]*$')
  and not exists (
   select 1 from reality_internal.employee_temporal_inquiries_v1 z
   where z.owner_id=o.owner_id and z.employee=o.employee
    and z.source_ref=o.source_ref and z.evidence_sha256=o.evidence_sha256)
 order by o.last_reconciled_at desc,o.employee,o.source_ref
 limit 1 for update of o skip locked;
 if not found then return jsonb_build_object(
  'status','NO_FRESH_UNSETTLED_EMPLOYEE_INQUIRY_SOURCE',
  'model_called',false,'new_original_jobs_created',0,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false);end if;
 insert into reality_internal.employee_temporal_inquiries_v1(
  owner_id,employee,source_ref,evidence_sha256,source_scan_at)
 values(s.owner_id,s.employee,s.source_ref,s.evidence_sha256,s.last_reconciled_at)
 on conflict do nothing returning * into v;
 if not found then return jsonb_build_object(
  'status','SOURCE_INQUIRY_ALREADY_CLAIMED_NO_REPLAY',
  'model_called',false,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false);end if;
 return jsonb_build_object(
  'status','OWNER_SOURCE_INQUIRY_CLAIMED','owner_id',v.owner_id,
  'employee',v.employee,'source_ref',v.source_ref,
  'source_title',s.title,'source_family',s.source_family,
  'evidence_sha256',v.evidence_sha256,'claim_id',v.claim_id,
  'source_scan_at',v.source_scan_at,
  'model_call_leased',true,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;

create or replace function public.reality_record_owner_employee_time_inquiry_v1(
 p_claim_id uuid,p_owner_id uuid,p_provider_proof_sha256 text,
 p_provider_checked_at timestamptz,p_model_response_id text,
 p_question text,p_investigation text,p_next_proof text,p_recommendation text)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare v reality_internal.employee_temporal_inquiries_v1%rowtype;
begin
 if current_user <> 'service_role' or p_claim_id is null or p_owner_id is null then
  raise exception 'TIME_INQUIRY_RECORD_SERVICE_OWNER_REQUIRED';end if;
 if p_provider_proof_sha256 !~ '^sha256:[a-f0-9]{64}$'
  or p_model_response_id !~ '^resp_[A-Za-z0-9_-]{4,160}$'
  or p_provider_checked_at is null or
   p_provider_checked_at < clock_timestamp()-interval '15 minutes'
  or p_provider_checked_at > clock_timestamp()+interval '2 minutes'
  or length(trim(coalesce(p_question,''))) not between 15 and 900
  or length(trim(coalesce(p_investigation,''))) not between 20 and 2500
  or length(trim(coalesce(p_next_proof,''))) not between 15 and 1500
  or p_recommendation not in ('INVESTIGATE_MORE','OWNER_REVIEW','NO_NEW_WORK')
 then raise exception 'TIME_INQUIRY_MODEL_OR_PROVIDER_RESULT_INVALID';end if;
 update reality_internal.employee_temporal_inquiries_v1 t
 set phase='RECORDED',provider_proof_sha256=p_provider_proof_sha256,
     provider_checked_at=p_provider_checked_at,model_response_id=p_model_response_id,
     question=trim(p_question),investigation=trim(p_investigation),
     next_proof=trim(p_next_proof),recommendation=p_recommendation,
     finished_at=clock_timestamp()
 where t.claim_id=p_claim_id and t.owner_id=p_owner_id and t.phase='CLAIMED'
  and exists (select 1
   from reality_internal.employee_discovery_observations_v1 o
   join reality_internal.employee_discovery_role_coverage_v1 c
    on c.owner_id=o.owner_id and c.employee=o.employee
   where o.owner_id=t.owner_id and o.employee=t.employee
    and o.source_ref=t.source_ref and o.evidence_sha256=t.evidence_sha256
    and o.disposition in ('NEEDS_CURRENT_VALIDATION','HISTORICAL_REVALIDATION_REQUIRED')
    and o.qualified_job_created=false and o.production_changed=false
    and c.checked_at>=clock_timestamp()-interval '12 hours'
    and o.last_reconciled_at>=clock_timestamp()-interval '12 hours')
 returning * into v;
 if not found then raise exception 'TIME_INQUIRY_STALE_OR_REPLAYED_CLAIM';end if;
 return jsonb_build_object('status','EMPLOYEE_INQUIRY_DURABLY_RECORDED',
  'owner_id',v.owner_id,'employee',v.employee,'source_ref',v.source_ref,
  'evidence_sha256',v.evidence_sha256,'claim_id',v.claim_id,
  'provider_proof_sha256',v.provider_proof_sha256,
  'question',v.question,'investigation',v.investigation,
  'next_proof',v.next_proof,'recommendation',v.recommendation,
  'investigation_only',true,'new_original_jobs_created',0,
  'execution_authorized',false,'installation_authorized',false,
  'production_changed',false);
end $fn$;

create or replace function public.reality_block_owner_employee_time_inquiry_v1(
 p_claim_id uuid,p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare v reality_internal.employee_temporal_inquiries_v1%rowtype;
begin
 if current_user <> 'service_role' or p_claim_id is null or p_owner_id is null
 then raise exception 'TIME_INQUIRY_BLOCK_SERVICE_OWNER_REQUIRED';end if;
 update reality_internal.employee_temporal_inquiries_v1
 set phase='BLOCKED',finished_at=clock_timestamp()
 where claim_id=p_claim_id and owner_id=p_owner_id and phase='CLAIMED'
 returning * into v;
 return jsonb_build_object('status',case when found then
  'EMPLOYEE_INQUIRY_BLOCKED_NO_REPLAY' else 'EMPLOYEE_INQUIRY_NO_CLAIM_TO_BLOCK' end,
  'model_result_accepted',false,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;

create or replace function public.reality_read_owner_employee_time_inquiries_v1(p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare v jsonb;
begin
 if current_user <> 'service_role' or p_owner_id is null then
  raise exception 'TIME_INQUIRY_READ_SERVICE_OWNER_REQUIRED';end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'employee',t.employee,'source_ref',t.source_ref,
  'evidence_sha256',t.evidence_sha256,
  'source_proof_sha256',t.provider_proof_sha256,
  'question',t.question,'investigation',t.investigation,
  'next_proof',t.next_proof,'recommendation',t.recommendation,
  'recorded_at',t.finished_at,
  'qualified_executable_job',false,'execution_authorized',false)
  order by t.finished_at desc),'[]'::jsonb)
 into v from (
  select t.* from reality_internal.employee_temporal_inquiries_v1 t
  join reality_internal.employee_discovery_observations_v1 o
   on o.owner_id=t.owner_id and o.employee=t.employee
    and o.source_ref=t.source_ref and o.evidence_sha256=t.evidence_sha256
  join reality_internal.employee_discovery_role_coverage_v1 c
   on c.owner_id=t.owner_id and c.employee=t.employee
  where t.owner_id=p_owner_id and t.phase='RECORDED'
   and o.disposition in ('NEEDS_CURRENT_VALIDATION','HISTORICAL_REVALIDATION_REQUIRED')
   and c.checked_at>=clock_timestamp()-interval '12 hours'
   and o.last_reconciled_at>=clock_timestamp()-interval '12 hours'
  order by t.finished_at desc limit 80
 ) t;
 return jsonb_build_object('status','OWNER_EMPLOYEE_INQUIRIES_READ_ONLY',
 'owner_scope_verified',true,'read_only',true,
 'items',v,'count',jsonb_array_length(v),
 'qualified_executable_jobs',0,'new_original_jobs_created',0,
 'execution_authorized',false,'installation_authorized',false,
 'production_changed',false);
end $fn$;

revoke execute on function public.reality_claim_owner_employee_time_inquiry_v1(uuid) from public,anon,authenticated;
revoke execute on function public.reality_record_owner_employee_time_inquiry_v1(uuid,uuid,text,timestamptz,text,text,text,text,text) from public,anon,authenticated;
revoke execute on function public.reality_block_owner_employee_time_inquiry_v1(uuid,uuid) from public,anon,authenticated;
revoke execute on function public.reality_read_owner_employee_time_inquiries_v1(uuid) from public,anon,authenticated;
grant execute on function public.reality_claim_owner_employee_time_inquiry_v1(uuid) to service_role;
grant execute on function public.reality_record_owner_employee_time_inquiry_v1(uuid,uuid,text,timestamptz,text,text,text,text,text) to service_role;
grant execute on function public.reality_block_owner_employee_time_inquiry_v1(uuid,uuid) to service_role;
grant execute on function public.reality_read_owner_employee_time_inquiries_v1(uuid) to service_role;
