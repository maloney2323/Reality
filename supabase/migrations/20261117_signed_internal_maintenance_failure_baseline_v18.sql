-- v18. A second actual signed employee wake independently rechecks the same
-- maintenance failure and the exact original frozen database evidence.
-- This is NOT a source-code CI RED, a tested patch, or an installed capability.
-- The separate CI gate remains closed until a real failing test is observed.
alter table reality_internal.owner_internal_maintenance_jobs_v1
 drop constraint owner_internal_maintenance_jobs_v1_handling_state_check;
alter table reality_internal.owner_internal_maintenance_jobs_v1
 add constraint owner_internal_maintenance_jobs_v1_handling_state_check
 check(handling_state in (
  'QUEUED','CLAIMED','SOURCE_REOBSERVED_NEEDS_FROZEN_TEST',
  'FAILURE_BASELINE_CLAIMED','FAILURE_BASELINE_REPRODUCED_NEEDS_CI_RED',
  'BLOCKED_INDEPENDENT_PROVIDER_UNVERIFIED'));
alter table reality_internal.owner_internal_maintenance_jobs_v1
 add column if not exists baseline_claim_id uuid,
 add column if not exists baseline_worker_run_id uuid,
 add column if not exists baseline_claimed_shift_id uuid,
 add column if not exists baseline_claimed_at timestamptz,
 add column if not exists baseline_attempts smallint not null default 0
  check(baseline_attempts between 0 and 2),
 add column if not exists independent_failure_baseline_receipt_sha256 text
  check(independent_failure_baseline_receipt_sha256 is null or
   independent_failure_baseline_receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 add column if not exists failure_baseline_kind text
  check(failure_baseline_kind is null or failure_baseline_kind in (
   'HISTORICAL_ZERO_ORIGINAL_CLAIMS_WITH_SIGNED_INQUIRIES',
   'HISTORICAL_SOURCE_EPOCH_MISMATCH_INDEPENDENTLY_REOBSERVED')),
 add column if not exists failure_baseline_observed_at timestamptz;

create or replace function public.reality_claim_signed_internal_maintenance_baseline_v1(
 p_shift_id uuid,p_worker_run_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare m reality_internal.owner_internal_maintenance_jobs_v1%rowtype;
 v_claim uuid;
begin
 if current_user<>'service_role' or p_shift_id is null or p_worker_run_id is null
 then raise exception 'SIGNED_MAINTENANCE_BASELINE_AUTHORITY_REQUIRED';end if;
 select m0.* into m
 from reality_internal.owner_internal_maintenance_jobs_v1 m0
 join reality_internal.governed_employee_shifts_v1 s
  on s.shift_id=p_shift_id and s.owner_id=m0.owner_id
 join reality_internal.governed_employee_shift_worker_pulses_v1 w
  on w.shift_id=s.shift_id and w.owner_id=s.owner_id
 join reality_internal.signed_worker_actual_runs_v1 run
  on run.run_id=p_worker_run_id and run.status='STARTED'
 where m0.handling_state='SOURCE_REOBSERVED_NEEDS_FROZEN_TEST'
  and m0.baseline_attempts<2
  and m0.claimed_worker_run_id<>p_worker_run_id
  and m0.independent_source_observation_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  and m0.last_source_sha256~'^sha256:[a-f0-9]{64}$'
  and m0.original_job_completed=false and m0.production_changed=false
  and m0.installation_authorized_by_discovery=false
  and m0.external_action_authorized_by_discovery=false
  and s.authorized_at is not null and s.closed_at is null
  and s.planned_start_at<=clock_timestamp()
  and s.planned_end_at>clock_timestamp()
  and s.status in('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  and w.last_worker_status='WAKE_RECEIVED'
  and w.last_worker_seen_at>clock_timestamp()-interval '3 minutes'
  and run.started_at>clock_timestamp()-interval '3 minutes'
 order by m0.created_at,m0.incident_id
 limit 1 for update of m0 skip locked;
 if not found then return jsonb_build_object(
  'status','NO_SIGNED_MAINTENANCE_BASELINE_READY',
  'original_job_completed',false,'repair_executed',false,
  'installation_authorized',false,'production_changed',false);end if;
 v_claim:=gen_random_uuid();
 update reality_internal.owner_internal_maintenance_jobs_v1
 set handling_state='FAILURE_BASELINE_CLAIMED',baseline_claim_id=v_claim,
  baseline_worker_run_id=p_worker_run_id,
  baseline_claimed_shift_id=p_shift_id,
  baseline_claimed_at=clock_timestamp(),
  baseline_attempts=baseline_attempts+1,last_seen_at=clock_timestamp()
 where incident_id=m.incident_id and owner_id=m.owner_id;
 return jsonb_build_object(
  'status','SIGNED_MAINTENANCE_BASELINE_CLAIMED',
  'maintenance_id',m.incident_id,'owner_id',m.owner_id,
  'origin_shift_id',m.origin_shift_id,
  'claim_shift_id',p_shift_id,'claim_id',v_claim,
  'worker_run_id',p_worker_run_id,
  'kind',m.maintenance_kind,'source_ref',m.source_ref,
  'assignee',m.assignee,'independent_reviewer',m.independent_reviewer,
  'last_source_sha256',m.last_source_sha256,
  'source_observation_receipt_sha256',
    m.independent_source_observation_receipt_sha256,
  'independent_review_receipt_sha256',m.independent_review_receipt_sha256,
  'original_job_completed',false,'repair_executed',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;

create or replace function public.reality_record_signed_internal_maintenance_baseline_v1(
 p_maintenance_id uuid,p_claim_id uuid,p_worker_run_id uuid,
 p_source_ref text,p_provider_sha256 text,p_checked_at timestamptz)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare m reality_internal.owner_internal_maintenance_jobs_v1%rowtype;
 b reality_internal.shift_business_qualification_reviews_v1%rowtype;
 r reality_internal.shift_continuity_independent_reviews_v1%rowtype;
 v_claims integer;v_inquiries integer;v_kind text;v_fingerprint text;
begin
 if current_user<>'service_role' or p_maintenance_id is null or
  p_claim_id is null or p_worker_run_id is null or p_source_ref is null or
  p_provider_sha256!~'^sha256:[a-f0-9]{64}$' or p_checked_at is null or
  p_checked_at<clock_timestamp()-interval '3 minutes' or
  p_checked_at>clock_timestamp()+interval '1 minute'
 then raise exception 'SIGNED_MAINTENANCE_BASELINE_PROOF_INVALID';end if;
 select * into m from reality_internal.owner_internal_maintenance_jobs_v1
 where incident_id=p_maintenance_id and baseline_claim_id=p_claim_id
  and baseline_worker_run_id=p_worker_run_id
  and source_ref=p_source_ref
  and last_source_sha256=p_provider_sha256
  and handling_state='FAILURE_BASELINE_CLAIMED'
  and baseline_claimed_at>clock_timestamp()-interval '3 minutes'
  and claimed_worker_run_id<>p_worker_run_id
  and original_job_completed=false and production_changed=false
 for update;
 if not found or not exists(
  select 1 from reality_internal.signed_worker_actual_runs_v1 run
   where run.run_id=p_worker_run_id and run.status='STARTED'
    and run.started_at>clock_timestamp()-interval '3 minutes'
 ) then raise exception 'SIGNED_MAINTENANCE_BASELINE_LEASE_UNVERIFIED';end if;
 if not exists(select 1 from reality_internal.governed_employee_shifts_v1 s
  where s.shift_id=m.baseline_claimed_shift_id and s.owner_id=m.owner_id
   and s.closed_at is null and s.planned_start_at<=clock_timestamp()
   and s.planned_end_at>clock_timestamp()
   and s.status in('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK'))
 then raise exception 'SIGNED_MAINTENANCE_BASELINE_SHIFT_UNAUTHORIZED';end if;
 -- Never use this historic baseline as if current code had failed a CI test.
 if m.maintenance_kind='EMPLOYEE_QUALIFICATION_HANDOFF_STALLED' then
  select * into b from reality_internal.shift_business_qualification_reviews_v1
  where incident_id=m.incident_id and owner_id=m.owner_id
   and shift_id=m.origin_shift_id and source_ref=m.source_ref
   and reviewer=m.independent_reviewer
   and status='NO_ORIGINAL_ADMISSION_CONFIRMED'
   and receipt_sha256=m.independent_review_receipt_sha256
   and original_claim_count=0 and prior_inquiry_count>=2
   and original_job_completed=false and repair_executed=false
   and installation_authorized=false and production_changed=false
   and completed_at is not null;
  if not found then raise exception 'MAINTENANCE_ORIGINAL_QUALIFICATION_RECEIPT_DRIFT';end if;
  select count(*) into v_claims
   from reality_internal.governed_employee_original_claims_v1 x
   where x.shift_id=m.origin_shift_id and x.owner_id=m.owner_id;
  select count(*) into v_inquiries
   from reality_internal.employee_temporal_inquiries_v1 t
   where t.owner_id=m.owner_id and t.phase='RECORDED'
    and t.finished_at between (select planned_start_at
     from reality_internal.governed_employee_shifts_v1
     where shift_id=m.origin_shift_id and owner_id=m.owner_id)
     and b.completed_at;
  if v_claims<>0 or v_inquiries<b.prior_inquiry_count
  then raise exception 'MAINTENANCE_ORIGINAL_QUALIFICATION_BASELINE_CHANGED';end if;
  v_kind:='HISTORICAL_ZERO_ORIGINAL_CLAIMS_WITH_SIGNED_INQUIRIES';
  v_fingerprint:=v_claims::text||':'||v_inquiries::text||':'||
    b.receipt_sha256||':'||b.completed_at::text;
 else
  select * into r from reality_internal.shift_continuity_independent_reviews_v1
  where incident_id=m.incident_id and owner_id=m.owner_id
   and shift_id=m.origin_shift_id and source_ref=m.source_ref
   and reviewer=m.independent_reviewer
   and status='SOURCE_CHANGED_NEEDS_FROZEN_TEST'
   and receipt_sha256=m.independent_review_receipt_sha256
   and previously_reviewed_sha256<>current_provider_sha256
   and original_job_completed=false and installation_authorized=false
   and production_changed=false and completed_at is not null;
  if not found then raise exception 'MAINTENANCE_SOURCE_EPOCH_BASELINE_CHANGED';end if;
  v_kind:='HISTORICAL_SOURCE_EPOCH_MISMATCH_INDEPENDENTLY_REOBSERVED';
  v_fingerprint:=r.previously_reviewed_sha256||':'||
   r.current_provider_sha256||':'||r.receipt_sha256;
 end if;
 update reality_internal.owner_internal_maintenance_jobs_v1
 set handling_state='FAILURE_BASELINE_REPRODUCED_NEEDS_CI_RED',
  failure_baseline_kind=v_kind,
  independent_failure_baseline_receipt_sha256='sha256:'||encode(sha256(
   convert_to(m.incident_id::text||':'||m.baseline_claim_id::text||':'||
    m.origin_shift_id::text||':'||m.independent_review_receipt_sha256||':'||
    m.independent_source_observation_receipt_sha256||':'||
    p_worker_run_id::text||':'||p_provider_sha256||':'||
    v_fingerprint,'UTF8')),'hex'),
  failure_baseline_observed_at=clock_timestamp(),last_seen_at=clock_timestamp()
 where incident_id=m.incident_id and owner_id=m.owner_id;
 return jsonb_build_object(
  'status','INTERNAL_MAINTENANCE_HISTORICAL_FAILURE_BASELINE_REPRODUCED',
  'maintenance_id',m.incident_id,'owner_id',m.owner_id,
  'origin_shift_id',m.origin_shift_id,'source_ref',m.source_ref,
  'baseline_kind',v_kind,
  'baseline_receipt_sha256',(select independent_failure_baseline_receipt_sha256
   from reality_internal.owner_internal_maintenance_jobs_v1
   where incident_id=m.incident_id),
  'next_action','RUN_INDEPENDENT_EXECUTABLE_FROZEN_CI_RED_BEFORE_MODEL_PATCH',
  'independent_frozen_ci_test_completed',false,
  'model_code_generated',false,'repair_executed',false,
  'original_job_completed',false,'installation_authorized',false,
  'production_changed',false);
end $fn$;

create or replace function reality_internal.reconcile_stale_internal_maintenance_baseline_v1()
returns integer language plpgsql security invoker set search_path='' as $fn$
declare n integer;
begin
 if current_user not in('postgres','service_role')
 then raise exception 'SIGNED_MAINTENANCE_BASELINE_WATCHDOG_REQUIRED';end if;
 update reality_internal.owner_internal_maintenance_jobs_v1 m
 set handling_state=case when baseline_attempts<2
  then 'SOURCE_REOBSERVED_NEEDS_FROZEN_TEST'
  else 'BLOCKED_INDEPENDENT_PROVIDER_UNVERIFIED' end,
  claim_failure_history=m.claim_failure_history||jsonb_build_array(
   jsonb_build_object('baseline_claim_id',m.baseline_claim_id,
    'baseline_worker_run_id',m.baseline_worker_run_id,
    'failure_code','HISTORICAL_BASELINE_SOURCE_OR_DATABASE_UNVERIFIED')),
  last_seen_at=clock_timestamp()
 where m.handling_state='FAILURE_BASELINE_CLAIMED'
  and m.baseline_claimed_at<clock_timestamp()-interval '4 minutes';
 get diagnostics n=row_count;
 return n;
end $fn$;
revoke execute on function public.reality_claim_signed_internal_maintenance_baseline_v1(uuid,uuid)
 from public,anon,authenticated;
revoke execute on function public.reality_record_signed_internal_maintenance_baseline_v1(uuid,uuid,uuid,text,text,timestamptz)
 from public,anon,authenticated;
revoke all on function reality_internal.reconcile_stale_internal_maintenance_baseline_v1()
 from public,anon,authenticated;
grant execute on function public.reality_claim_signed_internal_maintenance_baseline_v1(uuid,uuid)
 to service_role;
grant execute on function public.reality_record_signed_internal_maintenance_baseline_v1(uuid,uuid,uuid,text,text,timestamptz)
 to service_role;
grant execute on function reality_internal.reconcile_stale_internal_maintenance_baseline_v1()
 to service_role;
-- Reuse the proven one-minute watchdog; no new scheduler or authority.
do $watch$
declare j_id bigint;old_command text;
begin
 select jobid,command into strict j_id,old_command from cron.job
 where jobname='reality-governed-wake-watchdog-v1'
  and schedule='* * * * *' and active=true
  and command like '%reconcile_stale_internal_maintenance_claims_v1%';
 if position('reconcile_stale_internal_maintenance_baseline_v1' in old_command)=0 then
  perform cron.alter_job(j_id,command=>old_command||
   E'\nSELECT reality_internal.reconcile_stale_internal_maintenance_baseline_v1();');
 end if;
end $watch$;
