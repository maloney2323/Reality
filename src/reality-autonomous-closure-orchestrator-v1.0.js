import { runUniverseCognitionPass } from './reality-universe-cognition-runner-v0.1.js';
import { discoverAutonomousWork } from './reality-capability-gap-detector-v1.0.js';
import { createCapabilityGapProjection } from './reality-capability-gap-projection-v1.js';
import { detectCapabilityGap, confirmCapabilityGap, createSandboxExperiment, authorizeSandboxExperiment, validateSandboxResult, authorizeWorldlineMerge, registerVerifiedCapability, reactivationPlan, handleSynthesisFailure } from './reality-autonomous-capability-loop-v1.0.js';

export const AUTONOMOUS_CLOSURE_VERSION = '1.0.0';

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
  capabilityRegistry, authorization = null, promotionAuthorization = null,
  attempt = 1, attemptLimit = 3,
  existingWork = [], minimumRecurrences = 2, minRevenue = 0,
} = {}) {
  const cognition = await runUniverseCognitionPass({ universe, reasoner });

  // Work discovery is now a first-class input to autonomous closure.
  // It may identify recurring/revenue-bearing work, but never grants authority.
  const workDiscovery = discoverAutonomousWork({
    observations: cognition?.observations || [],
    existingWork,
    minimumRecurrences,
    minRevenue,
  });

  const consequence = capabilityGap || cognition.consequences.find((item) => item?.gap === 'MISSING_CAPABILITY');

  if (!consequence) return Object.freeze({ state: 'NO_CAPABILITY_GAP', cognition, work_discovery: workDiscovery, resumed_work_item_id: null });

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
      source: 'reality-autonomous-closure-orchestrator-v1.0',
      cognitive_state: cognition?.state || null,
    },
  });

  // A gap cannot borrow the identity or authority of another work/worldline.
  if (!workItem?.id || !workItem?.continuity_root_id || !workItem?.worldline_id ||
      workItem.worldline_id !== cognition.state?.worldline_id ||
      workItem.continuity_root_id !== cognition.state?.continuity_root_id) {
    throw new Error('ORIGINAL_WORK_UNIVERSE_SCOPE_MISMATCH');
  }
  const confirmedGap = confirmCapabilityGap(gap, { historicalFailureRefs, inputSchema, outputSchema, verificationSuiteRef });
  const experiment = createSandboxExperiment({
    confirmedGap, attempt, attemptLimit,
    primaryWorldlineId: cognition.state.worldline_id,
  });
  const partial = {
    cognition, work_discovery: workDiscovery, gap: confirmedGap,
    capability_gap_projection: capabilityGapProjection,
    original_work_item_id: workItem.id,
    original_work_executed: false, job_completed: false,
    external_effects_executed: false,
  };

  if (!authorization) return Object.freeze({
    ...partial, state: 'AWAITING_AUTHORIZATION', experiment,
  });

  const authorizedExperiment = authorizeSandboxExperiment(experiment, authorization);
  let verifiedExperiment;
  try {
    if (typeof synthesis?.run !== 'function') throw new Error('SANDBOX_SYNTHESIS_ADAPTER_REQUIRED');
    if (typeof sandboxVerifier?.verify !== 'function') throw new Error('SANDBOX_VERIFIER_REQUIRED');

    const synthesizedCapability = await synthesis.run({
      gap: confirmedGap, experiment: authorizedExperiment,
      production_graph_write_permitted: false,
    });
    const verification = await sandboxVerifier.verify({
      capability: synthesizedCapability, experiment: authorizedExperiment,
      frozen_historical_failure_refs: confirmedGap.frozen_historical_failure_refs,
    });
    verifiedExperiment = validateSandboxResult(authorizedExperiment, {
      synthesizedCapability,
      frozenRegression: verification?.frozen_regression,
      isolatedVerification: verification?.isolated_verification,
      capabilitySignature: verification?.capability_signature,
    });
  } catch (error) {
    const failure = handleSynthesisFailure(authorizedExperiment, {
      nextAttempt: attempt + 1, attemptLimit,
    });
    return Object.freeze({...partial, state:failure.state,
      experiment:authorizedExperiment,failure,error:error.message,
    });
  }

  // This state must be visible and persistable before obtaining independent,
  // authenticated promotion authorization from a trusted owner service.
  if (!promotionAuthorization) return Object.freeze({
    ...partial, state:'AWAITING_PROMOTION_AUTHORIZATION',
    experiment:verifiedExperiment,upgrade_verified_in_sandbox:true,
    promotion_authorized:false,
  });
  if (!mergeVerifier || typeof mergeVerifier.verify!=='function' ||
      typeof mergeVerifier.merge!=='function') {
    throw Error('WORLDLINE_MERGE_VERIFIER_CONTRACT_REQUIRED');
  }
  // Check exact owner-supplied scope BEFORE invoking the merge adapter.
  // This pure control plane does not authenticate the owner; a future live
  // entry point MUST supply trusted, server-verified promotionAuthorization.
  if (promotionAuthorization.approved!==true ||
      promotionAuthorization.original_work_item_id!==workItem.id ||
      promotionAuthorization.verification_hash!==verifiedExperiment.verification_hash ||
      promotionAuthorization.target_worldline_id!==cognition.state.worldline_id ||
      !promotionAuthorization.authorization_ref ||
      !promotionAuthorization.authorized_by)
    throw Error('EXACT_SEPARATE_PROMOTION_AUTHORIZATION_REQUIRED');

  let mergedExperiment;
  try {
    const mergeApproval = await mergeVerifier.verify(verifiedExperiment);
    mergedExperiment = authorizeWorldlineMerge(verifiedExperiment,{
      mergeVerifier:()=>mergeApproval,promotionAuthorization,originalWorkItem:workItem,
    });
  } catch (error) {
    return Object.freeze({...partial,state:'PROMOTION_REJECTED',
      experiment:verifiedExperiment,error:error.message,
      promotion_authorized:false,
    });
  }
  // Any exception from here is an UNCERTAIN MERGE, not a new synthesis retry.
  // An external write may already have happened, so do not re-dispatch.
  try {
    const mergeResult = await mergeVerifier.merge(mergedExperiment);
    const registration = registerVerifiedCapability(mergedExperiment,{
      capabilityRegistry,mergeResult,
    });
    const reactivation = reactivationPlan(confirmedGap,{
      registration,originalWorkItem:workItem,
    });
    return Object.freeze({...partial,state:'REACTIVATION_READY',
      experiment:mergedExperiment,registration,reactivation,
      upgrade_verified_in_sandbox:true,
      upgrade_promoted_by_adapter:true,
      original_work_executed:false,job_completed:false,
      continuation_requires_fresh_work_authorization:true,
    });
  } catch (error) {
    return Object.freeze({...partial,state:'MERGE_OR_REGISTRATION_OUTCOME_UNCERTAIN',
      experiment:mergedExperiment,error:error.message,
      retry_allowed:false,read_only_reconciliation_required:true,
    });
  }
}
