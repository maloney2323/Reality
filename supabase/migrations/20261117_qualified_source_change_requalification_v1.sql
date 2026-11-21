-- A real provider source changed between two distinct signed workers.
-- Never falsely settle its old digest. Re-qualify SAME owner/job only after
-- a third fresh provider read matches the changed reviewer digest. Freeze
-- original failed receipts in an append-only audit table before resetting
-- read-only execution. No new job, code install, or production authority.
alter table reality_internal.owner_qualified_employee_evidence_jobs_v1
 drop constraint owner_qualified_employee_evidence_jobs_v1_phase_check;
alter table reality_internal.owner_qualified_employee_evidence_jobs_v1
 add constraint owner_qualified_employee_evidence_jobs_v1_phase_check check(
  phase in('QUALIFIED_EXECUTABLE','EXECUTION_CLAIMED',
   'SUBMITTED_AWAITING_INDEPENDENT_RECHECK','REVIEW_CLAIMED',
   'REQUALIFICATION_CLAIMED','COMPLETED_INDEPENDENTLY_VERIFIED',
   'BLOCKED_SOURCE_CHANGED','BLOCKED_PROVIDER_OR_WORKER_EVIDENCE'));
alter table reality_internal.owner_qualified_employee_evidence_jobs_v1
 add column if not exists requalification_claim_id uuid,
 add column if not exists requalification_worker_run_id uuid,
 add column if not exists requalification_claimed_at timestamptz;

