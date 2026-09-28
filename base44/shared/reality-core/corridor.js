// Reality Core Corridor — epistemic authorization primitives.
//
// This module sits ABOVE the frozen F0–F6 observation foundation.
// It does not decide whether arbitrary natural-language claims are true.
// Models/callers may propose structure; Reality authorizes only relationships
// that can be established from explicit structured inputs and rules.
//
// Prime rule: no epistemic promotion without authorization.

const AUTH = Symbol('reality.epistemic.authorization');
const issued = new WeakSet();
const admitted = new WeakSet();

export const Decision = Object.freeze({
  AUTHORIZED: 'AUTHORIZED',
  REJECTED: 'REJECTED',
  UNRESOLVED: 'UNRESOLVED',
});

export const PropositionRelation = Object.freeze({
  SAME: 'SAME_PROPOSITION',
  CONTRADICTORY: 'CONTRADICTORY_PROPOSITION',
  DIFFERENT_SCOPED: 'DIFFERENT_SCOPED_PROPOSITION',
  DIFFERENT: 'DIFFERENT_PROPOSITION',
  UNKNOWN: 'UNKNOWN',
});

export const EvidenceRelation = Object.freeze({
  ENTAILED: 'ENTAILED',
  CONTRADICTED: 'CONTRADICTED',
  PARTIAL: 'PARTIAL',
  UNRELATED: 'UNRELATED',
  UNKNOWN: 'UNKNOWN',
});

export const Independence = Object.freeze({
  INDEPENDENT: 'INDEPENDENT',
  DEPENDENT: 'DEPENDENT',
  UNKNOWN: 'UNKNOWN',
});

export const RealityState = Object.freeze({
  ESTABLISHED: 'ESTABLISHED',
  CONTESTED: 'CONTESTED',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
  UNVERIFIED_ASSESSMENT: 'UNVERIFIED_ASSESSMENT',
});

// Publication is a separate authorization boundary from reconciliation.
// A model may propose any claim it wants; only a Reality-issued publication
// authorization may move an exact proposition/state pair into a factual speech act.
export const PublicationSpeechAct = Object.freeze({
  ASSERT_ESTABLISHED: 'ASSERT_ESTABLISHED',
  REPORT_CONTESTED: 'REPORT_CONTESTED',
  REPORT_INSUFFICIENT: 'REPORT_INSUFFICIENT',
  PRESENT_ASSESSMENT: 'PRESENT_ASSESSMENT',
});

function issue(type, payload) {
  const value = Object.freeze({ [AUTH]: true, type, ...payload });
  issued.add(value);
  return value;
}

function requireAuthorization(value, type) {
  if (!value || !issued.has(value) || value[AUTH] !== true || value.type !== type) {
    throw new Error(`Reality authorization required: ${type}`);
  }
  return value;
}

function nonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

// Bridge from frozen F0–F6 into the corridor. In production this token must be
// created only after retrieving an Observation through Reality's protected
// interface. It proves the record was admitted; it does NOT prove its content.
export function bindAdmittedObservation({ id, content, origin, admission_principal_id, received_at }) {
  if (![id, content, origin, admission_principal_id].every(nonEmptyString)) {
    throw new Error('admitted observation binding requires canonical admission fields');
  }
  const value = Object.freeze({ id, content, origin, admission_principal_id, received_at: received_at ?? null });
  admitted.add(value);
  return value;
}

function requireAdmittedObservation(value) {
  if (!value || !admitted.has(value)) throw new Error('Reality admitted observation required');
  return value;
}

function sameKnown(a, b) {
  return nonEmptyString(a) && nonEmptyString(b) && a === b;
}

function knownDifferent(a, b) {
  return nonEmptyString(a) && nonEmptyString(b) && a !== b;
}

