// Reality Evidence Escrow / Invariant Check v0.1
//
// Purpose: enforce a hard integrity boundary between admitted observations and
// canonical evidence. This module does not decide truth, authority, confidence,
// causality, or independence. It only verifies that canonicalization preserved
// meaning-bearing evidence and did not silently promote uncertainty.
//
// Cryptographic sealing is deliberately separate from the synchronous invariant
// gate so existing cleaner callers do not have to become async. The invariant
// gate must pass before a packet is returned; sealEvidenceEscrow() can then bind
// the original and canonical representations cryptographically.

export const EVIDENCE_ESCROW_VERSION = 'reality-evidence-escrow-v0.1';
export const INVARIANT_CHECK_VERSION = 'reality-invariant-check-v0.1';

const PROMOTION_KEY = /(?:^|_)(truth|verified|verification|approved|approval|authorized|authorization|winner|confidence|sufficient|permit|permitted|eligible|qualified)(?:$|_)/i;

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeObservedAt(value) {
  if (value === null || value === undefined || value === '') return null;
  if (!nonEmpty(value)) throw new Error('INVARIANT_INVALID_TIMESTAMP');
  const millis = Date.parse(value);
  if (!Number.isFinite(millis)) throw new Error('INVARIANT_INVALID_TIMESTAMP');
  return new Date(millis).toISOString();
}

function normalizeComparable(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (Array.isArray(value)) return value.map(normalizeComparable);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = normalizeComparable(value[key]);
    return out;
  }
  return value;
}

function equalComparable(a, b) {
  return JSON.stringify(normalizeComparable(a)) === JSON.stringify(normalizeComparable(b));
}

function violation(code, signalId, field, detail) {
  return Object.freeze({
    code,
    signal_id: signalId || null,
    field: field || null,
    detail,
  });
}

function observationById(packet) {
  return new Map((packet?.observations || []).map((observation) => [observation.id, observation]));
}

function checkPromotionKeys(observation) {
  const violations = [];
  for (const key of Object.keys(observation?.attributes || {})) {
    if (key.endsWith('_authority') || key.startsWith('raw_pii_absence_')) continue;
    if (PROMOTION_KEY.test(key)) {
      violations.push(violation(
        'SEMANTIC_PROMOTION_FIELD',
        observation.id,
        `attributes.${key}`,
        'Canonical attributes contain a semantic/authority-like field that the Cleaner invariant gate does not permit.'
      ));
    }
  }
  return violations;
}

export function evaluateCanonicalInvariants({ admittedSignals, canonicalPacket, allowedOmissions = [] }) {
  if (!Array.isArray(admittedSignals) || admittedSignals.length === 0) {
    throw new Error('INVARIANT_ADMITTED_SIGNALS_REQUIRED');
  }
  if (!canonicalPacket || typeof canonicalPacket !== 'object') {
    throw new Error('INVARIANT_CANONICAL_PACKET_REQUIRED');
  }

  const byId = observationById(canonicalPacket);
  const allowedOmissionSet = new Set(allowedOmissions);
  const violations = [];

  for (const signal of admittedSignals) {
    const observation = byId.get(signal.signal_id);
    if (!observation) {
      if (allowedOmissionSet.has(signal.signal_id)) continue;
      violations.push(violation(
        'OBSERVATION_DROPPED',
        signal.signal_id,
        null,
        'An admitted signal has no canonical observation.'
      ));
      continue;
    }

    if (observation.source_ref !== signal.source_ref) {
      violations.push(violation(
        'SOURCE_MUTATED',
        signal.signal_id,
        'source_ref',
        'Canonical source reference differs from admitted source reference.'
      ));
    }

    if (observation.content !== signal.content) {
      violations.push(violation(
        'CONTENT_MUTATED',
        signal.signal_id,
        'content',
        'Canonical content differs from admitted content.'
      ));
    }

    const expectedObservedAt = normalizeObservedAt(signal.observed_at);
    if (observation.observed_at !== expectedObservedAt) {
      violations.push(violation(
        'TEMPORAL_VALUE_MUTATED',
        signal.signal_id,
        'observed_at',
        'Canonical observed time differs from the admitted observed time.'
      ));
    }

    const expectedProvenance = signal.provenance_ref || signal.admission_ref;
    if (observation.provenance_ref !== expectedProvenance) {
      violations.push(violation(
        'PROVENANCE_MUTATED',
        signal.signal_id,
        'provenance_ref',
        'Canonical provenance reference differs from the admitted provenance.'
      ));
    }

    const attributes = observation.attributes || {};
    if (attributes.supersedes_signal_id !== (signal.supersedes_signal_id || null)) {
      violations.push(violation(
        'SUPERSESSION_MUTATED',
        signal.signal_id,
        'supersedes_signal_id',
        'Canonical supersession reference differs from the admitted observation.'
      ));
    }

    if (attributes.disclosure_state !== (signal.disclosure_state || 'UNSPECIFIED')) {
      violations.push(violation(
        'DISCLOSURE_STATE_MUTATED',
        signal.signal_id,
        'disclosure_state',
        'Canonical disclosure state differs from the admitted declaration.'
      ));
    }

    const structured = signal.structured_value;
    if (structured) {
      const expectedStructured = {
        group_key: structured.group_key,
        field_key: structured.field_key,
        value: structured.value,
        source_path: structured.source_path || null,
      };
      const actualStructured = {
        group_key: attributes.structured_group_key,
        field_key: attributes.structured_field_key,
        value: attributes.structured_candidate_value,
        source_path: attributes.structured_source_path,
      };
      if (!equalComparable(expectedStructured, actualStructured)) {
        violations.push(violation(
          'STRUCTURED_CANDIDATE_MUTATED',
          signal.signal_id,
          'structured_value',
          'Canonical structured candidate differs from the admitted structured candidate.'
        ));
      }
    } else {
      if (attributes.structured_group_key !== null ||
          attributes.structured_field_key !== null ||
          attributes.structured_candidate_value !== null) {
        violations.push(violation(
          'STRUCTURED_VALUE_INTRODUCED',
          signal.signal_id,
          'structured_value',
          'Canonicalization introduced a structured candidate that was not admitted.'
        ));
      }
    }

    violations.push(...checkPromotionKeys(observation));
  }

  for (const observation of canonicalPacket.observations || []) {
    if (!admittedSignals.some((signal) => signal.signal_id === observation.id)) {
      violations.push(violation(
        'UNADMITTED_OBSERVATION_INTRODUCED',
        observation.id,
        null,
        'Canonical packet contains an observation without a corresponding admitted signal.'
      ));
    }
  }

  const status = violations.length === 0 ? 'PASS' : 'VIOLATION';
  return Object.freeze({
    version: INVARIANT_CHECK_VERSION,
    status,
    gate: status === 'PASS' ? 'DOWNSTREAM_PROMOTION_ALLOWED' : 'BLOCK_DOWNSTREAM_PROMOTION',
    violations: Object.freeze(violations),
    checked_signal_count: admittedSignals.length,
    checked_observation_count: canonicalPacket.observations.length,
  });
}

