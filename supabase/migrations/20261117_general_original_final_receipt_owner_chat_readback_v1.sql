-- Owner-scoped read-only visibility of the EXISTING independently verified
-- original-job receipt. Never mints a receipt or authorizes installation.
CREATE OR REPLACE FUNCTION public.reality_read_generalized_original_install_review_v1(p_owner_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE r record; v_count int;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'GENERALIZED_OWNER_REVIEW_SERVICE_ONLY'; END IF;
 SELECT count(*) INTO v_count FROM reality_internal.governed_original_install_reviews_v1
 WHERE owner_id=p_owner_id;
 IF v_count>1 THEN RAISE EXCEPTION 'GENERALIZED_OWNER_MULTIPLE_REVIEWS_REQUIRE_SELECTION'; END IF;
 SELECT * INTO r FROM reality_internal.governed_original_install_reviews_v1
 WHERE owner_id=p_owner_id;
 IF NOT FOUND THEN
  RETURN jsonb_build_object('status','NO_CURRENT_VERIFIED_ORIGINAL_INSTALL_REVIEW',
   'owner_approval_ready',false,'installation_authorized',false,
   'original_job_completed',false,'production_changed',false); END IF;
 RETURN jsonb_build_object(
 'status','GENERALIZED_VERIFIED_ORIGINAL_INSTALL_REVIEW',
 'original_work_id',r.original_work_id,'attempt_id',r.attempt_id,'owner_id',r.owner_id,
 'shift_id',r.shift_id,'source_ref',r.source_ref,
 'source_file',r.source_file_path,
 'candidate_commit_sha',r.candidate_commit_sha,
 'candidate_artifact_sha256',r.candidate_artifact_sha256,
 'independent_frozen_run_id',r.independent_frozen_run_id,
 'integrated_test_run_id',r.integrated_test_run_id,
 'exact_install_target_branch',r.exact_install_target_branch,
 'expected_preinstall_blob_sha',r.expected_preinstall_blob_sha,
 'expected_installed_blob_sha',r.expected_installed_blob_sha,
 'phase',r.phase,
 'installed_commit_sha',CASE WHEN r.phase IN
  ('SOURCE_INSTALLED','DEPLOYMENT_VERIFIED','ORIGINAL_SETTLED')
  THEN r.installed_commit_sha ELSE NULL END,
 'final_receipt_id',CASE WHEN r.phase='ORIGINAL_SETTLED'
  THEN r.original_final_receipt_id ELSE NULL END,
 'roi_status',CASE WHEN r.phase='ORIGINAL_SETTLED' AND
  r.original_final_receipt_id IS NOT NULL
  THEN (SELECT f.roi_verification_status
   FROM reality_internal.governed_original_independent_final_receipts_v1 f
   WHERE f.receipt_id=r.original_final_receipt_id
    AND f.original_work_id=r.original_work_id AND f.owner_id=p_owner_id
    AND f.outcome='SUCCEEDED')
  ELSE NULL END,
 'isolated_github_write_verified',r.isolated_github_write_verified,
 'preview_auto_deploy_verified',r.preview_auto_deploy_verified,
 'same_original_execution_and_settlement_contract_verified',
    r.same_original_execution_and_settlement_contract_verified,
 'owner_approval_ready',(r.phase='READY_FOR_EXACT_OWNER_APPROVAL' AND
    r.isolated_github_write_verified AND r.preview_auto_deploy_verified
    AND r.same_original_execution_and_settlement_contract_verified),
 'approval_receipt_id',r.approval_receipt_id,
 'installation_authorized',(r.approval_receipt_id IS NOT NULL),
 'original_job_completed',(r.phase='ORIGINAL_SETTLED' AND
   r.original_final_receipt_id IS NOT NULL),
 'production_changed',false);
END $function$;
REVOKE ALL ON FUNCTION public.reality_read_generalized_original_install_review_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_generalized_original_install_review_v1(uuid) TO service_role;
