-- Exact original-job fenced-install recovery intake; evidence only.
-- Never creates another shift/job/owner consent, retries GitHub writes, or
-- upgrades a self-observed provider result to an independent final receipt.
CREATE TABLE IF NOT EXISTS reality_internal.governed_original_install_fenced_recoveries_v1(
 recovery_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 attempt_id uuid NOT NULL UNIQUE,
 original_work_id text NOT NULL CHECK(original_work_id~'^work:[a-f0-9]{32}$'),
 owner_id uuid NOT NULL,
 shift_id uuid NOT NULL,
 approval_receipt_id uuid NOT NULL,
 expected_parent_sha text NOT NULL CHECK(expected_parent_sha~'^[a-f0-9]{40}$'),
 target_branch text NOT NULL,
 candidate_artifact_sha256 text NOT NULL CHECK(candidate_artifact_sha256~'^sha256:[a-f0-9]{64}$'),
 provider_evidence_sha256 text NOT NULL CHECK(provider_evidence_sha256~'^[a-f0-9]{64}$'),
 finding text NOT NULL CHECK(finding='FENCED_BASELINE_AND_APPROVED_GIT_OBJECTS_STILL_READABLE'),
 phase text NOT NULL DEFAULT 'READ_ONLY_DIAGNOSIS_RECORDED'
  CHECK(phase IN ('READ_ONLY_DIAGNOSIS_RECORDED','REPAIR_INVESTIGATION_IN_PROGRESS',
                  'SAFE_REPAIR_CANDIDATE_READY','EXACT_RECOVERY_DECISION_REQUIRED')),
 recovery_required boolean NOT NULL DEFAULT true CHECK(recovery_required),
 installation_retried boolean NOT NULL DEFAULT false CHECK(NOT installation_retried),
 independently_verified_completion boolean NOT NULL DEFAULT false
  CHECK(NOT independently_verified_completion),
 original_job_completed boolean NOT NULL DEFAULT false CHECK(NOT original_job_completed),
 production_changed boolean NOT NULL DEFAULT false CHECK(NOT production_changed),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CONSTRAINT fenced_recovery_attempt_owner UNIQUE(attempt_id,owner_id,shift_id)
);
ALTER TABLE reality_internal.governed_original_install_fenced_recoveries_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reality_internal.governed_original_install_fenced_recoveries_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON reality_internal.governed_original_install_fenced_recoveries_v1 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_record_general_original_fenced_recovery_v1(
 p_attempt_id uuid,p_observed_branch_head text,
 p_evidence_sha256 text,p_finding text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE r reality_internal.governed_original_install_reviews_v1%rowtype;
 x reality_internal.governed_original_install_fenced_recoveries_v1%rowtype;
 g jsonb;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'FENCED_RECOVERY_SIGNED_SERVICE_ONLY';END IF;
 IF p_attempt_id IS NULL OR p_observed_branch_head!~'^[a-f0-9]{40}$'
  OR p_evidence_sha256!~'^[a-f0-9]{64}$'
  OR p_finding<>'FENCED_BASELINE_AND_APPROVED_GIT_OBJECTS_STILL_READABLE'
 THEN RAISE EXCEPTION 'FENCED_RECOVERY_PROVIDER_EVIDENCE_INVALID';END IF;
 -- Trust the exact existing owner shift + immutable approved source warrant,
 -- not the provider reply alone.
 g:=public.reality_read_general_original_install_scope_v1();
 IF g->>'status'<>'GENERAL_INSTALL_OWNER_APPROVED_SOURCE_SCOPE'
  OR g->>'phase'<>'INSTALL_INTENT_FENCED'
  OR g->>'attempt_id' IS DISTINCT FROM p_attempt_id::text
  OR g->>'expected_parent_commit_sha' IS DISTINCT FROM p_observed_branch_head
  OR g->>'installation_authorized'<>'true'
  OR g->>'original_job_completed'<>'false'
  OR g->>'production_changed'<>'false'
 THEN RAISE EXCEPTION 'FENCED_RECOVERY_CURRENT_OWNER_WARRANT_UNVERIFIED';END IF;
 SELECT * INTO r FROM reality_internal.governed_original_install_reviews_v1
  WHERE attempt_id=p_attempt_id AND phase='INSTALL_INTENT_FENCED'
   AND approval_receipt_id IS NOT NULL
   AND installed_commit_sha IS NULL AND original_final_receipt_id IS NULL
  FOR SHARE;
 IF NOT FOUND OR r.original_work_id<>g->>'original_work_id'
  OR r.owner_id::text<>g->>'owner_id'
  OR r.shift_id::text<>g->>'shift_id'
  OR r.candidate_artifact_sha256<>g->>'candidate_artifact_sha256'
  OR r.install_expected_parent_commit_sha<>p_observed_branch_head
 THEN RAISE EXCEPTION 'FENCED_RECOVERY_APPROVED_ARTIFACT_DRIFT';END IF;
 INSERT INTO reality_internal.governed_original_install_fenced_recoveries_v1(
  attempt_id,original_work_id,owner_id,shift_id,approval_receipt_id,
  expected_parent_sha,target_branch,candidate_artifact_sha256,
  provider_evidence_sha256,finding)
 VALUES(r.attempt_id,r.original_work_id,r.owner_id,r.shift_id,
  r.approval_receipt_id,p_observed_branch_head,r.exact_install_target_branch,
  r.candidate_artifact_sha256,p_evidence_sha256,p_finding)
 ON CONFLICT(attempt_id) DO NOTHING;
 SELECT * INTO x FROM reality_internal.governed_original_install_fenced_recoveries_v1
  WHERE attempt_id=p_attempt_id;
 IF x.recovery_id IS NULL OR x.owner_id<>r.owner_id
  OR x.original_work_id<>r.original_work_id OR x.shift_id<>r.shift_id
  OR x.approval_receipt_id<>r.approval_receipt_id
  OR x.expected_parent_sha<>p_observed_branch_head
  OR x.candidate_artifact_sha256<>r.candidate_artifact_sha256
  OR x.provider_evidence_sha256<>p_evidence_sha256
  OR x.finding<>p_finding
 THEN RAISE EXCEPTION 'FENCED_RECOVERY_IMMUTABLE_EVIDENCE_CONFLICT';END IF;
 RETURN jsonb_build_object('status','GENERAL_ORIGINAL_FENCED_RECOVERY_OBSERVATION_DURABLE',
  'recovery_id',x.recovery_id,'original_work_id',x.original_work_id,
  'shift_id',x.shift_id,'phase',x.phase,
  'next_action','INVESTIGATE_GITHUB_INSTALLER_WRITE_PATH',
  'installation_retried',false,'original_job_completed',false,
  'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_record_general_original_fenced_recovery_v1(uuid,text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_general_original_fenced_recovery_v1(uuid,text,text,text)
 TO service_role;