// E0 — Observation projection.
// The model/caller may propose structured proposition fields, but Reality marks
// which fields are grounded in explicit source spans/structured source values.
export function projectObservation({ admittedObservation, proposal, bindings = {} }) {
  const observation = requireAdmittedObservation(admittedObservation);
  if (!proposal || typeof proposal !== 'object') throw new Error('projection requires proposal');

  const allowed = [
    'subject', 'predicate', 'object', 'polarity',
    'temporal_scope', 'geographic_scope', 'metric_scope',
    'modality', 'inference_class', 'temporal_type', 'valid_from', 'valid_until'
  ];
  const projected = {};
  let groundedCount = 0;

  for (const key of allowed) {
    if (proposal[key] === undefined) continue;
    const binding = bindings[key];
    let grounded = false;
    let source_span = null;
    if (binding && Number.isInteger(binding.start) && Number.isInteger(binding.end) && binding.start >= 0 && binding.end > binding.start && binding.end <= observation.content.length) {
      const exact = observation.content.slice(binding.start, binding.end);
      grounded = exact === proposal[key];
      if (grounded) source_span = Object.freeze({ start: binding.start, end: binding.end });
    }
    if (grounded) groundedCount++;
    projected[key] = Object.freeze({ value: proposal[key], grounded, source_span });
  }

  return issue('PROJECTION', {
    observationRef: observation.id,
    projection: Object.freeze(projected),
    decision: groundedCount > 0 ? Decision.AUTHORIZED : Decision.UNRESOLVED,
    reason_code: groundedCount > 0 ? 'FIELDS_MATCH_ADMITTED_SOURCE_SPANS' : 'NO_FIELDS_MATCH_ADMITTED_SOURCE_SPANS',
  });
}

function field(projectionAuth, key) {
  const p = requireAuthorization(projectionAuth, 'PROJECTION').projection[key];
  return p && p.grounded ? p.value : undefined;
}

// E1 — Proposition identity authorization.
export function authorizePropositionRelation(leftProjection, rightProjection) {
  requireAuthorization(leftProjection, 'PROJECTION');
  requireAuthorization(rightProjection, 'PROJECTION');

  const l = (k) => field(leftProjection, k);
  const r = (k) => field(rightProjection, k);

  const baseKeys = ['subject', 'predicate', 'object'];
  if (baseKeys.some((k) => !nonEmptyString(l(k)) || !nonEmptyString(r(k)))) {
    return issue('PROPOSITION_RELATION', {
      decision: Decision.UNRESOLVED,
      relation: PropositionRelation.UNKNOWN,
      reason_code: 'INSUFFICIENT_GROUNDED_PROPOSITION_STRUCTURE',
      dependencies: Object.freeze([leftProjection, rightProjection]),
    });
  }

  if (baseKeys.some((k) => knownDifferent(l(k), r(k)))) {
    return issue('PROPOSITION_RELATION', {
      decision: Decision.AUTHORIZED,
      relation: PropositionRelation.DIFFERENT,
      reason_code: 'BASE_PROPOSITION_DIFFERS',
      dependencies: Object.freeze([leftProjection, rightProjection]),
    });
  }

  const scopeKeys = ['temporal_scope', 'geographic_scope', 'metric_scope', 'modality', 'inference_class', 'temporal_type', 'valid_from', 'valid_until'];
  if (scopeKeys.some((k) => knownDifferent(l(k), r(k)))) {
    return issue('PROPOSITION_RELATION', {
      decision: Decision.AUTHORIZED,
      relation: PropositionRelation.DIFFERENT_SCOPED,
      reason_code: 'MATERIAL_SCOPE_DIFFERS',
      dependencies: Object.freeze([leftProjection, rightProjection]),
    });
  }

  if (scopeKeys.some((k) => (l(k) === undefined) !== (r(k) === undefined))) {
    return issue('PROPOSITION_RELATION', {
      decision: Decision.UNRESOLVED,
      relation: PropositionRelation.UNKNOWN,
      reason_code: 'SCOPE_INCOMPLETELY_GROUNDED',
      dependencies: Object.freeze([leftProjection, rightProjection]),
    });
  }

  const lp = l('polarity');
  const rp = r('polarity');
  if (!nonEmptyString(lp) || !nonEmptyString(rp)) {
    return issue('PROPOSITION_RELATION', {
      decision: Decision.UNRESOLVED,
      relation: PropositionRelation.UNKNOWN,
      reason_code: 'POLARITY_NOT_GROUNDED',
      dependencies: Object.freeze([leftProjection, rightProjection]),
    });
  }

  return issue('PROPOSITION_RELATION', {
    decision: Decision.AUTHORIZED,
    relation: lp === rp ? PropositionRelation.SAME : PropositionRelation.CONTRADICTORY,
    reason_code: lp === rp ? 'BASE_SCOPE_AND_POLARITY_MATCH' : 'SAME_BASE_AND_SCOPE_OPPOSITE_POLARITY',
    dependencies: Object.freeze([leftProjection, rightProjection]),
  });
}

