// Reality Fragmented Signal Cleaner v0.2.
//
// Role: convert already-admitted, fragmented source signals into one conservative
// canonical evidence packet for specialist engines. This layer performs hygiene,
// not truth determination. It may normalize representation, remove only exact
// same-source repeats, order time, and surface unresolved structured conflicts.
// It MUST NOT infer source independence, causal meaning, identity, or a winning
// value from disagreement.

import { CANONICAL_PACKET_VERSION, validateCanonicalEvidencePacket } from './engine-adapter.js';
import { assertCanonicalInvariants, buildInvariantWitness } from './evidence-escrow-v0.1.js';

export const SIGNAL_CLEANER_VERSION = 'reality-fragmented-signal-cleaner-v0.2';

const DISCLOSURE_STATES = new Set([
  'UNSPECIFIED',
  'RAW_RETAINED_LOCALLY',
  'REDACTED',
  'TOKENIZED',
  'DROPPED',
]);

const INTERACTION_LABELS = Object.freeze({
  LOW_STATE_PROGRESSION: 'LOW_STATE_PROGRESSION',
  HIGH_CONTEXT_SWITCHING: 'HIGH_CONTEXT_SWITCHING',
  NO_OBSERVED_INPUT: 'NO_OBSERVED_INPUT',
  UNRESOLVED_ACTIVITY: 'UNRESOLVED_ACTIVITY',
});

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function optionalText(value) {
  return nonEmpty(value) ? value.trim() : null;
}

function normalizeIso(value, fieldName) {
  if (value === null || value === undefined || value === '') return null;
  if (!nonEmpty(value)) throw new Error(`${fieldName} must be an ISO-compatible string when supplied`);
  const millis = Date.parse(value);
  if (!Number.isFinite(millis)) throw new Error(`${fieldName} is not a valid timestamp`);
  return new Date(millis).toISOString();
}

function freezeStringArray(values) {
  return Object.freeze([...(values || [])]);
}

const FORBIDDEN_ADAPTER_METADATA_KEY = /(?:authoriz|authority|verified|verification|truth|winner|confidence|established|sufficient|permit|allow|block|relevan|eligible|qualified|recurren|labor.?return|attention.?protect|productiv|distract|idle|focus|success|complete|completion|done|finished|outcome)/i;

function normalizeAdapterMetadata(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return Object.freeze({});
  const result = {};
  let count = 0;
  for (const [rawKey, rawValue] of Object.entries(value)) {
    if (count >= 32) break;
    const key = String(rawKey || '').trim();
    if (!key || key.length > 80 || FORBIDDEN_ADAPTER_METADATA_KEY.test(key)) continue;
    if (rawValue === null || typeof rawValue === 'boolean' || typeof rawValue === 'number') {
      result[key] = rawValue;
      count += 1;
      continue;
    }
    if (typeof rawValue === 'string') {
      result[key] = rawValue.trim().slice(0, 1600);
      count += 1;
    }
  }
  return Object.freeze(result);
}

function normalizeDisclosureState(value) {
  if (value === null || value === undefined || value === '') return 'UNSPECIFIED';
  const state = String(value).trim().toUpperCase();
  if (!DISCLOSURE_STATES.has(state)) throw new Error(`unsupported disclosure_state: ${value}`);
  return state;
}

function boundedCount(value, field, max = 1_000_000) {
  if (value === null || value === undefined || value === '') return null;
  if (!Number.isInteger(value) || value < 0 || value > max) throw new Error(`${field} must be a bounded nonnegative integer`);
  return value;
}

