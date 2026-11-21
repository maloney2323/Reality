-- Fenced-original publication recovery, in the SAME existing shift.
-- A new, exact owner click authorizes at most ONE more provider write.
-- An independent recovery release proof is required before presentation.
-- The original installation approval and its exhausted fence stay immutable.
CREATE TABLE IF NOT EXISTS reality_internal.governed_original_recovery_publications_v1(
 recovery_publication_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 original_work_id text NOT NULL UNIQUE CHECK(original_work_id~'^work:[a-f0-9]{32}$'),
 attempt_id uuid NOT NULL UNIQUE,
 owner_id uuid NOT NULL,
 shift_id uuid NOT NULL,
 original_approval_receipt_id uuid NOT NULL,
 recovery_evidence_id uuid NOT NULL UNIQUE,
 target_branch text NOT NULL CHECK(target_branch~'^reality/[A-Za-z0-9/_-]{10,135}$'),
 target_path text NOT NULL CHECK(target_path~'^src/[A-Za-z0-9/_-]+[.]js$'),
 candidate_commit_sha text NOT NULL CHECK(candidate_commit_sha~'^[a-f0-9]{40}$'),
 candidate_artifact_sha256 text NOT NULL CHECK(candidate_artifact_sha256~'^sha256:[a-f0-9]{64}$'),
 expected_baseline_blob_sha text NOT NULL CHECK(expected_baseline_blob_sha~'^[a-f0-9]{40}$'),
 expected_installed_blob_sha text NOT NULL CHECK(expected_installed_blob_sha~'^[a-f0-9]{40}$'),
 expected_parent_commit_sha text NOT NULL CHECK(expected_parent_commit_sha~'^[a-f0-9]{40}$'),
 independent_recovery_test_run_id bigint NOT NULL CHECK(independent_recovery_test_run_id>10000),
 independent_recovery_test_commit_sha text NOT NULL CHECK(independent_recovery_test_commit_sha~'^[a-f0-9]{40}$'),
 phase text NOT NULL DEFAULT 'READY_FOR_EXACT_RECOVERY_APPROVAL'
  CHECK(phase IN ('READY_FOR_EXACT_RECOVERY_APPROVAL','OWNER_APPROVED',
   'RECOVERY_WRITE_FENCED','SOURCE_INSTALLED','EFFECT_UNCERTAIN')),
 owner_request_id uuid UNIQUE,
 owner_approval_id uuid UNIQUE,
 owner_approved_at timestamptz,
 recovery_write_fenced_at timestamptz,
 installed_commit_sha text CHECK(installed_commit_sha IS NULL OR installed_commit_sha~'^[a-f0-9]{40}$'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CONSTRAINT recovery_decision_consistency CHECK(
  (phase='READY_FOR_EXACT_RECOVERY_APPROVAL' AND owner_request_id IS NULL
   AND owner_approval_id IS NULL AND owner_approved_at IS NULL
   AND recovery_write_fenced_at IS NULL AND installed_commit_sha IS NULL)
  OR
  (phase='OWNER_APPROVED' AND owner_request_id IS NOT NULL
   AND owner_approval_id IS NOT NULL AND owner_approved_at IS NOT NULL
   AND recovery_write_fenced_at IS NULL AND installed_commit_sha IS NULL)
  OR
  (phase IN ('RECOVERY_WRITE_FENCED','EFFECT_UNCERTAIN') AND
   owner_request_id IS NOT NULL AND owner_approval_id IS NOT NULL AND
   owner_approved_at IS NOT NULL AND recovery_write_fenced_at IS NOT NULL
   AND installed_commit_sha IS NULL)
  OR
  (phase='SOURCE_INSTALLED' AND owner_request_id IS NOT NULL
   AND owner_approval_id IS NOT NULL AND owner_approved_at IS NOT NULL
   AND recovery_write_fenced_at IS NOT NULL AND installed_commit_sha IS NOT NULL))
);
ALTER TABLE reality_internal.governed_original_recovery_publications_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reality_internal.governed_original_recovery_publications_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON reality_internal.governed_original_recovery_publications_v1 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_stage_general_original_recovery_publication_v1(
 p_attempt_id uuid,p_independent_run_id bigint,p_proof_commit_sha text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE r reality_internal.governed_original_install_reviews_v1%rowtype;
 i reality_internal.governed_original_install_fenced_investigations_v1%rowtype;
 e reality_internal.governed_original_install_fenced_recoveries_v1%rowtype;
 v reality_internal.governed_original_recovery_publications_v1%rowtype;
 g jsonb;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'RECOVERY_STAGE_SERVICE_ROLE_REQUIRED'; END IF;
 IF p_attempt_id IS NULL OR p_independent_run_id<=10000 OR
  p_proof_commit_sha!~'^[a-f0-9]{40}$'
 THEN RAISE EXCEPTION 'RECOVERY_STAGE_INDEPENDENT_RELEASE_PROOF_REQUIRED';END IF;
 g:=public.reality_read_general_original_install_scope_v1();
 SELECT * INTO r FROM reality_internal.governed_original_install_reviews_v1
 WHERE attempt_id=p_attempt_id;
 SELECT * INTO e FROM reality_internal.governed_original_install_fenced_recoveries_v1
 WHERE attempt_id=p_attempt_id;
 SELECT * INTO i FROM reality_internal.governed_original_install_fenced_investigations_v1
 WHERE attempt_id=p_attempt_id;
 IF r.attempt_id IS NULL OR e.recovery_id IS NULL OR i.investigation_id IS NULL
  OR g->>'status'<>'GENERAL_INSTALL_OWNER_APPROVED_SOURCE_SCOPE'
  OR g->>'attempt_id'<>p_attempt_id::text
  OR r.phase<>'INSTALL_INTENT_FENCED'
  OR r.install_expected_parent_commit_sha<>e.expected_parent_sha
  OR r.original_work_id<>e.original_work_id OR r.original_work_id<>i.original_work_id
  OR r.owner_id<>e.owner_id OR r.owner_id<>i.owner_id
  OR r.shift_id<>e.shift_id OR r.shift_id<>i.shift_id
  OR r.approval_receipt_id<>e.approval_receipt_id
  OR r.approval_receipt_id<>i.approval_receipt_id
  OR r.original_final_receipt_id IS NOT NULL OR r.installed_commit_sha IS NOT NULL
  OR e.installation_retried OR e.original_job_completed
  OR i.state<>'ADVISORY_HYPOTHESIS_RECORDED' OR i.external_retry_authorized
  OR i.original_job_completed
  OR p_independent_run_id IN (r.independent_frozen_run_id,r.integrated_test_run_id)
 THEN RAISE EXCEPTION 'RECOVERY_STAGE_EXACT_ORIGINAL_PROOF_DRIFT';END IF;
 INSERT INTO reality_internal.governed_original_recovery_publications_v1(
 original_work_id,attempt_id,owner_id,shift_id,original_approval_receipt_id,
 recovery_evidence_id,target_branch,target_path,candidate_commit_sha,
 candidate_artifact_sha256,expected_baseline_blob_sha,expected_installed_blob_sha,
 expected_parent_commit_sha,independent_recovery_test_run_id,
 independent_recovery_test_commit_sha)
 VALUES(r.original_work_id,r.attempt_id,r.owner_id,r.shift_id,r.approval_receipt_id,
 e.recovery_id,r.exact_install_target_branch,r.source_file_path,
 r.candidate_commit_sha,r.candidate_artifact_sha256,
 r.expected_preinstall_blob_sha,r.expected_installed_blob_sha,
 r.install_expected_parent_commit_sha,p_independent_run_id,p_proof_commit_sha)
 ON CONFLICT(attempt_id) DO NOTHING;
 SELECT * INTO v FROM reality_internal.governed_original_recovery_publications_v1
 WHERE attempt_id=p_attempt_id;
 IF NOT FOUND OR v.original_work_id<>r.original_work_id
  OR v.owner_id<>r.owner_id OR v.shift_id<>r.shift_id
  OR v.original_approval_receipt_id<>r.approval_receipt_id
  OR v.recovery_evidence_id<>e.recovery_id
  OR v.expected_parent_commit_sha<>r.install_expected_parent_commit_sha
  OR v.candidate_artifact_sha256<>r.candidate_artifact_sha256
  OR v.independent_recovery_test_run_id<>p_independent_run_id
  OR v.independent_recovery_test_commit_sha<>p_proof_commit_sha
 THEN RAISE EXCEPTION 'RECOVERY_STAGE_FROZEN_PROOF_CONFLICT';END IF;
 RETURN jsonb_build_object('status','RECOVERY_PUBLICATION_EXACT_OWNER_DECISION_READY',
  'recovery_publication_id',v.recovery_publication_id,
  'original_work_id',v.original_work_id,'phase',v.phase,
  'independent_recovery_test_run_id',v.independent_recovery_test_run_id,
  'installation_authorized',v.owner_approval_id IS NOT NULL,
  'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_stage_general_original_recovery_publication_v1(uuid,bigint,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_stage_general_original_recovery_publication_v1(uuid,bigint,text) TO service_role;

CREATE OR REPLACE FUNCTION public.reality_read_general_original_recovery_review_v1(p_owner_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE v reality_internal.governed_original_recovery_publications_v1%rowtype;
 r reality_internal.governed_original_install_reviews_v1%rowtype;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'RECOVERY_REVIEW_SERVICE_ONLY';END IF;
 SELECT * INTO v FROM reality_internal.governed_original_recovery_publications_v1
 WHERE owner_id=p_owner_id;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','NO_CURRENT_RECOVERY_RELEASE_READY',
  'owner_approval_ready',false,'production_changed',false);END IF;
 SELECT * INTO r FROM reality_internal.governed_original_install_reviews_v1
 WHERE attempt_id=v.attempt_id AND original_work_id=v.original_work_id
  AND owner_id=p_owner_id;
 IF NOT FOUND OR r.approval_receipt_id<>v.original_approval_receipt_id
  OR r.candidate_artifact_sha256<>v.candidate_artifact_sha256
  OR r.candidate_commit_sha<>v.candidate_commit_sha
  OR r.install_expected_parent_commit_sha<>v.expected_parent_commit_sha
  OR r.installed_commit_sha IS NOT NULL OR r.original_final_receipt_id IS NOT NULL
  OR r.phase<>'INSTALL_INTENT_FENCED'
 THEN RETURN jsonb_build_object('status','RECOVERY_RELEASE_SOURCE_SCOPE_UNVERIFIED',
  'owner_approval_ready',false,'production_changed',false);END IF;
 RETURN jsonb_build_object('status','GENERAL_ORIGINAL_EXACT_RECOVERY_PUBLICATION_REVIEW',
  'recovery_publication_id',v.recovery_publication_id,
  'original_work_id',v.original_work_id,'attempt_id',v.attempt_id,
  'shift_id',v.shift_id,'phase',v.phase,
  'source_ref',r.source_ref,
  'candidate_commit_sha',v.candidate_commit_sha,
  'candidate_artifact_sha256',v.candidate_artifact_sha256,
  'expected_parent_commit_sha',v.expected_parent_commit_sha,
  'target_branch',v.target_branch,'target_path',v.target_path,
  'independent_recovery_test_run_id',v.independent_recovery_test_run_id,
  'proof_commit_sha',v.independent_recovery_test_commit_sha,
  'owner_approval_ready',(v.phase='READY_FOR_EXACT_RECOVERY_APPROVAL'),
  'owner_approval_id',v.owner_approval_id,
  'source_installed',false,'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_general_original_recovery_review_v1(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_general_original_recovery_review_v1(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.reality_owner_approve_general_original_recovery_v1(
 p_recovery_publication_id uuid,p_original_work_id text,p_attempt_id uuid,
 p_candidate_commit_sha text,p_artifact_sha256 text,p_expected_parent_sha text,
 p_intent text,p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v reality_internal.governed_original_recovery_publications_v1%rowtype;
 r reality_internal.governed_original_install_reviews_v1%rowtype;
 g jsonb;v_owner uuid:=auth.uid();
BEGIN
 IF auth.jwt()->>'role'<>'authenticated' OR
  coalesce(auth.jwt()->>'is_anonymous','false')='true'
  OR v_owner IS NULL OR p_request_id IS NULL OR p_recovery_publication_id IS NULL
  OR p_attempt_id IS NULL OR
  p_intent<>'OWNER_APPROVE_ONE_EXACT_FENCED_ORIGINAL_RECOVERY_PUBLICATION'
 THEN RAISE EXCEPTION 'RECOVERY_EXACT_SIGNED_OWNER_CLICK_REQUIRED';END IF;
 SELECT * INTO v FROM reality_internal.governed_original_recovery_publications_v1
 WHERE recovery_publication_id=p_recovery_publication_id FOR UPDATE;
 IF NOT FOUND OR v.owner_id<>v_owner OR v.attempt_id<>p_attempt_id
  OR v.original_work_id<>p_original_work_id
  OR v.candidate_commit_sha<>p_candidate_commit_sha
  OR v.candidate_artifact_sha256<>p_artifact_sha256
  OR v.expected_parent_commit_sha<>p_expected_parent_sha
 THEN RAISE EXCEPTION 'RECOVERY_OWNER_EXACT_ARTIFACT_DRIFT';END IF;
 IF v.phase<>'READY_FOR_EXACT_RECOVERY_APPROVAL' OR
  v.owner_approval_id IS NOT NULL OR v.owner_request_id IS NOT NULL OR
  v.independent_recovery_test_run_id<=10000
 THEN RAISE EXCEPTION 'RECOVERY_ONE_USE_OWNER_DECISION_ALREADY_CONSUMED';END IF;
 SELECT * INTO r FROM reality_internal.governed_original_install_reviews_v1
 WHERE attempt_id=v.attempt_id;
 g:=public.reality_read_current_shift_execution_graph_v1();
 IF NOT FOUND OR r.owner_id<>v_owner OR r.original_work_id<>v.original_work_id
  OR r.shift_id<>v.shift_id OR r.phase<>'INSTALL_INTENT_FENCED'
  OR r.approval_receipt_id<>v.original_approval_receipt_id
  OR r.candidate_artifact_sha256<>v.candidate_artifact_sha256
  OR r.installed_commit_sha IS NOT NULL OR r.original_final_receipt_id IS NOT NULL
  OR g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'
  OR g->>'owner_id'<>v_owner::text OR g->>'shift_id'<>v.shift_id::text
  OR g->>'production_changed'<>'false'
 THEN RAISE EXCEPTION 'RECOVERY_SIGNED_SHIFT_ORIGINAL_NOT_CURRENT';END IF;
 UPDATE reality_internal.governed_original_recovery_publications_v1
 SET phase='OWNER_APPROVED',owner_request_id=p_request_id,
  owner_approval_id=gen_random_uuid(),owner_approved_at=clock_timestamp(),
  updated_at=clock_timestamp()
 WHERE recovery_publication_id=v.recovery_publication_id
  AND phase='READY_FOR_EXACT_RECOVERY_APPROVAL'
 RETURNING * INTO v;
 IF NOT FOUND THEN RAISE EXCEPTION 'RECOVERY_OWNER_APPROVAL_RACE';END IF;
 RETURN jsonb_build_object('status','ONE_EXACT_RECOVERY_PUBLICATION_OWNER_APPROVED',
  'recovery_publication_id',v.recovery_publication_id,
  'owner_approval_id',v.owner_approval_id,
  'original_work_id',v.original_work_id,'shift_id',v.shift_id,
  'original_job_completed',false,'source_installed',false,
  'production_changed',false,'no_third_confirmation',true);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_owner_approve_general_original_recovery_v1(
 uuid,text,uuid,text,text,text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_owner_approve_general_original_recovery_v1(
 uuid,text,uuid,text,text,text,text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.reality_read_general_original_recovery_install_scope_v1()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE v reality_internal.governed_original_recovery_publications_v1%rowtype;g jsonb;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'RECOVERY_INSTALL_SCOPE_SERVICE_ONLY';END IF;
 g:=public.reality_read_general_original_install_scope_v1();
 IF g->>'status'<>'GENERAL_INSTALL_OWNER_APPROVED_SOURCE_SCOPE' OR
  g->>'phase'<>'INSTALL_INTENT_FENCED'
 THEN RETURN jsonb_build_object('status','NO_CURRENT_OWNER_APPROVED_RECOVERY_PUBLICATION',
  'write_authorized',false,'production_changed',false);END IF;
 SELECT * INTO v FROM reality_internal.governed_original_recovery_publications_v1
 WHERE attempt_id=(g->>'attempt_id')::uuid;
 IF NOT FOUND OR v.original_work_id<>g->>'original_work_id'
  OR v.owner_id::text<>g->>'owner_id' OR v.shift_id::text<>g->>'shift_id'
  OR v.candidate_artifact_sha256<>g->>'candidate_artifact_sha256'
  OR v.candidate_commit_sha<>g->>'candidate_commit_sha'
  OR v.expected_parent_commit_sha<>g->>'expected_parent_commit_sha'
  OR v.expected_baseline_blob_sha<>g->>'expected_preinstall_blob_sha'
  OR v.expected_installed_blob_sha<>g->>'expected_installed_blob_sha'
  OR v.original_approval_receipt_id::text<>g->>'approval_receipt_id'
 THEN RETURN jsonb_build_object('status','RECOVERY_INSTALL_SCOPE_DRIFT',
  'write_authorized',false,'production_changed',false);END IF;
 RETURN jsonb_build_object('status','EXACT_RECOVERY_PUBLICATION_CURRENT_OWNER_SCOPE',
  'recovery_publication_id',v.recovery_publication_id,
  'original_work_id',v.original_work_id,'shift_id',v.shift_id,
  'attempt_id',v.attempt_id,'owner_approval_id',v.owner_approval_id,
  'phase',v.phase,'target_branch',v.target_branch,'target_path',v.target_path,
  'expected_parent_commit_sha',v.expected_parent_commit_sha,
  'expected_preinstall_blob_sha',v.expected_baseline_blob_sha,
  'expected_installed_blob_sha',v.expected_installed_blob_sha,
  'candidate_commit_sha',v.candidate_commit_sha,
  'candidate_artifact_sha256',v.candidate_artifact_sha256,
  'write_authorized',(v.phase='OWNER_APPROVED' AND v.owner_approval_id IS NOT NULL),
  'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_general_original_recovery_install_scope_v1()
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_general_original_recovery_install_scope_v1()
 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_claim_general_original_recovery_publication_v1(
 p_expected_parent_sha text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE v reality_internal.governed_original_recovery_publications_v1%rowtype;
 g jsonb;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'RECOVERY_PUBLICATION_SERVICE_ONLY';END IF;
 IF p_expected_parent_sha!~'^[a-f0-9]{40}$'
 THEN RAISE EXCEPTION 'RECOVERY_PUBLICATION_PINNED_PROVIDER_PARENT_REQUIRED';END IF;
 g:=public.reality_read_general_original_install_scope_v1();
 IF g->>'status'<>'GENERAL_INSTALL_OWNER_APPROVED_SOURCE_SCOPE' OR
  g->>'phase'<>'INSTALL_INTENT_FENCED'
 THEN RAISE EXCEPTION 'RECOVERY_PUBLICATION_CURRENT_ORIGINAL_NOT_FENCED';END IF;
 SELECT * INTO v FROM reality_internal.governed_original_recovery_publications_v1
 WHERE attempt_id=(g->>'attempt_id')::uuid FOR UPDATE;
 IF NOT FOUND OR v.owner_id::text<>g->>'owner_id'
  OR v.original_work_id<>g->>'original_work_id'
  OR v.shift_id::text<>g->>'shift_id'
  OR v.expected_parent_commit_sha<>p_expected_parent_sha
  OR v.owner_approval_id IS NULL OR v.owner_approved_at IS NULL
 THEN RAISE EXCEPTION 'RECOVERY_PUBLICATION_EXACT_WARRANT_NOT_VERIFIED';END IF;
 IF v.phase<>'OWNER_APPROVED' THEN
  RETURN jsonb_build_object('status','RECOVERY_PUBLICATION_ALREADY_CLAIMED_NO_SECOND_WRITE',
   'original_work_id',v.original_work_id,'attempt_id',v.attempt_id,
   'write_authorized',false,'original_job_completed',false,
   'production_changed',false);
 END IF;
 UPDATE reality_internal.governed_original_recovery_publications_v1
 SET phase='RECOVERY_WRITE_FENCED',recovery_write_fenced_at=clock_timestamp(),
  updated_at=clock_timestamp()
 WHERE recovery_publication_id=v.recovery_publication_id AND phase='OWNER_APPROVED'
 RETURNING * INTO v;
 IF NOT FOUND THEN RAISE EXCEPTION 'RECOVERY_PUBLICATION_ONE_USE_CLAIM_RACE';END IF;
 RETURN jsonb_build_object('status','ONE_EXACT_RECOVERY_PUBLICATION_WRITE_FENCED',
  'recovery_publication_id',v.recovery_publication_id,
  'original_work_id',v.original_work_id,'attempt_id',v.attempt_id,
  'owner_approval_id',v.owner_approval_id,
  'target_branch',v.target_branch,'target_path',v.target_path,
  'expected_parent_commit_sha',v.expected_parent_commit_sha,
  'expected_preinstall_blob_sha',v.expected_baseline_blob_sha,
  'expected_installed_blob_sha',v.expected_installed_blob_sha,
  'candidate_commit_sha',v.candidate_commit_sha,
  'candidate_artifact_sha256',v.candidate_artifact_sha256,
  'write_authorized',true,'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_claim_general_original_recovery_publication_v1(text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_claim_general_original_recovery_publication_v1(text)
 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_record_general_original_recovery_published_v1(
 p_recovery_publication_id uuid,p_installed_commit_sha text,p_source_blob_sha text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE v reality_internal.governed_original_recovery_publications_v1%rowtype;
 result jsonb;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'RECOVERY_INSTALLED_SERVICE_ONLY';END IF;
 IF p_installed_commit_sha!~'^[a-f0-9]{40}$' OR
  p_source_blob_sha!~'^[a-f0-9]{40}$'
 THEN RAISE EXCEPTION 'RECOVERY_PROVIDER_COMMIT_AND_BLOB_REQUIRED';END IF;
 SELECT * INTO v FROM reality_internal.governed_original_recovery_publications_v1
 WHERE recovery_publication_id=p_recovery_publication_id FOR UPDATE;
 IF NOT FOUND OR v.phase NOT IN ('RECOVERY_WRITE_FENCED','SOURCE_INSTALLED')
  OR v.expected_installed_blob_sha<>p_source_blob_sha
  OR v.expected_parent_commit_sha=p_installed_commit_sha
  OR v.owner_approval_id IS NULL OR v.recovery_write_fenced_at IS NULL
 THEN RAISE EXCEPTION 'RECOVERY_SOURCE_WRITE_NOT_FENCED_FOR_OWNER';END IF;
 IF v.phase='SOURCE_INSTALLED' AND v.installed_commit_sha<>p_installed_commit_sha
 THEN RAISE EXCEPTION 'RECOVERY_SOURCE_POSTWRITE_REPLAY_CONFLICT';END IF;
 -- The original recorder still enforces the same original job, exact artifact
 -- and consumed original fence; source isn't considered installed until the
 -- service has independently read back GitHub's commit and exact blob.
 result:=public.reality_record_general_original_installed_source_v1(
  v.attempt_id,p_installed_commit_sha,p_source_blob_sha);
 IF result->>'status'<>'GENERAL_ORIGINAL_EXACT_SOURCE_INSTALLED_AWAITING_INDEPENDENT_SETTLEMENT'
 THEN RAISE EXCEPTION 'RECOVERY_ORIGINAL_INSTALL_READBACK_NOT_DURABLE';END IF;
 UPDATE reality_internal.governed_original_recovery_publications_v1
 SET phase='SOURCE_INSTALLED',installed_commit_sha=p_installed_commit_sha,
  updated_at=clock_timestamp()
 WHERE recovery_publication_id=v.recovery_publication_id;
 RETURN jsonb_build_object('status','RECOVERY_ORIGINAL_SOURCE_INSTALLED_IN_SAME_JOB',
  'original_work_id',v.original_work_id,'installed_commit_sha',p_installed_commit_sha,
  'source_installed',true,'original_job_completed',false,'production_changed',false,
  'next_gate','INDEPENDENT_SAME_ORIGINAL_POSTINSTALL_ACCEPTANCE_AND_SETTLEMENT');
END $fn$;
REVOKE ALL ON FUNCTION public.reality_record_general_original_recovery_published_v1(uuid,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_general_original_recovery_published_v1(uuid,text,text)
 TO service_role;
