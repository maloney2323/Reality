import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync(new URL(
 '../sql/reality-final-loop-canonical-continuity-v1.sql',
 import.meta.url),'utf8');

test('canonical readback reuses existing shift warrant and native originals',()=>{
 assert.match(sql,/reality_read_current_final_loop_proof_envelope_v1/);
 assert.match(sql,/reality_read_owner_shift_execution_graph_v1/);
 assert.match(sql,/governed_employee_completion_warrants_v1/);
 assert.match(sql,/public\.universe_events/);
 assert.match(sql,/continuity_root_id/);
 assert.match(sql,/continuity_head_sha256/);
 assert.match(sql,/frozen_shift_scope_sha256/);
 assert.match(sql,/ORIGINAL_ACCEPTANCE_PENDING/);
 assert.match(sql,/'owner_acceptance_verified',false/);
 assert.match(sql,/'acceptance_contract_sha256',null/);
 assert.match(sql,/'original_job_completed',false/);
});

test('new ledger is only a receipt for existing original, never second job registry',()=>{
 assert.match(sql,/CREATE TABLE IF NOT EXISTS reality_internal\.final_loop_transition_receipts_v1/);
 assert.match(sql,/original_work_id text NOT NULL/);
 assert.match(sql,/UNIQUE\(shift_id,original_work_id,expected_revision\)/);
 assert.match(sql,/UNIQUE\(shift_id,original_work_id,continuity_head_sha256,decision\)/);
 assert.match(sql,/FOR UPDATE OF s/);
 assert.match(sql,/ON CONFLICT DO NOTHING/);
 assert.match(sql,/FINAL_LOOP_CAUSAL_HEAD_OR_SCOPE_DRIFT_NO_REPLAY/);
 assert.match(sql,/FINAL_LOOP_EXISTING_CHECKPOINT_NO_REPLAY/);
});

test('unauthenticated and client roles cannot invoke canonical proof reader or writer',()=>{
 assert.match(sql,/SECURITY INVOKER/g);
 assert.match(sql,/current_user <> 'service_role'/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/REVOKE ALL ON TABLE reality_internal\.final_loop_transition_receipts_v1/);
 assert.match(sql,/REVOKE ALL ON FUNCTION[\s\S]*reality_read_current_final_loop_proof_envelope_v1/);
 assert.match(sql,/REVOKE ALL ON FUNCTION[\s\S]*reality_record_final_loop_evidence_checkpoint_v1/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION[\s\S]*TO service_role/);
 assert.doesNotMatch(sql,/GRANT EXECUTE ON FUNCTION[\s\S]*TO authenticated\s*;/);
});

test('checkpoint writer cannot install, execute, settle or create new original',()=>{
 assert.match(sql,/IF p_decision NOT IN \('REFRESH','SUSPEND'\)/);
 assert.match(sql,/FINAL_LOOP_FOUR_PROOFS_AND_ATOMIC_EXECUTOR_CLAIM_REQUIRED/);
 assert.match(sql,/r\.status='STARTED' AND r\.finished_at IS NULL/);
 assert.match(sql,/FINAL_LOOP_SIGNED_WORKER_RUN_REQUIRED/);
 assert.match(sql,/'evidence_only',true/);
 assert.match(sql,/'execution_authorized',false/);
 assert.match(sql,/'installation_authorized',false/);
 assert.match(sql,/'original_job_completed',false/);
 assert.match(sql,/'production_changed',false/);
 assert.doesNotMatch(sql,/UPDATE\s+reality_internal\.governed_employee_shifts_v1/i);
 assert.doesNotMatch(sql,/INSERT\s+INTO\s+public\.universe_events/i);
});
