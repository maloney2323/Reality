-- Same-original, general capability installation, bound to an independently
-- passed corrective recovery and preverified exact release-continuation route.
-- NO installation authority from shift authorization, model output, or CI.
ALTER TABLE reality_internal.governed_original_install_reviews_v1
 ADD COLUMN IF NOT EXISTS install_expected_parent_commit_sha text
 CHECK(install_expected_parent_commit_sha IS NULL OR
       install_expected_parent_commit_sha~'^[a-f0-9]{40}
 approval_id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
 request_id uuid UNIQUE NOT NULL,
 original_work_id text UNIQUE NOT NULL REFERENCES reality_internal.governed_original_install_reviews_v1(original_work_id),
 attempt_id uuid UNIQUE NOT NULL,
 owner_id uuid NOT NULL,
 shift_id uuid NOT NULL,
 candidate_commit_sha text NOT NULL CHECK(candidate_commit_sha~'^[a-f0-9]{40}$'),
 artifact_sha256 text NOT NULL CHECK(artifact_sha256~'^sha256:[a-f0-9]{64}$'),
 expected_installed_blob_sha text NOT NULL CHECK(expected_installed_blob_sha~'^[a-f0-9]{40}$'),
 isolated_branch text NOT NULL,
 approved_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE reality_internal.governed_original_install_approvals_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reality_internal.governed_original_install_approvals_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON reality_internal.governed_original_install_approvals_v1 TO service_role;

-- Called ONLY by a signed-in, non-anonymous owner whose explicit single
-- Chat click presents the exact immutable candidate and request identifier.
CREATE OR REPLACE FUNCTION public.reality_owner_approve_general_original_install_v1(
 p_original_work_id text,p_attempt_id uuid,p_candidate_commit_sha text,
 p_artifact_sha256 text,p_intent text,p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE r reality_internal.governed_original_install_reviews_v1%rowtype;
 j reality_internal.riley_unattended_repair_originals_v1%rowtype;
 a reality_internal.riley_same_original_recovery_attempts_v2%rowtype;
 v reality_internal.governed_original_install_approvals_v1%rowtype;
 g jsonb; v_owner uuid:=auth.uid();
BEGIN
 IF auth.jwt()->>'role'<>'authenticated'
  OR coalesce(auth.jwt()->>'is_anonymous','false')='true'
  OR v_owner IS NULL OR p_request_id IS NULL
  OR p_intent<>'OWNER_APPROVE_EXACT_INDEPENDENTLY_VERIFIED_ISOLATED_REPAIR'
  OR p_original_work_id!~'^work:[a-f0-9]{32}$'
  OR p_candidate_commit_sha!~'^[a-f0-9]{40}$'
  OR p_artifact_sha256!~'^sha256:[a-f0-9]{64}$'
  OR p_attempt_id IS NULL
 THEN RAISE EXCEPTION 'GENERAL_ORIGINAL_EXPLICIT_SIGNED_OWNER_CLICK_REQUIRED';END IF;
 SELECT * INTO r FROM reality_internal.governed_original_install_reviews_v1
 WHERE original_work_id=p_original_work_id FOR UPDATE;
 IF NOT FOUND OR r.owner_id<>v_owner OR r.attempt_id<>p_attempt_id OR
   r.candidate_commit_sha<>p_candidate_commit_sha OR
   r.candidate_artifact_sha256<>p_artifact_sha256
 THEN RAISE EXCEPTION 'GENERAL_ORIGINAL_OWNER_EXACT_ARTIFACT_SCOPE_DRIFT';END IF;
 SELECT * INTO v FROM reality_internal.governed_original_install_approvals_v1
 WHERE original_work_id=r.original_work_id;
 IF FOUND THEN
  IF v.request_id<>p_request_id OR v.owner_id<>v_owner OR
    v.attempt_id<>r.attempt_id OR v.artifact_sha256<>r.candidate_artifact_sha256 OR
    v.candidate_commit_sha<>r.candidate_commit_sha
  THEN RAISE EXCEPTION 'GENERAL_ORIGINAL_EXACT_APPROVAL_ALREADY_CONSUMED';END IF;
  RETURN jsonb_build_object('status','GENERAL_ORIGINAL_SAME_APPROVAL_ALREADY_RECORDED',
    'original_work_id',v.original_work_id,'shift_id',v.shift_id,
    'approval_id',v.approval_id,'approval_recorded',true,
    'installation_authorized',true,'installation_completed',r.installed_commit_sha IS NOT NULL,
    'original_job_completed',r.original_final_receipt_id IS NOT NULL,
    'no_third_confirmation',true,'production_changed',false);
 END IF;
 g:=public.reality_read_current_shift_execution_graph_v1();
 IF r.phase<>'READY_FOR_EXACT_OWNER_APPROVAL' OR
    r.isolated_github_write_verified IS DISTINCT FROM true OR
    r.preview_auto_deploy_verified IS DISTINCT FROM true OR
    r.same_original_execution_and_settlement_contract_verified IS DISTINCT FROM true OR
    r.approval_receipt_id IS NOT NULL OR r.approved_at IS NOT NULL OR
    r.installation_fenced_at IS NOT NULL OR r.installed_commit_sha IS NOT NULL OR
    r.original_final_receipt_id IS NOT NULL OR
    g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED' OR
    g->>'owner_id'<>v_owner::text OR g->>'shift_id'<>r.shift_id::text OR
    g->>'installation_authorized'<>'false' OR g->>'production_changed'<>'false'
 THEN RAISE EXCEPTION 'GENERAL_ORIGINAL_PREAPPROVAL_RELEASE_CONTINUATION_NOT_VERIFIED';END IF;
 SELECT * INTO j FROM reality_internal.riley_unattended_repair_originals_v1
 WHERE original_work_id=r.original_work_id AND shift_id=r.shift_id AND owner_id=r.owner_id
 FOR UPDATE;
 SELECT * INTO a FROM reality_internal.riley_same_original_recovery_attempts_v2
 WHERE attempt_id=r.attempt_id AND original_work_id=r.original_work_id
  AND owner_id=r.owner_id AND shift_id=r.shift_id;
 IF NOT FOUND OR j.original_work_id IS NULL OR
  j.phase<>'SOURCE_ADMITTED' OR j.installed IS DISTINCT FROM false OR
  j.production_changed IS DISTINCT FROM false OR
  j.issue_url<>r.source_ref OR
  j.shift_source_proof_sha256<>r.source_proof_sha256 OR
  j.exact_approval_receipt_ref IS NOT NULL OR
  j.original_settlement_receipt_ref IS NOT NULL OR
  a.phase<>'CI_PASSED' OR a.ci_conclusion<>'success' OR
  a.ci_run_id<>r.independent_frozen_run_id OR
  a.candidate_staged_commit_sha<>r.candidate_commit_sha OR
  a.proposed_source_sha256<>r.candidate_artifact_sha256
 THEN RAISE EXCEPTION 'GENERAL_ORIGINAL_VERIFIED_SOURCE_JOB_DRIFT';END IF;
 INSERT INTO reality_internal.governed_original_install_approvals_v1(
  request_id,original_work_id,attempt_id,owner_id,shift_id,
  candidate_commit_sha,artifact_sha256,expected_installed_blob_sha,isolated_branch)
 VALUES(p_request_id,r.original_work_id,r.attempt_id,v_owner,r.shift_id,
  r.candidate_commit_sha,r.candidate_artifact_sha256,
  r.expected_installed_blob_sha,r.exact_install_target_branch)
 RETURNING * INTO v;
 UPDATE reality_internal.riley_unattended_repair_originals_v1 SET
  phase='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL',
  candidate_commit_sha=r.candidate_commit_sha,
  candidate_artifact_sha256=r.candidate_artifact_sha256,
  independent_proof_run_id=r.independent_frozen_run_id,
  model_response_id=a.model_response_id,
  exact_approval_receipt_ref=
   'supabase:governed_original_install_approvals_v1:'||v.approval_id::text
 WHERE original_work_id=r.original_work_id AND phase='SOURCE_ADMITTED'
   AND exact_approval_receipt_ref IS NULL AND installed=false;
 IF NOT FOUND THEN RAISE EXCEPTION 'GENERAL_ORIGINAL_APPROVAL_TO_SOURCE_JOB_ATOMIC_RACE';END IF;
 UPDATE reality_internal.governed_original_install_reviews_v1 SET
  phase='OWNER_APPROVED',approval_receipt_id=v.approval_id,
  approved_at=v.approved_at,updated_at=clock_timestamp()
 WHERE original_work_id=r.original_work_id AND phase='READY_FOR_EXACT_OWNER_APPROVAL'
  AND approval_receipt_id IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'GENERAL_ORIGINAL_APPROVAL_TO_INSTALL_REVIEW_ATOMIC_RACE';END IF;
 RETURN jsonb_build_object('status','GENERAL_ORIGINAL_OWNER_APPROVED_AUTO_CONTINUATION',
  'original_work_id',r.original_work_id,'shift_id',r.shift_id,
  'attempt_id',r.attempt_id,'approval_id',v.approval_id,
  'candidate_commit_sha',r.candidate_commit_sha,
  'artifact_sha256',r.candidate_artifact_sha256,
  'approval_recorded',true,'installation_authorized',true,
  'installation_completed',false,'original_job_completed',false,
  'production_changed',false,'no_third_confirmation',true);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_owner_approve_general_original_install_v1(
 text,uuid,text,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reality_owner_approve_general_original_install_v1(
 text,uuid,text,text,text,uuid) TO authenticated;

-- A service wake cannot create the approval, only claim the exact approved
-- installation intent once. A failed/uncertain GitHub PUT is GET-only
-- reconciliation; a retry cannot silently make a second source mutation.
CREATE OR REPLACE FUNCTION public.reality_claim_general_original_install_v1(p_expected_head_sha text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE r reality_internal.governed_original_install_reviews_v1%rowtype;
 j reality_internal.riley_unattended_repair_originals_v1%rowtype;
 v reality_internal.governed_original_install_approvals_v1%rowtype;
 g jsonb;n int;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'GENERAL_INSTALL_SERVICE_ONLY';END IF;
 IF coalesce(p_expected_head_sha,'')!~'^[a-f0-9]{40}
 SELECT count(*) INTO n FROM reality_internal.governed_original_install_reviews_v1
 WHERE phase IN ('OWNER_APPROVED','INSTALL_INTENT_FENCED','SOURCE_INSTALLED','DEPLOYMENT_VERIFIED');
 IF n=0 THEN RETURN jsonb_build_object('status','GENERAL_INSTALL_NO_EXACT_OWNER_APPROVAL_NO_WRITE',
  'installation_authorized',false,'source_installed',false,
  'original_job_completed',false,'production_changed',false);END IF;
 IF n>1 THEN RAISE EXCEPTION 'GENERAL_INSTALL_MULTIPLE_APPROVED_ORIGINALS_REQUIRE_FENCING';END IF;
 SELECT * INTO r FROM reality_internal.governed_original_install_reviews_v1
 WHERE phase IN ('OWNER_APPROVED','INSTALL_INTENT_FENCED','SOURCE_INSTALLED','DEPLOYMENT_VERIFIED')
 FOR UPDATE;
 SELECT * INTO v FROM reality_internal.governed_original_install_approvals_v1
 WHERE approval_id=r.approval_receipt_id;
 SELECT * INTO j FROM reality_internal.riley_unattended_repair_originals_v1
 WHERE original_work_id=r.original_work_id FOR UPDATE;
 IF NOT FOUND OR v.approval_id IS NULL OR v.original_work_id<>r.original_work_id OR
   v.attempt_id<>r.attempt_id OR v.shift_id<>r.shift_id OR v.owner_id<>r.owner_id OR
   v.candidate_commit_sha<>r.candidate_commit_sha OR
   v.artifact_sha256<>r.candidate_artifact_sha256 OR
   v.expected_installed_blob_sha<>r.expected_installed_blob_sha OR
   v.isolated_branch<>r.exact_install_target_branch OR
   j.original_work_id<>r.original_work_id OR j.shift_id<>r.shift_id OR
   j.owner_id<>r.owner_id OR
   j.exact_approval_receipt_ref IS DISTINCT FROM
     'supabase:governed_original_install_approvals_v1:'||v.approval_id::text OR
   j.original_settlement_receipt_ref IS NOT NULL OR
   j.production_changed IS DISTINCT FROM false OR
   r.approved_at IS NULL OR r.approval_receipt_id IS NULL OR
   r.isolated_github_write_verified IS DISTINCT FROM true OR
   r.preview_auto_deploy_verified IS DISTINCT FROM true OR
   r.same_original_execution_and_settlement_contract_verified IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'GENERAL_INSTALL_DURABLE_OWNER_WARRANT_DRIFT';END IF;
 IF r.phase='SOURCE_INSTALLED' OR r.phase='DEPLOYMENT_VERIFIED' THEN
  RETURN jsonb_build_object('status','GENERAL_INSTALL_SOURCE_INSTALLED_READBACK_ONLY',
   'original_work_id',r.original_work_id,'shift_id',r.shift_id,
   'installed_commit_sha',r.installed_commit_sha,
   'source_installed',true,'installation_authorized',true,
   'original_job_completed',false,'production_changed',false);
 END IF;
 IF r.phase='INSTALL_INTENT_FENCED' THEN
  RETURN jsonb_build_object('status','GENERAL_INSTALL_INTENT_ALREADY_FENCED_READBACK_ONLY',
   'original_work_id',r.original_work_id,'shift_id',r.shift_id,
   'attempt_id',r.attempt_id,'target_branch',r.exact_install_target_branch,
   'target_path',r.source_file_path,
   'expected_preinstall_blob_sha',r.expected_preinstall_blob_sha,
   'expected_parent_commit_sha',r.install_expected_parent_commit_sha,
   'expected_installed_blob_sha',r.expected_installed_blob_sha,
   'candidate_commit_sha',r.candidate_commit_sha,
   'candidate_artifact_sha256',r.candidate_artifact_sha256,
   'installation_authorized',true,'source_installed',false,
   'original_job_completed',false,'production_changed',false);
 END IF;
 g:=public.reality_read_current_shift_execution_graph_v1();
 IF g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED' OR
    g->>'shift_id'<>r.shift_id::text OR g->>'owner_id'<>r.owner_id::text OR
    g->>'production_changed'<>'false' OR
    j.phase<>'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL' OR
    j.installed IS DISTINCT FROM false OR
    r.installation_fenced_at IS NOT NULL OR
    r.installed_commit_sha IS NOT NULL
 THEN RAISE EXCEPTION 'GENERAL_INSTALL_CURRENT_APPROVAL_OR_SHIFT_DRIFT';END IF;
 UPDATE reality_internal.governed_original_install_reviews_v1
 SET phase='INSTALL_INTENT_FENCED',installation_fenced_at=clock_timestamp(),
     install_expected_parent_commit_sha=p_expected_head_sha,
     updated_at=clock_timestamp()
 WHERE original_work_id=r.original_work_id AND phase='OWNER_APPROVED'
 AND installation_fenced_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'GENERAL_INSTALL_INTENT_ATOMIC_FENCE_RACE';END IF;
 RETURN jsonb_build_object('status','GENERAL_INSTALL_EXACT_ONCE_OWNER_APPROVED_SOURCE_WRITE_FENCED',
  'original_work_id',r.original_work_id,'shift_id',r.shift_id,
  'attempt_id',r.attempt_id,'approval_receipt_id',r.approval_receipt_id,
  'target_branch',r.exact_install_target_branch,'target_path',r.source_file_path,
  'expected_preinstall_blob_sha',r.expected_preinstall_blob_sha,
  'expected_parent_commit_sha',p_expected_head_sha,
  'expected_installed_blob_sha',r.expected_installed_blob_sha,
  'candidate_commit_sha',r.candidate_commit_sha,
  'candidate_artifact_sha256',r.candidate_artifact_sha256,
  'installation_authorized',true,'source_installed',false,
  'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_claim_general_original_install_v1(text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_claim_general_original_install_v1(text)
 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_record_general_original_installed_source_v1(
 p_attempt_id uuid,p_installed_commit_sha text,p_source_blob_sha text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE r reality_internal.governed_original_install_reviews_v1%rowtype;
 j reality_internal.riley_unattended_repair_originals_v1%rowtype;
 v reality_internal.governed_original_install_approvals_v1%rowtype;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'GENERAL_INSTALL_RECEIPT_SERVICE_ONLY';END IF;
 IF p_attempt_id IS NULL OR p_installed_commit_sha!~'^[a-f0-9]{40}$' OR
  p_source_blob_sha!~'^[a-f0-9]{40}$'
 THEN RAISE EXCEPTION 'GENERAL_INSTALL_EXACT_PROVIDER_SHA_REQUIRED';END IF;
 SELECT * INTO r FROM reality_internal.governed_original_install_reviews_v1
 WHERE attempt_id=p_attempt_id FOR UPDATE;
 SELECT * INTO j FROM reality_internal.riley_unattended_repair_originals_v1
 WHERE original_work_id=r.original_work_id FOR UPDATE;
 SELECT * INTO v FROM reality_internal.governed_original_install_approvals_v1
 WHERE approval_id=r.approval_receipt_id;
 IF NOT FOUND OR r.original_work_id IS NULL OR v.approval_id IS NULL OR
   r.approved_at IS NULL OR r.installation_fenced_at IS NULL OR
   r.install_expected_parent_commit_sha IS NULL OR
   p_installed_commit_sha=r.install_expected_parent_commit_sha OR
   p_source_blob_sha<>r.expected_installed_blob_sha OR
   p_installed_commit_sha=r.candidate_commit_sha OR
   v.owner_id<>r.owner_id OR v.shift_id<>r.shift_id OR
   v.original_work_id<>r.original_work_id OR v.attempt_id<>r.attempt_id OR
   j.original_work_id<>r.original_work_id OR
   j.owner_id<>r.owner_id OR j.shift_id<>r.shift_id OR
   j.phase<>'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL' OR
   j.installed IS DISTINCT FROM false OR
   j.original_settlement_receipt_ref IS NOT NULL OR
   j.exact_approval_receipt_ref IS DISTINCT FROM
     'supabase:governed_original_install_approvals_v1:'||v.approval_id::text
 THEN RAISE EXCEPTION 'GENERAL_INSTALL_INDEPENDENT_READBACK_OWNER_SCOPE_DRIFT';END IF;
 IF r.phase='SOURCE_INSTALLED' THEN
  IF r.installed_commit_sha<>p_installed_commit_sha THEN
   RAISE EXCEPTION 'GENERAL_INSTALL_PROVIDER_REPLAY_CONFLICT';END IF;
 ELSE
  IF r.phase<>'INSTALL_INTENT_FENCED' OR r.installed_commit_sha IS NOT NULL THEN
   RAISE EXCEPTION 'GENERAL_INSTALL_PROBE_NOT_EXACT_ONCE';END IF;
  UPDATE reality_internal.governed_original_install_reviews_v1
   SET phase='SOURCE_INSTALLED',installed_commit_sha=p_installed_commit_sha,
       updated_at=clock_timestamp()
   WHERE original_work_id=r.original_work_id AND phase='INSTALL_INTENT_FENCED';
  IF NOT FOUND THEN RAISE EXCEPTION 'GENERAL_INSTALL_SOURCE_RECEIPT_ATOMIC_RACE';END IF;
 END IF;
 RETURN jsonb_build_object('status','GENERAL_ORIGINAL_EXACT_SOURCE_INSTALLED_AWAITING_INDEPENDENT_SETTLEMENT',
  'original_work_id',r.original_work_id,'shift_id',r.shift_id,
  'attempt_id',r.attempt_id,'installed_commit_sha',p_installed_commit_sha,
  'source_blob_sha',p_source_blob_sha,
  'source_installed',true,'installation_authorized',true,
  'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_record_general_original_installed_source_v1(uuid,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_general_original_installed_source_v1(uuid,text,text)
 TO service_role;
);

CREATE TABLE IF NOT EXISTS reality_internal.governed_original_install_approvals_v1(
 approval_id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
 request_id uuid UNIQUE NOT NULL,
 original_work_id text UNIQUE NOT NULL REFERENCES reality_internal.governed_original_install_reviews_v1(original_work_id),
 attempt_id uuid UNIQUE NOT NULL,
 owner_id uuid NOT NULL,
 shift_id uuid NOT NULL,
 candidate_commit_sha text NOT NULL CHECK(candidate_commit_sha~'^[a-f0-9]{40}$'),
 artifact_sha256 text NOT NULL CHECK(artifact_sha256~'^sha256:[a-f0-9]{64}$'),
 expected_installed_blob_sha text NOT NULL CHECK(expected_installed_blob_sha~'^[a-f0-9]{40}$'),
 isolated_branch text NOT NULL,
 approved_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE reality_internal.governed_original_install_approvals_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reality_internal.governed_original_install_approvals_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON reality_internal.governed_original_install_approvals_v1 TO service_role;

-- Called ONLY by a signed-in, non-anonymous owner whose explicit single
-- Chat click presents the exact immutable candidate and request identifier.
CREATE OR REPLACE FUNCTION public.reality_owner_approve_general_original_install_v1(
 p_original_work_id text,p_attempt_id uuid,p_candidate_commit_sha text,
 p_artifact_sha256 text,p_intent text,p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE r reality_internal.governed_original_install_reviews_v1%rowtype;
 j reality_internal.riley_unattended_repair_originals_v1%rowtype;
 a reality_internal.riley_same_original_recovery_attempts_v2%rowtype;
 v reality_internal.governed_original_install_approvals_v1%rowtype;
 g jsonb; v_owner uuid:=auth.uid();
BEGIN
 IF auth.jwt()->>'role'<>'authenticated'
  OR coalesce(auth.jwt()->>'is_anonymous','false')='true'
  OR v_owner IS NULL OR p_request_id IS NULL
  OR p_intent<>'OWNER_APPROVE_EXACT_INDEPENDENTLY_VERIFIED_ISOLATED_REPAIR'
  OR p_original_work_id!~'^work:[a-f0-9]{32}$'
  OR p_candidate_commit_sha!~'^[a-f0-9]{40}$'
  OR p_artifact_sha256!~'^sha256:[a-f0-9]{64}$'
  OR p_attempt_id IS NULL
 THEN RAISE EXCEPTION 'GENERAL_ORIGINAL_EXPLICIT_SIGNED_OWNER_CLICK_REQUIRED';END IF;
 SELECT * INTO r FROM reality_internal.governed_original_install_reviews_v1
 WHERE original_work_id=p_original_work_id FOR UPDATE;
 IF NOT FOUND OR r.owner_id<>v_owner OR r.attempt_id<>p_attempt_id OR
   r.candidate_commit_sha<>p_candidate_commit_sha OR
   r.candidate_artifact_sha256<>p_artifact_sha256
 THEN RAISE EXCEPTION 'GENERAL_ORIGINAL_OWNER_EXACT_ARTIFACT_SCOPE_DRIFT';END IF;
 SELECT * INTO v FROM reality_internal.governed_original_install_approvals_v1
 WHERE original_work_id=r.original_work_id;
 IF FOUND THEN
  IF v.request_id<>p_request_id OR v.owner_id<>v_owner OR
    v.attempt_id<>r.attempt_id OR v.artifact_sha256<>r.candidate_artifact_sha256 OR
    v.candidate_commit_sha<>r.candidate_commit_sha
  THEN RAISE EXCEPTION 'GENERAL_ORIGINAL_EXACT_APPROVAL_ALREADY_CONSUMED';END IF;
  RETURN jsonb_build_object('status','GENERAL_ORIGINAL_SAME_APPROVAL_ALREADY_RECORDED',
    'original_work_id',v.original_work_id,'shift_id',v.shift_id,
    'approval_id',v.approval_id,'approval_recorded',true,
    'installation_authorized',true,'installation_completed',r.installed_commit_sha IS NOT NULL,
    'original_job_completed',r.original_final_receipt_id IS NOT NULL,
    'no_third_confirmation',true,'production_changed',false);
 END IF;
 g:=public.reality_read_current_shift_execution_graph_v1();
 IF r.phase<>'READY_FOR_EXACT_OWNER_APPROVAL' OR
    r.isolated_github_write_verified IS DISTINCT FROM true OR
    r.preview_auto_deploy_verified IS DISTINCT FROM true OR
    r.same_original_execution_and_settlement_contract_verified IS DISTINCT FROM true OR
    r.approval_receipt_id IS NOT NULL OR r.approved_at IS NOT NULL OR
    r.installation_fenced_at IS NOT NULL OR r.installed_commit_sha IS NOT NULL OR
    r.original_final_receipt_id IS NOT NULL OR
    g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED' OR
    g->>'owner_id'<>v_owner::text OR g->>'shift_id'<>r.shift_id::text OR
    g->>'installation_authorized'<>'false' OR g->>'production_changed'<>'false'
 THEN RAISE EXCEPTION 'GENERAL_ORIGINAL_PREAPPROVAL_RELEASE_CONTINUATION_NOT_VERIFIED';END IF;
 SELECT * INTO j FROM reality_internal.riley_unattended_repair_originals_v1
 WHERE original_work_id=r.original_work_id AND shift_id=r.shift_id AND owner_id=r.owner_id
 FOR UPDATE;
 SELECT * INTO a FROM reality_internal.riley_same_original_recovery_attempts_v2
 WHERE attempt_id=r.attempt_id AND original_work_id=r.original_work_id
  AND owner_id=r.owner_id AND shift_id=r.shift_id;
 IF NOT FOUND OR j.original_work_id IS NULL OR
  j.phase<>'SOURCE_ADMITTED' OR j.installed IS DISTINCT FROM false OR
  j.production_changed IS DISTINCT FROM false OR
  j.issue_url<>r.source_ref OR
  j.shift_source_proof_sha256<>r.source_proof_sha256 OR
  j.exact_approval_receipt_ref IS NOT NULL OR
  j.original_settlement_receipt_ref IS NOT NULL OR
  a.phase<>'CI_PASSED' OR a.ci_conclusion<>'success' OR
  a.ci_run_id<>r.independent_frozen_run_id OR
  a.candidate_staged_commit_sha<>r.candidate_commit_sha OR
  a.proposed_source_sha256<>r.candidate_artifact_sha256
 THEN RAISE EXCEPTION 'GENERAL_ORIGINAL_VERIFIED_SOURCE_JOB_DRIFT';END IF;
 INSERT INTO reality_internal.governed_original_install_approvals_v1(
  request_id,original_work_id,attempt_id,owner_id,shift_id,
  candidate_commit_sha,artifact_sha256,expected_installed_blob_sha,isolated_branch)
 VALUES(p_request_id,r.original_work_id,r.attempt_id,v_owner,r.shift_id,
  r.candidate_commit_sha,r.candidate_artifact_sha256,
  r.expected_installed_blob_sha,r.exact_install_target_branch)
 RETURNING * INTO v;
 UPDATE reality_internal.riley_unattended_repair_originals_v1 SET
  phase='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL',
  candidate_commit_sha=r.candidate_commit_sha,
  candidate_artifact_sha256=r.candidate_artifact_sha256,
  independent_proof_run_id=r.independent_frozen_run_id,
  model_response_id=a.model_response_id,
  exact_approval_receipt_ref=
   'supabase:governed_original_install_approvals_v1:'||v.approval_id::text
 WHERE original_work_id=r.original_work_id AND phase='SOURCE_ADMITTED'
   AND exact_approval_receipt_ref IS NULL AND installed=false;
 IF NOT FOUND THEN RAISE EXCEPTION 'GENERAL_ORIGINAL_APPROVAL_TO_SOURCE_JOB_ATOMIC_RACE';END IF;
 UPDATE reality_internal.governed_original_install_reviews_v1 SET
  phase='OWNER_APPROVED',approval_receipt_id=v.approval_id,
  approved_at=v.approved_at,updated_at=clock_timestamp()
 WHERE original_work_id=r.original_work_id AND phase='READY_FOR_EXACT_OWNER_APPROVAL'
  AND approval_receipt_id IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'GENERAL_ORIGINAL_APPROVAL_TO_INSTALL_REVIEW_ATOMIC_RACE';END IF;
 RETURN jsonb_build_object('status','GENERAL_ORIGINAL_OWNER_APPROVED_AUTO_CONTINUATION',
  'original_work_id',r.original_work_id,'shift_id',r.shift_id,
  'attempt_id',r.attempt_id,'approval_id',v.approval_id,
  'candidate_commit_sha',r.candidate_commit_sha,
  'artifact_sha256',r.candidate_artifact_sha256,
  'approval_recorded',true,'installation_authorized',true,
  'installation_completed',false,'original_job_completed',false,
  'production_changed',false,'no_third_confirmation',true);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_owner_approve_general_original_install_v1(
 text,uuid,text,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reality_owner_approve_general_original_install_v1(
 text,uuid,text,text,text,uuid) TO authenticated;

-- A service wake cannot create the approval, only claim the exact approved
-- installation intent once. A failed/uncertain GitHub PUT is GET-only
-- reconciliation; a retry cannot silently make a second source mutation.
CREATE OR REPLACE FUNCTION public.reality_claim_general_original_install_v1()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE r reality_internal.governed_original_install_reviews_v1%rowtype;
 j reality_internal.riley_unattended_repair_originals_v1%rowtype;
 v reality_internal.governed_original_install_approvals_v1%rowtype;
 g jsonb;n int;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'GENERAL_INSTALL_SERVICE_ONLY';END IF;
 SELECT count(*) INTO n FROM reality_internal.governed_original_install_reviews_v1
 WHERE phase IN ('OWNER_APPROVED','INSTALL_INTENT_FENCED','SOURCE_INSTALLED','DEPLOYMENT_VERIFIED');
 IF n=0 THEN RETURN jsonb_build_object('status','GENERAL_INSTALL_NO_EXACT_OWNER_APPROVAL_NO_WRITE',
  'installation_authorized',false,'source_installed',false,
  'original_job_completed',false,'production_changed',false);END IF;
 IF n>1 THEN RAISE EXCEPTION 'GENERAL_INSTALL_MULTIPLE_APPROVED_ORIGINALS_REQUIRE_FENCING';END IF;
 SELECT * INTO r FROM reality_internal.governed_original_install_reviews_v1
 WHERE phase IN ('OWNER_APPROVED','INSTALL_INTENT_FENCED','SOURCE_INSTALLED','DEPLOYMENT_VERIFIED')
 FOR UPDATE;
 SELECT * INTO v FROM reality_internal.governed_original_install_approvals_v1
 WHERE approval_id=r.approval_receipt_id;
 SELECT * INTO j FROM reality_internal.riley_unattended_repair_originals_v1
 WHERE original_work_id=r.original_work_id FOR UPDATE;
 IF NOT FOUND OR v.approval_id IS NULL OR v.original_work_id<>r.original_work_id OR
   v.attempt_id<>r.attempt_id OR v.shift_id<>r.shift_id OR v.owner_id<>r.owner_id OR
   v.candidate_commit_sha<>r.candidate_commit_sha OR
   v.artifact_sha256<>r.candidate_artifact_sha256 OR
   v.expected_installed_blob_sha<>r.expected_installed_blob_sha OR
   v.isolated_branch<>r.exact_install_target_branch OR
   j.original_work_id<>r.original_work_id OR j.shift_id<>r.shift_id OR
   j.owner_id<>r.owner_id OR
   j.exact_approval_receipt_ref IS DISTINCT FROM
     'supabase:governed_original_install_approvals_v1:'||v.approval_id::text OR
   j.original_settlement_receipt_ref IS NOT NULL OR
   j.production_changed IS DISTINCT FROM false OR
   r.approved_at IS NULL OR r.approval_receipt_id IS NULL OR
   r.isolated_github_write_verified IS DISTINCT FROM true OR
   r.preview_auto_deploy_verified IS DISTINCT FROM true OR
   r.same_original_execution_and_settlement_contract_verified IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'GENERAL_INSTALL_DURABLE_OWNER_WARRANT_DRIFT';END IF;
 IF r.phase='SOURCE_INSTALLED' OR r.phase='DEPLOYMENT_VERIFIED' THEN
  RETURN jsonb_build_object('status','GENERAL_INSTALL_SOURCE_INSTALLED_READBACK_ONLY',
   'original_work_id',r.original_work_id,'shift_id',r.shift_id,
   'installed_commit_sha',r.installed_commit_sha,
   'source_installed',true,'installation_authorized',true,
   'original_job_completed',false,'production_changed',false);
 END IF;
 IF r.phase='INSTALL_INTENT_FENCED' THEN
  RETURN jsonb_build_object('status','GENERAL_INSTALL_INTENT_ALREADY_FENCED_READBACK_ONLY',
   'original_work_id',r.original_work_id,'shift_id',r.shift_id,
   'attempt_id',r.attempt_id,'target_branch',r.exact_install_target_branch,
   'target_path',r.source_file_path,
   'expected_preinstall_blob_sha',r.expected_preinstall_blob_sha,
   'expected_installed_blob_sha',r.expected_installed_blob_sha,
   'candidate_commit_sha',r.candidate_commit_sha,
   'candidate_artifact_sha256',r.candidate_artifact_sha256,
   'installation_authorized',true,'source_installed',false,
   'original_job_completed',false,'production_changed',false);
 END IF;
 g:=public.reality_read_current_shift_execution_graph_v1();
 IF g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED' OR
    g->>'shift_id'<>r.shift_id::text OR g->>'owner_id'<>r.owner_id::text OR
    g->>'production_changed'<>'false' OR
    j.phase<>'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL' OR
    j.installed IS DISTINCT FROM false OR
    r.installation_fenced_at IS NOT NULL OR
    r.installed_commit_sha IS NOT NULL
 THEN RAISE EXCEPTION 'GENERAL_INSTALL_CURRENT_APPROVAL_OR_SHIFT_DRIFT';END IF;
 UPDATE reality_internal.governed_original_install_reviews_v1
 SET phase='INSTALL_INTENT_FENCED',installation_fenced_at=clock_timestamp(),
     updated_at=clock_timestamp()
 WHERE original_work_id=r.original_work_id AND phase='OWNER_APPROVED'
 AND installation_fenced_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'GENERAL_INSTALL_INTENT_ATOMIC_FENCE_RACE';END IF;
 RETURN jsonb_build_object('status','GENERAL_INSTALL_EXACT_ONCE_OWNER_APPROVED_SOURCE_WRITE_FENCED',
  'original_work_id',r.original_work_id,'shift_id',r.shift_id,
  'attempt_id',r.attempt_id,'approval_receipt_id',r.approval_receipt_id,
  'target_branch',r.exact_install_target_branch,'target_path',r.source_file_path,
  'expected_preinstall_blob_sha',r.expected_preinstall_blob_sha,
  'expected_installed_blob_sha',r.expected_installed_blob_sha,
  'candidate_commit_sha',r.candidate_commit_sha,
  'candidate_artifact_sha256',r.candidate_artifact_sha256,
  'installation_authorized',true,'source_installed',false,
  'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_claim_general_original_install_v1(text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_claim_general_original_install_v1(text)
 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_record_general_original_installed_source_v1(
 p_attempt_id uuid,p_installed_commit_sha text,p_source_blob_sha text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE r reality_internal.governed_original_install_reviews_v1%rowtype;
 j reality_internal.riley_unattended_repair_originals_v1%rowtype;
 v reality_internal.governed_original_install_approvals_v1%rowtype;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'GENERAL_INSTALL_RECEIPT_SERVICE_ONLY';END IF;
 IF p_attempt_id IS NULL OR p_installed_commit_sha!~'^[a-f0-9]{40}$' OR
  p_source_blob_sha!~'^[a-f0-9]{40}$'
 THEN RAISE EXCEPTION 'GENERAL_INSTALL_EXACT_PROVIDER_SHA_REQUIRED';END IF;
 SELECT * INTO r FROM reality_internal.governed_original_install_reviews_v1
 WHERE attempt_id=p_attempt_id FOR UPDATE;
 SELECT * INTO j FROM reality_internal.riley_unattended_repair_originals_v1
 WHERE original_work_id=r.original_work_id FOR UPDATE;
 SELECT * INTO v FROM reality_internal.governed_original_install_approvals_v1
 WHERE approval_id=r.approval_receipt_id;
 IF NOT FOUND OR r.original_work_id IS NULL OR v.approval_id IS NULL OR
   r.approved_at IS NULL OR r.installation_fenced_at IS NULL OR
   p_source_blob_sha<>r.expected_installed_blob_sha OR
   p_installed_commit_sha=r.candidate_commit_sha OR
   v.owner_id<>r.owner_id OR v.shift_id<>r.shift_id OR
   v.original_work_id<>r.original_work_id OR v.attempt_id<>r.attempt_id OR
   j.original_work_id<>r.original_work_id OR
   j.owner_id<>r.owner_id OR j.shift_id<>r.shift_id OR
   j.phase<>'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL' OR
   j.installed IS DISTINCT FROM false OR
   j.original_settlement_receipt_ref IS NOT NULL OR
   j.exact_approval_receipt_ref IS DISTINCT FROM
     'supabase:governed_original_install_approvals_v1:'||v.approval_id::text
 THEN RAISE EXCEPTION 'GENERAL_INSTALL_INDEPENDENT_READBACK_OWNER_SCOPE_DRIFT';END IF;
 IF r.phase='SOURCE_INSTALLED' THEN
  IF r.installed_commit_sha<>p_installed_commit_sha THEN
   RAISE EXCEPTION 'GENERAL_INSTALL_PROVIDER_REPLAY_CONFLICT';END IF;
 ELSE
  IF r.phase<>'INSTALL_INTENT_FENCED' OR r.installed_commit_sha IS NOT NULL THEN
   RAISE EXCEPTION 'GENERAL_INSTALL_PROBE_NOT_EXACT_ONCE';END IF;
  UPDATE reality_internal.governed_original_install_reviews_v1
   SET phase='SOURCE_INSTALLED',installed_commit_sha=p_installed_commit_sha,
       updated_at=clock_timestamp()
   WHERE original_work_id=r.original_work_id AND phase='INSTALL_INTENT_FENCED';
  IF NOT FOUND THEN RAISE EXCEPTION 'GENERAL_INSTALL_SOURCE_RECEIPT_ATOMIC_RACE';END IF;
 END IF;
 RETURN jsonb_build_object('status','GENERAL_ORIGINAL_EXACT_SOURCE_INSTALLED_AWAITING_INDEPENDENT_SETTLEMENT',
  'original_work_id',r.original_work_id,'shift_id',r.shift_id,
  'attempt_id',r.attempt_id,'installed_commit_sha',p_installed_commit_sha,
  'source_blob_sha',p_source_blob_sha,
  'source_installed',true,'installation_authorized',true,
  'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_record_general_original_installed_source_v1(uuid,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_general_original_installed_source_v1(uuid,text,text)
 TO service_role;
 THEN
  RAISE EXCEPTION 'GENERAL_INSTALL_TRUSTED_PROVIDER_PARENT_SHA_REQUIRED';END IF;
 SELECT count(*) INTO n FROM reality_internal.governed_original_install_reviews_v1
 WHERE phase IN ('OWNER_APPROVED','INSTALL_INTENT_FENCED','SOURCE_INSTALLED','DEPLOYMENT_VERIFIED');
 IF n=0 THEN RETURN jsonb_build_object('status','GENERAL_INSTALL_NO_EXACT_OWNER_APPROVAL_NO_WRITE',
  'installation_authorized',false,'source_installed',false,
  'original_job_completed',false,'production_changed',false);END IF;
 IF n>1 THEN RAISE EXCEPTION 'GENERAL_INSTALL_MULTIPLE_APPROVED_ORIGINALS_REQUIRE_FENCING';END IF;
 SELECT * INTO r FROM reality_internal.governed_original_install_reviews_v1
 WHERE phase IN ('OWNER_APPROVED','INSTALL_INTENT_FENCED','SOURCE_INSTALLED','DEPLOYMENT_VERIFIED')
 FOR UPDATE;
 SELECT * INTO v FROM reality_internal.governed_original_install_approvals_v1
 WHERE approval_id=r.approval_receipt_id;
 SELECT * INTO j FROM reality_internal.riley_unattended_repair_originals_v1
 WHERE original_work_id=r.original_work_id FOR UPDATE;
 IF NOT FOUND OR v.approval_id IS NULL OR v.original_work_id<>r.original_work_id OR
   v.attempt_id<>r.attempt_id OR v.shift_id<>r.shift_id OR v.owner_id<>r.owner_id OR
   v.candidate_commit_sha<>r.candidate_commit_sha OR
   v.artifact_sha256<>r.candidate_artifact_sha256 OR
   v.expected_installed_blob_sha<>r.expected_installed_blob_sha OR
   v.isolated_branch<>r.exact_install_target_branch OR
   j.original_work_id<>r.original_work_id OR j.shift_id<>r.shift_id OR
   j.owner_id<>r.owner_id OR
   j.exact_approval_receipt_ref IS DISTINCT FROM
     'supabase:governed_original_install_approvals_v1:'||v.approval_id::text OR
   j.original_settlement_receipt_ref IS NOT NULL OR
   j.production_changed IS DISTINCT FROM false OR
   r.approved_at IS NULL OR r.approval_receipt_id IS NULL OR
   r.isolated_github_write_verified IS DISTINCT FROM true OR
   r.preview_auto_deploy_verified IS DISTINCT FROM true OR
   r.same_original_execution_and_settlement_contract_verified IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'GENERAL_INSTALL_DURABLE_OWNER_WARRANT_DRIFT';END IF;
 IF r.phase='SOURCE_INSTALLED' OR r.phase='DEPLOYMENT_VERIFIED' THEN
  RETURN jsonb_build_object('status','GENERAL_INSTALL_SOURCE_INSTALLED_READBACK_ONLY',
   'original_work_id',r.original_work_id,'shift_id',r.shift_id,
   'installed_commit_sha',r.installed_commit_sha,
   'source_installed',true,'installation_authorized',true,
   'original_job_completed',false,'production_changed',false);
 END IF;
 IF r.phase='INSTALL_INTENT_FENCED' THEN
  RETURN jsonb_build_object('status','GENERAL_INSTALL_INTENT_ALREADY_FENCED_READBACK_ONLY',
   'original_work_id',r.original_work_id,'shift_id',r.shift_id,
   'attempt_id',r.attempt_id,'target_branch',r.exact_install_target_branch,
   'target_path',r.source_file_path,
   'expected_preinstall_blob_sha',r.expected_preinstall_blob_sha,
   'expected_installed_blob_sha',r.expected_installed_blob_sha,
   'candidate_commit_sha',r.candidate_commit_sha,
   'candidate_artifact_sha256',r.candidate_artifact_sha256,
   'installation_authorized',true,'source_installed',false,
   'original_job_completed',false,'production_changed',false);
 END IF;
 g:=public.reality_read_current_shift_execution_graph_v1();
 IF g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED' OR
    g->>'shift_id'<>r.shift_id::text OR g->>'owner_id'<>r.owner_id::text OR
    g->>'production_changed'<>'false' OR
    j.phase<>'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL' OR
    j.installed IS DISTINCT FROM false OR
    r.installation_fenced_at IS NOT NULL OR
    r.installed_commit_sha IS NOT NULL
 THEN RAISE EXCEPTION 'GENERAL_INSTALL_CURRENT_APPROVAL_OR_SHIFT_DRIFT';END IF;
 UPDATE reality_internal.governed_original_install_reviews_v1
 SET phase='INSTALL_INTENT_FENCED',installation_fenced_at=clock_timestamp(),
     updated_at=clock_timestamp()
 WHERE original_work_id=r.original_work_id AND phase='OWNER_APPROVED'
 AND installation_fenced_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'GENERAL_INSTALL_INTENT_ATOMIC_FENCE_RACE';END IF;
 RETURN jsonb_build_object('status','GENERAL_INSTALL_EXACT_ONCE_OWNER_APPROVED_SOURCE_WRITE_FENCED',
  'original_work_id',r.original_work_id,'shift_id',r.shift_id,
  'attempt_id',r.attempt_id,'approval_receipt_id',r.approval_receipt_id,
  'target_branch',r.exact_install_target_branch,'target_path',r.source_file_path,
  'expected_preinstall_blob_sha',r.expected_preinstall_blob_sha,
  'expected_installed_blob_sha',r.expected_installed_blob_sha,
  'candidate_commit_sha',r.candidate_commit_sha,
  'candidate_artifact_sha256',r.candidate_artifact_sha256,
  'installation_authorized',true,'source_installed',false,
  'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_claim_general_original_install_v1(text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_claim_general_original_install_v1(text)
 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_record_general_original_installed_source_v1(
 p_attempt_id uuid,p_installed_commit_sha text,p_source_blob_sha text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE r reality_internal.governed_original_install_reviews_v1%rowtype;
 j reality_internal.riley_unattended_repair_originals_v1%rowtype;
 v reality_internal.governed_original_install_approvals_v1%rowtype;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'GENERAL_INSTALL_RECEIPT_SERVICE_ONLY';END IF;
 IF p_attempt_id IS NULL OR p_installed_commit_sha!~'^[a-f0-9]{40}$' OR
  p_source_blob_sha!~'^[a-f0-9]{40}$'
 THEN RAISE EXCEPTION 'GENERAL_INSTALL_EXACT_PROVIDER_SHA_REQUIRED';END IF;
 SELECT * INTO r FROM reality_internal.governed_original_install_reviews_v1
 WHERE attempt_id=p_attempt_id FOR UPDATE;
 SELECT * INTO j FROM reality_internal.riley_unattended_repair_originals_v1
 WHERE original_work_id=r.original_work_id FOR UPDATE;
 SELECT * INTO v FROM reality_internal.governed_original_install_approvals_v1
 WHERE approval_id=r.approval_receipt_id;
 IF NOT FOUND OR r.original_work_id IS NULL OR v.approval_id IS NULL OR
   r.approved_at IS NULL OR r.installation_fenced_at IS NULL OR
   p_source_blob_sha<>r.expected_installed_blob_sha OR
   p_installed_commit_sha=r.candidate_commit_sha OR
   v.owner_id<>r.owner_id OR v.shift_id<>r.shift_id OR
   v.original_work_id<>r.original_work_id OR v.attempt_id<>r.attempt_id OR
   j.original_work_id<>r.original_work_id OR
   j.owner_id<>r.owner_id OR j.shift_id<>r.shift_id OR
   j.phase<>'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL' OR
   j.installed IS DISTINCT FROM false OR
   j.original_settlement_receipt_ref IS NOT NULL OR
   j.exact_approval_receipt_ref IS DISTINCT FROM
     'supabase:governed_original_install_approvals_v1:'||v.approval_id::text
 THEN RAISE EXCEPTION 'GENERAL_INSTALL_INDEPENDENT_READBACK_OWNER_SCOPE_DRIFT';END IF;
 IF r.phase='SOURCE_INSTALLED' THEN
  IF r.installed_commit_sha<>p_installed_commit_sha THEN
   RAISE EXCEPTION 'GENERAL_INSTALL_PROVIDER_REPLAY_CONFLICT';END IF;
 ELSE
  IF r.phase<>'INSTALL_INTENT_FENCED' OR r.installed_commit_sha IS NOT NULL THEN
   RAISE EXCEPTION 'GENERAL_INSTALL_PROBE_NOT_EXACT_ONCE';END IF;
  UPDATE reality_internal.governed_original_install_reviews_v1
   SET phase='SOURCE_INSTALLED',installed_commit_sha=p_installed_commit_sha,
       updated_at=clock_timestamp()
   WHERE original_work_id=r.original_work_id AND phase='INSTALL_INTENT_FENCED';
  IF NOT FOUND THEN RAISE EXCEPTION 'GENERAL_INSTALL_SOURCE_RECEIPT_ATOMIC_RACE';END IF;
 END IF;
 RETURN jsonb_build_object('status','GENERAL_ORIGINAL_EXACT_SOURCE_INSTALLED_AWAITING_INDEPENDENT_SETTLEMENT',
  'original_work_id',r.original_work_id,'shift_id',r.shift_id,
  'attempt_id',r.attempt_id,'installed_commit_sha',p_installed_commit_sha,
  'source_blob_sha',p_source_blob_sha,
  'source_installed',true,'installation_authorized',true,
  'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_record_general_original_installed_source_v1(uuid,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_general_original_installed_source_v1(uuid,text,text)
 TO service_role;
);

CREATE TABLE IF NOT EXISTS reality_internal.governed_original_install_approvals_v1(
 approval_id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
 request_id uuid UNIQUE NOT NULL,
 original_work_id text UNIQUE NOT NULL REFERENCES reality_internal.governed_original_install_reviews_v1(original_work_id),
 attempt_id uuid UNIQUE NOT NULL,
 owner_id uuid NOT NULL,
 shift_id uuid NOT NULL,
 candidate_commit_sha text NOT NULL CHECK(candidate_commit_sha~'^[a-f0-9]{40}$'),
 artifact_sha256 text NOT NULL CHECK(artifact_sha256~'^sha256:[a-f0-9]{64}$'),
 expected_installed_blob_sha text NOT NULL CHECK(expected_installed_blob_sha~'^[a-f0-9]{40}$'),
 isolated_branch text NOT NULL,
 approved_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE reality_internal.governed_original_install_approvals_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reality_internal.governed_original_install_approvals_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON reality_internal.governed_original_install_approvals_v1 TO service_role;

-- Called ONLY by a signed-in, non-anonymous owner whose explicit single
-- Chat click presents the exact immutable candidate and request identifier.
CREATE OR REPLACE FUNCTION public.reality_owner_approve_general_original_install_v1(
 p_original_work_id text,p_attempt_id uuid,p_candidate_commit_sha text,
 p_artifact_sha256 text,p_intent text,p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE r reality_internal.governed_original_install_reviews_v1%rowtype;
 j reality_internal.riley_unattended_repair_originals_v1%rowtype;
 a reality_internal.riley_same_original_recovery_attempts_v2%rowtype;
 v reality_internal.governed_original_install_approvals_v1%rowtype;
 g jsonb; v_owner uuid:=auth.uid();
BEGIN
 IF auth.jwt()->>'role'<>'authenticated'
  OR coalesce(auth.jwt()->>'is_anonymous','false')='true'
  OR v_owner IS NULL OR p_request_id IS NULL
  OR p_intent<>'OWNER_APPROVE_EXACT_INDEPENDENTLY_VERIFIED_ISOLATED_REPAIR'
  OR p_original_work_id!~'^work:[a-f0-9]{32}$'
  OR p_candidate_commit_sha!~'^[a-f0-9]{40}$'
  OR p_artifact_sha256!~'^sha256:[a-f0-9]{64}$'
  OR p_attempt_id IS NULL
 THEN RAISE EXCEPTION 'GENERAL_ORIGINAL_EXPLICIT_SIGNED_OWNER_CLICK_REQUIRED';END IF;
 SELECT * INTO r FROM reality_internal.governed_original_install_reviews_v1
 WHERE original_work_id=p_original_work_id FOR UPDATE;
 IF NOT FOUND OR r.owner_id<>v_owner OR r.attempt_id<>p_attempt_id OR
   r.candidate_commit_sha<>p_candidate_commit_sha OR
   r.candidate_artifact_sha256<>p_artifact_sha256
 THEN RAISE EXCEPTION 'GENERAL_ORIGINAL_OWNER_EXACT_ARTIFACT_SCOPE_DRIFT';END IF;
 SELECT * INTO v FROM reality_internal.governed_original_install_approvals_v1
 WHERE original_work_id=r.original_work_id;
 IF FOUND THEN
  IF v.request_id<>p_request_id OR v.owner_id<>v_owner OR
    v.attempt_id<>r.attempt_id OR v.artifact_sha256<>r.candidate_artifact_sha256 OR
    v.candidate_commit_sha<>r.candidate_commit_sha
  THEN RAISE EXCEPTION 'GENERAL_ORIGINAL_EXACT_APPROVAL_ALREADY_CONSUMED';END IF;
  RETURN jsonb_build_object('status','GENERAL_ORIGINAL_SAME_APPROVAL_ALREADY_RECORDED',
    'original_work_id',v.original_work_id,'shift_id',v.shift_id,
    'approval_id',v.approval_id,'approval_recorded',true,
    'installation_authorized',true,'installation_completed',r.installed_commit_sha IS NOT NULL,
    'original_job_completed',r.original_final_receipt_id IS NOT NULL,
    'no_third_confirmation',true,'production_changed',false);
 END IF;
 g:=public.reality_read_current_shift_execution_graph_v1();
 IF r.phase<>'READY_FOR_EXACT_OWNER_APPROVAL' OR
    r.isolated_github_write_verified IS DISTINCT FROM true OR
    r.preview_auto_deploy_verified IS DISTINCT FROM true OR
    r.same_original_execution_and_settlement_contract_verified IS DISTINCT FROM true OR
    r.approval_receipt_id IS NOT NULL OR r.approved_at IS NOT NULL OR
    r.installation_fenced_at IS NOT NULL OR r.installed_commit_sha IS NOT NULL OR
    r.original_final_receipt_id IS NOT NULL OR
    g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED' OR
    g->>'owner_id'<>v_owner::text OR g->>'shift_id'<>r.shift_id::text OR
    g->>'installation_authorized'<>'false' OR g->>'production_changed'<>'false'
 THEN RAISE EXCEPTION 'GENERAL_ORIGINAL_PREAPPROVAL_RELEASE_CONTINUATION_NOT_VERIFIED';END IF;
 SELECT * INTO j FROM reality_internal.riley_unattended_repair_originals_v1
 WHERE original_work_id=r.original_work_id AND shift_id=r.shift_id AND owner_id=r.owner_id
 FOR UPDATE;
 SELECT * INTO a FROM reality_internal.riley_same_original_recovery_attempts_v2
 WHERE attempt_id=r.attempt_id AND original_work_id=r.original_work_id
  AND owner_id=r.owner_id AND shift_id=r.shift_id;
 IF NOT FOUND OR j.original_work_id IS NULL OR
  j.phase<>'SOURCE_ADMITTED' OR j.installed IS DISTINCT FROM false OR
  j.production_changed IS DISTINCT FROM false OR
  j.issue_url<>r.source_ref OR
  j.shift_source_proof_sha256<>r.source_proof_sha256 OR
  j.exact_approval_receipt_ref IS NOT NULL OR
  j.original_settlement_receipt_ref IS NOT NULL OR
  a.phase<>'CI_PASSED' OR a.ci_conclusion<>'success' OR
  a.ci_run_id<>r.independent_frozen_run_id OR
  a.candidate_staged_commit_sha<>r.candidate_commit_sha OR
  a.proposed_source_sha256<>r.candidate_artifact_sha256
 THEN RAISE EXCEPTION 'GENERAL_ORIGINAL_VERIFIED_SOURCE_JOB_DRIFT';END IF;
 INSERT INTO reality_internal.governed_original_install_approvals_v1(
  request_id,original_work_id,attempt_id,owner_id,shift_id,
  candidate_commit_sha,artifact_sha256,expected_installed_blob_sha,isolated_branch)
 VALUES(p_request_id,r.original_work_id,r.attempt_id,v_owner,r.shift_id,
  r.candidate_commit_sha,r.candidate_artifact_sha256,
  r.expected_installed_blob_sha,r.exact_install_target_branch)
 RETURNING * INTO v;
 UPDATE reality_internal.riley_unattended_repair_originals_v1 SET
  phase='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL',
  candidate_commit_sha=r.candidate_commit_sha,
  candidate_artifact_sha256=r.candidate_artifact_sha256,
  independent_proof_run_id=r.independent_frozen_run_id,
  model_response_id=a.model_response_id,
  exact_approval_receipt_ref=
   'supabase:governed_original_install_approvals_v1:'||v.approval_id::text
 WHERE original_work_id=r.original_work_id AND phase='SOURCE_ADMITTED'
   AND exact_approval_receipt_ref IS NULL AND installed=false;
 IF NOT FOUND THEN RAISE EXCEPTION 'GENERAL_ORIGINAL_APPROVAL_TO_SOURCE_JOB_ATOMIC_RACE';END IF;
 UPDATE reality_internal.governed_original_install_reviews_v1 SET
  phase='OWNER_APPROVED',approval_receipt_id=v.approval_id,
  approved_at=v.approved_at,updated_at=clock_timestamp()
 WHERE original_work_id=r.original_work_id AND phase='READY_FOR_EXACT_OWNER_APPROVAL'
  AND approval_receipt_id IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'GENERAL_ORIGINAL_APPROVAL_TO_INSTALL_REVIEW_ATOMIC_RACE';END IF;
 RETURN jsonb_build_object('status','GENERAL_ORIGINAL_OWNER_APPROVED_AUTO_CONTINUATION',
  'original_work_id',r.original_work_id,'shift_id',r.shift_id,
  'attempt_id',r.attempt_id,'approval_id',v.approval_id,
  'candidate_commit_sha',r.candidate_commit_sha,
  'artifact_sha256',r.candidate_artifact_sha256,
  'approval_recorded',true,'installation_authorized',true,
  'installation_completed',false,'original_job_completed',false,
  'production_changed',false,'no_third_confirmation',true);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_owner_approve_general_original_install_v1(
 text,uuid,text,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reality_owner_approve_general_original_install_v1(
 text,uuid,text,text,text,uuid) TO authenticated;

-- A service wake cannot create the approval, only claim the exact approved
-- installation intent once. A failed/uncertain GitHub PUT is GET-only
-- reconciliation; a retry cannot silently make a second source mutation.
CREATE OR REPLACE FUNCTION public.reality_claim_general_original_install_v1()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE r reality_internal.governed_original_install_reviews_v1%rowtype;
 j reality_internal.riley_unattended_repair_originals_v1%rowtype;
 v reality_internal.governed_original_install_approvals_v1%rowtype;
 g jsonb;n int;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'GENERAL_INSTALL_SERVICE_ONLY';END IF;
 SELECT count(*) INTO n FROM reality_internal.governed_original_install_reviews_v1
 WHERE phase IN ('OWNER_APPROVED','INSTALL_INTENT_FENCED','SOURCE_INSTALLED','DEPLOYMENT_VERIFIED');
 IF n=0 THEN RETURN jsonb_build_object('status','GENERAL_INSTALL_NO_EXACT_OWNER_APPROVAL_NO_WRITE',
  'installation_authorized',false,'source_installed',false,
  'original_job_completed',false,'production_changed',false);END IF;
 IF n>1 THEN RAISE EXCEPTION 'GENERAL_INSTALL_MULTIPLE_APPROVED_ORIGINALS_REQUIRE_FENCING';END IF;
 SELECT * INTO r FROM reality_internal.governed_original_install_reviews_v1
 WHERE phase IN ('OWNER_APPROVED','INSTALL_INTENT_FENCED','SOURCE_INSTALLED','DEPLOYMENT_VERIFIED')
 FOR UPDATE;
 SELECT * INTO v FROM reality_internal.governed_original_install_approvals_v1
 WHERE approval_id=r.approval_receipt_id;
 SELECT * INTO j FROM reality_internal.riley_unattended_repair_originals_v1
 WHERE original_work_id=r.original_work_id FOR UPDATE;
 IF NOT FOUND OR v.approval_id IS NULL OR v.original_work_id<>r.original_work_id OR
   v.attempt_id<>r.attempt_id OR v.shift_id<>r.shift_id OR v.owner_id<>r.owner_id OR
   v.candidate_commit_sha<>r.candidate_commit_sha OR
   v.artifact_sha256<>r.candidate_artifact_sha256 OR
   v.expected_installed_blob_sha<>r.expected_installed_blob_sha OR
   v.isolated_branch<>r.exact_install_target_branch OR
   j.original_work_id<>r.original_work_id OR j.shift_id<>r.shift_id OR
   j.owner_id<>r.owner_id OR
   j.exact_approval_receipt_ref IS DISTINCT FROM
     'supabase:governed_original_install_approvals_v1:'||v.approval_id::text OR
   j.original_settlement_receipt_ref IS NOT NULL OR
   j.production_changed IS DISTINCT FROM false OR
   r.approved_at IS NULL OR r.approval_receipt_id IS NULL OR
   r.isolated_github_write_verified IS DISTINCT FROM true OR
   r.preview_auto_deploy_verified IS DISTINCT FROM true OR
   r.same_original_execution_and_settlement_contract_verified IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'GENERAL_INSTALL_DURABLE_OWNER_WARRANT_DRIFT';END IF;
 IF r.phase='SOURCE_INSTALLED' OR r.phase='DEPLOYMENT_VERIFIED' THEN
  RETURN jsonb_build_object('status','GENERAL_INSTALL_SOURCE_INSTALLED_READBACK_ONLY',
   'original_work_id',r.original_work_id,'shift_id',r.shift_id,
   'installed_commit_sha',r.installed_commit_sha,
   'source_installed',true,'installation_authorized',true,
   'original_job_completed',false,'production_changed',false);
 END IF;
 IF r.phase='INSTALL_INTENT_FENCED' THEN
  RETURN jsonb_build_object('status','GENERAL_INSTALL_INTENT_ALREADY_FENCED_READBACK_ONLY',
   'original_work_id',r.original_work_id,'shift_id',r.shift_id,
   'attempt_id',r.attempt_id,'target_branch',r.exact_install_target_branch,
   'target_path',r.source_file_path,
   'expected_preinstall_blob_sha',r.expected_preinstall_blob_sha,
   'expected_installed_blob_sha',r.expected_installed_blob_sha,
   'candidate_commit_sha',r.candidate_commit_sha,
   'candidate_artifact_sha256',r.candidate_artifact_sha256,
   'installation_authorized',true,'source_installed',false,
   'original_job_completed',false,'production_changed',false);
 END IF;
 g:=public.reality_read_current_shift_execution_graph_v1();
 IF g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED' OR
    g->>'shift_id'<>r.shift_id::text OR g->>'owner_id'<>r.owner_id::text OR
    g->>'production_changed'<>'false' OR
    j.phase<>'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL' OR
    j.installed IS DISTINCT FROM false OR
    r.installation_fenced_at IS NOT NULL OR
    r.installed_commit_sha IS NOT NULL
 THEN RAISE EXCEPTION 'GENERAL_INSTALL_CURRENT_APPROVAL_OR_SHIFT_DRIFT';END IF;
 UPDATE reality_internal.governed_original_install_reviews_v1
 SET phase='INSTALL_INTENT_FENCED',installation_fenced_at=clock_timestamp(),
     updated_at=clock_timestamp()
 WHERE original_work_id=r.original_work_id AND phase='OWNER_APPROVED'
 AND installation_fenced_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'GENERAL_INSTALL_INTENT_ATOMIC_FENCE_RACE';END IF;
 RETURN jsonb_build_object('status','GENERAL_INSTALL_EXACT_ONCE_OWNER_APPROVED_SOURCE_WRITE_FENCED',
  'original_work_id',r.original_work_id,'shift_id',r.shift_id,
  'attempt_id',r.attempt_id,'approval_receipt_id',r.approval_receipt_id,
  'target_branch',r.exact_install_target_branch,'target_path',r.source_file_path,
  'expected_preinstall_blob_sha',r.expected_preinstall_blob_sha,
  'expected_installed_blob_sha',r.expected_installed_blob_sha,
  'candidate_commit_sha',r.candidate_commit_sha,
  'candidate_artifact_sha256',r.candidate_artifact_sha256,
  'installation_authorized',true,'source_installed',false,
  'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_claim_general_original_install_v1(text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_claim_general_original_install_v1(text)
 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_record_general_original_installed_source_v1(
 p_attempt_id uuid,p_installed_commit_sha text,p_source_blob_sha text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE r reality_internal.governed_original_install_reviews_v1%rowtype;
 j reality_internal.riley_unattended_repair_originals_v1%rowtype;
 v reality_internal.governed_original_install_approvals_v1%rowtype;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'GENERAL_INSTALL_RECEIPT_SERVICE_ONLY';END IF;
 IF p_attempt_id IS NULL OR p_installed_commit_sha!~'^[a-f0-9]{40}$' OR
  p_source_blob_sha!~'^[a-f0-9]{40}$'
 THEN RAISE EXCEPTION 'GENERAL_INSTALL_EXACT_PROVIDER_SHA_REQUIRED';END IF;
 SELECT * INTO r FROM reality_internal.governed_original_install_reviews_v1
 WHERE attempt_id=p_attempt_id FOR UPDATE;
 SELECT * INTO j FROM reality_internal.riley_unattended_repair_originals_v1
 WHERE original_work_id=r.original_work_id FOR UPDATE;
 SELECT * INTO v FROM reality_internal.governed_original_install_approvals_v1
 WHERE approval_id=r.approval_receipt_id;
 IF NOT FOUND OR r.original_work_id IS NULL OR v.approval_id IS NULL OR
   r.approved_at IS NULL OR r.installation_fenced_at IS NULL OR
   p_source_blob_sha<>r.expected_installed_blob_sha OR
   p_installed_commit_sha=r.candidate_commit_sha OR
   v.owner_id<>r.owner_id OR v.shift_id<>r.shift_id OR
   v.original_work_id<>r.original_work_id OR v.attempt_id<>r.attempt_id OR
   j.original_work_id<>r.original_work_id OR
   j.owner_id<>r.owner_id OR j.shift_id<>r.shift_id OR
   j.phase<>'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL' OR
   j.installed IS DISTINCT FROM false OR
   j.original_settlement_receipt_ref IS NOT NULL OR
   j.exact_approval_receipt_ref IS DISTINCT FROM
     'supabase:governed_original_install_approvals_v1:'||v.approval_id::text
 THEN RAISE EXCEPTION 'GENERAL_INSTALL_INDEPENDENT_READBACK_OWNER_SCOPE_DRIFT';END IF;
 IF r.phase='SOURCE_INSTALLED' THEN
  IF r.installed_commit_sha<>p_installed_commit_sha THEN
   RAISE EXCEPTION 'GENERAL_INSTALL_PROVIDER_REPLAY_CONFLICT';END IF;
 ELSE
  IF r.phase<>'INSTALL_INTENT_FENCED' OR r.installed_commit_sha IS NOT NULL THEN
   RAISE EXCEPTION 'GENERAL_INSTALL_PROBE_NOT_EXACT_ONCE';END IF;
  UPDATE reality_internal.governed_original_install_reviews_v1
   SET phase='SOURCE_INSTALLED',installed_commit_sha=p_installed_commit_sha,
       updated_at=clock_timestamp()
   WHERE original_work_id=r.original_work_id AND phase='INSTALL_INTENT_FENCED';
  IF NOT FOUND THEN RAISE EXCEPTION 'GENERAL_INSTALL_SOURCE_RECEIPT_ATOMIC_RACE';END IF;
 END IF;
 RETURN jsonb_build_object('status','GENERAL_ORIGINAL_EXACT_SOURCE_INSTALLED_AWAITING_INDEPENDENT_SETTLEMENT',
  'original_work_id',r.original_work_id,'shift_id',r.shift_id,
  'attempt_id',r.attempt_id,'installed_commit_sha',p_installed_commit_sha,
  'source_blob_sha',p_source_blob_sha,
  'source_installed',true,'installation_authorized',true,
  'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_record_general_original_installed_source_v1(uuid,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_general_original_installed_source_v1(uuid,text,text)
 TO service_role;
