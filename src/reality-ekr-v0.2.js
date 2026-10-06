import crypto from 'node:crypto';

export const EKR_VERSION = '0.2.0';
export const EKR_EVENT_STREAM_VERSION = '0.2.0';

export const EKR_STATES = Object.freeze([
  'FACT',
  'DELTA',
  'HYPOTHESIS',
  'RESOLUTION',
  'CONTESTED',
  'OBSOLETE',
  'SUPERSEDED',
]);

export const EKR_EVENT_TYPES = Object.freeze([
  'ASSERTED',
  'CONTESTED',
  'CONTRADICTED',
  'REASSESSED',
  'SUPERSEDED',
  'APPLICABILITY_REVOKED',
  'VERIFICATION_WEAKENED',
  'VERIFICATION_CONFIRMED',
  'REINSTATED',
  'ARCHIVED',
]);

export const EKR_VERIFICATION_LEVELS = Object.freeze([
  'none',
  'execution_receipt',
  'target_observation',
  'independent_verification',
  'verified_outcome',
]);

export const EKR_REUSE_DECISIONS = Object.freeze([
  'SAFE_TO_REUSE',
  'REUSE_WITH_CAUTION',
  'DO_NOT_REUSE',
  'INSUFFICIENT_EVIDENCE',
]);

const TERMINAL_STATES = new Set(['OBSOLETE', 'SUPERSEDED', 'ARCHIVED']);
const SYNTHETIC_IDS = new Set(['connector-bridge-continuity', 'unknown', 'legacy-root']);

function requiredString(value, code) {
  if (typeof value !== 'string' || value.length === 0) throw new Error(code);
  return value;
}

function assertEnum(value, allowed, code) {
  if (!allowed.includes(value)) throw new Error(code);
  return value;
}

function canonicalize(value) {
  if (value === undefined) return null;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
  );
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256Canonical(value) {
  return crypto.createHash('sha256').update(canonicalJson(value)).digest('hex');
}

export function assertNoSyntheticId(value) {
  if (SYNTHETIC_IDS.has(value)) throw new Error('SYNTHETIC_EKR_ID_REJECTED');
  return value;
}

function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function stableArray(values = []) {
  return Object.freeze([...values]);
}

function normalizeRefs(values = []) {
  return stableArray(values.filter((value) => typeof value === 'string' && value.length > 0));
}

export function verificationLevelFromLineage(verificationLineage = {}) {
  const { execution_receipt_ref: execution, target_observation_ref: target, independent_verification_ref: independent, verified_outcome_ref: outcome } = verificationLineage;
  if (outcome && !independent) throw new Error('VERIFIED_OUTCOME_REQUIRES_INDEPENDENT_VERIFICATION');
  if (independent && (!target || !execution)) throw new Error('INDEPENDENT_VERIFICATION_REQUIRES_TARGET_AND_EXECUTION');
  if (target && !execution) throw new Error('TARGET_OBSERVATION_REQUIRES_EXECUTION');
  if (outcome) return 'verified_outcome';
  if (independent) return 'independent_verification';
  if (target) return 'target_observation';
  if (execution) return 'execution_receipt';
  return 'none';
}

