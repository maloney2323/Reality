-- Read-only, single owner-approved original scope for the existing signed
-- worker's isolated installer. It never converts shift consent to install.
CREATE OR REPLACE FUNCTION public.reality_read_general_original_install_scope_v1()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE g jsonb; r reality_internal.governed_original_install_reviews_v1%rowtype;
 v reality_internal.governed_original_install_approvals_v1%rowtype; n int;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'GENERAL_INSTALL_READ_SERVICE_ONLY';END IF;
 g:=public.reality_read_current_shift_execution_graph_v1();
 IF g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED' OR
    g->>'production_changed'<>'false'
 THEN RETURN jsonb_build_object('status','GENERAL_INSTALL_AUTHORIZED_SHIFT_NOT_CURRENT',
  'installation_authorized',false,'source_installed',false,
  'original_job_completed',false,'production_changed',false);END IF;
 SELECT count(*) INTO n FROM reality_internal.governed_original_install_reviews_v1
 WHERE owner_id=(g->>'owner_id')::uuid AND shift_id=(g->>'shift_id')::uuid
  AND phase IN ('OWNER_APPROVED','INSTALL_INTENT_FENCED',
   'SOURCE_INSTALLED','DEPLOYMENT_VERIFIED');
 IF n=0 THEN RETURN jsonb_build_object('status','GENERAL_INSTALL_AWAITING_EXACT_OWNER_APPROVAL',
   'installation_authorized',false,'source_installed',false,
   'original_job_completed',false,'production_changed',false);END IF;
 IF n<>1 THEN RAISE EXCEPTION 'GENERAL_INSTALL_MULTIPLE_OWNER_WARRANTS_NOT_SUPPORTED';END IF;
 SELECT * INTO r FROM reality_internal.governed_original_install_reviews_v1
 WHERE owner_id=(g->>'owner_id')::uuid AND shift_id=(g->>'shift_id')::uuid
  AND phase IN ('OWNER_APPROVED','INSTALL_INTENT_FENCED',
   'SOURCE_INSTALLED','DEPLOYMENT_VERIFIED');
 SELECT * INTO v FROM reality_internal.governed_original_install_approvals_v1
 WHERE approval_id=r.approval_receipt_id;
 IF NOT FOUND OR v.owner_id<>r.owner_id OR v.shift_id<>r.shift_id
  OR v.attempt_id<>r.attempt_id OR v.original_work_id<>r.original_work_id
  OR v.artifact_sha256<>r.candidate_artifact_sha256 OR
  v.candidate_commit_sha<>r.candidate_commit_sha OR
  v.expected_installed_blob_sha<>r.expected_installed_blob_sha OR
  v.isolated_branch<>r.exact_install_target_branch OR
  r.approved_at IS NULL OR r.approval_receipt_id IS NULL OR
  r.isolated_github_write_verified IS DISTINCT FROM true OR
  r.preview_auto_deploy_verified IS DISTINCT FROM true OR
  r.same_original_execution_and_settlement_contract_verified IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'GENERAL_INSTALL_CURRENT_EXACT_OWNER_APPROVAL_DRIFT';END IF;
 IF NOT EXISTS (SELECT 1 FROM reality_internal.riley_unattended_repair_originals_v1 j
  WHERE j.original_work_id=r.original_work_id AND j.owner_id=r.owner_id
   AND j.shift_id=r.shift_id AND j.phase='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL'
   AND j.installed=false AND j.production_changed=false
   AND j.original_settlement_receipt_ref IS NULL
   AND j.exact_approval_receipt_ref=
    'supabase:governed_original_install_approvals_v1:'||v.approval_id::text)
 THEN RAISE EXCEPTION 'GENERAL_INSTALL_ORIGINAL_APPROVAL_SOURCE_DRIFT';END IF;
 RETURN jsonb_build_object('status','GENERAL_INSTALL_OWNER_APPROVED_SOURCE_SCOPE',
 'phase',r.phase,'original_work_id',r.original_work_id,
 'owner_id',r.owner_id,'shift_id',r.shift_id,
 'attempt_id',r.attempt_id,'approval_receipt_id',r.approval_receipt_id,
 'target_branch',r.exact_install_target_branch,'target_path',r.source_file_path,
 'expected_preinstall_blob_sha',r.expected_preinstall_blob_sha,
 'expected_installed_blob_sha',r.expected_installed_blob_sha,
 'expected_parent_commit_sha',r.install_expected_parent_commit_sha,
 'installed_commit_sha',r.installed_commit_sha,
 'candidate_commit_sha',r.candidate_commit_sha,
 'candidate_artifact_sha256',r.candidate_artifact_sha256,
 'installation_authorized',true,
 'source_installed',(r.installed_commit_sha IS NOT NULL),
 'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_general_original_install_scope_v1()
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_general_original_install_scope_v1()
 TO service_role;
