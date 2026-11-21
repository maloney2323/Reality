-- The authenticated owner sees independently verified business-work
-- admission status and why Reality cannot claim customer success yet.
-- Read-only ledger projection; no credential, approval, job or external effect.
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
  'independent_source_review',(
   select case when r.receipt_sha256~'^sha256:[a-f0-9]{64}$'
    and r.completed_at is not null then pg_catalog.jsonb_build_object(
    'status',r.status,'reviewer',r.reviewer,
    'worker_run_id',r.worker_run_id,
    'prior_source_sha256',r.previously_reviewed_sha256,
    'current_source_sha256',r.current_provider_sha256,
    'receipt_sha256',r.receipt_sha256,
    'verified_at',r.completed_at,
    'original_job_completed',false,
    'repair_executed',false,'installation_authorized',false,
    'production_changed',false)
    else null end
   from reality_internal.shift_continuity_independent_reviews_v1 r
   where r.incident_id=i.incident_id and r.owner_id=i.owner_id
    and r.shift_id=i.shift_id),
  'independent_business_qualification_review',(
   select case when r.receipt_sha256~'^sha256:[a-f0-9]{64}$'
    and r.completed_at is not null
    and r.status in ('NO_ORIGINAL_ADMISSION_CONFIRMED',
     'ORIGINAL_CLAIM_NOW_EXISTS','INSUFFICIENT_LIVE_SOURCE_EVIDENCE')
   then pg_catalog.jsonb_build_object(
    'status',r.status,'reviewer',r.reviewer,
    'worker_run_id',r.worker_run_id,
    'source_ref',r.source_ref,
    'source_backed_inquiries',r.prior_inquiry_count,
    'original_job_claims',r.original_claim_count,
    'source_epoch_changed',r.source_epoch_changed,
    'review_attempts',r.review_attempts,
    'prior_failed_review_attempts',pg_catalog.jsonb_array_length(r.review_failure_history),
    'receipt_sha256',r.receipt_sha256,
    'verified_at',r.completed_at,
    'original_job_completed',false,'repair_executed',false,
    'installation_authorized',false,'production_changed',false)
   else null end
   from reality_internal.shift_business_qualification_reviews_v1 r
   where r.incident_id=i.incident_id and r.owner_id=i.owner_id
    and r.shift_id=i.shift_id),
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
   when i.phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF'
    and exists(select 1 from reality_internal.shift_continuity_independent_reviews_v1 r
     where r.incident_id=i.incident_id and r.owner_id=i.owner_id
      and r.status='SOURCE_CHANGED_NEEDS_FROZEN_TEST'
      and r.receipt_sha256~'^sha256:[a-f0-9]{64}$') then
    'Independent source review proved the provider source changed. The previous signed job is still blocked; a new source epoch and independent frozen repair test are required before any installation or original-job settlement.'
   when i.kind='EMPLOYEE_QUALIFICATION_HANDOFF_STALLED'
    and i.phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF'
    and exists(select 1 from reality_internal.shift_business_qualification_reviews_v1 r
     where r.incident_id=i.incident_id and r.owner_id=i.owner_id
      and r.shift_id=i.shift_id
      and r.status='NO_ORIGINAL_ADMISSION_CONFIRMED'
      and r.receipt_sha256~'^sha256:[a-f0-9]{64}$') then
    'Independent employee verification confirms no authorized ORIGINAL business job was admitted despite source-backed inquiry activity. Continue discovery, but do not count evidence jobs as customer work. Reality needs an executable owner-backed business source and authority; request a missing business connection inside Reality only when necessary. No unverified self-installation or ChatGPT handoff.'
   when i.phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF' then
    'The assigned employee proposed a diagnosis and capability improvement. The separate reviewer must reproduce the failure and independently test the proposed repair under an existing valid warrant before an installation.'
   when i.phase='BLOCKED_NEEDS_EVIDENCE' and i.investigation_attempts=3
    and i.remediation_granted_at is not null and i.remediation_used_at is null then
    'One independently reviewed preview remediation inquiry is ready on the next signed wake; original unfinished.'
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
revoke execute on function public.reality_read_owner_shift_continuity_incidents_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_shift_continuity_incidents_v1(uuid)
 to service_role;
