-- Signed shift detects a missing ORIGINAL business-job handoff even when
-- read-only source evidence work is independently completed.
-- A deterministic real employee inquiry is retained for live source recheck;
-- no new jobs, new owner warrant, code installation or external effects.
CREATE OR REPLACE FUNCTION reality_internal.observe_qualified_employee_work_blockers_v1()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare j record; sh record; n int:=0;due int;key text;proof text; sample_claim uuid;
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
    select 1 from reality_internal.governed_employee_original_claims_v1 original
    where original.shift_id=s.shift_id and original.owner_id=s.owner_id)
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
  select i.claim_id into sample_claim
  from reality_internal.employee_temporal_inquiries_v1 i
  join reality_internal.employee_discovery_observations_v1 d
    on d.owner_id=i.owner_id and d.employee=i.employee
    and d.source_ref=i.source_ref and d.evidence_sha256=i.evidence_sha256
  where i.owner_id=sh.owner_id and i.phase='RECORDED'
   and i.finished_at>sh.authorized_at and i.claim_id is not null
   and i.provider_proof_sha256~'^sha256:[a-f0-9]{64}$'
   and i.recommendation in ('INVESTIGATE_MORE','OWNER_REVIEW')
   and d.qualified_job_created=false and d.production_changed=false
  order by i.finished_at desc,i.claim_id limit 1;
  if sample_claim is null then continue;end if;
  key:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
   sh.shift_id::text||':QUALIFICATION_HANDOFF_STALLED','UTF8')),'hex');
  proof:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(sh.shift_id::text||':RECORDED_SOURCE_INQUIRIES:'||
    due::text||':REPRESENTATIVE:'||sample_claim::text||
    ':NO_ORIGINAL_JOB_CLAIMS','UTF8')),'hex');
  insert into reality_internal.owner_shift_continuity_incidents_v1(
   owner_id,shift_id,kind,evidence_key,source_claim_id,error_summary,evidence_sha256)
  values(sh.owner_id,sh.shift_id,'EMPLOYEE_QUALIFICATION_HANDOFF_STALLED',
   key,sample_claim,
   'Signed source-backed employee investigations exist while original owner business-job claims remain zero; read-only evidence jobs are not original business work.',
   proof)
  on conflict(owner_id,shift_id,kind,evidence_key)
  do update set last_observed_at=clock_timestamp(),
   observation_count=least(
    reality_internal.owner_shift_continuity_incidents_v1.observation_count+1,100000)
  where reality_internal.owner_shift_continuity_incidents_v1.phase='DETECTED';
  n:=n+1;
 end loop;
 return 'SOURCE_BACKED_QUALIFIED_EMPLOYEE_WORK_INCIDENTS_OBSERVED_'||n;
end $function$
;
CREATE OR REPLACE FUNCTION public.reality_claim_next_shift_continuity_investigation_v1(p_shift_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare i reality_internal.owner_shift_continuity_incidents_v1%rowtype;
 s record;
begin
 if current_user<>'service_role' or p_shift_id is null then
  raise exception 'CONTINUITY_INVESTIGATION_SIGNED_SERVICE_REQUIRED';end if;
 select a.owner_id,a.shift_id into s
 from reality_internal.governed_employee_shifts_v1 a
 join reality_internal.governed_employee_shift_worker_pulses_v1 wake
  on wake.shift_id=a.shift_id and wake.owner_id=a.owner_id
 where a.shift_id=p_shift_id and a.status in
   ('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
   and a.closed_at is null and a.authorized_at is not null
   and a.planned_start_at<=clock_timestamp()
   and a.planned_end_at>clock_timestamp()
   and wake.last_worker_status='WAKE_RECEIVED'
   and wake.last_worker_seen_at>clock_timestamp()-interval '3 minutes';
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_CURRENT_SIGNED_SHIFT_CONTINUITY_SCOPE',
  'model_inquiry_authorized',false,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false);end if;
 select * into i from reality_internal.owner_shift_continuity_incidents_v1
 where shift_id=p_shift_id and owner_id=s.owner_id
  and phase in ('DETECTED','BLOCKED_NEEDS_EVIDENCE')
  and (investigation_attempts<3 or (investigation_attempts=3
   and remediation_granted_at is not null and remediation_used_at is null
   and remediation_release_commit~'^[a-f0-9]{40}$'
   and remediation_receipt_sha256~'^sha256:[a-f0-9]{64}$'
   and remediation_ci_run_id is not null))
  and (next_investigation_at is null or next_investigation_at<=clock_timestamp())
 order by first_detected_at limit 1 for update skip locked;
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_DETECTED_SHIFT_CONTINUITY_INCIDENT',
  'model_inquiry_authorized',false,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false);end if;
 update reality_internal.owner_shift_continuity_incidents_v1
 set phase='INVESTIGATION_CLAIMED',investigation_lease_id=gen_random_uuid(),
  investigation_claimed_at=clock_timestamp(),
  investigation_attempts=investigation_attempts+1,
  next_investigation_at=null,
  remediation_used_at=case when i.investigation_attempts=3 then clock_timestamp()
   else remediation_used_at end
 where incident_id=i.incident_id returning * into i;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_SHIFT_CONTINUITY_INVESTIGATION_CLAIMED',
  'owner_id',i.owner_id,'shift_id',i.shift_id,
  'incident_id',i.incident_id,'lease_id',i.investigation_lease_id,
  'kind',i.kind,'source_claim_id',i.source_claim_id,
  'error_summary',i.error_summary,'evidence_sha256',i.evidence_sha256,
  'first_detected_at',i.first_detected_at,
  'investigation_attempt',i.investigation_attempts,
  'remediation_release_commit',i.remediation_release_commit,
  'remediation_ci_run_id',i.remediation_ci_run_id,
  'remediation_receipt_sha256',i.remediation_receipt_sha256,
  'previous_failure_reason',i.limitations,
  'failure_history',i.investigation_failure_history,
  'qualified_job_id',i.qualified_job_id,
  'failed_source_ref',pg_catalog.coalesce(
   (select j.source_ref from reality_internal.owner_qualified_employee_evidence_jobs_v1 j
    where j.job_id=i.qualified_job_id and j.owner_id=i.owner_id and j.shift_id=i.shift_id),
   (select t.source_ref from reality_internal.employee_temporal_inquiries_v1 t
    where i.kind='EMPLOYEE_QUALIFICATION_HANDOFF_STALLED'
     and t.claim_id=i.source_claim_id and t.owner_id=i.owner_id
     and t.phase='RECORDED' and t.provider_proof_sha256~'^sha256:[a-f0-9]{64}$'
    limit 1)),
  'failed_job_phase',(select j.phase from reality_internal.owner_qualified_employee_evidence_jobs_v1 j where j.job_id=i.qualified_job_id),
  'failed_job_blocker',(select j.blocker from reality_internal.owner_qualified_employee_evidence_jobs_v1 j where j.job_id=i.qualified_job_id),
  'scope','SOURCE_BACKED_SHIFT_FAILURE_INVESTIGATION_ONLY',
  'model_inquiry_authorized',true,'new_original_jobs_created',0,
  'execution_authorized',false,'installation_authorized',false,
  'production_changed',false);
end $function$
;
revoke execute on function public.reality_claim_next_shift_continuity_investigation_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_claim_next_shift_continuity_investigation_v1(uuid) to service_role;
