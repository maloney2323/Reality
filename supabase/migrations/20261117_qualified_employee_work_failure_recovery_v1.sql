-- Bounded autonomous recovery of a previously QUALIFIED evidence job.
-- Not an arbitrary code patch, customer action or new shift authority.
alter table reality_internal.owner_qualified_employee_evidence_jobs_v1
 add column if not exists recovery_attempts smallint not null default 0
  check (recovery_attempts between 0 and 1),
 add column if not exists last_recovery_at timestamptz,
 add column if not exists last_failure_reason text,
 add column if not exists recovery_receipt_sha256 text
  check(recovery_receipt_sha256 is null or
   recovery_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$');
alter table reality_internal.owner_shift_continuity_incidents_v1
 add column if not exists qualified_job_id uuid references
  reality_internal.owner_qualified_employee_evidence_jobs_v1(job_id);
alter table reality_internal.owner_shift_continuity_incidents_v1
 drop constraint owner_shift_continuity_incidents_v1_kind_check;
alter table reality_internal.owner_shift_continuity_incidents_v1
 add constraint owner_shift_continuity_incidents_v1_kind_check
 check(kind in ('ELIGIBLE_WORK_NO_DISPATCH',
   'EMPLOYEE_INQUIRY_CLAIM_STALE',
   'QUALIFIED_EVIDENCE_JOB_BLOCKED',
   'EMPLOYEE_QUALIFICATION_HANDOFF_STALLED'));

create or replace function public.reality_block_qualified_evidence_claim_v1(
 p_job_id uuid,p_claim_id uuid,p_worker_run_id uuid,
 p_reason text)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare j reality_internal.owner_qualified_employee_evidence_jobs_v1%rowtype;
begin
 if current_user<>'service_role' or
 p_job_id is null or p_claim_id is null or p_worker_run_id is null or
 p_reason not in ('CURRENT_GITHUB_PROVIDER_READ_UNAVAILABLE',
 'CURRENT_SOURCE_PROOF_OR_RECEIPT_UNVERIFIED',
 'INDEPENDENT_RECHECK_PROVIDER_UNAVAILABLE',
 'INDEPENDENT_SOURCE_PROOF_OR_RECEIPT_UNVERIFIED')
 then raise exception 'QUALIFIED_WORK_FAILURE_SERVICE_ROLE_REQUIRED';end if;
 update reality_internal.owner_qualified_employee_evidence_jobs_v1
 set phase='BLOCKED_PROVIDER_OR_WORKER_EVIDENCE',
  blocker=p_reason,last_failure_reason=p_reason
 where job_id=p_job_id
 and (
  (phase='EXECUTION_CLAIMED' and execution_claim_id=p_claim_id
   and execution_worker_run_id=p_worker_run_id)
  or
  (phase='REVIEW_CLAIMED' and review_claim_id=p_claim_id
   and review_worker_run_id=p_worker_run_id)
 )
 returning * into j;
 if not found then
  return pg_catalog.jsonb_build_object('status','QUALIFIED_WORK_FAILURE_CLAIM_NOT_CURRENT',
   'installation_authorized',false,'production_changed',false);end if;
 return pg_catalog.jsonb_build_object(
  'status','QUALIFIED_WORK_EVIDENCE_FAILURE_RECORDED',
  'owner_id',j.owner_id,'shift_id',j.shift_id,'job_id',j.job_id,
  'source_ref',j.source_ref,'blocker',j.blocker,
  'recovery_attempts',j.recovery_attempts,
  'installation_authorized',false,'production_changed',false,
  'original_customer_job_completed',false);
end $fn$;
revoke all on function public.reality_block_qualified_evidence_claim_v1(uuid,uuid,uuid,text)
 from public,anon,authenticated;
grant execute on function public.reality_block_qualified_evidence_claim_v1(uuid,uuid,uuid,text)
 to service_role;

create or replace function reality_internal.observe_qualified_employee_work_blockers_v1()
returns text language plpgsql security invoker set search_path to '' as $fn$
declare j record; sh record; n int:=0;due int;key text;proof text;
begin
 if current_user<>'postgres' then raise exception
  'QUALIFIED_WORK_OBSERVER_WATCHDOG_REQUIRED';end if;
 for j in
  select q.job_id,q.owner_id,q.shift_id,q.inquiry_claim_id,
   q.source_ref,q.phase,q.blocker,q.qualification_receipt_sha256
  from reality_internal.owner_qualified_employee_evidence_jobs_v1 q
  join reality_internal.governed_employee_shifts_v1 s
   on s.shift_id=q.shift_id and s.owner_id=q.owner_id
  where q.phase in ('BLOCKED_PROVIDER_OR_WORKER_EVIDENCE',
   'BLOCKED_SOURCE_CHANGED')
   and s.closed_at is null and s.planned_end_at>clock_timestamp()
  order by q.qualified_at limit 20
 loop
  key:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
   j.shift_id::text||':QUALIFIED_JOB:'||j.job_id::text,'UTF8')),'hex');
  proof:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(j.job_id::text||':'||j.source_ref||':'||
    j.qualification_receipt_sha256||':'||j.phase||':'||
    coalesce(j.blocker,'UNVERIFIED_PROVIDER_OR_WORKER_EVIDENCE'),
    'UTF8')),'hex');
  insert into reality_internal.owner_shift_continuity_incidents_v1(
   owner_id,shift_id,kind,evidence_key,source_claim_id,qualified_job_id,
   error_summary,evidence_sha256)
  values(j.owner_id,j.shift_id,'QUALIFIED_EVIDENCE_JOB_BLOCKED',
   key,j.inquiry_claim_id,j.job_id,
   'A qualified executable source-evidence job is blocked: '||
    pg_catalog.left(coalesce(j.blocker,'PROVIDER_OR_WORKER_EVIDENCE_UNVERIFIED'),180),
   proof)
  on conflict(owner_id,shift_id,kind,evidence_key)
  do update set last_observed_at=clock_timestamp(),
   observation_count=least(
    reality_internal.owner_shift_continuity_incidents_v1.observation_count+1,100000)
  where reality_internal.owner_shift_continuity_incidents_v1.phase='DETECTED';
  n:=n+1;
 end loop;
 -- Detect the SAME missing qualification handoff that previously left
 -- 37 proven inquiries and zero executable jobs with cron appearing healthy.
 for sh in
  select s.owner_id,s.shift_id,s.authorized_at
  from reality_internal.governed_employee_shifts_v1 s
  join reality_internal.governed_employee_shift_worker_pulses_v1 w
   on w.shift_id=s.shift_id and w.owner_id=s.owner_id
  where s.closed_at is null and s.authorized_at is not null
   and s.authorized_at<clock_timestamp()-interval '10 minutes'
   and s.planned_start_at<=clock_timestamp()
   and s.planned_end_at>clock_timestamp()
   and s.status in ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
   and w.last_worker_completed_at>clock_timestamp()-interval '5 minutes'
   and not exists(
    select 1 from reality_internal.owner_qualified_employee_evidence_jobs_v1 q
    where q.shift_id=s.shift_id and q.owner_id=s.owner_id)
 loop
  select count(*) into due
  from reality_internal.employee_temporal_inquiries_v1 i
  join reality_internal.employee_discovery_observations_v1 d
   on d.owner_id=i.owner_id and d.employee=i.employee
   and d.source_ref=i.source_ref and d.evidence_sha256=i.evidence_sha256
  where i.owner_id=sh.owner_id and i.phase='RECORDED'
   and i.finished_at>sh.authorized_at
   and i.provider_proof_sha256 ~ '^sha256:[a-f0-9]{64}$'
   and i.recommendation in ('INVESTIGATE_MORE','OWNER_REVIEW')
   and d.qualified_job_created=false and d.production_changed=false;
  if due<2 then continue;end if;
  key:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
   sh.shift_id::text||':QUALIFICATION_HANDOFF_STALLED','UTF8')),'hex');
  proof:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(sh.shift_id::text||':RECORDED_SOURCE_INQUIRIES:'||
    due::text||':NO_QUALIFIED_JOBS','UTF8')),'hex');
  insert into reality_internal.owner_shift_continuity_incidents_v1(
   owner_id,shift_id,kind,evidence_key,error_summary,evidence_sha256)
  values(sh.owner_id,sh.shift_id,'EMPLOYEE_QUALIFICATION_HANDOFF_STALLED',
   key,'Source-backed employee investigations exist but the signed shift has no qualified executable jobs.',
   proof)
  on conflict(owner_id,shift_id,kind,evidence_key)
  do update set last_observed_at=clock_timestamp(),
   observation_count=least(
    reality_internal.owner_shift_continuity_incidents_v1.observation_count+1,100000)
  where reality_internal.owner_shift_continuity_incidents_v1.phase='DETECTED';
  n:=n+1;
 end loop;
 return 'SOURCE_BACKED_QUALIFIED_EMPLOYEE_WORK_INCIDENTS_OBSERVED_'||n;
