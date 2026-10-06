import assert from 'node:assert/strict';
import {
  createEvolutionState,
  detectLimitation,
  rankEvolutionOpportunities,
  proposeUpgrade,
  authorizeUpgradeSandbox,
  beginSandboxExperiment,
  verifyUpgradeExperiment,
  promoteVerifiedUpgrade,
  commitEvolutionLearning,
  replanAfterLearning,
  selectNextEvolution,
} from '../src/reality-self-evolution-v0.1.js';

const objective = {
  id: 'objective:resolve-shipment',
  statement: 'Resolve the shipment using verified carrier state.',
};

const universeState = {
  state_id: 'cognitive_state:baseline',
  continuity_root_id: 'root:shipment',
  worldline_id: 'worldline:production',
};

let state = createEvolutionState({
  objective,
  universeState,
  governanceKernelHash: 'sha256:governance-kernel-v1',
});

assert.equal(state.state, 'EVOLUTION_IDLE');
assert.equal(state.production_graph_write_permitted, false);

state = detectLimitation({
  evolutionState: state,
  consequences: [{
    gap: 'MISSING_CAPABILITY',
    subject: 'carrier-status-lookup',
    basis_refs: ['work:shipment-8472'],
    evidence_quality: 0.95,
  }],
});
assert.equal(state.state, 'LIMITATION_DETECTED');
assert.equal(state.limitation.class, 'MISSING_CAPABILITY');

state = rankEvolutionOpportunities({
  evolutionState: state,
  opportunities: [{
    id: 'upgrade:carrier-status-lookup-v1',
    strategy: 'Acquire a bounded carrier status lookup capability in an ephemeral worldline.',
    expected_impact: 10,
    probability_of_success: 0.8,
    uncertainty_reduction: 0.9,
    urgency: 0.9,
    cost: 2,
    risk: 0.1,
    objective_relevance: 1,
    evidence_quality: 0.9,
  }],
});
assert.equal(state.state, 'OPPORTUNITY_RANKED');

state = proposeUpgrade({
  evolutionState: state,
  proposal: {
    id: 'upgrade:carrier-status-lookup-v1',
    strategy: 'Acquire and validate the missing capability without modifying governance.',
    candidate_artifact_ref: 'candidate:carrier-status-lookup-v1',
    verification_suite_ref: 'suite:carrier-status-v1',
    regression_suite_ref: 'suite:reality-regression-v1',
    capability_signature: 'sig:candidate-v1',
  },
});
assert.equal(state.state, 'UPGRADE_PROPOSED');

state = authorizeUpgradeSandbox({
  evolutionState: state,
  authorization: {
    approved: true,
    authorization_ref: 'auth:sandbox-001',
    authorized_by: 'human:explicit',
  },
});
assert.equal(state.state, 'AWAITING_AUTHORIZATION');

state = beginSandboxExperiment({
  evolutionState: state,
  experiment: {
    id: 'experiment:carrier-status-v1',
    ephemeral_worldline_id: 'worldline:ephemeral:carrier-status-v1',
    baseline_ref: 'baseline:frozen-shipment',
    candidate_artifact_ref: 'candidate:carrier-status-lookup-v1',
  },
});
assert.equal(state.state, 'SANDBOX_RUNNING');
assert.equal(state.sandbox.production_graph_write_permitted, false);

state = verifyUpgradeExperiment({
  evolutionState: state,
  verification: {
    experiment_id: 'experiment:carrier-status-v1',
    independently_verified: true,
    regression_passed: true,
    governance_preserved: true,
    improvement_demonstrated: true,
    verification_ref: 'verification:carrier-status-v1',
    independent_verification_ref: 'verification:independent-carrier-status-v1',
    regression_ref: 'regression:carrier-status-v1',
    capability_signature: 'sig:carrier-status-v1',
    improvement_metrics: { accuracy_delta: 0.25 },
  },
});
assert.equal(state.state, 'SANDBOX_VERIFIED');

