import crypto from 'node:crypto';

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function hash(value) { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'); }

export const PERSISTENCE_INTEGRITY_VERSION = '0.1.0';

export function createDryfirePersistenceAdapter() {
  const store = new Map();
  return Object.freeze({
    append(record) {
      if (!record?.record_id) throw new Error('PERSISTENCE_RECORD_ID_REQUIRED');
      if (store.has(record.record_id)) throw new Error('PERSISTENCE_DUPLICATE_RECORD');
      const persisted = clone(record);
      persisted.persistence_hash = hash(persisted);
      store.set(record.record_id, persisted);
      return clone(persisted);
    },
    read(recordId) {
      const record = store.get(recordId);
      if (!record) throw new Error('PERSISTED_RECORD_NOT_FOUND');
      return clone(record);
    },
    list() { return [...store.values()].map(clone); },
    corruptPayload(recordId, mutate) {
      const record = store.get(recordId);
      if (!record) throw new Error('PERSISTED_RECORD_NOT_FOUND');
      record.payload = mutate(clone(record.payload));
      store.set(recordId, record);
      return clone(record);
    },
    delete(recordId) { return store.delete(recordId); },
    size() { return store.size; },
  });
}

export function verifyPersistenceIntegrity(persistence) {
  const records = persistence.list();
  for (const record of records) {
    const { persistence_hash, ...unsigned } = record;
    if (!persistence_hash) throw new Error('EPISTEMIC_INTEGRITY_VIOLATION:PERSISTENCE_HASH_MISSING');
    if (hash(unsigned) !== persistence_hash) {
      throw new Error(`EPISTEMIC_INTEGRITY_VIOLATION:PERSISTENCE_HASH_MISMATCH:${record.record_id}`);
    }
  }
  return Object.freeze({ verified: true, record_count: records.length });
}

export function verifyRecursiveClosureLineage(trace) {
  if (!trace?.executionReceipt?.execution_receipt_hash) throw new Error('EPISTEMIC_LINEAGE_VIOLATION:EXECUTION_RECEIPT_MISSING');
  if (!trace?.targetObservation?.execution_receipt_hash || trace.targetObservation.execution_receipt_hash !== trace.executionReceipt.execution_receipt_hash) throw new Error('EPISTEMIC_LINEAGE_VIOLATION:TARGET_EXECUTION_ORPHANED');
  if (!trace?.independentVerification?.target_observation_id || trace.independentVerification.target_observation_id !== trace.targetObservation.observation_id) throw new Error('EPISTEMIC_LINEAGE_VIOLATION:VERIFICATION_TARGET_ORPHANED');
  if (!trace?.independentVerification?.execution_receipt_hash || trace.independentVerification.execution_receipt_hash !== trace.executionReceipt.execution_receipt_hash) throw new Error('EPISTEMIC_LINEAGE_VIOLATION:VERIFICATION_EXECUTION_ORPHANED');
  if (!trace?.verifiedOutcome?.independent_verification_id || trace.verifiedOutcome.independent_verification_id !== trace.independentVerification.verification_id) throw new Error('EPISTEMIC_LINEAGE_VIOLATION:OUTCOME_VERIFICATION_ORPHANED');
  if (!trace?.learningDelta?.source_outcome_id || trace.learningDelta.source_outcome_id !== trace.verifiedOutcome.outcome_id) throw new Error('EPISTEMIC_LINEAGE_VIOLATION:LEARNING_OUTCOME_ORPHANED');
  return Object.freeze({ verified: true });
}

export function persistRecursiveClosureTrace({ persistence, result, ledgerEntry }) {
  const records = [
    { record_id: 'trace:execution', kind: 'EXECUTION_RECEIPT', payload: result.executionReceipt },
    { record_id: 'trace:target-observation', kind: 'TARGET_OBSERVATION', payload: result.targetObservation },
    { record_id: 'trace:independent-verification', kind: 'INDEPENDENT_VERIFICATION', payload: result.independentVerification },
    { record_id: 'trace:verified-outcome', kind: 'VERIFIED_OUTCOME', payload: result.verifiedOutcome },
    { record_id: 'trace:learning-delta', kind: 'LEARNING_DELTA', payload: result.learningDelta },
    { record_id: 'trace:bitemporal-ledger', kind: 'BITEMPORAL_LEDGER_ENTRY', payload: ledgerEntry },
    { record_id: 'trace:universe-learning-update', kind: 'UNIVERSE_LEARNING_UPDATE', payload: result.universeUpdate },
    { record_id: 'trace:next-cognitive-state', kind: 'COGNITIVE_STATE', payload: result.nextCognitiveState },
  ];
  for (const record of records) persistence.append(record);
  return Object.freeze({ persisted_count: records.length, persistence_size: persistence.size() });
}

export function reloadRecursiveClosureTrace(persistence) {
  verifyPersistenceIntegrity(persistence);
  const read = (id) => persistence.read(id).payload;
  const trace = Object.freeze({
    executionReceipt: read('trace:execution'),
    targetObservation: read('trace:target-observation'),
    independentVerification: read('trace:independent-verification'),
    verifiedOutcome: read('trace:verified-outcome'),
    learningDelta: read('trace:learning-delta'),
    ledgerEntry: read('trace:bitemporal-ledger'),
    universeUpdate: read('trace:universe-learning-update'),
    nextCognitiveState: read('trace:next-cognitive-state'),
  });
  verifyRecursiveClosureLineage(trace);
  return trace;
}
