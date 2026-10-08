import crypto from 'node:crypto';

export const REALITY_CONTINUOUS_CONTINUITY_VERSION = 'reality-continuous-continuity-v1.0';

export const CONTINUITY_STATES = Object.freeze([
  'ACTIVE','WAITING','BLOCKED','DEFERRED','SUSPENDED','COMPLETED','REOPENED','RECURRING',
]);

function stable(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stable);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}
function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}
function requiredText(value, code) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(code);
  return value.trim();
}

export function deriveContinuityRootId({ explicitRootId = null, conversationId = null, workstreamId = null } = {}) {
  const explicit = typeof explicitRootId === 'string' ? explicitRootId.trim() : '';
  if (explicit) return explicit;
  const basis = [conversationId, workstreamId].filter((value) => typeof value === 'string' && value.trim()).join('|');
  if (!basis) return null;
  return `continuity:${digest(basis).slice(0, 32)}`;
}

export function buildContinuityEvent({
  continuityRootId, worldlineId = 'reality:primary', priorState = null, nextState = 'ACTIVE',
  trigger = 'OBSERVATION', workItemId = null, evidenceReferences = [], payload = {},
  observedAt = new Date().toISOString(),
} = {}) {
  const root = requiredText(continuityRootId, 'CONTINUITY_ROOT_REQUIRED');
  if (!CONTINUITY_STATES.includes(nextState)) throw new Error('CONTINUITY_STATE_INVALID');
  if (priorState && !CONTINUITY_STATES.includes(priorState)) throw new Error('CONTINUITY_PRIOR_STATE_INVALID');
  const eventId = `continuity:event:${digest({ root, worldlineId, priorState, nextState, trigger, workItemId, evidenceReferences, payload, observedAt })}`;
  return Object.freeze({
    continuity_event_version: REALITY_CONTINUOUS_CONTINUITY_VERSION,
    continuity_event_id: eventId,
    continuity_root_id: root,
    worldline_id: worldlineId,
    prior_state: priorState,
    next_state: nextState,
    trigger,
    work_item_id: workItemId,
    evidence_references: Object.freeze(Array.isArray(evidenceReferences) ? evidenceReferences.filter(Boolean) : []),
    payload: Object.freeze(payload && typeof payload === 'object' ? payload : {}),
    observed_at: observedAt,
    rehydratable: true,
  });
}

export function buildContinuityRehydration({ continuityRootId, entries = [], trigger = 'RELEVANT_NEW_EVIDENCE', relevantEntryIds = [] } = {}) {
  const root = requiredText(continuityRootId, 'CONTINUITY_ROOT_REQUIRED');
  const matching = (Array.isArray(entries) ? entries : []).filter((entry) => entry?.continuity_root_id === root);
  const latest = matching.slice().sort((a, b) => String(b.assertion_time || '').localeCompare(String(a.assertion_time || '')))[0] || null;
  return Object.freeze({
    continuity_root_id: root,
    status: matching.length ? 'REHYDRATED' : 'NO_PRIOR_CONTINUITY',
    trigger,
    matched_entry_count: matching.length,
    relevant_entry_ids: Object.freeze(Array.isArray(relevantEntryIds) ? relevantEntryIds.filter(Boolean) : []),
    latest_state: latest?.payload?.continuity_state || latest?.payload?.next_state || null,
    entries: Object.freeze(matching),
    continuation_available: matching.length > 0,
  });
}

export function validateContinuityEvent(event) {
  requiredText(event?.continuity_event_id, 'CONTINUITY_EVENT_ID_REQUIRED');
  requiredText(event?.continuity_root_id, 'CONTINUITY_ROOT_REQUIRED');
  if (!CONTINUITY_STATES.includes(event?.next_state)) throw new Error('CONTINUITY_STATE_INVALID');
  if (!event?.rehydratable) throw new Error('CONTINUITY_REHYDRATION_REQUIRED');
  return Object.freeze({ valid: true, continuity_root_id: event.continuity_root_id });
}
