-- Generalized installation review of a genuinely independently verified
-- original-job recovery attempt. Stages ONLY evidence and target/source
-- boundaries. This is NOT an owner approval or an installation/settlement.
-- Existing owner/shift/warrant/Universe evidence remains authoritative.
CREATE TABLE IF NOT EXISTS reality_internal.governed_original_install_reviews_v1(
 original_work_id text PRIMARY KEY REFERENCES reality_internal.riley_unattended_repair_originals_v1(original_work_id),
 attempt_id uuid UNIQUE NOT NULL REFERENCES reality_internal.riley_same_original_recovery_attempts_v2(attempt_id),
 owner_id uuid NOT NULL, shift_id uuid NOT NULL,
 source_ref text NOT NULL,
 source_proof_sha256 text NOT NULL CHECK(source_proof_sha256~'^sha256:[a-f0-9]{64}$'),
 source_file_path text NOT NULL CHECK(source_file_path~'^src/[a-zA-Z0-9/_-]+[.]js$'),
 candidate_commit_sha text NOT NULL CHECK(candidate_commit_sha~'^[a-f0-9]{40}$'),
 candidate_artifact_sha256 text NOT NULL CHECK(candidate_artifact_sha256~'^sha256:[a-f0-9]{64}$'),
 independent_frozen_run_id bigint NOT NULL CHECK(independent_frozen_run_id>10000),
 independent_frozen_attestation_pr bigint NOT NULL CHECK(independent_frozen_attestation_pr>0),
 exact_install_target_branch text NOT NULL CHECK(
  exact_install_target_branch~'^reality/[a-zA-Z0-9/_-]{10,135}$'
  AND exact_install_target_branch NOT LIKE '%..%'
  AND exact_install_target_branch NOT LIKE '%//%'
  AND exact_install_target_branch NOT LIKE 'reality/riley/%'),
 expected_preinstall_blob_sha text NOT NULL CHECK(expected_preinstall_blob_sha~'^[a-f0-9]{40}$'),
 expected_installed_blob_sha text NOT NULL CHECK(expected_installed_blob_sha~'^[a-f0-9]{40}$'),
 integrated_test_commit_sha text NOT NULL CHECK(integrated_test_commit_sha~'^[a-f0-9]{40}$'),
 integrated_test_run_id bigint NOT NULL CHECK(integrated_test_run_id>10000),
 integrated_test_pr bigint NOT NULL CHECK(integrated_test_pr>0),
 phase text NOT NULL DEFAULT 'REVIEW_STAGED_NOT_INSTALL_READY'
  CHECK(phase IN ('REVIEW_STAGED_NOT_INSTALL_READY',
   'PREINSTALL_TRANSPORT_VERIFIED','READY_FOR_EXACT_OWNER_APPROVAL',
   'OWNER_APPROVED','INSTALL_INTENT_FENCED','SOURCE_INSTALLED',
   'DEPLOYMENT_VERIFIED','ORIGINAL_SETTLED','EFFECT_UNVERIFIED')),
 isolated_github_write_verified boolean NOT NULL DEFAULT false,
 preview_auto_deploy_verified boolean NOT NULL DEFAULT false,
 same_original_execution_and_settlement_contract_verified boolean NOT NULL DEFAULT false,
 approval_receipt_id uuid UNIQUE,
 approved_at timestamptz,
 installation_fenced_at timestamptz,
 installed_commit_sha text CHECK(installed_commit_sha IS NULL OR installed_commit_sha~'^[a-f0-9]{40}$'),
 original_final_receipt_id uuid UNIQUE,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CONSTRAINT no_install_without_exact_approval CHECK(
   phase NOT IN ('OWNER_APPROVED','INSTALL_INTENT_FENCED','SOURCE_INSTALLED',
    'DEPLOYMENT_VERIFIED','ORIGINAL_SETTLED')
   OR (approval_receipt_id IS NOT NULL AND approved_at IS NOT NULL)),
 CONSTRAINT no_claimed_readiness_without_all_three_gates CHECK(
   phase NOT IN ('READY_FOR_EXACT_OWNER_APPROVAL','OWNER_APPROVED',
    'INSTALL_INTENT_FENCED','SOURCE_INSTALLED','DEPLOYMENT_VERIFIED','ORIGINAL_SETTLED')
   OR (isolated_github_write_verified AND preview_auto_deploy_verified
    AND same_original_execution_and_settlement_contract_verified)),
 CONSTRAINT approval_receipt_requires_approval CHECK(
  approval_receipt_id IS NULL OR approved_at IS NOT NULL),
 CONSTRAINT settlement_needs_real_receipt CHECK(
  phase<>'ORIGINAL_SETTLED' OR
    (installed_commit_sha IS NOT NULL AND original_final_receipt_id IS NOT NULL)),
 CONSTRAINT original_candidate_distinct_from_target_source CHECK(
   expected_preinstall_blob_sha<>expected_installed_blob_sha)
);
ALTER TABLE reality_internal.governed_original_install_reviews_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reality_internal.governed_original_install_reviews_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON reality_internal.governed_original_install_reviews_v1 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_stage_generalized_original_install_review_v1(
 p_attempt_id uuid,p_target_branch text,p_preinstall_blob text,
 p_installed_blob text,p_integration_commit text,
 p_integration_run_id bigint,p_integration_pr bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE a reality_internal.riley_same_original_recovery_attempts_v2%rowtype;
 j reality_internal.riley_unattended_repair_originals_v1%rowtype;
 t reality_internal.riley_same_original_frozen_ci_attestations_v1%rowtype;
 current_row reality_internal.governed_original_install_reviews_v1%rowtype;
 g jsonb; v_count int;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'GENERALIZED_INSTALL_STAGING_SERVICE_ONLY'; END IF;
 IF p_attempt_id IS NULL OR
   p_target_branch!~'^reality/[a-zA-Z0-9/_-]{10,135}$' OR
   p_target_branch LIKE '%..%' OR p_target_branch LIKE '%//%' OR
   p_target_branch LIKE 'reality/riley/%' OR
   p_preinstall_blob!~'^[a-f0-9]{40}$' OR
   p_installed_blob!~'^[a-f0-9]{40}$' OR
   p_preinstall_blob=p_installed_blob OR
   p_integration_commit!~'^[a-f0-9]{40}$' OR
   p_integration_run_id IS NULL OR p_integration_run_id<=10000 OR
   p_integration_pr IS NULL OR p_integration_pr<=0
 THEN RAISE EXCEPTION 'GENERALIZED_INSTALL_EXACT_TARGET_AND_TEST_REQUIRED'; END IF;
 SELECT * INTO a FROM reality_internal.riley_same_original_recovery_attempts_v2
 WHERE attempt_id=p_attempt_id AND phase='CI_PASSED' AND ci_conclusion='success'
  AND ci_run_id IS NOT NULL AND ci_commit_sha=candidate_staged_commit_sha
  AND proposed_source_sha256~'^sha256:[a-f0-9]{64}$';
 IF NOT FOUND THEN RAISE EXCEPTION 'GENERALIZED_INSTALL_FROZEN_CANDIDATE_NOT_PASSED'; END IF;
 SELECT * INTO t FROM reality_internal.riley_same_original_frozen_ci_attestations_v1
 WHERE attempt_id=a.attempt_id AND original_work_id=a.original_work_id
  AND owner_id=a.owner_id AND shift_id=a.shift_id
  AND candidate_commit_sha=a.candidate_staged_commit_sha
  AND independent_run_id=a.ci_run_id AND independent_run_conclusion='success';
 IF NOT FOUND THEN RAISE EXCEPTION 'GENERALIZED_INSTALL_EXACT_PINNED_FROZEN_EVIDENCE_REQUIRED'; END IF;
 SELECT * INTO j FROM reality_internal.riley_unattended_repair_originals_v1
 WHERE original_work_id=a.original_work_id AND owner_id=a.owner_id
  AND shift_id=a.shift_id AND issue_url=a.source_ref
  AND shift_source_proof_sha256=a.source_proof_sha256
  AND phase='SOURCE_ADMITTED'
  AND installed=false AND production_changed=false
  AND exact_approval_receipt_ref IS NULL
  AND original_settlement_receipt_ref IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'GENERALIZED_INSTALL_ORIGINAL_ALREADY_CHANGED'; END IF;
 g:=public.reality_read_current_shift_execution_graph_v1();
 IF g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'
   OR g->>'owner_id'<>a.owner_id::text OR g->>'shift_id'<>a.shift_id::text
   OR g->>'completion_bound'<>'true'
   OR g->>'installation_authorized'<>'false'
   OR g->>'production_changed'<>'false'
   OR NOT EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(g->'jobs') x
     WHERE x->>'original_work_id'=a.original_work_id
      AND x->>'source_ref'=a.source_ref
      AND x->>'source_proof_sha256'=a.source_proof_sha256
      AND x->>'original_kind'='REAL_ENGINEERING_REPAIR_ORIGINAL'
      AND x->>'phase'='SOURCE_ADMITTED'
      AND x->>'independent_source_proof_verified'='true')
 THEN RAISE EXCEPTION 'GENERALIZED_INSTALL_ACTIVE_OWNER_SHIFT_DRIFT'; END IF;
 SELECT count(*) INTO v_count FROM reality_internal.governed_original_install_reviews_v1
 WHERE original_work_id=a.original_work_id;
 IF v_count>1 THEN RAISE EXCEPTION 'GENERALIZED_INSTALL_MULTIPLE_RECORDS'; END IF;
 INSERT INTO reality_internal.governed_original_install_reviews_v1(
  original_work_id,attempt_id,owner_id,shift_id,source_ref,source_proof_sha256,
  source_file_path,candidate_commit_sha,candidate_artifact_sha256,
  independent_frozen_run_id,independent_frozen_attestation_pr,
  exact_install_target_branch,expected_preinstall_blob_sha,
  expected_installed_blob_sha,integrated_test_commit_sha,
  integrated_test_run_id,integrated_test_pr)
 VALUES(a.original_work_id,a.attempt_id,a.owner_id,a.shift_id,a.source_ref,
  a.source_proof_sha256,a.source_path,a.candidate_staged_commit_sha,
  a.proposed_source_sha256,a.ci_run_id,t.verification_pr_number,
  p_target_branch,p_preinstall_blob,p_installed_blob,
  p_integration_commit,p_integration_run_id,p_integration_pr)
 ON CONFLICT DO NOTHING;
 SELECT * INTO current_row FROM reality_internal.governed_original_install_reviews_v1
 WHERE original_work_id=a.original_work_id;
 IF NOT FOUND OR
  current_row.attempt_id<>a.attempt_id OR
  current_row.owner_id<>a.owner_id OR current_row.shift_id<>a.shift_id OR
  current_row.source_ref<>a.source_ref OR
  current_row.source_proof_sha256<>a.source_proof_sha256 OR
  current_row.source_file_path<>a.source_path OR
  current_row.candidate_commit_sha<>a.candidate_staged_commit_sha OR
  current_row.candidate_artifact_sha256<>a.proposed_source_sha256 OR
  current_row.independent_frozen_run_id<>a.ci_run_id OR
  current_row.independent_frozen_attestation_pr<>t.verification_pr_number OR
  current_row.exact_install_target_branch<>p_target_branch OR
  current_row.expected_preinstall_blob_sha<>p_preinstall_blob OR
  current_row.expected_installed_blob_sha<>p_installed_blob OR
  current_row.integrated_test_commit_sha<>p_integration_commit OR
  current_row.integrated_test_run_id<>p_integration_run_id OR
  current_row.integrated_test_pr<>p_integration_pr
 THEN RAISE EXCEPTION 'GENERALIZED_INSTALL_EXISTING_REVIEW_FROZEN_CONFLICT'; END IF;
 RETURN jsonb_build_object(
  'status','GENERALIZED_ORIGINAL_EXACT_REVIEW_STAGED_TRANSPORT_NOT_YET_READY',
  'original_work_id',current_row.original_work_id,
  'attempt_id',current_row.attempt_id,
  'shift_id',current_row.shift_id,
  'candidate_commit_sha',current_row.candidate_commit_sha,
  'candidate_artifact_sha256',current_row.candidate_artifact_sha256,
  'independent_frozen_run_id',current_row.independent_frozen_run_id,
  'integrated_test_run_id',current_row.integrated_test_run_id,
  'exact_install_target_branch',current_row.exact_install_target_branch,
  'expected_preinstall_blob_sha',current_row.expected_preinstall_blob_sha,
  'expected_installed_blob_sha',current_row.expected_installed_blob_sha,
  'owner_approval_ready',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_stage_generalized_original_install_review_v1(
 uuid,text,text,text,text,bigint,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_stage_generalized_original_install_review_v1(
 uuid,text,text,text,text,bigint,bigint) TO service_role;

CREATE OR REPLACE FUNCTION public.reality_read_generalized_original_install_review_v1(
 p_owner_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
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
 'original_work_id',r.original_work_id,'owner_id',r.owner_id,
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
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_generalized_original_install_review_v1(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_generalized_original_install_review_v1(uuid)
 TO service_role;

-- Authoritative service-only claim-free read of a uniquely passed original.
-- Preview worker discovers the integration PR and CI from GitHub itself,
-- not a model-selected run id, Chat text or hardcoded original number.
CREATE OR REPLACE FUNCTION public.reality_read_next_generalized_verified_install_review_v1()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE g jsonb; v_candidate record; v_count integer;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'GENERALIZED_INSTALL_REVIEW_DISCOVERY_SERVICE_ONLY'; END IF;
 g:=public.reality_read_current_shift_execution_graph_v1();
 IF g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'
  OR g->>'installation_authorized'<>'false'
  OR g->>'production_changed'<>'false'
 THEN RETURN jsonb_build_object('status','GENERALIZED_INSTALL_NO_CURRENT_AUTHORIZED_SHIFT',
  'installation_authorized',false,'original_job_completed',false,'production_changed',false);END IF;
 SELECT count(*) INTO v_count
 FROM reality_internal.riley_same_original_recovery_attempts_v2 a
 JOIN reality_internal.riley_same_original_frozen_ci_attestations_v1 t
  ON t.attempt_id=a.attempt_id AND t.original_work_id=a.original_work_id
  AND t.candidate_commit_sha=a.candidate_staged_commit_sha
  AND t.independent_run_id=a.ci_run_id
  AND t.independent_run_conclusion='success'
 JOIN reality_internal.riley_unattended_repair_originals_v1 j
  ON j.original_work_id=a.original_work_id AND j.owner_id=a.owner_id
  AND j.shift_id=a.shift_id AND j.phase='SOURCE_ADMITTED'
  AND j.installed=false AND j.production_changed=false
  AND j.original_settlement_receipt_ref IS NULL
 WHERE a.phase='CI_PASSED' AND a.ci_conclusion='success'
  AND a.owner_id=(g->>'owner_id')::uuid AND a.shift_id=(g->>'shift_id')::uuid
  AND NOT EXISTS(SELECT 1 FROM reality_internal.governed_original_install_reviews_v1 r
   WHERE r.original_work_id=a.original_work_id);
 IF v_count=0 THEN RETURN jsonb_build_object('status','NO_UNSTAGED_PASSED_ORIGINAL_INSTALL_REVIEW',
  'installation_authorized',false,'original_job_completed',false,'production_changed',false);END IF;
 IF v_count>1 THEN RAISE EXCEPTION 'GENERALIZED_INSTALL_MULTIPLE_PASSED_ORIGINALS_REQUIRE_SELECTION';END IF;
 SELECT a.*,t.verification_pr_number
 INTO v_candidate
 FROM reality_internal.riley_same_original_recovery_attempts_v2 a
 JOIN reality_internal.riley_same_original_frozen_ci_attestations_v1 t
  ON t.attempt_id=a.attempt_id AND t.original_work_id=a.original_work_id
  AND t.candidate_commit_sha=a.candidate_staged_commit_sha
  AND t.independent_run_id=a.ci_run_id
  AND t.independent_run_conclusion='success'
 JOIN reality_internal.riley_unattended_repair_originals_v1 j
  ON j.original_work_id=a.original_work_id AND j.owner_id=a.owner_id
  AND j.shift_id=a.shift_id AND j.phase='SOURCE_ADMITTED'
  AND j.installed=false AND j.production_changed=false
  AND j.original_settlement_receipt_ref IS NULL
 WHERE a.phase='CI_PASSED' AND a.ci_conclusion='success'
  AND a.owner_id=(g->>'owner_id')::uuid AND a.shift_id=(g->>'shift_id')::uuid
  AND NOT EXISTS(SELECT 1 FROM reality_internal.governed_original_install_reviews_v1 r
   WHERE r.original_work_id=a.original_work_id);
 IF v_candidate.original_work_id IS NULL OR v_candidate.source_path IS NULL OR
   v_candidate.source_commit_sha!~'^[a-f0-9]{40}$' OR
   v_candidate.candidate_staged_commit_sha!~'^[a-f0-9]{40}$' OR
   v_candidate.proposed_source_sha256!~'^sha256:[a-f0-9]{64}$'
 THEN RAISE EXCEPTION 'GENERALIZED_INSTALL_SOURCE_IDENTITY_DRIFT';END IF;
 RETURN jsonb_build_object('status','PASSED_SAME_ORIGINAL_INSTALL_REVIEW_ELIGIBLE',
  'attempt_id',v_candidate.attempt_id,'original_work_id',v_candidate.original_work_id,
  'owner_id',v_candidate.owner_id,'shift_id',v_candidate.shift_id,'source_ref',v_candidate.source_ref,
  'source_path',v_candidate.source_path,'source_commit_sha',v_candidate.source_commit_sha,
  'candidate_commit_sha',v_candidate.candidate_staged_commit_sha,
  'candidate_artifact_sha256',v_candidate.proposed_source_sha256,
  'replacement_find',v_candidate.replacement_find,'replacement_with',v_candidate.replacement_with,
  'independent_frozen_run_id',v_candidate.ci_run_id,
  'installation_authorized',false,'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_next_generalized_verified_install_review_v1()
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_next_generalized_verified_install_review_v1()
 TO service_role;
