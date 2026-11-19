-- Scope-bound maintenance recognition; no authority is granted by a mode label alone.
CREATE OR REPLACE FUNCTION public.reality_read_same_original_postmaintenance_gate_v1(p_shift_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE v record; v_receipt record; v_warrant record;
 v_review record; v_staged record;
BEGIN
 IF current_user<>'service_role' OR p_shift_id IS NULL
 THEN RAISE EXCEPTION 'SAME_ORIGINAL_GATE_SERVICE_REQUIRED'; END IF;
 SELECT s.shift_id,s.owner_id,s.status,
  o.original_work_id,o.source_ref,o.phase,o.attempts,
  o.model_response_id,o.provider_comment_id
 INTO v
 FROM reality_internal.governed_employee_shifts_v1 s
 JOIN reality_internal.riley_pr_review_originals_v1 o
  ON o.shift_id=s.shift_id AND o.owner_id=s.owner_id
 WHERE s.shift_id=p_shift_id ORDER BY o.created_at LIMIT 1;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
   'status','NO_EXISTING_SAME_ORIGINAL_FOR_SHIFT',
   'original_job_completed',false,'independent_final_receipt_verified',false,
   'new_job_created',false,'installation_authorized',false); END IF;
 SELECT w.mode,w.state,w.source_scope INTO v_warrant
 FROM reality_internal.governed_employee_completion_warrants_v1 w
 WHERE w.shift_id=p_shift_id AND w.owner_id=v.owner_id LIMIT 1;
 SELECT f.receipt_id,f.original_work_id,f.outcome,f.final_evidence_sha256
 INTO v_receipt
 FROM reality_internal.governed_original_independent_final_receipts_v1 f
 WHERE f.shift_id=p_shift_id AND f.owner_id=v.owner_id
  AND f.original_work_id=v.original_work_id
  AND f.source_ref=v.source_ref
 ORDER BY f.recorded_at DESC LIMIT 1;
 SELECT x.maintenance_id,x.staging_receipt_sha256
 INTO v_staged
 FROM reality_internal.owner_maintenance_external_regression_evidence_v1 x
 WHERE x.shift_id=p_shift_id AND x.owner_id=v.owner_id
  AND x.source_ref=v.source_ref LIMIT 1;
 SELECT r.maintenance_id,r.final_receipt_sha256,r.evidence_verdict
 INTO v_review
 FROM reality_internal.owner_maintenance_external_regression_signed_reviews_v1 r
 WHERE r.shift_id=p_shift_id AND r.owner_id=v.owner_id
  AND r.source_ref=v.source_ref LIMIT 1;
 RETURN pg_catalog.jsonb_build_object(
 'status',CASE
  WHEN v_receipt.outcome='SUCCEEDED' AND
   v_receipt.final_evidence_sha256~'^sha256:[a-f0-9]{64}$'
   THEN 'EXISTING_ORIGINAL_HAS_INDEPENDENT_FINAL_RECEIPT'
  WHEN v_warrant.state='ACTIVE' AND EXISTS (
   SELECT 1 FROM pg_catalog.jsonb_array_elements(
    CASE WHEN pg_catalog.jsonb_typeof(v_warrant.source_scope)='array'
     THEN v_warrant.source_scope ELSE '[]'::jsonb END
   ) AS scope(entry)
   JOIN reality_internal.owner_internal_maintenance_jobs_v1 m
    ON m.owner_id=v.owner_id AND m.source_ref=v.source_ref
    AND m.incident_id::text=scope.entry->>'maintenance_id'
   WHERE scope.entry->>'source_ref'=v.source_ref
    AND scope.entry->>'origin_shift_id'=m.origin_shift_id::text
    AND v_warrant.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
  ) THEN 'EXISTING_ORIGINAL_AUTHORIZED_INTERNAL_MAINTENANCE'
  WHEN v_warrant.mode<>'UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS' OR
   v_warrant.state<>'ACTIVE' OR v_warrant.mode IS NULL
   THEN 'EXISTING_ORIGINAL_NOT_AUTHORIZED_BY_MAINTENANCE_SHIFT'
  WHEN v.phase='BLOCKED'
   THEN 'EXISTING_ORIGINAL_BLOCKED_REQUALIFICATION_REQUIRED'
  ELSE 'EXISTING_ORIGINAL_GOVERNED_EXECUTION_REQUIRES_FRESH_ACCEPTANCE'
 END,
 'shift_id',v.shift_id,'owner_id',v.owner_id,
 'original_work_id',v.original_work_id,'source_ref',v.source_ref,
 'phase',v.phase,'attempts',v.attempts,'warrant_mode',v_warrant.mode,
 'existing_maintenance_id',v_staged.maintenance_id,
 'staged_external_evidence_sha256',v_staged.staging_receipt_sha256,
 'signed_external_review_receipt_sha256',v_review.final_receipt_sha256,
 'case_specific_maintenance_ci_red_attested',false,
 'next_action',CASE WHEN v_review.final_receipt_sha256 IS NOT NULL THEN
  'CASE_SPECIFIC_CI_RED_AND_EXACT_ORIGINAL_EXECUTION_AUTHORITY_REQUIRED'
  WHEN v_staged.staging_receipt_sha256 IS NOT NULL THEN
  'SIGNED_INDEPENDENT_GITHUB_REVIEW_AND_ORIGINAL_AUTHORITY_REQUIRED'
  ELSE 'ORIGINAL_GOVERNANCE_AND_SOURCE_QUALIFICATION_REQUIRED' END,
 'independent_final_receipt_id',v_receipt.receipt_id,
 'independent_final_receipt_verified',
  coalesce(v_receipt.outcome='SUCCEEDED' AND
   v_receipt.final_evidence_sha256~'^sha256:[a-f0-9]{64}$',false),
 'original_job_completed',coalesce(v_receipt.outcome='SUCCEEDED' AND
   v_receipt.final_evidence_sha256~'^sha256:[a-f0-9]{64}$',false),
 'new_job_created',false,'installation_authorized',false,
 'production_changed',false,'read_only',true);
END $function$
;
