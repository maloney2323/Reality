/**
 * Reality Constitutional Learning Engine v1.0
 *
 * Turns independently verified outcomes into policy-mutation proposals.
 * It never mutates active policy and never grants authority.
 */
import crypto from 'node:crypto';

export const CONSTITUTIONAL_LEARNING_VERSION = 'reality-constitutional-learning-v1.0';

const id = (prefix, value) => `${prefix}:${crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,24)}`;

export function evaluateVerifiedOutcome({ warrant = {}, outcome = {}, policy = {} } = {}) {
  if (outcome.verification_status !== 'VERIFIED') {
    return {
      learning_status: 'REJECTED',
      reason: 'VERIFIED_OUTCOME_REQUIRED',
      policy_mutation_authorized: false,
    };
  }

  const regression = outcome.result === 'REGRESSION' || outcome.expected === false;
  if (!regression) {
    return {
      learning_status: 'RECORDED',
      reason: 'NO_POLICY_MUTATION_TRIGGER',
      policy_mutation_authorized: false,
    };
  }

  return {
    learning_status: 'MUTATION_CANDIDATE',
    reason: 'VERIFIED_OUTCOME_CONTRADICTS_PRIOR_POLICY_EXPECTATION',
    source_warrant_id: warrant.warrant_id ?? null,
    prior_policy_version: policy.version ?? null,
    policy_mutation_authorized: false,
    adversarial_review_required: true,
    constitutional_gate_required: true,
    proposed_effect: 'INCREASE_EPISTEMIC_FRICTION_FOR_RECURRENT_FAILURE_PATTERN',
  };
}

export function proposePolicyMutation({ verifiedOutcome, pattern = {}, policy = {} } = {}) {
  if (verifiedOutcome?.learning_status !== 'MUTATION_CANDIDATE') {
    throw new Error('MUTATION_CANDIDATE_REQUIRED');
  }

  const proposal = {
    mutation_proposal_id: id('policy-mutation', { verifiedOutcome, pattern, policy }),
    state: 'PROPOSED',
    source_warrant_id: verifiedOutcome.source_warrant_id,
    prior_policy_version: policy.version ?? null,
    pattern,
    change: {
      type: 'INCREASE_FRICTION',
      target: pattern.action_class ?? 'UNSPECIFIED',
      additional_requirements: ['INDEPENDENT_CORROBORATION', 'POST_ACTION_VERIFICATION'],
    },
    adversarial_review_required: true,
    constitutional_gate_required: true,
    policy_mutation_authorized: false,
    active_policy_version: null,
  };

  return proposal;
}
