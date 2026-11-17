-- EXACT signed model remediation re-entry: one additional consumed attempt
-- only after a separate CI/preview-source-backed remediation grant.
-- Previous three failures and original work identity remain immutable.

alter table reality_internal.owner_shift_continuity_incidents_v1
 add column if not exists remediation_release_commit text
  check(remediation_release_commit is null or remediation_release_commit~'^[a-f0-9]{40}$'),
 add column if not exists remediation_ci_run_id bigint
  check(remediation_ci_run_id is null or remediation_ci_run_id>0),
 add column if not exists remediation_receipt_sha256 text
  check(remediation_receipt_sha256 is null or remediation_receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 add column if not exists remediation_granted_at timestamptz,
 add column if not exists remediation_used_at timestamptz;

alter table reality_internal.owner_shift_continuity_incidents_v1
 drop constraint owner_shift_continuity_incidents_v_investigation_attempts_check;
alter table reality_internal.owner_shift_continuity_incidents_v1
 add constraint owner_shift_continuity_incidents_v_investigation_attempts_check
 check(investigation_attempts between 0 and 4);

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
   and remediation_release_commit~'^[a-f0-9]{40} or next_investigation_at<=clock_timestamp())
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
  'failed_source_ref',(select j.source_ref from reality_internal.owner_qualified_employee_evidence_jobs_v1 j where j.job_id=i.qualified_job_id),
  'failed_job_phase',(select j.phase from reality_internal.owner_qualified_employee_evidence_jobs_v1 j where j.job_id=i.qualified_job_id),
  'failed_job_blocker',(select j.blocker from reality_internal.owner_qualified_employee_evidence_jobs_v1 j where j.job_id=i.qualified_job_id),
  'scope','SOURCE_BACKED_SHIFT_FAILURE_INVESTIGATION_ONLY',
  'model_inquiry_authorized',true,'new_original_jobs_created',0,
  'execution_authorized',false,'installation_authorized',false,
  'production_changed',false);
end $function$

   and remediation_receipt_sha256~'^sha256:[a-f0-9]{64} or next_investigation_at<=clock_timestamp())
 order by first_detected_at limit 1 for update skip locked;
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_DETECTED_SHIFT_CONTINUITY_INCIDENT',
  'model_inquiry_authorized',false,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false);end if;
 update reality_internal.owner_shift_continuity_incidents_v1
 set phase='INVESTIGATION_CLAIMED',investigation_lease_id=gen_random_uuid(),
  investigation_claimed_at=clock_timestamp(),
  investigation_attempts=investigation_attempts+1,
  next_investigation_at=null
 where incident_id=i.incident_id returning * into i;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_SHIFT_CONTINUITY_INVESTIGATION_CLAIMED',
  'owner_id',i.owner_id,'shift_id',i.shift_id,
  'incident_id',i.incident_id,'lease_id',i.investigation_lease_id,
  'kind',i.kind,'source_claim_id',i.source_claim_id,
  'error_summary',i.error_summary,'evidence_sha256',i.evidence_sha256,
  'first_detected_at',i.first_detected_at,
  'investigation_attempt',i.investigation_attempts,
  'previous_failure_reason',i.limitations,
  'failure_history',i.investigation_failure_history,
  'qualified_job_id',i.qualified_job_id,
  'failed_source_ref',(select j.source_ref from reality_internal.owner_qualified_employee_evidence_jobs_v1 j where j.job_id=i.qualified_job_id),
  'failed_job_phase',(select j.phase from reality_internal.owner_qualified_employee_evidence_jobs_v1 j where j.job_id=i.qualified_job_id),
  'failed_job_blocker',(select j.blocker from reality_internal.owner_qualified_employee_evidence_jobs_v1 j where j.job_id=i.qualified_job_id),
  'scope','SOURCE_BACKED_SHIFT_FAILURE_INVESTIGATION_ONLY',
  'model_inquiry_authorized',true,'new_original_jobs_created',0,
  'execution_authorized',false,'installation_authorized',false,
  'production_changed',false);
end $function$

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
  next_investigation_at=null
 where incident_id=i.incident_id returning * into i;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_SHIFT_CONTINUITY_INVESTIGATION_CLAIMED',
  'owner_id',i.owner_id,'shift_id',i.shift_id,
  'incident_id',i.incident_id,'lease_id',i.investigation_lease_id,
  'kind',i.kind,'source_claim_id',i.source_claim_id,
  'error_summary',i.error_summary,'evidence_sha256',i.evidence_sha256,
  'first_detected_at',i.first_detected_at,
  'investigation_attempt',i.investigation_attempts,
  'previous_failure_reason',i.limitations,
  'failure_history',i.investigation_failure_history,
  'qualified_job_id',i.qualified_job_id,
  'failed_source_ref',(select j.source_ref from reality_internal.owner_qualified_employee_evidence_jobs_v1 j where j.job_id=i.qualified_job_id),
  'failed_job_phase',(select j.phase from reality_internal.owner_qualified_employee_evidence_jobs_v1 j where j.job_id=i.qualified_job_id),
  'failed_job_blocker',(select j.blocker from reality_internal.owner_qualified_employee_evidence_jobs_v1 j where j.job_id=i.qualified_job_id),
  'scope','SOURCE_BACKED_SHIFT_FAILURE_INVESTIGATION_ONLY',
  'model_inquiry_authorized',true,'new_original_jobs_created',0,
  'execution_authorized',false,'installation_authorized',false,
  'production_changed',false);