export function createEKRAssertion({
  ekrId,
  continuityRootId,
  worldlineId,
  worldId,
  proposition,
  claimScope,
  assertedAt,
  evidenceLineage,
  reconstructionLineage,
  verificationLineage,
  confidenceBasis,
  applicabilityBasis,
  falsifiabilityConditions,
  sourceRuntime = 'reality',
  schemaVersion = EKR_VERSION,
} = {}) {
  requiredString(ekrId, 'EKR_ID_REQUIRED');
  requiredString(continuityRootId, 'CONTINUITY_ROOT_ID_REQUIRED');
  requiredString(worldlineId, 'WORLDLINE_ID_REQUIRED');
  requiredString(worldId, 'WORLD_ID_REQUIRED');
  requiredString(assertedAt, 'ASSERTED_AT_REQUIRED');
  assertNoSyntheticId(continuityRootId);
  assertNoSyntheticId(worldlineId);

  if (!proposition || typeof proposition !== 'object') throw new Error('PROPOSITION_REQUIRED');
  if (!claimScope || typeof claimScope !== 'object') throw new Error('CLAIM_SCOPE_REQUIRED');
  if (!evidenceLineage || typeof evidenceLineage !== 'object') throw new Error('EVIDENCE_LINEAGE_REQUIRED');
  if (!reconstructionLineage || typeof reconstructionLineage !== 'object') throw new Error('RECONSTRUCTION_LINEAGE_REQUIRED');
  if (!verificationLineage || typeof verificationLineage !== 'object') throw new Error('VERIFICATION_LINEAGE_REQUIRED');
  if (!confidenceBasis || typeof confidenceBasis !== 'object') throw new Error('CONFIDENCE_BASIS_REQUIRED');
  if (!applicabilityBasis || typeof applicabilityBasis !== 'object') throw new Error('APPLICABILITY_BASIS_REQUIRED');
  if (!Array.isArray(falsifiabilityConditions)) throw new Error('FALSIFIABILITY_CONDITIONS_REQUIRED');
  verificationLevelFromLineage(verificationLineage);

  const assertion = {
    id: ekrId,
    continuity_root: continuityRootId,
    worldline_id: worldlineId,
    world_id: worldId,
    proposition: canonicalize(proposition),
    claim_scope: canonicalize(claimScope),
    asserted_at: assertedAt,
    evidence_lineage: canonicalize(evidenceLineage),
    reconstruction_lineage: canonicalize(reconstructionLineage),
    verification_lineage: canonicalize(verificationLineage),
    confidence_basis: canonicalize(confidenceBasis),
    applicability_basis: canonicalize(applicabilityBasis),
    falsifiability_conditions: canonicalize(falsifiabilityConditions),
    source_runtime: requiredString(sourceRuntime, 'SOURCE_RUNTIME_REQUIRED'),
    schema_version: schemaVersion,
  };

  return freezeDeep({
    ...assertion,
    assertion_hash: sha256Canonical(assertion),
  });
}

function eventStateTransition(currentState, eventType) {
  const map = {
    ASSERTED: currentState,
    CONTESTED: 'CONTESTED',
    CONTRADICTED: 'OBSOLETE',
    REASSESSED: currentState,
    SUPERSEDED: 'SUPERSEDED',
    APPLICABILITY_REVOKED: 'OBSOLETE',
    VERIFICATION_WEAKENED: currentState === 'RESOLUTION' ? 'CONTESTED' : currentState,
    VERIFICATION_CONFIRMED: currentState === 'HYPOTHESIS' ? 'RESOLUTION' : currentState,
    REINSTATED: currentState === 'OBSOLETE' || currentState === 'CONTESTED' ? 'RESOLUTION' : currentState,
    ARCHIVED: 'OBSOLETE',
  };
  return map[eventType];
}

function stateStrength(state) {
  return {
    FACT: 2,
    DELTA: 1,
    HYPOTHESIS: 0,
    RESOLUTION: 3,
    CONTESTED: -1,
    OBSOLETE: -2,
    SUPERSEDED: -3,
  }[state] ?? -99;
}

export function createEKREvent({
  eventId,
  assertionId,
  continuityRootId,
  worldlineId,
  eventType,
  eventPayload = {},
  causationRefs = [],
  evidenceRefs = [],
  occurredAt,
  recordedAt,
  actorRef,
  authorityRef,
  previousEventHash,
} = {}) {
  requiredString(eventId, 'EKR_EVENT_ID_REQUIRED');
  requiredString(assertionId, 'EKR_ASSERTION_ID_REQUIRED');
  requiredString(continuityRootId, 'CONTINUITY_ROOT_ID_REQUIRED');
  requiredString(worldlineId, 'WORLDLINE_ID_REQUIRED');
  requiredString(occurredAt, 'OCCURRED_AT_REQUIRED');
  requiredString(recordedAt, 'RECORDED_AT_REQUIRED');
  requiredString(actorRef, 'ACTOR_REF_REQUIRED');
  assertEnum(eventType, EKR_EVENT_TYPES, 'EKR_EVENT_TYPE_INVALID');
  assertNoSyntheticId(continuityRootId);
  assertNoSyntheticId(worldlineId);

  const event = {
    id: eventId,
    assertion_id: assertionId,
    continuity_root: continuityRootId,
    worldline_id: worldlineId,
    event_type: eventType,
    event_payload: canonicalize(eventPayload),
    causation_refs: normalizeRefs(causationRefs),
    evidence_refs: normalizeRefs(evidenceRefs),
    occurred_at: occurredAt,
    recorded_at: recordedAt,
    actor_ref: actorRef,
    ...(authorityRef ? { authority_ref: authorityRef } : {}),
    ...(previousEventHash ? { previous_event_hash: previousEventHash } : {}),
  };

  return freezeDeep({
    ...event,
    event_hash: sha256Canonical(event),
  });
}

