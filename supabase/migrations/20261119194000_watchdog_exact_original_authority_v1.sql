-- Prevent Reality from self-repairing a false incident: read-only employee
-- investigations can exist under a research or maintenance shift without
-- authority to create ORIGINAL customer jobs. This only tightens watchdog
-- incident *admission*; it never edits historical receipts or real job claims.
DO $guard$ BEGIN
  IF pg_catalog.position('NO_ORIGINAL_JOB_CLAIMS' IN
   pg_catalog.pg_get_functiondef(
    'reality_internal.observe_qualified_employee_work_blockers_v1()'::pg_catalog.regprocedure))=0
  THEN RAISE EXCEPTION 'WATCHDOG_ORIGINAL_ADMISSION_SOURCE_DRIFT'; END IF;
END $guard$;
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
 -- Detect a REAL admitted-original qualification stall only after matching
 -- exact original-work authority, not merely a run of source inquiries.
 -- The historical original-free maintenance shift is not a repair failure.
 for sh in
  select s.owner_id,s.shift_id,s.authorized_at
  from reality_internal.governed_employee_shifts_v1 s
  -- Source investigations alone are read-only. A stalled ORIGINAL is only
  -- possible when this exact shift was granted original-job execution scope.
  join reality_internal.governed_employee_completion_warrants_v1 original_warrant
   on original_warrant.shift_id=s.shift_id
    and original_warrant.owner_id=s.owner_id
    and original_warrant.plan_fingerprint=s.plan_fingerprint
    and original_warrant.mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'
    and original_warrant.state='ACTIVE'
    and original_warrant.authorized_at is not null
    and pg_catalog.jsonb_typeof(original_warrant.source_scope)='array'
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
   and d.qualified_job_created=false and d.production_changed=false
   -- An unrelated discovery does not imply that the owner authorized an
   -- original-job attempt for that source, even inside an original shift.
   and exists(
     select 1
     from reality_internal.governed_employee_completion_warrants_v1 warrant
     join reality_internal.governed_employee_shift_steps_v1 signed_step
       on signed_step.shift_id=warrant.shift_id
       and signed_step.source_ref=i.source_ref
       and signed_step.step_index between 2 and 5
     where warrant.shift_id=sh.shift_id
       and warrant.owner_id=sh.owner_id
       and warrant.mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'
       and warrant.state='ACTIVE'
       and pg_catalog.jsonb_typeof(warrant.source_scope)='array'
       and exists(
         select 1 from pg_catalog.jsonb_array_elements(warrant.source_scope) scoped
         where scoped->>'source_ref'=i.source_ref
           and scoped->>'step_index'=signed_step.step_index::text
       )
   );
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
   -- An unrelated discovery does not imply that the owner authorized an
   -- original-job attempt for that source, even inside an original shift.
   and exists(
     select 1
     from reality_internal.governed_employee_completion_warrants_v1 warrant
     join reality_internal.governed_employee_shift_steps_v1 signed_step
       on signed_step.shift_id=warrant.shift_id
       and signed_step.source_ref=i.source_ref
       and signed_step.step_index between 2 and 5
     where warrant.shift_id=sh.shift_id
       and warrant.owner_id=sh.owner_id
       and warrant.mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'
       and warrant.state='ACTIVE'
       and pg_catalog.jsonb_typeof(warrant.source_scope)='array'
       and exists(
         select 1 from pg_catalog.jsonb_array_elements(warrant.source_scope) scoped
         where scoped->>'source_ref'=i.source_ref
           and scoped->>'step_index'=signed_step.step_index::text
       )
   )
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
