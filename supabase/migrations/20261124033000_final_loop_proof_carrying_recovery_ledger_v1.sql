-- Reality Final Loop: one source-bound, proof-carrying recovery ledger.
-- This migration does not install a capability, grant mutation authority, run
-- a model, dispatch external effects, create original jobs or settle work.
-- ALL writes require service_role and a current independently signed worker.
CREATE TABLE IF NOT EXISTS reality_internal.final_loop_recovery_contracts_v1(
 contract_id text PRIMARY KEY CHECK(contract_id ~ '^sha256:[a-f0-9]{64}$'),
 owner_id uuid NOT NULL,shift_id uuid NOT NULL,obligation_id text NOT NULL
  CHECK(obligation_id ~ '^work:[a-f0-9]{32}$'),
 source_ref text NOT NULL,source_revision text NOT NULL
  CHECK(source_revision ~ '^[a-f0-9]{40}$'),
 continuity_root_id uuid NOT NULL,continuity_head_sha256 text NOT NULL
  CHECK(continuity_head_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 continuity_revision bigint NOT NULL CHECK(continuity_revision>=1),
 blocker_evidence_sha256 text NOT NULL
  CHECK(blocker_evidence_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 blocker_class text NOT NULL CHECK(blocker_class IN
  ('CODE','CAPACITY','INTEGRATION','EVIDENCE','AUTHORITY')),
 blocker_kind text NOT NULL,
 blocker_signature text NOT NULL,frozen_scope text NOT NULL,
 contract_body jsonb NOT NULL,budget jsonb NOT NULL,
 frozen_by_worker_run_id uuid NOT NULL,
 freeze_receipt_sha256 text NOT NULL UNIQUE CHECK(
  freeze_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 phase text NOT NULL DEFAULT 'FROZEN_EVIDENCE_ONLY'
  CHECK(phase IN ('FROZEN_EVIDENCE_ONLY','RED_VERIFIED','ISOLATED_REPAIR_READY',
  'GREEN_VERIFIED','REGRESSION_VERIFIED','CONTINUATION_VERIFIED','BUDGET_EXHAUSTED')),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(shift_id,obligation_id,source_revision,blocker_evidence_sha256)
);
CREATE INDEX IF NOT EXISTS final_loop_recovery_contract_shift_v1_idx
 ON reality_internal.final_loop_recovery_contracts_v1(shift_id,obligation_id);
CREATE TABLE IF NOT EXISTS reality_internal.final_loop_recovery_strategy_attempts_v1(
 attempt_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 contract_id text NOT NULL REFERENCES reality_internal.final_loop_recovery_contracts_v1(contract_id),
 strategy_fingerprint text NOT NULL CHECK(strategy_fingerprint ~ '^sha256:[a-f0-9]{64}$'),
 capability_id text NOT NULL CHECK(capability_id ~ '^[A-Z][A-Z0-9_]{2,100}$'),
 hypothesis_class text NOT NULL CHECK(hypothesis_class ~ '^[A-Z][A-Z0-9_]{2,100}$'),
 target_scope_sha256 text NOT NULL CHECK(target_scope_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 source_revision text NOT NULL CHECK(source_revision ~ '^[a-f0-9]{40}$'),
 env_state_hash text NOT NULL CHECK(env_state_hash ~ '^sha256:[a-f0-9]{64}$'),
 environment_attestation_sha256 text NOT NULL CHECK(
  environment_attestation_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 executor_worker_run_id uuid NOT NULL,
 estimated_wall_seconds integer NOT NULL CHECK(estimated_wall_seconds BETWEEN 0 AND 3600),
 estimated_cost_units integer NOT NULL CHECK(estimated_cost_units BETWEEN 0 AND 100),
 proposed_changed_files integer NOT NULL CHECK(proposed_changed_files BETWEEN 0 AND 8),
 actual_wall_seconds integer,
 actual_cost_units integer,
 actual_changed_files integer,
 state text NOT NULL DEFAULT 'CLAIMED'
 CHECK(state IN ('CLAIMED','FAILED_INDEPENDENTLY_VERIFIED','PROOF_INDEPENDENTLY_VERIFIED')),
 failure_class text CHECK(failure_class IN ('NO_PROOF_DELTA','WRONG_TARGET',
  'RED_NOT_REPRODUCED','REGRESSION_FAILED','BUDGET_EXCEEDED',
  'AUTHORITY_REQUIRED','PROVIDER_UNVERIFIED')),
 independent_verifier_worker_run_id uuid,
 independent_failure_receipt_sha256 text,
 claimed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 verified_at timestamptz,
 UNIQUE(contract_id,strategy_fingerprint),
 CHECK((state='CLAIMED' AND independent_failure_receipt_sha256 IS NULL)
 OR (state<>'CLAIMED' AND independent_verifier_worker_run_id IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS reality_internal.final_loop_recovery_proofs_v1(
 proof_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 contract_id text NOT NULL REFERENCES reality_internal.final_loop_recovery_contracts_v1(contract_id),
 attempt_id uuid NOT NULL REFERENCES reality_internal.final_loop_recovery_strategy_attempts_v1(attempt_id),
 gate text NOT NULL CHECK(gate IN ('RED','REPAIR_ISOLATED','GREEN','REGRESSION','CONTINUATION')),
 gate_index smallint NOT NULL CHECK(gate_index BETWEEN 1 AND 5),
 artifact_sha256 text NOT NULL CHECK(artifact_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 independent_proof_receipt_sha256 text NOT NULL CHECK(
  independent_proof_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 origin_worker_run_id uuid NOT NULL,
 verifier_worker_run_id uuid NOT NULL,
 test_report jsonb NOT NULL,
 verified_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(contract_id,gate_index),
 CHECK(origin_worker_run_id<>verifier_worker_run_id)
);
CREATE TABLE IF NOT EXISTS reality_internal.final_loop_recovery_capability_registry_v1(
 capability_id text PRIMARY KEY CHECK(capability_id ~ '^[A-Z][A-Z0-9_]{2,100}$'),
 effect_kind text NOT NULL CHECK(effect_kind IN
  ('EVIDENCE_ONLY_FROZEN_CI_REPRODUCTION','ISOLATED_REPAIR_ONLY')),
 independently_registered_receipt_sha256 text CHECK(
  independently_registered_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 state text NOT NULL DEFAULT 'NOT_INDEPENDENTLY_REGISTERED'
  CHECK(state IN ('NOT_INDEPENDENTLY_REGISTERED','READY_SIGNED_ISOLATED_ONLY','REVOKED')),
 max_changed_files integer NOT NULL DEFAULT 0 CHECK(max_changed_files BETWEEN 0 AND 8)
);
-- No recovery executor is auto-registered by a migration.
INSERT INTO reality_internal.final_loop_recovery_capability_registry_v1
 (capability_id,effect_kind,state,max_changed_files)
 VALUES ('REPRODUCE_CASE_SPECIFIC_FROZEN_RED',
  'EVIDENCE_ONLY_FROZEN_CI_REPRODUCTION','NOT_INDEPENDENTLY_REGISTERED',0)
 ON CONFLICT DO NOTHING;
ALTER TABLE reality_internal.final_loop_recovery_contracts_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE reality_internal.final_loop_recovery_strategy_attempts_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE reality_internal.final_loop_recovery_proofs_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE reality_internal.final_loop_recovery_capability_registry_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE reality_internal.final_loop_recovery_contracts_v1,
 reality_internal.final_loop_recovery_strategy_attempts_v1,
 reality_internal.final_loop_recovery_proofs_v1,
 reality_internal.final_loop_recovery_capability_registry_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON reality_internal.final_loop_recovery_contracts_v1,
 reality_internal.final_loop_recovery_strategy_attempts_v1,
 reality_internal.final_loop_recovery_proofs_v1,
 reality_internal.final_loop_recovery_capability_registry_v1 TO service_role;

-- The frozen candidate is checked against the EXACT current canonical
-- source, Continuity root/head, signed maintenance scope, and signed wake.
-- A database freeze attests policy facts only; it cannot admit or settle work.
CREATE OR REPLACE FUNCTION public.reality_freeze_final_loop_recovery_contract_v1(
 p_shift_id uuid,p_original_work_id text,p_worker_run_id uuid,p_contract jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO '' AS $body$
DECLARE s record;v_snapshot jsonb;v_shared jsonb;v_job jsonb;v_handoff jsonb;
 v_plan record;v_id text;v_receipt text;v_row record;v_budget jsonb;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'RECOVERY_CONTRACT_SERVICE_ROLE_REQUIRED';END IF;
 IF p_shift_id IS NULL OR p_worker_run_id IS NULL OR
  coalesce(p_original_work_id,'') !~ '^work:[a-f0-9]{32}$' OR
  pg_catalog.jsonb_typeof(p_contract)<>'object' OR
  NOT coalesce(p_contract ?& ARRAY[
   'version','owner_id','shift_id','obligation_id','source_ref',
   'source_revision','continuity_root_id','continuity_head_sha256',
   'blocker_evidence_sha256','blocker_class','blocker_kind',
   'failure_signature','frozen_scope','contract_id',
   'contract_fingerprint','freeze_state','ledger_freeze_verified',
   'required_proofs','budget'],false) OR
  p_contract->>'version'<>'reality-final-loop-proof-carrying-recovery-v1' OR
  p_contract->>'freeze_state'<>'CANDIDATE_NOT_DURABLE' OR
  p_contract->>'ledger_freeze_verified'<>'false' OR
  p_contract->>'obligation_id'<>p_original_work_id OR
  p_contract->>'shift_id'<>p_shift_id::text OR
  coalesce(p_contract->>'contract_id','') !~ '^sha256:[a-f0-9]{64}$' OR
  p_contract->>'contract_id'<>p_contract->>'contract_fingerprint' OR
  p_contract->>'blocker_class' NOT IN
   ('CODE','CAPACITY','INTEGRATION','EVIDENCE','AUTHORITY') OR
  coalesce(p_contract->>'blocker_kind','') !~ '^[A-Z][A-Z0-9_]{2,100}$' OR
  coalesce(p_contract->>'failure_signature','') !~ '^[A-Z][A-Z0-9_]{2,100}$' OR
  coalesce(p_contract->>'blocker_evidence_sha256','') !~ '^sha256:[a-f0-9]{64}$' OR
  coalesce(p_contract->>'source_revision','') !~ '^[a-f0-9]{40}$' OR
  coalesce(p_contract->>'continuity_head_sha256','') !~ '^sha256:[a-f0-9]{64}$' OR
  p_contract->'required_proofs'<> '["RED","REPAIR_ISOLATED","GREEN","REGRESSION","CONTINUATION"]'::jsonb OR
  pg_catalog.jsonb_typeof(p_contract->'budget')<>'object'
 THEN RETURN pg_catalog.jsonb_build_object('status','RECOVERY_FREEZE_CONTRACT_INVALID',
  'execution_authorized',false,'original_job_completed',false);END IF;
 v_budget:=p_contract->'budget';
 IF (SELECT count(*) FROM pg_catalog.jsonb_object_keys(v_budget))<>4 OR
  NOT(v_budget ?& ARRAY['max_attempts','max_wall_seconds','max_cost_units','max_changed_files']) OR
  (SELECT count(*) FROM pg_catalog.jsonb_each(v_budget) b
    WHERE pg_catalog.jsonb_typeof(b.value)<>'number' OR
     b.value::text !~ '^[0-9]{1,4}$')<>0 OR
  (v_budget->>'max_attempts')::int NOT BETWEEN 1 AND 6 OR
  (v_budget->>'max_wall_seconds')::int NOT BETWEEN 1 AND 3600 OR
  (v_budget->>'max_cost_units')::int NOT BETWEEN 1 AND 100 OR
  (v_budget->>'max_changed_files')::int NOT BETWEEN 1 AND 8
 THEN RETURN pg_catalog.jsonb_build_object('status','RECOVERY_BUDGET_INVALID_NO_EFFECT',
  'execution_authorized',false,'original_job_completed',false);END IF;
 SELECT shift_id,owner_id,plan_fingerprint INTO s
 FROM reality_internal.governed_employee_shifts_v1
 WHERE shift_id=p_shift_id AND closed_at IS NULL AND authorized_at IS NOT NULL
  AND planned_end_at='infinity'::timestamptz
  AND status IN ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
 FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(
 SELECT 1 FROM reality_internal.governed_employee_completion_warrants_v1 w
 WHERE w.shift_id=s.shift_id AND w.owner_id=s.owner_id
  AND w.plan_fingerprint=s.plan_fingerprint AND w.state='ACTIVE'
  AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS')
 THEN RETURN pg_catalog.jsonb_build_object('status','RECOVERY_EXISTING_WARRANT_NOT_CURRENT',
  'execution_authorized',false,'original_job_completed',false);END IF;
 IF NOT EXISTS(SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1
  WHERE run_id=p_worker_run_id AND status='STARTED' AND finished_at IS NULL
   AND started_at>pg_catalog.clock_timestamp()-interval '3 minutes')
 THEN RETURN pg_catalog.jsonb_build_object('status','RECOVERY_SIGNED_WORKER_NOT_CURRENT',
  'execution_authorized',false,'original_job_completed',false);END IF;
 v_snapshot:=public.reality_read_current_final_loop_proof_envelope_v1(p_shift_id);
 v_shared:=public.reality_read_final_loop_shared_continuity_guard_v1(p_shift_id);
 SELECT value INTO v_job FROM pg_catalog.jsonb_array_elements(
  coalesce(v_snapshot->'jobs','[]'::jsonb)) j(value)
 WHERE j.value->>'original_work_id'=p_original_work_id
  AND j.value->>'independent_source_proof_verified'='true';
 SELECT value INTO v_handoff FROM pg_catalog.jsonb_array_elements(
  coalesce(v_shared->'obligations','[]'::jsonb)) h(value)
 WHERE h.value->>'original_work_id'=p_original_work_id
  AND h.value->>'source_ref'=v_job->>'source_ref';
 IF v_snapshot->>'status'<>'FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING' OR
  v_shared->>'status'<>'FINAL_LOOP_SHARED_CONTINUITY_CHECKED' OR
  v_snapshot->>'owner_id'<>s.owner_id::text OR
  v_shared->>'owner_id'<>s.owner_id::text OR
  v_snapshot->>'continuity_root_id'<>p_contract->>'continuity_root_id' OR
  v_shared->>'continuity_root_id'<>p_contract->>'continuity_root_id' OR
  v_snapshot->>'continuity_head_sha256'<>p_contract->>'continuity_head_sha256' OR
  v_shared->>'continuity_head_sha256'<>p_contract->>'continuity_head_sha256' OR
  v_snapshot->>'revision'<>v_shared->>'revision' OR
  v_job->>'source_ref'<>p_contract->>'source_ref' OR
  v_handoff->>'source_proof_verified'<>'true' OR
  v_handoff->>'qualifier_digest_verified'<>'true' OR
  v_handoff->>'continuity_identity_verified'<>'true' OR
  v_handoff->>'qualifier_receipt_sha256'<>p_contract->>'blocker_evidence_sha256' OR
  NOT(v_handoff->'unresolved_proof_gates' ? 'CASE_SPECIFIC_FROZEN_RED_NOT_VERIFIED') OR
  p_contract->>'owner_id'<>s.owner_id::text OR
  v_job->>'source_proof_sha256' IS NULL OR
  v_handoff->>'qualifier_receipt_sha256' IS NULL
 THEN RETURN pg_catalog.jsonb_build_object('status','RECOVERY_FROZEN_ORIGINAL_OR_PROOF_CHANGED',
  'execution_authorized',false,'original_job_completed',false);END IF;
 SELECT * INTO v_plan FROM reality_internal.final_loop_pr_source_plans_v1
 WHERE shift_id=p_shift_id AND owner_id=s.owner_id
  AND source_ref=v_job->>'source_ref'
  AND parent_original_work_id=p_original_work_id
  AND source_head_sha=p_contract->>'source_revision'
  AND source_proof_sha256=v_job->>'source_proof_sha256'
  AND state='PROPOSED_SOURCE_PLAN_AWAITING_INDEPENDENT_ADMISSION';
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','RECOVERY_EXACT_SOURCE_EPOCH_NOT_STAGED',
  'execution_authorized',false,'original_job_completed',false);END IF;
 IF NOT EXISTS(SELECT 1 FROM reality_internal.owner_internal_maintenance_jobs_v1 m
  JOIN reality_internal.governed_employee_completion_warrants_v1 w
  ON w.shift_id=p_shift_id AND w.owner_id=m.owner_id
 WHERE m.owner_id=s.owner_id AND m.claimed_shift_id=p_shift_id
  AND m.source_ref=v_plan.source_ref
  AND m.independent_failure_baseline_receipt_sha256 IS NOT NULL
  AND m.independent_frozen_test_receipt_sha256 IS NULL
  AND m.original_job_completed=false AND m.production_changed=false
  AND pg_catalog.jsonb_typeof(w.source_scope)='array'
  AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(w.source_scope) e
   WHERE e->>'maintenance_id'=m.incident_id::text
    AND e->>'origin_shift_id'=m.origin_shift_id::text
    AND e->>'source_ref'=m.source_ref
    AND e->>'independent_review_receipt_sha256'=m.independent_review_receipt_sha256)
 ) THEN RETURN pg_catalog.jsonb_build_object(
  'status','RECOVERY_SIGNED_MAINTENANCE_SOURCE_WARRANT_MISSING',
  'execution_authorized',false,'original_job_completed',false);END IF;
 v_id:=p_contract->>'contract_id';
 v_receipt:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(pg_catalog.jsonb_build_object(
   'contract_id',v_id,'owner_id',s.owner_id,'shift_id',p_shift_id,
   'original_work_id',p_original_work_id,
   'continuity_revision',v_snapshot->>'revision',
   'continuity_root_id',v_snapshot->>'continuity_root_id',
   'continuity_head',v_snapshot->>'continuity_head_sha256',
   'worker_run_id',p_worker_run_id,'scope',v_plan.source_manifest_sha256
  )::text,'UTF8')),'hex');
 INSERT INTO reality_internal.final_loop_recovery_contracts_v1(
 contract_id,owner_id,shift_id,obligation_id,source_ref,source_revision,
 continuity_root_id,continuity_head_sha256,continuity_revision,
 blocker_evidence_sha256,blocker_class,blocker_kind,blocker_signature,
 frozen_scope,contract_body,budget,frozen_by_worker_run_id,freeze_receipt_sha256)
 VALUES(v_id,s.owner_id,p_shift_id,p_original_work_id,
  v_plan.source_ref,v_plan.source_head_sha,
  (v_snapshot->>'continuity_root_id')::uuid,
  v_snapshot->>'continuity_head_sha256',(v_snapshot->>'revision')::bigint,
  p_contract->>'blocker_evidence_sha256',p_contract->>'blocker_class',
  p_contract->>'blocker_kind',p_contract->>'failure_signature',
  p_contract->>'frozen_scope',p_contract,p_contract->'budget',
  p_worker_run_id,v_receipt)
 ON CONFLICT DO NOTHING RETURNING * INTO v_row;
 IF NOT FOUND THEN
  SELECT * INTO v_row FROM reality_internal.final_loop_recovery_contracts_v1
  WHERE contract_id=v_id AND shift_id=p_shift_id
   AND obligation_id=p_original_work_id AND contract_body=p_contract;
  IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
   'status','RECOVERY_ALREADY_FROZEN_WITH_DIFFERENT_SCOPE_NO_EFFECT',
   'execution_authorized',false,'original_job_completed',false);END IF;
 END IF;
 RETURN pg_catalog.jsonb_build_object(
 'status','RECOVERY_CONTRACT_ATOMIC_FREEZE_RECORDED',
 'contract_id',v_row.contract_id,'obligation_id',v_row.obligation_id,
 'continuity_root_id',v_row.continuity_root_id,
 'freeze_receipt_sha256',v_row.freeze_receipt_sha256,
 'continuity_revision',v_row.continuity_revision,
 'new_original_created',false,'model_executed',false,
 'execution_authorized',false,'original_job_completed',false,
 'production_changed',false);
END $body$;
-- Readback never endorses self-reported model output; proof gates stay
-- unverified until their independently recorded signed receipts exist.
CREATE OR REPLACE FUNCTION public.reality_read_final_loop_recovery_contract_v1(
 p_shift_id uuid,p_obligation_id text)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO '' AS $body$
DECLARE c record;v_attempts jsonb;v_proofs jsonb;v_budget jsonb;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'RECOVERY_READ_SERVICE_ONLY';END IF;
 SELECT * INTO c FROM reality_internal.final_loop_recovery_contracts_v1
 WHERE shift_id=p_shift_id AND obligation_id=p_obligation_id
 ORDER BY recorded_at DESC LIMIT 1;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','RECOVERY_NO_DURABLE_CONTRACT','read_only',true,
  'execution_authorized',false,'original_job_completed',false);END IF;
 SELECT coalesce(pg_catalog.jsonb_agg(
  pg_catalog.jsonb_build_object(
   'strategy_fingerprint',a.strategy_fingerprint,
   'capability_id',a.capability_id,'failure_class',a.failure_class,
   'state',a.state,'attempt_id',a.attempt_id,
   'independent_failure_receipt_sha256',a.independent_failure_receipt_sha256,
   'executor_worker_run_id',a.executor_worker_run_id,
   'verifier_worker_run_id',a.independent_verifier_worker_run_id,
   'wall_seconds',a.actual_wall_seconds,
   'cost_units',a.actual_cost_units,'changed_files',a.actual_changed_files)
   ORDER BY a.claimed_at),'[]'::jsonb)
 INTO v_attempts FROM reality_internal.final_loop_recovery_strategy_attempts_v1 a
 WHERE a.contract_id=c.contract_id;
 SELECT coalesce(pg_catalog.jsonb_agg(
  pg_catalog.jsonb_build_object('gate',p.gate,'receipt_sha256',
   p.independent_proof_receipt_sha256,'artifact_sha256',p.artifact_sha256,
   'origin_worker_run_id',p.origin_worker_run_id,
   'verifier_worker_run_id',p.verifier_worker_run_id,
   'independent_verified',true,'proof_delta_verified',true,
   'test_report',p.test_report)
   ORDER BY p.gate_index),'[]'::jsonb)
 INTO v_proofs FROM reality_internal.final_loop_recovery_proofs_v1 p
 WHERE p.contract_id=c.contract_id;
 SELECT pg_catalog.jsonb_build_object(
   'source','INDEPENDENT_SIGNED_RECOVERY_BUDGET_LEDGER_READBACK',
   'independent_verified',true,'contract_id',c.contract_id,
   'obligation_id',c.obligation_id,
   'continuity_root_id',c.continuity_root_id,
   'receipt_sha256',c.freeze_receipt_sha256,
   'total_attempts',count(*)::int,
   'spent_wall_seconds',coalesce(sum(
     coalesce(a.actual_wall_seconds,a.estimated_wall_seconds)),0)::int,
   'spent_cost_units',coalesce(sum(
     coalesce(a.actual_cost_units,a.estimated_cost_units)),0)::int,
   'cumulative_touched_files',coalesce(sum(
     coalesce(a.actual_changed_files,a.proposed_changed_files)),0)::int
  ) INTO v_budget
 FROM reality_internal.final_loop_recovery_strategy_attempts_v1 a
 WHERE a.contract_id=c.contract_id;
 RETURN pg_catalog.jsonb_build_object(
  'status','RECOVERY_CONTRACT_SIGNED_OWNER_READBACK',
  'contract',c.contract_body,'contract_id',c.contract_id,
  'durableFreeze',pg_catalog.jsonb_build_object(
   'status','RECOVERY_CONTRACT_ATOMIC_FREEZE_VERIFIED',
   'contract_id',c.contract_id,'contract_fingerprint',c.contract_id,
   'obligation_id',c.obligation_id,'continuity_root_id',c.continuity_root_id,
   'freeze_receipt_sha256',c.freeze_receipt_sha256,
   'independently_observed',true),
  'source_ref',c.source_ref,'source_revision',c.source_revision,
  'frozen_continuity_revision',c.continuity_revision,
  'budgetLedger',v_budget,'attempts',v_attempts,
  'proofReceipts',v_proofs,'read_only',true,
  'execution_authorized',false,'repair_executed',false,
  'owner_approval_granted',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
END $body$;
-- No implementation may claim/dispatch a recovery action until a separately
-- proven registered capability exists. The migration intentionally seeds
-- NO enabled capability; repeated old CI diagnostics are not new evidence.
CREATE OR REPLACE FUNCTION public.reality_read_final_loop_recovery_capability_v1(
 p_capability_id text)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO '' AS $body$
DECLARE r record;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'RECOVERY_REGISTERED_CAPABILITY_SERVICE_ONLY';END IF;
 SELECT * INTO r FROM reality_internal.final_loop_recovery_capability_registry_v1
 WHERE capability_id=p_capability_id;
 IF NOT FOUND OR r.state<>'READY_SIGNED_ISOLATED_ONLY' OR
  r.independently_registered_receipt_sha256 IS NULL
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','RECOVERY_CAPABILITY_NOT_INDEPENDENTLY_REGISTERED',
  'execution_authorized',false,'repair_executed',false);END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status','RECOVERY_CAPABILITY_SIGNED_REGISTRATION_EXISTS',
  'capability_id',r.capability_id,'effect_kind',r.effect_kind,
  'registration_receipt_sha256',r.independently_registered_receipt_sha256,
  'registered_capability_available',true,
  'execution_authorized',false,'repair_executed',false);
END $body$;
REVOKE ALL ON FUNCTION public.reality_freeze_final_loop_recovery_contract_v1(uuid,text,uuid,jsonb),
 public.reality_read_final_loop_recovery_contract_v1(uuid,text),
 public.reality_read_final_loop_recovery_capability_v1(text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_freeze_final_loop_recovery_contract_v1(uuid,text,uuid,jsonb),
 public.reality_read_final_loop_recovery_contract_v1(uuid,text),
 public.reality_read_final_loop_recovery_capability_v1(text)
 TO service_role;
