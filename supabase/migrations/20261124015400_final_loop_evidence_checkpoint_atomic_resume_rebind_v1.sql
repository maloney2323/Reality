-- Reality's existing Final Loop receipt and event subscriptions advance one
-- CAS revision atomically after the independent shared Continuity/verifier guard.
-- Pending events block checkpoint to prevent discarding real evidence.
-- This does not grant execution, install, settle, or create new work.

CREATE OR REPLACE FUNCTION public.reality_record_final_loop_evidence_checkpoint_v1(p_shift_id uuid, p_original_work_id text, p_worker_run_id uuid, p_expected_revision bigint, p_expected_scope_sha256 text, p_expected_head_sha256 text, p_decision text, p_reason_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
 v_shift record;v_snapshot jsonb;v_job jsonb;v_run record;
 v_receipt uuid;v_hash text;v_body jsonb;v_result jsonb;
 v_shared jsonb;v_shared_job jsonb;
 v_subscriptions integer:=0;v_rebound integer:=0;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'FINAL_LOOP_CHECKPOINT_SERVICE_ONLY'; END IF;
 IF p_shift_id IS NULL OR p_original_work_id IS NULL OR
  p_original_work_id !~ '^work:[a-f0-9]{32}$' OR p_worker_run_id IS NULL OR
  p_expected_revision IS NULL OR p_expected_revision<1 OR
  coalesce(p_expected_scope_sha256,'') !~ '^sha256:[a-f0-9]{64}$' OR
  coalesce(p_expected_head_sha256,'') !~ '^sha256:[a-f0-9]{64}$' OR
  coalesce(p_decision,'') NOT IN ('REFRESH','SUSPEND','ADVANCE','RECOVER','SETTLE') OR
  coalesce(p_reason_code,'') NOT IN
   ('CANONICAL_ACCEPTANCE_PENDING','EPISTEMIC_PROOF_STALE',
    'AUTHORITY_NOT_VERIFIED','CAPACITY_NOT_VERIFIED',
    'PROVIDER_EFFECT_UNCERTAIN','BLOCKER_ATTESTATION_PENDING',
    'CONTINUITY_REOBSERVATION_REQUIRED') THEN
  RETURN jsonb_build_object('status','FINAL_LOOP_CHECKPOINT_INVALID_SCOPE',
   'transition_committed',false,'execution_authorized',false,
   'original_job_completed',false); END IF;
 -- Do not widen the granted shift into arbitrary execution/installation.
 IF p_decision NOT IN ('REFRESH','SUSPEND') THEN
  RETURN jsonb_build_object(
   'status','FINAL_LOOP_FOUR_PROOFS_AND_ATOMIC_EXECUTOR_CLAIM_REQUIRED',
   'transition_committed',false,'execution_authorized',false,
   'installation_authorized',false,'original_job_completed',false);
 END IF;
 SELECT s.shift_id,s.owner_id,s.plan_fingerprint
 INTO v_shift
 FROM reality_internal.governed_employee_shifts_v1 s
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
  ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id
  AND w.plan_fingerprint=s.plan_fingerprint
 WHERE s.shift_id=p_shift_id AND s.authorized_at IS NOT NULL
  AND s.closed_at IS NULL AND s.planned_end_at='infinity'::timestamptz
  AND s.status IN ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  AND w.state='ACTIVE' FOR UPDATE OF s;
 IF NOT FOUND THEN
  RETURN jsonb_build_object('status','FINAL_LOOP_ORIGINAL_SHIFT_NOT_CURRENT',
   'transition_committed',false,'original_job_completed',false);
 END IF;
 SELECT r.run_id,r.status,r.started_at INTO v_run
 FROM reality_internal.signed_worker_actual_runs_v1 r
 WHERE r.run_id=p_worker_run_id AND r.status='STARTED' AND r.finished_at IS NULL
  AND r.started_at>=pg_catalog.clock_timestamp()-interval '10 minutes';
 IF NOT FOUND THEN
  RETURN jsonb_build_object('status','FINAL_LOOP_SIGNED_WORKER_RUN_REQUIRED',
   'transition_committed',false,'original_job_completed',false);
 END IF;
 v_snapshot:=public.reality_read_current_final_loop_proof_envelope_v1(
  p_shift_id);
 IF v_snapshot->>'status' <>
  'FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING' OR
  v_snapshot->>'frozen_shift_scope_sha256'<>p_expected_scope_sha256 OR
  v_snapshot->>'continuity_head_sha256'<>p_expected_head_sha256 OR
  (v_snapshot->>'revision')::bigint<>p_expected_revision THEN
  RETURN jsonb_build_object(
   'status','FINAL_LOOP_CAUSAL_HEAD_OR_SCOPE_DRIFT_NO_REPLAY',
   'transition_committed',false,'original_job_completed',false);
 END IF;
 SELECT j.value INTO v_job FROM
  jsonb_array_elements(v_snapshot->'jobs') j(value)
 WHERE j.value->>'original_work_id'=p_original_work_id
  AND j.value->>'independent_source_proof_verified'='true';
 IF NOT FOUND OR v_job->>'source_ref' IS NULL THEN
  RETURN jsonb_build_object(
   'status','FINAL_LOOP_CANONICAL_ORIGINAL_NOT_ADMITTED',
   'transition_committed',false,'original_job_completed',false);
 END IF;

 -- One shared, read-only guard must resolve the EXACT original, current
 -- ledger head and independently checked qualifier before any checkpoint.
 -- It never grants execution, approval, installation, or settlement.
 v_shared:=public.reality_read_final_loop_shared_continuity_guard_v1(p_shift_id);
 IF v_shared->>'status'<>'FINAL_LOOP_SHARED_CONTINUITY_CHECKED'
   OR v_shared->>'owner_id'<>v_shift.owner_id::text
   OR v_shared->>'shift_id'<>p_shift_id::text
   OR v_shared->>'continuity_root_id'<>v_snapshot->>'continuity_root_id'
   OR v_shared->>'continuity_head_sha256'<>p_expected_head_sha256
   OR v_shared->>'frozen_shift_scope_sha256'<>p_expected_scope_sha256
   OR (v_shared->>'revision')::bigint<>p_expected_revision
   OR v_shared->>'execution_authorized'<>'false'
   OR v_shared->>'transition_committed'<>'false'
   OR v_shared->>'installation_authorized'<>'false'
   OR v_shared->>'original_job_completed'<>'false'
 THEN RETURN jsonb_build_object(
   'status','FINAL_LOOP_SHARED_CONTINUITY_HEAD_OR_SCOPE_UNVERIFIED_NO_EFFECT',
   'transition_committed',false,'execution_authorized',false,
   'original_job_completed',false);END IF;
 SELECT value INTO v_shared_job FROM
   pg_catalog.jsonb_array_elements(v_shared->'obligations') ob(value)
 WHERE ob.value->>'original_work_id'=p_original_work_id
   AND ob.value->>'source_ref'=v_job->>'source_ref';
 IF NOT FOUND OR v_shared_job->>'source_proof_verified'<>'true'
   OR v_shared_job->>'qualifier_digest_verified'<>'true'
   OR v_shared_job->>'continuity_identity_verified'<>'true'
   OR v_shared_job->>'execution_permitted_by_handoff'<>'false'
 THEN RETURN jsonb_build_object(
   'status','FINAL_LOOP_SHARED_CONTINUITY_PROOF_OR_IDENTITY_GAP_NO_EFFECT',
   'transition_committed',false,'execution_authorized',false,
   'original_job_completed',false);END IF;


 -- Event subscriptions carry this same global CAS revision and root head.
 -- A REFRESH checkpoint must not strand them at the previous revision or
 -- silently discard independent evidence. If an event already exists, the
 -- event-specific governed reconciler must handle it first: no replay here.
 IF EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1 e
   WHERE e.shift_id=p_shift_id AND e.owner_id=v_shift.owner_id)
 OR EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_conditions_v1 s
   WHERE s.shift_id=p_shift_id AND s.owner_id=v_shift.owner_id AND
    (s.continuity_revision<>p_expected_revision OR
     s.continuity_head_sha256<>p_expected_head_sha256 OR
     s.state<>'SUSPENDED' OR
     NOT EXISTS(
      SELECT 1 FROM pg_catalog.jsonb_array_elements(
       coalesce(v_snapshot->'governed_qualification_handoffs','[]'::jsonb)) h
      WHERE h.value->>'original_work_id'=s.original_work_id
        AND h.value->>'source_ref'=s.source_ref
        AND h.value->>'qualifier_receipt_sha256'=s.subscribed_receipt_sha256
        AND h.value->>'independent_source_proof_verified'='true'
     ))) THEN
  RETURN jsonb_build_object(
   'status','FINAL_LOOP_EVENT_SUBSCRIPTION_CAUSAL_RECONCILIATION_REQUIRED',
   'transition_committed',false,'execution_authorized',false,
   'original_job_completed',false);
 END IF;
 SELECT count(*) INTO v_subscriptions
 FROM reality_internal.final_loop_resume_conditions_v1 s
 WHERE s.shift_id=p_shift_id AND s.owner_id=v_shift.owner_id;

 v_body:=jsonb_build_object(
  'shift_id',p_shift_id,'owner_id',v_shift.owner_id,
  'original_work_id',p_original_work_id,
  'source_ref',v_job->>'source_ref',
  'plan_fingerprint',v_shift.plan_fingerprint,
  'frozen_shift_scope_sha256',p_expected_scope_sha256,
  'continuity_root_id',v_snapshot->>'continuity_root_id',
  'continuity_head_sha256',p_expected_head_sha256,
  'expected_revision',p_expected_revision,
  'worker_run_id',p_worker_run_id,'decision',p_decision,
  'reason_code',p_reason_code);
 v_hash:='sha256:'||pg_catalog.encode(
  pg_catalog.sha256(pg_catalog.convert_to(v_body::text,'UTF8')),'hex');
 INSERT INTO reality_internal.final_loop_transition_receipts_v1
  (shift_id,owner_id,original_work_id,source_ref,plan_fingerprint,
   frozen_shift_scope_sha256,continuity_root_id,
   continuity_head_sha256,expected_revision,worker_run_id,
   decision,reason_code,receipt_sha256)
 VALUES(p_shift_id,v_shift.owner_id,p_original_work_id,
  v_job->>'source_ref',v_shift.plan_fingerprint,
  p_expected_scope_sha256,(v_snapshot->>'continuity_root_id')::uuid,
  p_expected_head_sha256,p_expected_revision,p_worker_run_id,
  p_decision,p_reason_code,v_hash)
 ON CONFLICT DO NOTHING RETURNING receipt_id INTO v_receipt;
 IF v_receipt IS NULL THEN
  RETURN jsonb_build_object('status','FINAL_LOOP_EXISTING_CHECKPOINT_NO_REPLAY',
   'transition_committed',false,'original_job_completed',false);
 END IF;
 -- Atomically bind ALL existing suspended subscriptions to the newly
 -- durable global revision; current signed source/receipt identity is
 -- checked above. No new subscribed event, wake, approval or effect.
 UPDATE reality_internal.final_loop_resume_conditions_v1 s
 SET continuity_revision=p_expected_revision+1,
     updated_at=pg_catalog.clock_timestamp()
 WHERE s.shift_id=p_shift_id AND s.owner_id=v_shift.owner_id
   AND s.continuity_revision=p_expected_revision
   AND s.continuity_head_sha256=p_expected_head_sha256
   AND s.state='SUSPENDED';
 GET DIAGNOSTICS v_rebound=ROW_COUNT;
 IF v_rebound<>v_subscriptions THEN
  RAISE EXCEPTION 'FINAL_LOOP_ATOMIC_SUBSCRIPTION_REVISION_REBIND_FAILED';
 END IF;
 RETURN jsonb_build_object(
  'schema','reality-final-loop-evidence-checkpoint-v1',
  'status','FINAL_LOOP_EVIDENCE_ONLY_CHECKPOINT_DURABLY_RECORDED',
  'receipt_id',v_receipt,'receipt_sha256',v_hash,
  'shift_id',p_shift_id,'original_work_id',p_original_work_id,
  'decision',p_decision,'reason_code',p_reason_code,
  'evidence_only',true,'transition_committed',true,
  'event_subscriptions_rebound_to_next_revision',v_rebound,
  'next_continuity_revision',p_expected_revision+1,
  'shared_continuity_guard_verified',true,
  'shared_continuity_observation_sha256',
    v_shared->>'handoff_observation_sha256',
  'executor_invoked',false,'execution_authorized',false,
  'repair_executed',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false,
  'new_shift_started',false);
END $function$;

REVOKE ALL ON FUNCTION public.reality_record_final_loop_evidence_checkpoint_v1(uuid,text,uuid,bigint,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_final_loop_evidence_checkpoint_v1(uuid,text,uuid,bigint,text,text,text,text) TO service_role;
