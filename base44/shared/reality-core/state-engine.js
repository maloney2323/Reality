// Reality State Engine v0.
//
// Purpose: maintain versioned, evidence-authorized state transitions without
// becoming a second truth engine. Raw evidence and model proposals never write
// durable state directly. A state candidate must first be bound to an existing
// Reality Core authorization and an exact grounded proposition projection.
//
// The engine is domain-agnostic: a personal goal, project status, claim state,
// shipment state, health state, or system state all use the same contract.

import { RealityState, inspectAuthorization } from './corridor.js';

const STATE_AUTH = Symbol('reality.state.authorization');
const issuedStateAuthorizations = new WeakSet();
const boundStateRecords = new WeakSet();

export const STATE_ENGINE_VERSION = 'reality-state-engine-v0.1';
export const STATE_ENGINE_AUTHORITY = 'AUTHORIZED_STATE_TRANSITIONS_ONLY';
export const STATE_RECORD_VERSION = 'reality-state-record-v0.1';
export const STATE_TRANSITION_VERSION = 'reality-state-transition-v0.1';

export const StateTransitionType = Object.freeze({
  UPDATED: 'UPDATED',
  UNCHANGED: 'UNCHANGED',
  CONTESTED: 'CONTESTED',
  SUPERSEDED: 'SUPERSEDED',
  UNKNOWN: 'UNKNOWN',
});

const ACCEPTED_REALITY_STATES = new Set(Object.values(RealityState));

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function clean(value, max = 1200) {
  return nonEmpty(value) ? value.trim().slice(0, max) : null;
}

function normalizeIso(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  if (!nonEmpty(value)) throw new Error(`${fieldName} must be an ISO-compatible string`);
  const millis = Date.parse(value);
  if (!Number.isFinite(millis)) throw new Error(`${fieldName} must be a valid timestamp`);
  return new Date(millis).toISOString();
}

function freezeUnique(values) {
  return Object.freeze([...new Set((values || []).filter(nonEmpty).map((value) => value.trim()))]);
}

function issueStateAuthorization(type, payload) {
  const value = Object.freeze({ [STATE_AUTH]: true, type, ...payload });
  issuedStateAuthorizations.add(value);
  return value;
}

function requireStateAuthorization(value, type) {
  if (!value || !issuedStateAuthorizations.has(value) || value[STATE_AUTH] !== true || value.type !== type) {
    throw new Error(`Reality State Engine authorization required: ${type}`);
  }
  return value;
}

function authorizationDependsOn(root, target, seen = new Set()) {
  if (root === target) return true;
  if (!root || typeof root !== 'object' || seen.has(root)) return false;
  seen.add(root);
  const inspected = inspectAuthorization(root);
  if (!inspected.authorized) return false;
  const deps = Array.isArray(inspected.dependencies) ? inspected.dependencies : [];
  return deps.some((dep) => authorizationDependsOn(dep, target, seen));
}

function groundedProjectionSnapshot(projectionAuthorization) {
  const inspected = inspectAuthorization(projectionAuthorization);
  if (!inspected.authorized || inspected.type !== 'PROJECTION') {
    throw new Error('state candidate requires a Reality projection authorization');
  }

  const projection = inspected.projection || {};
  const valueFor = (key) => {
    const field = projection[key];
    return field && field.grounded === true && nonEmpty(field.value) ? field.value.trim() : null;
  };

  const subject = valueFor('subject');
  const predicate = valueFor('predicate');
  const object = valueFor('object');
  const polarity = valueFor('polarity');
  if (![subject, predicate, object, polarity].every(Boolean)) {
    throw new Error('state candidate requires fully grounded subject, predicate, object, and polarity');
  }

  const optionalKeys = [
    'temporal_scope', 'geographic_scope', 'metric_scope', 'modality',
    'inference_class', 'temporal_type', 'valid_from', 'valid_until',
  ];
  const scope = {};
  for (const key of optionalKeys) {
    const value = valueFor(key);
    if (value !== null) scope[key] = value;
  }

  return Object.freeze({
    subject,
    state_type: predicate,
    value: object,
    polarity,
    scope: Object.freeze(scope),
    observation_ref: clean(inspected.observationRef, 300),
  });
}

function collectProjectionObservationRefs(root, seen = new Set(), refs = new Set()) {
  if (!root || typeof root !== 'object' || seen.has(root)) return refs;
  seen.add(root);
  const inspected = inspectAuthorization(root);
  if (!inspected.authorized) return refs;
  if (inspected.type === 'PROJECTION' && nonEmpty(inspected.observationRef)) refs.add(inspected.observationRef.trim());
  for (const dep of Array.isArray(inspected.dependencies) ? inspected.dependencies : []) {
    collectProjectionObservationRefs(dep, seen, refs);
  }
  return refs;
}

