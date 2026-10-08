import crypto from 'node:crypto';

export const OPERATIONAL_SITUATION_VERSION = 'operational-situation-v1.0';

export const SITUATION_STATES = Object.freeze([
  'OBSERVED',
  'SITUATION_CREATED',
  'EVIDENCE_ESTABLISHED',
  'UNCERTAINTY_ASSESSED',
  'AUTHORITY_DETERMINED',
  'ACTION_PROPOSED',
  'ACTION_AUTHORIZED',
  'ACTION_EXECUTED',
  'OUTCOME_VERIFIED',
  'CLOSED',
  'BLOCKED',
  'REJECTED',
  'EXPIRED',
  'ESCALATED',
]);

const TERMINAL = new Set(['CLOSED', 'BLOCKED', 'REJECTED', 'EXPIRED', 'ESCALATED']);

const ALLOWED = Object.freeze({
  OBSERVED: new Set(['SITUATION_CREATED', 'BLOCKED', 'ESCALATED']),
  SITUATION_CREATED: new Set(['EVIDENCE_ESTABLISHED', 'BLOCKED', 'ESCALATED']),
  EVIDENCE_ESTABLISHED: new Set(['UNCERTAINTY_ASSESSED', 'BLOCKED', 'ESCALATED']),
  UNCERTAINTY_ASSESSED: new Set(['AUTHORITY_DETERMINED', 'BLOCKED', 'ESCALATED']),
  AUTHORITY_DETERMINED: new Set(['ACTION_PROPOSED', 'BLOCKED', 'ESCALATED']),
  ACTION_PROPOSED: new Set(['ACTION_AUTHORIZED', 'REJECTED', 'BLOCKED', 'ESCALATED']),
  ACTION_AUTHORIZED: new Set(['ACTION_EXECUTED', 'BLOCKED', 'EXPIRED']),
  ACTION_EXECUTED: new Set(['OUTCOME_VERIFIED', 'BLOCKED', 'ESCALATED']),
  OUTCOME_VERIFIED: new Set(['CLOSED', 'ESCALATED']),
  CLOSED: new Set(),
  BLOCKED: new Set(),
  REJECTED: new Set(),
  EXPIRED: new Set(),
  ESCALATED: new Set(),
});

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function isoNow(value) {
  return value || new Date().toISOString();
}

function freeze(value) {
  return Object.freeze(value);
}

export function createOperationalSituation({
  observedTrigger,
  claim = null,
  consequence,
  desiredOutcome,
  projectionType = 'OPERATIONAL_SITUATION',
  origin = null,
  evidence = [],
  missingEvidence = [],
  uncertainty = {},
  owner = null,
  authority = {},
  action = {},
  verification = {},
  closure = {},
  observedAt,
  situationId,
} = {}) {
  if (!observedTrigger?.description) throw new Error('SITUATION_TRIGGER_REQUIRED');

  const id = situationId || `situation:${stableHash({
    trigger: observedTrigger,
    observedAt: observedAt || null,
    owner: owner || null,
  }).slice(0, 24)}`;

  const createdAt = isoNow(observedAt);
  const initialEvidence = Array.isArray(evidence) ? evidence.filter(Boolean) : [];

  return freeze({
    situation_version: OPERATIONAL_SITUATION_VERSION,
    situation_id: id,
    state: 'OBSERVED',
    projection_type: String(projectionType || 'OPERATIONAL_SITUATION'),
    origin: freeze(origin || {}),
    claim: String(claim || observedTrigger.description),
    observed_trigger: freeze({
      description: String(observedTrigger.description),
      observed_at: observedTrigger.observed_at || createdAt,
      source: observedTrigger.source || null,
      provenance: observedTrigger.provenance || null,
    }),
    consequence: freeze({
      description: consequence?.description || null,
      desired_outcome: desiredOutcome || consequence?.desired_outcome || null,
      materiality: consequence?.materiality || null,
    }),
    evidence: freeze(initialEvidence),
    missing_evidence: freeze(Array.isArray(missingEvidence) ? missingEvidence : []),
    uncertainty: freeze({
      state: uncertainty.state || 'UNASSESSED',
      confidence: uncertainty.confidence ?? null,
      known_unknowns: Array.isArray(uncertainty.known_unknowns) ? uncertainty.known_unknowns : [],
      blocking_questions: Array.isArray(uncertainty.blocking_questions) ? uncertainty.blocking_questions : [],
    }),
    owner: owner || null,
    authority: freeze({
      status: authority.status || 'UNDETERMINED',
      required_decision_maker: authority.required_decision_maker || null,
      scope: authority.scope || null,
      limits: Array.isArray(authority.limits) ? authority.limits : [],
      authorization_ref: authority.authorization_ref || null,
    }),
    action: freeze({
      proposed: action.proposed || null,
      approval_ref: action.approval_ref || null,
      execution_ref: action.execution_ref || null,
    }),
    verification: freeze({
      method: verification.method || null,
      result: verification.result || null,
      verified_at: verification.verified_at || null,
      provenance: verification.provenance || null,
    }),
    closure: freeze({
      criteria: Array.isArray(closure.criteria) ? closure.criteria : [],
      final_state: closure.final_state || null,
      residual_risks: Array.isArray(closure.residual_risks) ? closure.residual_risks : [],
    }),
    transitions: freeze([freeze({
      from: null,
      to: 'OBSERVED',
      at: createdAt,
      reason: 'OBSERVED_TRIGGER',
    })]),
  });
}