export function assertCanonicalInvariants(args) {
  const result = evaluateCanonicalInvariants(args);
  if (result.status !== 'PASS') {
    const first = result.violations[0];
    throw new Error(`INVARIANT_VIOLATION:${first.code}:${first.signal_id || 'unknown'}`);
  }
  return result;
}

import { canonicalJson, sha256Hex } from '../action-gate/canonical.js';

export async function sealEvidenceEscrow({ admittedSignals, canonicalPacket, allowedOmissions = [], transformation_id, cleaner_version }) {
  const invariant = assertCanonicalInvariants({ admittedSignals, canonicalPacket, allowedOmissions });
  const original_hash = await sha256Hex(canonicalJson(admittedSignals));
  const canonical_hash = await sha256Hex(canonicalJson(canonicalPacket));
  const binding_hash = await sha256Hex(canonicalJson({
    escrow_version: EVIDENCE_ESCROW_VERSION,
    invariant_version: INVARIANT_CHECK_VERSION,
    transformation_id: transformation_id || null,
    cleaner_version: cleaner_version || null,
    original_hash,
    canonical_hash,
  }));
  return Object.freeze({
    escrow_version: EVIDENCE_ESCROW_VERSION,
    invariant_version: INVARIANT_CHECK_VERSION,
    status: invariant.status,
    gate: invariant.gate,
    transformation_id: transformation_id || null,
    cleaner_version: cleaner_version || null,
    original_hash,
    canonical_hash,
    binding_hash,
    allowed_omissions: Object.freeze([...allowedOmissions]),
  });
}

export async function verifyEvidenceEscrowSeal({ admittedSignals, canonicalPacket, seal }) {
  if (!seal || seal.escrow_version !== EVIDENCE_ESCROW_VERSION) return false;
  const invariant = evaluateCanonicalInvariants({ admittedSignals, canonicalPacket, allowedOmissions: seal.allowed_omissions || [] });
  if (invariant.status !== 'PASS') return false;
  const original_hash = await sha256Hex(canonicalJson(admittedSignals));
  const canonical_hash = await sha256Hex(canonicalJson(canonicalPacket));
  if (original_hash !== seal.original_hash || canonical_hash !== seal.canonical_hash) return false;
  const binding_hash = await sha256Hex(canonicalJson({
    escrow_version: seal.escrow_version,
    invariant_version: seal.invariant_version,
    transformation_id: seal.transformation_id || null,
    cleaner_version: seal.cleaner_version || null,
    original_hash,
    canonical_hash,
  }));
  return binding_hash === seal.binding_hash;
}

export function buildInvariantWitness({ admittedSignals, canonicalPacket, allowedOmissions = [], transformation_id, cleaner_version }) {
  const result = evaluateCanonicalInvariants({ admittedSignals, canonicalPacket, allowedOmissions });
  return Object.freeze({
    witness_version: EVIDENCE_ESCROW_VERSION,
    invariant_version: INVARIANT_CHECK_VERSION,
    transformation_id: transformation_id || null,
    cleaner_version: cleaner_version || null,
    status: result.status,
    gate: result.gate,
    checked_signal_count: result.checked_signal_count,
    checked_observation_count: result.checked_observation_count,
    allowed_omissions: Object.freeze([...allowedOmissions]),
    violations: result.violations,
    preservation_scope: Object.freeze([
      'SOURCE_REFERENCE',
      'CONTENT',
      'OBSERVED_TIME',
      'PROVENANCE_REFERENCE',
      'SUPERSESSION_REFERENCE',
      'DISCLOSURE_STATE',
      'STRUCTURED_CANDIDATE',
    ]),
  });
}