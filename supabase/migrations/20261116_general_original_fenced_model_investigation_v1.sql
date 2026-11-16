-- A recovered installation automatically becomes ONE governed Riley research task.
-- A model can propose a hypothesis, never grant retry, installation or settlement.
CREATE TABLE IF NOT EXISTS reality_internal.governed_original_install_fenced_investigations_v1(
 investigation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 recovery_id uuid NOT NULL UNIQUE REFERENCES reality_internal.governed_original_install_fenced_recoveries_v1(recovery_id),
 original_work_id text NOT NULL CHECK(original_work_id~'^work:[a-f0-9]{32}$'),
 attempt_id uuid NOT NULL UNIQUE,
 owner_id uuid NOT NULL,
 shift_id uuid NOT NULL,
 approval_receipt_id uuid NOT NULL,
 provider_evidence_sha256 text NOT NULL CHECK(provider_evidence_sha256~'^[a-f0-9]{64}$'),
 model_request_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
 state text NOT NULL DEFAULT 'MODEL_LEASED'
  CHECK(state IN ('MODEL_LEASED','ADVISORY_HYPOTHESIS_RECORDED','MODEL_PROVIDER_UNCERTAIN')),
 model_response_id text,
 suspected_failure_stage text,
 repair_proposal text,
 independent_test_plan text,
 model_findings_are_hypotheses boolean NOT NULL DEFAULT true CHECK(model_findings_are_hypotheses),
 independently_tested boolean NOT NULL DEFAULT false CHECK(NOT independently_tested),
 external_retry_authorized boolean NOT NULL DEFAULT false CHECK(NOT external_retry_authorized),
 installed_commit_sha text,
 original_job_completed boolean NOT NULL DEFAULT false CHECK(NOT original_job_completed),
 production_changed boolean NOT NULL DEFAULT false CHECK(NOT production_changed),
 claimed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 recorded_at timestamptz
);
ALTER TABLE reality_internal.governed_original_install_fenced_investigations_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reality_internal.governed_original_install_fenced_investigations_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON reality_internal.governed_original_install_fenced_investigations_v1 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_claim_general_original_fenced_investigation_v1()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE s jsonb; r reality_internal.governed_original_install_fenced_recoveries_v1%rowtype;
 v reality_internal.governed_original_install_fenced_investigations_v1%rowtype;
 v_inserted boolean:=false;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'FENCED_INVESTIGATION_SERVICE_ONLY';END IF;
 s:=public.reality_read_general_original_install_scope_v1();
 IF s->>'status'<>'GENERAL_INSTALL_OWNER_APPROVED_SOURCE_SCOPE'
    OR s->>'phase'<>'INSTALL_INTENT_FENCED'
 THEN RETURN jsonb_build_object('status','NO_CURRENT_FENCED_ORIGINAL_TO_DIAGNOSE',
   'model_invocation_authorized',false,'production_changed',false);END IF;
 SELECT * INTO r FROM reality_internal.governed_original_install_fenced_recoveries_v1
 WHERE attempt_id=(s->>'attempt_id')::uuid
  AND original_work_id=s->>'original_work_id'
  AND shift_id=(s->>'shift_id')::uuid
  AND approval_receipt_id=(s->>'approval_receipt_id')::uuid
  AND phase='READ_ONLY_DIAGNOSIS_RECORDED'
  AND NOT installation_retried AND NOT original_job_completed
 FOR SHARE;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','NO_PINNED_FENCED_EVIDENCE_FOR_INVESTIGATION',
   'model_invocation_authorized',false,'production_changed',false);END IF;
 INSERT INTO reality_internal.governed_original_install_fenced_investigations_v1(
 recovery_id,original_work_id,attempt_id,owner_id,shift_id,approval_receipt_id,provider_evidence_sha256)
 VALUES(r.recovery_id,r.original_work_id,r.attempt_id,r.owner_id,r.shift_id,
   r.approval_receipt_id,r.provider_evidence_sha256)
 ON CONFLICT (attempt_id) DO NOTHING
 RETURNING * INTO v;
 v_inserted:=FOUND;
 IF NOT v_inserted THEN
  RETURN jsonb_build_object('status','FENCED_INSTALL_MODEL_INVESTIGATION_ALREADY_CLAIMED_NO_REPLAY',
   'model_invocation_authorized',false,'original_work_id',r.original_work_id,
   'original_job_completed',false,'production_changed',false);END IF;
 RETURN jsonb_build_object('status','FENCED_INSTALL_INVESTIGATION_MODEL_LEASED',
   'investigation_id',v.investigation_id,'model_request_id',v.model_request_id,
   'original_work_id',v.original_work_id,'attempt_id',v.attempt_id,
   'shift_id',v.shift_id,'provider_evidence_sha256',v.provider_evidence_sha256,
   'finding',r.finding,'target_branch',r.target_branch,
   'expected_parent_sha',r.expected_parent_sha,
   'candidate_artifact_sha256',r.candidate_artifact_sha256,
   'model_invocation_authorized',true,
   'external_retry_authorized',false,'original_job_completed',false,
   'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_claim_general_original_fenced_investigation_v1() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_claim_general_original_fenced_investigation_v1() TO service_role;

CREATE OR REPLACE FUNCTION public.reality_record_general_original_fenced_hypothesis_v1(
 p_investigation_id uuid,p_model_request_id uuid,p_model_response_id text,
 p_suspected_failure_stage text,p_repair_proposal text,p_independent_test_plan text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE v reality_internal.governed_original_install_fenced_investigations_v1%rowtype; s jsonb;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'FENCED_HYPOTHESIS_SERVICE_ONLY';END IF;
 IF p_model_response_id !~ '^resp_[A-Za-z0-9_-]{4,160}$'
  OR length(p_suspected_failure_stage) NOT BETWEEN 8 AND 1200
  OR length(p_repair_proposal) NOT BETWEEN 12 AND 2500
  OR length(p_independent_test_plan) NOT BETWEEN 12 AND 2000
 THEN RAISE EXCEPTION 'FENCED_MODEL_RESPONSE_SCHEMA_INVALID';END IF;
 s:=public.reality_read_general_original_install_scope_v1();
 UPDATE reality_internal.governed_original_install_fenced_investigations_v1 SET
 state='ADVISORY_HYPOTHESIS_RECORDED',model_response_id=p_model_response_id,
 suspected_failure_stage=p_suspected_failure_stage,
 repair_proposal=p_repair_proposal,independent_test_plan=p_independent_test_plan,
 recorded_at=clock_timestamp()
 WHERE investigation_id=p_investigation_id AND model_request_id=p_model_request_id
  AND state='MODEL_LEASED' AND attempt_id=(s->>'attempt_id')::uuid
  AND original_work_id=s->>'original_work_id'
  AND shift_id=(s->>'shift_id')::uuid
  AND s->>'phase'='INSTALL_INTENT_FENCED'
 RETURNING * INTO v;
 IF NOT FOUND THEN RAISE EXCEPTION 'FENCED_HYPOTHESIS_CURRENT_ORIGINAL_CLAIM_UNVERIFIED';END IF;
 RETURN jsonb_build_object('status','FENCED_ORIGINAL_RILEY_MODEL_HYPOTHESIS_RECORDED',
  'original_work_id',v.original_work_id,'investigation_id',v.investigation_id,
  'model_response_id',v.model_response_id,
  'model_findings_are_hypotheses',true,'independently_tested',false,
  'external_retry_authorized',false,'original_job_completed',false,
  'production_changed',false,'next_gate','INDEPENDENT_REPAIR_TEST_AND_EXACT_RECOVERY_AUTHORITY');
END $fn$;
REVOKE ALL ON FUNCTION public.reality_record_general_original_fenced_hypothesis_v1(uuid,uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_general_original_fenced_hypothesis_v1(uuid,uuid,text,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.reality_mark_general_original_fenced_model_uncertain_v1(
 p_investigation_id uuid,p_model_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE v reality_internal.governed_original_install_fenced_investigations_v1%rowtype;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'FENCED_UNCERTAIN_SERVICE_ONLY';END IF;
 UPDATE reality_internal.governed_original_install_fenced_investigations_v1
 SET state='MODEL_PROVIDER_UNCERTAIN',recorded_at=clock_timestamp()
 WHERE investigation_id=p_investigation_id AND model_request_id=p_model_request_id
  AND state='MODEL_LEASED'
 RETURNING * INTO v;
 IF NOT FOUND THEN RAISE EXCEPTION 'FENCED_UNCERTAIN_CLAIM_UNVERIFIED';END IF;
 RETURN jsonb_build_object('status','FENCED_MODEL_PROVIDER_UNCERTAIN_NO_AUTOMATIC_REPLAY',
  'original_work_id',v.original_work_id,'model_invocation_authorized',false,
  'external_retry_authorized',false,'original_job_completed',false,
  'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_mark_general_original_fenced_model_uncertain_v1(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_mark_general_original_fenced_model_uncertain_v1(uuid,uuid) TO service_role;
