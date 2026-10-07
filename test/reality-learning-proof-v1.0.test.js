import assert from 'node:assert/strict';
import test from 'node:test';
import { runRealityLearningProof, REALITY_LEARNING_PROOF_VERSION } from '../src/reality-learning-proof-v1.0.js';

test('Reality learning proof closes the verified experience loop', () => {
  const result = runRealityLearningProof();
  assert.equal(result.status, 'VERIFIED_INTEGRATION_PROOF');
  assert.equal(result.proof.proof_version, REALITY_LEARNING_PROOF_VERSION);
  assert.equal(result.proof.evaluation_verdict, 'VERIFIED');
  assert.equal(result.proof.promotion_state, 'PROMOTED');
  assert.deepEqual(result.proof.substrate_signal_ids, ['signal:reality-proof:1']);
  assert.equal(result.proof.hidden_evaluation_status, 'SEALED');
  assert.equal(result.proof.authority_granted_by_learner, false);
  assert.equal(result.proof.production_graph_write_permitted, false);
  assert.ok(result.proof.learning_signal_hash);
  assert.ok(result.proof.manifest_hash);
  assert.ok(result.proof.proof_hash);
});

test('the proof is repeatable without exposing hidden evaluation', () => {
  const a = runRealityLearningProof();
  const b = runRealityLearningProof();
  assert.equal(a.status, b.status);
  assert.equal(a.proof.evaluation_verdict, b.proof.evaluation_verdict);
  assert.equal(a.proof.hidden_evaluation_status, 'SEALED');
  assert.equal(b.proof.hidden_evaluation_status, 'SEALED');
});
