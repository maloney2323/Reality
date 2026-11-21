-- Repair signed recovery consent. An owner cannot call service-only graph validation;
-- verify the current exact shift with its original active warrant under SECURITY DEFINER.
-- Does NOT grant source installation or relax any one-use write fence.
CREATE OR REPLACE FUNCTION public.reality_owner_approve_general_original_recovery_v1(
 p_recovery_publication_id uuid,p_original_work_id text,p_attempt_id uuid,
 p_candidate_commit_sha text,p_artifact_sha256 text,p_expected_parent_sha text,
 p_intent text,p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v reality_internal.governed_original_recovery_publications_v1%rowtype;
 r reality_internal.governed_original_install_reviews_v1%rowtype;
 v_owner uuid:=auth.uid();v_shift_ok boolean:=false;
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
 -- SECURITY DEFINER executes as postgres. The service-only graph reader
 -- would reject the signed owner despite a valid Supabase Auth JWT.
 -- Validate the SAME owner+shift directly against its original ACTIVE
 -- completion warrant; never weaken the graph's service-role boundary.
 SELECT EXISTS(
  SELECT 1
  FROM reality_internal.governed_employee_shifts_v1 s
  JOIN reality_internal.governed_employee_completion_warrants_v1 w
   ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id
   AND w.plan_fingerprint=s.plan_fingerprint
  WHERE s.shift_id=v.shift_id AND s.owner_id=v_owner
   AND s.authorized_at IS NOT NULL AND s.closed_at IS NULL
   AND s.planned_start_at<=clock_timestamp()
   AND s.planned_end_at='infinity'::timestamptz
   AND s.status IN ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
   AND w.state='ACTIVE'
 ) INTO v_shift_ok;
 IF r.attempt_id IS NULL OR r.owner_id<>v_owner OR r.original_work_id<>v.original_work_id
  OR r.shift_id<>v.shift_id OR r.phase<>'INSTALL_INTENT_FENCED'
  OR r.approval_receipt_id<>v.original_approval_receipt_id
  OR r.candidate_artifact_sha256<>v.candidate_artifact_sha256
  OR r.installed_commit_sha IS NOT NULL OR r.original_final_receipt_id IS NOT NULL
  OR v_shift_ok IS DISTINCT FROM true
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

