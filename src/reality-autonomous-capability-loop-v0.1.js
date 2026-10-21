import crypto, { createPublicKey, verify as verifySignature } from 'node:crypto';
import { verifyOwnerConsent, SANDBOX_CONSENT_SCOPE } from './reality-owner-consent-boundary-v0.1.js';

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
    original_work_item_id: confirmedGap.work_item_id,
    continuity_root_id: confirmedGap.continuity_root_id,
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
  ownerApproval,
} = {}) {
  if (!experiment?.experiment_hash) throw new Error('SANDBOX_EXPERIMENT_REQUIRED');
  if (!text(authorizationRef)) throw new Error('SANDBOX_AUTHORIZATION_REQUIRED');
  if (!text(authorizedBy)) throw new Error('SANDBOX_AUTHORIZED_BY_REQUIRED');
  if (!text(experiment.original_work_item_id)) throw new Error('SANDBOX_ORIGINAL_WORK_ITEM_REQUIRED');
  const signed = verifyOwnerConsent(ownerApproval, {
    purpose: SANDBOX_CONSENT_SCOPE,
    subjectRef: experiment.experiment_hash,
    originalTaskRef: experiment.original_work_item_id,
    governanceKernelRef: null,
    consentRef: authorizationRef,
  });
  if (signed.owner_id !== authorizedBy) {
    throw new Error('SANDBOX_OWNER_ID_MISMATCH');
  }

  // This object is a sandbox proposal. A future sandbox executor must
  // atomically consume the approval nonce before it runs any candidate code.
  return freeze({
    ...experiment,
    state: 'SANDBOX_SYNTHESIS',
    sandbox_authorization_ref: authorizationRef,
    sandbox_authorized_by: signed.owner_id,
    sandbox_authorization_binding_sha256: signed.binding_sha256,
    sandbox_approval_nonce: signed.nonce,
    sandbox_owner_consent_consumed: false,
    sandbox_execution_proven: false,
    requires_atomic_owner_consent_consumption: true,
    sandbox_authorization_hash: digest({
      experiment_hash: experiment.experiment_hash,
      owner_consent_binding_sha256: signed.binding_sha256,
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

export const OWNER_WORLDLINE_MERGE_APPROVAL_VERSION = 'reality-owner-worldline-merge-approval-v0.1';

export function canonicalOwnerWorldlineMergeApprovalMessage(approval) {
  return JSON.stringify({
    schema: OWNER_WORLDLINE_MERGE_APPROVAL_VERSION,
    decision: 'APPROVE_CANONICAL_CAPABILITY_MERGE',
    owner_id: approval?.owner_id || null,
    gap_id: approval?.gap_id || null,
    capability_id: approval?.capability_id || null,
    capability_signature: approval?.capability_signature || null,
    experiment_hash: approval?.experiment_hash || null,
    verification_hash: approval?.verification_hash || null,
    primary_worldline_id: approval?.primary_worldline_id || null,
    ephemeral_worldline_id: approval?.ephemeral_worldline_id || null,
    target: 'CANONICAL_CAPABILITY_REGISTRY',
    issued_at: approval?.issued_at || null,
    expires_at: approval?.expires_at || null,
    nonce: approval?.nonce || null,
  });
}

function assertOwnerWorldlineMergeApproval(experiment, approval) {
  if (!approval || approval.schema !== OWNER_WORLDLINE_MERGE_APPROVAL_VERSION ||
      approval.decision !== 'APPROVE_CANONICAL_CAPABILITY_MERGE' ||
      approval.target !== 'CANONICAL_CAPABILITY_REGISTRY' ||
      !text(approval.owner_id) || !text(approval.nonce) ||
      approval.gap_id !== experiment.gap_id ||
      approval.capability_id !== experiment.capability_id ||
      approval.capability_signature !== experiment.capability_signature ||
      approval.experiment_hash !== experiment.experiment_hash ||
      approval.verification_hash !== experiment.verification_hash ||
      approval.primary_worldline_id !== experiment.primary_worldline_id ||
      approval.ephemeral_worldline_id !== experiment.ephemeral_worldline_id) {
    throw new Error('WORLDLINE_OWNER_APPROVAL_SCOPE_MISMATCH');
  }

  const issued = Date.parse(approval.issued_at);
  const expires = Date.parse(approval.expires_at);
  const now = Date.now();
  if (!Number.isFinite(issued) || !Number.isFinite(expires) ||
      issued > now || expires <= now || expires <= issued ||
      expires - issued > 7 * 24 * 60 * 60 * 1000) {
    throw new Error('WORLDLINE_OWNER_APPROVAL_EXPIRED');
  }

  // Pinned deployment-owned verifier key; never accept a public key supplied
  // by an untrusted model, client, candidate, or approval object.
  const trustedPublicKey = process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY;
  if (!text(trustedPublicKey) || !text(approval.signature)) {
    throw new Error('WORLDLINE_TRUSTED_OWNER_SIGNATURE_REQUIRED');
  }
  let valid = false;
  try {
    const signature = Buffer.from(approval.signature, 'base64');
    valid = signature.length === 64 && verifySignature(null,
      Buffer.from(canonicalOwnerWorldlineMergeApprovalMessage(approval)),
      createPublicKey(trustedPublicKey), signature);
  } catch {
    valid = false;
  }
  if (!valid) throw new Error('WORLDLINE_OWNER_SIGNATURE_INVALID');
  return true;
}

export function authorizeWorldlineMerge(verifiedExperiment, {
  mergeVerifier,
  ownerApproval,
} = {}) {
  if (!verifiedExperiment?.verification_hash || verifiedExperiment.state !== 'SANDBOX_VERIFIED') {
    throw new Error('VERIFIED_SANDBOX_EXPERIMENT_REQUIRED');
  }
  if (typeof mergeVerifier !== 'function') {
    throw new Error('WORLDLINE_MERGE_VERIFIER_REQUIRED');
  }
  assertOwnerWorldlineMergeApproval(verifiedExperiment, ownerApproval);
  const result = mergeVerifier(verifiedExperiment);
  if (result?.approved !== true) throw new Error('WORLDLINE_MERGE_REJECTED');

  // This generates a merge proposal only. The actual production executor
  // must atomically consume the owner's nonce and read back the worldline.
  return freeze({
    ...verifiedExperiment,
    state: 'WORLDLINE_MERGE_PENDING',
    owner_merge_approval: freeze({ ...ownerApproval }),
    production_merge_executed: false,
    durable_owner_nonce_consumption_required: true,
    independent_merge_readback_required: true,
    merge_authorization_hash: digest({
      verification_hash: verifiedExperiment.verification_hash,
      owner_approval: ownerApproval,
      verifier_result: result,
    }),
  });
}

export async function registerVerifiedCapability(verifiedExperiment, {
  capabilityRegistry,
  mergeResult,
  approvalStore,
} = {}) {
  if (!verifiedExperiment?.verification_hash) throw new Error('VERIFIED_SANDBOX_EXPERIMENT_REQUIRED');
  if (verifiedExperiment.state !== 'WORLDLINE_MERGE_PENDING') {
    throw new Error('WORLDLINE_MERGE_NOT_AUTHORIZED');
  }
  // A caller's merged:true claim is insufficient: require signed owner
  // authorization and externally recorded provider readback bound to the
  // exact experiment, capability and canonical destination.
  assertOwnerWorldlineMergeApproval(verifiedExperiment, verifiedExperiment.owner_merge_approval);
  if (mergeResult?.merged !== true ||
      mergeResult?.independent !== true ||
      mergeResult?.readback_verified !== true ||
      mergeResult?.verification_hash !== verifiedExperiment.verification_hash ||
      mergeResult?.capability_id !== verifiedExperiment.capability_id ||
      mergeResult?.target_worldline_id !== verifiedExperiment.primary_worldline_id ||
      !text(mergeResult?.provider_execution_id) ||
      !text(mergeResult?.readback_observation_id)) {
    throw new Error('WORLDLINE_MERGE_INDEPENDENT_READBACK_REQUIRED');
  }
  if (!text(verifiedExperiment.capability_signature)) {
    throw new Error('CAPABILITY_SIGNATURE_REQUIRED');
  }
  if (!capabilityRegistry || typeof capabilityRegistry.register !== 'function') {
    throw new Error('CAPABILITY_REGISTRY_REQUIRED');
  }
  if (!approvalStore ||
      approvalStore.kind !== 'TRUSTED_DURABLE_OWNER_APPROVAL_STORE' ||
      typeof approvalStore.consumeOnce !== 'function') {
    throw new Error('DURABLE_APPROVAL_STORE_REQUIRED');
  }

  // Atomic compare-and-insert must happen BEFORE any capability registry
  // mutation. The owner signature is revalidated at time of execution.
  const approval = verifiedExperiment.owner_merge_approval;
  const consumptionKey = 'owner-consent:' + crypto.createHash('sha256')
    .update(JSON.stringify([approval.owner_id, approval.decision, approval.nonce])).digest('hex');
  const bindingHash = crypto.createHash('sha256')
    .update(canonicalOwnerWorldlineMergeApprovalMessage(approval)).digest('hex');
  const consumed = await approvalStore.consumeOnce({
    key: consumptionKey,
    binding_sha256: bindingHash,
    owner_id: approval.owner_id,
    purpose: approval.decision,
    subject_ref: verifiedExperiment.verification_hash,
    consent_ref: approval.experiment_hash,
    expires_at: approval.expires_at,
  });
  if (consumed?.key !== consumptionKey ||
      consumed?.binding_sha256 !== bindingHash ||
      consumed?.durable !== true || consumed?.atomic !== true ||
      consumed?.consumed !== true || consumed?.already_used === true ||
      !text(consumed?.record_ref)) {
    throw new Error('WORLDLINE_OWNER_APPROVAL_NOT_ATOMICALLY_CONSUMED');
  }

  const registration = await capabilityRegistry.register({
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
    owner_approval_consumption_ref: consumed.record_ref,
    owner_approval_binding_sha256: bindingHash,
  });
}

export function reactivationPlan(confirmedGap, {
  registration,
  originalWorkItem,
} = {}) {
  if (!confirmedGap?.gap_id) throw new Error('CAPABILITY_GAP_REQUIRED');
  if (confirmedGap.state !== 'GAP_CONFIRMED') throw new Error('CONFIRMED_CAPABILITY_GAP_REQUIRED');
  if (registration?.state !== 'REGISTERED') throw new Error('CAPABILITY_REGISTRATION_REQUIRED');
  if (!originalWorkItem?.id) throw new Error('ORIGINAL_WORK_ITEM_REQUIRED');
  if (!text(confirmedGap.work_item_id) || originalWorkItem.id !== confirmedGap.work_item_id) {
    throw new Error('ORIGINAL_WORK_ITEM_IDENTITY_MISMATCH');
  }
  if (registration.capability_id !== confirmedGap.capability_id) {
    throw new Error('UPGRADE_CAPABILITY_MISMATCH');
  }
  if (!text(registration.verification_hash) || !text(registration.capability_signature)) {
    throw new Error('REGISTERED_CAPABILITY_PROOF_REQUIRED');
  }
  if (confirmedGap.continuity_root_id &&
      originalWorkItem.continuity_root_id !== confirmedGap.continuity_root_id) {
    throw new Error('CONTINUITY_ROOT_IDENTITY_MISMATCH');
  }
  if (confirmedGap.worldline_id &&
      originalWorkItem.worldline_id !== confirmedGap.worldline_id) {
    throw new Error('WORLDLINE_IDENTITY_MISMATCH');
  }

  // Re-activation is a proposal for the ORIGINAL task, not a tool execution.
  // The ordinary work authorization gate still applies; no model may infer
  // execution authority from successful capability registration.
  return freeze({
    state: 'REACTIVATED',
    gap_id: confirmedGap.gap_id,
    capability_id: confirmedGap.capability_id,
    original_work_item_id: originalWorkItem.id,
    continuity_root_id: confirmedGap.continuity_root_id || null,
    worldline_id: confirmedGap.worldline_id || null,
    capability_verification_hash: registration.verification_hash,
    capability_signature: registration.capability_signature,
    execution_authorized: false,
    customer_task_completed: false,
    requires_fresh_action_authorization: true,
    requires_independent_outcome_readback: true,
    continuation_token: digest({
      gap_id: confirmedGap.gap_id,
      original_work_item_id: originalWorkItem.id,
      capability_id: confirmedGap.capability_id,
      continuity_root_id: confirmedGap.continuity_root_id || null,
      worldline_id: confirmedGap.worldline_id || null,
      verification_hash: registration.verification_hash,
      capability_signature: registration.capability_signature,
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