// E2 — Evidence/entailment authorization.
// This gate intentionally supports a small explicit relation vocabulary. It
// refuses to infer arbitrary semantics from prose.
export function authorizeEvidenceRelation({ claimProjection, evidenceProjection }) {
  requireAuthorization(claimProjection, 'PROJECTION');
  requireAuthorization(evidenceProjection, 'PROJECTION');

  const keys = [
    'subject', 'predicate', 'object', 'polarity',
    'temporal_scope', 'geographic_scope', 'metric_scope',
    'modality', 'inference_class', 'temporal_type', 'valid_from', 'valid_until'
  ];
  const claim = Object.fromEntries(keys.map((k) => [k, field(claimProjection, k)]));
  const evidence = Object.fromEntries(keys.map((k) => [k, field(evidenceProjection, k)]));
  const deps = Object.freeze([claimProjection, evidenceProjection]);

  if (!sameKnown(claim.subject, evidence.subject)) {
    return issue('EVIDENCE_RELATION', {
      decision: nonEmptyString(claim.subject) && nonEmptyString(evidence.subject) ? Decision.REJECTED : Decision.UNRESOLVED,
      relation: nonEmptyString(claim.subject) && nonEmptyString(evidence.subject) ? EvidenceRelation.UNRELATED : EvidenceRelation.UNKNOWN,
      reason_code: nonEmptyString(claim.subject) && nonEmptyString(evidence.subject) ? 'SUBJECT_DIFFERS' : 'SUBJECT_NOT_GROUNDED',
      dependencies: deps,
    });
  }

  const required = ['predicate', 'object', 'polarity'];
  if (required.some((k) => !nonEmptyString(claim[k]) || !nonEmptyString(evidence[k]))) {
    return issue('EVIDENCE_RELATION', { decision: Decision.UNRESOLVED, relation: EvidenceRelation.UNKNOWN, reason_code: 'INSUFFICIENT_GROUNDED_RELATION_STRUCTURE', dependencies: deps });
  }

  const scopeKeys = ['temporal_scope', 'geographic_scope', 'metric_scope', 'modality', 'inference_class', 'temporal_type', 'valid_from', 'valid_until'];
  if (scopeKeys.some((k) => knownDifferent(claim[k], evidence[k]))) {
    return issue('EVIDENCE_RELATION', { decision: Decision.REJECTED, relation: EvidenceRelation.UNRELATED, reason_code: 'MATERIAL_SCOPE_DIFFERS', dependencies: deps });
  }
  if (scopeKeys.some((k) => (claim[k] === undefined) !== (evidence[k] === undefined))) {
    return issue('EVIDENCE_RELATION', { decision: Decision.UNRESOLVED, relation: EvidenceRelation.UNKNOWN, reason_code: 'SCOPE_INCOMPLETELY_GROUNDED', dependencies: deps });
  }

  if (!sameKnown(claim.predicate, evidence.predicate) || !sameKnown(claim.object, evidence.object)) {
    return issue('EVIDENCE_RELATION', { decision: Decision.REJECTED, relation: EvidenceRelation.PARTIAL, reason_code: 'PREDICATE_OR_OBJECT_DOES_NOT_MATCH', dependencies: deps });
  }

  if (claim.polarity === evidence.polarity) {
    return issue('EVIDENCE_RELATION', { decision: Decision.AUTHORIZED, relation: EvidenceRelation.ENTAILED, reason_code: 'GROUNDED_PROPOSITION_EXACTLY_MATCHES', dependencies: deps });
  }

  return issue('EVIDENCE_RELATION', { decision: Decision.AUTHORIZED, relation: EvidenceRelation.CONTRADICTED, reason_code: 'GROUNDED_PROPOSITION_MATCHES_WITH_OPPOSITE_POLARITY', dependencies: deps });
}