export function validateEKRVerification({
  verificationLevel,
  verificationLineage = {},
  eventType,
} = {}) {
  assertEnum(verificationLevel, EKR_VERIFICATION_LEVELS, 'VERIFICATION_LEVEL_INVALID');

  const execution = verificationLineage.execution_receipt_ref;
  const target = verificationLineage.target_observation_ref;
  const independent = verificationLineage.independent_verification_ref;
  const outcome = verificationLineage.verified_outcome_ref;

  if (verificationLevel === 'execution_receipt' && !execution) {
    throw new Error('EXECUTION_RECEIPT_LINEAGE_REQUIRED');
  }
  if (verificationLevel === 'target_observation' && (!execution || !target)) {
    throw new Error('TARGET_OBSERVATION_LINEAGE_REQUIRED');
  }
  if (verificationLevel === 'independent_verification' && (!execution || !target || !independent)) {
    throw new Error('INDEPENDENT_VERIFICATION_LINEAGE_REQUIRED');
  }
  if (verificationLevel === 'verified_outcome' && (!execution || !target || !independent || !outcome)) {
    throw new Error('VERIFIED_OUTCOME_LINEAGE_REQUIRED');
  }
  if (eventType === 'VERIFICATION_CONFIRMED' && verificationLevel !== 'independent_verification' && verificationLevel !== 'verified_outcome') {
    throw new Error('VERIFICATION_CONFIRMATION_REQUIRES_INDEPENDENT_VERIFICATION');
  }

  return true;
}

export function foldEKRState(assertion, events = []) {
  if (!assertion?.id) throw new Error('EKR_ASSERTION_REQUIRED');
  let state = 'HYPOTHESIS';
  let verificationLevel = 'none';
  let applicabilityStatus = 'UNKNOWN';
  let contradictionStatus = 'NONE_KNOWN';
  const ordered = [...events].sort((a, b) => (
    a.occurred_at.localeCompare(b.occurred_at)
    || a.recorded_at.localeCompare(b.recorded_at)
    || a.id.localeCompare(b.id)
  ));

  let previousHash = null;
  const seen = new Set();

  for (const event of ordered) {
    if (event.assertion_id !== assertion.id) throw new Error('EKR_EVENT_ASSERTION_MISMATCH');
    if (event.continuity_root !== assertion.continuity_root) throw new Error('EKR_EVENT_ROOT_MISMATCH');
    if (event.worldline_id !== assertion.worldline_id) throw new Error('EKR_EVENT_WORLDLINE_MISMATCH');
    if (seen.has(event.id)) throw new Error('EKR_DUPLICATE_EVENT_ID');
    seen.add(event.id);
    if (event.previous_event_hash !== undefined && event.previous_event_hash !== previousHash) {
      throw new Error('EKR_EVENT_CHAIN_BROKEN');
    }

    if (event.event_type === 'ASSERTED') state = event.event_payload?.state ?? 'HYPOTHESIS';
    else {
      const next = eventStateTransition(state, event.event_type);
      if (next) state = next;
    }

    if (event.event_type === 'CONTRADICTED') contradictionStatus = 'CONTRADICTED';
    if (event.event_type === 'CONTESTED') contradictionStatus = 'CONTESTED';
    if (event.event_type === 'SUPERSEDED') contradictionStatus = 'SUPERSEDED';
    if (event.event_type === 'REINSTATED') contradictionStatus = 'NONE_KNOWN';

    if (event.event_type === 'VERIFICATION_CONFIRMED') {
      verificationLevel = event.event_payload?.verification_level ?? verificationLevel;
    }
    if (event.event_type === 'VERIFICATION_WEAKENED') {
      verificationLevel = event.event_payload?.verification_level ?? 'none';
    }
    if (event.event_type === 'APPLICABILITY_REVOKED') applicabilityStatus = 'NOT_APPLICABLE';
    if (event.event_type === 'REASSESSED' && event.event_payload?.applicability_status) {
      applicabilityStatus = event.event_payload.applicability_status;
    }
    if (event.event_type === 'ASSERTED' && event.event_payload?.applicability_status) {
      applicabilityStatus = event.event_payload.applicability_status;
    }

    previousHash = event.event_hash;
  }

  return Object.freeze({
    ekr_id: assertion.id,
    epistemic_state: state,
    verification_level: verificationLevel,
    applicability_status: applicabilityStatus,
    contradiction_status: contradictionStatus,
    terminal: TERMINAL_STATES.has(state),
    event_count: ordered.length,
    last_event_hash: previousHash,
  });
}

