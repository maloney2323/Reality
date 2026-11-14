-- Additive receipt for independent CI that actually CHECKS OUT the pinned
-- candidate commit, even when the Actions workflow lives at a separate
-- verification-only commit. The original staged commit and source are immutable.
-- No installs, production mutations, extra shift or original-job authority.
CREATE TABLE IF NOT EXISTS reality_internal.riley_same_original_frozen_ci_attestations_v1(
 attempt_id uuid PRIMARY KEY REFERENCES reality_internal.riley_same_original_recovery_attempts_v2(attempt_id),
 original_work_id text NOT NULL,
 owner_id uuid NOT NULL,
 shift_id uuid NOT NULL,
 candidate_commit_sha text NOT NULL CHECK(candidate_commit_sha ~ '^[a-f0-9]{40}$'),
 workflow_runner_commit_sha text NOT NULL CHECK(workflow_runner_commit_sha ~ '^[a-f0-9]{40}$'),
 workflow_branch text NOT NULL CHECK(workflow_branch ~ '^reality/riley/auto-corrective-[a-f0-9]{32}-a[2-8]-ci-attest$'),
 verification_pr_number bigint NOT NULL CHECK(verification_pr_number>0),
 independent_run_id bigint UNIQUE NOT NULL CHECK(independent_run_id>10000),
 independent_run_url text UNIQUE NOT NULL,
 independent_run_conclusion text NOT NULL CHECK(independent_run_conclusion IN ('success','failure')),
 workflow_file_sha256 text NOT NULL CHECK(workflow_file_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 proof_kind text NOT NULL DEFAULT 'EXACT_PINNED_CANDIDATE_SHA_CHECKOUT_AND_FROZEN_ORIGINAL_ACCEPTANCE'
   CHECK(proof_kind='EXACT_PINNED_CANDIDATE_SHA_CHECKOUT_AND_FROZEN_ORIGINAL_ACCEPTANCE'),
 verified_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE reality_internal.riley_same_original_frozen_ci_attestations_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reality_internal.riley_same_original_frozen_ci_attestations_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON reality_internal.riley_same_original_frozen_ci_attestations_v1 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_record_same_original_frozen_ci_attestation_v1(
 p_attempt_id uuid,
 p_candidate_commit_sha text,
 p_workflow_runner_commit_sha text,
 p_verification_pr_number bigint,
 p_independent_run_id bigint,
 p_independent_run_url text,
 p_independent_run_conclusion text,
 p_workflow_file_sha256 text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE a record;previous record;g jsonb;v jsonb;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'ORIGINAL_FROZEN_CI_SERVICE_ROLE_ONLY'; END IF;
 IF p_candidate_commit_sha!~'^[a-f0-9]{40}$'
   OR p_workflow_runner_commit_sha!~'^[a-f0-9]{40}$'
   OR p_candidate_commit_sha=p_workflow_runner_commit_sha
   OR p_verification_pr_number IS NULL OR p_verification_pr_number<=0
   OR p_independent_run_id IS NULL OR p_independent_run_id<10000
   OR p_independent_run_url<>'https://github.com/maloney2323/Reality/actions/runs/'||
      p_independent_run_id::text
   OR p_independent_run_conclusion NOT IN ('success','failure')
   OR p_workflow_file_sha256!~'^sha256:[a-f0-9]{64}$'
 THEN RAISE EXCEPTION 'ORIGINAL_FROZEN_CI_EVIDENCE_INVALID'; END IF;
 SELECT * INTO a
 FROM reality_internal.riley_same_original_recovery_attempts_v2
 WHERE attempt_id=p_attempt_id FOR UPDATE;
 IF NOT FOUND OR a.candidate_staged_commit_sha<>p_candidate_commit_sha
   OR a.phase NOT IN ('CANDIDATE_STAGED','CI_FAILED','CI_PASSED')
   OR a.attempt_number NOT BETWEEN 2 AND 8
   OR a.candidate_staged_branch<>'reality/riley/auto-corrective-'||
     pg_catalog.split_part(a.original_work_id,':',2)||'-a'||a.attempt_number::text
   OR a.model_response_id IS NULL
   OR a.proposed_source_sha256 IS NULL
 THEN RAISE EXCEPTION 'ORIGINAL_FROZEN_CI_PINNED_UNSETTLED_CANDIDATE_REQUIRED'; END IF;
 SELECT * INTO previous
 FROM reality_internal.riley_same_original_frozen_ci_attestations_v1
 WHERE attempt_id=p_attempt_id;
 IF FOUND THEN
  IF previous.candidate_commit_sha<>p_candidate_commit_sha
    OR previous.workflow_runner_commit_sha<>p_workflow_runner_commit_sha
    OR previous.verification_pr_number<>p_verification_pr_number
    OR previous.independent_run_id<>p_independent_run_id
    OR previous.independent_run_url<>p_independent_run_url
    OR previous.independent_run_conclusion<>p_independent_run_conclusion
    OR previous.workflow_file_sha256<>p_workflow_file_sha256
    OR previous.original_work_id<>a.original_work_id
    OR previous.shift_id<>a.shift_id
  THEN RAISE EXCEPTION 'ORIGINAL_FROZEN_CI_ATTESTATION_REPLAY_CONFLICT'; END IF;
  IF a.ci_run_id<>p_independent_run_id OR
    a.ci_conclusion<>p_independent_run_conclusion OR
    a.ci_commit_sha<>p_candidate_commit_sha
  THEN RAISE EXCEPTION 'ORIGINAL_FROZEN_CI_RECEIPT_NOT_ATOMICALLY_RECORDED'; END IF;
  RETURN jsonb_build_object('status','ORIGINAL_FROZEN_CI_ALREADY_INDEPENDENTLY_RECORDED',
   'attempt_id',p_attempt_id,'original_work_id',a.original_work_id,
   'shift_id',a.shift_id,'independent_run_id',p_independent_run_id,
   'ci_conclusion',p_independent_run_conclusion,
   'independent_ci_verified',true,'installation_authorized',false,
   'original_job_completed',false,'production_changed',false);
 END IF;
 IF a.phase<>'CANDIDATE_STAGED' THEN
  RAISE EXCEPTION 'ORIGINAL_FROZEN_CI_PRIOR_COMPLETION_CONFLICT'; END IF;
 g:=public.reality_read_current_shift_execution_graph_v1();
 IF g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'
    OR g->>'shift_id'<>a.shift_id::text
    OR g->>'owner_id'<>a.owner_id::text
    OR g->>'installation_authorized'<>'false'
    OR g->>'production_changed'<>'false'
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(g->'jobs') x
      WHERE x->>'original_work_id'=a.original_work_id
        AND x->>'source_ref'=a.source_ref
        AND x->>'source_proof_sha256'=a.source_proof_sha256
        AND x->>'phase'='SOURCE_ADMITTED'
        AND x->>'independent_source_proof_verified'='true')
 THEN RAISE EXCEPTION 'ORIGINAL_FROZEN_CI_SHIFT_GOAL_DRIFT'; END IF;
 IF NOT EXISTS(
  SELECT 1 FROM reality_internal.riley_unattended_repair_originals_v1 j
  WHERE j.original_work_id=a.original_work_id
   AND j.shift_id=a.shift_id AND j.owner_id=a.owner_id
   AND j.phase='SOURCE_ADMITTED'
   AND j.exact_approval_receipt_ref IS NULL
   AND j.original_settlement_receipt_ref IS NULL
   AND j.production_changed=false
 ) THEN RAISE EXCEPTION 'ORIGINAL_FROZEN_CI_ORIGINAL_ALREADY_CHANGED'; END IF;
 INSERT INTO reality_internal.riley_same_original_frozen_ci_attestations_v1(
  attempt_id,original_work_id,owner_id,shift_id,candidate_commit_sha,
  workflow_runner_commit_sha,workflow_branch,verification_pr_number,
  independent_run_id,independent_run_url,independent_run_conclusion,workflow_file_sha256
 ) VALUES (
  a.attempt_id,a.original_work_id,a.owner_id,a.shift_id,a.candidate_staged_commit_sha,
  p_workflow_runner_commit_sha,a.candidate_staged_branch||'-ci-attest',
  p_verification_pr_number,p_independent_run_id,p_independent_run_url,
  p_independent_run_conclusion,p_workflow_file_sha256
 );
 v:=public.reality_record_same_original_recovery_ci_v2(
  a.attempt_id,a.model_response_id,a.proposed_source_sha256,
  a.candidate_staged_commit_sha,p_independent_run_id,
  p_independent_run_url,p_independent_run_conclusion);
 IF v->>'status' NOT IN
 ('SAME_ORIGINAL_RECOVERY_CI_FAILED_NEXT_EVIDENCE_BACKED_ATTEMPT_ELIGIBLE',
  'SAME_ORIGINAL_RECOVERY_CI_PASSED_EXACT_INSTALL_APPROVAL_REQUIRED')
  OR v->>'attempt_id'<>a.attempt_id::text
  OR v->>'original_work_id'<>a.original_work_id
  OR v->>'shift_id'<>a.shift_id::text
  OR v->>'independent_run_id'<>p_independent_run_id::text
  OR v->>'independent_ci_verified'<>'true'
  OR v->>'installation_authorized'<>'false'
  OR v->>'original_job_completed'<>'false'
 THEN RAISE EXCEPTION 'ORIGINAL_FROZEN_CI_TRANSACTION_NOT_VERIFIED'; END IF;
 RETURN v||jsonb_build_object(
  'frozen_ci_attestation','EXACT_PINNED_CANDIDATE_SHA_CHECKOUT_AND_FROZEN_ORIGINAL_ACCEPTANCE',
  'workflow_runner_commit_sha',p_workflow_runner_commit_sha,
  'tested_candidate_commit_sha',p_candidate_commit_sha,
  'verification_pr_number',p_verification_pr_number);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_record_same_original_frozen_ci_attestation_v1(uuid,text,text,bigint,bigint,text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_same_original_frozen_ci_attestation_v1(uuid,text,text,bigint,bigint,text,text,text)
 TO service_role;
