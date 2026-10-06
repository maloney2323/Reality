import crypto from 'node:crypto';

export const CLOSED_LOOP_OBJECTIVE_VERSION = '0.1.0';

export const CLOSED_LOOP_STATES = Object.freeze([
  'OBJECTIVE_RECEIVED',
  'GAP_DETECTED',
  'CAPABILITY_ACQUIRED',
  'CAPABILITY_VERIFIED',
  'AUTHORITY_GRANTED',
  'EXECUTED',
  'RESULT_OBSERVED',
  'INDEPENDENTLY_VERIFIED',
  'LEARNING_COMMITTED',
  'UNIVERSE_UPDATED',
  'COGNITION_RESUMED',
  'BLOCKED',
  'UNRESOLVED',
]);

const text = (v) => typeof v === 'string' ? v.trim() : '';
const list = (v) => Array.isArray(v) ? v.filter(Boolean) : [];
function stable(v) {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(stable);
  return Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable(v[k])]));
}
function digest(v) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
}
function freeze(v) {
  if (!v || typeof v !== 'object') return v;
  if (Array.isArray(v)) v.forEach(freeze); else Object.values(v).forEach(freeze);
  return Object.freeze(v);
}

export const CLOSED_LOOP_INVARIANTS = Object.freeze({
  everyTransitionProducesArtifact: true,
  capabilityGapRequiresEvidence: true,
  capabilityVerificationIndependentOfAcquisition: true,
  authorityBindsExactAction: true,
  executionIsNotSuccess: true,
  resultObservationIsNotIndependentVerification: true,
  learningRequiresVerifiedOutcome: true,
  universeUpdateRequiresLearningCommit: true,
  cognitionResumesOnlyFromUpdatedUniverse: true,
  noArtifactSelfPromotes: true,
  unresolvedNeverPromotesToCompleted: true,
});

function requireRef(v, name) {
  if (!text(v)) throw new Error(`${name}_REQUIRED`);
  return v;
}

export function createObjective({ objectiveId, description, worldId, continuityRootId, worldlineId, successCriteria = [], evidenceRefs = [] } = {}) {
  requireRef(objectiveId, 'OBJECTIVE_ID');
  requireRef(description, 'OBJECTIVE_DESCRIPTION');
  requireRef(worldId, 'WORLD_ID');
  requireRef(continuityRootId, 'CONTINUITY_ROOT_ID');
  requireRef(worldlineId, 'WORLDLINE_ID');
  if (!list(successCriteria).length) throw new Error('SUCCESS_CRITERIA_REQUIRED');
  return freeze({
    kind: 'CLOSED_LOOP_OBJECTIVE',
    version: CLOSED_LOOP_OBJECTIVE_VERSION,
    state: 'OBJECTIVE_RECEIVED',
    objective_id: objectiveId,
    description,
    world_id: worldId,
    continuity_root_id: continuityRootId,
    worldline_id: worldlineId,
    success_criteria: list(successCriteria),
    evidence_refs: list(evidenceRefs),
    objective_hash: digest({ objectiveId, description, worldId, continuityRootId, worldlineId, successCriteria, evidenceRefs: list(evidenceRefs) }),
  });
}

export function recordCapabilityGap(objective, { gapId, capabilityId, reason, evidenceRefs = [] } = {}) {
  if (objective?.state !== 'OBJECTIVE_RECEIVED') throw new Error('OBJECTIVE_STATE_INVALID');
  requireRef(gapId, 'CAPABILITY_GAP_ID');
  requireRef(capabilityId, 'CAPABILITY_ID');
  requireRef(reason, 'GAP_REASON');
  if (!list(evidenceRefs).length) throw new Error('CAPABILITY_GAP_EVIDENCE_REQUIRED');
  return freeze({ ...objective, state: 'GAP_DETECTED', gap_id: gapId, capability_id: capabilityId, gap_reason: reason, gap_evidence_refs: list(evidenceRefs), gap_hash: digest({ objective_hash: objective.objective_hash, gapId, capabilityId, reason, evidenceRefs }) });
}

