import assert from 'node:assert/strict';
import {
  createObjective, recordCapabilityGap, recordCapabilityAcquisition,
  verifyCapability, grantAuthority, recordExecution,
  recordExternalObservation, independentlyVerifyObservation,
  commitLearning, updateUniverse, resumeCognition
} from '../src/reality-closed-loop-objective-v0.1.js';

const base = createObjective({
  objectiveId: 'objective:test-001',
  description: 'Complete an unfamiliar bounded objective',
  worldId: 'world:test',
  continuityRootId: 'root:test',
  worldlineId: 'worldline:test',
  successCriteria: ['external-result-confirmed'],
});

const gap = recordCapabilityGap(base, {
  gapId: 'gap:test-capability',
  capabilityId: 'capability:test',
  reason: 'Required operation is unavailable',
  evidenceRefs: ['failure:test'],
});

const acquired = recordCapabilityAcquisition(gap, {
  acquisitionId: 'acquisition:test',
  artifactRefs: ['artifact:test'],
  candidateCapabilityHash: 'capability-hash:test',
});

const verifiedCapability = verifyCapability(acquired, {
  verificationId: 'capability-verification:test',
  independent: true,
  passed: true,
  evidenceRefs: ['verification:test'],
});

const authorized = grantAuthority(verifiedCapability, {
  authorizationId: 'authorization:test',
  authorizedBy: 'bounded-test-authority',
  actionHash: 'action:test',
  scope: 'test-only',
  expiresAt: '2099-01-01T00:00:00Z',
});

const executed = recordExecution(authorized, {
  executionReceiptHash: 'execution:test',
  actionHash: 'action:test',
  status: 'SUCCEEDED',
  evidenceRefs: ['execution-evidence:test'],
});

const observed = recordExternalObservation(executed, {
  observationId: 'observation:test',
  executionReceiptHash: 'execution:test',
  evidenceRefs: ['external-observation:test'],
  result: 'confirmed',
});

const independentlyVerified = independentlyVerifyObservation(observed, {
  verificationId: 'independent-verification:test',
  independentSourceRef: 'external-source:test',
  targetObservationId: 'observation:test',
  verified: true,
  evidenceRefs: ['independent-evidence:test'],
  result: 'confirmed',
});

const learned = commitLearning(independentlyVerified, {
  learningDeltaId: 'learning:test',
  changedClaims: ['capability:test works under bounded test conditions'],
  evidenceRefs: ['independent-evidence:test'],
});

const updated = updateUniverse(learned, {
  universeUpdateId: 'universe-update:test',
  updatedStateId: 'cognitive-state:test-updated',
  ledgerEntryHash: 'ledger:test',
});

const resumed = resumeCognition(updated, {
  nextCognitiveStateId: 'cognitive-state:test-next',
});

assert.equal(resumed.state, 'COGNITION_RESUMED');
assert.equal(resumed.execution_receipt_hash, 'execution:test');
assert.equal(resumed.independent_verification_id, 'independent-verification:test');

assert.throws(() => recordExecution(verifiedCapability, {
  executionReceiptHash: 'bad',
  actionHash: 'action:test',
  status: 'SUCCEEDED',
  evidenceRefs: ['x'],
}), /AUTHORITY_REQUIRED/);

assert.throws(() => independentlyVerifyObservation(observed, {
  verificationId: 'bad',
  independentSourceRef: 'external-source:test',
  targetObservationId: 'wrong-observation',
  verified: true,
  evidenceRefs: ['x'],
}), /VERIFICATION_OBSERVATION_MISMATCH/);

assert.throws(() => commitLearning(observed, {
  learningDeltaId: 'bad',
  evidenceRefs: ['x'],
}), /INDEPENDENT_VERIFICATION_REQUIRED/);

console.log(JSON.stringify({
  test: 'closed-loop-objective-v0.1',
  state: resumed.state,
  closure_hash: resumed.closure_hash,
  artifacts: 11,
}, null, 2));
