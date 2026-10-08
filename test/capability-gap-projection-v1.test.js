import assert from 'node:assert/strict';
import { detectCapabilityGap, confirmCapabilityGap, createSandboxExperiment, authorizeSandboxExperiment, validateSandboxResult, authorizeWorldlineMerge } from '../src/reality-autonomous-capability-loop-v0.1.js';
import { createCapabilityGapProjection, assertCapabilityGapNonAuthoritative } from '../src/reality-capability-gap-projection-v1.js';

const discovery = {
  id: 'discovery:test:missing-capability',
  evidence_refs: ['evidence:failure-1', 'evidence:failure-2'],
};

const consequence = {
  gap: 'MISSING_CAPABILITY',
  subject: 'customer-commitment-verifier',
};

const gap = detectCapabilityGap({
  consequence,
  workItem: { id: 'work:test-1', continuity_root_id: 'root:test', capability_contract: { output: 'verification' } },
  capabilities: [],
});
assert.ok(gap);

const projection = createCapabilityGapProjection({
  sourceDiscoveryId: discovery.id,
  requiredCapability: gap.capability_id,
  currentLimitation: 'The verifier is not registered.',
  evidenceRefs: discovery.evidence_refs,
  provenance: { gap_id: gap.gap_id },
});
assert.equal(projection.projection_type, 'CAPABILITY_GAP');
assert.equal(projection.authority, null);
assert.equal(projection.execution_authorized, false);
assert.equal(projection.admission_status, 'PENDING');
assert.equal(assertCapabilityGapNonAuthoritative(projection), true);

const confirmed = confirmCapabilityGap(gap, {
  historicalFailureRefs: discovery.evidence_refs,
  verificationSuiteRef: 'suite:capability-gap-v1',
});
const experiment = createSandboxExperiment({
  confirmedGap: confirmed,
  primaryWorldlineId: 'worldline:primary-test',
});

assert.equal(experiment.production_graph_write_permitted, false);
assert.throws(
  () => authorizeSandboxExperiment(experiment, {}),
  /SANDBOX_AUTHORIZATION_REQUIRED/,
);

const authorized = authorizeSandboxExperiment(experiment, {
  authorizationRef: 'auth:sandbox-test',
  authorizedBy: 'owner:test',
});

const failedVerification = {
  frozen_regression: { passed: false },
  isolated_verification: { verified: false },
  capability_signature: null,
};
assert.throws(
  () => validateSandboxResult(authorized, {
    synthesizedCapability: { id: 'candidate:test' },
    ...failedVerification,
  }),
  /FROZEN_REGRESSION_FAILED/,
);

const verified = validateSandboxResult(authorized, {
  synthesizedCapability: { id: 'candidate:test' },
  frozenRegression: { passed: true },
  isolatedVerification: { verified: true },
  capabilitySignature: 'sig:test',
});
assert.equal(verified.state, 'SANDBOX_VERIFIED');
assert.throws(
  () => authorizeWorldlineMerge({ ...authorized, state: 'SANDBOX_SYNTHESIS' }, {
    mergeVerifier: () => ({ approved: true }),
  }),
  /VERIFIED_SANDBOX_EXPERIMENT_REQUIRED/,
);

const merged = authorizeWorldlineMerge(verified, {
  mergeVerifier: () => ({ approved: true }),
});
assert.equal(merged.state, 'WORLDLINE_MERGE_PENDING');
assert.equal(projection.execution_authorized, false);

console.log('CAPABILITY_GAP_PROJECTION_V1_PASS');
