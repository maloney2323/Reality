import test from 'node:test';
import assert from 'node:assert/strict';
import { runSyntheticGovernedOperationProof, createSyntheticOperation, createOneTimeSyntheticAuthority } from '../src/reality-governed-operation-proof-v1.0.js';
import { validateOperationAuthority, validateExecutionReplay, classifyOperationOutcome, createVerifiedLearningSignal } from '../src/reality-operation-ledger-v1.0.js';

test('completes the complete synthetic governed operation loop without external side effects', () => {
  const proof = runSyntheticGovernedOperationProof();
  assert.equal(proof.status, 'PROVEN_SYNTHETIC_LOOP');
  assert.equal(proof.external_side_effects, false);
  assert.equal(proof.outcome, 'verified');
  assert.ok(proof.learning_signal_id);
  assert.deepEqual(
    proof.stages.map(s => s.stage),
    ['question','evidence','reconstructed_state','decision','authority','proposed_action','executed_action','independent_observation','outcome','learning_signal']
  );
});

test('mutation, expiry, replay, contradiction, and unverified learning fail closed', () => {
  const operation = createSyntheticOperation();
  const authority = createOneTimeSyntheticAuthority(operation);

  assert.equal(validateOperationAuthority({
    operation,
    authorization: {...authority, parameters: {...authority.parameters, marker: 'MUTATED'}},
  }).valid, false);

  assert.equal(validateOperationAuthority({
    operation,
    authorization: {...authority, expires_at: '2000-01-01T00:00:00.000Z'},
  }).reason, 'AUTHORIZATION_EXPIRED');

  assert.equal(validateExecutionReplay({
    operation_id: operation.operation_id,
    execution_id: 'execution:replayed',
    priorEvents: [{payload: {execution_id: 'execution:replayed', operation_id: operation.operation_id}}],
  }).valid, false);

  const contradiction = { independent: true, verified: false, contradicted: true };
  assert.equal(classifyOperationOutcome({independentObservation: contradiction}), 'contradicted');

  assert.throws(() => createVerifiedLearningSignal({
    operation_id: operation.operation_id,
    outcome: 'contradicted',
    independentObservation: contradiction,
  }), /LEARNING_REQUIRES_VERIFIED_OUTCOME/);
});
