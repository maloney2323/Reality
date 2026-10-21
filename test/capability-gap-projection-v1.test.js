import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { detectCapabilityGap, confirmCapabilityGap, createSandboxExperiment, authorizeSandboxExperiment, validateSandboxResult, authorizeWorldlineMerge, canonicalOwnerWorldlineMergeApprovalMessage,
  OWNER_WORLDLINE_MERGE_APPROVAL_VERSION } from '../src/reality-autonomous-capability-loop-v0.1.js';
import { createCapabilityGapProjection, assertCapabilityGapNonAuthoritative } from '../src/reality-capability-gap-projection-v1.js';
import { canonicalOwnerConsentMessage, OWNER_CONSENT_SCHEMA, SANDBOX_CONSENT_SCOPE }
  from '../src/reality-owner-consent-boundary-v0.1.js';

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

const ownerKeys = generateKeyPairSync('ed25519');
const previousOwnerKey = process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY;
process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY =
  ownerKeys.publicKey.export({type:'spki',format:'pem'});
const sandboxApprovalPayload = {
  schema: OWNER_CONSENT_SCHEMA,
  owner_id: 'owner:test',
  purpose: SANDBOX_CONSENT_SCOPE,
  subject_ref: experiment.experiment_hash,
  original_task_ref: experiment.original_work_item_id,
  governance_kernel_ref: null,
  consent_ref: 'auth:sandbox-test',
  issued_at: new Date(Date.now()-1000).toISOString(),
  expires_at: new Date(Date.now()+3600000).toISOString(),
  nonce: 'legacy-sandbox-consent:01',
};
const sandboxOwnerApproval = {
  ...sandboxApprovalPayload,
  signature: sign(null, Buffer.from(canonicalOwnerConsentMessage(sandboxApprovalPayload)),
    ownerKeys.privateKey).toString('base64'),
};
const authorized = authorizeSandboxExperiment(experiment, {
  authorizationRef: 'auth:sandbox-test',
  authorizedBy: 'owner:test',
  ownerApproval: sandboxOwnerApproval,
});
assert.equal(authorized.sandbox_owner_consent_consumed, false);
assert.equal(authorized.requires_atomic_owner_consent_consumption, true);

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

// An owner's cryptographic signature is required even for the legacy
// capability pathway; a verifier's approved:true statement is not authority.
const approval = {
  schema: OWNER_WORLDLINE_MERGE_APPROVAL_VERSION,
  decision: 'APPROVE_CANONICAL_CAPABILITY_MERGE',
  owner_id: 'test-owner',
  gap_id: verified.gap_id,
  capability_id: verified.capability_id,
  capability_signature: verified.capability_signature,
  experiment_hash: verified.experiment_hash,
  verification_hash: verified.verification_hash,
  primary_worldline_id: verified.primary_worldline_id,
  ephemeral_worldline_id: verified.ephemeral_worldline_id,
  target: 'CANONICAL_CAPABILITY_REGISTRY',
  issued_at: new Date(Date.now()-1000).toISOString(),
  expires_at: new Date(Date.now()+3600000).toISOString(),
  nonce: 'capability-gap-v1-test-approval',
};
const ownerApproval = {
  ...approval,
  signature: sign(null, Buffer.from(canonicalOwnerWorldlineMergeApprovalMessage(approval)),
    ownerKeys.privateKey).toString('base64'),
};
const merged = authorizeWorldlineMerge(verified, {
  mergeVerifier: () => ({ approved: true }),
  ownerApproval,
});
if (previousOwnerKey === undefined) delete process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY;
else process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY = previousOwnerKey;
assert.equal(merged.state, 'WORLDLINE_MERGE_PENDING');
assert.equal(projection.execution_authorized, false);

console.log('CAPABILITY_GAP_PROJECTION_V1_PASS');
