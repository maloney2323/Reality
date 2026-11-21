-- Owner Chat readback of the already recorded signed incident recovery
-- action and its separate independent worker review. Evidence-only.
CREATE OR REPLACE FUNCTION public.reality_read_owner_signed_shift_recovery_actions_v1(
 p_owner_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO ''
AS $read$
DECLARE v_rows jsonb; v_count integer;
BEGIN
 IF current_user<>'service_role' OR p_owner_id IS NULL
 THEN RAISE EXCEPTION 'SIGNED_OWNER_RECOVERY_READ_EXACT_OWNER_REQUIRED'; END IF;
 WITH recent AS(
  SELECT a.*,inc.kind,inc.phase as incident_phase,
   inc.independent_reviewer,
   s.status as shift_status
  FROM reality_internal.shift_continuity_recovery_actions_v1 a
  JOIN reality_internal.owner_shift_continuity_incidents_v1 inc
   ON inc.incident_id=a.incident_id
   AND inc.owner_id=a.owner_id AND inc.shift_id=a.shift_id
  JOIN reality_internal.governed_employee_shifts_v1 s
   ON s.shift_id=a.shift_id AND s.owner_id=a.owner_id
  WHERE a.owner_id=p_owner_id
  ORDER BY a.action_recorded_at DESC,a.incident_id LIMIT 8
 ),
 projected AS(
  SELECT pg_catalog.jsonb_build_object(
   'incident_id',r.incident_id,'shift_id',r.shift_id,
   'incident_phase',r.incident_phase,
   'kind',r.kind,
   'shift_status',r.shift_status,
   'governed_action',r.governed_action,
   'blocker_class',r.blocker_class,
   'action_worker_run_id',r.action_worker_run_id,
   'action_recorded_at',r.action_recorded_at,
   'action_receipt_sha256',r.action_receipt_sha256,
   'source_requalification_receipt_sha256',
     r.source_requalification_receipt_sha256,
   'exact_admission_gate',r.admission_gate,
   'current_shift_warrant_mode',r.current_warrant_mode,
   'baseline_qualified_originals',r.baseline_qualified_originals,
   'baseline_original_claims',r.baseline_original_claims,
   'baseline_final_receipts',r.baseline_final_receipts,
   'independent_review_phase',r.phase,
   'independent_reviewer',r.independent_reviewer,
   'independent_review_status',r.independent_review_status,
   'independent_review_worker_run_id',r.review_worker_run_id,
   'independent_review_receipt_sha256',
     r.independent_review_receipt_sha256,
   'independent_review_at',r.review_recorded_at,
   'action_independently_rechecked',
     r.review_worker_run_id IS NOT NULL AND
     r.review_recorded_at IS NOT NULL AND
     r.independent_review_receipt_sha256~'^sha256:[a-f0-9]{64}$',
   'owner_next_action',CASE
    WHEN r.independent_review_status=
      'SOURCE_REQUALIFICATION_VERIFIED_BUSINESS_WARRANT_STILL_MISSING'
      THEN 'EXACT_OWNER_SOURCE_SCOPE_AND_ITEMIZED_BUSINESS_WARRANT_REQUIRED_IN_CHAT'
    WHEN r.independent_review_status=
      'SIGNED_SOURCE_REQUALIFICATION_VERIFIED_NEW_ORIGINAL_ADMITTED'
      THEN 'RECHECK_APPROVED_EXECUTOR_AND_INDEPENDENT_ORIGINAL_ACCEPTANCE'
    WHEN r.independent_review_status=
      'SOURCE_REQUALIFICATION_VERIFIED_ORIGINAL_STILL_UNQUALIFIED'
      THEN 'EXACT_CURRENT_SOURCE_GOAL_ACCEPTANCE_AND_ORIGINAL_ADMISSION_REQUIRED'
    ELSE 'WAIT_FOR_DISTINCT_SIGNED_WORKER_INDEPENDENT_RECOVERY_REVIEW' END,
   'original_job_completed',false,
   'original_resumed_by_recovery_action',false,
   'owner_approval_granted_by_read',false,
   'installation_authorized',false,'production_changed',false,
   'read_only',true
  ) AS result,r.action_recorded_at
  FROM recent r
 )
 SELECT count(*)::int,
  coalesce(pg_catalog.jsonb_agg(result ORDER BY action_recorded_at DESC),'[]'::jsonb)
 INTO v_count,v_rows FROM projected;
 RETURN pg_catalog.jsonb_build_object(
  'status','OWNER_SIGNED_SHIFT_RECOVERY_ACTIONS_READ_ONLY',
  'owner_id',p_owner_id,'owner_scope_verified',true,
  'count',v_count,'items',v_rows,'read_only',true,
  'source_requalification_not_original_completion',true,
  'execution_authorized',false,'owner_approval_granted',false,
  'installation_authorized',false,'production_changed',false);
END $read$;
REVOKE ALL ON FUNCTION public.reality_read_owner_signed_shift_recovery_actions_v1(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_owner_signed_shift_recovery_actions_v1(uuid)
 TO service_role;