state = promoteVerifiedUpgrade({
  evolutionState: state,
  promotion: {
    approved: true,
    promotion_ref: 'promotion:carrier-status-v1',
    approved_by: 'promotion-authority:test',
  },
});
assert.equal(state.state, 'PROMOTED');

state = commitEvolutionLearning({
  evolutionState: state,
  verifiedOutcome: {
    id: 'outcome:shipment-8472',
    kind: 'VERIFIED_OUTCOME',
  },
  learningDelta: {
    learning_delta_id: 'learning_delta:shipment-8472',
    prior_state_id: 'cognitive_state:baseline',
    changed_claims: ['shipment status can be resolved from independent carrier readback'],
    capability_effects: ['carrier-status-lookup'],
  },
});
assert.equal(state.state, 'LEARNING_COMMITTED');

state = replanAfterLearning({
  evolutionState: state,
  updatedUniverseState: {
    state_id: 'cognitive_state:after-learning',
  },
});
assert.equal(state.state, 'REPLANNED');
assert.equal(state.prior_universe_state_id, 'cognitive_state:baseline');
assert.equal(state.universe_state_id, 'cognitive_state:after-learning');

const selection = selectNextEvolution({
  objective,
  universeState: { state_id: 'cognitive_state:after-learning' },
  limitations: [{
    class: 'REASONING_LIMIT',
    subject: 'dependency-detection',
  }],
  opportunities: [{
    id: 'upgrade:dependency-reasoner-v2',
    limitation_class: 'REASONING_LIMIT',
    target_subject: 'dependency-detection',
    strategy: 'Add dependency-aware reasoning.',
    expected_impact: 8,
    probability_of_success: 0.7,
    uncertainty_reduction: 0.8,
    urgency: 0.6,
    cost: 2,
    risk: 0.2,
    objective_relevance: 0.9,
    evidence_quality: 0.9,
  }],
});
assert.equal(selection.no_action, false);
assert.equal(selection.selected_opportunity.id, 'upgrade:dependency-reasoner-v2');

// Adversarial gates: self-modification and failed verification must fail closed.
const cleanState = createEvolutionState({
  objective,
  universeState,
  governanceKernelHash: 'sha256:governance-kernel-v1',
});
const limited = detectLimitation({
  evolutionState: cleanState,
  consequences: [{ gap: 'REASONING_LIMIT', subject: 'dependency-detection' }],
});
const ranked = rankEvolutionOpportunities({
  evolutionState: limited,
  opportunities: [{
    id: 'upgrade:test',
    strategy: 'candidate',
    expected_impact: 1,
    probability_of_success: 1,
    uncertainty_reduction: 1,
    cost: 1,
    risk: 0,
  }],
});

assert.throws(() => proposeUpgrade({
  evolutionState: ranked,
  proposal: {
    id: 'upgrade:forbidden',
    strategy: 'rewrite governance',
    modifies_governance: true,
  },
}), /GOVERNANCE_SELF_MODIFICATION_FORBIDDEN/);

const authorized = authorizeUpgradeSandbox({
  evolutionState: proposeUpgrade({
    evolutionState: ranked,
    proposal: {
      id: 'upgrade:test',
      strategy: 'candidate',
      capability_signature: 'sig:test',
    },
  }),
  authorization: {
    approved: true,
    authorization_ref: 'auth:test',
  },
});
const sandbox = beginSandboxExperiment({
  evolutionState: authorized,
  experiment: {
    id: 'experiment:test',
    ephemeral_worldline_id: 'worldline:ephemeral:test',
  },
});

const failed = verifyUpgradeExperiment({
  evolutionState: sandbox,
  verification: {
    experiment_id: 'experiment:test',
    independently_verified: false,
    regression_passed: true,
    governance_preserved: true,
    improvement_demonstrated: true,
    verification_ref: 'verification:failed',
  },
});
assert.equal(failed.state, 'BLOCKED');
assert.equal(failed.block_reason, 'INDEPENDENT_VERIFICATION_FAILED');

console.log('SELF_EVOLUTION_V0_1_PASS');
