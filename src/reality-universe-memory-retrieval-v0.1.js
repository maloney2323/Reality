import crypto from 'node:crypto';

export const UNIVERSE_MEMORY_RETRIEVAL_VERSION = '0.1.0';

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

function timestamp(value, code) {
  const valueText = text(value);
  if (!valueText || !Number.isFinite(Date.parse(valueText))) throw new Error(code);
  return Date.parse(valueText);
}

/**
 * Retrieval is a memory interface, not a second memory store.
 *
 * The caller supplies durable Universe/bitemporal records. This module only
 * selects and orders evidence for cognition. It never promotes epistemic
 * status, rewrites history, or decides truth.
 */
export const UNIVERSE_MEMORY_RETRIEVAL_INVARIANTS = Object.freeze({
  durableStorageOwnedByCaller: true,
  retrievalDoesNotRewriteHistory: true,
  retrievalDoesNotPromoteEpistemics: true,
  provenancePreserved: true,
  contradictionsPreserved: true,
  deterministicOrdering: true,
});

export function retrieveUniverseMemory(entries = [], {
  continuityRootId = null,
  worldlineId = null,
  from = null,
  to = null,
  assertionTime = null,
  eventKinds = [],
  sourceRefs = [],
  epistemicKinds = [],
  terms = [],
  limit = 100,
} = {}) {
  if (!Array.isArray(entries)) throw new Error('MEMORY_ENTRIES_REQUIRED');

  const normalizedLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 1000) : 100;
  const fromMs = from ? timestamp(from, 'MEMORY_FROM_INVALID') : -Infinity;
  const toMs = to ? timestamp(to, 'MEMORY_TO_INVALID') : Infinity;
  const assertionCutoff = assertionTime
    ? timestamp(assertionTime, 'MEMORY_ASSERTION_TIME_INVALID')
    : Infinity;

  const normalizedTerms = list(terms).map((term) => text(term).toLowerCase()).filter(Boolean);
  const normalizedKinds = new Set(list(eventKinds).map(String));
  const normalizedSources = new Set(list(sourceRefs).map(String));
  const normalizedEpistemics = new Set(list(epistemicKinds).map(String));

  const matches = entries.filter((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    if (continuityRootId && entry.continuity_root_id !== continuityRootId) return false;
    if (worldlineId && entry.worldline_id !== worldlineId) return false;
    if (normalizedKinds.size && !normalizedKinds.has(entry.event_kind)) return false;
    if (normalizedEpistemics.size && !normalizedEpistemics.has(entry.epistemic_kind)) return false;
    if (normalizedSources.size) {
      const refs = [
        entry.source_ref,
        ...(Array.isArray(entry.evidence_references) ? entry.evidence_references : []),
      ].filter(Boolean).map(String);
      if (!refs.some((ref) => normalizedSources.has(ref))) return false;
    }

    const effectiveMs = Date.parse(entry.effective_time || '');
    if (!Number.isFinite(effectiveMs) || effectiveMs < fromMs || effectiveMs > toMs) return false;

    const assertedMs = Date.parse(entry.assertion_time || '');
    if (!Number.isFinite(assertedMs) || assertedMs > assertionCutoff) return false;

    if (normalizedTerms.length) {
      const haystack = JSON.stringify({
        event_kind: entry.event_kind,
        source_ref: entry.source_ref,
        payload: entry.payload,
        metadata: entry.metadata,
      }).toLowerCase();
      if (!normalizedTerms.every((term) => haystack.includes(term))) return false;
    }

    return true;
  });

  matches.sort((a, b) => {
    const assertionDelta = Date.parse(b.assertion_time) - Date.parse(a.assertion_time);
    if (assertionDelta !== 0) return assertionDelta;
    const effectiveDelta = Date.parse(b.effective_time) - Date.parse(a.effective_time);
    if (effectiveDelta !== 0) return effectiveDelta;
    return String(a.ledger_entry_hash || a.entry_id || '').localeCompare(
      String(b.ledger_entry_hash || b.entry_id || ''),
    );
  });

  const selected = matches.slice(0, normalizedLimit);

  return Object.freeze({
    retrieval_version: UNIVERSE_MEMORY_RETRIEVAL_VERSION,
    query_id: `memory_query:${digest({
      continuityRootId, worldlineId, from, to, assertionTime,
      eventKinds, sourceRefs, epistemicKinds, terms, limit: normalizedLimit,
    })}`,
    matched_count: matches.length,
    returned_count: selected.length,
    entries: Object.freeze(selected.map((entry) => Object.freeze({
      ...entry,
      memory_retrieved: true,
      memory_provenance: {
        entry_id: entry.entry_id,
        continuity_root_id: entry.continuity_root_id,
        worldline_id: entry.worldline_id,
        assertion_time: entry.assertion_time,
        effective_time: entry.effective_time,
        ledger_entry_hash: entry.ledger_entry_hash,
      },
    }))),
  });
}
