-- Continue ALREADY-ASSIGNED capability investigations using the SAME
-- owner-delegated evidence-only worker and ledger. A schedule is no longer a
-- terminal result; the employee receives a durable investigation receipt.
alter table reality_internal.owner_capability_employee_schedule_v1
 drop constraint owner_capability_employee_schedule_v1_phase_check;
alter table reality_internal.owner_capability_employee_schedule_v1
 add constraint owner_capability_employee_schedule_v1_phase_check
 check(phase in (
  'CLAIMED_FOR_ROLE_TRIAGE',
  'INQUIRY_SCHEDULED_REQUIRES_INDEPENDENT_GAP_PROOF',
  'INQUIRY_CLAIMED',
  'INQUIRY_RECORDED_NEEDS_INDEPENDENT_GAP_PROOF',
  'INQUIRY_BLOCKED_NEEDS_PROVIDER_PROOF',
  'BLOCKED_UNVERIFIED'
 ));
alter table reality_internal.owner_capability_employee_schedule_v1
 add column if not exists inquiry_lease_id uuid,
 add column if not exists inquiry_claimed_at timestamptz,
 add column if not exists inquiry_recorded_at timestamptz,
 add column if not exists inquiry_model_response_id text,
 add column if not exists inquiry_receipt_sha256 text,
 add column if not exists inquiry_source_proof_sha256 text,
 add column if not exists inquiry_source_kind text,
 add column if not exists inquiry_question text,
 add column if not exists inquiry_findings text,
 add column if not exists inquiry_next_evidence_action text,
 add column if not exists inquiry_block_reason text;
