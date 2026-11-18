-- Forward repair of a real live ledger source mismatch.
-- Source independent reviews provide original_job_completed,
-- installation_authorized and production_changed; unlike business
-- reviews they do NOT have a repair_executed column.
-- Existing signed review and incident constraints remain unchanged.
CREATE OR REPLACE FUNCTION reality_internal.observe_verified_internal_maintenance_work_v1()
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare inserted integer;
begin
 if current_user not in('postgres','service_role')
 then raise exception 'MAINTENANCE_VERIFIED_OBSERVER_SERVICE_REQUIRED';end if;
 -- The observations MUST have been independently reviewed on a different
 -- signed worker. Model diagnosis alone NEVER creates an executable job.
 insert into reality_internal.owner_internal_maintenance_jobs_v1(
  incident_id,owner_id,origin_shift_id,maintenance_kind,
  assignee,independent_reviewer,source_ref,
  independent_review_status,independent_review_receipt_sha256,
  investigation_receipt_sha256,phase)
 select i.incident_id,i.owner_id,i.shift_id,i.kind,
  i.assigned_employee,i.independent_reviewer,
  case when i.kind='EMPLOYEE_QUALIFICATION_HANDOFF_STALLED'
    then b.source_ref else r.source_ref end,
  case when i.kind='EMPLOYEE_QUALIFICATION_HANDOFF_STALLED'
    then b.status else r.status end,
  case when i.kind='EMPLOYEE_QUALIFICATION_HANDOFF_STALLED'
    then b.receipt_sha256 else r.receipt_sha256 end,
  i.investigation_receipt_sha256,
  case when i.kind='EMPLOYEE_QUALIFICATION_HANDOFF_STALLED'
    then 'OPEN_NEEDS_BUSINESS_WORK_ROOT_CAUSE'
    else 'OPEN_NEEDS_FROZEN_SOURCE_REPRODUCTION' end
 from reality_internal.owner_shift_continuity_incidents_v1 i
 join reality_internal.governed_employee_shifts_v1 shift
  on shift.shift_id=i.shift_id and shift.owner_id=i.owner_id
 left join reality_internal.shift_business_qualification_reviews_v1 b
  on b.incident_id=i.incident_id and b.owner_id=i.owner_id
   and b.shift_id=i.shift_id
 left join reality_internal.shift_continuity_independent_reviews_v1 r
  on r.incident_id=i.incident_id and r.owner_id=i.owner_id
   and r.shift_id=i.shift_id
 where i.kind in('EMPLOYEE_QUALIFICATION_HANDOFF_STALLED',
    'QUALIFIED_EVIDENCE_JOB_BLOCKED')
  and i.phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF'
  and i.investigation_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  and i.assigned_employee is not null
  and i.independent_reviewer is not null
  and i.assigned_function_id<>i.reviewer_function_id
  and i.repair_executed=false and i.installation_authorized=false
  and i.production_changed=false
  and (
   (i.kind='EMPLOYEE_QUALIFICATION_HANDOFF_STALLED'
     and b.status='NO_ORIGINAL_ADMISSION_CONFIRMED'
     and b.completed_at is not null and b.original_claim_count=0
     and b.prior_inquiry_count>=2
     and b.reviewer=i.independent_reviewer
     and b.receipt_sha256~'^sha256:[a-f0-9]{64}$'
     and b.original_job_completed=false and b.repair_executed=false
     and b.installation_authorized=false and b.production_changed=false)
   or
   (i.kind='QUALIFIED_EVIDENCE_JOB_BLOCKED'
     and r.status='SOURCE_CHANGED_NEEDS_FROZEN_TEST'
     and r.completed_at is not null and r.reviewer=i.independent_reviewer
     and r.previously_reviewed_sha256<>r.current_provider_sha256
     and r.receipt_sha256~'^sha256:[a-f0-9]{64}$'
     and r.original_job_completed=false
     and r.installation_authorized=false and r.production_changed=false)
   )
 on conflict(incident_id) do nothing;
 get diagnostics inserted=row_count;
 return inserted;
end $function$
;
revoke all on function reality_internal.observe_verified_internal_maintenance_work_v1()
 from public,anon,authenticated;
grant execute on function reality_internal.observe_verified_internal_maintenance_work_v1()
 to service_role;