// E3 — Provenance / independence authorization.
// Explicit lineage creates dependency. Independence requires explicit structural
// evidence of distinct origination; absence of lineage is UNKNOWN, never independent.
export function authorizeProvenance({ leftRef, rightRef, relation = 'UNKNOWN' }) {
  if (!nonEmptyString(leftRef) || !nonEmptyString(rightRef)) throw new Error('provenance requires refs');

  if (leftRef === rightRef || relation === 'DUPLICATE_OF' || relation === 'DERIVED_FROM' || relation === 'SHARED_ANCESTOR') {
    return issue('PROVENANCE', {
      decision: Decision.AUTHORIZED,
      independence: Independence.DEPENDENT,
      provenance_relation: leftRef === rightRef ? 'SAME_RECORD' : relation,
      reason_code: 'DEPENDENCY_ESTABLISHED',
      refs: Object.freeze([leftRef, rightRef]),
    });
  }

  return issue('PROVENANCE', {
    decision: Decision.UNRESOLVED,
    independence: Independence.UNKNOWN,
    provenance_relation: relation,
    reason_code: 'INDEPENDENCE_NOT_ESTABLISHED',
    refs: Object.freeze([leftRef, rightRef]),
  });
}

// E4 — deterministic reconciliation.
// Caller supplies only opaque authorizations issued above, never semantic labels.
export function reconcile({ assessmentOrigin = 'observation', assessmentProjection = null, evidenceAuthorizations = [], propositionAuthorizations = [], provenanceAuthorizations = [] }) {
  if (assessmentProjection) requireAuthorization(assessmentProjection, 'PROJECTION');
  for (const a of evidenceAuthorizations) requireAuthorization(a, 'EVIDENCE_RELATION');
  for (const a of propositionAuthorizations) requireAuthorization(a, 'PROPOSITION_RELATION');
  for (const a of provenanceAuthorizations) requireAuthorization(a, 'PROVENANCE');
  const anchor = assessmentProjection ? [assessmentProjection] : [];

  if (assessmentOrigin === 'model' && evidenceAuthorizations.length === 0) {
    return issue('REALITY_STATE', {
      state: RealityState.UNVERIFIED_ASSESSMENT,
      reason_code: 'MODEL_ASSESSMENT_WITHOUT_AUTHORIZED_EVIDENCE',
      dependencies: Object.freeze([...anchor]),
    });
  }

  const supports = evidenceAuthorizations.filter((a) => a.decision === Decision.AUTHORIZED && a.relation === EvidenceRelation.ENTAILED);
  const contradicts = evidenceAuthorizations.filter((a) => a.decision === Decision.AUTHORIZED && a.relation === EvidenceRelation.CONTRADICTED);
  const authorizedOpposition = propositionAuthorizations.some((a) => a.decision === Decision.AUTHORIZED && a.relation === PropositionRelation.CONTRADICTORY);

  if (supports.length > 0 && contradicts.length > 0 && authorizedOpposition) {
    return issue('REALITY_STATE', {
      state: RealityState.CONTESTED,
      reason_code: 'AUTHORIZED_SUPPORT_AND_CONTRADICTION_REMAIN',
      dependencies: Object.freeze([...anchor, ...supports, ...contradicts, ...propositionAuthorizations]),
    });
  }

  if (supports.length > 0 && contradicts.length === 0) {
    const unresolvedProvenance = provenanceAuthorizations.some((a) => a.decision !== Decision.AUTHORIZED || a.independence === Independence.UNKNOWN);
    if (unresolvedProvenance) {
      return issue('REALITY_STATE', {
        state: RealityState.INSUFFICIENT_EVIDENCE,
        reason_code: 'SUPPORT_EXISTS_BUT_SUPPLIED_PROVENANCE_IS_UNRESOLVED',
        dependencies: Object.freeze([...anchor, ...supports, ...provenanceAuthorizations]),
      });
    }
    return issue('REALITY_STATE', {
      state: RealityState.ESTABLISHED,
      reason_code: provenanceAuthorizations.length === 0 ? 'SINGLE_AUTHORIZED_EVIDENCE_NO_CORROBORATION_CLAIM' : 'AUTHORIZED_EVIDENCE_WITH_RESOLVED_PROVENANCE',
      dependencies: Object.freeze([...anchor, ...supports, ...provenanceAuthorizations]),
    });
  }

  return issue('REALITY_STATE', {
    state: assessmentOrigin === 'model' ? RealityState.UNVERIFIED_ASSESSMENT : RealityState.INSUFFICIENT_EVIDENCE,
    reason_code: 'QUALIFYING_AUTHORIZED_EVIDENCE_ABSENT',
    dependencies: Object.freeze([...anchor, ...evidenceAuthorizations, ...propositionAuthorizations, ...provenanceAuthorizations]),
  });
}

