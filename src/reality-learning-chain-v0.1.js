import crypto from 'node:crypto';

export const LEARNING_CHAIN_VERSION = '0.1.1';

function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function list(value) { return Array.isArray(value) ? value.filter(Boolean) : []; }
function stable(value) { if (value === null || typeof value !== 'object') return value; if (Array.isArray(value)) return value.map(stable); return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])])); }
function digest(value) { return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }
function freeze(value) { if (!value || typeof value !== 'object') return value; if (Array.isArray(value)) value.forEach(freeze); else Object.values(value).forEach(freeze); return Object.freeze(value); }
function requireRef(value, name) { if (!text(value)) throw new Error(`${name}_REQUIRED`); return value; }

export const LEARNING_CHAIN_INVARIANTS = Object.freeze({
  learningRequiresVerifiedOutcome: true,
  verificationMustReferenceExecution: true,
  verificationMustReferenceTargetObservation: true,
  learningCommitsToPriorState: true,
  learningCommitsToEvidenceBundle: true,
  historyIsAppendOnly: true,
  correctionsAreNewRecords: true,
  learningDoesNotRewriteObservations: true,
});

export function createVerifiedOutcomeRecord({ outcomeId, executionReceiptHash, targetObservationId, independentVerificationId, verificationResult, evidenceReferences = [], priorStateId, worldId, continuityRootId, worldlineId } = {}) {
  requireRef(outcomeId, 'OUTCOME_ID');
  requireRef(executionReceiptHash, 'EXECUTION_RECEIPT_HASH');
  requireRef(targetObservationId, 'TARGET_OBSERVATION_ID');
  requireRef(independentVerificationId, 'INDEPENDENT_VERIFICATION_ID');
  requireRef(priorStateId, 'PRIOR_STATE_ID');
  requireRef(worldId, 'WORLD_ID');
  requireRef(continuityRootId, 'CONTINUITY_ROOT_ID');
  requireRef(worldlineId, 'WORLDLINE_ID');
  const evidence = list(evidenceReferences).map(String);
  if (!evidence.length) throw new Error('VERIFIED_OUTCOME_EVIDENCE_REQUIRED');
  const record = { chain_version: LEARNING_CHAIN_VERSION, kind: 'VERIFIED_OUTCOME', outcome_id: outcomeId, execution_receipt_hash: executionReceiptHash, target_observation_id: targetObservationId, independent_verification_id: independentVerificationId, verification_result: verificationResult ?? null, evidence_references: evidence, prior_state_id: priorStateId, world_id: worldId, continuity_root_id: continuityRootId, worldline_id: worldlineId };
  return freeze({ ...record, outcome_hash: digest(record) });
}

export function createLearningDeltaRecord({ learningDeltaId, verifiedOutcome, changedClaims = [], capabilityEffects = [], falsificationResults = [], evidenceReferences = [], priorLearningHash = null } = {}) {
  if (!verifiedOutcome || verifiedOutcome.kind !== 'VERIFIED_OUTCOME') throw new Error('LEARNING_REQUIRES_VERIFIED_OUTCOME');
  const evidence = [...verifiedOutcome.evidence_references, ...list(evidenceReferences).map(String)].filter(Boolean);
  const delta = { chain_version: LEARNING_CHAIN_VERSION, kind: 'LEARNING_DELTA', learning_delta_id: requireRef(learningDeltaId, 'LEARNING_DELTA_ID'), source_outcome_id: verifiedOutcome.outcome_id, source_outcome_hash: verifiedOutcome.outcome_hash, prior_state_id: verifiedOutcome.prior_state_id, world_id: verifiedOutcome.world_id, continuity_root_id: verifiedOutcome.continuity_root_id, worldline_id: verifiedOutcome.worldline_id, changed_claims: list(changedClaims), capability_effects: list(capabilityEffects), falsification_results: list(falsificationResults), evidence_references: evidence, prior_learning_hash: text(priorLearningHash) || null };
  return freeze({ ...delta, learning_delta_hash: digest(delta) });
}

export function assertLearningChainLink(previousRecord, nextRecord) {
  if (!previousRecord) return true;
  if (!nextRecord) throw new Error('NEXT_LEARNING_RECORD_REQUIRED');
  const expectedPreviousHash = previousRecord.learning_delta_hash || previousRecord.outcome_hash || previousRecord.ledger_entry_hash;
  const actualPreviousHash = nextRecord.prior_learning_hash || nextRecord.prior_outcome_hash || nextRecord.prior_ledger_hash;
  if (expectedPreviousHash !== actualPreviousHash) throw new Error('LEARNING_CHAIN_BREAK');
  return true;
}

export function createEpistemicCorrection({ correctionId, priorLearningDelta, correctedClaims = [], correctionEvidenceReferences = [], reason } = {}) {
  if (!priorLearningDelta?.learning_delta_hash) throw new Error('PRIOR_LEARNING_DELTA_REQUIRED');
  const evidence = list(correctionEvidenceReferences).map(String);
  if (!evidence.length) throw new Error('CORRECTION_EVIDENCE_REQUIRED');
  const correction = { chain_version: LEARNING_CHAIN_VERSION, kind: 'EPISTEMIC_CORRECTION', correction_id: requireRef(correctionId, 'CORRECTION_ID'), corrects_learning_delta_hash: priorLearningDelta.learning_delta_hash, corrected_claims: list(correctedClaims), correction_evidence_references: evidence, reason: text(reason) || 'NEW_EVIDENCE_OR_REASSESSMENT' };
  return freeze({ ...correction, correction_hash: digest(correction) });
}

export function createUniverseLearningUpdate({ verifiedOutcome, learningDelta, bitemporalLedgerEntry, cognitiveStateId } = {}) {
  if (!verifiedOutcome?.outcome_hash) throw new Error('VERIFIED_OUTCOME_REQUIRED');
  if (!learningDelta?.learning_delta_hash) throw new Error('LEARNING_DELTA_REQUIRED');
  if (learningDelta.source_outcome_hash !== verifiedOutcome.outcome_hash) throw new Error('LEARNING_OUTCOME_MISMATCH');
  if (!bitemporalLedgerEntry?.ledger_entry_hash) throw new Error('BITEMPORAL_LEDGER_ENTRY_REQUIRED');
  if (!text(cognitiveStateId)) throw new Error('COGNITIVE_STATE_ID_REQUIRED');
  const update = { chain_version: LEARNING_CHAIN_VERSION, kind: 'UNIVERSE_LEARNING_UPDATE', verified_outcome_hash: verifiedOutcome.outcome_hash, learning_delta_hash: learningDelta.learning_delta_hash, ledger_entry_hash: bitemporalLedgerEntry.ledger_entry_hash, cognitive_state_id: cognitiveStateId, continuity_root_id: verifiedOutcome.continuity_root_id, worldline_id: verifiedOutcome.worldline_id };
  return freeze({ ...update, universe_learning_update_id: `universe_learning_update:${digest(update)}`, universe_update_hash: digest(update) });
}

export function validateLearningChain(records = []) {
  if (!Array.isArray(records)) throw new Error('LEARNING_RECORDS_ARRAY_REQUIRED');
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (!record || typeof record !== 'object') throw new Error(`LEARNING_RECORD_${index}_INVALID`);
    if (index === 0) continue;
    assertLearningChainLink(records[index - 1], record);
  }
  return Object.freeze({ valid: true, record_count: records.length, terminal_hash: records.length ? records[records.length - 1].learning_delta_hash || records[records.length - 1].outcome_hash || records[records.length - 1].ledger_entry_hash || records[records.length - 1].correction_hash || null : null });
}
