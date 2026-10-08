import assert from 'node:assert/strict';
import { learnFromVerifiedExecution, CONSTITUTIONAL_LEARNING_BRIDGE_VERSION } from '../src/reality-constitutional-learning-bridge-v1.0.js';

const base = {
  status: 'VERIFIED',
  execution: { provider_execution_id: 'provider:123' },
  verification: { verificationId: 'verification:123', observationId: 'observation:123' },
  outcome: { outcome_state: 'VERIFIED_OUTCOME', verified: true, independent: true, mismatch: true },
};

const result = learnFromVerifiedExecution({
  executionResult: base,
  workItem: { work_item_id: 'work:deploy-recovery' },
  policy: { version: 'friction-policy:1' },
  failurePattern: { action_class: 'DEPLOYMENT_RECOVERY', evidence_pattern: 'health-signal-only' },
});

assert.equal(result.bridge_version, CONSTITUTIONAL_LEARNING_BRIDGE_VERSION);
assert.equal(result.verified_outcome.verification_status, 'VERIFIED');
assert.equal(result.verified_outcome.result, 'REGRESSION');
assert.equal(result.learning.learning_status, 'MUTATION_CANDIDATE');
assert.equal(result.policy_mutation.state, 'PROPOSED');
assert.equal(result.policy_mutation.policy_mutation_authorized, false);
assert.equal(result.policy_mutation.active_policy_version, null);
assert.equal(result.policy_mutation.constitutional_gate_required, true);

const good = learnFromVerifiedExecution({
  executionResult: {
    ...base,
    outcome: { outcome_state: 'VERIFIED_OUTCOME', verified: true, independent: true, mismatch: null },
  },
  workItem: { work_item_id: 'work:healthy' },
  policy: { version: 'friction-policy:1' },
});
assert.equal(good.learning.learning_status, 'RECORDED');
assert.equal(good.policy_mutation, null);

assert.throws(() => learnFromVerifiedExecution({
  executionResult: { status: 'UNRESOLVED', outcome: { verified: false, independent: false } },
}), /VERIFIED_EXECUTION_RESULT_REQUIRED/);

console.log('REALITY_CONSTITUTIONAL_LEARNING_BRIDGE_V1_0_PASS');
