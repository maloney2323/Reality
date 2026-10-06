import { createReactivation, beginExactRetry, recordExecution, reconcileVerifiedOutcome, commitLearning, resumeCognition, closeRecursiveCycle } from './reality-recursive-continuation-v0.1.js';

export const RECURSIVE_CLOSURE_CONDUCTOR_VERSION = '0.1.0';

export async function runRecursiveClosure({
  workItem,
  reactivation,
  execution,
  verification,
  learning,
  cognition,
  cycleGuard = {},
} = {}) {
  if (!workItem?.id) throw new Error('ORIGINAL_WORK_ITEM_REQUIRED');
  if (!reactivation?.continuation_token) throw new Error('CONTINUATION_TOKEN_REQUIRED');

  const maxDepth = Number.isInteger(cycleGuard.maxDepth) ? cycleGuard.maxDepth : 1;
  const depth = Number.isInteger(cycleGuard.depth) ? cycleGuard.depth : 0;
  if (depth >= maxDepth) throw new Error('RECURSIVE_CLOSURE_DEPTH_EXCEEDED');

  const reactivated = createReactivation(workItem, reactivation);
  const retry = beginExactRetry(reactivated, workItem);

  if (typeof execution?.run !== 'function') throw new Error('EXECUTION_ADAPTER_REQUIRED');
  const receipt = await execution.run({
    workItem,
    continuation: retry,
  });

  const afterExecution = recordExecution(retry, receipt);
  if (afterExecution.state === 'BLOCKED') {
    return Object.freeze({ state: 'BLOCKED', continuation: afterExecution });
  }

  if (!verification?.observe || !verification?.independentlyVerify) {
    throw new Error('INDEPENDENT_VERIFICATION_ADAPTER_REQUIRED');
  }

  const targetObservation = await verification.observe({
    workItem,
    executionReceipt: receipt,
    continuation: afterExecution,
  });

  const independentVerification = await verification.independentlyVerify({
    workItem,
    executionReceipt: receipt,
    targetObservation,
    continuation: afterExecution,
  });

  const verifiedOutcome = await verification.reconcile({
    workItem,
    executionReceipt: receipt,
    targetObservation,
    independentVerification,
    continuation: afterExecution,
  });

  const afterVerification = reconcileVerifiedOutcome(afterExecution, {
    targetObservation,
    independentVerification,
    verifiedOutcome,
  });

  if (!learning?.create || !cognition?.resume) {
    throw new Error('LEARNING_COGNITION_ADAPTERS_REQUIRED');
  }

  const learningDelta = await learning.create({
    workItem,
    executionReceipt: receipt,
    verifiedOutcome,
    targetObservation,
    independentVerification,
    continuation: afterVerification,
  });

  const afterLearning = commitLearning(afterVerification, learningDelta);

  const universeUpdate = await cognition.resume({
    workItem,
    verifiedOutcome,
    learningDelta,
    continuation: afterLearning,
  });

  const resumed = resumeCognition(afterLearning, {
    universeStateId: universeUpdate.universe_state_id,
    universeLearningUpdateId: universeUpdate.universe_learning_update_id,
  });

  const nextState = await cognition.nextPass({
    workItem,
    priorContinuation: resumed,
    universeUpdate,
  });

  const completed = closeRecursiveCycle(resumed, {
    nextCognitiveStateId: nextState.cognitive_state_id,
  });

  return Object.freeze({
    state: 'COMPLETED',
    continuation: completed,
    executionReceipt: receipt,
    targetObservation,
    independentVerification,
    verifiedOutcome,
    learningDelta,
    universeUpdate,
    nextCognitiveState: nextState,
  });
}

export const RECURSIVE_CLOSURE_INVARIANTS = Object.freeze({
  sameWorkItemRetried: true,
  executionBeforeVerification: true,
  independentVerificationRequired: true,
  verificationBeforeLearning: true,
  learningBeforeCognition: true,
  cognitionResumesFromUpdatedUniverse: true,
  boundedRecursion: true,
});
