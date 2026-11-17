-- Reconcile already observed signed-worker recovery using independent evidence.
-- NO repair installation, NO owner grant, NO fictional original work IDs.
-- The existing watchdog owns the check; no second recurring worker is created.
alter table reality_internal.owner_worker_recovery_incidents_v1
 drop constraint owner_worker_recovery_incidents_v1_phase_check;
alter table reality_internal.owner_worker_recovery_incidents_v1
 add constraint owner_worker_recovery_incidents_v1_phase_check
 check(phase in ('DETECTED','LEASED_FOR_INVESTIGATION',
 'EMPLOYEE_INVESTIGATION_SCHEDULED','BLOCKED_NEEDS_EVIDENCE',
 'OPERATIONAL_CONTINUITY_VERIFIED_EXTERNAL_FIX'));
alter table reality_internal.owner_worker_recovery_incidents_v1
 add column if not exists continuity_verified_at timestamptz,
 add column if not exists continuity_success_runid bigint,
 add column if not exists continuity_worker_inquiry_claim_id uuid,
 add column if not exists continuity_receipt_sha256 text,
 add column if not exists recovery_attribution text
  check(recovery_attribution in ('EXTERNALLY_CORRECTED_NOT_SELF_REPAIRED'));
alter table reality_internal.owner_worker_recovery_incidents_v1
 add constraint owner_worker_recovery_continuity_receipt_consistent_v1
 check(phase <> 'OPERATIONAL_CONTINUITY_VERIFIED_EXTERNAL_FIX' or (
 continuity_verified_at is not null and
 continuity_success_runid is not null and
 continuity_worker_inquiry_claim_id is not null and
 continuity_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$' and
 recovery_attribution='EXTERNALLY_CORRECTED_NOT_SELF_REPAIRED'));