function authorizationDependsOn(root, target, seen = new Set()) {
  if (root === target) return true;
  if (!root || typeof root !== 'object' || seen.has(root)) return false;
  seen.add(root);
  const deps = issued.has(root) && Array.isArray(root.dependencies) ? root.dependencies : [];
  return deps.some((dep) => authorizationDependsOn(dep, target, seen));
}

function groundedPropositionSnapshot(projectionAuth) {
  requireAuthorization(projectionAuth, 'PROJECTION');
  const required = ['subject', 'predicate', 'object', 'polarity'];
  if (required.some((key) => !nonEmptyString(field(projectionAuth, key)))) return null;

  const keys = [
    'subject', 'predicate', 'object', 'polarity',
    'temporal_scope', 'geographic_scope', 'metric_scope',
    'modality', 'inference_class', 'temporal_type', 'valid_from', 'valid_until'
  ];
  const snapshot = {};
  for (const key of keys) {
    const value = field(projectionAuth, key);
    if (value !== undefined) snapshot[key] = value;
  }
  return Object.freeze(snapshot);
}

function requiredSpeechActForState(state) {
  if (state === RealityState.ESTABLISHED) return PublicationSpeechAct.ASSERT_ESTABLISHED;
  if (state === RealityState.CONTESTED) return PublicationSpeechAct.REPORT_CONTESTED;
  if (state === RealityState.INSUFFICIENT_EVIDENCE) return PublicationSpeechAct.REPORT_INSUFFICIENT;
  if (state === RealityState.UNVERIFIED_ASSESSMENT) return PublicationSpeechAct.PRESENT_ASSESSMENT;
  return null;
}

