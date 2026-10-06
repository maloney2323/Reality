import crypto from 'node:crypto';

export const BITEMPORAL_LEDGER_VERSION = '0.1.0';

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function stable(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stable);
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, stable(value[key])]),
  );
}

function digest(value) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(stable(value)))
    .digest('hex');
}

function requireTimestamp(value, name) {
  const timestamp = text(value);
  if (!timestamp) throw new Error(`${name}_REQUIRED`);
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) throw new Error(`${name}_INVALID`);
  return new Date(parsed).toISOString();
}

function freeze(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    value.forEach(freeze);
  } else {
    Object.values(value).forEach(freeze);
  }
  return Object.freeze(value);
}

/**
 * Bitemporal Universe Ledger v0.1
 *
 * The ledger separates:
 *   effective_time  = when the represented event was true in the world
 *   assertion_time  = when Reality first registered the assertion
 *
 * This is the foundation for historical reconstruction:
 *   "What did Reality know/believe at assertion time T?"
 *
 * The ledger is append-only by contract. Corrections are new entries that
 * supersede or contest prior entries; history is never rewritten in place.
 *
 * This module is deliberately storage-agnostic. A persistence adapter can
 * store these immutable entries in a database, object store, or event log.
 */

export const BITEMPORAL_LEDGER_INVARIANTS = Object.freeze({
  effectiveTimeIsDistinctFromAssertionTime: true,
  historyIsAppendOnly: true,
  correctionsDoNotRewriteHistory: true,
  continuityRootIsRequired: true,
  worldlineIsRequired: true,
  provenanceIsCryptographicallyBound: true,
  historicalReconstructionUsesAssertionTime: true,
  modelProviderIsNotPartOfLedgerTruth: true,
});

export function createBitemporalLedgerEntry({
  entryId,
  eventKind,
  effectiveTime,
  assertionTime,
  continuityRootId,
  worldlineId,
  payload,
  evidenceReferences = [],
  parentEntryId = null,
  priorLedgerHash = null,
  supersedesEntryId = null,
  correctionOfEntryId = null,
  sourceRef = null,
  metadata = {},
} = {}) {
  if (!text(entryId)) throw new Error('LEDGER_ENTRY_ID_REQUIRED');
  if (!text(eventKind)) throw new Error('LEDGER_EVENT_KIND_REQUIRED');
  if (!text(continuityRootId)) throw new Error('CONTINUITY_ROOT_ID_REQUIRED');
  if (!text(worldlineId)) throw new Error('WORLDLINE_ID_REQUIRED');
  if (payload === undefined) throw new Error('LEDGER_PAYLOAD_REQUIRED');

  const normalizedEffectiveTime = requireTimestamp(effectiveTime, 'EFFECTIVE_TIME');
  const normalizedAssertionTime = requireTimestamp(assertionTime, 'ASSERTION_TIME');
  const refs = list(evidenceReferences).map(String);

  const unsigned = {
    ledger_version: BITEMPORAL_LEDGER_VERSION,
    entry_id: entryId,
    event_kind: eventKind,
    effective_time: normalizedEffectiveTime,
    assertion_time: normalizedAssertionTime,
    continuity_root_id: continuityRootId,
    worldline_id: worldlineId,
    payload,
    evidence_references: refs,
    parent_entry_id: text(parentEntryId) || null,
    prior_ledger_hash: text(priorLedgerHash) || null,
    supersedes_entry_id: text(supersedesEntryId) || null,
    correction_of_entry_id: text(correctionOfEntryId) || null,
    source_ref: text(sourceRef) || null,
    metadata,
  };

  const provenanceHash = digest(unsigned);

  return freeze({
    ...unsigned,
    provenance_hash: provenanceHash,
    ledger_entry_hash: digest({
      ...unsigned,
      provenance_hash: provenanceHash,
    }),
  });
}

export function assertLedgerContinuity(previousEntry, nextEntry) {
  if (!previousEntry) return true;
  if (!nextEntry) throw new Error('NEXT_LEDGER_ENTRY_REQUIRED');

  if (nextEntry.prior_ledger_hash !== previousEntry.ledger_entry_hash) {
    throw new Error('LEDGER_CHAIN_BREAK');
  }

  if (nextEntry.continuity_root_id !== previousEntry.continuity_root_id) {
    throw new Error('LEDGER_ROOT_MISMATCH');
  }

  if (nextEntry.worldline_id !== previousEntry.worldline_id) {
    throw new Error('LEDGER_WORLDLINE_MISMATCH');
  }

  return true;
}

