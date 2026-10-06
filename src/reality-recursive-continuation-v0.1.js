import crypto from 'node:crypto';

export const RECURSIVE_CONTINUATION_VERSION = '0.1.1';
export const RECURSIVE_STATES = Object.freeze(['REACTIVATED','RETRYING','BLOCKED','EXECUTING','AWAITING_VERIFICATION','VERIFIED_OUTCOME','LEARNING_COMMITTED','COGNITION_RESUMED','COMPLETED','ESCALATED']);

function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function stable(value) { if (value === null || typeof value !== 'object') return value; if (Array.isArray(value)) return value.map(stable); return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])])); }
function digest(value) { return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }
function freeze(value) { if (!value || typeof value !== 'object') return value; if (Array.isArray(value)) value.forEach(freeze); else Object.values(value).forEach(freeze); return Object.freeze(value); }

export const RECURSIVE_CONTINUATION_INVARIANTS = Object.freeze({
  originalWorkIdentityPreserved: true, reactivationDoesNotCreateNewWork: true,
  executionMustBindToExactWorkAndCapability: true, executionReceiptRequiredForVerification: true,
  failedExecutionCannotReachVerifiedOutcome: true, targetObservationMustBindToExecution: true,
  independentVerificationMustBindToTargetObservation: true, verifiedOutcomeMustBindToVerification: true,
  verifiedOutcomeRequiredForLearning: true, learningFeedsCognition: true,
});

export function createReactivation(workItem, reactivation) {
  if (!workItem?.id) throw new Error('ORIGINAL_WORK_ITEM_REQUIRED');
  if (!reactivation?.continuation_token) throw new Error('CONTINUATION_TOKEN_REQUIRED');
  if (!text(reactivation.capability_id)) throw new Error('CAPABILITY_ID_REQUIRED');
  const binding = { workItemId: workItem.id, continuityRootId: workItem.continuity_root_id || null, worldlineId: workItem.worldline_id || null, capabilityId: reactivation.capability_id, continuationToken: reactivation.continuation_token };
  return freeze({ version: RECURSIVE_CONTINUATION_VERSION, state: 'REACTIVATED', original_work_item_id: text(workItem.id), continuity_root_id: text(workItem.continuity_root_id), worldline_id: text(workItem.worldline_id), capability_id: text(reactivation.capability_id), continuation_token: text(reactivation.continuation_token), reactivation_id: `reactivation:${digest(binding)}`, continuation_binding_hash: digest(binding) });
}

export function beginExactRetry(reactivation, currentWorkItem) {
  if (!reactivation?.reactivation_id) throw new Error('REACTIVATION_REQUIRED');
  if (!currentWorkItem?.id) throw new Error('WORK_ITEM_REQUIRED');
  if (currentWorkItem.id !== reactivation.original_work_item_id) throw new Error('ORIGINAL_WORK_ID_MISMATCH');
  return freeze({ ...reactivation, state: 'RETRYING', retry_work_item_id: currentWorkItem.id, retry_preserves_original_identity: true });
}

export function recordExecution(continuation, executionReceipt) {
  if (!continuation?.reactivation_id) throw new Error('CONTINUATION_REQUIRED');
  if (!executionReceipt?.execution_receipt_hash) throw new Error('EXECUTION_RECEIPT_REQUIRED');
  if (!['RETRYING','EXECUTING'].includes(continuation.state)) throw new Error('EXECUTION_STATE_INVALID');
  const status = text(executionReceipt.status || 'UNKNOWN').toUpperCase();
  if (executionReceipt.work_item_id && executionReceipt.work_item_id !== continuation.original_work_item_id) throw new Error('EXECUTION_WORK_ITEM_MISMATCH');
  if (executionReceipt.capability_id && executionReceipt.capability_id !== continuation.capability_id) throw new Error('EXECUTION_CAPABILITY_MISMATCH');
  return freeze({ ...continuation, state: status === 'FAILED' ? 'BLOCKED' : 'AWAITING_VERIFICATION', execution_receipt_hash: executionReceipt.execution_receipt_hash, execution_status: status, execution_work_item_id: continuation.original_work_item_id, execution_capability_id: continuation.capability_id });
}

