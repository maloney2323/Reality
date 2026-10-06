import crypto from 'node:crypto';

export const AUTONOMOUS_CAPABILITY_LOOP_VERSION = '0.1.0';

export const CAPABILITY_LOOP_STATES = Object.freeze([
  'GAP_DETECTED',
  'GAP_CONFIRMED',
  'SANDBOX_PROPOSED',
  'AWAITING_AUTHORIZATION',
  'SANDBOX_SYNTHESIS',
  'SANDBOX_VALIDATION',
  'SANDBOX_VERIFIED',
  'WORLDLINE_MERGE_PENDING',
  'REGISTERED',
  'REACTIVATED',
  'ESCALATED',
  'ABANDONED',
]);

const DEFAULT_ATTEMPT_LIMIT = 3;

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function stable(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stable);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

function freeze(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) value.forEach(freeze);
  else Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

/**
 * Autonomous Capability Closure v0.1
 *
 * This is the controlled handoff between:
 *   cognitive gap detection
 *       -> sandboxed capability acquisition
 *       -> frozen historical validation
 *       -> ephemeral worldline verification
 *       -> canonical capability registration
 *       -> exact blocked-work reactivation
 *
 * The module does not execute code, mutate production capabilities, or merge
 * a worldline. Those are injected adapter boundaries with explicit gates.
 */

export const AUTONOMOUS_CAPABILITY_LOOP_INVARIANTS = Object.freeze({
  gapMustBeExplicit: true,
  onlyMissingCapabilityEntersSynthesis: true,
  productionGraphIsNeverWrittenBySandbox: true,
  historicalRegressionIsRequired: true,
  sandboxVerificationIsRequired: true,
  capabilitySignatureRequiredForRegistration: true,
  ephemeralWorldlineRequiredForExperiment: true,
  failedExperimentCannotMerge: true,
  attemptBudgetIsFinite: true,
  exhaustedBudgetEscalates: true,
  originalWorkIdentityMustBePreserved: true,
});

export function detectCapabilityGap({
  consequence,
  workItem,
  capabilities = [],
} = {}) {
  if (!consequence || consequence.gap !== 'MISSING_CAPABILITY') return null;

  const capabilityId = text(consequence.subject);
  if (!capabilityId) throw new Error('CAPABILITY_GAP_ID_REQUIRED');

  const registered = new Set(
    list(capabilities).map((capability) => text(capability?.id || capability?.name)).filter(Boolean),
  );

  if (registered.has(capabilityId)) return null;

  return freeze({
    loop_version: AUTONOMOUS_CAPABILITY_LOOP_VERSION,
    state: 'GAP_DETECTED',
    gap_id: `capability_gap:${digest({
      capabilityId,
      workItemId: workItem?.id || null,
      continuityRootId: workItem?.continuity_root_id || null,
    })}`,
    capability_id: capabilityId,
    work_item_id: text(workItem?.id),
    continuity_root_id: text(workItem?.continuity_root_id),
    worldline_id: text(workItem?.worldline_id),
    required_capability_contract: workItem?.capability_contract || null,
  });
}

export function confirmCapabilityGap(gap, {
  historicalFailureRefs = [],
  inputSchema = null,
  outputSchema = null,
  verificationSuiteRef = null,
} = {}) {
  if (!gap?.gap_id) throw new Error('CAPABILITY_GAP_REQUIRED');
  if (gap.state !== 'GAP_DETECTED') throw new Error('CAPABILITY_GAP_STATE_INVALID');
  if (!list(historicalFailureRefs).length) throw new Error('FROZEN_HISTORICAL_FAILURES_REQUIRED');
  if (!verificationSuiteRef) throw new Error('VERIFICATION_SUITE_REQUIRED');

  return freeze({
    ...gap,
    state: 'GAP_CONFIRMED',
    capability_contract: {
      capability_id: gap.capability_id,
      input_schema: inputSchema,
      output_schema: outputSchema,
      verification_suite_ref: verificationSuiteRef,
    },
    frozen_historical_failure_refs: list(historicalFailureRefs),
    confirmation_hash: digest({
      gap_id: gap.gap_id,
      historicalFailureRefs,
      inputSchema,
      outputSchema,
      verificationSuiteRef,
    }),
  });
}

