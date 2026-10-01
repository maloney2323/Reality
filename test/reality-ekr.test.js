import assert from 'node:assert/strict';
import {
  EKR_VERSION,
  createEKR,
  retrieveApplicableEKR,
  retrieveRelevantEKR,
  buildEpistemicPrior,
  invalidateContradictedEKR,
} from '../src/reality-ekr.js';

const prior = createEKR({
  id: 'ekr-test-001',
  context: { dependencyVersion: 'v2', apiVersion: '2026.09' },
  condition: { type: 'minimum', field: 'capacity', value: 50 },
  verifiedOutcome: 'migration succeeds',
  resolution: 'Migration succeeded when the dependency/API context matched and capacity was >= 50.',
  evidenceRefs: ['receipt-001'],
});

assert.equal(EKR_VERSION, 'reality-ekr-v0.1');

assert.equal(
  retrieveRelevantEKR({
    records: [prior],
    observedContext: { dependencyVersion: 'v2', apiVersion: '2026.09', capacity: 40 },
  }).length,
  1,
);

assert.equal(
  retrieveApplicableEKR({
    records: [prior],
    observedContext: { dependencyVersion: 'v2', apiVersion: '2026.09', capacity: 40 },
  }).length,
  0,
);

assert.equal(
  retrieveRelevantEKR({
    records: [prior],
    observedContext: { dependencyVersion: 'v2', apiVersion: '2026.10', capacity: 80 },
  }).length,
  0,
);

const priorView = buildEpistemicPrior([prior]);
assert.equal(priorView[0].source, 'EKR');
assert.equal(priorView[0].id, 'ekr-test-001');

const obsolete = invalidateContradictedEKR(prior, {
  type: 'verified_contradiction',
  evidenceRef: 'receipt-002',
});
assert.equal(obsolete.epistemic_status, 'OBSOLETE');
assert.equal(obsolete.contradiction.evidenceRef, 'receipt-002');

console.log('EKR minimal learning loop: PASS');