export function recordCapabilityAcquisition(gap, { acquisitionId, artifactRefs = [], candidateCapabilityHash } = {}) {
  if (gap?.state !== 'GAP_DETECTED') throw new Error('CAPABILITY_GAP_REQUIRED');
  requireRef(acquisitionId, 'ACQUISITION_ID');
  requireRef(candidateCapabilityHash, 'CANDIDATE_CAPABILITY_HASH');
  if (!list(artifactRefs).length) throw new Error('ACQUISITION_ARTIFACTS_REQUIRED');
  return freeze({ ...gap, state: 'CAPABILITY_ACQUIRED', acquisition_id: acquisitionId, acquisition_artifact_refs: list(artifactRefs), candidate_capability_hash: candidateCapabilityHash, acquisition_hash: digest({ gap_hash: gap.gap_hash, acquisitionId, artifactRefs, candidateCapabilityHash }) });
}

export function verifyCapability(acquisition, { verificationId, independent: independentVerification, passed, evidenceRefs = [] } = {}) {
  if (acquisition?.state !== 'CAPABILITY_ACQUIRED') throw new Error('CAPABILITY_ACQUISITION_REQUIRED');
  requireRef(verificationId, 'CAPABILITY_VERIFICATION_ID');
  if (independent !== true) throw new Error('CAPABILITY_VERIFICATION_MUST_BE_INDEPENDENT');
  if (passed !== true) throw new Error('CAPABILITY_VERIFICATION_FAILED');
  if (!list(evidenceRefs).length) throw new Error('CAPABILITY_VERIFICATION_EVIDENCE_REQUIRED');
  return freeze({ ...acquisition, state: 'CAPABILITY_VERIFIED', capability_verification_id: verificationId, capability_verification_evidence_refs: list(evidenceRefs), capability_verification_hash: digest({ acquisition_hash: acquisition.acquisition_hash, verificationId, evidenceRefs }) });
}

export function grantAuthority(capability, { authorizationId, authorizedBy, actionHash, scope, expiresAt } = {}) {
  if (capability?.state !== 'CAPABILITY_VERIFIED') throw new Error('VERIFIED_CAPABILITY_REQUIRED');
  requireRef(authorizationId, 'AUTHORIZATION_ID');
  requireRef(authorizedBy, 'AUTHORIZED_BY');
  requireRef(actionHash, 'ACTION_HASH');
  requireRef(scope, 'AUTHORITY_SCOPE');
  requireRef(expiresAt, 'AUTHORIZATION_EXPIRY');
  return freeze({ ...capability, state: 'AUTHORITY_GRANTED', authorization_id: authorizationId, authorized_by: authorizedBy, authorized_action_hash: actionHash, authority_scope: scope, authorization_expires_at: expiresAt, authorization_hash: digest({ capability_verification_hash: capability.capability_verification_hash, authorizationId, authorizedBy, actionHash, scope, expiresAt }) });
}

export function recordExecution(authority, { executionReceiptHash, actionHash, status, evidenceRefs = [] } = {}) {
  if (authority?.state !== 'AUTHORITY_GRANTED') throw new Error('AUTHORITY_REQUIRED');
  requireRef(executionReceiptHash, 'EXECUTION_RECEIPT_HASH');
  requireRef(actionHash, 'EXECUTION_ACTION_HASH');
  if (actionHash !== authority.authorized_action_hash) throw new Error('EXECUTION_ACTION_MISMATCH');
  requireRef(status, 'EXECUTION_STATUS');
  if (!list(evidenceRefs).length) throw new Error('EXECUTION_EVIDENCE_REQUIRED');
  if (String(status).toUpperCase() === 'FAILED') return freeze({ ...authority, state: 'BLOCKED', execution_receipt_hash: executionReceiptHash, execution_status: 'FAILED', execution_evidence_refs: list(evidenceRefs) });
  return freeze({ ...authority, state: 'EXECUTED', execution_receipt_hash: executionReceiptHash, execution_status: status, execution_evidence_refs: list(evidenceRefs), execution_hash: digest({ authorization_hash: authority.authorization_hash, executionReceiptHash, actionHash, status, evidenceRefs }) });
}