export function reconcileVerifiedOutcome(continuation, { targetObservation, independentVerification, verifiedOutcome } = {}) {
  if (!continuation?.execution_receipt_hash) throw new Error('EXECUTION_RECEIPT_REQUIRED');
  if (continuation.execution_status === 'FAILED') throw new Error('FAILED_EXECUTION_CANNOT_VERIFY');
  if (!targetObservation?.observation_id) throw new Error('TARGET_OBSERVATION_REQUIRED');
  if (!independentVerification?.verification_id) throw new Error('INDEPENDENT_VERIFICATION_REQUIRED');
  if (!verifiedOutcome?.outcome_id) throw new Error('VERIFIED_OUTCOME_REQUIRED');
  if (targetObservation.execution_receipt_hash && targetObservation.execution_receipt_hash !== continuation.execution_receipt_hash) throw new Error('TARGET_OBSERVATION_EXECUTION_MISMATCH');
  if (independentVerification.target_observation_id && independentVerification.target_observation_id !== targetObservation.observation_id) throw new Error('INDEPENDENT_VERIFICATION_TARGET_MISMATCH');
  if (verifiedOutcome.independent_verification_id && verifiedOutcome.independent_verification_id !== independentVerification.verification_id) throw new Error('VERIFIED_OUTCOME_VERIFICATION_MISMATCH');
  const causalBinding = { executionReceiptHash: continuation.execution_receipt_hash, targetObservationId: targetObservation.observation_id, independentVerificationId: independentVerification.verification_id, verifiedOutcomeId: verifiedOutcome.outcome_id };
  return freeze({ ...continuation, state: 'VERIFIED_OUTCOME', target_observation_id: targetObservation.observation_id, independent_verification_id: independentVerification.verification_id, verified_outcome_id: verifiedOutcome.outcome_id, causal_binding_hash: digest(causalBinding) });
}

export function commitLearning(continuation, learningDelta) {
  if (continuation?.state !== 'VERIFIED_OUTCOME') throw new Error('VERIFIED_OUTCOME_REQUIRED_BEFORE_LEARNING');
  if (!learningDelta?.learning_delta_id) throw new Error('LEARNING_DELTA_REQUIRED');
  if (learningDelta.source_outcome_ref && learningDelta.source_outcome_ref !== continuation.verified_outcome_id) throw new Error('LEARNING_OUTCOME_MISMATCH');
  return freeze({ ...continuation, state: 'LEARNING_COMMITTED', learning_delta_id: learningDelta.learning_delta_id });
}

export function resumeCognition(continuation, { universeStateId, universeLearningUpdateId } = {}) {
  if (continuation?.state !== 'LEARNING_COMMITTED') throw new Error('LEARNING_COMMIT_REQUIRED_BEFORE_COGNITION');
  if (!universeStateId) throw new Error('UNIVERSE_STATE_REQUIRED');
  if (!universeLearningUpdateId) throw new Error('UNIVERSE_LEARNING_UPDATE_REQUIRED');
  return freeze({ ...continuation, state: 'COGNITION_RESUMED', prior_universe_state_id: universeStateId, universe_learning_update_id: universeLearningUpdateId, recursive_cycle_id: `recursive_cycle:${digest({reactivationId: continuation.reactivation_id, learningDeltaId: continuation.learning_delta_id, universeStateId, universeLearningUpdateId})}` });
}

export function closeRecursiveCycle(continuation, { nextCognitiveStateId } = {}) {
  if (continuation?.state !== 'COGNITION_RESUMED') throw new Error('COGNITION_RESUMPTION_REQUIRED');
  if (!nextCognitiveStateId) throw new Error('NEXT_COGNITIVE_STATE_REQUIRED');
  return freeze({ ...continuation, state: 'COMPLETED', next_cognitive_state_id: nextCognitiveStateId });
}
