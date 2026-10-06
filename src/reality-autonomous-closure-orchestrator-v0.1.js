import {
  runUniverseCognitionPass,
} from './reality-universe-cognition-runner-v0.1.js';
import {
  detectCapabilityGap,
  confirmCapabilityGap,
  createSandboxExperiment,
  authorizeSandboxExperiment,
  validateSandboxResult,
  authorizeWorldlineMerge,
  registerVerifiedCapability,
  reactivationPlan,
  handleSynthesisFailure,
} from './reality-autonomous-capability-loop-v0.1.js';

/**
 * Autonomous Cognitive Closure Orchestrator v0.1
 *
 * This is the missing control-plane layer between cognition and capability
 * acquisition. It does not synthesize code itself and does not execute
 * external effects. It coordinates the bounded state transitions and keeps
 * the original work identity intact.
 *
 * COGNITION
 *   -> GAP
 *   -> CONFIRM
 *   -> SANDBOX
 *   -> VERIFY
 *   -> MERGE
 *   -> REGISTER
 *   -> REACTIVATE
 *   -> COGNITION
 */

export const AUTONOMOUS_CLOSURE_VERSION = '0.1.0';

export async function runAutonomousClosurePass({
  universe,
  reasoner = null,
  workItem,
  capabilities = [],
  capabilityGap = null,
  historicalFailureRefs = [],
  verificationSuiteRef = null,
  inputSchema = null,
  outputSchema = null,
  synthesis,
  sandboxVerifier,
  mergeVerifier,
  capabilityRegistry,
  authorization = null,
  attempt = 1,
  attemptLimit = 3,
} = {}) {
  const cognition = await runUniverseCognitionPass({ universe, reasoner });

  const consequence = capabilityGap || cognition.consequences.find(
    (item) => item?.gap === 'MISSING_CAPABILITY',
  );

  if (!consequence) {
    return Object.freeze({
      state: 'NO_CAPABILITY_GAP',
      cognition,
      resumed_work_item_id: null,
    });
  }

  const gap = detectCapabilityGap({
    consequence,
    workItem,
    capabilities,
  });

  if (!gap) {
    return Object.freeze({
      state: 'CAPABILITY_ALREADY_REGISTERED',
      cognition,
      resumed_work_item_id: workItem?.id || null,
    });
  }

  const confirmedGap = confirmCapabilityGap(gap, {
    historicalFailureRefs,
    inputSchema,
    outputSchema,
    verificationSuiteRef,
  });

  const experiment = createSandboxExperiment({
    confirmedGap,
    attempt,
    attemptLimit,
    primaryWorldlineId: universe.worldline_id,
  });

  if (!authorization) {
    return Object.freeze({
      state: 'AWAITING_AUTHORIZATION',
      cognition,
      gap: confirmedGap,
      experiment,
    });
  }

  const authorizedExperiment = authorizeSandboxExperiment(experiment, authorization);

  try {
    if (!synthesis || typeof synthesis.run !== 'function') {
      throw new Error('SANDBOX_SYNTHESIS_ADAPTER_REQUIRED');
    }
    if (!sandboxVerifier || typeof sandboxVerifier.verify !== 'function') {
      throw new Error('SANDBOX_VERIFIER_REQUIRED');
    }

    const synthesizedCapability = await synthesis.run({
      gap: confirmedGap,
      experiment: authorizedExperiment,
      production_graph_write_permitted: false,
    });

    const verification = await sandboxVerifier.verify({
      capability: synthesizedCapability,
      experiment: authorizedExperiment,
      frozen_historical_failure_refs: confirmedGap.frozen_historical_failure_refs,
    });

    const verifiedExperiment = validateSandboxResult(authorizedExperiment, {
      synthesizedCapability,
      frozenRegression: verification?.frozen_regression,
      isolatedVerification: verification?.isolated_verification,
      capabilitySignature: verification?.capability_signature,
    });

    const mergedExperiment = authorizeWorldlineMerge(verifiedExperiment, {
      mergeVerifier,
    });

    const registration = registerVerifiedCapability(mergedExperiment, {
      capabilityRegistry,
      mergeResult: await mergeVerifier.merge(mergedExperiment),
    });

    const reactivation = reactivationPlan(confirmedGap, {
      registration,
      originalWorkItem: workItem,
    });

    return Object.freeze({
      state: 'REACTIVATED',
      cognition,
      gap: confirmedGap,
      experiment: mergedExperiment,
      registration,
      reactivation,
    });
  } catch (error) {
    const failure = handleSynthesisFailure(authorizedExperiment, {
      nextAttempt: attempt + 1,
      attemptLimit,
    });

    return Object.freeze({
      state: failure.state,
      cognition,
      gap: confirmedGap,
      experiment: authorizedExperiment,
      failure,
    });
  }
}