function scopeKey(candidate) {
  const scope = candidate.scope || {};
  return JSON.stringify([
    candidate.subject,
    candidate.state_type,
    scope.temporal_scope || null,
    scope.geographic_scope || null,
    scope.metric_scope || null,
    scope.modality || null,
    scope.inference_class || null,
    scope.temporal_type || null,
  ]);
}

function sameStateValue(left, right) {
  return left.value === right.value && left.polarity === right.polarity;
}

function stateTime(record) {
  const value = record?.valid_from || record?.scope?.valid_from || null;
  if (!value) return null;
  const millis = Date.parse(value);
  return Number.isFinite(millis) ? millis : null;
}

function freezeStateRecord(record) {
  const frozen = Object.freeze({
    record_version: STATE_RECORD_VERSION,
    state_id: record.state_id,
    state_version: record.state_version,
    subject: record.subject,
    state_type: record.state_type,
    value: record.value,
    polarity: record.polarity,
    epistemic_status: record.epistemic_status,
    scope: Object.freeze({ ...(record.scope || {}) }),
    valid_from: record.valid_from || null,
    valid_until: record.valid_until || null,
    evidence_refs: freezeUnique(record.evidence_refs),
    contradiction_refs: freezeUnique(record.contradiction_refs),
    previous_state_id: record.previous_state_id || null,
    created_by_transition_id: record.created_by_transition_id,
  });
  boundStateRecords.add(frozen);
  return frozen;
}

// Bridge from durable protected storage back into the State Engine. The storage
// layer must call this only after loading the canonical record from Reality-owned
// persistence. Like bindAdmittedObservation in the Corridor, binding authenticates
// the record's custody boundary; it does not make the state's content more true.
export function bindStoredStateRecord(record) {
  return freezeStateRecord(record);
}

function validatePriorState(record) {
  if (record === null || record === undefined) return null;
  if (!record || typeof record !== 'object') throw new Error('current_state must be an object when supplied');
  if (!boundStateRecords.has(record)) throw new Error('current_state must be bound from Reality-owned state storage');
  if (record.record_version !== STATE_RECORD_VERSION) throw new Error('current_state record version is incompatible');
  if (!nonEmpty(record.state_id) || !Number.isInteger(record.state_version) || record.state_version < 1) {
    throw new Error('current_state identity/version invalid');
  }
  if (![record.subject, record.state_type, record.value, record.polarity, record.epistemic_status].every(nonEmpty)) {
    throw new Error('current_state is missing canonical state fields');
  }
  return record;
}

export function authorizeStateCandidate({ realityStateAuthorization, propositionProjection }) {
  const state = inspectAuthorization(realityStateAuthorization);
  if (!state.authorized || state.type !== 'REALITY_STATE' || !ACCEPTED_REALITY_STATES.has(state.state)) {
    throw new Error('state candidate requires an authorized Reality state');
  }

  const proposition = groundedProjectionSnapshot(propositionProjection);
  if (!authorizationDependsOn(realityStateAuthorization, propositionProjection)) {
    throw new Error('Reality state is not bound to the proposed state proposition');
  }

  const evidenceRefs = collectProjectionObservationRefs(realityStateAuthorization);
  if (proposition.observation_ref) evidenceRefs.add(proposition.observation_ref);

  const validFrom = normalizeIso(proposition.scope.valid_from, 'state valid_from');
  const validUntil = normalizeIso(proposition.scope.valid_until, 'state valid_until');
  const normalizedScope = Object.freeze({
    ...proposition.scope,
    ...(validFrom ? { valid_from: validFrom } : {}),
    ...(validUntil ? { valid_until: validUntil } : {}),
  });

  return issueStateAuthorization('STATE_CANDIDATE', {
    authority: STATE_ENGINE_AUTHORITY,
    subject: proposition.subject,
    state_type: proposition.state_type,
    value: proposition.value,
    polarity: proposition.polarity,
    epistemic_status: state.state,
    scope: normalizedScope,
    valid_from: validFrom,
    valid_until: validUntil,
    evidence_refs: freezeUnique([...evidenceRefs]),
    contradiction_refs: Object.freeze([]),
    source_reality_reason_code: state.reason_code || null,
    dependencies: Object.freeze([realityStateAuthorization, propositionProjection]),
  });
}

