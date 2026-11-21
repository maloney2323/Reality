-- Signed Reality worker -> exact owner work-scope decision -> same-shift recheck.
-- This is NOT a code installation or a modification of the frozen shift warrant.
CREATE TABLE IF NOT EXISTS reality_internal.owner_repair_scope_handoffs_v1 (
 handoff_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL,
 shift_id uuid NOT NULL,
 worker_run_id uuid NOT NULL,
 source_ref text NOT NULL,
 source_file text NOT NULL,
 candidate_commit_sha text NOT NULL,
 current_blob_sha text NOT NULL,
 candidate_blob_sha text NOT NULL,
 baseline_run_id bigint NOT NULL,
 green_run_id bigint NOT NULL,
 frozen_test_sha256 text NOT NULL,
 work_order_fingerprint text NOT NULL,
 state text NOT NULL DEFAULT 'PREPARED'
  CHECK (state IN ('PREPARED','APPROVED','SOURCE_RECHECKED')),
 approval_request_id uuid UNIQUE,
 approval_receipt_sha256 text,
 approved_at timestamptz,
 continued_worker_run_id uuid,
 continued_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (owner_id,shift_id,source_ref,candidate_commit_sha)
);
REVOKE ALL ON reality_internal.owner_repair_scope_handoffs_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON reality_internal.owner_repair_scope_handoffs_v1 TO service_role;
CREATE INDEX IF NOT EXISTS idx_repair_scope_owner_v1
 ON reality_internal.owner_repair_scope_handoffs_v1(owner_id,created_at DESC);

