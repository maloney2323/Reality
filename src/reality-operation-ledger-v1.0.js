// Reality Operation Ledger v1.0
// Immutable operation spine: question -> evidence -> state -> decision -> authority
// -> action -> observation -> outcome -> learning.

export const REALITY_OPERATION_LEDGER_VERSION = 'reality-operation-ledger-v1.0';

export const OPERATION_OUTCOMES = Object.freeze([
  'not_started','proposed','authorized','executing','observed','verified',
  'failed','contradicted','inconclusive','not_observable','cancelled',
]);

export const OPERATION_STAGES = Object.freeze([
  'question','evidence','reconstructed_state','decision','authority',
  'proposed_action','executed_action','independent_observation','outcome','learning_signal',
]);

export function createOperationId(prefix = 'operation') {
  return `${prefix}:${Date.now()}:${cryptoRandom()}`;
}

function cryptoRandom() {
  return Math.random().toString(36).slice(2, 10);
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
} = {}) {
  if (!operation_id) throw new Error('OPERATION_ID_REQUIRED');
  if (!OPERATION_STAGES.includes(stage)) throw new Error('OPERATION_STAGE_INVALID');
  if (!OPERATION_OUTCOMES.includes(outcome)) throw new Error('OPERATION_OUTCOME_INVALID');
  if (['authorized','executing'].includes(outcome) && !authority_ref) throw new Error('OPERATION_AUTHORITY_REQUIRED');
  return Object.freeze({
    version: REALITY_OPERATION_LEDGER_VERSION,
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
  const eventId = `${event.operation_id}:${event.stage}:${event.occurred_at}`;
  return persistence.appendEvent({
    event_id: eventId,
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

export function validateOperationAuthority({ operation, authorization } = {}) {
  if (!operation || !authorization) return { valid: false, reason: 'AUTHORIZATION_REQUIRED' };
  const exact = ['proposal_id','target','action_type'].every(k => operation[k] != null && authorization[k] === operation[k]);
  const unexpired = !authorization.expires_at || Date.parse(authorization.expires_at) >= Date.now();
  const verification = Boolean(authorization.verification_method);
  return Object.freeze({
    valid: exact && unexpired && verification,
    reason: exact ? (unexpired ? (verification ? null : 'VERIFICATION_METHOD_REQUIRED') : 'AUTHORIZATION_EXPIRED') : 'AUTHORIZATION_SCOPE_MISMATCH',
  });
}
