// Governed Continuity Halt Protocol v0.1
//
// A failed continuity transition does not roll back an already-active state.
// The proposed state never becomes active. The halt protocol preserves the last
// admissible state, records why advancement was refused, and exposes only
// bounded recovery paths. It never creates truth, authority, execution,
// or governance authority.

export const GOVERNED_CONTINUITY_HALT_VERSION = 'reality-governed-continuity-halt-v0.1';
export const GOVERNED_CONTINUITY_HALT_AUTHORITY = 'CONSTITUTIONAL_TRANSITION_HALT_ONLY';

export const HaltReason = Object.freeze({
  EPISTEMIC_VIOLATION: 'EPISTEMIC_VIOLATION',
  INTEGRITY_FAILURE: 'INTEGRITY_FAILURE',
  CONTINUITY_FAILURE: 'CONTINUITY_FAILURE',
});

export const RecoveryDisposition = Object.freeze({
  REQUEST_EVIDENCE: 'REQUEST_EVIDENCE',
  REQUEST_RECONCILIATION: 'REQUEST_RECONCILIATION',
  REQUEST_HUMAN_REVIEW: 'REQUEST_HUMAN_REVIEW',
  PROPOSE_RESOLUTION: 'PROPOSE_RESOLUTION',
  RETRY: 'RETRY',
  TERMINATE_EPOCH: 'TERMINATE_EPOCH',
});

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function list(value, field) {
  if (!Array.isArray(value)) throw new Error(field + ' must be an array');
  return [...new Set(value.filter(nonEmpty).map((item) => item.trim()))];
}

function fail(message) {
  throw new Error('Reality governed continuity halt invalid: ' + message);
}

export function createContinuityHalt({
  halt_id,
  transition_id,
  source_state_id,
  source_state_digest,
  proposed_state_id = null,
  proposed_state_digest = null,
  violation_code = HaltReason.EPISTEMIC_VIOLATION,
  violation_details,
  missing_basis_refs = [],
  contradiction_refs = [],
  epistemic_debt_refs = [],
  handoff_id,
  epoch_id,
  lineage_root,
  created_at,
  integrity_digest = null,
} = {}) {
  if (!nonEmpty(halt_id)) fail('halt_id required');
  if (!nonEmpty(transition_id)) fail('transition_id required');
  if (!nonEmpty(source_state_id)) fail('source_state_id required');
  if (!nonEmpty(source_state_digest)) fail('source_state_digest required');
  if (!Object.values(HaltReason).includes(violation_code)) fail('invalid violation_code');
  if (!nonEmpty(violation_details)) fail('violation_details required');
  if (!nonEmpty(handoff_id)) fail('handoff_id required');
  if (!nonEmpty(epoch_id)) fail('epoch_id required');
  if (!nonEmpty(lineage_root)) fail('lineage_root required');
  if (!nonEmpty(created_at) || !Number.isFinite(Date.parse(created_at))) fail('created_at must be a valid timestamp');

  return Object.freeze({
    schema_version: GOVERNED_CONTINUITY_HALT_VERSION,
    authority: GOVERNED_CONTINUITY_HALT_AUTHORITY,
    halt_id: halt_id.trim(),
    transition_id: transition_id.trim(),
    source_state_id: source_state_id.trim(),
    source_state_digest: source_state_digest.trim(),
    proposed_state_id: nonEmpty(proposed_state_id) ? proposed_state_id.trim() : null,
    proposed_state_digest: nonEmpty(proposed_state_digest) ? proposed_state_digest.trim() : null,
    violation_code,
    violation_details: violation_details.trim(),
    missing_basis_refs: list(missing_basis_refs, 'missing_basis_refs'),
    contradiction_refs: list(contradiction_refs, 'contradiction_refs'),
    epistemic_debt_refs: list(epistemic_debt_refs, 'epistemic_debt_refs'),
    handoff_id: handoff_id.trim(),
    epoch_id: epoch_id.trim(),
    lineage_root: lineage_root.trim(),
    created_at: new Date(created_at).toISOString(),
    state_advanced: false,
    authority_created: false,
    execution_authorized: false,
    governance_changed: false,
    integrity_digest: nonEmpty(integrity_digest) ? integrity_digest.trim() : null,
  });
}

export function verifyContinuityHalt(halt = {}) {
  try {
    if (!halt || halt.schema_version !== GOVERNED_CONTINUITY_HALT_VERSION) return false;
    if (halt.authority !== GOVERNED_CONTINUITY_HALT_AUTHORITY) return false;
    if (![halt.halt_id, halt.transition_id, halt.source_state_id, halt.source_state_digest, halt.handoff_id, halt.epoch_id, halt.lineage_root].every(nonEmpty)) return false;
    if (!Object.values(HaltReason).includes(halt.violation_code)) return false;
    if (!nonEmpty(halt.violation_details)) return false;
    if (!Number.isFinite(Date.parse(halt.created_at))) return false;
    if (halt.state_advanced !== false || halt.authority_created !== false || halt.execution_authorized !== false || halt.governance_changed !== false) return false;
    for (const field of ['missing_basis_refs', 'contradiction_refs', 'epistemic_debt_refs']) {
      if (!Array.isArray(halt[field])) return false;
      if (new Set(halt[field]).size !== halt[field].length) return false;
      if (halt[field].some((item) => !nonEmpty(item))) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function permittedRecoveryOptions(halt = {}) {
  if (!verifyContinuityHalt(halt)) fail('cannot derive recovery options from an invalid halt');
  const options = [];

  if (halt.missing_basis_refs.length > 0) options.push(RecoveryDisposition.REQUEST_EVIDENCE);
  if (halt.contradiction_refs.length > 0) options.push(RecoveryDisposition.REQUEST_RECONCILIATION);
  options.push(RecoveryDisposition.REQUEST_HUMAN_REVIEW);
  options.push(RecoveryDisposition.PROPOSE_RESOLUTION);

  if (halt.violation_code === HaltReason.CONTINUITY_FAILURE || halt.violation_code === HaltReason.INTEGRITY_FAILURE) {
    options.push(RecoveryDisposition.RETRY);
  }

  options.push(RecoveryDisposition.TERMINATE_EPOCH);
  return Object.freeze([...new Set(options)]);
}

export function applyRecoveryDisposition({ halt, disposition } = {}) {
  if (!verifyContinuityHalt(halt)) fail('invalid halt');
  if (!Object.values(RecoveryDisposition).includes(disposition)) fail('invalid recovery disposition');

  const permitted = permittedRecoveryOptions(halt);
  if (!permitted.includes(disposition)) fail('recovery disposition is not permitted for this halt');

  return Object.freeze({
    schema_version: GOVERNED_CONTINUITY_HALT_VERSION,
    authority: GOVERNED_CONTINUITY_HALT_AUTHORITY,
    halt_id: halt.halt_id,
    disposition,
    state_advanced: false,
    authority_created: false,
    execution_authorized: false,
    governance_changed: false,
    requires_reassessment: true,
    resolution_event_required: disposition === RecoveryDisposition.PROPOSE_RESOLUTION,
    human_review_required: disposition === RecoveryDisposition.REQUEST_HUMAN_REVIEW,
  });
}