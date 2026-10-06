import assert from 'node:assert/strict';
import {
  EKR_VERSION,
  EKR_EVENT_TYPES,
  createEKRAssertion,
  createEKREvent,
  canonicalJson,
  sha256Canonical,
  validateEKRVerification,
  foldEKRState,
  evaluateEKRReuse,
  migrateLegacyEKRv01,
  assertAppendOnlyEventStream,
} from '../src/reality-ekr-v0.2.js';

const base = {
  ekrId: 'ekr:001',
  continuityRootId: 'cr:001',
  worldlineId: 'wl:001',
  worldId: 'world:001',
  proposition: { subject: 'invoice:001', predicate: 'paid', object: true, statement: 'Invoice 001 is paid.' },
  claimScope: { kind: 'invoice', id: 'invoice:001' },
  assertedAt: '2026-10-05T21:00:00Z',
  evidenceLineage: { evidence_refs: ['evidence:001'] },
  reconstructionLineage: { reconstruction_refs: ['reconstruction:001'] },
  verificationLineage: {
    execution_receipt_ref: 'execution:001',
    target_observation_ref: 'observation:002',
    independent_verification_ref: 'verification:001',
    verified_outcome_ref: 'outcome:001',
  },
  confidenceBasis: { basis_refs: ['verification:001'] },
  applicabilityBasis: { relevant_scope: 'invoice payment status' },
  falsifiabilityConditions: [{ type: 'new_unpaid_observation', ref: 'observation:003' }],
};

const assertion = createEKRAssertion(base);

assert.equal(EKR_VERSION, '0.2.0');
assert.equal(assertion.assertion_hash, sha256Canonical({ ...assertion, assertion_hash: undefined }));
assert.equal(Object.prototype.hasOwnProperty.call(assertion, 'epistemic_state'), false);
assert.equal(Object.isFrozen(assertion), true);
assert.throws(() => createEKRAssertion({ ...base, continuityRootId: 'unknown' }), /SYNTHETIC_EKR_ID_REJECTED/);
assert.throws(() => createEKRAssertion({ ...base, evidenceLineage: null }), /EVIDENCE_LINEAGE_REQUIRED/);

const asserted = createEKREvent({
  eventId: 'event:001',
  assertionId: assertion.id,
  continuityRootId: assertion.continuity_root,
  worldlineId: assertion.worldline_id,
  eventType: 'ASSERTED',
  eventPayload: { state: 'HYPOTHESIS', applicability_status: 'RELEVANT' },
  evidenceRefs: ['evidence:001'],
  occurredAt: '2026-10-05T21:00:01Z',
  recordedAt: '2026-10-05T21:00:01Z',
  actorRef: 'reality',
});
const verified = createEKREvent({
  eventId: 'event:002',
  assertionId: assertion.id,
  continuityRootId: assertion.continuity_root,
  worldlineId: assertion.worldline_id,
  eventType: 'VERIFICATION_CONFIRMED',
  eventPayload: { verification_level: 'verified_outcome' },
  evidenceRefs: ['verification:001'],
  occurredAt: '2026-10-05T21:01:00Z',
  recordedAt: '2026-10-05T21:01:00Z',
  actorRef: 'reality',
  previousEventHash: asserted.event_hash,
});
const contradicted = createEKREvent({
  eventId: 'event:003',
  assertionId: assertion.id,
  continuityRootId: assertion.continuity_root,
  worldlineId: assertion.worldline_id,
  eventType: 'CONTRADICTED',
  eventPayload: { reason: 'new observation conflicts with proposition' },
  evidenceRefs: ['evidence:003'],
  occurredAt: '2026-10-05T21:02:00Z',
  recordedAt: '2026-10-05T21:02:00Z',
  actorRef: 'reality',
  previousEventHash: verified.event_hash,
});

assert.equal(foldEKRState(assertion, [asserted, verified]).epistemic_state, 'HYPOTHESIS');
assert.equal(foldEKRState(assertion, [asserted, verified]).verification_level, 'verified_outcome');
assert.equal(foldEKRState(assertion, [asserted, verified]).applicability_status, 'RELEVANT');
assert.equal(foldEKRState(assertion, [asserted, verified, contradicted]).epistemic_state, 'OBSOLETE');

assert.throws(() => validateEKRVerification({
  verificationLevel: 'verified_outcome',
  verificationLineage: { execution_receipt_ref: 'x', target_observation_ref: 'y' },
}), /INDEPENDENT_VERIFICATION_LINEAGE_REQUIRED/);
assert.throws(() => validateEKRVerification({
  verificationLevel: 'execution_receipt',
  verificationLineage: {},
  eventType: 'VERIFICATION_CONFIRMED',
}), /VERIFICATION_CONFIRMATION_REQUIRES_INDEPENDENT_VERIFICATION/);

assert.deepEqual(
  evaluateEKRReuse({
    relevance: 'RELEVANT',
    applicability: 'APPLICABLE',
    contradictionStatus: 'NONE_KNOWN',
    falsificationStatus: 'NO_TRIGGER',
    verificationSufficiency: 'SUFFICIENT',
  }).reuse_decision,
  'SAFE_TO_REUSE',
);
assert.equal(evaluateEKRReuse({
  relevance: 'RELEVANT',
  applicability: 'NOT_APPLICABLE',
  falsificationStatus: 'NO_TRIGGER',
  verificationSufficiency: 'SUFFICIENT',
}).reuse_decision, 'DO_NOT_REUSE');
assert.equal(evaluateEKRReuse({
  relevance: 'RELEVANT',
  applicability: 'UNKNOWN',
  falsificationStatus: 'NO_TRIGGER',
  verificationSufficiency: 'SUFFICIENT',
}).reuse_decision, 'INSUFFICIENT_EVIDENCE');
assert.equal(evaluateEKRReuse({
  relevance: 'RELEVANT',
  applicability: 'APPLICABLE',
  contradictionStatus: 'SUPERSEDED',
  falsificationStatus: 'NO_TRIGGER',
  verificationSufficiency: 'SUFFICIENT',
  epistemicState: 'SUPERSEDED',
}).reuse_decision, 'DO_NOT_REUSE');

const migrated = migrateLegacyEKRv01({ id: 'legacy:001', verified_outcome: 'paid' });
assert.equal(migrated.legacy_status, 'DEGRADED');
assert.equal(migrated.reuse_policy, 'REQUIRES_REVALIDATION');
assert.equal(migrated.verification_completeness, 'UNKNOWN');

assertAppendOnlyEventStream([asserted, verified, contradicted]);
assert.throws(() => assertAppendOnlyEventStream([verified, contradicted]), /EKR_EVENT_CHAIN_BROKEN/);
assert.throws(() => assertAppendOnlyEventStream([asserted, asserted]), /EKR_DUPLICATE_EVENT_ID/);

// Assertion mutation is structurally prevented in strict mode.
assert.throws(() => { assertion.foo = 'mutation'; }, TypeError);

console.log('EKR v0.2: PASS');