export function createSandboxExperiment({
  confirmedGap,
  attempt = 1,
  attemptLimit = DEFAULT_ATTEMPT_LIMIT,
  primaryWorldlineId,
} = {}) {
  if (!confirmedGap?.gap_id || confirmedGap.state !== 'GAP_CONFIRMED') {
    throw new Error('CONFIRMED_CAPABILITY_GAP_REQUIRED');
  }
  if (!Number.isInteger(attempt) || attempt < 1) throw new Error('ATTEMPT_INVALID');
  if (!Number.isInteger(attemptLimit) || attemptLimit < 1) throw new Error('ATTEMPT_LIMIT_INVALID');
  if (attempt > attemptLimit) throw new Error('CAPABILITY_SYNTHESIS_BUDGET_EXHAUSTED');
  if (!text(primaryWorldlineId)) throw new Error('PRIMARY_WORLDLINE_ID_REQUIRED');

  const ephemeralWorldlineId =
    `worldline:ephemeral:${digest({
      gapId: confirmedGap.gap_id,
      attempt,
      primaryWorldlineId,
    }).slice(0, 32)}`;

  return freeze({
    state: 'SANDBOX_PROPOSED',
    gap_id: confirmedGap.gap_id,
    capability_id: confirmedGap.capability_id,
    attempt,
    attempt_limit: attemptLimit,
    primary_worldline_id: primaryWorldlineId,
    ephemeral_worldline_id: ephemeralWorldlineId,
    production_graph_write_permitted: false,
    historical_failure_refs: confirmedGap.frozen_historical_failure_refs,
    capability_contract: confirmedGap.capability_contract,
    experiment_hash: digest({
      gap_id: confirmedGap.gap_id,
      capability_id: confirmedGap.capability_id,
      attempt,
      ephemeralWorldlineId,
    }),
  });
}

export function authorizeSandboxExperiment(experiment, {
  authorizationRef,
  authorizedBy,
} = {}) {
  if (!experiment?.experiment_hash) throw new Error('SANDBOX_EXPERIMENT_REQUIRED');
  if (!text(authorizationRef)) throw new Error('SANDBOX_AUTHORIZATION_REQUIRED');
  if (!text(authorizedBy)) throw new Error('SANDBOX_AUTHORIZED_BY_REQUIRED');

  return freeze({
    ...experiment,
    state: 'SANDBOX_SYNTHESIS',
    sandbox_authorization_ref: authorizationRef,
    sandbox_authorized_by: authorizedBy,
    sandbox_authorization_hash: digest({
      experiment_hash: experiment.experiment_hash,
      authorizationRef,
      authorizedBy,
    }),
  });
}

export function validateSandboxResult(experiment, {
  synthesizedCapability,
  frozenRegression,
  isolatedVerification,
  capabilitySignature,
} = {}) {
  if (!experiment?.experiment_hash) throw new Error('SANDBOX_EXPERIMENT_REQUIRED');
  if (experiment.state !== 'SANDBOX_SYNTHESIS') throw new Error('SANDBOX_NOT_AUTHORIZED');
  if (!synthesizedCapability) throw new Error('SYNTHESIZED_CAPABILITY_REQUIRED');
  if (frozenRegression?.passed !== true) throw new Error('FROZEN_REGRESSION_FAILED');
  if (isolatedVerification?.verified !== true) throw new Error('ISOLATED_VERIFICATION_FAILED');
  if (!text(capabilitySignature)) throw new Error('CAPABILITY_SIGNATURE_REQUIRED');

  const verificationBundle = {
    experiment_hash: experiment.experiment_hash,
    synthesized_capability: synthesizedCapability,
    frozen_regression: frozenRegression,
    isolated_verification: isolatedVerification,
    capability_signature: capabilitySignature,
  };

  return freeze({
    ...experiment,
    state: 'SANDBOX_VERIFIED',
    synthesized_capability: synthesizedCapability,
    verification_bundle: verificationBundle,
    verification_hash: digest(verificationBundle),
    capability_signature: capabilitySignature,
  });
}