export function validateLedgerEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    throw new Error('LEDGER_ENTRY_REQUIRED');
  }

  requireTimestamp(entry.effective_time, 'EFFECTIVE_TIME');
  requireTimestamp(entry.assertion_time, 'ASSERTION_TIME');

  if (!text(entry.entry_id)) throw new Error('LEDGER_ENTRY_ID_REQUIRED');
  if (!text(entry.continuity_root_id)) throw new Error('CONTINUITY_ROOT_ID_REQUIRED');
  if (!text(entry.worldline_id)) throw new Error('WORLDLINE_ID_REQUIRED');
  if (!text(entry.provenance_hash)) throw new Error('PROVENANCE_HASH_REQUIRED');
  if (!text(entry.ledger_entry_hash)) throw new Error('LEDGER_ENTRY_HASH_REQUIRED');

  return true;
}

/**
 * Reconstruct the Universe exactly as asserted by a historical cutoff.
 *
 * Assertion time is the epistemic boundary: entries registered after the
 * cutoff cannot influence the returned historical state, even if their
 * effective time is earlier.
 */
export function reconstructAsBelievedAt(entries = [], {
  assertionTime,
  continuityRootId = null,
  worldlineId = null,
} = {}) {
  const cutoff = requireTimestamp(assertionTime, 'ASSERTION_TIME_CUTOFF');

  return entries
    .filter(Boolean)
    .filter((entry) => {
      validateLedgerEntry(entry);
      if (Date.parse(entry.assertion_time) > Date.parse(cutoff)) return false;
      if (continuityRootId && entry.continuity_root_id !== continuityRootId) return false;
      if (worldlineId && entry.worldline_id !== worldlineId) return false;
      return true;
    })
    .sort((a, b) => {
      const assertionOrder = Date.parse(a.assertion_time) - Date.parse(b.assertion_time);
      if (assertionOrder !== 0) return assertionOrder;
      return a.ledger_entry_hash.localeCompare(b.ledger_entry_hash);
    });
}

/**
 * Query the world by effective time while preserving assertion-time provenance.
 *
 * This is intentionally separate from reconstructAsBelievedAt(). A historical
 * fact can have an old effective time but a later assertion time.
 */
export function queryEffectiveWindow(entries = [], {
  from = null,
  to = null,
  continuityRootId = null,
  worldlineId = null,
} = {}) {
  const fromMs = from ? Date.parse(requireTimestamp(from, 'EFFECTIVE_FROM')) : -Infinity;
  const toMs = to ? Date.parse(requireTimestamp(to, 'EFFECTIVE_TO')) : Infinity;

  return entries
    .filter(Boolean)
    .filter((entry) => {
      validateLedgerEntry(entry);
      const effectiveMs = Date.parse(entry.effective_time);
      if (effectiveMs < fromMs || effectiveMs > toMs) return false;
      if (continuityRootId && entry.continuity_root_id !== continuityRootId) return false;
      if (worldlineId && entry.worldline_id !== worldlineId) return false;
      return true;
    })
    .sort((a, b) => Date.parse(a.effective_time) - Date.parse(b.effective_time));
}

/**
 * Create an explicit correction without mutating the historical entry.
 */
export function createLedgerCorrection({
  correctionEntryId,
  originalEntry,
  correctionPayload,
  effectiveTime,
  assertionTime,
  evidenceReferences = [],
  metadata = {},
} = {}) {
  validateLedgerEntry(originalEntry);

  return createBitemporalLedgerEntry({
    entryId: correctionEntryId,
    eventKind: 'EPISTEMIC_CORRECTION',
    effectiveTime,
    assertionTime,
    continuityRootId: originalEntry.continuity_root_id,
    worldlineId: originalEntry.worldline_id,
    payload: correctionPayload,
    evidenceReferences,
    parentEntryId: originalEntry.entry_id,
    correctionOfEntryId: originalEntry.entry_id,
    priorLedgerHash: originalEntry.ledger_entry_hash,
    metadata: {
      ...metadata,
      correction_reason: 'NEW_EVIDENCE_OR_REASSESSMENT',
    },
  });
}
