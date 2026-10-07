// Reality Operation Ledger v1.0
// Immutable operation spine:
// question -> evidence -> reconstructed_state -> decision -> authority
// -> proposed_action -> executed_action -> independent_observation
// -> outcome -> learning_signal.
//
// This module is intentionally deterministic and fail-closed. It does not grant
// authority, infer responsibility, or decide that an outcome is verified.

import crypto from 'node:crypto';

export const REALITY_OPERATION_LEDGER_VERSION = 'reality-operation-ledger-v1.0';

export const OPERATION_OUTCOMES = Object.freeze([
  'not_started','proposed','authorized','executing','observed','verified',
  'failed','contradicted','inconclusive','not_observable','cancelled',
]);

export const OPERATION_STAGES = Object.freeze([
  'question','evidence','reconstructed_state','decision','authority',
  'proposed_action','executed_action','independent_observation','outcome','learning_signal',
]);

const AUTHORITY_REQUIRED_OUTCOMES = new Set(['authorized','executing']);

function stable(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
}

function digest(value) {
  return crypto.createHash('sha256').update(stable(value)).digest('hex');
}

export function createOperationId(prefix = 'operation') {
  return `${prefix}:${crypto.randomUUID()}`;
}

export function createOperationEvent({
  operation_id,
  stage,
  outcome = 'not_started',
  payload = {},
  evidence_refs = [],
  authority_ref = null,
  parent_event_id = null,
  occurred_at = new Date().toISOString(),
  event_id = null,
} = {}) {
  if (!operation_id) throw new Error('OPERATION_ID_REQUIRED');
  if (!OPERATION_STAGES.includes(stage)) throw new Error('OPERATION_STAGE_INVALID');
  if (!OPERATION_OUTCOMES.includes(outcome)) throw new Error('OPERATION_OUTCOME_INVALID');
  if (AUTHORITY_REQUIRED_OUTCOMES.has(outcome) && !authority_ref) throw new Error('OPERATION_AUTHORITY_REQUIRED');
  return Object.freeze({
    version: REALITY_OPERATION_LEDGER_VERSION,
    event_id: event_id || `${operation_id}:${stage}:${crypto.randomUUID()}`,
    operation_id,
    stage,
    outcome,
    payload: Object.freeze(payload && typeof payload === 'object' ? {...payload} : {}),
    evidence_refs: Object.freeze(Array.isArray(evidence_refs) ? evidence_refs.filter(Boolean).map(String) : []),
    authority_ref: authority_ref || null,
    parent_event_id,
    occurred_at,
    append_only: true,
  });
}

export async function appendOperationEvent({
  persistence, continuityRootId, worldlineId, event, provenance = {},
} = {}) {
  if (!persistence?.appendEvent) throw new Error('OPERATION_PERSISTENCE_REQUIRED');
  return persistence.appendEvent({
    event_id: event.event_id,
    event_kind: 'operation',
    entity_type: 'operation_stage',
    entity_id: event.operation_id,
    continuity_root_id: continuityRootId,
    worldline_id: worldlineId,
    parent_event_id: event.parent_event_id,
    effective_time: event.occurred_at,
    assertion_time: new Date().toISOString(),
    epistemic_status: event.stage === 'outcome' ? event.outcome.toUpperCase() : 'OBSERVED',
    payload: event,
    evidence_refs: event.evidence_refs,
    provenance: { ...provenance, source: provenance.source || 'reality-operation-ledger-v1.0' },
  });
}

function same(a, b) {
  return stable(a) === stable(b);
}

function scopeMatches(operation, authorization) {
  const pairs = [
    ['operation_id','operation_id'],
    ['proposal_id','proposal_id'],
    ['target','target'],
    ['action_type','action_type'],
  ];
  if (!pairs.every(([a,b]) => operation?.[a] != null && authorization?.[b] === operation[a])) {
    return false;
  }
  if (!same(operation.parameters || {}, authorization.parameters || {})) return false;
  if (!same(operation.constraints || {}, authorization.constraints || {})) return false;
  if (!same(operation.side_effects || [], authorization.side_effects || [])) return false;
  return true;
}

