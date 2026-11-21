-- Immutable observation rows are not modified by the model-lease claim.
-- FOR SHARE requires UPDATE privileges and blocked the service_role.
-- Use the existing attempt-level UNIQUE INSERT as the atomic claim gate;
-- do NOT grant UPDATE on the immutable proof ledger.
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
;
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

