-- Next authorized signed shift picks up owner-maintenance obligations from
-- prior shifts.  Reobserve evidence; do not install, spend, or settle a
-- customer job.  No new shift or standing delegation is manufactured.
alter table reality_internal.owner_internal_maintenance_jobs_v1
 add column if not exists handling_state text not null default 'QUEUED'
  check(handling_state in('QUEUED','CLAIMED','SOURCE_REOBSERVED_NEEDS_FROZEN_TEST',
   'BLOCKED_INDEPENDENT_PROVIDER_UNVERIFIED')),
 add column if not exists claim_id uuid,
 add column if not exists claimed_worker_run_id uuid,
 add column if not exists claimed_shift_id uuid,
 add column if not exists claim_started_at timestamptz,
 add column if not exists claim_attempts smallint not null default 0
  check(claim_attempts between 0 and 2),
 add column if not exists claim_failure_history jsonb not null default '[]'::jsonb
  check(jsonb_typeof(claim_failure_history)='array'),
 add column if not exists last_source_sha256 text
  check(last_source_sha256 is null or last_source_sha256~'^sha256:[a-f0-9]{64}$'),
 add column if not exists last_source_checked_at timestamptz,
 add column if not exists independent_source_observation_receipt_sha256 text
  check(independent_source_observation_receipt_sha256 is null or
   independent_source_observation_receipt_sha256~'^sha256:[a-f0-9]{64}$');

create or replace function public.reality_claim_signed_internal_maintenance_v1(
 p_shift_id uuid,p_worker_run_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare job record; claim uuid; prior_sha text;
begin
 if current_user<>'service_role' or p_shift_id is null or p_worker_run_id is null
 then raise exception 'SIGNED_INTERNAL_MAINTENANCE_OWNER_SCOPE_REQUIRED';end if;
 select m.* into job
 from reality_internal.owner_internal_maintenance_jobs_v1 m
 join reality_internal.governed_employee_shifts_v1 s
  on s.shift_id=p_shift_id and s.owner_id=m.owner_id
 join reality_internal.governed_employee_shift_worker_pulses_v1 w
  on w.shift_id=s.shift_id and w.owner_id=s.owner_id
 join reality_internal.signed_worker_actual_runs_v1 run
  on run.run_id=p_worker_run_id and run.status='STARTED'
 where m.handling_state='QUEUED' and m.claim_attempts<2
  and s.authorized_at is not null and s.closed_at is null
  and s.status in('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
  and s.planned_start_at<=clock_timestamp()
  and s.planned_end_at>clock_timestamp()
  and w.last_worker_status='WAKE_RECEIVED'
  and w.last_worker_seen_at>clock_timestamp()-interval '3 minutes'
  and run.started_at>clock_timestamp()-interval '3 minutes'
  and m.original_job_completed=false
  and m.installation_authorized_by_discovery=false
  and m.external_action_authorized_by_discovery=false
  and m.production_changed=false
 order by m.created_at,m.incident_id
 limit 1 for update of m skip locked;
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_AUTHORIZED_INTERNAL_MAINTENANCE_JOB_READY',
  'new_customer_work_created',false,'customer_job_completed',false,
  'repair_executed',false,'installation_authorized',false,
  'production_changed',false);end if;
 select case when job.maintenance_kind='EMPLOYEE_QUALIFICATION_HANDOFF_STALLED'
  then (select b.current_provider_sha256
    from reality_internal.shift_business_qualification_reviews_v1 b
    where b.incident_id=job.incident_id and b.owner_id=job.owner_id
     and b.shift_id=job.origin_shift_id
     and b.receipt_sha256=job.independent_review_receipt_sha256)
  else (select r.current_provider_sha256
    from reality_internal.shift_continuity_independent_reviews_v1 r
    where r.incident_id=job.incident_id and r.owner_id=job.owner_id
     and r.shift_id=job.origin_shift_id
     and r.receipt_sha256=job.independent_review_receipt_sha256) end
  into prior_sha;
 if prior_sha is null or prior_sha!~'^sha256:[a-f0-9]{64}$'
 then raise exception 'MAINTENANCE_SIGNED_PRIOR_SOURCE_EPOCH_REQUIRED';end if;
 claim:=gen_random_uuid();
 update reality_internal.owner_internal_maintenance_jobs_v1 m
 set handling_state='CLAIMED',claim_id=claim,
  claimed_shift_id=p_shift_id,claimed_worker_run_id=p_worker_run_id,
  claim_started_at=clock_timestamp(),claim_attempts=m.claim_attempts+1,
  last_seen_at=clock_timestamp()
 where m.incident_id=job.incident_id and m.owner_id=job.owner_id;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_INTERNAL_MAINTENANCE_CLAIMED',
  'maintenance_id',job.incident_id,'owner_id',job.owner_id,
  'origin_shift_id',job.origin_shift_id,
  'claim_shift_id',p_shift_id,'claim_id',claim,
  'worker_run_id',p_worker_run_id,
  'kind',job.maintenance_kind,'assignee',job.assignee,
  'independent_reviewer',job.independent_reviewer,
  'source_ref',job.source_ref,'prior_source_sha256',prior_sha,
  'independent_review_receipt_sha256',job.independent_review_receipt_sha256,
  'new_customer_work_created',false,'customer_job_completed',false,
  'repair_executed',false,'installation_authorized',false,
  'production_changed',false);
end $fn$;

create or replace function public.reality_record_signed_internal_maintenance_recheck_v1(
 p_maintenance_id uuid,p_claim_id uuid,p_worker_run_id uuid,
 p_source_ref text,p_provider_sha256 text,p_checked_at timestamptz)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare m reality_internal.owner_internal_maintenance_jobs_v1%rowtype;
 proof text;
