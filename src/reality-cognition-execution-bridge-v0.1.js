import crypto from 'node:crypto';

export const EXECUTION_BRIDGE_VERSION = '0.1.0';

export const EXECUTION_BRIDGE_STATES = Object.freeze([
  'DECISION',
  'PROPOSED_ACTION',
  'GOVERNANCE_REVIEW',
  'REJECTED',
  'AWAITING_AUTHORIZATION',
  'AUTHORIZED',
  'EXECUTING',
  'AWAITING_VERIFICATION',
  'VERIFIED_OUTCOME',
]);

export const CONSEQUENCE_CLASSES = Object.freeze([
  'NO_EXTERNAL_EFFECT',
  'REVERSIBLE_EXTERNAL_EFFECT',
  'DURABLE_EXTERNAL_EFFECT',
  'IRREVERSIBLE_EXTERNAL_EFFECT',
]);

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
 * Cognition -> Execution Bridge v0.1
 *
 * This module is the structural interlock between what Reality decides
 * and what Reality is permitted to cause.
 *
 * DECISION is never execution authority.
 * GOVERNANCE is never authorization.
 * AUTHORIZATION is never proof of execution.
 * EXECUTION is never proof of success.
 *
 * The external connector/dispatcher is intentionally injected. This module
 * does not select providers, bypass policy, or execute side effects itself.
 */

export const EXECUTION_BRIDGE_INVARIANTS = Object.freeze({
  decisionIsNotAuthority: true,
  governanceIsNotAuthorization: true,
  authorizationIsNotExecution: true,
  executionIsNotSuccess: true,
  consequentialActionsRequireExplicitAuthorization: true,
  rejectedActionsCannotReachExecution: true,
  authorizationMustBindToExactProposal: true,
  connectorIsInjectedAtExecutionBoundary: true,
  independentVerificationRequiredForVerifiedOutcome: true,
  modelOutputCannotDirectlyExecute: true,
});

export function createActionProposal({
  proposalId,
  decisionId,
  continuityRootId,
  worldlineId,
  action,
  target,
  payload = {},
  consequenceClass = 'NO_EXTERNAL_EFFECT',
  expectedEffect = null,
  evidenceReferences = [],
} = {}) {
  if (!text(proposalId)) throw new Error('ACTION_PROPOSAL_ID_REQUIRED');
  if (!text(decisionId)) throw new Error('DECISION_ID_REQUIRED');
  if (!text(continuityRootId)) throw new Error('CONTINUITY_ROOT_ID_REQUIRED');
  if (!text(worldlineId)) throw new Error('WORLDLINE_ID_REQUIRED');
  if (!text(action)) throw new Error('ACTION_REQUIRED');
  if (!text(target)) throw new Error('ACTION_TARGET_REQUIRED');
  if (!CONSEQUENCE_CLASSES.includes(consequenceClass)) {
    throw new Error('CONSEQUENCE_CLASS_INVALID');
  }

  const proposal = {
    bridge_version: EXECUTION_BRIDGE_VERSION,
    state: 'PROPOSED_ACTION',
    proposal_id: proposalId,
    decision_id: decisionId,
    continuity_root_id: continuityRootId,
    worldline_id: worldlineId,
    action,
    target,
    payload,
    consequence_class: consequenceClass,
    expected_effect: expectedEffect,
    evidence_references: list(evidenceReferences),
  };

  return freeze({
    ...proposal,
    proposal_hash: digest(proposal),
  });
}

export function evaluateGovernance({
  proposal,
  policy = {},
} = {}) {
  if (!proposal?.proposal_hash) throw new Error('ACTION_PROPOSAL_REQUIRED');

  const consequential = proposal.consequence_class !== 'NO_EXTERNAL_EFFECT';
  const policyResult = typeof policy.evaluate === 'function'
    ? policy.evaluate(proposal)
    : { allowed: !consequential, reason: consequential ? 'EXPLICIT_AUTHORIZATION_REQUIRED' : 'NO_EXTERNAL_EFFECT' };

  const allowed = policyResult?.allowed === true;

  return freeze({
    state: allowed ? 'GOVERNANCE_REVIEW' : 'REJECTED',
    proposal_id: proposal.proposal_id,
    proposal_hash: proposal.proposal_hash,
    allowed,
    reason: text(policyResult?.reason) || (allowed ? 'GOVERNANCE_ALLOWED' : 'GOVERNANCE_REJECTED'),
    requires_authorization: consequential,
    policy_ref: text(policyResult?.policy_ref) || null,
  });
}

