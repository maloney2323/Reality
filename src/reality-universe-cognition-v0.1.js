import crypto from 'node:crypto';

export const UNIVERSE_COGNITION_VERSION = '0.1.0';

export const EPISTEMIC_KINDS = Object.freeze([
  'OBSERVED',
  'DERIVED',
  'HYPOTHESIS',
  'PREDICTION',
  'DECISION',
  'ACTION',
  'VERIFIED_OUTCOME',
  'LEARNING_DELTA',
]);

export const COGNITIVE_GAPS = Object.freeze([
  'MISSING_EVIDENCE',
  'MISSING_CAPABILITY',
  'CONTRADICTION',
  'AMBIGUITY',
  'INSUFFICIENT_AUTHORITY',
]);

const TERMINAL_KINDS = new Set(['VERIFIED_OUTCOME', 'LEARNING_DELTA']);

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

function ref(value) {
  return text(value) || null;
}

/**
 * Reality Universe Cognition Engine v0.1
 *
 * This is deliberately NOT an LLM wrapper.
 * It is the deterministic cognitive layer between the Information Universe
 * and any pluggable reasoning engine.
 *
 * The engine:
 *   1. materializes a bounded cognitive state from Universe evidence,
 *   2. separates observation from inference,
 *   3. preserves contradictions instead of collapsing them,
 *   4. derives machine-checkable consequences,
 *   5. records uncertainty and capability gaps,
 *   6. optionally delegates semantic reasoning to a pluggable reasoner,
 *   7. never promotes reasoner output directly to truth,
 *   8. produces a learning delta only from verified outcomes.
 *
 * Governance remains outside this module at consequence boundaries.
 */

export function createUniverseSnapshot({
  worldId,
  continuityRootId,
  worldlineId,
  particles = [],
  evidence = [],
  capabilities = [],
  work = [],
  authority = [],
  outcomes = [],
} = {}) {
  if (!text(worldId)) throw new Error('WORLD_ID_REQUIRED');
  if (!text(continuityRootId)) throw new Error('CONTINUITY_ROOT_ID_REQUIRED');
  if (!text(worldlineId)) throw new Error('WORLDLINE_ID_REQUIRED');

  const snapshot = {
    cognition_version: UNIVERSE_COGNITION_VERSION,
    world_id: worldId,
    continuity_root_id: continuityRootId,
    worldline_id: worldlineId,
    particles: list(particles),
    evidence: list(evidence),
    capabilities: list(capabilities),
    work: list(work),
    authority: list(authority),
    outcomes: list(outcomes),
  };

  return Object.freeze({
    ...snapshot,
    snapshot_id: `universe_snapshot:${digest(snapshot)}`,
    snapshot_hash: digest(snapshot),
  });
}

function normalizeClaim(item, defaultKind = 'OBSERVED') {
  if (!item || typeof item !== 'object') return null;
  const claim = text(item.claim || item.proposition || item.statement);
  if (!claim) return null;

  return {
    id: ref(item.id || item.evidence_id || item.particle_id),
    kind: EPISTEMIC_KINDS.includes(item.kind) ? item.kind : defaultKind,
    claim,
    source_refs: list(item.source_refs || item.evidence_refs || (item.id ? [item.id] : [])),
    worldline_id: ref(item.worldline_id),
    continuity_root_id: ref(item.continuity_root_id),
    confidence: Number.isFinite(Number(item.confidence)) ? Number(item.confidence) : null,
    status: ref(item.status),
  };
}

function buildClaimIndex(snapshot) {
  const claims = [
    ...snapshot.particles.map((x) => normalizeClaim(x, 'OBSERVED')),
    ...snapshot.evidence.map((x) => normalizeClaim(x, 'OBSERVED')),
    ...snapshot.outcomes.map((x) => normalizeClaim(x, 'VERIFIED_OUTCOME')),
  ].filter(Boolean);

  const groups = new Map();
  for (const claim of claims) {
    const key = claim.claim.toLowerCase().replace(/\\s+/g, ' ').trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(claim);
  }
  return groups;
}

function detectContradictions(claimGroups) {
  const contradictions = [];

  // Explicit contradiction declarations are authoritative signals of conflict.
  for (const claims of claimGroups.values()) {
    const contradictory = claims.filter((claim) => claim.status === 'CONTRADICTED');
    if (contradictory.length) {
      contradictions.push({
        type: 'EXPLICIT_CONTRADICTION',
        claims: contradictory.map((claim) => claim.id).filter(Boolean),
      });
    }
  }

  // Opposing boolean statements are detectable without an LLM.
  const all = [...claimGroups.values()].flat();
  const normalized = new Map(all.map((claim) => [claim.claim.toLowerCase(), claim]));
  for (const claim of all) {
    const positive = claim.claim.toLowerCase();
    const negative = positive.startsWith('not ') ? positive.slice(4) : `not ${positive}`;
    const opposite = normalized.get(negative);
    if (opposite && opposite.id !== claim.id) {
      contradictions.push({
        type: 'OPPOSING_ASSERTIONS',
        claims: [claim.id, opposite.id].filter(Boolean),
      });
    }
  }

  return contradictions;
}

