/**
 * Reality Constitutional Learning Bridge v1.0
 *
 * Binds the production governed-execution outcome shape to the constitutional
 * learning engine. No LLM is involved. No authority is created. No policy is
 * mutated here.
 */
import crypto from 'node:crypto';
import { evaluateVerifiedOutcome, proposePolicyMutation } from './reality-constitutional-learning-v1.0.js';

export const CONSTITUTIONAL_LEARNING_BRIDGE_VERSION = 'reality-constitutional-learning-bridge-v1.0';

const digest = (v) => crypto.createHash('sha256').update(JSON.stringify(v ?? null)).digest('hex');

export function createVerifiedOutcomeFromExecution({ executionResult, workItem = {}, policy = {} } = {}) {
  if (!executionResult || executionResult.status !== 'VERIFIED') {
    throw new Error('VERIFIED_EXECUTION_RESULT_REQUIRED');
  }
  if (executionResult.outcome?.verified !== true) throw new Error('INDEPENDENT_VERIFICATION_REQUIRED');
  if (executionResult.outcome?.independent !== true) throw new Error('INDEPENDENT_VERIFIER_REQUIRED');

  const outcomeState = executionResult.outcome.outcome_state || 'VERIFIED_OUTCOME';
  const mismatch = executionResult.outcome.mismatch;
  const regression = outcomeState === 'VERIFIED_REGRESSION' || mismatch === true || mismatch?.regression === true;

  return Object.freeze({
    outcome_id: `verified-outcome:${digest({ execution: executionResult.execution?.provider_execution_id ?? null, work: workItem.work_item_id ?? null, verification: executionResult.verification })}`,
    verification_status: 'VERIFIED',
    result: regression ? 'REGRESSION' : 'SUCCESS',
    expected: regression ? false : true,
    execution_receipt: executionResult.execution ?? null,
    verification_receipt: executionResult.verification ?? null,
    work_item_id: workItem.work_item_id ?? null,
    policy_version: policy.version ?? null,
    evidence_references: [
      executionResult.execution?.provider_execution_id,
      executionResult.verification?.observationId,
      executionResult.verification?.verificationId,
    ].filter(Boolean),
  });
}

export function learnFromVerifiedExecution({ executionResult, workItem = {}, policy = {}, failurePattern = {} } = {}) {
  const verifiedOutcome = createVerifiedOutcomeFromExecution({ executionResult, workItem, policy });
  const learning = evaluateVerifiedOutcome({
    warrant: {
      warrant_id: executionResult.verification?.verificationId ?? executionResult.execution?.provider_execution_id ?? verifiedOutcome.outcome_id,
    },
    outcome: verifiedOutcome,
    policy,
  });

  if (learning.learning_status !== 'MUTATION_CANDIDATE') {
    return Object.freeze({
      bridge_version: CONSTITUTIONAL_LEARNING_BRIDGE_VERSION,
      verified_outcome: verifiedOutcome,
      learning,
      policy_mutation: null,
    });
  }

  const policyMutation = proposePolicyMutation({
    verifiedOutcome: learning,
    pattern: failurePattern,
    policy,
  });

  return Object.freeze({
    bridge_version: CONSTITUTIONAL_LEARNING_BRIDGE_VERSION,
    verified_outcome: verifiedOutcome,
    learning,
    policy_mutation: policyMutation,
  });
}
