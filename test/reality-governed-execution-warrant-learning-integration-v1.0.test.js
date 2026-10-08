import assert from 'node:assert/strict';
import { executeAuthorizedWork } from '../src/reality-governed-execution-engine-v0.1.js';
import { createEvidenceWarrant, attachLearningProposalToWarrant, verifyWarrantChain } from '../src/reality-evidence-warrant-v1.0.js';
import { learnFromVerifiedExecution } from '../src/reality-constitutional-learning-bridge-v1.0.js';

const workItem = {
  work_item_id: 'work:integration-regression',
  workflow_id: 'workflow:integration',
  action_class: 'DEPLOYMENT_RECOVERY',
};

const authorization = {
  authorization_id: 'auth:integration',
  principal_id: 'principal:integration',
  work_item_id: workItem.work_item_id,
  workflow_id: workItem.workflow_id,
  authorized: true,
};

const bridges = {
  async execute() {
    return {
      providerExecutionId: 'provider:integration',
      observation: { deployment: 'completed', health: 'degraded' },
    };
  },
  async verify() {
    return {
      verified: true,
      independent: true,
      basis: 'external_health_probe',
      observationId: 'observation:integration',
      verificationId: 'verification:integration',
      observedState: 'degraded',
      mismatch: { regression: true, expected: 'healthy', observed: 'degraded' },
    };
  },
};

const executionResult = await executeAuthorizedWork({
  workItem,
  workflowId: workItem.workflow_id,
  authorization,
  connector: bridges,
  independentVerifier: bridges,
});

assert.equal(executionResult.status, 'VERIFIED');
assert.equal(executionResult.outcome.independent, true);

const warrant = createEvidenceWarrant({
  observationRefs: ['observation:integration'],
  evidenceRefs: ['evidence:integration'],
  transformationReceiptRefs: ['transform:integration'],
  epistemicAssessment: { state: 'SUPPORTED', score: 82 },
  frictionDecision: { level: 'HIGH', required_verification: ['INDEPENDENT_EXTERNAL_VERIFICATION'] },
  attentionDecision: { disposition: 'PROPOSE_GOVERNED_WORK' },
  workProposal: workItem,
  authorityArtifact: authorization,
  executionReceipt: executionResult.execution,
  verificationReceipt: executionResult.verification,
  outcome: executionResult.outcome,
  policyVersion: 'friction-policy:1',
});

const learning = learnFromVerifiedExecution({
  executionResult,
  workItem,
  policy: { version: 'friction-policy:1' },
  failurePattern: { action_class: workItem.action_class, evidence_pattern: 'health-signal-only' },
});

assert.equal(learning.learning.learning_status, 'MUTATION_CANDIDATE');
assert.equal(learning.policy_mutation.state, 'PROPOSED');
assert.equal(learning.policy_mutation.policy_mutation_authorized, false);
assert.equal(learning.policy_mutation.constitutional_gate_required, true);

const learningWarrant = attachLearningProposalToWarrant({
  warrant,
  learningProposal: learning.policy_mutation,
});

assert.equal(learningWarrant.parent_warrant_hash, warrant.warrant_hash);
assert.equal(learningWarrant.learning_proposal.state, 'PROPOSED');
assert.equal(verifyWarrantChain([warrant, learningWarrant]).valid, true);

console.log('REALITY_GOVERNED_EXECUTION_WARRANT_LEARNING_INTEGRATION_V1_0_PASS');