function deriveState(snapshot, claimGroups, contradictions) {
  const allClaims = [...claimGroups.values()].flat();
  const knownCapabilities = new Set(
    snapshot.capabilities
      .map((capability) => text(capability?.id || capability?.name))
      .filter(Boolean),
  );

  const unresolvedWork = snapshot.work.filter((item) =>
    ['BLOCKED', 'UNRESOLVED', 'AWAITING_AUTHORIZATION'].includes(item?.status),
  );

  const missingCapabilities = unresolvedWork
    .flatMap((item) => list(item?.missing_capabilities || item?.required_capabilities))
    .filter((capability) => !knownCapabilities.has(capability));

  const missingEvidence = snapshot.work
    .flatMap((item) => list(item?.required_information || item?.missing_evidence))
    .filter((requirement) => !allClaims.some((claim) => claim.claim === requirement));

  return {
    claim_count: allClaims.length,
    contradiction_count: contradictions.length,
    known_capability_count: knownCapabilities.size,
    unresolved_work_count: unresolvedWork.length,
    missing_capabilities: [...new Set(missingCapabilities)],
    missing_evidence: [...new Set(missingEvidence)],
  };
}

export function materializeCognitiveState(snapshot) {
  if (!snapshot?.snapshot_id) throw new Error('UNIVERSE_SNAPSHOT_REQUIRED');

  const claimGroups = buildClaimIndex(snapshot);
  const contradictions = detectContradictions(claimGroups);
  const derived = deriveState(snapshot, claimGroups, contradictions);

  return Object.freeze({
    state_id: `cognitive_state:${digest([snapshot.snapshot_id, derived])}`,
    snapshot_id: snapshot.snapshot_id,
    world_id: snapshot.world_id,
    continuity_root_id: snapshot.continuity_root_id,
    worldline_id: snapshot.worldline_id,
    observations: [...claimGroups.values()].flat().filter((claim) => claim.kind === 'OBSERVED'),
    verified_outcomes: [...claimGroups.values()].flat().filter((claim) => claim.kind === 'VERIFIED_OUTCOME'),
    contradictions,
    derived,
    epistemic_status: contradictions.length ? 'CONTESTED' : 'COHERENT',
  });
}

export function deriveCognitiveConsequences(state) {
  if (!state?.state_id) throw new Error('COGNITIVE_STATE_REQUIRED');

  const consequences = [];

  for (const capability of state.derived.missing_capabilities) {
    consequences.push({
      kind: 'DERIVED',
      type: 'CAPABILITY_GAP',
      gap: 'MISSING_CAPABILITY',
      subject: capability,
      basis_refs: state.derived.missing_capabilities,
      consequence: `Capability "${capability}" is required by unresolved work but is not registered.`,
    });
  }

  for (const evidence of state.derived.missing_evidence) {
    consequences.push({
      kind: 'DERIVED',
      type: 'EVIDENCE_GAP',
      gap: 'MISSING_EVIDENCE',
      subject: evidence,
      consequence: `Required information "${evidence}" is not represented in the current Universe snapshot.`,
    });
  }

  for (const contradiction of state.contradictions) {
    consequences.push({
      kind: 'DERIVED',
      type: 'EPISTEMIC_CONFLICT',
      gap: 'CONTRADICTION',
      subject: contradiction.type,
      basis_refs: contradiction.claims,
      consequence: 'Conflicting claims must remain divergent until resolved by additional evidence or explicit reassessment.',
    });
  }

  return Object.freeze(consequences);
}

export function buildReasonerContext(state, consequences = []) {
  if (!state?.state_id) throw new Error('COGNITIVE_STATE_REQUIRED');

  return Object.freeze({
    context_version: UNIVERSE_COGNITION_VERSION,
    state_id: state.state_id,
    world_id: state.world_id,
    continuity_root_id: state.continuity_root_id,
    worldline_id: state.worldline_id,
    observations: state.observations,
    verified_outcomes: state.verified_outcomes,
    contradictions: state.contradictions,
    derived_consequences: consequences,
    instruction: 'Reason over this state. Do not convert hypotheses into observations. Return uncertainty explicitly.',
  });
}