create table if not exists reality_internal.owner_worker_recovery_verification_receipts_v1(
 receipt_id uuid primary key default gen_random_uuid(),
 incident_id uuid not null references reality_internal.owner_worker_recovery_incidents_v1(incident_id),
 owner_id uuid not null,
 action text not null check(action in (
 'CONTINUITY_INDEPENDENTLY_VERIFIED_NO_SELF_REPAIR_CLAIM',
 'RECURRENT_FAILURE_REOPENED')),
 failure_runid bigint not null,
 success_runid bigint,
 signed_worker_inquiry_claim_id uuid,
 proof_sha256 text not null check(proof_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 observation jsonb not null,
 recorded_at timestamptz not null default clock_timestamp(),
 unique(incident_id,action,failure_runid)
);
alter table reality_internal.owner_worker_recovery_verification_receipts_v1 enable row level security;
revoke all on reality_internal.owner_worker_recovery_verification_receipts_v1
 from public,anon,authenticated;
grant select,insert on reality_internal.owner_worker_recovery_verification_receipts_v1 to service_role;

create or replace function reality_internal.reconcile_owner_worker_recovery_evidence_v1()
returns text language plpgsql security invoker set search_path to '' as $fn$
declare v reality_internal.owner_worker_recovery_incidents_v1%rowtype;
 j cron.job%rowtype;last_success record;inquiry record;
 successes integer;last_success_runid bigint;last_success_at timestamptz;
 new_failure record;verified_count integer:=0;reopened_count integer:=0;
 evidence jsonb;hash text;
begin
 -- A recurrent failure after previously VERIFIED operation opens a new cycle;
 -- do not mask it with the earlier positive receipt.
 for v in select * from reality_internal.owner_worker_recovery_incidents_v1
   where phase='OPERATIONAL_CONTINUITY_VERIFIED_EXTERNAL_FIX'
   order by continuity_verified_at,incident_id for update skip locked
 loop
  select d.runid,d.start_time into new_failure
   from cron.job_run_details d
   where d.jobid=v.cron_jobid and d.status='failed'
    and d.runid>v.continuity_success_runid
    and pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
     coalesce(d.return_message,'UNKNOWN_CRON_FAILURE'),'UTF8')),'hex')=
     v.error_fingerprint
   order by d.runid desc limit 1;
  if found then
   evidence:=pg_catalog.jsonb_build_object(
    'incident_id',v.incident_id,'new_failed_runid',new_failure.runid,
    'old_continuity_success_runid',v.continuity_success_runid,
    'owner_id',v.owner_id,'new_failed_at',new_failure.start_time);
   hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
     pg_catalog.convert_to(evidence::text,'UTF8')),'hex');
   insert into reality_internal.owner_worker_recovery_verification_receipts_v1(
    incident_id,owner_id,action,failure_runid,success_runid,
    proof_sha256,observation)
   values(v.incident_id,v.owner_id,'RECURRENT_FAILURE_REOPENED',
    new_failure.runid,v.continuity_success_runid,hash,evidence)
   on conflict do nothing;
   update reality_internal.owner_worker_recovery_incidents_v1
   set phase='DETECTED',last_failed_runid=new_failure.runid,
    last_observed_at=new_failure.start_time,
    continuity_verified_at=null,continuity_success_runid=null,
    continuity_worker_inquiry_claim_id=null,continuity_receipt_sha256=null,
    recovery_attribution=null,
    assigned_employee=null,assigned_function_id=null,
    independent_reviewer=null,reviewer_function_id=null,
    assigned_at=null,model_response_id=null,
    investigation_scope=null,independent_test_requirement=null,
    evidence_limitations=null,provisional_minutes_low=null,
    provisional_minutes_high=null,updated_at=clock_timestamp()
   where incident_id=v.incident_id;
   reopened_count:=reopened_count+1;
  end if;
 end loop;
 for v in select * from reality_internal.owner_worker_recovery_incidents_v1
   where phase='EMPLOYEE_INVESTIGATION_SCHEDULED'
   order by assigned_at,incident_id for update skip locked
 loop
  if v.assigned_employee is null or v.independent_reviewer is null
   or v.assigned_employee=v.independent_reviewer or
   v.model_response_id !~ '^resp_[A-Za-z0-9_-]{4,160}$' or
   v.independent_test_requirement is null
   then continue;end if;
  select * into j from cron.job
   where jobid=v.cron_jobid
    and jobname='reality-riley-preview-original-execution-wake-v1'
    and active=true and schedule='* * * * *'
    and position('public.reality_read_owner_capability_gap_feed_v1' in command)=0
    and position('credential.worker_token' in command)>0
    and position('credential.vercel_bypass' in command)>0
    and position('eligible_shift.permitted' in command)>0
    and position('owner_routine_delegations_v1' in command)>0;
  if not found then continue;end if;
  select count(*)::integer,max(d.runid) as max_runid,
    max(d.start_time) as last_succeeded_at
   into successes,last_success_runid,last_success_at
   from cron.job_run_details d
   where d.jobid=v.cron_jobid and d.status='succeeded'
    and d.runid>v.last_failed_runid
    and d.start_time>v.last_observed_at;
  if successes<3 or last_success_runid is null then continue;end if;
  if exists(select 1 from cron.job_run_details d
    where d.jobid=v.cron_jobid and d.status='failed'
     and d.runid>v.last_failed_runid)
   then continue;end if;
  select t.claim_id,t.finished_at,t.provider_proof_sha256,t.model_response_id
   into inquiry
   from reality_internal.employee_temporal_inquiries_v1 t
   where t.owner_id=v.owner_id and t.phase='RECORDED'
     and t.finished_at>v.last_observed_at
     and t.finished_at<=last_success_at
     and t.provider_proof_sha256 ~ '^sha256:[a-f0-9]{64}$'
     and t.model_response_id ~ '^resp_[A-Za-z0-9_-]{4,160}$'
   order by t.finished_at desc limit 1;
  if not found then continue;end if;
  evidence:=pg_catalog.jsonb_build_object(
   'source','independent_cron_and_signed_worker_evidence',
   'incident_id',v.incident_id,'owner_id',v.owner_id,
   'last_failed_runid',v.last_failed_runid,
   'successful_cron_checks',successes,
   'last_success_runid',last_success_runid,
   'signed_worker_inquiry_claim_id',inquiry.claim_id,
   'provider_proof_sha256',inquiry.provider_proof_sha256,
   'employee_inquiry_model_response_id',inquiry.model_response_id,
   'cron_has_forbidden_owner_feed_access',false,
   'cron_signed_worker_secret_retained',true,
   'original_job_executed',false,'self_repaired',false,
   'attribution','EXTERNALLY_CORRECTED_NOT_SELF_REPAIRED');
  hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(evidence::text,'UTF8')),'hex');
  update reality_internal.owner_worker_recovery_incidents_v1
  set phase='OPERATIONAL_CONTINUITY_VERIFIED_EXTERNAL_FIX',
   continuity_verified_at=clock_timestamp(),
   continuity_success_runid=last_success_runid,
   continuity_worker_inquiry_claim_id=inquiry.claim_id,
   continuity_receipt_sha256=hash,
   recovery_attribution='EXTERNALLY_CORRECTED_NOT_SELF_REPAIRED',
   updated_at=clock_timestamp()
  where incident_id=v.incident_id
   and phase='EMPLOYEE_INVESTIGATION_SCHEDULED';
  insert into reality_internal.owner_worker_recovery_verification_receipts_v1(
   incident_id,owner_id,action,failure_runid,success_runid,
   signed_worker_inquiry_claim_id,proof_sha256,observation)
  values(v.incident_id,v.owner_id,
   'CONTINUITY_INDEPENDENTLY_VERIFIED_NO_SELF_REPAIR_CLAIM',
   v.last_failed_runid,last_success_runid,inquiry.claim_id,hash,evidence)
  on conflict do nothing;
  verified_count:=verified_count+1;
 end loop;
 return 'OPERATIONAL_RECOVERIES_VERIFIED_'||verified_count||
  '_RECURRENCES_REOPENED_'||reopened_count;
end $fn$;

-- Extend the SAME existing watchdog to reconcile independent recovery evidence
-- after source observation, not by starting a new engine or running a model.
do $watchdog$
declare v_id bigint;v_command text;
begin
 select jobid,command into strict v_id,v_command from cron.job
 where jobname='reality-governed-wake-watchdog-v1'
  and active=true and schedule='* * * * *'
  and command like '%watch_governed_wake_outbox_v1%'
  and command like '%observe_owner_worker_cron_failures_v1%';
 if position('reconcile_owner_worker_recovery_evidence_v1' in v_command)>0
 then return;end if;
 perform cron.alter_job(v_id,command=>v_command||
  E'\nSELECT reality_internal.reconcile_owner_worker_recovery_evidence_v1();');
end $watchdog$;