begin
 if current_user<>'service_role' or p_maintenance_id is null
  or p_claim_id is null or p_worker_run_id is null or p_source_ref is null
  or p_provider_sha256!~'^sha256:[a-f0-9]{64}$'
  or p_checked_at is null
  or p_checked_at<clock_timestamp()-interval '3 minutes'
  or p_checked_at>clock_timestamp()+interval '1 minute'
 then raise exception 'INTERNAL_MAINTENANCE_SIGNED_RECHECK_INVALID';end if;
 select * into m from reality_internal.owner_internal_maintenance_jobs_v1
 where incident_id=p_maintenance_id and claim_id=p_claim_id
  and claimed_worker_run_id=p_worker_run_id
  and source_ref=p_source_ref and handling_state='CLAIMED'
  and claim_started_at>clock_timestamp()-interval '3 minutes'
 for update;
 if not found or not exists(
  select 1 from reality_internal.signed_worker_actual_runs_v1 run
   where run.run_id=p_worker_run_id and run.status='STARTED'
    and run.started_at>clock_timestamp()-interval '3 minutes'
 ) then raise exception 'INTERNAL_MAINTENANCE_CLAIM_LEASE_INVALID';end if;
 if not exists(
  select 1 from reality_internal.governed_employee_shifts_v1 s
  where s.shift_id=m.claimed_shift_id and s.owner_id=m.owner_id
   and s.closed_at is null and s.planned_end_at>clock_timestamp()
 ) then raise exception 'INTERNAL_MAINTENANCE_AUTHORIZED_SHIFT_REQUIRED';end if;
 proof:='sha256:'||encode(sha256(convert_to(
  m.incident_id::text||':'||m.claim_id::text||':'||
  m.independent_review_receipt_sha256||':'||p_worker_run_id::text||
  ':'||p_provider_sha256||':'||p_checked_at::text,'UTF8')),'hex');
 update reality_internal.owner_internal_maintenance_jobs_v1
 set handling_state='SOURCE_REOBSERVED_NEEDS_FROZEN_TEST',
  last_source_sha256=p_provider_sha256,
  last_source_checked_at=p_checked_at,
  independent_source_observation_receipt_sha256=proof,
  last_seen_at=clock_timestamp()
 where incident_id=m.incident_id;
 return pg_catalog.jsonb_build_object(
  'status','INTERNAL_MAINTENANCE_SOURCE_REOBSERVED',
  'maintenance_id',m.incident_id,'owner_id',m.owner_id,
  'source_ref',m.source_ref,'assignee',m.assignee,
  'source_readback_receipt_sha256',proof,
  'next_action',case when m.maintenance_kind='EMPLOYEE_QUALIFICATION_HANDOFF_STALLED'
   then 'REPRODUCE_EXACT_ADMISSION_HANDOFF_CAUSE_BEFORE_SOFTWARE_REPAIR'
   else 'RUN_FROZEN_SOURCE_EPOCH_REGRESSION_BEFORE_CANDIDATE_INSTALL' end,
  'independent_frozen_test_completed',false,'repair_executed',false,
  'new_customer_work_created',false,'customer_job_completed',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;

create or replace function reality_internal.reconcile_stale_internal_maintenance_claims_v1()
returns integer language plpgsql security invoker set search_path to '' as $fn$
declare n integer;
begin
 if current_user not in('postgres','service_role')
 then raise exception 'MAINTENANCE_WATCHDOG_SERVICE_REQUIRED';end if;
 update reality_internal.owner_internal_maintenance_jobs_v1 m
 set handling_state=case when claim_attempts<2
   then 'QUEUED' else 'BLOCKED_INDEPENDENT_PROVIDER_UNVERIFIED' end,
  claim_failure_history=m.claim_failure_history||pg_catalog.jsonb_build_array(
   pg_catalog.jsonb_build_object('claim_id',m.claim_id,
    'worker_run_id',m.claimed_worker_run_id,
    'claimed_at',m.claim_started_at,
    'failure_code','SIGNED_MAINTENANCE_PROVIDER_RECHECK_UNVERIFIED')),
  last_seen_at=clock_timestamp()
 where m.handling_state='CLAIMED' and m.claim_started_at<
  clock_timestamp()-interval '4 minutes';
 get diagnostics n=row_count;
 return n;
end $fn$;

revoke execute on function public.reality_claim_signed_internal_maintenance_v1(uuid,uuid)
 from public,anon,authenticated;
revoke execute on function public.reality_record_signed_internal_maintenance_recheck_v1(uuid,uuid,uuid,text,text,timestamptz)
 from public,anon,authenticated;
revoke all on function reality_internal.reconcile_stale_internal_maintenance_claims_v1()
 from public,anon,authenticated;
grant execute on function public.reality_claim_signed_internal_maintenance_v1(uuid,uuid)
 to service_role;
grant execute on function public.reality_record_signed_internal_maintenance_recheck_v1(uuid,uuid,uuid,text,text,timestamptz)
 to service_role;
grant execute on function reality_internal.reconcile_stale_internal_maintenance_claims_v1()
 to service_role;
-- Add one maintenance lease reconciliation to the EXISTING watchdog, not a new cron.
do $watch$
declare j_id bigint;old_command text;
begin
 select jobid,command into strict j_id,old_command from cron.job
 where jobname='reality-governed-wake-watchdog-v1'
 and schedule='* * * * *' and active=true
 and command like '%observe_verified_internal_maintenance_work_v1%';
 if position('reconcile_stale_internal_maintenance_claims_v1' in old_command)=0 then
  perform cron.alter_job(j_id,command=>old_command||
   E'\nSELECT reality_internal.reconcile_stale_internal_maintenance_claims_v1();');
 end if;
end $watch$;
