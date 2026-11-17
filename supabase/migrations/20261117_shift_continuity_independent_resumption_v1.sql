-- A stall cannot be called recovered merely because cron queued an HTTP
-- request. Require an independently recorded signed-worker completion AND
-- source-backed original employee investigation, for the SAME owner/shift.
alter table reality_internal.owner_shift_continuity_incidents_v1
 drop constraint owner_shift_continuity_incidents_v1_check;
alter table reality_internal.owner_shift_continuity_incidents_v1
 add constraint owner_shift_continuity_receipt_if_investigated_v1
 check(phase<>'INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF' or
  investigation_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$');
alter table reality_internal.owner_shift_continuity_incidents_v1
 add column if not exists resolved_worker_run_id uuid,
 add column if not exists resolved_inquiry_claim_id uuid,
 add column if not exists recovery_attribution text;
alter table reality_internal.owner_shift_continuity_incidents_v1
 add constraint owner_shift_continuity_recovery_receipt_bound_v1
 check(
  (phase<>'RECOVERED_AFTER_OBSERVATION') or
  (resolved_worker_run_id is not null and
   resolved_inquiry_claim_id is not null and
   recovered_at is not null and
   recovery_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$' and
   recovery_attribution='WORK_RESUMED_AFTER_OBSERVATION_SELF_REPAIR_UNPROVEN')
 );
create or replace function reality_internal.verify_owner_shift_stall_resumption_v1()
returns text language plpgsql security invoker set search_path to '' as $fn$
declare incident reality_internal.owner_shift_continuity_incidents_v1%rowtype;
 proof record;hash text;count_verified int:=0;
begin
 if current_user<>'postgres' then raise exception
  'SHIFT_CONTINUITY_INDEPENDENT_RESUMPTION_WATCHDOG_REQUIRED';end if;
 for incident in select * from reality_internal.owner_shift_continuity_incidents_v1
  where phase in ('DETECTED','INVESTIGATION_CLAIMED',
   'INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF',
   'BLOCKED_NEEDS_EVIDENCE')
  order by first_detected_at for update skip locked
 loop
  select r.run_id signed_worker_id,t.claim_id original_inquiry_id
   into proof
  from reality_internal.employee_temporal_inquiries_v1 t
  join reality_internal.employee_discovery_observations_v1 d
   on d.owner_id=t.owner_id and d.employee=t.employee
    and d.source_ref=t.source_ref and d.evidence_sha256=t.evidence_sha256
  join reality_internal.signed_worker_actual_runs_v1 r
   on r.status='COMPLETED'
    and r.worker_stage='WORKER_RESPONSE_PUBLICATION'
    and r.started_at>incident.first_detected_at
    and r.finished_at is not null and r.finished_at<=clock_timestamp()
    and t.finished_at between r.started_at and r.finished_at
  where t.owner_id=incident.owner_id and t.phase='RECORDED'
   and t.source_scan_at<=incident.first_detected_at
   and t.claimed_at>=incident.first_detected_at
   and t.finished_at>=incident.first_detected_at
   and t.model_response_id ~ '^resp_[A-Za-z0-9_-]{4,160}$'
   and t.provider_proof_sha256 ~ '^sha256:[a-f0-9]{64}$'
   and (incident.kind='ELIGIBLE_WORK_NO_DISPATCH'
    or (incident.kind='EMPLOYEE_INQUIRY_CLAIM_STALE'
     and t.claim_id=incident.source_claim_id))
  order by t.finished_at asc limit 1;
  if not found then continue;end if;
  hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(
    incident.incident_id::text||':'||proof.signed_worker_id::text||
    ':'||proof.original_inquiry_id::text||
    ':WORK_RESUMED_BUT_SELF_REPAIR_UNPROVEN','UTF8')),'hex');
  update reality_internal.owner_shift_continuity_incidents_v1
  set phase='RECOVERED_AFTER_OBSERVATION',
   resolved_worker_run_id=proof.signed_worker_id,
   resolved_inquiry_claim_id=proof.original_inquiry_id,
   recovery_attribution='WORK_RESUMED_AFTER_OBSERVATION_SELF_REPAIR_UNPROVEN',
   recovery_receipt_sha256=hash,recovered_at=clock_timestamp()
  where incident_id=incident.incident_id;
  count_verified:=count_verified+1;
 end loop;
 return 'SOURCE_BACKED_SHIFT_STALL_WORK_RESUMPTIONS_VERIFIED_'||count_verified;
end $fn$;
-- Use same existing watchdog. Never conflate recovered operation with a
-- tested deployed capability upgrade, and never create another scheduler.
do $watch$
declare job_id bigint;command text;
begin
 select j.jobid,j.command into strict job_id,command from cron.job j
 where j.jobname='reality-governed-wake-watchdog-v1'
  and j.active=true and j.schedule='* * * * *'
  and j.command like '%observe_owner_shift_continuity_stalls_v1%';
 if position('verify_owner_shift_stall_resumption_v1' in command)=0 then
  perform cron.alter_job(job_id,command=>command||
   E'\nSELECT reality_internal.verify_owner_shift_stall_resumption_v1();');
 end if;
end $watch$;