function classifyTransition(currentState, candidate) {
  if (candidate.epistemic_status === RealityState.CONTESTED) {
    return Object.freeze({
      type: StateTransitionType.CONTESTED,
      reason_code: 'AUTHORIZED_CANDIDATE_IS_CONTESTED',
      make_new_state: true,
    });
  }

  if (candidate.epistemic_status === RealityState.INSUFFICIENT_EVIDENCE || candidate.epistemic_status === RealityState.UNVERIFIED_ASSESSMENT) {
    return Object.freeze({
      type: StateTransitionType.UNKNOWN,
      reason_code: 'CANDIDATE_LACKS_STATE_PROMOTION_AUTHORITY',
      make_new_state: false,
    });
  }

  if (!currentState) {
    return Object.freeze({
      type: StateTransitionType.UPDATED,
      reason_code: 'AUTHORIZED_INITIAL_STATE_CREATED',
      make_new_state: true,
    });
  }

  if (sameStateValue(currentState, candidate)) {
    return Object.freeze({
      type: StateTransitionType.UNCHANGED,
      reason_code: 'AUTHORIZED_CANDIDATE_MATCHES_CURRENT_STATE',
      make_new_state: false,
    });
  }

  const currentTime = stateTime(currentState);
  const candidateTime = stateTime(candidate);
  if (currentTime !== null && candidateTime !== null) {
    if (candidateTime > currentTime) {
      return Object.freeze({
        type: StateTransitionType.UPDATED,
        reason_code: 'LATER_AUTHORIZED_STATE_SUPERSEDES_PRIOR_VALUE',
        make_new_state: true,
      });
    }
    if (candidateTime < currentTime) {
      return Object.freeze({
        type: StateTransitionType.SUPERSEDED,
        reason_code: 'OLDER_AUTHORIZED_CANDIDATE_CANNOT_REPLACE_NEWER_STATE',
        make_new_state: false,
      });
    }
  }

  return Object.freeze({
    type: StateTransitionType.CONTESTED,
    reason_code: 'DIFFERENT_AUTHORIZED_VALUES_WITHOUT_ORDERING_AUTHORITY',
    make_new_state: true,
  });
}

export function applyStateTransition({ transition_id, current_state = null, candidate_authorization }) {
  if (!nonEmpty(transition_id)) throw new Error('state transition requires transition_id');
  const currentState = validatePriorState(current_state);
  const candidate = requireStateAuthorization(candidate_authorization, 'STATE_CANDIDATE');

  if (currentState && scopeKey(currentState) !== scopeKey(candidate)) {
    throw new Error('candidate state key/scope does not match current_state');
  }

  const classification = classifyTransition(currentState, candidate);
  const nextVersion = currentState ? currentState.state_version + 1 : 1;
  let nextState = currentState;

  if (classification.make_new_state) {
    const contradictionRefs = classification.type === StateTransitionType.CONTESTED && currentState
      ? freezeUnique([...(currentState.evidence_refs || []), ...(candidate.evidence_refs || [])])
      : freezeUnique(candidate.contradiction_refs || []);

    nextState = freezeStateRecord({
      state_id: `${transition_id.trim()}:state:v${nextVersion}`,
      state_version: nextVersion,
      subject: candidate.subject,
      state_type: candidate.state_type,
      value: candidate.value,
      polarity: candidate.polarity,
      epistemic_status: classification.type === StateTransitionType.CONTESTED ? RealityState.CONTESTED : candidate.epistemic_status,
      scope: candidate.scope,
      valid_from: candidate.valid_from,
      valid_until: candidate.valid_until,
      evidence_refs: classification.type === StateTransitionType.CONTESTED && currentState
        ? [...(currentState.evidence_refs || []), ...(candidate.evidence_refs || [])]
        : candidate.evidence_refs,
      contradiction_refs: contradictionRefs,
      previous_state_id: currentState?.state_id || null,
      created_by_transition_id: transition_id.trim(),
    });
  }

  const transition = Object.freeze({
    transition_version: STATE_TRANSITION_VERSION,
    engine_version: STATE_ENGINE_VERSION,
    authority: STATE_ENGINE_AUTHORITY,
    transition_id: transition_id.trim(),
    transition_type: classification.type,
    reason_code: classification.reason_code,
    subject: candidate.subject,
    state_type: candidate.state_type,
    previous_state_id: currentState?.state_id || null,
    resulting_state_id: nextState?.state_id || null,
    candidate_value: candidate.value,
    candidate_polarity: candidate.polarity,
    candidate_epistemic_status: candidate.epistemic_status,
    evidence_refs: candidate.evidence_refs,
    previous_state_preserved: currentState !== null,
    action_authorized: false,
  });

  return Object.freeze({
    transition,
    current_state: nextState || null,
    previous_state: currentState || null,
  });
}

export function inspectStateCandidate(value) {
  if (!value || !issuedStateAuthorizations.has(value)) return Object.freeze({ authorized: false });
  const copy = {};
  for (const [key, entry] of Object.entries(value)) copy[key] = entry;
  return Object.freeze({ authorized: true, ...copy });
}