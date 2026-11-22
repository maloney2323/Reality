-- Reality Final Loop Engine v1: service-only canonical scope readback and
-- evidence-only atomic checkpoint. Draft installation artifact for isolated
-- review. THIS FILE MUST NOT BE RUN AGAINST PRODUCTION.
--
-- A shift completion warrant is not an independently accepted customer
-- original. Until the actual frozen original-goal acceptance and four proof
-- gates are bound from independently checked provider records, only REFRESH
-- and SUSPEND diagnostics can be recorded. No new job, owner permission,
-- execution, installation, settlement, or Universe outcome may be minted.
--
-- One durable control receipt per original/continuity head/decision prevents
-- replay of the same blocker. This is NOT a second original-job ledger.
CREATE TABLE IF NOT EXISTS reality_internal.final_loop_transition_receipts_v1 (
 receipt_id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
 shift_id uuid NOT NULL,
 owner_id uuid NOT NULL,
 original_work_id text NOT NULL CHECK
  (original_work_id ~ '^work:[a-f0-9]{32}$'),
 source_ref text NOT NULL,
 plan_fingerprint text NOT NULL CHECK
  (plan_fingerprint ~ '^sha256:[a-f0-9]{64}$'),
 frozen_shift_scope_sha256 text NOT NULL CHECK
  (frozen_shift_scope_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 continuity_root_id uuid NOT NULL,
 continuity_head_sha256 text NOT NULL CHECK
  (continuity_head_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 expected_revision bigint NOT NULL CHECK(expected_revision>=1),
 worker_run_id uuid NOT NULL,
 decision text NOT NULL CHECK(decision IN ('REFRESH','SUSPEND')),
 reason_code text NOT NULL CHECK(reason_code IN
  ('CANONICAL_ACCEPTANCE_PENDING','EPISTEMIC_PROOF_STALE',
   'AUTHORITY_NOT_VERIFIED','CAPACITY_NOT_VERIFIED',
   'PROVIDER_EFFECT_UNCERTAIN','BLOCKER_ATTESTATION_PENDING',
   'CONTINUITY_REOBSERVATION_REQUIRED')),
 receipt_sha256 text NOT NULL CHECK
  (receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 recorded_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 UNIQUE(shift_id,original_work_id,expected_revision),
 UNIQUE(shift_id,original_work_id,continuity_head_sha256,decision)
);
ALTER TABLE reality_internal.final_loop_transition_receipts_v1
 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE reality_internal.final_loop_transition_receipts_v1
 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON TABLE reality_internal.final_loop_transition_receipts_v1
 TO service_role;

-- Native active shift + frozen warrant + independently recorded Universe
-- lineage. This is an evidence readback, not original goal acceptance.
CREATE OR REPLACE FUNCTION
 public.reality_read_current_final_loop_proof_envelope_v1(p_shift_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE
 v_shift record;v_graph jsonb;v_events integer;v_roots integer;
 v_root uuid;v_head text;v_rev bigint;v_scope_hash text;
 v_jobs jsonb:='[]'::jsonb;
BEGIN
 IF current_user <> 'service_role' THEN
  RAISE EXCEPTION 'FINAL_LOOP_CANONICAL_READER_SERVICE_ONLY'; END IF;
 IF p_shift_id IS NULL THEN
  RETURN jsonb_build_object('status','FINAL_LOOP_EXACT_SHIFT_REQUIRED',
   'read_only',true,'original_job_completed',false); END IF;
 SELECT s.shift_id,s.owner_id,s.plan_fingerprint,w.mode,w.source_scope
 INTO v_shift
 FROM reality_internal.governed_employee_shifts_v1 s
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
 ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id
  AND w.plan_fingerprint=s.plan_fingerprint
 WHERE s.shift_id=p_shift_id AND s.authorized_at IS NOT NULL
  AND s.closed_at IS NULL AND s.planned_start_at<=pg_catalog.clock_timestamp()
  AND s.planned_end_at='infinity'::timestamptz
  AND s.status IN ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  AND w.state='ACTIVE' AND w.authorized_at IS NOT NULL;
 IF NOT FOUND THEN
  RETURN jsonb_build_object('status','FINAL_LOOP_NO_ACTIVE_AUTHORIZED_SHIFT',
   'shift_id',p_shift_id,'read_only',true,
   'execution_authorized',false,'original_job_completed',false,
   'installation_authorized',false,'production_changed',false);
 END IF;
 -- Reuse the real source-graph RPC. It already checks the frozen
 -- shift-source warrant and joins each admitted original by source proof.
 v_graph:=public.reality_read_owner_shift_execution_graph_v1(
  v_shift.owner_id,v_shift.shift_id);
 IF v_graph->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'
  OR v_graph->>'owner_id'<>v_shift.owner_id::text
  OR v_graph->>'shift_id'<>v_shift.shift_id::text
  OR v_graph->>'plan_fingerprint'<>v_shift.plan_fingerprint
  OR jsonb_typeof(v_graph->'jobs')<>'array' THEN
  RAISE EXCEPTION 'FINAL_LOOP_NATIVE_OWNER_GRAPH_MISMATCH'; END IF;
 -- All events for the exact shift and owner must agree on one Continuity
 -- root. A hash is an integrity locator, NOT independent factual proof.
 SELECT count(*),count(DISTINCT e.continuity_root_id)
 INTO v_events,v_roots
 FROM public.universe_events e
 WHERE e.payload->>'owner_id'=v_shift.owner_id::text
  AND e.payload->>'shift_id'=v_shift.shift_id::text
  AND e.continuity_root_id IS NOT NULL;
 IF v_events<1 OR v_roots<>1 THEN
  RETURN jsonb_build_object('status','FINAL_LOOP_CONTINUITY_ROOT_AMBIGUOUS',
   'owner_id',v_shift.owner_id,'shift_id',v_shift.shift_id,
   'read_only',true,'execution_authorized',false,
   'original_job_completed',false); END IF;
 SELECT e.continuity_root_id,e.lineage_hash INTO v_root,v_head
 FROM public.universe_events e
 WHERE e.payload->>'owner_id'=v_shift.owner_id::text
  AND e.payload->>'shift_id'=v_shift.shift_id::text
  AND e.continuity_root_id IS NOT NULL
 ORDER BY e.assertion_time DESC,e.event_id DESC LIMIT 1;
 IF v_head IS NULL OR v_head !~ '^[a-f0-9]{64}$' THEN
  RAISE EXCEPTION 'FINAL_LOOP_CONTINUITY_LINEAGE_HASH_UNVERIFIED'; END IF;
 v_scope_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(jsonb_build_object(
   'shift_id',v_shift.shift_id,'owner_id',v_shift.owner_id,
   'plan_fingerprint',v_shift.plan_fingerprint,
   'mode',v_shift.mode,'source_scope',v_shift.source_scope
  )::text,'UTF8')),'hex');
 SELECT count(*)+1 INTO v_rev
 FROM reality_internal.final_loop_transition_receipts_v1 t
 WHERE t.shift_id=v_shift.shift_id AND t.owner_id=v_shift.owner_id;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'source_ref',j.value->>'source_ref',
  'original_work_id',j.value->>'original_work_id',
  'original_kind',j.value->>'original_kind',
  'source_proof_sha256',j.value->>'source_proof_sha256',
  'independent_source_proof_verified',
   j.value->>'independent_source_proof_verified'='true',
  'original_acceptance_verified',false,
  'authority_proof_verified',false,
  'capacity_proof_verified',false,
  'final_outcome_verified',false,
  'settlement_eligible',false,
  'evidence_checkpoint_recorded_on_head',EXISTS(
   SELECT 1 FROM reality_internal.final_loop_transition_receipts_v1 t
   WHERE t.shift_id=v_shift.shift_id
    AND t.owner_id=v_shift.owner_id
    AND t.original_work_id=j.value->>'original_work_id'
    AND t.continuity_head_sha256='sha256:'||v_head
    AND t.decision='REFRESH')
 ) ORDER BY (j.value->>'source_step_index')::integer),'[]'::jsonb)
 INTO v_jobs FROM jsonb_array_elements(v_graph->'jobs') j(value);
 -- IMPORTANT: No existing document reviewed here proves the frozen
 -- customer-original acceptance contract and four proofs as a whole.
 -- The engine must not convert the shift's warrant/scope hash into an
 -- acceptance_contract_sha256 or owner-acceptance=true.
 RETURN jsonb_build_object(
  'schema','reality-final-loop-canonical-proof-readback-v1',
  'status','FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING',
  'owner_id',v_shift.owner_id,'shift_id',v_shift.shift_id,
  'plan_fingerprint',v_shift.plan_fingerprint,
  'frozen_shift_scope_sha256',v_scope_hash,
  'continuity_root_id',v_root,
  'continuity_head_sha256','sha256:'||v_head,
  'revision',v_rev,'observed_at',pg_catalog.clock_timestamp(),
  'read_only',true,'independent_owner_scope_verified',true,
  'owner_acceptance_verified',false,'acceptance_frozen',false,
  'acceptance_contract_sha256',null,'jobs',v_jobs,
  'missing_proofs',jsonb_build_array(
   'FROZEN_CUSTOMER_ORIGINAL_ACCEPTANCE',
   'EXACT_ORIGINAL_EFFECT_AUTHORITY',
   'SCHEDULED_WORKER_CAPACITY_ATTESTATION',
   'INDEPENDENT_ORIGINAL_OUTCOME_AND_UNIVERSE_RECONCILIATION'),
  'execution_authorized',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false,
  'new_shift_started',false);