function normalizeInteractionTelemetry(value, signalId) {
  if (value === null || value === undefined) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`signal ${signalId} interaction_telemetry must be an object when supplied`);
  }
  const windowMs = boundedCount(value.window_ms, `signal ${signalId} interaction_telemetry.window_ms`, 24 * 60 * 60 * 1000);
  const contextSwitchCount = boundedCount(value.context_switch_count, `signal ${signalId} interaction_telemetry.context_switch_count`);
  const inputEventCount = boundedCount(value.input_event_count, `signal ${signalId} interaction_telemetry.input_event_count`);
  const stateProgressionCount = boundedCount(value.state_progression_count, `signal ${signalId} interaction_telemetry.state_progression_count`);
  if (windowMs === null || windowMs === 0) throw new Error(`signal ${signalId} interaction_telemetry requires positive window_ms`);

  const labels = [];
  if (inputEventCount === 0) labels.push(INTERACTION_LABELS.NO_OBSERVED_INPUT);
  const switchesPerMinute = contextSwitchCount === null ? null : contextSwitchCount / (windowMs / 60_000);
  if (switchesPerMinute !== null && switchesPerMinute >= 6) labels.push(INTERACTION_LABELS.HIGH_CONTEXT_SWITCHING);
  const observedInteraction = (contextSwitchCount || 0) > 0 || (inputEventCount || 0) > 0;
  if (stateProgressionCount === 0 && observedInteraction) labels.push(INTERACTION_LABELS.LOW_STATE_PROGRESSION);
  labels.push(INTERACTION_LABELS.UNRESOLVED_ACTIVITY);

  return Object.freeze({
    window_ms: windowMs,
    context_switch_count: contextSwitchCount,
    input_event_count: inputEventCount,
    state_progression_count: stateProgressionCount,
    labels: Object.freeze(labels),
    authority: 'INTERACTION_PATTERN_ONLY',
    focus_established: false,
    distraction_established: false,
    idle_established: false,
    productivity_established: false,
  });
}

function normalizeSignal(raw, index) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`signal ${index} must be an object`);
  if (!nonEmpty(raw.signal_id)) throw new Error(`signal ${index} requires signal_id`);
  if (!nonEmpty(raw.admission_ref)) throw new Error(`signal ${raw.signal_id} requires admission_ref`);
  if (!nonEmpty(raw.source_ref)) throw new Error(`signal ${raw.signal_id} requires source_ref`);
  if (!nonEmpty(raw.content)) throw new Error(`signal ${raw.signal_id} requires content`);

  const structured = raw.structured_value && typeof raw.structured_value === 'object' && !Array.isArray(raw.structured_value)
    ? raw.structured_value
    : null;

  let normalizedStructured = null;
  if (structured) {
    const groupKey = optionalText(structured.group_key);
    const fieldKey = optionalText(structured.field_key);
    const value = optionalText(structured.value);
    if (!groupKey || !fieldKey || !value) {
      throw new Error(`signal ${raw.signal_id} structured_value requires group_key, field_key, and value`);
    }
    normalizedStructured = Object.freeze({
      group_key: groupKey,
      field_key: fieldKey,
      value,
      source_path: optionalText(structured.source_path),
      authority: 'ADAPTER_STRUCTURED_CANDIDATE_ONLY',
    });
  }

  return Object.freeze({
    signal_id: raw.signal_id.trim(),
    admission_ref: raw.admission_ref.trim(),
    source_ref: raw.source_ref.trim(),
    content: raw.content,
    observed_at: normalizeIso(raw.observed_at, `signal ${raw.signal_id} observed_at`),
    received_at: normalizeIso(raw.received_at, `signal ${raw.signal_id} received_at`),
    admitted_at: normalizeIso(raw.admitted_at, `signal ${raw.signal_id} admitted_at`),
    provenance_ref: optionalText(raw.provenance_ref),
    supersedes_signal_id: optionalText(raw.supersedes_signal_id),
    disclosure_state: normalizeDisclosureState(raw.disclosure_state),
    structured_value: normalizedStructured,
    interaction_telemetry: normalizeInteractionTelemetry(raw.interaction_telemetry, raw.signal_id),
    adapter_metadata: normalizeAdapterMetadata(raw.adapter_metadata),
  });
}

function exactRepeatKey(signal) {
  // Intentionally includes source_ref and provenance/admission identity. Identical
  // text from another source is NOT a duplicate because it may represent copied,
  // derivative, or independent material; this cleaner is not authorized to decide.
  return JSON.stringify([
    signal.source_ref,
    signal.admission_ref,
    signal.provenance_ref,
    signal.observed_at,
    signal.received_at,
    signal.admitted_at,
    signal.content,
    signal.supersedes_signal_id,
    signal.disclosure_state,
    signal.interaction_telemetry,
    signal.structured_value?.group_key || null,
    signal.structured_value?.field_key || null,
    signal.structured_value?.value || null,
    signal.adapter_metadata,
  ]);
}

function timeRank(signal) {
  const observed = signal.observed_at ? Date.parse(signal.observed_at) : Number.POSITIVE_INFINITY;
  const received = signal.received_at ? Date.parse(signal.received_at) : Number.POSITIVE_INFINITY;
  return [observed, received, signal.signal_id];
}