CREATE OR REPLACE FUNCTION public.reality_stage_signed_repair_scope_handoff_v1(
 p_owner_id uuid,p_shift_id uuid,p_worker_run_id uuid,
 p_source_ref text,p_candidate_commit_sha text,p_current_blob_sha text,
 p_candidate_blob_sha text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
DECLARE v_p reality_internal.market_independent_repair_proofs_v1%rowtype;
 v_shift reality_internal.governed_employee_shifts_v1%rowtype;
 v_id uuid;v_fp text;v_actual reality_internal.owner_repair_scope_handoffs_v1%rowtype;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'REPAIR_SCOPE_SERVICE_ROLE_ONLY';END IF;
 IF p_owner_id IS NULL OR p_shift_id IS NULL OR p_worker_run_id IS NULL
  OR p_source_ref !~ '^https://github[.]com/maloney2323/Reality/pull/[1-9][0-9]*$'
  OR p_candidate_commit_sha !~ '^[a-f0-9]{40}$'
  OR p_current_blob_sha !~ '^[a-f0-9]{40}$'
  OR p_candidate_blob_sha !~ '^[a-f0-9]{40}$'
  OR p_candidate_blob_sha=p_current_blob_sha THEN
  RAISE EXCEPTION 'REPAIR_SCOPE_EXACT_SOURCE_REQUIRED';END IF;
 SELECT * INTO v_shift FROM reality_internal.governed_employee_shifts_v1
  WHERE shift_id=p_shift_id AND owner_id=p_owner_id
  AND status IN ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  AND authorized_at IS NOT NULL AND closed_at IS NULL
  AND planned_end_at='infinity'::timestamptz;
 IF NOT FOUND OR NOT EXISTS(
  SELECT 1 FROM reality_internal.governed_employee_completion_warrants_v1 w
  WHERE w.shift_id=p_shift_id AND w.owner_id=p_owner_id AND w.state='ACTIVE'
   AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
 ) OR NOT EXISTS(
  SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 r
   WHERE r.run_id=p_worker_run_id AND r.status='STARTED'
    AND r.started_at>now()-interval '120 seconds'
 ) THEN RAISE EXCEPTION 'REPAIR_SCOPE_SIGNED_ACTIVE_SHIFT_WORKER_REQUIRED';END IF;
 IF EXISTS(SELECT 1 FROM reality_internal.governed_employee_shift_steps_v1 t
  WHERE t.shift_id=p_shift_id AND t.source_ref=p_source_ref) THEN
  RAISE EXCEPTION 'REPAIR_SCOPE_ALREADY_IN_FROZEN_WARRANT';END IF;
 SELECT p.* INTO v_p FROM reality_internal.market_independent_repair_proofs_v1 p
 JOIN reality_internal.market_stage_investigations_v1 i
 ON i.owner_id=p.owner_id AND i.receipt_id=p.market_receipt_id
  AND i.finding_fingerprint=p.finding_fingerprint
  AND i.report_sha256=p.original_report_sha256
 WHERE p.owner_id=p_owner_id
 AND ('https://github.com/maloney2323/Reality/pull/'||p.pull_request_number)=p_source_ref
 AND p.repair_commit_sha=p_candidate_commit_sha
 AND p.status='FROZEN_RED_TO_GREEN_CANDIDATE_VERIFIED'
 AND p.proof_kind='EXISTING_CAPABILITY_IMPLEMENTATION_DEFECT'
 AND p.baseline_run_id>0 AND p.green_run_id>0
 AND p.independent_red_assertion_failures>0
 AND p.independent_green_assertion_passes>0
 AND p.frozen_test_sha256 ~ '^[a-f0-9]{64}$'
 AND p.owner_install_authorized=false AND p.fresh_original_work_verified=false
 AND p.installed=false AND p.production_changed=false
 AND i.stage_repair_verified=true AND i.owner_install_authorized=false
 AND i.production_changed=false
 ORDER BY p.observed_at DESC LIMIT 1;
 IF NOT FOUND THEN RAISE EXCEPTION 'REPAIR_SCOPE_RESEARCH_PROOF_UNVERIFIED';END IF;
 v_fp='sha256:'||encode(extensions.digest(
  p_owner_id::text||'|'||p_shift_id::text||'|'||p_source_ref||'|'||
  v_p.source_file||'|'||p_candidate_commit_sha||'|'||
  p_current_blob_sha||'|'||p_candidate_blob_sha||'|'||
  v_p.frozen_test_sha256||'|'||v_p.baseline_run_id||'|'||v_p.green_run_id,'sha256'),'hex');
 INSERT INTO reality_internal.owner_repair_scope_handoffs_v1(
  owner_id,shift_id,worker_run_id,source_ref,source_file,
  candidate_commit_sha,current_blob_sha,candidate_blob_sha,
  baseline_run_id,green_run_id,frozen_test_sha256,work_order_fingerprint)
 VALUES(p_owner_id,p_shift_id,p_worker_run_id,p_source_ref,v_p.source_file,
  p_candidate_commit_sha,p_current_blob_sha,p_candidate_blob_sha,
  v_p.baseline_run_id,v_p.green_run_id,v_p.frozen_test_sha256,v_fp)
 ON CONFLICT(owner_id,shift_id,source_ref,candidate_commit_sha) DO NOTHING;
 SELECT * INTO v_actual FROM reality_internal.owner_repair_scope_handoffs_v1
 WHERE owner_id=p_owner_id AND shift_id=p_shift_id
 AND source_ref=p_source_ref AND candidate_commit_sha=p_candidate_commit_sha;
 IF v_actual.work_order_fingerprint<>v_fp THEN
  RETURN jsonb_build_object('status','EXACT_SOURCE_CHANGED_NEW_INDEPENDENT_REVIEW_REQUIRED',
    'installation_authorized',false,'production_changed',false);
 END IF;
 RETURN jsonb_build_object('status','SIGNED_REPAIR_OWNER_WORK_SCOPE_HANDOFF_DURABLE',
  'handoff_id',v_actual.handoff_id,'owner_id',p_owner_id,
  'shift_id',p_shift_id,'source_ref',p_source_ref,
  'work_order_fingerprint',v_actual.work_order_fingerprint,
  'state',v_actual.state,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false,
  'new_shift_started',false);
END $$;

CREATE OR REPLACE FUNCTION public.reality_read_owner_repair_scope_decision_v1(p_owner_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
DECLARE v reality_internal.owner_repair_scope_handoffs_v1%rowtype;
BEGIN
 IF current_user<>'service_role' OR p_owner_id IS NULL THEN
  RAISE EXCEPTION 'REPAIR_SCOPE_OWNER_SERVICE_REQUIRED';END IF;
 SELECT h.* INTO v FROM reality_internal.owner_repair_scope_handoffs_v1 h
 JOIN reality_internal.governed_employee_shifts_v1 s
  ON s.shift_id=h.shift_id AND s.owner_id=h.owner_id
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
  ON w.shift_id=h.shift_id AND w.owner_id=h.owner_id
 WHERE h.owner_id=p_owner_id AND s.closed_at IS NULL
 AND s.status IN ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
 AND w.state='ACTIVE' AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
 ORDER BY h.created_at DESC LIMIT 1;
 IF NOT FOUND THEN RETURN jsonb_build_object(
   'status','NO_SIGNED_REPAIR_WORK_SCOPE_DECISION',
   'owner_approval_ready',false,'installation_authorized',false,
   'production_changed',false);END IF;
 RETURN jsonb_build_object(
  'status',CASE WHEN v.state='PREPARED' THEN
   'EXACT_OWNER_REPAIR_WORK_SCOPE_APPROVAL_READY'
   ELSE 'EXACT_OWNER_REPAIR_WORK_SCOPE_DECISION_RECORDED' END,
  'handoff_id',v.handoff_id,'owner_id',v.owner_id,'shift_id',v.shift_id,
  'source_ref',v.source_ref,'source_file',v.source_file,
  'candidate_commit_sha',v.candidate_commit_sha,
  'current_blob_sha',v.current_blob_sha,'candidate_blob_sha',v.candidate_blob_sha,
  'baseline_run_id',v.baseline_run_id,'green_run_id',v.green_run_id,
  'frozen_test_sha256',v.frozen_test_sha256,
  'work_order_fingerprint',v.work_order_fingerprint,
  'owner_approval_ready',v.state='PREPARED','owner_work_scope_approved',
   v.state<>'PREPARED',
  'approved_at',v.approved_at,'approval_receipt_sha256',v.approval_receipt_sha256,
  'continuation_state',v.state,'continued_at',v.continued_at,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false,'read_only',true);
END $$;

CREATE OR REPLACE FUNCTION public.reality_record_owner_repair_scope_decision_v1(
 p_owner_id uuid,p_shift_id uuid,p_handoff_id uuid,p_request_id uuid,
 p_work_order_fingerprint text,p_intent text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
DECLARE v reality_internal.owner_repair_scope_handoffs_v1%rowtype;v_receipt text;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'REPAIR_SCOPE_SERVICE_ONLY';END IF;
 IF p_owner_id IS NULL OR p_shift_id IS NULL OR p_handoff_id IS NULL
  OR p_request_id IS NULL
  OR p_work_order_fingerprint !~ '^sha256:[a-f0-9]{64}$'
  OR p_intent<>'OWNER_APPROVE_EXACT_REPAIR_INVESTIGATION_AND_INDEPENDENT_TESTING' THEN
  RAISE EXCEPTION 'REPAIR_SCOPE_EXACT_OWNER_CLICK_REQUIRED';END IF;
 SELECT h.* INTO v FROM reality_internal.owner_repair_scope_handoffs_v1 h
 JOIN reality_internal.governed_employee_shifts_v1 s
  ON s.shift_id=h.shift_id AND s.owner_id=h.owner_id
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
  ON w.shift_id=h.shift_id AND w.owner_id=h.owner_id
 WHERE h.owner_id=p_owner_id AND h.shift_id=p_shift_id
 AND h.handoff_id=p_handoff_id
 AND h.work_order_fingerprint=p_work_order_fingerprint
 AND s.closed_at IS NULL AND s.authorized_at IS NOT NULL
 AND s.status IN ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
 AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
 AND w.state='ACTIVE'
 FOR UPDATE OF h;
 IF NOT FOUND THEN RAISE EXCEPTION 'REPAIR_SCOPE_SHIFT_OR_SOURCE_CHANGED';END IF;
 IF v.state<>'PREPARED' THEN
  RETURN jsonb_build_object('status','OWNER_REPAIR_WORK_SCOPE_ALREADY_DECIDED_NO_REPLAY',
   'handoff_id',v.handoff_id,'owner_id',v.owner_id,'shift_id',v.shift_id,
   'approval_receipt_sha256',v.approval_receipt_sha256,
   'installation_authorized',false,'original_job_completed',false,
   'production_changed',false);END IF;
 IF v.created_at<now()-interval '60 minutes' THEN
  RAISE EXCEPTION 'REPAIR_SCOPE_FRESH_SIGNED_DECISION_REQUIRED';END IF;
 IF EXISTS(SELECT 1 FROM reality_internal.governed_employee_shift_steps_v1 t
  WHERE t.shift_id=v.shift_id AND t.source_ref=v.source_ref) THEN
  RAISE EXCEPTION 'REPAIR_SCOPE_ORIGINAL_WARRANT_CONTRADICTION';END IF;
 IF NOT EXISTS(
 SELECT 1 FROM reality_internal.market_independent_repair_proofs_v1 p
 WHERE p.owner_id=v.owner_id AND p.repair_commit_sha=v.candidate_commit_sha
 AND ('https://github.com/maloney2323/Reality/pull/'||p.pull_request_number)=v.source_ref
 AND p.status='FROZEN_RED_TO_GREEN_CANDIDATE_VERIFIED'
 AND p.owner_install_authorized=false AND p.installed=false
 AND p.production_changed=false
 ) THEN RAISE EXCEPTION 'REPAIR_SCOPE_SOURCE_PROOF_CHANGED';END IF;
 v_receipt='sha256:'||encode(extensions.digest(
  v.work_order_fingerprint||'|'||p_request_id||'|'||p_intent,'sha256'),'hex');
 UPDATE reality_internal.owner_repair_scope_handoffs_v1 SET
  state='APPROVED',approval_request_id=p_request_id,
  approval_receipt_sha256=v_receipt,approved_at=now(),updated_at=now()
 WHERE handoff_id=v.handoff_id AND state='PREPARED';
 RETURN jsonb_build_object('status','EXACT_OWNER_REPAIR_WORK_SCOPE_APPROVED',
  'handoff_id',v.handoff_id,'owner_id',v.owner_id,'shift_id',v.shift_id,
  'source_ref',v.source_ref,'approval_receipt_sha256',v_receipt,
  'scope_approval_recorded',true,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false,
  'new_shift_started',false,
  'next_action','CONTINUE_SAME_SHIFT_FRESH_SOURCE_RECHECK_AND_INDEPENDENT_TEST');
END $$;

CREATE OR REPLACE FUNCTION public.reality_read_signed_approved_repair_scope_v1(p_shift_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
DECLARE v reality_internal.owner_repair_scope_handoffs_v1%rowtype;
BEGIN
 IF current_user<>'service_role' OR p_shift_id IS NULL THEN
  RAISE EXCEPTION 'REPAIR_SCOPE_WORKER_SERVICE_REQUIRED';END IF;
 SELECT h.* INTO v FROM reality_internal.owner_repair_scope_handoffs_v1 h
 JOIN reality_internal.governed_employee_shifts_v1 s
  ON s.shift_id=h.shift_id AND s.owner_id=h.owner_id
 WHERE h.shift_id=p_shift_id AND h.state IN ('APPROVED','SOURCE_RECHECKED')
 AND h.approval_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
 AND s.status IN ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
 AND s.closed_at IS NULL
 ORDER BY h.approved_at DESC LIMIT 1;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','NO_APPROVED_EXACT_REPAIR_SCOPE',
  'installation_authorized',false,'production_changed',false);END IF;
 RETURN jsonb_build_object(
  'status','APPROVED_EXACT_REPAIR_SCOPE_AWAITING_INDEPENDENT_WORK',
  'handoff_id',v.handoff_id,'owner_id',v.owner_id,'shift_id',v.shift_id,
  'source_ref',v.source_ref,'candidate_commit_sha',v.candidate_commit_sha,
  'current_blob_sha',v.current_blob_sha,'candidate_blob_sha',v.candidate_blob_sha,
  'work_order_fingerprint',v.work_order_fingerprint,
  'approval_receipt_sha256',v.approval_receipt_sha256,
  'continuation_state',v.state,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);
END $$;

CREATE OR REPLACE FUNCTION public.reality_record_signed_repair_scope_continuation_v1(
 p_shift_id uuid,p_worker_run_id uuid,p_handoff_id uuid,
 p_work_order_fingerprint text,p_current_blob_sha text,p_candidate_blob_sha text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
DECLARE v reality_internal.owner_repair_scope_handoffs_v1%rowtype;
BEGIN
 IF current_user<>'service_role' OR p_shift_id IS NULL OR p_worker_run_id IS NULL
  OR p_handoff_id IS NULL THEN RAISE EXCEPTION 'REPAIR_SCOPE_CONTINUATION_SERVICE_REQUIRED';END IF;
 SELECT h.* INTO v FROM reality_internal.owner_repair_scope_handoffs_v1 h
 JOIN reality_internal.governed_employee_shifts_v1 s
 ON s.shift_id=h.shift_id AND s.owner_id=h.owner_id
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
 ON w.shift_id=h.shift_id AND w.owner_id=h.owner_id
 WHERE h.handoff_id=p_handoff_id AND h.shift_id=p_shift_id
 AND h.state IN ('APPROVED','SOURCE_RECHECKED')
 AND h.work_order_fingerprint=p_work_order_fingerprint
 AND h.current_blob_sha=p_current_blob_sha
 AND h.candidate_blob_sha=p_candidate_blob_sha
 AND h.approval_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
 AND s.closed_at IS NULL AND w.state='ACTIVE'
 AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
 FOR UPDATE OF h;
 IF NOT FOUND THEN RAISE EXCEPTION 'REPAIR_SCOPE_CONTINUATION_EXACT_APPROVAL_REQUIRED';END IF;
 IF NOT EXISTS(SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 r
  WHERE r.run_id=p_worker_run_id AND r.status='STARTED'
  AND r.started_at>now()-interval '120 seconds') THEN
  RAISE EXCEPTION 'REPAIR_SCOPE_CONTINUATION_SIGNED_WORKER_REQUIRED';END IF;
 IF v.state='APPROVED' THEN
  UPDATE reality_internal.owner_repair_scope_handoffs_v1
  SET state='SOURCE_RECHECKED',continued_worker_run_id=p_worker_run_id,
   continued_at=now(),updated_at=now()
  WHERE handoff_id=v.handoff_id AND state='APPROVED';
 END IF;
 RETURN jsonb_build_object('status','EXACT_OWNER_REPAIR_SOURCE_RECHECKED_SAME_SHIFT',
  'handoff_id',v.handoff_id,'shift_id',v.shift_id,
  'approval_receipt_sha256',v.approval_receipt_sha256,
  'next_action','RUN_NEW_INDEPENDENT_FROZEN_TESTS_BEFORE_INSTALL_REVIEW',
  'independent_frozen_tests_rerun',false,'original_job_completed',false,
  'installation_authorized',false,'production_changed',false,
  'new_shift_started',false);
END $$;

REVOKE ALL ON FUNCTION public.reality_stage_signed_repair_scope_handoff_v1(uuid,uuid,uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.reality_read_owner_repair_scope_decision_v1(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.reality_record_owner_repair_scope_decision_v1(uuid,uuid,uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.reality_read_signed_approved_repair_scope_v1(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.reality_record_signed_repair_scope_continuation_v1(uuid,uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_stage_signed_repair_scope_handoff_v1(uuid,uuid,uuid,text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reality_read_owner_repair_scope_decision_v1(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reality_record_owner_repair_scope_decision_v1(uuid,uuid,uuid,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reality_read_signed_approved_repair_scope_v1(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reality_record_signed_repair_scope_continuation_v1(uuid,uuid,uuid,text,text,text) TO service_role;
