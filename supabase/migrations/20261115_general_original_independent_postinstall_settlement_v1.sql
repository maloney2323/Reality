-- Final SAME original-job settlement only after the exact owner-approved
-- source commit independently passes original acceptance and Vercel release
-- provider readback. Does not invent ROI or human labor savings.
CREATE TABLE IF NOT EXISTS reality_internal.governed_original_independent_final_receipts_v1(
 receipt_id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
 original_work_id text UNIQUE NOT NULL REFERENCES reality_internal.governed_original_install_reviews_v1(original_work_id),
 owner_id uuid NOT NULL,shift_id uuid NOT NULL,attempt_id uuid UNIQUE NOT NULL,
 approval_receipt_id uuid UNIQUE NOT NULL REFERENCES reality_internal.governed_original_install_approvals_v1(approval_id),
 source_ref text NOT NULL,
 source_proof_sha256 text NOT NULL,
 candidate_commit_sha text NOT NULL CHECK(candidate_commit_sha~'^[a-f0-9]{40}$'),
 candidate_artifact_sha256 text NOT NULL CHECK(candidate_artifact_sha256~'^sha256:[a-f0-9]{64}$'),
 frozen_candidate_run_id bigint NOT NULL CHECK(frozen_candidate_run_id>10000),
 installed_commit_sha text NOT NULL CHECK(installed_commit_sha~'^[a-f0-9]{40}$'),
 installed_source_blob_sha text NOT NULL CHECK(installed_source_blob_sha~'^[a-f0-9]{40}$'),
 independent_original_acceptance_run_id bigint UNIQUE NOT NULL CHECK(independent_original_acceptance_run_id>10000),
 independent_gateway_run_id bigint NOT NULL CHECK(independent_gateway_run_id>10000),
 vercel_deployment_status_id bigint UNIQUE NOT NULL CHECK(vercel_deployment_status_id>0),
 official_vercel_app_check_run_id bigint UNIQUE NOT NULL CHECK(official_vercel_app_check_run_id>0),
 official_vercel_app_id bigint NOT NULL CHECK(official_vercel_app_id>0),
 final_evidence_sha256 text NOT NULL CHECK(final_evidence_sha256~'^sha256:[a-f0-9]{64}$'),
 outcome text NOT NULL DEFAULT 'SUCCEEDED' CHECK(outcome='SUCCEEDED'),
 human_baseline_hours numeric,
 actual_human_minutes numeric,
 actual_automation_cost_usd numeric,
 net_verified_labor_savings_usd numeric,
 roi_verification_status text NOT NULL DEFAULT 'NOT_MEASURED'
  CHECK(roi_verification_status IN ('NOT_MEASURED','MEASURED')),
 production_changed boolean NOT NULL DEFAULT false CHECK(production_changed=false),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CONSTRAINT no_unverified_cash_value_from_runtime_only CHECK(
  roi_verification_status<>'NOT_MEASURED' OR
   (actual_human_minutes IS NULL AND actual_automation_cost_usd IS NULL AND
    net_verified_labor_savings_usd IS NULL)),
 CONSTRAINT provider_runs_must_be_distinct CHECK(
  independent_original_acceptance_run_id<>independent_gateway_run_id
  AND independent_original_acceptance_run_id<>frozen_candidate_run_id
  AND independent_gateway_run_id<>frozen_candidate_run_id)
);
ALTER TABLE reality_internal.governed_original_independent_final_receipts_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reality_internal.governed_original_independent_final_receipts_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON reality_internal.governed_original_independent_final_receipts_v1 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_read_general_original_postinstall_scope_v1()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE r reality_internal.governed_original_install_reviews_v1%rowtype;
v reality_internal.governed_original_install_approvals_v1%rowtype;g jsonb;n int;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'GENERAL_POSTINSTALL_SCOPE_SERVICE_ONLY';END IF;
 g:=public.reality_read_current_shift_execution_graph_v1();
 IF g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'
   OR g->>'production_changed'<>'false'
 THEN RETURN jsonb_build_object('status','GENERAL_POSTINSTALL_OWNER_SHIFT_NOT_CURRENT',
  'original_job_completed',false,'production_changed',false);END IF;
 SELECT count(*) INTO n FROM reality_internal.governed_original_install_reviews_v1
 WHERE owner_id=(g->>'owner_id')::uuid AND shift_id=(g->>'shift_id')::uuid
  AND phase IN ('SOURCE_INSTALLED','DEPLOYMENT_VERIFIED','ORIGINAL_SETTLED');
 IF n=0 THEN RETURN jsonb_build_object('status','GENERAL_POSTINSTALL_NO_INSTALLED_ORIGINAL',
  'original_job_completed',false,'production_changed',false);END IF;
 IF n<>1 THEN RAISE EXCEPTION 'GENERAL_POSTINSTALL_ORIGINAL_NOT_UNIQUE';END IF;
 SELECT * INTO r FROM reality_internal.governed_original_install_reviews_v1
 WHERE owner_id=(g->>'owner_id')::uuid AND shift_id=(g->>'shift_id')::uuid
  AND phase IN ('SOURCE_INSTALLED','DEPLOYMENT_VERIFIED','ORIGINAL_SETTLED');
 SELECT * INTO v FROM reality_internal.governed_original_install_approvals_v1
 WHERE approval_id=r.approval_receipt_id;
 IF NOT FOUND OR v.owner_id<>r.owner_id OR v.shift_id<>r.shift_id
  OR v.original_work_id<>r.original_work_id OR v.attempt_id<>r.attempt_id OR
   v.candidate_commit_sha<>r.candidate_commit_sha
  OR v.artifact_sha256<>r.candidate_artifact_sha256
  OR r.installed_commit_sha IS NULL
  OR r.installed_commit_sha=r.candidate_commit_sha OR
  r.install_expected_parent_commit_sha IS NULL OR
  r.approval_receipt_id IS NULL OR r.approved_at IS NULL OR
  r.installation_fenced_at IS NULL OR
  r.isolated_github_write_verified IS DISTINCT FROM true OR
  r.preview_auto_deploy_verified IS DISTINCT FROM true OR
  r.same_original_execution_and_settlement_contract_verified IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'GENERAL_POSTINSTALL_SIGNED_OWNER_APPROVED_RELEASE_DRIFT';END IF;
 IF r.phase='ORIGINAL_SETTLED' THEN
 RETURN jsonb_build_object('status','GENERAL_POSTINSTALL_ALREADY_SETTLED',
  'original_work_id',r.original_work_id,'final_receipt_id',r.original_final_receipt_id,
  'original_job_completed',r.original_final_receipt_id IS NOT NULL,
  'production_changed',false); END IF;
 IF NOT EXISTS(SELECT 1 FROM reality_internal.riley_unattended_repair_originals_v1 j
  WHERE j.original_work_id=r.original_work_id AND j.owner_id=r.owner_id
  AND j.shift_id=r.shift_id AND j.phase='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL'
  AND j.installed=false AND j.production_changed=false
  AND j.exact_approval_receipt_ref='supabase:governed_original_install_approvals_v1:'||v.approval_id::text
  AND j.original_settlement_receipt_ref IS NULL)
 THEN RAISE EXCEPTION 'GENERAL_POSTINSTALL_ORIGINAL_NOT_CONTINUING';END IF;
 RETURN jsonb_build_object('status','GENERAL_POSTINSTALL_EXACT_ORIGINAL_PROVIDER_VERIFICATION_ELIGIBLE',
  'original_work_id',r.original_work_id,'owner_id',r.owner_id,'shift_id',r.shift_id,
  'attempt_id',r.attempt_id,'approval_receipt_id',v.approval_id,
  'source_ref',r.source_ref,'source_proof_sha256',r.source_proof_sha256,
  'candidate_commit_sha',r.candidate_commit_sha,
  'candidate_artifact_sha256',r.candidate_artifact_sha256,
  'frozen_candidate_run_id',r.independent_frozen_run_id,
  'integrated_test_run_id',r.integrated_test_run_id,
  'integrated_test_commit_sha',r.integrated_test_commit_sha,
  'expected_parent_commit_sha',r.install_expected_parent_commit_sha,
  'installed_commit_sha',r.installed_commit_sha,
  'installed_source_blob_sha',r.expected_installed_blob_sha,
  'target_branch',r.exact_install_target_branch,'target_path',r.source_file_path,
  'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_general_original_postinstall_scope_v1()
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_general_original_postinstall_scope_v1()
 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_record_general_original_independent_settlement_v1(
 p_attempt_id uuid,p_installed_commit_sha text,p_source_blob_sha text,
 p_original_acceptance_run_id bigint,p_gateway_run_id bigint,
 p_vercel_status_id bigint,p_vercel_app_check_id bigint,p_vercel_app_id bigint,
 p_final_evidence_sha256 text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE r reality_internal.governed_original_install_reviews_v1%rowtype;
 j reality_internal.riley_unattended_repair_originals_v1%rowtype;
 a reality_internal.governed_original_install_approvals_v1%rowtype;
 v reality_internal.governed_original_independent_final_receipts_v1%rowtype;g jsonb;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'GENERAL_SETTLEMENT_SERVICE_ONLY';END IF;
 IF p_attempt_id IS NULL OR p_installed_commit_sha!~'^[a-f0-9]{40}$'
  OR p_source_blob_sha!~'^[a-f0-9]{40}$'
  OR p_final_evidence_sha256!~'^sha256:[a-f0-9]{64}$'
  OR p_original_acceptance_run_id<=10000 OR p_gateway_run_id<=10000
  OR p_vercel_status_id<=0 OR p_vercel_app_check_id<=0 OR p_vercel_app_id<=0
  OR p_original_acceptance_run_id=p_gateway_run_id
 THEN RAISE EXCEPTION 'GENERAL_SETTLEMENT_INDEPENDENT_EVIDENCE_REQUIRED';END IF;
 SELECT * INTO r FROM reality_internal.governed_original_install_reviews_v1
 WHERE attempt_id=p_attempt_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'GENERAL_SETTLEMENT_SOURCE_WARRANT_NOT_FOUND';END IF;
 SELECT * INTO v FROM reality_internal.governed_original_independent_final_receipts_v1
 WHERE original_work_id=r.original_work_id;
 IF FOUND THEN
  IF v.attempt_id<>p_attempt_id OR v.installed_commit_sha<>p_installed_commit_sha
   OR v.installed_source_blob_sha<>p_source_blob_sha
   OR v.independent_original_acceptance_run_id<>p_original_acceptance_run_id
   OR v.independent_gateway_run_id<>p_gateway_run_id
   OR v.vercel_deployment_status_id<>p_vercel_status_id
   OR v.official_vercel_app_check_run_id<>p_vercel_app_check_id
   OR v.official_vercel_app_id<>p_vercel_app_id
   OR v.final_evidence_sha256<>p_final_evidence_sha256
  THEN RAISE EXCEPTION 'GENERAL_SETTLEMENT_FINAL_RECEIPT_REPLAY_CONFLICT';END IF;
  RETURN jsonb_build_object('status','GENERAL_ORIGINAL_ALREADY_INDEPENDENTLY_SETTLED',
   'original_work_id',v.original_work_id,'final_receipt_id',v.receipt_id,
   'original_job_completed',true,'production_changed',false,
   'roi_verified',false,'roi_status',v.roi_verification_status);END IF;
 g:=public.reality_read_current_shift_execution_graph_v1();
 SELECT * INTO j FROM reality_internal.riley_unattended_repair_originals_v1
 WHERE original_work_id=r.original_work_id FOR UPDATE;
 SELECT * INTO a FROM reality_internal.governed_original_install_approvals_v1
 WHERE approval_id=r.approval_receipt_id;
 IF NOT FOUND OR r.phase NOT IN ('SOURCE_INSTALLED','DEPLOYMENT_VERIFIED')
  OR r.installed_commit_sha<>p_installed_commit_sha
  OR r.expected_installed_blob_sha<>p_source_blob_sha
  OR r.installation_fenced_at IS NULL OR r.approved_at IS NULL
  OR r.original_final_receipt_id IS NOT NULL OR
  r.isolated_github_write_verified IS DISTINCT FROM true OR
  r.preview_auto_deploy_verified IS DISTINCT FROM true OR
  r.same_original_execution_and_settlement_contract_verified IS DISTINCT FROM true
  OR a.original_work_id<>r.original_work_id OR a.owner_id<>r.owner_id OR
  a.shift_id<>r.shift_id OR a.attempt_id<>r.attempt_id OR
  a.artifact_sha256<>r.candidate_artifact_sha256 OR
  j.original_work_id<>r.original_work_id OR j.owner_id<>r.owner_id OR
  j.shift_id<>r.shift_id OR
  j.phase<>'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL' OR
  j.installed IS DISTINCT FROM false OR j.production_changed IS DISTINCT FROM false OR
  j.original_settlement_receipt_ref IS NOT NULL OR
  j.exact_approval_receipt_ref IS DISTINCT FROM
   'supabase:governed_original_install_approvals_v1:'||a.approval_id::text OR
  g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED' OR
  g->>'owner_id'<>r.owner_id::text OR g->>'shift_id'<>r.shift_id::text OR
  g->>'production_changed'<>'false'
 THEN RAISE EXCEPTION 'GENERAL_SETTLEMENT_ORIGINAL_APPROVAL_OR_RELEASE_DRIFT';END IF;
 INSERT INTO reality_internal.governed_original_independent_final_receipts_v1(
  original_work_id,owner_id,shift_id,attempt_id,approval_receipt_id,
  source_ref,source_proof_sha256,candidate_commit_sha,candidate_artifact_sha256,
  frozen_candidate_run_id,installed_commit_sha,installed_source_blob_sha,
  independent_original_acceptance_run_id,independent_gateway_run_id,
  vercel_deployment_status_id,official_vercel_app_check_run_id,
  official_vercel_app_id,final_evidence_sha256,
  human_baseline_hours,actual_human_minutes,actual_automation_cost_usd,
  net_verified_labor_savings_usd,roi_verification_status,production_changed)
 VALUES(r.original_work_id,r.owner_id,r.shift_id,r.attempt_id,r.approval_receipt_id,
  r.source_ref,r.source_proof_sha256,r.candidate_commit_sha,r.candidate_artifact_sha256,
  r.independent_frozen_run_id,r.installed_commit_sha,r.expected_installed_blob_sha,
  p_original_acceptance_run_id,p_gateway_run_id,
  p_vercel_status_id,p_vercel_app_check_id,p_vercel_app_id,p_final_evidence_sha256,
  NULL,NULL,NULL,NULL,'NOT_MEASURED',false)
 RETURNING * INTO v;
 UPDATE reality_internal.riley_unattended_repair_originals_v1
 SET phase='SETTLED',installed=true,
     original_settlement_receipt_ref=
      'supabase:governed_original_independent_final_receipts_v1:'||v.receipt_id::text
 WHERE original_work_id=r.original_work_id
   AND phase='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL' AND installed=false
   AND original_settlement_receipt_ref IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'GENERAL_SETTLEMENT_SAME_ORIGINAL_ATOMIC_RACE';END IF;
 UPDATE reality_internal.governed_original_install_reviews_v1
 SET phase='ORIGINAL_SETTLED',original_final_receipt_id=v.receipt_id,
     updated_at=clock_timestamp()
 WHERE original_work_id=r.original_work_id
   AND phase IN ('SOURCE_INSTALLED','DEPLOYMENT_VERIFIED')
   AND original_final_receipt_id IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'GENERAL_SETTLEMENT_FINAL_WARRANT_ATOMIC_RACE';END IF;
 RETURN jsonb_build_object('status','GENERAL_ORIGINAL_INDEPENDENTLY_SETTLED_WITH_FINAL_RECEIPT',
  'original_work_id',r.original_work_id,'shift_id',r.shift_id,
  'approval_receipt_id',a.approval_id,
  'installed_commit_sha',r.installed_commit_sha,
  'original_acceptance_run_id',p_original_acceptance_run_id,
  'vercel_deployment_status_id',p_vercel_status_id,
  'final_receipt_id',v.receipt_id,'final_receipt_sha256',p_final_evidence_sha256,
  'original_job_completed',true,'production_changed',false,
  'roi_verified',false,'roi_status','NOT_MEASURED',
  'no_third_confirmation',true);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_record_general_original_independent_settlement_v1(
 uuid,text,text,bigint,bigint,bigint,bigint,bigint,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_general_original_independent_settlement_v1(
 uuid,text,text,bigint,bigint,bigint,bigint,bigint,text)
 TO service_role;