end $fn$;

-- Automatic, at-most-once known-safe recovery: reconnect the EXACT same
-- qualified read-only job after a transient provider or worker lease failure.
-- No source digest is fabricated and the separate worker must re-check it.
create or replace function reality_internal.reconcile_qualified_employee_evidence_claims_v1()
returns text language plpgsql security invoker set search_path to '' as $fn$
declare failures int:=0;retried int:=0;j record;receipt text;next_phase text;
begin
 if current_user<>'postgres' then raise exception
  'QUALIFIED_WORK_RECOVERY_TRUSTED_WATCHDOG_REQUIRED';end if;
 update reality_internal.owner_qualified_employee_evidence_jobs_v1
 set phase='BLOCKED_PROVIDER_OR_WORKER_EVIDENCE',
  blocker='SIGNED_WORKER_EVIDENCE_CLAIM_EXPIRED_WITHOUT_RECEIPT',
  last_failure_reason='SIGNED_WORKER_EVIDENCE_CLAIM_EXPIRED_WITHOUT_RECEIPT'
 where phase='EXECUTION_CLAIMED' and
  execution_claimed_at<clock_timestamp()-interval '5 minutes';
 get diagnostics failures=row_count;
 update reality_internal.owner_qualified_employee_evidence_jobs_v1
 set phase='BLOCKED_PROVIDER_OR_WORKER_EVIDENCE',
  blocker='INDEPENDENT_SIGNED_WORKER_REVIEW_CLAIM_EXPIRED',
  last_failure_reason='INDEPENDENT_SIGNED_WORKER_REVIEW_CLAIM_EXPIRED'
 where phase='REVIEW_CLAIMED'
  and review_claimed_at<clock_timestamp()-interval '5 minutes';
 for j in
  select q.* from reality_internal.owner_qualified_employee_evidence_jobs_v1 q
  join reality_internal.governed_employee_shifts_v1 s
   on s.shift_id=q.shift_id and s.owner_id=q.owner_id
  where q.phase='BLOCKED_PROVIDER_OR_WORKER_EVIDENCE'
   and q.recovery_attempts=0 and s.closed_at is null
   and s.planned_start_at<=clock_timestamp()
   and s.planned_end_at>clock_timestamp()
   and (coalesce(q.review_claimed_at,q.execution_claimed_at,q.qualified_at)
    <clock_timestamp()-interval '90 seconds')
   and q.last_failure_reason in (
    'CURRENT_GITHUB_PROVIDER_READ_UNAVAILABLE',
    'CURRENT_SOURCE_PROOF_OR_RECEIPT_UNVERIFIED',
    'INDEPENDENT_RECHECK_PROVIDER_UNAVAILABLE',
    'INDEPENDENT_SOURCE_PROOF_OR_RECEIPT_UNVERIFIED',
    'SIGNED_WORKER_EVIDENCE_CLAIM_EXPIRED_WITHOUT_RECEIPT',
    'INDEPENDENT_SIGNED_WORKER_REVIEW_CLAIM_EXPIRED')
  order by q.qualified_at limit 8 for update of q skip locked
 loop
  next_phase:=case
   when j.deliverable_receipt_sha256 is not null and
    exists(select 1 from reality_internal.signed_worker_actual_runs_v1 r
     where r.run_id=j.execution_worker_run_id and r.status='COMPLETED'
      and r.finished_at>=j.execution_completed_at)
    then 'SUBMITTED_AWAITING_INDEPENDENT_RECHECK'
   else 'QUALIFIED_EXECUTABLE' end;
  receipt:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(j.job_id::text||':'||
    j.qualification_receipt_sha256||':'||
    coalesce(j.last_failure_reason,'UNVERIFIED')||':'||
    next_phase||':KNOWN_SAFE_ONE_RETRY','UTF8')),'hex');
  update reality_internal.owner_qualified_employee_evidence_jobs_v1
  set phase=next_phase,recovery_attempts=1,
   last_recovery_at=clock_timestamp(),
   recovery_receipt_sha256=receipt,
   execution_claim_id=case when next_phase='QUALIFIED_EXECUTABLE'
      then null else execution_claim_id end,
   execution_worker_run_id=case when next_phase='QUALIFIED_EXECUTABLE'
      then null else execution_worker_run_id end,
   execution_claimed_at=case when next_phase='QUALIFIED_EXECUTABLE'
      then null else execution_claimed_at end,
   review_claim_id=null,review_worker_run_id=null,
   review_claimed_at=null,blocker=null
  where job_id=j.job_id;
  retried:=retried+1;
 end loop;
 return 'QUALIFIED_EVIDENCE_FAILED_CLAIMS_'||failures||
  '_EXACT_SINGLEFLIGHT_AUTORECOVERIES_'||retried;