export function transitionOperationalSituation(situation, to, {
  at,
  reason,
  patch = {},
  evidence = null,
  uncertainty = null,
  authority = null,
  action = null,
  verification = null,
  closure = null,
} = {}) {
  if (!situation || !SITUATION_STATES.includes(situation.state)) throw new Error('SITUATION_INVALID');
  if (!SITUATION_STATES.includes(to)) throw new Error('SITUATION_STATE_INVALID');
  if (TERMINAL.has(situation.state)) throw new Error('SITUATION_ALREADY_TERMINAL');
  if (!ALLOWED[situation.state]?.has(to)) {
    throw new Error(`SITUATION_INVALID_TRANSITION:${situation.state}->${to}`);
  }

  const next = {
    ...situation,
    ...patch,
    state: to,
    evidence: evidence ? [...evidence] : situation.evidence,
    uncertainty: uncertainty ? { ...situation.uncertainty, ...uncertainty } : situation.uncertainty,
    authority: authority ? { ...situation.authority, ...authority } : situation.authority,
    action: action ? { ...situation.action, ...action } : situation.action,
    verification: verification ? { ...situation.verification, ...verification } : situation.verification,
    closure: closure ? { ...situation.closure, ...closure } : situation.closure,
    transitions: [
      ...situation.transitions,
      {
        from: situation.state,
        to,
        at: isoNow(at),
        reason: reason || null,
      },
    ],
  };

  return freeze({
    ...next,
    evidence: freeze(next.evidence),
    uncertainty: freeze(next.uncertainty),
    authority: freeze(next.authority),
    action: freeze(next.action),
    verification: freeze(next.verification),
    closure: freeze(next.closure),
    transitions: freeze(next.transitions.map(freeze)),
  });
}

export function advanceSituationToEvidenceEstablished(situation, evidence, options = {}) {
  if (!Array.isArray(evidence) || evidence.length === 0) throw new Error('SITUATION_EVIDENCE_REQUIRED');
  return transitionOperationalSituation(situation, 'SITUATION_CREATED', {
    ...options,
    evidence,
    reason: options.reason || 'SITUATION_CREATED_FROM_OBSERVED_TRIGGER',
  });
}

export function situationCanExecute(situation) {
  return situation?.state === 'ACTION_AUTHORIZED' &&
    situation?.authority?.status === 'AUTHORIZED' &&
    Boolean(situation?.authority?.authorization_ref);
}

export function validateOperationalSituation(situation) {
  if (!situation?.situation_id) return { valid: false, reason: 'SITUATION_ID_MISSING' };
  if (situation.situation_version !== OPERATIONAL_SITUATION_VERSION) return { valid: false, reason: 'SITUATION_VERSION_MISMATCH' };
  if (!SITUATION_STATES.includes(situation.state)) return { valid: false, reason: 'SITUATION_STATE_INVALID' };
  if (!Array.isArray(situation.transitions) || situation.transitions.length === 0) return { valid: false, reason: 'SITUATION_TRANSITION_HISTORY_MISSING' };
  for (let i = 1; i < situation.transitions.length; i += 1) {
    const previous = situation.transitions[i - 1];
    const current = situation.transitions[i];
    if (previous.to !== current.from) return { valid: false, reason: 'SITUATION_TRANSITION_CHAIN_BROKEN' };
  }
  return { valid: true };
}
