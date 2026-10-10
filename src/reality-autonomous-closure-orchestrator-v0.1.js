import { runUniverseCognitionPass } from './reality-universe-cognition-runner-v0.1.js';
import { createCapabilityGapProjection } from './reality-capability-gap-projection-v1.js';
import { detectCapabilityGap, confirmCapabilityGap, createSandboxExperiment, authorizeSandboxExperiment, validateSandboxResult, authorizeWorldlineMerge, registerVerifiedCapability, reactivationPlan, handleSynthesisFailure } from './reality-autonomous-capability-loop-v0.1.js';

export const AUTONOMOUS_CLOSURE_VERSION = '0.1.1';

/**
 * Control plane only. It never writes the production graph from a sandbox and
 * never executes external effects.
 *
 * mergeVerifier contract:
 *   verify(experiment) -> { approved: true }
 *   merge(experiment) -> { merged: true, ... }
 */
export async function runAutonomousClosurePass({
  universe, reasoner = null, workItem, capabilities = [], capabilityGap = null,
  historicalFailureRefs = [], verificationSuiteRef = null, inputSchema = null,
  outputSchema = null, synthesis, sandboxVerifier, mergeVerifier,
  capabilityRegistry, authorization = null, attempt = 1, attemptLimit = 3,
} = {}) {
  const cognition = await runUniverseCognitionPass({ universe, reasoner });
  const consequence = capabilityGap || cognition.consequences.find((item) => item?.gap === 'MISSING_CAPABILITY');

  if (!consequence) return Object.freeze({ state: 'NO_CAPABILITY_GAP', cognition, resumed_work_item_id: null });

  const gap = detectCapabilityGap({ consequence, workItem, capabilities });
  if (!gap) return Object.freeze({ state: 'CAPABILITY_ALREADY_REGISTERED', cognition, resumed_work_item_id: workItem?.id || null });

  const capabilityGapProjection = createCapabilityGapProjection({
    sourceDiscoveryId: gap.gap_id,
    requiredCapability: gap.capability_id,
    currentLimitation: 'Required capability is not currently registered for the blocked work.',
    evidenceRefs: gap.required_capability_contract?.verification_suite_ref
      ? [gap.required_capability_contract.verification_suite_ref]
      : [],
    acquisitionPath: 'RESEARCH_THEN_ISOLATED_SANDBOX',
    gapId: gap.gap_id,
    provenance: {
      source: 'reality-autonomous-closure-orchestrator-v0.1',
      cognitive_state: cognition?.state || null,
    },
  });

  const confirmedGap = confirmCapabilityGap(gap, { historicalFailureRefs, inputSchema, outputSchema, verificationSuiteRef });
  const experiment = createSandboxExperiment({ confirmedGap, attempt, attemptLimit, primaryWorldlineId: universe.worldline_id || universe.worldlineId });

  if (!authorization) return Object.freeze({ state: 'AWAITING_AUTHORIZATION', cognition, gap: confirmedGap, capability_gap_projection: capabilityGapProjection, experiment });

  if (!mergeVerifier || typeof mergeVerifier.verify !== 'function' || typeof mergeVerifier.merge !== 'function') {
    throw new Error('WORLDLINE_MERGE_VERIFIER_CONTRACT_REQUIRED');
  }

  const authorizedExperiment = authorizeSandboxExperiment(experiment, authorization);

  try {
    if (!synthesis || typeof synthesis.run !== 'function') throw new Error('SANDBOX_SYNTHESIS_ADAPTER_REQUIRED');
    if (!sandboxVerifier || typeof sandboxVerifier.verify !== 'function') throw new Error('SANDBOX_VERIFIER_REQUIRED');

    const synthesizedCapability = await synthesis.run({
      gap: confirmedGap, experiment: authorizedExperiment, production_graph_write_permitted: false,
    });
    const verification = await sandboxVerifier.verify({
      capability: synthesizedCapability, experiment: authorizedExperiment,
      frozen_historical_failure_refs: confirmedGap.frozen_historical_failure_refs,
    });
    const verifiedExperiment = validateSandboxResult(authorizedExperiment, {
      synthesizedCapability, frozenRegression: verification?.frozen_regression,
      isolatedVerification: verification?.isolated_verification,
      capabilitySignature: verification?.capability_signature,
    });
    const mergeApproval = await mergeVerifier.verify(verifiedExperiment);
    const mergedExperiment = authorizeWorldlineMerge(verifiedExperiment, { mergeVerifier: () => mergeApproval });
    const mergeResult = await mergeVerifier.merge(mergedExperiment);
    const registration = registerVerifiedCapability(mergedExperiment, { capabilityRegistry, mergeResult });
    const reactivation = reactivationPlan(confirmedGap, { registration, originalWorkItem: workItem });

    return Object.freeze({ state: 'REACTIVATED', cognition, gap: confirmedGap, capability_gap_projection: capabilityGapProjection, experiment: mergedExperiment, registration, reactivation });
  } catch (error) {
    const failure = handleSynthesisFailure(authorizedExperiment, { nextAttempt: attempt + 1, attemptLimit });
    return Object.freeze({ state: failure.state, cognition, gap: confirmedGap, capability_gap_projection: capabilityGapProjection, experiment: authorizedExperiment, failure, error: error.message });
  }
}
