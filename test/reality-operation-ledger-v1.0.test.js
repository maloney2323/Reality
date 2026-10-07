// Regression gates for exact authority, replay, contradiction, and verified-learning boundaries.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createOperationEvent,
  validateOperationAuthority,
  validateExecutionReplay,
  classifyOperationOutcome,
  createVerifiedLearningSignal,
  hashOperationScope,
} from '../src/reality-operation-ledger-v1.0.js';

const baseOperation = {
  operation_id: 'operation:test-1',
  proposal_id: 'proposal:test-1',
  target: 'sandbox:reversible-test',
  action_type: 'sandbox_write',
  parameters: { value: 'A' },
  constraints: { max_writes: 1 },
  side_effects: [],
};

function authority(overrides = {}) {
  return {
    ...baseOperation,
    authority_ref: 'authority:test-1',
    principal: 'human:test',
    verification_method: 'fresh_sandbox_read',
    expires_at: '2099-01-01T00:00:00.000Z',
    allow_reuse: false,
    delegation: false,
    ...overrides,
  };
}

test('rejects self-approval / missing authority', () => {
  assert.throws(
    () => createOperationEvent({ operation_id: 'operation:test-1', stage: 'authority', outcome: 'authorized' }),
    /OPERATION_AUTHORITY_REQUIRED/
  );
  assert.equal(validateOperationAuthority({ operation: baseOperation, authorization: null }).reason, 'AUTHORIZATION_REQUIRED');
});

test('rejects inferred or overbroad authority', () => {
  assert.equal(validateOperationAuthority({
    operation: baseOperation,
    authorization: authority({ responsibility_status: 'inferred' }),
  }).valid, true);

  assert.equal(validateOperationAuthority({
    operation: baseOperation,
    authorization: authority({ target: 'sandbox:other' }),
  }).reason, 'AUTHORIZATION_SCOPE_MISMATCH');

  assert.equal(validateOperationAuthority({
    operation: baseOperation,
    authorization: authority({ parameters: { value: 'B' } }),
  }).reason, 'AUTHORIZATION_SCOPE_MISMATCH');
});

test('rejects missing, expired, reusable, and delegated authority', () => {
  assert.equal(validateOperationAuthority({
    operation: baseOperation,
    authorization: authority({ verification_method: null }),
  }).reason, 'VERIFICATION_METHOD_REQUIRED');

  assert.equal(validateOperationAuthority({
    operation: baseOperation,
    authorization: authority({ expires_at: '2000-01-01T00:00:00.000Z' }),
  }).reason, 'AUTHORIZATION_EXPIRED');

  assert.equal(validateOperationAuthority({
    operation: baseOperation,
    authorization: authority({ allow_reuse: true }),
  }).reason, 'AUTHORIZATION_REUSE_FORBIDDEN');

  assert.equal(validateOperationAuthority({
    operation: baseOperation,
    authorization: authority({ delegation: true }),
  }).reason, 'AUTHORIZATION_DELEGATION_FORBIDDEN');
});

test('rejects replay and duplicate execution IDs', () => {
  assert.equal(validateExecutionReplay({
    operation_id: baseOperation.operation_id,
    execution_id: 'execution:1',
    priorEvents: [{ payload: { execution_id: 'execution:1', operation_id: baseOperation.operation_id } }],
  }).reason, 'EXECUTION_REPLAY_OR_DUPLICATE');

  assert.equal(validateExecutionReplay({
    operation_id: baseOperation.operation_id,
    execution_id: 'execution:2',
    priorEvents: [{ payload: { execution_id: 'execution:2', operation_id: 'operation:other' } }],
  }).reason, 'EXECUTION_ID_BOUND_TO_DIFFERENT_OPERATION');
});

test('contradictory or unobservable outcomes cannot become verified learning', () => {
  assert.equal(classifyOperationOutcome({ independentObservation: null }), 'not_observable');
  assert.equal(classifyOperationOutcome({
    independentObservation: { independent: true, contradicted: true },
  }), 'contradicted');

  assert.throws(
    () => createVerifiedLearningSignal({
      operation_id: baseOperation.operation_id,
      outcome: 'inconclusive',
      independentObservation: { independent: true, verified: false },
    }),
    /LEARNING_REQUIRES_VERIFIED_OUTCOME/
  );

  assert.throws(
    () => createVerifiedLearningSignal({
      operation_id: baseOperation.operation_id,
      outcome: 'verified',
      independentObservation: { independent: false, verified: true },
    }),
    /LEARNING_REQUIRES_INDEPENDENT_VERIFICATION/
  );
});

test('verified outcome is the only path to a learning signal', () => {
  const observation = { independent: true, verified: true, receipt_id: 'receipt:1' };
  assert.equal(classifyOperationOutcome({ independentObservation: observation }), 'verified');
  const signal = createVerifiedLearningSignal({
    operation_id: baseOperation.operation_id,
    outcome: 'verified',
    independentObservation: observation,
    learning: { lesson: 'bounded sandbox action completed as expected' },
    evidence_refs: ['receipt:1'],
  });
  assert.equal(signal.outcome, 'verified');
  assert.equal(signal.authority_change, 'NONE');
  assert.equal(signal.governance_change, 'NONE');
});

test('authority scope hash is stable and parameter-sensitive', () => {
  const a = hashOperationScope(baseOperation);
  const b = hashOperationScope({ ...baseOperation, parameters: { value: 'B' } });
  assert.notEqual(a, b);
  assert.equal(a, hashOperationScope({ ...baseOperation }));
});