create table if not exists reality_internal.qualified_evidence_source_change_history_v1(
 job_id uuid primary key references reality_internal.owner_qualified_employee_evidence_jobs_v1(job_id),
 owner_id uuid not null,
 shift_id uuid not null,
 original_first_source_sha256 text not null check(original_first_source_sha256~'^sha256:[a-f0-9]{64}$'),
 original_reviewed_sha256 text not null check(original_reviewed_sha256~'^sha256:[a-f0-9]{64}$'),
 original_qualification_receipt_sha256 text not null check(original_qualification_receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 original_deliverable_sha256 text not null check(original_deliverable_sha256~'^sha256:[a-f0-9]{64}$'),
 original_independent_sha256 text not null check(original_independent_sha256~'^sha256:[a-f0-9]{64}$'),
 original_execution_worker_run_id uuid not null,
 original_review_worker_run_id uuid not null,
 stable_requalification_source_sha256 text not null check(stable_requalification_source_sha256~'^sha256:[a-f0-9]{64}$'),
 requalification_worker_run_id uuid not null,
 requalification_receipt_sha256 text not null check(requalification_receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 requalified_at timestamptz not null default clock_timestamp(),
 installation_authorized boolean not null default false check(installation_authorized=false),
 production_changed boolean not null default false check(production_changed=false)
);
alter table reality_internal.qualified_evidence_source_change_history_v1 enable row level security;
revoke all on reality_internal.qualified_evidence_source_change_history_v1 from public,anon,authenticated;
grant select,insert on reality_internal.qualified_evidence_source_change_history_v1 to service_role;

create or replace function public.reality_claim_changed_qualified_evidence_source_v1(
 p_shift_id uuid,p_worker_run_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare job reality_internal.owner_qualified_employee_evidence_jobs_v1%rowtype;
begin
 if current_user<>'service_role' or p_shift_id is null or
  p_worker_run_id is null then raise exception
  'SOURCE_REQUALIFICATION_SIGNED_SERVICE_REQUIRED';end if;
 if not exists(
  select 1 from reality_internal.governed_employee_shifts_v1 s
  join reality_internal.governed_employee_shift_worker_pulses_v1 pulse
   on pulse.shift_id=s.shift_id and pulse.owner_id=s.owner_id
  join reality_internal.signed_worker_actual_runs_v1 run
   on run.run_id=p_worker_run_id and run.status='STARTED'
  where s.shift_id=p_shift_id and s.authorized_at is not null
   and s.closed_at is null and s.planned_start_at<=clock_timestamp()
   and s.planned_end_at>clock_timestamp()
   and s.status in('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
   and pulse.last_worker_status='WAKE_RECEIVED'
   and pulse.last_worker_seen_at>clock_timestamp()-interval '3 minutes'
   and run.started_at>clock_timestamp()-interval '3 minutes'
 ) then return pg_catalog.jsonb_build_object(
  'status','NO_CURRENT_SIGNED_SOURCE_REQUALIFICATION_SCOPE',
  'installation_authorized',false,'production_changed',false);end if;
 select j.* into job
 from reality_internal.owner_qualified_employee_evidence_jobs_v1 j
 join reality_internal.signed_worker_actual_runs_v1 executor
  on executor.run_id=j.execution_worker_run_id and executor.status='COMPLETED'
 join reality_internal.signed_worker_actual_runs_v1 reviewer
  on reviewer.run_id=j.review_worker_run_id
   and reviewer.status='COMPLETED'
   and reviewer.run_id<>executor.run_id
 where j.shift_id=p_shift_id and j.phase='BLOCKED_SOURCE_CHANGED'
  and j.recovery_attempts=0
  and j.blocker='CURRENT_GITHUB_SOURCE_CHANGED_BETWEEN_SIGNED_WORKERS'
  and j.first_source_proof_sha256 ~ '^sha256:[a-f0-9]{64}$'
  and j.reviewed_source_sha256 ~ '^sha256:[a-f0-9]{64}$'
  and j.first_source_proof_sha256<>j.reviewed_source_sha256
  and j.independent_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
  and j.deliverable_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
  and j.verified_at is not null
  and j.first_source_updated_at is not null
  and length(j.first_source_title) between 1 and 500
  and j.source_ref~'^https://github[.]com/[^/]+/[^/]+/(issues|pull)/[1-9][0-9]*$'
 order by j.verified_at
 limit 1 for update of j skip locked;
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_CHANGED_SOURCE_REQUALIFICATION_READY',
  'installation_authorized',false,'production_changed',false);end if;
 update reality_internal.owner_qualified_employee_evidence_jobs_v1
 set phase='REQUALIFICATION_CLAIMED',
  requalification_claim_id=gen_random_uuid(),
  requalification_worker_run_id=p_worker_run_id,
  requalification_claimed_at=clock_timestamp()
 where job_id=job.job_id returning * into job;
 return pg_catalog.jsonb_build_object(
  'status','CHANGED_QUALIFIED_SOURCE_SIGNED_REQUALIFICATION_CLAIMED',
  'job_id',job.job_id,'owner_id',job.owner_id,'shift_id',job.shift_id,
  'source_ref',job.source_ref,'employee',job.employee,
  'claim_id',job.requalification_claim_id,
  'worker_run_id',p_worker_run_id,
  'original_title',job.first_source_title,
  'original_source_updated_at',job.first_source_updated_at,
  'first_source_sha256',job.first_source_proof_sha256,
  'changed_review_sha256',job.reviewed_source_sha256,
  'original_independent_receipt_sha256',job.independent_receipt_sha256,
  'requalification_attempts_remaining',1,
  'installation_authorized',false,'production_changed',false,
  'original_customer_job_completed',false);
end $fn$;

create or replace function public.reality_record_changed_qualified_evidence_source_v1(
 p_job_id uuid,p_claim_id uuid,p_worker_run_id uuid,
 p_source_ref text,p_source_title text,
 p_source_updated_at timestamptz,p_checked_at timestamptz,
 p_current_provider_sha256 text)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare job reality_internal.owner_qualified_employee_evidence_jobs_v1%rowtype;
 receipt text;
begin
 if current_user<>'service_role' or
  p_job_id is null or p_claim_id is null or p_worker_run_id is null
  or p_source_ref !~ '^https://github[.]com/[^/]+/[^/]+/(issues|pull)/[1-9][0-9]*$'
  or p_source_title is null or length(p_source_title) not between 1 and 500
  or p_source_updated_at is null or p_checked_at is null
  or p_current_provider_sha256 !~ '^sha256:[a-f0-9]{64}$'
  or p_checked_at<clock_timestamp()-interval '3 minutes'
  or p_checked_at>clock_timestamp()+interval '1 minute'
  or p_source_updated_at>p_checked_at
 then raise exception 'SOURCE_REQUALIFICATION_CURRENT_PROVIDER_PROOF_REQUIRED';end if;
 select j.* into job
 from reality_internal.owner_qualified_employee_evidence_jobs_v1 j
 join reality_internal.signed_worker_actual_runs_v1 worker
  on worker.run_id=p_worker_run_id and worker.status='STARTED'
 where j.job_id=p_job_id and j.phase='REQUALIFICATION_CLAIMED'
  and j.requalification_claim_id=p_claim_id
  and j.requalification_worker_run_id=p_worker_run_id
  and j.requalification_claimed_at>clock_timestamp()-interval '3 minutes'
  and worker.started_at>=j.requalification_claimed_at-interval '3 minutes'
  and j.recovery_attempts=0
  and j.source_ref=p_source_ref
 for update of j;
 if not found then raise exception 'SOURCE_REQUALIFICATION_EXACT_LEASE_INVALID';end if;
 if p_source_title<>job.first_source_title
  or p_source_updated_at<job.first_source_updated_at
  or p_current_provider_sha256<>job.reviewed_source_sha256
 then return pg_catalog.jsonb_build_object(
  'status','CHANGED_SOURCE_REQUALIFICATION_NOT_STABLE',
  'job_id',job.job_id,'source_ref',job.source_ref,
  'install_authorized',false,'installation_authorized',false,
  'production_changed',false,'original_customer_job_completed',false);
 end if;
 receipt:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(job.job_id::text||':'||
   job.independent_receipt_sha256||':'||job.reviewed_source_sha256||
   ':'||p_worker_run_id::text||':'||p_current_provider_sha256||
   ':SAME_JOB_STABLE_SOURCE_REQUALIFIED','UTF8')),'hex');
 insert into reality_internal.qualified_evidence_source_change_history_v1(
 job_id,owner_id,shift_id,
 original_first_source_sha256,original_reviewed_sha256,
 original_qualification_receipt_sha256,original_deliverable_sha256,
 original_independent_sha256,original_execution_worker_run_id,
 original_review_worker_run_id,stable_requalification_source_sha256,
 requalification_worker_run_id,requalification_receipt_sha256)
 values(job.job_id,job.owner_id,job.shift_id,
  job.first_source_proof_sha256,job.reviewed_source_sha256,
  job.qualification_receipt_sha256,job.deliverable_receipt_sha256,
  job.independent_receipt_sha256,job.execution_worker_run_id,
  job.review_worker_run_id,p_current_provider_sha256,
  p_worker_run_id,receipt);
 update reality_internal.owner_qualified_employee_evidence_jobs_v1
 set phase='QUALIFIED_EXECUTABLE',recovery_attempts=1,
  last_recovery_at=clock_timestamp(),
  last_failure_reason='CURRENT_GITHUB_SOURCE_CHANGED_BETWEEN_SIGNED_WORKERS',
  recovery_receipt_sha256=receipt,
  objective='Re-observe the updated source and report current provider evidence; do not rely on obsolete source assertions or claim an installation.',
  execution_claim_id=null,execution_worker_run_id=null,
  execution_claimed_at=null,execution_completed_at=null,
  first_source_proof_sha256=null,first_source_title=null,
  first_source_updated_at=null,first_source_checked_at=null,
  deliverable=null,deliverable_receipt_sha256=null,
  review_claim_id=null,review_worker_run_id=null,
  review_claimed_at=null,reviewed_source_sha256=null,
  verified_at=null,independent_receipt_sha256=null,
  requalification_claim_id=null,requalification_worker_run_id=null,
  requalification_claimed_at=null,blocker=null
 where job_id=job.job_id;
 return pg_catalog.jsonb_build_object(
  'status','SAME_QUALIFIED_EVIDENCE_JOB_REQUALIFIED',
  'job_id',job.job_id,'owner_id',job.owner_id,'shift_id',job.shift_id,
  'requalification_receipt_sha256',receipt,
  'original_failed_receipt_preserved',true,
  'execution_authorized_by_existing_shift',true,
  'independent_final_verification_required',true,
  'installation_authorized',false,'production_changed',false,
  'original_customer_job_completed',false);
end $fn$;

create or replace function reality_internal.reconcile_stale_source_requalification_v1()
returns text language plpgsql security invoker set search_path to '' as $fn$
declare n int;
begin
 if current_user<>'postgres' then raise exception
  'SOURCE_REQUALIFICATION_POSTGRES_WATCHDOG_REQUIRED';end if;
 update reality_internal.owner_qualified_employee_evidence_jobs_v1
 set phase='BLOCKED_SOURCE_CHANGED',
  blocker='SOURCE_REQUALIFICATION_PROVIDER_OR_WORKER_UNVERIFIED',
  last_failure_reason='SOURCE_REQUALIFICATION_PROVIDER_OR_WORKER_UNVERIFIED',
  recovery_attempts=1,last_recovery_at=clock_timestamp(),
  recovery_receipt_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(job_id::text||':'||coalesce(independent_receipt_sha256,'NO_RECEIPT')||
    ':REQUALIFICATION_LEASE_EXPIRED_NO_SUCCESS','UTF8')),'hex')
 where phase='REQUALIFICATION_CLAIMED'
  and requalification_claimed_at<clock_timestamp()-interval '5 minutes';
 get diagnostics n=row_count;
 return 'UNVERIFIED_SOURCE_REQUALIFICATION_LEASES_FENCED_'||n;
end $fn$;
revoke all on function public.reality_claim_changed_qualified_evidence_source_v1(uuid,uuid)
 from public,anon,authenticated;
revoke all on function public.reality_record_changed_qualified_evidence_source_v1(
 uuid,uuid,uuid,text,text,timestamptz,timestamptz,text)
 from public,anon,authenticated;
grant execute on function public.reality_claim_changed_qualified_evidence_source_v1(uuid,uuid)
 to service_role;
grant execute on function public.reality_record_changed_qualified_evidence_source_v1(
 uuid,uuid,uuid,text,text,timestamptz,timestamptz,text)
 to service_role;
do $watch$
declare j_id bigint; cmd text;
begin
 select jobid,command into strict j_id,cmd from cron.job
 where jobname='reality-governed-wake-watchdog-v1'
  and schedule='* * * * *' and active=true
  and command like '%reconcile_qualified_employee_evidence_claims_v1%';
 if position('reconcile_stale_source_requalification_v1' in cmd)=0 then
  perform cron.alter_job(j_id,command=>cmd||
   E'\nSELECT reality_internal.reconcile_stale_source_requalification_v1();');
 end if;
end $watch$;
