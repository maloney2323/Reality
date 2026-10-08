import assert from 'node:assert/strict';
import {
  CONSTITUTIONAL_LEARNING_VERSION,
  evaluateVerifiedOutcome,
  proposePolicyMutation,
} from '../src/reality-constitutional-learning-v1.0.js';

const unverified = evaluateVerifiedOutcome({
  warrant: { warrant_id: 'w1' },
  outcome: { verification_status: 'UNVERIFIED', result: 'REGRESSION' },
  policy: { version: 'friction-v1' },
});
assert.equal(unverified.learning_status, 'REJECTED');
assert.equal(unverified.policy_mutation_authorized, false);

const candidate = evaluateVerifiedOutcome({
  warrant: { warrant_id: 'w2' },
  outcome: { verification_status: 'VERIFIED', result: 'REGRESSION', expected: false },
  policy: { version: 'friction-v1' },
});
assert.equal(CONSTITUTIONAL_LEARNING_VERSION, 'reality-constitutional-learning-v1.0');
assert.equal(candidate.learning_status, 'MUTATION_CANDIDATE');
assert.equal(candidate.policy_mutation_authorized, false);
assert.equal(candidate.constitutional_gate_required, true);

const proposal = proposePolicyMutation({
  verifiedOutcome: candidate,
  pattern: { action_class: 'DEPLOYMENT_RECOVERY', evidence_pattern: 'single-source-health-signal' },
  policy: { version: 'friction-v1' },
});
assert.equal(proposal.state, 'PROPOSED');
assert.equal(proposal.change.type, 'INCREASE_FRICTION');
assert.equal(proposal.policy_mutation_authorized, false);
assert.equal(proposal.active_policy_version, null);
assert.equal(proposal.constitutional_gate_required, true);

console.log('REALITY_CONSTITUTIONAL_LEARNING_V1_0_PASS');