end $function$
;

CREATE OR REPLACE FUNCTION public.reality_read_owner_shift_continuity_incidents_v1(p_owner_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare rows jsonb;
begin
 if current_user<>'service_role' or p_owner_id is null then
  raise exception 'SHIFT_CONTINUITY_READ_EXACT_OWNER_REQUIRED';end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'incident_id',i.incident_id,'shift_id',i.shift_id,'kind',i.kind,
  'phase',i.phase,'error_summary',i.error_summary,
  'investigation_attempts',i.investigation_attempts,
  'next_investigation_at',i.next_investigation_at,
  'automatic_reinvestigation_eligible',
   i.phase='BLOCKED_NEEDS_EVIDENCE' and
   (i.investigation_attempts<3 or (i.investigation_attempts=3
    and i.remediation_granted_at is not null and i.remediation_used_at is null)),
  'investigation_failure_history',i.investigation_failure_history,
  'evidence_sha256',i.evidence_sha256,'first_detected_at',i.first_detected_at,
  'last_observed_at',i.last_observed_at,
  'assigned_employee',i.assigned_employee,
  'independent_reviewer',i.independent_reviewer,
  'diagnosis',i.diagnosis,
  'proposed_upgrade',i.proposed_upgrade,
  'independent_test_requirement',i.independent_test_requirement,
  'limitations',i.limitations,
  'investigation_receipt_sha256',i.investigation_receipt_sha256,
  'recovery_receipt_sha256',i.recovery_receipt_sha256,
  'recovered_at',i.recovered_at,
  'resolved_worker_run_id',i.resolved_worker_run_id,
  'resolved_inquiry_claim_id',i.resolved_inquiry_claim_id,
  'recovery_attribution',i.recovery_attribution,
  'repair_executed',i.repair_executed,
  'installation_authorized',i.installation_authorized,
  'production_changed',i.production_changed,
  'next_action',case
   when i.phase='DETECTED' then
    'Reality detected stalled authorized work. An employee investigation will be claimed on the next signed worker wake.'
   when i.phase='INVESTIGATION_CLAIMED' then
    'Reality is investigating its observed stall; independent repair proof is still required.'
   when i.phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF' then
    'The assigned employee proposed a diagnosis and capability improvement. The separate reviewer must reproduce the failure and independently test the proposed repair under an existing valid warrant before an installation.'
   when i.phase='BLOCKED_NEEDS_EVIDENCE' and i.investigation_attempts=3
    and i.remediation_granted_at is not null and i.remediation_used_at is null then
    'One independently reviewed preview remediation inquiry is ready on the next signed wake; the original job is not complete.'
   when i.phase='BLOCKED_NEEDS_EVIDENCE' and i.investigation_attempts<3 then
    'Reality has recorded the failed investigation and will re-investigate on the next eligible signed wake after its bounded cooldown.'
   when i.phase='BLOCKED_NEEDS_EVIDENCE' then
    'The investigation could not establish required proof; preserve the original shift and request the exact missing evidence or authority.'
   else
    'Work resumed with independent evidence. The observed recovery does not by itself demonstrate that Reality repaired its own code.'
  end
 ) order by i.last_observed_at desc),'[]'::jsonb)
 into rows from(
  select * from reality_internal.owner_shift_continuity_incidents_v1
  where owner_id=p_owner_id order by last_observed_at desc limit 8
 ) i;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_SHIFT_CONTINUITY_INCIDENTS_READ_ONLY',
  'owner_id',p_owner_id,'owner_scope_verified',true,'read_only',true,
  'items',rows,'count',pg_catalog.jsonb_array_length(rows),
  'execution_authorized',false,'installation_authorized',false,
  'production_changed',false,'self_repair_proven',false);
end $function$
;

revoke execute on function public.reality_claim_next_shift_continuity_investigation_v1(uuid)
 from public,anon,authenticated;
revoke execute on function public.reality_read_owner_shift_continuity_incidents_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_claim_next_shift_continuity_investigation_v1(uuid)
 to service_role;
grant execute on function public.reality_read_owner_shift_continuity_incidents_v1(uuid)
 to service_role;