export function recordExternalObservation(execution, { observationId, executionReceiptHash, evidenceRefs = [], result } = {}) {
  if (execution?.state !== 'EXECUTED') throw new Error('EXECUTION_REQUIRED');
  requireRef(observationId, 'OBSERVATION_ID');
  requireRef(executionReceiptHash, 'OBSERVATION_EXECUTION_RECEIPT_HASH');
  if (executionReceiptHash !== execution.execution_receipt_hash) throw new Error('OBSERVATION_EXECUTION_MISMATCH');
  if (!list(evidenceRefs).length) throw new Error('OBSERVATION_EVIDENCE_REQUIRED');
  return freeze({ ...execution, state: 'RESULT_OBSERVED', target_observation_id: observationId, observed_result: result ?? null, observation_evidence_refs: list(evidenceRefs), observation_hash: digest({ execution_hash: execution.execution_hash, observationId, executionReceiptHash, evidenceRefs, result: result ?? null }) });
}

export function independentlyVerifyObservation(observation, { verificationId, independentSourceRef, targetObservationId, verified, evidenceRefs = [], result } = {}) {
  if (observation?.state !== 'RESULT_OBSERVED') throw new Error('EXTERNAL_OBSERVATION_REQUIRED');
  requireRef(verificationId, 'INDEPENDENT_VERIFICATION_ID');
  requireRef(independentSourceRef, 'INDEPENDENT_SOURCE_REF');
  requireRef(targetObservationId, 'VERIFICATION_TARGET_OBSERVATION_ID');
  if (targetObservationId !== observation.target_observation_id) throw new Error('VERIFICATION_OBSERVATION_MISMATCH');
  if (verified !== true) throw new Error('OUTCOME_NOT_VERIFIED');
  if (!list(evidenceRefs).length) throw new Error('INDEPENDENT_VERIFICATION_EVIDENCE_REQUIRED');
  return freeze({ ...observation, state: 'INDEPENDENTLY_VERIFIED', independent_verification_id: verificationId, independent_source_ref: independentSourceRef, verification_evidence_refs: list(evidenceRefs), verified_result: result ?? observation.observed_result, independent_verification_hash: digest({ observation_hash: observation.observation_hash, verificationId, independentSourceRef, targetObservationId, evidenceRefs, result: result ?? observation.observed_result }) });
}

export function commitLearning(verified, { learningDeltaId, changedClaims = [], evidenceRefs = [] } = {}) {
  if (verified?.state !== 'INDEPENDENTLY_VERIFIED') throw new Error('INDEPENDENT_VERIFICATION_REQUIRED');
  requireRef(learningDeltaId, 'LEARNING_DELTA_ID');
  if (!list(evidenceRefs).length) throw new Error('LEARNING_EVIDENCE_REQUIRED');
  return freeze({ ...verified, state: 'LEARNING_COMMITTED', learning_delta_id: learningDeltaId, changed_claims: list(changedClaims), learning_evidence_refs: list(evidenceRefs), learning_commit_hash: digest({ independent_verification_hash: verified.independent_verification_hash, learningDeltaId, changedClaims, evidenceRefs }) });
}

export function updateUniverse(learning, { universeUpdateId, updatedStateId, ledgerEntryHash } = {}) {
  if (learning?.state !== 'LEARNING_COMMITTED') throw new Error('LEARNING_COMMIT_REQUIRED');
  requireRef(universeUpdateId, 'UNIVERSE_UPDATE_ID');
  requireRef(updatedStateId, 'UPDATED_STATE_ID');
  requireRef(ledgerEntryHash, 'UNIVERSE_LEDGER_ENTRY_HASH');
  return freeze({ ...learning, state: 'UNIVERSE_UPDATED', universe_learning_update_id: universeUpdateId, updated_universe_state_id: updatedStateId, universe_ledger_entry_hash: ledgerEntryHash, universe_update_hash: digest({ learning_commit_hash: learning.learning_commit_hash, universeUpdateId, updatedStateId, ledgerEntryHash }) });
}

export function resumeCognition(updated, { nextCognitiveStateId } = {}) {
  if (updated?.state !== 'UNIVERSE_UPDATED') throw new Error('UNIVERSE_UPDATE_REQUIRED');
  requireRef(nextCognitiveStateId, 'NEXT_COGNITIVE_STATE_ID');
  return freeze({ ...updated, state: 'COGNITION_RESUMED', next_cognitive_state_id: nextCognitiveStateId, closure_hash: digest({ universe_update_hash: updated.universe_update_hash, nextCognitiveStateId }) });
}
