-- Read-only continuity of a real same-original, already claimed model diagnosis.
-- Never converts a model hypothesis into an independent test or permission.
CREATE OR REPLACE FUNCTION public.reality_read_general_original_fenced_investigation_state_v1()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE s jsonb;v reality_internal.governed_original_install_fenced_investigations_v1%rowtype;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'FENCED_READ_SERVICE_ONLY';END IF;
 s:=public.reality_read_general_original_install_scope_v1();
 IF s->>'status'<>'GENERAL_INSTALL_OWNER_APPROVED_SOURCE_SCOPE'
   OR s->>'original_job_completed'<>'false'
 THEN RETURN jsonb_build_object('status','NO_CURRENT_FENCED_OWNER_DIAGNOSIS',
  'original_job_completed',false,'production_changed',false);END IF;
 SELECT * INTO v FROM reality_internal.governed_original_install_fenced_investigations_v1
 WHERE original_work_id=s->>'original_work_id'
  AND owner_id=(s->>'owner_id')::uuid
  AND shift_id=(s->>'shift_id')::uuid
  AND attempt_id=(s->>'attempt_id')::uuid
  AND approval_receipt_id=(s->>'approval_receipt_id')::uuid;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','NO_CURRENT_FENCED_OWNER_DIAGNOSIS',
   'original_job_completed',false,'production_changed',false);END IF;
 RETURN jsonb_build_object(
  'status',CASE WHEN v.state='ADVISORY_HYPOTHESIS_RECORDED'
    THEN 'FENCED_ORIGINAL_RILEY_DIAGNOSIS_PERSISTED_TEST_REQUIRED'
    WHEN v.state='MODEL_LEASED'
    THEN 'FENCED_ORIGINAL_DIAGNOSIS_LEASED_PROVIDER_PENDING'
    ELSE 'FENCED_ORIGINAL_MODEL_PROVIDER_UNCERTAIN' END,
  'original_work_id',v.original_work_id,
  'investigation_id',v.investigation_id,
  'model_response_id',v.model_response_id,
  'suspected_failure_stage',CASE WHEN v.state='ADVISORY_HYPOTHESIS_RECORDED'
    THEN left(v.suspected_failure_stage,1200) ELSE NULL END,
  'repair_proposal',CASE WHEN v.state='ADVISORY_HYPOTHESIS_RECORDED'
    THEN left(v.repair_proposal,2500) ELSE NULL END,
  'independent_test_plan',CASE WHEN v.state='ADVISORY_HYPOTHESIS_RECORDED'
    THEN left(v.independent_test_plan,2000) ELSE NULL END,
  'model_findings_are_hypotheses',true,
  'independently_tested',false,'external_retry_authorized',false,
  'original_job_completed',false,'production_changed',false,
  'next_gate','INDEPENDENT_TEST_SAME_ORIGINAL_REPAIR_BEFORE_RECOVERY_DECISION');
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_general_original_fenced_investigation_state_v1() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_general_original_fenced_investigation_state_v1() TO service_role;
