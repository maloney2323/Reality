-- Add the SAME signed owner qualification routing to existing operational Continuity readback.
-- A source-route reference is not a canonical owner-goal/worldline identifier.
CREATE OR REPLACE FUNCTION public.reality_read_owner_operational_continuity_v1(p_owner_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
 v_shifts jsonb; v_roles jsonb; v_due jsonb; v_maint jsonb;
 v_total_shifts integer; v_active_shifts integer; v_calendar_count integer;
 v_planned integer; v_verified integer; v_evidence_total integer;
 v_evidence_verified integer; v_evidence_blocked integer;
 v_maintenance_ci_red integer; v_route_count integer;
 v_route_needing_original integer; v_route_stale integer;
 v_routes jsonb; v_checked timestamptz:=clock_timestamp();
 v_business_date date:=timezone('America/New_York',clock_timestamp())::date;
BEGIN
 IF current_user <> 'service_role' OR p_owner_id IS NULL
 THEN RAISE EXCEPTION 'OPERATIONAL_CONTINUITY_OWNER_SERVICE_REQUIRED'; END IF;
 SELECT count(*)::int,count(*) filter(where closed_at is null)::int
 INTO v_total_shifts,v_active_shifts
 FROM reality_internal.governed_employee_shifts_v1
 WHERE owner_id=p_owner_id;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
    'shift_id',s.shift_id,'status',s.status,'created_at',s.created_at,
    'closed_at',s.closed_at,'last_progress_at',s.last_progress_at)
    ORDER BY s.created_at DESC),'[]'::jsonb)
 INTO v_shifts
 FROM (SELECT shift_id,status,created_at,closed_at,last_progress_at
   FROM reality_internal.governed_employee_shifts_v1
   WHERE owner_id=p_owner_id ORDER BY created_at DESC LIMIT 25) s;
 SELECT count(*)::int,
    count(*) filter(where planned_business_date is not null)::int,
    count(*) filter(where work_state='EVIDENCE_REVIEW_VERIFIED')::int
 INTO v_calendar_count,v_planned,v_verified
 FROM reality_internal.owner_employee_operating_schedule_v1
 WHERE owner_id=p_owner_id;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
    'employee',r.employee,'total_entries',r.total_entries,
    'scheduled_entries',r.scheduled_entries,
    'verified_evidence_entries',r.verified_evidence_entries,
    'maintenance_entries',r.maintenance_entries)
    ORDER BY r.employee),'[]'::jsonb)
 INTO v_roles
 FROM (SELECT employee,count(*)::int total_entries,
    count(*) filter(where planned_business_date is not null)::int scheduled_entries,
    count(*) filter(where work_state='EVIDENCE_REVIEW_VERIFIED')::int verified_evidence_entries,
    count(*) filter(where work_kind='INTERNAL_MAINTENANCE')::int maintenance_entries
   FROM reality_internal.owner_employee_operating_schedule_v1
   WHERE owner_id=p_owner_id GROUP BY employee) r;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
    'work_key',s.work_key,'employee',s.employee,'work_kind',s.work_kind,
    'source_ref',s.source_ref,'title',s.title,'work_state',s.work_state,
    'planned_business_date',s.planned_business_date,
    'evidence_job_id',s.evidence_job_id,
    'independently_verified_current_evidence',s.independently_verified_current_evidence,
    'next_gate',CASE
      WHEN s.work_kind='INTERNAL_MAINTENANCE' AND
           s.work_state='MAINTENANCE_IN_SIGNED_SHIFT'
        THEN 'SIGNED_MAINTENANCE_NEXT_PROOF_REQUIRED'
      WHEN s.work_kind='INTERNAL_MAINTENANCE'
        THEN 'MAINTENANCE_EXACT_SHIFT_SCOPE_REQUIRED'
      WHEN s.work_state='SOURCE_EPOCH_REVIEW_REQUIRED'
        THEN 'FRESH_SOURCE_EPOCH_RECHECK_REQUIRED'
      WHEN s.work_state='CURRENT_SOURCE_REVIEW_REQUIRED'
        THEN 'CURRENT_SOURCE_EVIDENCE_QUALIFICATION_REQUIRED'
      WHEN s.work_state='HISTORICAL_REVALIDATION_REQUIRED'
        THEN 'CURRENT_PROVIDER_REVALIDATION_REQUIRED'
      WHEN s.work_state='SOURCE_NO_LONGER_CURRENT'
        THEN 'NO_REPLAY_HISTORICAL_SOURCE'
      ELSE 'READ_ONLY_STATUS_RECONCILIATION_REQUIRED' END)
    ORDER BY s.planned_business_date,s.priority,s.daily_order,s.employee),
    '[]'::jsonb)
 INTO v_due
 FROM reality_internal.owner_employee_operating_schedule_v1 s
 WHERE s.owner_id=p_owner_id
   AND s.planned_business_date BETWEEN v_business_date AND v_business_date+7;
 SELECT count(*)::int,
  count(*) filter(where phase='COMPLETED_INDEPENDENTLY_VERIFIED')::int,
  count(*) filter(where phase like 'BLOCKED_%')::int
 INTO v_evidence_total,v_evidence_verified,v_evidence_blocked
 FROM reality_internal.owner_qualified_employee_evidence_jobs_v1
 WHERE owner_id=p_owner_id;
 SELECT count(*)::int INTO v_maintenance_ci_red
 FROM reality_internal.owner_internal_maintenance_jobs_v1 m
 WHERE m.owner_id=p_owner_id AND
   m.handling_state='FAILURE_BASELINE_REPRODUCED_NEEDS_CI_RED';
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'maintenance_id',m.incident_id,'origin_shift_id',m.origin_shift_id,
   'claim_shift_id',m.claimed_shift_id,'source_ref',m.source_ref,
   'employee',m.assignee,'reviewer',m.independent_reviewer,
   'handling_state',m.handling_state,'phase',m.phase,
   'failure_baseline_sha256',m.independent_failure_baseline_receipt_sha256,
   'independent_frozen_ci_sha256',m.independent_frozen_test_receipt_sha256,
   'original_work_id',m.original_customer_work_id,
   'in_active_exact_warrant',EXISTS(
     SELECT 1 FROM reality_internal.governed_employee_completion_warrants_v1 w
     JOIN reality_internal.governed_employee_shifts_v1 sh
       ON sh.shift_id=w.shift_id AND sh.owner_id=w.owner_id
     WHERE w.owner_id=m.owner_id AND w.state='ACTIVE'
       AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
       AND sh.closed_at IS NULL
       AND sh.planned_end_at>v_checked
       AND EXISTS(SELECT 1 FROM jsonb_array_elements(w.source_scope) scope
         WHERE scope->>'maintenance_id'=m.incident_id::text)),
   'next_gate',CASE WHEN m.handling_state='FAILURE_BASELINE_REPRODUCED_NEEDS_CI_RED'
     THEN 'EXECUTABLE_INDEPENDENT_FROZEN_CI_RED_REQUIRED'
     ELSE 'MAINTENANCE_EVIDENCE_RECHECK_REQUIRED' END)
   ORDER BY m.created_at,m.incident_id),'[]'::jsonb)
 INTO v_maint
 FROM reality_internal.owner_internal_maintenance_jobs_v1 m
 WHERE m.owner_id=p_owner_id
   AND m.original_job_completed IS FALSE
   AND m.production_changed IS FALSE;
 -- The CONTINUITY view reuses the same signed-worker qualification routes
 -- that Reality Chat reads. This projection creates no parallel authority,
 -- does not mint original work, and does not write an unverified Universe event.
 SELECT count(*)::int,
  count(*) filter(where r.original_work_id is null)::int,
  count(*) filter(where r.last_checked_at<v_checked-interval '30 minutes')::int
 INTO v_route_count,v_route_needing_original,v_route_stale
 FROM reality_internal.owner_continuity_qualification_routes_v1 r
 WHERE r.owner_id=p_owner_id;

 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'qualification_route_ref',x.continuity_ref,
   'intake_family',x.intake_family,
   'source_ref',x.source_ref,
   'source_title',x.title,
   'route_state',case when x.last_checked_at<v_checked-interval '30 minutes'
      then 'SOURCE_ROUTE_STALE_WORKER_RECHECK_REQUIRED' else x.route_state end,
   'governed_next_action',case when x.last_checked_at<v_checked-interval '30 minutes'
      then 'RECHECK_SIGNED_WORKER_CONTINUITY_BEFORE_NEXT_ACTION'
      else x.governed_next_action end,
   'canonical_original_work_id',x.original_work_id,
   'canonical_universe_worldline_verified',false,
   'approval_granted_by_projection',false,
   'execution_authorized_by_projection',false,
   'installation_authorized',false,
   'last_checked_at',x.last_checked_at
 ) order by x.route_rank,x.family_rank,x.intake_family,x.intake_key),
 '[]'::jsonb) INTO v_routes
 FROM (
  SELECT z.* from (
   SELECT r.*,i.title,
    case
     when r.route_state='EXISTING_QUALIFIED_ARTIFACT_CHECK_OWNER_APPROVAL_ADAPTER' then 0
     when r.route_state='EXISTING_ORIGINAL_RECHECK_GOVERNED_TRIGGER' then 1
     when r.route_state='SOURCE_EPOCH_REVALIDATION_REQUIRED' then 2
     when r.route_state='OWNER_GOAL_ORIGINAL_AND_INDEPENDENT_SOURCE_QUALIFICATION_REQUIRED' then 3
     when r.route_state='SAVED_CHAT_INTENT_NEEDS_GOVERNED_CLASSIFICATION' then 4
     when r.route_state='MISSING_EXACT_SOURCE_LINEAGE_RECHECK' then 5
     else 6 end route_rank,
    row_number() over(partition by r.intake_family order by
      case
       when r.route_state='EXISTING_QUALIFIED_ARTIFACT_CHECK_OWNER_APPROVAL_ADAPTER' then 0
       when r.route_state='EXISTING_ORIGINAL_RECHECK_GOVERNED_TRIGGER' then 1
       when r.route_state='SOURCE_EPOCH_REVALIDATION_REQUIRED' then 2
       when r.route_state='OWNER_GOAL_ORIGINAL_AND_INDEPENDENT_SOURCE_QUALIFICATION_REQUIRED' then 3
       when r.route_state='SAVED_CHAT_INTENT_NEEDS_GOVERNED_CLASSIFICATION' then 4
       else 5 end,
      r.last_checked_at desc,r.intake_key) family_rank
   FROM reality_internal.owner_continuity_qualification_routes_v1 r
   JOIN reality_internal.owner_continuous_qualification_inbox_v1 i
    ON i.owner_id=r.owner_id and i.intake_family=r.intake_family
     and i.intake_key=r.intake_key
   WHERE r.owner_id=p_owner_id
  ) z
  WHERE z.family_rank<=3
  ORDER BY z.route_rank,z.family_rank,z.intake_family,z.intake_key
  LIMIT 16
 ) x;
 RETURN jsonb_build_object(
   'status','OWNER_OPERATIONAL_CONTINUITY_INVENTORY_READ_ONLY',
   'owner_id',p_owner_id,'owner_scope_verified',true,'checked_at',v_checked,
   'total_shift_records',v_total_shifts,'open_shift_records',v_active_shifts,
   'shift_history',v_shifts,'shift_history_bounded_to',25,
   'calendar_entries',v_calendar_count,'dated_calendar_entries',v_planned,
   'calendar_verified_evidence_entries',v_verified,
   'employee_responsibilities',v_roles,
   'next_seven_day_calendar',v_due,
   'qualified_evidence_jobs',v_evidence_total,
   'independently_verified_evidence_jobs',v_evidence_verified,
   'blocked_evidence_jobs',v_evidence_blocked,
   'maintenance_needs_executable_ci_red',v_maintenance_ci_red,
   'maintenance_obligations',v_maint,
   'continuity_qualification_total',v_route_count,
   'continuity_qualification_needing_canonical_original',v_route_needing_original,
   'continuity_qualification_stale_worker_routes',v_route_stale,
   'continuity_qualification_routes',v_routes,
   'route_reference_is_not_canonical_universe_worldline',true,
   'qualification_routes_do_not_authorize_models_or_work',true,
   'evidence_work_does_not_imply_customer_original_completed',true,
   'calendar_does_not_grant_execution',true,
   'read_only',true,'created_new_work',false,'installation_authorized',false,
   'original_customer_job_completed',false,'production_changed',false);
END $function$

revoke all on function public.reality_read_owner_operational_continuity_v1(uuid) from public,anon,authenticated;
grant execute on function public.reality_read_owner_operational_continuity_v1(uuid) to service_role;