export function createAuthorization({
  authorizationId,
  proposal,
  authorityRef,
  authorizedBy,
  scope = {},
  signature = null,
  expiresAt = null,
} = {}) {
  if (!text(authorizationId)) throw new Error('AUTHORIZATION_ID_REQUIRED');
  if (!proposal?.proposal_hash) throw new Error('ACTION_PROPOSAL_REQUIRED');
  if (!text(authorityRef)) throw new Error('AUTHORITY_REF_REQUIRED');
  if (!text(authorizedBy)) throw new Error('AUTHORIZED_BY_REQUIRED');
  if (proposal.consequence_class !== 'NO_EXTERNAL_EFFECT' && !text(signature)) {
    throw new Error('CONSEQUENTIAL_AUTHORIZATION_SIGNATURE_REQUIRED');
  }

  const authorization = {
    bridge_version: EXECUTION_BRIDGE_VERSION,
    authorization_id: authorizationId,
    proposal_id: proposal.proposal_id,
    proposal_hash: proposal.proposal_hash,
    authority_ref: authorityRef,
    authorized_by: authorizedBy,
    scope,
    signature: text(signature) || null,
    expires_at: text(expiresAt) || null,
  };

  return freeze({
    ...authorization,
    authorization_hash: digest(authorization),
  });
}

export function validateAuthorization({
  proposal,
  authorization,
  now = new Date().toISOString(),
} = {}) {
  if (!proposal?.proposal_hash) throw new Error('ACTION_PROPOSAL_REQUIRED');
  if (!authorization?.authorization_hash) throw new Error('AUTHORIZATION_REQUIRED');

  if (authorization.proposal_id !== proposal.proposal_id ||
      authorization.proposal_hash !== proposal.proposal_hash) {
    throw new Error('AUTHORIZATION_PROPOSAL_MISMATCH');
  }

  if (authorization.expires_at && Date.parse(authorization.expires_at) <= Date.parse(now)) {
    throw new Error('AUTHORIZATION_EXPIRED');
  }

  return true;
}

export function createExecutionReceipt({
  proposal,
  authorization,
  executionId,
  connectorRef,
  providerReceipt = null,
} = {}) {
  validateAuthorization({ proposal, authorization });
  if (!text(executionId)) throw new Error('EXECUTION_ID_REQUIRED');
  if (!text(connectorRef)) throw new Error('CONNECTOR_REF_REQUIRED');

  const receipt = {
    bridge_version: EXECUTION_BRIDGE_VERSION,
    state: 'EXECUTING',
    execution_id: executionId,
    proposal_id: proposal.proposal_id,
    proposal_hash: proposal.proposal_hash,
    authorization_hash: authorization.authorization_hash,
    connector_ref: connectorRef,
    provider_receipt: providerReceipt,
  };

  return freeze({
    ...receipt,
    execution_receipt_hash: digest(receipt),
  });
}

export function reconcileVerifiedOutcome({
  executionReceipt,
  targetObservation,
  independentVerification,
} = {}) {
  if (!executionReceipt?.execution_receipt_hash) throw new Error('EXECUTION_RECEIPT_REQUIRED');
  if (!targetObservation?.observation_id) throw new Error('TARGET_OBSERVATION_REQUIRED');
  if (!independentVerification?.verification_id) throw new Error('INDEPENDENT_VERIFICATION_REQUIRED');
  if (independentVerification.execution_receipt_hash !== executionReceipt.execution_receipt_hash) {
    throw new Error('VERIFICATION_EXECUTION_MISMATCH');
  }
  if (independentVerification.target_observation_id !== targetObservation.observation_id) {
    throw new Error('VERIFICATION_OBSERVATION_MISMATCH');
  }
  if (independentVerification.verified !== true) {
    throw new Error('OUTCOME_NOT_VERIFIED');
  }

  const outcome = {
    kind: 'VERIFIED_OUTCOME',
    state: 'VERIFIED_OUTCOME',
    execution_receipt_hash: executionReceipt.execution_receipt_hash,
    target_observation_id: targetObservation.observation_id,
    independent_verification_id: independentVerification.verification_id,
    result: independentVerification.result ?? null,
  };

  return freeze({
    ...outcome,
    verified_outcome_hash: digest(outcome),
  });
}

export function createExecutionBridgePlan({
  proposal,
  governance,
  authorization = null,
} = {}) {
  if (!proposal?.proposal_hash) throw new Error('ACTION_PROPOSAL_REQUIRED');
  if (!governance) throw new Error('GOVERNANCE_RESULT_REQUIRED');

  if (!governance.allowed) {
    return freeze({
      state: 'REJECTED',
      proposal_id: proposal.proposal_id,
      reason: governance.reason,
    });
  }

  if (governance.requires_authorization && !authorization) {
    return freeze({
      state: 'AWAITING_AUTHORIZATION',
      proposal_id: proposal.proposal_id,
      proposal_hash: proposal.proposal_hash,
    });
  }

  if (authorization) validateAuthorization({ proposal, authorization });

  return freeze({
    state: authorization ? 'AUTHORIZED' : 'GOVERNANCE_REVIEW',
    proposal_id: proposal.proposal_id,
    proposal_hash: proposal.proposal_hash,
    authorization_hash: authorization?.authorization_hash || null,
  });
}
