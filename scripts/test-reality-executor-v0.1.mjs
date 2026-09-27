import assert from 'node:assert/strict';

import {
  ExecutionFailureCode,
  ExecutionLifecycle,
  buildContinuitySnapshot,
  buildExecutionRequest,
  buildExecutionResult,
  digestExecutionCandidate,
  digestExecutionTarget,
  verifyContinuitySnapshot,
  verifyExecutionRequest,
} from '../base44/shared/reality-core/reality-executor-v0.1.js';
import {
  ExecutionClaimState,
  assertAtomicClaimResult,
  buildAtomicClaimInstruction,
  buildExecutionClaim,
  verifyExecutionClaim,
} from '../base44/shared/reality-core/execution-claim-v0.1.js';

const now = '2026-09-27T15:00:00.000Z';
const expires = '2026-09-27T15:05:00.000Z';

const snapshot = await buildContinuitySnapshot({
  continuity_state_id: 'cs:test:001',
  parent_state_id: 'cs:test:000',
  world_id: 'world:test',
  transition_type: 'TEST_STATE',
  transition_reason: 'G1.1 contract test',
  evidence_refs: ['evidence:test:001'],
  epistemic_state: { status: 'ESTABLISHED' },
  open_debt: [],
  created_at: now,
});

assert.equal(await verifyContinuitySnapshot(snapshot), true);

const target = { provider: 'test-provider', resource: 'resource:001' };
const candidate = { operation: 'TEST_WRITE', value: 'bounded' };

const authorization = {
  authorization_id: 'auth:test:001',
  issuer_id: 'reality-test-issuer',
  issuer_key_id: 'test-key',
  continuity_state_id: snapshot.continuity_state_id,
  continuity_state_digest: snapshot.state_digest,
  action_class: 'TEST_WRITE',
  target_digest: await digestExecutionTarget(target),
  candidate_digest: await digestExecutionCandidate(candidate),
  issued_at: now,
  expires_at: expires,
  nonce: 'nonce:test:001',
  execution_state: ExecutionClaimState.ISSUED,
  status: 'ISSUED',
};

let request = await buildExecutionRequest({
  request_id: 'req:test:unclaimed',
  authorization,
  continuity_snapshot: snapshot,
  action_class: 'TEST_WRITE',
  target,
  candidate,
  requested_at: now,
});

let result = await verifyExecutionRequest({
  request,
  now,
  expected_action_class: 'TEST_WRITE',
  expected_target: target,
  expected_candidate: candidate,
});
assert.equal(result.failure_code, ExecutionFailureCode.AUTHORIZATION_ALREADY_CLAIMED);

result = await verifyExecutionRequest({
  request,
  now: '2026-09-27T15:06:00.000Z',
  expected_action_class: 'TEST_WRITE',
  expected_target: target,
  expected_candidate: candidate,
  require_claim: false,
});
assert.equal(result.failure_code, ExecutionFailureCode.AUTHORIZATION_EXPIRED);

const claim = await buildExecutionClaim({
  authorization,
  execution_id: 'exec:test:001',
  request_id: 'req:test:001',
  now,
});

const claimedAuthorization = {
  ...authorization,
  execution_state: ExecutionClaimState.CLAIMED,
  execution_id: claim.execution_id,
  claim_nonce: claim.claim_nonce,
  claimed_at: claim.claimed_at,
  lease_expires_at: claim.lease_expires_at,
};

const claimVerification = await verifyExecutionClaim({
  authorization: claimedAuthorization,
  claim,
  now,
});
assert.equal(claimVerification.valid, true);

request = await buildExecutionRequest({
  request_id: 'req:test:001',
  authorization: claimedAuthorization,
  continuity_snapshot: snapshot,
  action_class: 'TEST_WRITE',
  target,
  candidate,
  requested_at: now,
  execution_identity: {
    execution_id: claim.execution_id,
    authorization_id: claim.authorization_id,
    request_id: claim.request_id,
    claim_nonce: claim.claim_nonce,
    lease_expires_at: claim.lease_expires_at,
  },
});

result = await verifyExecutionRequest({
  request,
  now,
  expected_action_class: 'TEST_WRITE',
  expected_target: target,
  expected_candidate: candidate,
});
assert.equal(result.admissible, true);

const claimInstruction = buildAtomicClaimInstruction({
  authorization_id: authorization.authorization_id,
  execution_id: claim.execution_id,
  request_id: claim.request_id,
  claim_nonce: claim.claim_nonce,
  claimed_at: claim.claimed_at,
  lease_expires_at: claim.lease_expires_at,
});
assert.equal(claimInstruction.operation, 'ATOMIC_COMPARE_AND_SET');

assert.throws(
  () => assertAtomicClaimResult({ atomic: true, claimed: true, affected_count: 2 }),
  /ATOMIC_EXECUTION_CLAIM_NOT_ESTABLISHED/,
);
assert.equal(assertAtomicClaimResult({ atomic: true, claimed: true, affected_count: 1 }), true);

result = await verifyExecutionRequest({
  request: {
    ...request,
    continuity_snapshot: { ...snapshot, state_digest: 'tampered' },
  },
  now,
  expected_action_class: 'TEST_WRITE',
  expected_target: target,
  expected_candidate: candidate,
});
assert.equal(result.failure_code, ExecutionFailureCode.SNAPSHOT_DIGEST_MISMATCH);

result = await verifyExecutionRequest({
  request,
  now: '2026-09-27T15:03:00.000Z',
  expected_action_class: 'TEST_WRITE',
  expected_target: target,
  expected_candidate: candidate,
});
assert.equal(result.failure_code, ExecutionFailureCode.LEASE_EXPIRED);

result = await verifyExecutionRequest({
  request: {
    ...request,
    authorization: {
      ...claimedAuthorization,
      execution_id: 'exec:other',
    },
    execution_identity: {
      ...request.execution_identity,
      execution_id: 'exec:other',
    },
  },
  now,
  expected_action_class: 'TEST_WRITE',
  expected_target: target,
  expected_candidate: candidate,
});
assert.equal(result.failure_code, ExecutionFailureCode.EXECUTION_ID_MISMATCH);

const expiredClaim = await verifyExecutionClaim({
  authorization: claimedAuthorization,
  claim,
  now: '2026-09-27T15:03:00.000Z',
});
assert.equal(expiredClaim.valid, false);
assert.equal(expiredClaim.code, 'LEASE_EXPIRED');

const replay = await verifyExecutionRequest({
  request: {
    ...request,
    authorization: { ...claimedAuthorization, execution_state: ExecutionClaimState.CONSUMED },
  },
  now,
  expected_action_class: 'TEST_WRITE',
  expected_target: target,
  expected_candidate: candidate,
});
assert.equal(replay.failure_code, ExecutionFailureCode.REPLAY_BLOCKED);

const incident = buildExecutionResult({
  request_id: request.request_id,
  status: 'EXECUTED_RECEIPT_UNVERIFIED',
  lifecycle: ExecutionLifecycle.RECEIPT_REQUIRED,
  verification_status: 'UNVERIFIED',
  failure_reason: 'provider effect observed but continuity closure not established',
});
assert.equal(incident.lifecycle, ExecutionLifecycle.INTEGRITY_INCIDENT);

console.log('Reality Executor G1.1 adversarial contract tests: PASS');
