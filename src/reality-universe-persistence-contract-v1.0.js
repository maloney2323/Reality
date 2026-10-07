import crypto from 'node:crypto';

export const REALITY_UNIVERSE_PERSISTENCE_CONTRACT_VERSION =
  'reality-universe-persistence-contract-v1.0';

export const REQUIRED_UNIVERSE_FIELDS = Object.freeze([
  'entry_id',
  'continuity_root_id',
  'worldline_id',
  'event_kind',
  'epistemic_kind',
  'assertion_time',
  'effective_time',
  'source_ref',
  'payload',
  'evidence_references',
  'provenance',
  'ledger_entry_hash',
]);

export const UNIVERSE_PERSISTENCE_INVARIANTS = Object.freeze({
  append_only: true,
  immutable_entry_identity: true,
  immutable_ledger_hash: true,
  bitemporal: true,
  provenance_required: true,
  evidence_references_required: true,
  contradictions_preserved: true,
  epistemic_status_preserved: true,
  retrieval_is_read_only: true,
  storage_does_not_promote_truth: true,
  storage_does_not_grant_authority: true,
});

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

function validTime(value, code) {
  const text = requiredText(value, code);
  if (!Number.isFinite(Date.parse(text))) throw new Error(code);
  return text;
}

export function hashUniverseEntry(entry) {
  if (!entry || typeof entry !== 'object') throw new Error('UNIVERSE_ENTRY_REQUIRED');

  const canonical = { ...entry };
  delete canonical.ledger_entry_hash;
  return digest(canonical);
}

export function validateUniverseEntry(entry) {
  if (!entry || typeof entry !== 'object') throw new Error('UNIVERSE_ENTRY_REQUIRED');

  requiredText(entry.entry_id, 'UNIVERSE_ENTRY_ID_REQUIRED');
  requiredText(entry.continuity_root_id, 'UNIVERSE_CONTINUITY_ROOT_REQUIRED');
  requiredText(entry.worldline_id, 'UNIVERSE_WORLDLINE_REQUIRED');
  requiredText(entry.event_kind, 'UNIVERSE_EVENT_KIND_REQUIRED');
  requiredText(entry.epistemic_kind, 'UNIVERSE_EPISTEMIC_KIND_REQUIRED');
  validTime(entry.assertion_time, 'UNIVERSE_ASSERTION_TIME_INVALID');
  validTime(entry.effective_time, 'UNIVERSE_EFFECTIVE_TIME_INVALID');
  requiredText(entry.source_ref, 'UNIVERSE_SOURCE_REF_REQUIRED');

  if (!Object.prototype.hasOwnProperty.call(entry, 'payload')) {
    throw new Error('UNIVERSE_PAYLOAD_REQUIRED');
  }
  if (!Array.isArray(entry.evidence_references)) {
    throw new Error('UNIVERSE_EVIDENCE_REFERENCES_REQUIRED');
  }
  if (!entry.provenance || typeof entry.provenance !== 'object') {
    throw new Error('UNIVERSE_PROVENANCE_REQUIRED');
  }

  const expectedHash = hashUniverseEntry(entry);
  if (entry.ledger_entry_hash !== expectedHash) {
    throw new Error('UNIVERSE_LEDGER_HASH_MISMATCH');
  }

  return Object.freeze({
    valid: true,
    entry_id: entry.entry_id,
    ledger_entry_hash: expectedHash,
  });
}

export function createUniverseEntry(input = {}) {
  const entry = {
    ...input,
    ledger_entry_hash: null,
  };

  entry.ledger_entry_hash = hashUniverseEntry(entry);
  validateUniverseEntry(entry);
  return Object.freeze(entry);
}

export function assertAppendOnly(existingEntries = [], incomingEntry) {
  if (!Array.isArray(existingEntries)) throw new Error('UNIVERSE_EXISTING_ENTRIES_REQUIRED');
  validateUniverseEntry(incomingEntry);

  const prior = existingEntries.find((entry) => entry?.entry_id === incomingEntry.entry_id);
  if (!prior) return Object.freeze({ allowed: true, reason: 'NEW_ENTRY' });

  validateUniverseEntry(prior);

  if (prior.ledger_entry_hash !== incomingEntry.ledger_entry_hash) {
    throw new Error('UNIVERSE_IMMUTABLE_ENTRY_VIOLATION');
  }

  return Object.freeze({ allowed: false, reason: 'DUPLICATE_IDENTICAL_ENTRY' });
}

export function buildUniversePersistenceContract() {
  return Object.freeze({
    version: REALITY_UNIVERSE_PERSISTENCE_CONTRACT_VERSION,
    required_fields: REQUIRED_UNIVERSE_FIELDS,
    invariants: UNIVERSE_PERSISTENCE_INVARIANTS,
    write_rule: 'APPEND_ONLY',
    identity_rule: 'ENTRY_ID_IMMUTABLE',
    integrity_rule: 'SHA256_CANONICAL_ENTRY_HASH',
    time_model: 'ASSERTION_AND_EFFECTIVE_TIME',
    epistemic_rule: 'STORAGE_PRESERVES_STATUS_DOES_NOT_PROMOTE_TRUTH',
    authority_rule: 'PERSISTENCE_NEVER_GRANTS_AUTHORITY',
    retrieval_rule: 'RETRIEVAL_IS_READ_ONLY',
  });
}