export function evaluateEKRReuse({
  relevance = 'UNKNOWN',
  applicability = 'UNKNOWN',
  contradictionStatus = 'NONE_KNOWN',
  falsificationStatus = 'UNKNOWN',
  verificationSufficiency = 'UNKNOWN',
  epistemicState = 'HYPOTHESIS',
  decisionBasisRefs = [],
} = {}) {
  const badStatus = new Set(['SUPERSEDED', 'OBSOLETE', 'CONTESTED']);
  let reuseDecision = 'SAFE_TO_REUSE';

  if (relevance !== 'RELEVANT') reuseDecision = 'DO_NOT_REUSE';
  else if (applicability !== 'APPLICABLE') reuseDecision = applicability === 'UNKNOWN' ? 'INSUFFICIENT_EVIDENCE' : 'DO_NOT_REUSE';
  else if (badStatus.has(epistemicState) || badStatus.has(contradictionStatus)) {
    reuseDecision = epistemicState === 'CONTESTED' || contradictionStatus === 'CONTESTED'
      ? 'REUSE_WITH_CAUTION'
      : 'DO_NOT_REUSE';
  } else if (falsificationStatus !== 'NO_TRIGGER') {
    reuseDecision = falsificationStatus === 'UNKNOWN' ? 'INSUFFICIENT_EVIDENCE' : 'DO_NOT_REUSE';
  } else if (verificationSufficiency !== 'SUFFICIENT') {
    reuseDecision = verificationSufficiency === 'UNKNOWN' ? 'INSUFFICIENT_EVIDENCE' : 'DO_NOT_REUSE';
  }

  return Object.freeze({
    relevance,
    applicability,
    contradiction_status: contradictionStatus,
    falsification_status: falsificationStatus,
    verification_sufficiency: verificationSufficiency,
    reuse_decision: reuseDecision,
    decision_basis_refs: normalizeRefs(decisionBasisRefs),
  });
}

export function migrateLegacyEKRv01(record, { sourceCommit = 'e6d45b1962caceab71c72f51ab7108f8be4f63c8' } = {}) {
  if (!record || typeof record !== 'object') throw new Error('LEGACY_EKR_REQUIRED');
  requiredString(record.id, 'LEGACY_EKR_ID_REQUIRED');

  return freezeDeep({
    legacy_ekr_ref: record.id,
    legacy_status: 'DEGRADED',
    verification_completeness: 'UNKNOWN',
    reuse_policy: 'REQUIRES_REVALIDATION',
    migrated_version: EKR_VERSION,
    provenance: { source_commit: sourceCommit },
    preserved_record: canonicalize(record),
  });
}

export function assertAppendOnlyEventStream(events = []) {
  let previousHash = null;
  const ids = new Set();
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (ids.has(event.id)) throw new Error('EKR_DUPLICATE_EVENT_ID');
    ids.add(event.id);
    if (index === 0) {
      if (event.previous_event_hash !== undefined) throw new Error('EKR_EVENT_CHAIN_BROKEN');
    } else if (event.previous_event_hash !== previousHash) {
      throw new Error('EKR_EVENT_CHAIN_BROKEN');
    }
    previousHash = event.event_hash;
  }
  return true;
}

export const EKR_STATE_STRENGTH = Object.freeze({ ...Object.fromEntries(EKR_STATES.map((state) => [state, stateStrength(state)])) });