end $fn$;

-- Expand existing independent source resumption verifier: when a qualified
-- job reports failure, only a separate signed worker source re-check of the
-- SAME work ID and source digest can settle the stall. Never self-repair code.
create or replace function reality_internal.verify_qualified_evidence_work_resumption_v1()
returns text language plpgsql security invoker set search_path to '' as $fn$
declare incident record;candidate record;proof text;n int:=0;
begin
 if current_user<>'postgres' then raise exception
  'QUALIFIED_EVIDENCE_INDEPENDENT_RESUMPTION_WATCHDOG_REQUIRED';end if;
 for incident in
  select i.* from reality_internal.owner_shift_continuity_incidents_v1 i
  where i.kind in ('QUALIFIED_EVIDENCE_JOB_BLOCKED',
   'EMPLOYEE_QUALIFICATION_HANDOFF_STALLED')
   and i.phase in ('DETECTED','INVESTIGATION_CLAIMED',
    'INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF','BLOCKED_NEEDS_EVIDENCE')
  order by i.first_detected_at
  for update skip locked
 loop
  select j.* into candidate
  from reality_internal.owner_qualified_employee_evidence_jobs_v1 j
  join reality_internal.signed_worker_actual_runs_v1 executor
    on executor.run_id=j.execution_worker_run_id
    and executor.status='COMPLETED'
  join reality_internal.signed_worker_actual_runs_v1 reviewer
    on reviewer.run_id=j.review_worker_run_id
    and reviewer.status='COMPLETED'
    and reviewer.run_id<>executor.run_id
  where j.owner_id=incident.owner_id and j.shift_id=incident.shift_id
    and j.phase='COMPLETED_INDEPENDENTLY_VERIFIED'
    and j.independent_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
    and j.first_source_proof_sha256=j.reviewed_source_sha256
    and j.verified_at>incident.first_detected_at
    and (incident.kind='EMPLOYEE_QUALIFICATION_HANDOFF_STALLED'
     and j.qualified_at>=incident.first_detected_at
     or incident.kind='QUALIFIED_EVIDENCE_JOB_BLOCKED'
      and j.job_id=incident.qualified_job_id)
  order by j.verified_at limit 1;
  if not found then continue;end if;
  proof:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(incident.incident_id::text||':'||
    candidate.job_id::text||':'||
    candidate.independent_receipt_sha256||':'||
    candidate.review_worker_run_id::text||':'||
    'SOURCE_WORK_RESUMED_CODE_INSTALL_UNPROVEN','UTF8')),'hex');
  update reality_internal.owner_shift_continuity_incidents_v1
  set phase='RECOVERED_AFTER_OBSERVATION',
   resolved_worker_run_id=candidate.review_worker_run_id,
   resolved_inquiry_claim_id=candidate.inquiry_claim_id,
   recovered_at=clock_timestamp(),
   recovery_receipt_sha256=proof,
   recovery_attribution='WORK_RESUMED_AFTER_OBSERVATION_SELF_REPAIR_UNPROVEN'
  where incident_id=incident.incident_id;
  n:=n+1;
 end loop;
 return 'ORIGINAL_QUALIFIED_EVIDENCE_WORK_RESUMPTIONS_VERIFIED_'||n;
end $fn$;

-- Existing watchdog remains the only observer; explicitly observe failures
-- before allowing exactly one authorized deterministic retry.
do $watch$
declare id bigint;wd text;anchor text:=
 'SELECT reality_internal.reconcile_qualified_employee_evidence_claims_v1();';
begin
 select j.jobid,j.command into strict id,wd from cron.job j
 where j.jobname='reality-governed-wake-watchdog-v1'
  and j.active=true and j.schedule='* * * * *'
  and j.command like '%qualify_owner_employee_evidence_jobs_v1%';
 if position('observe_qualified_employee_work_blockers_v1' in wd)=0 then
  if length(wd)-length(replace(wd,anchor,''))<>length(anchor)
  then raise exception 'QUALIFIED_WORK_RECOVERY_WATCHDOG_ANCHOR_DRIFT';end if;
  perform cron.alter_job(id,command=>replace(wd,anchor,
   E'SELECT reality_internal.observe_qualified_employee_work_blockers_v1();\n'||
    anchor||
   E'\nSELECT reality_internal.verify_qualified_evidence_work_resumption_v1();'));
 end if;
end $watch$;
