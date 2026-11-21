-- Extend EXISTING owner-scoped read-only RPC with exact independently
-- settled postinstall evidence; no extra ledger, owner grant or mutation.
-- Fix owner-card NULL: an unapproved, independently tested repair is NOT installed.
-- A strict false readback is required before Chat can safely expose exact approval.
CREATE OR REPLACE FUNCTION public.reality_read_owner_signed_maintenance_install_decision_v1(p_owner_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE a record;
BEGIN
 IF current_user<>'service_role' OR p_owner_id IS NULL THEN
  RAISE EXCEPTION 'SIGNED_MAINTENANCE_OWNER_REVIEW_SERVICE_REQUIRED'; END IF;
 SELECT art.*,s.plan_fingerprint,m.independent_review_receipt_sha256,
  d.approval_id,d.state AS decision_state,d.approval_receipt_sha256,
  d.installed_commit_sha,d.installed_at,
  d.independent_postinstall_receipt_sha256,d.independently_verified_at,
  d.independent_ci_run_id,d.independent_vercel_check_id
 INTO a
 FROM reality_internal.owner_maintenance_verified_artifact_handoffs_v1 art
 JOIN reality_internal.owner_internal_maintenance_jobs_v1 m
  ON m.incident_id=art.maintenance_id AND m.owner_id=art.owner_id
  AND m.claimed_shift_id=art.shift_id AND m.source_ref=art.source_ref
 JOIN reality_internal.governed_employee_shifts_v1 s
  ON s.shift_id=art.shift_id AND s.owner_id=art.owner_id
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
  ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id
  AND w.plan_fingerprint=s.plan_fingerprint
 JOIN reality_internal.owner_maintenance_independent_case_ci_v1 ci
  ON ci.maintenance_id=art.maintenance_id AND ci.owner_id=art.owner_id
  AND ci.shift_id=art.shift_id AND ci.source_ref=art.source_ref
  AND ci.case_specific_ci_receipt_sha256=art.source_case_ci_receipt_sha256
 LEFT JOIN reality_internal.owner_signed_maintenance_install_decisions_v1 d
  ON d.maintenance_id=art.maintenance_id AND d.owner_id=art.owner_id
  AND d.shift_id=art.shift_id
 WHERE art.owner_id=p_owner_id AND art.target_review_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  AND art.target_review_worker_run_id<>art.observed_worker_run_id
  AND art.target_review_branch='reality/chat-direct-work-handoff-20261115'
  AND art.target_review_existing_blob_sha=art.historical_source_blob_sha
  AND art.target_review_head_sha~'^[a-f0-9]{40}$'
  AND art.candidate_source_blob_sha<>art.historical_source_blob_sha
  AND art.exact_candidate_commit_sha~'^[a-f0-9]{40}$'
  AND art.source_case_ci_receipt_sha256=m.independent_frozen_test_receipt_sha256
  AND ci.source_epoch_frozen_red_verified=true
  AND ci.code_correction_green_verified=true
  AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
  AND w.state='ACTIVE' AND EXISTS (
   SELECT 1 FROM pg_catalog.jsonb_array_elements(
    CASE WHEN pg_catalog.jsonb_typeof(w.source_scope)='array'
    THEN w.source_scope ELSE '[]'::jsonb END) e
   WHERE e->>'maintenance_id'=m.incident_id::text
    AND e->>'origin_shift_id'=m.origin_shift_id::text
    AND e->>'source_ref'=m.source_ref
    AND e->>'independent_review_receipt_sha256'=m.independent_review_receipt_sha256)
  AND s.closed_at IS NULL AND s.authorized_at IS NOT NULL
  AND s.status IN('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  AND s.planned_start_at<=clock_timestamp()
  AND (s.planned_end_at='infinity'::timestamptz OR s.planned_end_at>clock_timestamp())
  AND m.original_job_completed=false AND m.production_changed=false
  AND m.installation_authorized_by_discovery=false
  AND (d.state IS NOT NULL OR (m.exact_install_approval_receipt_sha256 IS NULL
   AND m.repaired_capability_receipt_sha256 IS NULL))
 ORDER BY CASE WHEN d.state IS NULL THEN 0 ELSE 1 END,art.reviewed_at,art.maintenance_id LIMIT 1;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','NO_EXACT_OWNER_MAINTENANCE_INSTALL_DECISION_READY',
  'owner_approval_ready',false,'installation_authorized',false,
  'repair_installed',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false); END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status',CASE WHEN a.decision_state IS NOT NULL
   THEN 'EXACT_OWNER_MAINTENANCE_INSTALL_DECISION_RECORDED'
   ELSE 'EXACT_OWNER_MAINTENANCE_INSTALL_APPROVAL_READY' END,
  'owner_id',a.owner_id,'shift_id',a.shift_id,
  'maintenance_id',a.maintenance_id,'source_ref',a.source_ref,
  'target_path',a.source_path,'target_branch',a.target_review_branch,
  'target_head_sha',a.target_review_head_sha,
  'expected_old_blob_sha',a.historical_source_blob_sha,
  'candidate_commit_sha',a.exact_candidate_commit_sha,
  'candidate_source_blob_sha',a.candidate_source_blob_sha,
  'artifact_receipt_sha256',a.review_receipt_sha256,
  'case_ci_receipt_sha256',a.source_case_ci_receipt_sha256,
  'target_review_receipt_sha256',a.target_review_receipt_sha256,
  'decision_state',a.decision_state,'approval_id',a.approval_id,
  'approval_receipt_sha256',a.approval_receipt_sha256,
  'installed_commit_sha',a.installed_commit_sha,
  'installed_at',a.installed_at,
  'independent_postinstall_receipt_sha256',a.independent_postinstall_receipt_sha256,
  'independently_verified_at',a.independently_verified_at,
  'independent_ci_run_id',a.independent_ci_run_id,
  'independent_vercel_check_id',a.independent_vercel_check_id,
  'owner_approval_ready',(a.decision_state IS NULL),
  'installation_authorized',(a.decision_state IS NOT NULL),
  'repair_installed',coalesce(a.decision_state IN('INSTALLED','VERIFIED'),false),
  'original_job_completed',false,'production_changed',false,
  'new_shift_started',false,'exact_one_time_click_required',(a.decision_state IS NULL)
 );
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_owner_signed_maintenance_install_decision_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_owner_signed_maintenance_install_decision_v1(uuid) TO service_role;