export async function reasonOverUniverse({
  state,
  consequences = [],
  reasoner = null,
} = {}) {
  const context = buildReasonerContext(state, consequences);

  if (!reasoner || typeof reasoner.reason !== 'function') {
    return Object.freeze({
      mode: 'DETERMINISTIC_ONLY',
      context,
      hypotheses: [],
      predictions: [],
      decisions: [],
      gaps: consequences,
      reasoner_used: false,
    });
  }

  const proposal = await reasoner.reason(context);

  // Reasoner output is ALWAYS epistemically untrusted until independently verified.
  return Object.freeze({
    mode: 'PLUGGABLE_REASONER',
    context,
    hypotheses: list(proposal?.hypotheses).map((item) => ({ ...item, kind: 'HYPOTHESIS' })),
    predictions: list(proposal?.predictions).map((item) => ({ ...item, kind: 'PREDICTION' })),
    decisions: list(proposal?.decisions).map((item) => ({ ...item, kind: 'DECISION' })),
    gaps: [...consequences, ...list(proposal?.gaps)],
    reasoner_used: true,
    reasoner_attested: false,
  });
}

export function createLearningDelta({
  verifiedOutcome,
  priorStateId,
  changedClaims = [],
  capabilityEffects = [],
  falsificationResults = [],
} = {}) {
  if (!verifiedOutcome || verifiedOutcome.kind !== 'VERIFIED_OUTCOME') {
    throw new Error('LEARNING_REQUIRES_VERIFIED_OUTCOME');
  }
  if (!ref(verifiedOutcome.id)) throw new Error('VERIFIED_OUTCOME_ID_REQUIRED');
  if (!text(priorStateId)) throw new Error('PRIOR_STATE_ID_REQUIRED');

  const delta = {
    kind: 'LEARNING_DELTA',
    source_outcome_ref: verifiedOutcome.id,
    prior_state_id: priorStateId,
    changed_claims: list(changedClaims),
    capability_effects: list(capabilityEffects),
    falsification_results: list(falsificationResults),
  };

  return Object.freeze({
    ...delta,
    learning_delta_id: `learning_delta:${digest(delta)}`,
    learning_delta_hash: digest(delta),
  });
}

export function assertEpistemicPromotion({ fromKind, toKind, evidenceRefs = [], independentVerificationRef = null } = {}) {
  if (!EPISTEMIC_KINDS.includes(fromKind) || !EPISTEMIC_KINDS.includes(toKind)) {
    throw new Error('EPISTEMIC_KIND_INVALID');
  }

  const rank = Object.freeze({
    OBSERVED: 1,
    DERIVED: 2,
    HYPOTHESIS: 3,
    PREDICTION: 4,
    DECISION: 5,
    ACTION: 6,
    VERIFIED_OUTCOME: 7,
    LEARNING_DELTA: 8,
  });

  if (rank[toKind] <= rank[fromKind]) return true;

  if (toKind === 'VERIFIED_OUTCOME' && (!independentVerificationRef || !list(evidenceRefs).length)) {
    throw new Error('VERIFIED_OUTCOME_REQUIRES_INDEPENDENT_EVIDENCE');
  }

  if (toKind === 'LEARNING_DELTA') {
    throw new Error('LEARNING_DELTA_MUST_BE_CREATED_FROM_VERIFIED_OUTCOME');
  }

  return true;
}

export function createCognitiveCycle({ snapshot, state, consequences, reasoning }) {
  if (!snapshot?.snapshot_id || !state?.state_id) throw new Error('SNAPSHOT_AND_STATE_REQUIRED');

  const cycle = {
    cycle_version: UNIVERSE_COGNITION_VERSION,
    snapshot_id: snapshot.snapshot_id,
    state_id: state.state_id,
    consequence_count: list(consequences).length,
    reasoning_mode: reasoning?.mode || 'DETERMINISTIC_ONLY',
    reasoner_used: reasoning?.reasoner_used === true,
    promotion_policy: 'NO_REASONER_OUTPUT_IS_TRUTH_WITHOUT_VERIFICATION',
  };

  return Object.freeze({
    ...cycle,
    cycle_id: `cognitive_cycle:${digest(cycle)}`,
  });
}

export const COGNITION_INVARIANTS = Object.freeze({
  persistentStateIsNotTruth: true,
  inferenceIsNotObservation: true,
  reasonerOutputIsUntrusted: true,
  contradictionsArePreserved: true,
  verifiedOutcomeRequiredForLearning: true,
  governanceBeginsAtConsequenceBoundary: true,
  modelProviderIsReplaceable: true,
  universeIsTheCanonicalCognitiveState: true,
});