export function authorizeWorldlineMerge(verifiedExperiment, {
  mergeVerifier,
} = {}) {
  if (!verifiedExperiment?.verification_hash || verifiedExperiment.state !== 'SANDBOX_VERIFIED') {
    throw new Error('VERIFIED_SANDBOX_EXPERIMENT_REQUIRED');
  }
  if (typeof mergeVerifier !== 'function') {
    throw new Error('WORLDLINE_MERGE_VERIFIER_REQUIRED');
  }

  const result = mergeVerifier(verifiedExperiment);
  if (result?.approved !== true) throw new Error('WORLDLINE_MERGE_REJECTED');

  return freeze({
    ...verifiedExperiment,
    state: 'WORLDLINE_MERGE_PENDING',
    merge_authorization_hash: digest({
      verification_hash: verifiedExperiment.verification_hash,
      verifier_result: result,
    }),
  });
}

export function registerVerifiedCapability(verifiedExperiment, {
  capabilityRegistry,
  mergeResult,
} = {}) {
  if (!verifiedExperiment?.verification_hash) throw new Error('VERIFIED_SANDBOX_EXPERIMENT_REQUIRED');
  if (verifiedExperiment.state !== 'WORLDLINE_MERGE_PENDING') {
    throw new Error('WORLDLINE_MERGE_NOT_AUTHORIZED');
  }
  if (mergeResult?.merged !== true) throw new Error('WORLDLINE_MERGE_NOT_VERIFIED');
  if (!text(verifiedExperiment.capability_signature)) {
    throw new Error('CAPABILITY_SIGNATURE_REQUIRED');
  }
  if (!capabilityRegistry || typeof capabilityRegistry.register !== 'function') {
    throw new Error('CAPABILITY_REGISTRY_REQUIRED');
  }

  const registration = capabilityRegistry.register({
    capability: verifiedExperiment.synthesized_capability,
    signature: verifiedExperiment.capability_signature,
    verification_hash: verifiedExperiment.verification_hash,
    worldline_id: verifiedExperiment.ephemeral_worldline_id,
    merge_result: mergeResult,
  });

  return freeze({
    state: 'REGISTERED',
    capability_id: verifiedExperiment.capability_id,
    registration,
    verification_hash: verifiedExperiment.verification_hash,
    capability_signature: verifiedExperiment.capability_signature,
  });
}

export function reactivationPlan(confirmedGap, {
  registration,
  originalWorkItem,
} = {}) {
  if (!confirmedGap?.gap_id) throw new Error('CAPABILITY_GAP_REQUIRED');
  if (registration?.state !== 'REGISTERED') throw new Error('CAPABILITY_REGISTRATION_REQUIRED');
  if (!originalWorkItem?.id) throw new Error('ORIGINAL_WORK_ITEM_REQUIRED');

  return freeze({
    state: 'REACTIVATED',
    gap_id: confirmedGap.gap_id,
    capability_id: confirmedGap.capability_id,
    original_work_item_id: originalWorkItem.id,
    continuation_token: digest({
      gap_id: confirmedGap.gap_id,
      original_work_item_id: originalWorkItem.id,
      capability_id: confirmedGap.capability_id,
    }),
  });
}

export function handleSynthesisFailure(experiment, {
  nextAttempt = experiment?.attempt + 1,
  attemptLimit = experiment?.attempt_limit || DEFAULT_ATTEMPT_LIMIT,
} = {}) {
  if (!experiment?.experiment_hash) throw new Error('SANDBOX_EXPERIMENT_REQUIRED');

  if (nextAttempt > attemptLimit) {
    return freeze({
      state: 'ESCALATED',
      gap_id: experiment.gap_id,
      capability_id: experiment.capability_id,
      reason: 'CAPABILITY_SYNTHESIS_BUDGET_EXHAUSTED',
      exhausted_attempts: attemptLimit,
      human_review_required: true,
    });
  }

  return freeze({
    state: 'SANDBOX_PROPOSED',
    gap_id: experiment.gap_id,
    capability_id: experiment.capability_id,
    next_attempt: nextAttempt,
    attempt_limit: attemptLimit,
    retry_allowed: true,
  });
}