alter table reality_internal.owner_capability_employee_schedule_v1
 add constraint owner_capability_inquiry_receipt_scope_v1
 check(
  (inquiry_receipt_sha256 is null or inquiry_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$')
  and (inquiry_source_proof_sha256 is null or
    inquiry_source_proof_sha256 ~ '^sha256:[a-f0-9]{64}$')
  and (inquiry_model_response_id is null or
    inquiry_model_response_id ~ '^resp_[A-Za-z0-9_-]{4,160}$')
  and (phase<>'INQUIRY_RECORDED_NEEDS_INDEPENDENT_GAP_PROOF' or
   (inquiry_lease_id is not null and inquiry_recorded_at is not null
    and inquiry_model_response_id is not null
    and inquiry_receipt_sha256 is not null
    and inquiry_source_kind is not null
    and inquiry_question is not null
    and inquiry_findings is not null
    and inquiry_next_evidence_action is not null))
 );

create or replace function public.reality_claim_next_scheduled_capability_inquiry_v1()
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare g reality_internal.owner_routine_delegations_v1%rowtype;
 t reality_internal.owner_capability_employee_schedule_v1%rowtype;
 feed jsonb;found_item jsonb;fp text;
begin
 if current_user<>'service_role'
 then raise exception 'SCHEDULED_CAPABILITY_INQUIRY_SERVICE_WORKER_REQUIRED';end if;
 for g in select * from reality_internal.owner_routine_delegations_v1
  where enabled=true and expires_at>clock_timestamp()
  and scope='EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1'
  and (case when daily_date=current_date then daily_reserved else 0 end)
   <max_daily_inquiries
  order by last_reserved_at nulls first,updated_at
  for update skip locked
 loop
  select * into t from reality_internal.owner_capability_employee_schedule_v1
  where owner_id=g.owner_id
   and phase='INQUIRY_SCHEDULED_REQUIRES_INDEPENDENT_GAP_PROOF'
   and planned_inquiry_at<=clock_timestamp()
   and assigned_employee is not null and independent_reviewer is not null
   and assigned_employee<>independent_reviewer
   and model_response_id ~ '^resp_[A-Za-z0-9_-]{4,160}$'
   and source_url ~ '^https://'
  order by priority,planned_inquiry_at,claimed_at
  limit 1 for update skip locked;
  if not found then continue;end if;
  feed:=public.reality_read_owner_capability_gap_feed_v1(g.owner_id);
  if feed->>'status'<>'OWNER_GAP_INTAKE_RECONCILED' or
    feed->>'owner_id'<>g.owner_id::text or
    feed->>'ok'<>'true' or feed->>'read_only'<>'true' or
    feed->>'production_changed'<>'false'
  then raise exception 'SCHEDULED_CAPABILITY_CURRENT_FEED_PROOF_UNAVAILABLE';end if;
  select value into found_item from pg_catalog.jsonb_array_elements(feed->'items') value
  where value->>'key'=t.capability_key limit 1;
  if not found or found_item->>'executable_job'<>'false'
    or found_item->>'verified_missing_capability'<>'false'
    or found_item->>'installation_authorized'<>'false'
    or found_item->>'source_url'<>t.source_url
  then
   update reality_internal.owner_capability_employee_schedule_v1
   set phase='INQUIRY_BLOCKED_NEEDS_PROVIDER_PROOF',
    inquiry_block_reason='SOURCE_EPOCH_OR_CURRENT_PROOF_UNVERIFIED',
    inquiry_recorded_at=clock_timestamp()
   where claim_id=t.claim_id;
   continue;
  end if;
  fp:=pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(found_item::text,'UTF8')),'hex');
  if fp<>t.evidence_fingerprint then
   update reality_internal.owner_capability_employee_schedule_v1
   set phase='INQUIRY_BLOCKED_NEEDS_PROVIDER_PROOF',
    inquiry_block_reason='SOURCE_EPOCH_OR_CURRENT_PROOF_UNVERIFIED',
    inquiry_recorded_at=clock_timestamp()
   where claim_id=t.claim_id;
   continue;
  end if;
  update reality_internal.owner_capability_employee_schedule_v1
  set phase='INQUIRY_CLAIMED',inquiry_lease_id=gen_random_uuid(),
   inquiry_claimed_at=clock_timestamp()
  where claim_id=t.claim_id
   and phase='INQUIRY_SCHEDULED_REQUIRES_INDEPENDENT_GAP_PROOF'
  returning * into t;
  if not found then continue;end if;
  update reality_internal.owner_routine_delegations_v1
  set daily_reserved=case when daily_date=current_date then daily_reserved+1 else 1 end,
   daily_date=current_date,last_reserved_at=clock_timestamp(),
   updated_at=clock_timestamp()
  where owner_id=g.owner_id;
  return pg_catalog.jsonb_build_object(
   'status','OWNER_SCHEDULED_CAPABILITY_INQUIRY_LEASED',
   'owner_id',t.owner_id,'claim_id',t.claim_id,'inquiry_lease_id',t.inquiry_lease_id,
   'capability_key',t.capability_key,'evidence_fingerprint',t.evidence_fingerprint,
   'source_url',t.source_url,'source_last_seen_at',t.source_last_seen_at,
   'source_title',t.source_title,'source_kind',t.capability_kind,
   'assigned_employee',t.assigned_employee,
   'independent_reviewer',t.independent_reviewer,
   'investigation_scope',t.investigation_scope,
   'independent_test_requirement',t.independent_test_requirement,
   'source_observation',found_item,
   'scope',g.scope,'model_inquiry_authorized',true,
   'original_job_created',false,'verified_current_gap',false,
   'execution_authorized',false,'installation_authorized',false,
   'production_changed',false);
 end loop;
 return pg_catalog.jsonb_build_object(
  'status','NO_STANDING_SCHEDULED_CAPABILITY_INQUIRY_DUE',
  'model_inquiry_authorized',false,'original_job_created',false,
  'verified_current_gap',false,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;

create or replace function public.reality_record_scheduled_capability_inquiry_v1(
 p_owner_id uuid,p_claim_id uuid,p_inquiry_lease_id uuid,
 p_capability_key text,p_evidence_fingerprint text,
 p_inquiry_model_response_id text,p_source_kind text,
 p_source_proof_sha256 text,p_question text,
 p_findings text,p_next_evidence_action text)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare t reality_internal.owner_capability_employee_schedule_v1%rowtype;
 proof jsonb;hash text;
begin
 if current_user<>'service_role' or p_owner_id is null or
  p_claim_id is null or p_inquiry_lease_id is null or
  p_capability_key is null or
  p_evidence_fingerprint !~ '^[a-f0-9]{64}$' or
  p_inquiry_model_response_id !~ '^resp_[A-Za-z0-9_-]{4,160}$' or
  p_source_kind not in ('GITHUB_ISSUE_INDEPENDENT_READBACK',
   'HISTORICAL_SOURCE_REQUIRES_CURRENT_PROVIDER_READBACK') or
  (p_source_proof_sha256 is not null and
   p_source_proof_sha256 !~ '^sha256:[a-f0-9]{64}$') or
  length(trim(coalesce(p_question,''))) not between 15 and 1000 or
  length(trim(coalesce(p_findings,''))) not between 30 and 1500 or
  length(trim(coalesce(p_next_evidence_action,''))) not between 30 and 1600
 then raise exception 'SCHEDULED_CAPABILITY_INQUIRY_EXACT_EVIDENCE_REQUIRED';end if;
 select * into t
 from reality_internal.owner_capability_employee_schedule_v1
 where owner_id=p_owner_id and claim_id=p_claim_id
  and capability_key=p_capability_key
  and evidence_fingerprint=p_evidence_fingerprint
  and inquiry_lease_id=p_inquiry_lease_id
  and phase='INQUIRY_CLAIMED'
 for update;
 if not found then raise exception 'SCHEDULED_CAPABILITY_INQUIRY_LEASE_STALE';end if;
 if not exists(select 1 from reality_internal.owner_routine_delegations_v1 g
  where g.owner_id=p_owner_id and g.enabled=true
   and g.expires_at>clock_timestamp()
   and g.scope='EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1')
 then raise exception 'SCHEDULED_CAPABILITY_OWNER_GRANT_REVOKED';end if;
 proof:=pg_catalog.jsonb_build_object(
  'owner_id',p_owner_id,'claim_id',p_claim_id,
  'inquiry_lease_id',p_inquiry_lease_id,'capability_key',p_capability_key,
  'source_fingerprint',p_evidence_fingerprint,
  'assigned_employee',t.assigned_employee,
  'independent_reviewer',t.independent_reviewer,
  'model_response_id',p_inquiry_model_response_id,
  'source_kind',p_source_kind,'source_proof_sha256',p_source_proof_sha256,
  'question',p_question,'findings',p_findings,
  'next_evidence_action',p_next_evidence_action,
  'independent_current_gap_verified',false,
  'original_job_created',false,'execution_authorized',false,
  'installation_authorized',false);
 hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(proof::text,'UTF8')),'hex');
 update reality_internal.owner_capability_employee_schedule_v1
 set phase='INQUIRY_RECORDED_NEEDS_INDEPENDENT_GAP_PROOF',
  inquiry_recorded_at=clock_timestamp(),
  inquiry_model_response_id=p_inquiry_model_response_id,
  inquiry_receipt_sha256=hash,
  inquiry_source_proof_sha256=p_source_proof_sha256,
  inquiry_source_kind=p_source_kind,
  inquiry_question=trim(p_question),
  inquiry_findings=trim(p_findings),
  inquiry_next_evidence_action=trim(p_next_evidence_action)
 where owner_id=p_owner_id and claim_id=p_claim_id
  and inquiry_lease_id=p_inquiry_lease_id and phase='INQUIRY_CLAIMED'
 returning * into t;
 if not found then raise exception 'SCHEDULED_CAPABILITY_INQUIRY_REPLAY';end if;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_SCHEDULED_CAPABILITY_INQUIRY_RECORDED',
  'owner_id',t.owner_id,'claim_id',t.claim_id,
  'capability_key',t.capability_key,
  'assigned_employee',t.assigned_employee,
  'independent_reviewer',t.independent_reviewer,
  'inquiry_receipt_sha256',t.inquiry_receipt_sha256,
  'inquiry_source_kind',t.inquiry_source_kind,
  'model_response_id',t.inquiry_model_response_id,
  'independent_current_gap_verified',false,
  'original_job_created',false,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;