function compareSignals(a, b) {
  const ar = timeRank(a);
  const br = timeRank(b);
  for (let i = 0; i < ar.length; i += 1) {
    if (ar[i] < br[i]) return -1;
    if (ar[i] > br[i]) return 1;
  }
  return 0;
}

function buildConflicts(signals) {
  const groups = new Map();
  for (const signal of signals) {
    const structured = signal.structured_value;
    if (!structured) continue;
    const key = `${structured.group_key}\u0000${structured.field_key}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(signal);
  }

  const conflicts = [];
  for (const members of groups.values()) {
    const distinctValues = [...new Set(members.map((signal) => signal.structured_value.value))];
    if (distinctValues.length <= 1) continue;
    const first = members[0].structured_value;
    conflicts.push(Object.freeze({
      conflict_type: 'STRUCTURED_VALUE_DISAGREEMENT',
      group_key: first.group_key,
      field_key: first.field_key,
      state: 'UNRESOLVED',
      authority: 'CLEANER_STRUCTURE_ONLY',
      refs: freezeStringArray(members.map((signal) => signal.signal_id)),
      values: freezeStringArray(distinctValues),
      winner: null,
      reason_code: 'DISTINCT_ADAPTER_STRUCTURED_CANDIDATE_VALUES',
    }));
  }
  return Object.freeze(conflicts);
}

function sortIdsBy(signals, field) {
  return [...signals]
    .sort((a, b) => {
      const av = a[field] ? Date.parse(a[field]) : Number.POSITIVE_INFINITY;
      const bv = b[field] ? Date.parse(b[field]) : Number.POSITIVE_INFINITY;
      if (av !== bv) return av - bv;
      return a.signal_id.localeCompare(b.signal_id);
    })
    .map((signal) => signal.signal_id);
}

function buildTemporalSummary(signals, reconciledAt) {
  const observed = signals.map((signal) => signal.observed_at).filter(Boolean).map((value) => Date.parse(value));
  const received = signals.map((signal) => signal.received_at).filter(Boolean).map((value) => Date.parse(value));
  const admitted = signals.map((signal) => signal.admitted_at).filter(Boolean).map((value) => Date.parse(value));
  const fullyTimed = signals.filter((signal) => signal.observed_at && signal.received_at);
  const observedOrder = sortIdsBy(fullyTimed, 'observed_at');
  const receivedOrder = sortIdsBy(fullyTimed, 'received_at');
  return Object.freeze({
    earliest_observed_at: observed.length ? new Date(Math.min(...observed)).toISOString() : null,
    latest_observed_at: observed.length ? new Date(Math.max(...observed)).toISOString() : null,
    earliest_received_at: received.length ? new Date(Math.min(...received)).toISOString() : null,
    latest_received_at: received.length ? new Date(Math.max(...received)).toISOString() : null,
    earliest_admitted_at: admitted.length ? new Date(Math.min(...admitted)).toISOString() : null,
    latest_admitted_at: admitted.length ? new Date(Math.max(...admitted)).toISOString() : null,
    observations_without_observed_at: signals.filter((signal) => !signal.observed_at).length,
    observations_without_received_at: signals.filter((signal) => !signal.received_at).length,
    observations_without_admitted_at: signals.filter((signal) => !signal.admitted_at).length,
    observed_order_differs_from_received_order: fullyTimed.length > 1 && JSON.stringify(observedOrder) !== JSON.stringify(receivedOrder),
    reconciled_at: reconciledAt,
    temporal_authority: 'TIME_NORMALIZATION_ONLY',
    reconciled_at_authority: reconciledAt ? 'CALLER_DECLARED_RECONCILIATION_TIME_ONLY' : null,
  });
}

function validateSupersessionRefs(signals) {
  for (const signal of signals) {
    if (!signal.supersedes_signal_id) continue;
    if (signal.supersedes_signal_id === signal.signal_id) throw new Error(`signal ${signal.signal_id} cannot supersede itself`);
  }
}

export function cleanFragmentedSignals({ packet_id, signals, reconciled_at = null }) {
  if (!nonEmpty(packet_id)) throw new Error('fragmented signal cleaner requires packet_id');
  if (!Array.isArray(signals) || signals.length === 0) throw new Error('fragmented signal cleaner requires non-empty signals');

  const normalized = signals.map(normalizeSignal);
  const reconciledAt = normalizeIso(reconciled_at, 'fragmented signal cleaner reconciled_at');
  const signalIds = new Set();
  for (const signal of normalized) {
    if (signalIds.has(signal.signal_id)) throw new Error(`duplicate signal_id: ${signal.signal_id}`);
    signalIds.add(signal.signal_id);
  }
  validateSupersessionRefs(normalized);

  const seenExact = new Map();
  const kept = [];
  const duplicateRecords = [];
  for (const signal of normalized) {
    const key = exactRepeatKey(signal);
    const original = seenExact.get(key);
    if (original) {
      duplicateRecords.push(Object.freeze({
        duplicate_signal_id: signal.signal_id,
        retained_signal_id: original.signal_id,
        reason_code: 'EXACT_SAME_SOURCE_REPEAT',
      }));
      continue;
    }
    seenExact.set(key, signal);
    kept.push(signal);
  }

  kept.sort(compareSignals);
  const conflicts = buildConflicts(kept);
  const temporal = buildTemporalSummary(kept, reconciledAt);

  const observations = kept.map((signal) => Object.freeze({
    id: signal.signal_id,
    source_ref: signal.source_ref,
    content: signal.content,
    observed_at: signal.observed_at,
    provenance_ref: signal.provenance_ref || signal.admission_ref,
    attributes: Object.freeze({
      cleaner_version: SIGNAL_CLEANER_VERSION,
      admission_ref: signal.admission_ref,
      received_at: signal.received_at,
      admitted_at: signal.admitted_at,
      supersedes_signal_id: signal.supersedes_signal_id,
      supersession_target_in_packet: signal.supersedes_signal_id ? signalIds.has(signal.supersedes_signal_id) : null,
      supersession_authority: signal.supersedes_signal_id ? 'ADAPTER_SUPERSESSION_CANDIDATE_ONLY' : null,
      disclosure_state: signal.disclosure_state,
      disclosure_authority: 'ADAPTER_DISCLOSURE_DECLARATION_ONLY',
      raw_pii_absence_established: false,
      interaction_telemetry: signal.interaction_telemetry,
      structured_group_key: signal.structured_value?.group_key || null,
      structured_field_key: signal.structured_value?.field_key || null,
      structured_candidate_value: signal.structured_value?.value || null,
      structured_source_path: signal.structured_value?.source_path || null,
      structured_authority: signal.structured_value?.authority || null,
      adapter_metadata: signal.adapter_metadata,
      adapter_metadata_authority: 'ADAPTER_METADATA_PRESERVED_ONLY',
    }),
  }));

  const metadata = {
    cleaner_version: SIGNAL_CLEANER_VERSION,
    authority: 'CANONICALIZATION_ONLY',
    input_signal_count: normalized.length,
    canonical_observation_count: observations.length,
    exact_repeat_count: duplicateRecords.length,
    duplicate_records: Object.freeze(duplicateRecords),
    temporal,
    disclosure_policy: 'PRESERVE_EDGE_DISPOSITION_WITHOUT_ZERO_PII_CLAIM',
    interaction_policy: 'DESCRIBE_OBSERVED_PATTERN_WITHOUT_COGNITIVE_STATE_INFERENCE',
    supersession_policy: 'PRESERVE_CANDIDATE_LINEAGE_WITHOUT_REWRITING_HISTORY',
    dedupe_policy: 'EXACT_SAME_SOURCE_REPEAT_ONLY',
    conflict_policy: 'SURFACE_WITHOUT_RESOLUTION',
    independence_policy: 'NOT_INFERRED',
    semantic_policy: 'NO_SEMANTIC_PROMOTION',
  };

  const packet = {
    packet_version: CANONICAL_PACKET_VERSION,
    packet_id: packet_id.trim(),
    observations,
    conflicts,
    metadata,
  };

  // Hard integrity boundary: the canonical packet must preserve the admitted
  // meaning-bearing evidence before it can leave the Cleaner. This is an
  // integrity check, not a truth/authority/confidence decision.
  const allowedOmissions = duplicateRecords.map((record) => record.duplicate_signal_id);
  assertCanonicalInvariants({ admittedSignals: normalized, canonicalPacket: packet, allowedOmissions });
  metadata.evidence_escrow_witness = buildInvariantWitness({
    admittedSignals: normalized,
    canonicalPacket: packet,
    allowedOmissions,
    transformation_id: 'fragmented-signal-cleaner.cleanFragmentedSignals',
    cleaner_version: SIGNAL_CLEANER_VERSION,
  });
  packet.metadata = Object.freeze(metadata);

  return validateCanonicalEvidencePacket(packet);
}