// Epistemic Publication Gate v0.
// The gate binds publication to the exact proposition projection that earned the
// supplied Reality state. A different projection — even one differing only in
// temporal/geographic/metric scope, modality, inference class, or polarity —
// cannot reuse the authorization.
export function authorizePublication({ realityStateAuthorization, propositionProjection, requestedSpeechAct }) {
  const stateAuth = requireAuthorization(realityStateAuthorization, 'REALITY_STATE');
  requireAuthorization(propositionProjection, 'PROJECTION');
  const proposition = groundedPropositionSnapshot(propositionProjection);

  if (!proposition) {
    return issue('PUBLICATION_AUTHORIZATION', {
      decision: Decision.REJECTED,
      reason_code: 'PUBLICATION_REQUIRES_FULLY_GROUNDED_BASE_PROPOSITION',
      state: stateAuth.state,
      requested_speech_act: requestedSpeechAct,
      dependencies: Object.freeze([stateAuth, propositionProjection]),
    });
  }

  if (!authorizationDependsOn(stateAuth, propositionProjection)) {
    return issue('PUBLICATION_AUTHORIZATION', {
      decision: Decision.REJECTED,
      reason_code: 'REALITY_STATE_NOT_BOUND_TO_REQUESTED_PROPOSITION',
      state: stateAuth.state,
      requested_speech_act: requestedSpeechAct,
      proposition,
      dependencies: Object.freeze([stateAuth, propositionProjection]),
    });
  }

  const requiredSpeechAct = requiredSpeechActForState(stateAuth.state);
  if (!requiredSpeechAct || requestedSpeechAct !== requiredSpeechAct) {
    return issue('PUBLICATION_AUTHORIZATION', {
      decision: Decision.REJECTED,
      reason_code: 'SPEECH_ACT_EXCEEDS_AUTHORIZED_EPISTEMIC_STATE',
      state: stateAuth.state,
      requested_speech_act: requestedSpeechAct,
      required_speech_act: requiredSpeechAct,
      proposition,
      dependencies: Object.freeze([stateAuth, propositionProjection]),
    });
  }

  // Current-state propositions must carry a grounded expiry. Historical events
  // remain publishable after time passes because their truth condition is about
  // a past interval, not the present state.
  if (proposition.temporal_type === 'CURRENT') {
    const expiresAt = Date.parse(proposition.valid_until || '');
    if (!Number.isFinite(expiresAt)) {
      return issue('PUBLICATION_AUTHORIZATION', {
        decision: Decision.REJECTED,
        reason_code: 'CURRENT_STATE_REQUIRES_GROUNDED_VALID_UNTIL',
        state: stateAuth.state,
        requested_speech_act: requestedSpeechAct,
        proposition,
        dependencies: Object.freeze([stateAuth, propositionProjection]),
      });
    }
    if (Date.now() > expiresAt) {
      return issue('PUBLICATION_AUTHORIZATION', {
        decision: Decision.REJECTED,
        reason_code: 'CURRENT_STATE_PUBLICATION_AUTHORIZATION_EXPIRED',
        state: stateAuth.state,
        requested_speech_act: requestedSpeechAct,
        proposition,
        dependencies: Object.freeze([stateAuth, propositionProjection]),
      });
    }
  }

  return issue('PUBLICATION_AUTHORIZATION', {
    decision: Decision.AUTHORIZED,
    reason_code: 'EXACT_PROPOSITION_STATE_AND_SPEECH_ACT_AUTHORIZED',
    state: stateAuth.state,
    speech_act: requestedSpeechAct,
    proposition,
    dependencies: Object.freeze([stateAuth, propositionProjection]),
  });
}

// The compiler deliberately returns a bounded semantic object rather than free
// prose. User-facing language can be layered on top later, but it may only use
// fields from this object for factual clauses.
export function compileAuthorizedPublication(publicationAuthorization) {
  const auth = requireAuthorization(publicationAuthorization, 'PUBLICATION_AUTHORIZATION');
  if (auth.decision !== Decision.AUTHORIZED) {
    throw new Error(`Reality publication denied: ${auth.reason_code}`);
  }
  return Object.freeze({
    speech_act: auth.speech_act,
    state: auth.state,
    proposition: auth.proposition,
  });
}

export function inspectAuthorization(value) {
  if (!value || !issued.has(value)) return Object.freeze({ authorized: false });
  const copy = {};
  for (const [k, v] of Object.entries(value)) {
    if (k !== String(AUTH)) copy[k] = v;
  }
  return Object.freeze({ authorized: true, ...copy });
}