export function validateOperationAuthority({ operation, authorization, now = new Date() } = {}) {
  if (!operation || !authorization) return { valid: false, reason: 'AUTHORIZATION_REQUIRED' };
  if (!scopeMatches(operation, authorization)) {
    return Object.freeze({ valid: false, reason: 'AUTHORIZATION_SCOPE_MISMATCH' });
  }
  if (authorization.authority_ref == null || authorization.authority_ref === '') {
    return Object.freeze({ valid: false, reason: 'AUTHORITY_REF_REQUIRED' });
  }
  if (authorization.principal == null || authorization.principal === '') {
    return Object.freeze({ valid: false, reason: 'AUTHORIZING_PRINCIPAL_REQUIRED' });
  }
  if (!authorization.verification_method) {
    return Object.freeze({ valid: false, reason: 'VERIFICATION_METHOD_REQUIRED' });
  }
  if (!authorization.expires_at) {
    return Object.freeze({ valid: false, reason: 'AUTHORIZATION_EXPIRY_REQUIRED' });
  }
  const expires = Date.parse(authorization.expires_at);
  if (!Number.isFinite(expires)) return Object.freeze({ valid: false, reason: 'AUTHORIZATION_EXPIRY_INVALID' });
  if (expires < new Date(now).getTime()) {
    return Object.freeze({ valid: false, reason: 'AUTHORIZATION_EXPIRED' });
  }
  if (authorization.allow_reuse === true) {
    return Object.freeze({ valid: false, reason: 'AUTHORIZATION_REUSE_FORBIDDEN' });
  }
  if (authorization.delegation === true) {
    return Object.freeze({ valid: false, reason: 'AUTHORIZATION_DELEGATION_FORBIDDEN' });
  }
  return Object.freeze({ valid: true, reason: null });
}

export function validateExecutionReplay({ operation_id, execution_id, priorEvents = [] } = {}) {
  if (!operation_id) return { valid: false, reason: 'OPERATION_ID_REQUIRED' };
  if (!execution_id) return { valid: false, reason: 'EXECUTION_ID_REQUIRED' };
  const events = Array.isArray(priorEvents) ? priorEvents : [];
  const duplicate = events.some(e =>
    e?.payload?.execution_id === execution_id ||
    e?.event_id === execution_id ||
    (e?.entity_type === 'execution_receipt' && e?.entity_id === execution_id)
  );
  if (duplicate) return Object.freeze({ valid: false, reason: 'EXECUTION_REPLAY_OR_DUPLICATE' });
  const wrongOperation = events.some(e =>
    e?.payload?.execution_id === execution_id && e?.payload?.operation_id !== operation_id
  );
  if (wrongOperation) return Object.freeze({ valid: false, reason: 'EXECUTION_ID_BOUND_TO_DIFFERENT_OPERATION' });
  return Object.freeze({ valid: true, reason: null });
}

export function classifyOperationOutcome({
  independentObservation,
  observedResult,
  expectedResult,
} = {}) {
  if (!independentObservation) return 'not_observable';
  if (independentObservation.contradicted === true) return 'contradicted';
  if (independentObservation.verified === true) return 'verified';
  if (observedResult === undefined || expectedResult === undefined) return 'inconclusive';
  return same(observedResult, expectedResult) ? 'verified' : 'failed';
}

export function createVerifiedLearningSignal({
  operation_id,
  outcome,
  independentObservation,
  learning,
  evidence_refs = [],
} = {}) {
  if (!operation_id) throw new Error('LEARNING_OPERATION_ID_REQUIRED');
  if (outcome !== 'verified') throw new Error('LEARNING_REQUIRES_VERIFIED_OUTCOME');
  if (!independentObservation?.independent || independentObservation.verified !== true) {
    throw new Error('LEARNING_REQUIRES_INDEPENDENT_VERIFICATION');
  }
  return Object.freeze({
    version: REALITY_OPERATION_LEDGER_VERSION,
    signal_id: `learning:${crypto.randomUUID()}`,
    operation_id,
    outcome: 'verified',
    learning: learning && typeof learning === 'object' ? Object.freeze({...learning}) : Object.freeze({}),
    evidence_refs: Object.freeze(Array.isArray(evidence_refs) ? evidence_refs.filter(Boolean).map(String) : []),
    authority_change: 'NONE',
    governance_change: 'NONE',
    verification_change: 'NONE',
    source: 'verified_operation_outcome',
  });
}

export function hashOperationScope(operation) {
  return digest({
    operation_id: operation?.operation_id || null,
    proposal_id: operation?.proposal_id || null,
    target: operation?.target || null,
    action_type: operation?.action_type || null,
    parameters: operation?.parameters || {},
    constraints: operation?.constraints || {},
    side_effects: operation?.side_effects || [],
  });
}