create or replace function public.reality_block_scheduled_capability_inquiry_v1(
 p_owner_id uuid,p_claim_id uuid,p_inquiry_lease_id uuid,
 p_reason text)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
begin
 if current_user<>'service_role' or p_owner_id is null or
  p_claim_id is null or p_inquiry_lease_id is null or
  p_reason not in ('SOURCE_PROVIDER_UNAVAILABLE',
   'MODEL_OR_REVIEW_PROOF_UNAVAILABLE','SIGNED_WORKER_INQUIRY_TIMED_OUT')
 then raise exception 'CAPABILITY_INQUIRY_FAILURE_OWNER_SCOPE_REQUIRED';end if;
 update reality_internal.owner_capability_employee_schedule_v1
 set phase='INQUIRY_BLOCKED_NEEDS_PROVIDER_PROOF',
  inquiry_block_reason=p_reason,
  inquiry_recorded_at=clock_timestamp()
 where owner_id=p_owner_id and claim_id=p_claim_id
  and inquiry_lease_id=p_inquiry_lease_id
  and phase='INQUIRY_CLAIMED';
 return pg_catalog.jsonb_build_object(
  'status','OWNER_SCHEDULED_CAPABILITY_INQUIRY_BLOCKED',
  'original_job_created',false,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;
create or replace function reality_internal.reconcile_stalled_scheduled_capability_inquiries_v1()
returns text language plpgsql security invoker set search_path to '' as $fn$
declare n integer;
begin
 update reality_internal.owner_capability_employee_schedule_v1
 set phase='INQUIRY_BLOCKED_NEEDS_PROVIDER_PROOF',
  inquiry_block_reason='SIGNED_WORKER_INQUIRY_TIMED_OUT',
  inquiry_recorded_at=clock_timestamp()
 where phase='INQUIRY_CLAIMED'
 and inquiry_claimed_at<clock_timestamp()-interval '10 minutes';
 get diagnostics n=row_count;
 return 'SCHEDULED_CAPABILITY_INQUIRY_STALE_CLAIMS_FENCED_'||n;
end $fn$;
revoke execute on function public.reality_claim_next_scheduled_capability_inquiry_v1()
 from public,anon,authenticated;
revoke execute on function public.reality_record_scheduled_capability_inquiry_v1(uuid,uuid,uuid,text,text,text,text,text,text,text,text)
 from public,anon,authenticated;
revoke execute on function public.reality_block_scheduled_capability_inquiry_v1(uuid,uuid,uuid,text)
 from public,anon,authenticated;
grant execute on function public.reality_claim_next_scheduled_capability_inquiry_v1()
 to service_role;
grant execute on function public.reality_record_scheduled_capability_inquiry_v1(uuid,uuid,uuid,text,text,text,text,text,text,text,text)
 to service_role;
grant execute on function public.reality_block_scheduled_capability_inquiry_v1(uuid,uuid,uuid,text)
 to service_role;
-- Existing watchdog now also fences abandoned inquiries.
do $watchdog$
declare v_id bigint;v_command text;
begin
 select jobid,command into strict v_id,v_command
 from cron.job where jobname='reality-governed-wake-watchdog-v1'
 and active=true and schedule='* * * * *'
 and command like '%reconcile_incident_existing_original_handoff_v1%';
 if position('reconcile_stalled_scheduled_capability_inquiries_v1' in v_command)>0
 then return;end if;
 perform cron.alter_job(v_id,command=>v_command||
  E'\nSELECT reality_internal.reconcile_stalled_scheduled_capability_inquiries_v1();');
end $watchdog$;