END $fn$;
REVOKE ALL ON FUNCTION
 public.reality_read_current_final_loop_proof_envelope_v1(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION
 public.reality_read_current_final_loop_proof_envelope_v1(uuid)
 TO service_role;

-- The one-use checkpoint writer locks the ALREADY AUTHORIZED shift and
-- compares the current canonical head/scope/revision with worker-supplied
-- expected values. A caller's reason is never a grant or factual verifier.
CREATE OR REPLACE FUNCTION
 public.reality_record_final_loop_evidence_checkpoint_v1(
 p_shift_id uuid,p_original_work_id text,p_worker_run_id uuid,
 p_expected_revision bigint,p_expected_scope_sha256 text,
 p_expected_head_sha256 text,p_decision text,p_reason_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE
 v_shift record;v_snapshot jsonb;v_job jsonb;v_run record;
 v_receipt uuid;v_hash text;v_body jsonb;v_result jsonb;
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
 RETURN jsonb_build_object(
  'schema','reality-final-loop-evidence-checkpoint-v1',
  'status','FINAL_LOOP_EVIDENCE_ONLY_CHECKPOINT_DURABLY_RECORDED',
  'receipt_id',v_receipt,'receipt_sha256',v_hash,
  'shift_id',p_shift_id,'original_work_id',p_original_work_id,
  'decision',p_decision,'reason_code',p_reason_code,
  'evidence_only',true,'transition_committed',true,
  'executor_invoked',false,'execution_authorized',false,
  'repair_executed',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false,
  'new_shift_started',false);
END $fn$;
REVOKE ALL ON FUNCTION
 public.reality_record_final_loop_evidence_checkpoint_v1(
  uuid,text,uuid,bigint,text,text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION
 public.reality_record_final_loop_evidence_checkpoint_v1(
  uuid,text,uuid,bigint,text,text,text,text)
 TO service_role;
