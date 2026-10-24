// Continuous Reliability v0.1 — preview-gated ledger instrumentation.
// The LLM is never a truth source. A model answer without independently
// verified evidence is recorded as NOT_EVALUATED, never as a clean result.
import crypto from 'node:crypto';
import { assessDrift, proposeDriftRecovery, verifyDriftRecovery } from './reality-drift-recovery-v0.1.js';

export const CONTINUOUS_RELIABILITY_VERSION = 'reality-continuous-reliability-v0.1';
export const BACKCHECK_INTERVAL = 25;

const DRIFT_CODES = new Set(['FACT_DRIFT','OBLIGATION_LOSS','WORLD_SCOPE_DRIFT','EVIDENCE_PROVENANCE_DRIFT']);
const HALLUCINATION_SUSPECT_CODES = new Set([
  'UNSUPPORTED_CLAIM','FALSE_COMPLETION','EVIDENCE_PROVENANCE_DRIFT','FABRICATED_OBLIGATION',
]);

function digest(v) {
  return crypto.createHash('sha256').update(String(v ?? '')).digest('hex');
}

export function classifyReliabilityFindings(codes = []) {
  const unique = [...new Set(codes)];
  return Object.freeze({
    drift: Object.freeze(unique.filter(code => DRIFT_CODES.has(code))),
    hallucination_suspected: Object.freeze(unique.filter(code => HALLUCINATION_SUSPECT_CODES.has(code))),
    // Unsupported is not equivalent to false. Truth adjudication is separate.
    hallucination_confirmed: null,
    hallucination_confirmation_status: 'NOT_INDEPENDENTLY_ADJUDICATED',
  });
}

// Reconstruct a chain from parent references. Timestamp order is insufficient:
// RAW_SIGNAL, TRANSFORMATION and OBSERVATION can share the same assertion_time.
export function orderContinuityHistory(history) {
  if (!Array.isArray(history)) throw new Error('RELIABILITY_HISTORY_REQUIRED');
  if (!history.length) return [];
  const byId = new Map();
  const parentIds = new Set();
  for (const event of history) {
    if (!event?.event_id || byId.has(event.event_id)) throw new Error('RELIABILITY_HISTORY_DUPLICATE_OR_MISSING_ID');
    byId.set(event.event_id, event);
    if (event.parent_event_id) parentIds.add(event.parent_event_id);
  }
  const tips = history.filter(event => !parentIds.has(event.event_id));
  if (tips.length !== 1) throw new Error('RELIABILITY_HISTORY_FORKED');
  const reversed = [];
  const seen = new Set();
  let event = tips[0];
  while (event) {
    if (seen.has(event.event_id)) throw new Error('RELIABILITY_HISTORY_CYCLE');
    seen.add(event.event_id);
    const parent = event.parent_event_id ? byId.get(event.parent_event_id) : null;
    if (event.parent_event_id && !parent) throw new Error('RELIABILITY_HISTORY_PARENT_MISSING');
    if (parent) {
      if (parent.continuity_root_id !== event.continuity_root_id ||
          parent.worldline_id !== event.worldline_id) throw new Error('RELIABILITY_HISTORY_SCOPE_BREAK');
      const priorHash = event.provenance?.continuity_spine?.prior_lineage_hash ?? event.prior_lineage_hash ?? null;
      if (priorHash !== parent.lineage_hash) throw new Error('RELIABILITY_HISTORY_HASH_LINK_INVALID');
    }
    reversed.push(event);
    event = parent;
  }
  if (reversed.length !== history.length) throw new Error('RELIABILITY_HISTORY_DISCONNECTED');
  return reversed.reverse();
}

export function computeHistoricalBackcheck(history, interval = BACKCHECK_INTERVAL) {
  if (!Number.isInteger(interval) || interval < 2) throw new Error('RELIABILITY_INTERVAL_INVALID');
  const ordered = orderContinuityHistory(history);
  const raw = ordered.filter(event => event.event_kind === 'RAW_SIGNAL');
  const turn = raw.length;
  if (turn === 0 || turn % interval !== 0) return null;
  const windowStart = Math.max(1, turn - interval);
  const windowEnd = turn;
  const windowIds = new Set(raw.slice(windowStart - 1, windowEnd).map(event => event.event_id));
  const findings = ordered.filter(event => event.event_kind === 'VERIFICATION' &&
    event.payload?.cycle_version === CONTINUOUS_RELIABILITY_VERSION &&
    event.payload?.event_type === 'MODEL_OUTPUT_ASSESSMENT');
  const inWindow = findings.filter(event => {
    const n = event.payload.turn;
    return Number.isInteger(n) && n >= windowStart && n <= windowEnd;
  });
  const carriedUnresolved = findings.filter(event =>
    event.payload.evaluation_status !== 'EVALUATED_WITH_INDEPENDENT_EVIDENCE' ||
    (event.payload.drift?.length || 0) > 0 ||
    (event.payload.hallucination_suspected?.length || 0) > 0
  );
  const independentlyEvaluated = inWindow.filter(event =>
    event.payload.evaluation_status === 'EVALUATED_WITH_INDEPENDENT_EVIDENCE').length;
  return Object.freeze({
    window_start: windowStart, window_end: windowEnd, total_turns: turn,
    raw_turns_in_window: windowIds.size,
    recorded_assessments: inWindow.length,
    missing_assessment_turns: Math.max(0, windowIds.size - inWindow.length),
    independently_evaluated_turns: independentlyEvaluated,
    unresolved_or_unassessed_receipt_ids: [...new Set(carriedUnresolved.map(event => event.event_id))],
    drift_rate_pct: null,
    hallucination_rate_pct: null,
    status: 'REQUIRES_INDEPENDENT_ADJUDICATION',
    baseline_and_truth_not_inferred_from_model_output: true,
  });
}

export async function runContinuousReliabilityCycle({
  continuityRuntime,
  modelOutput,
  modelResponseId = null,
  packetId,
  structuredCandidate = null,
  independentlyVerifiedSnapshot = null,
  evidenceVerifierReceipt = null,
  observedAt = new Date().toISOString(),
} = {}) {
  if (!continuityRuntime?.enabled || typeof continuityRuntime.appendStage !== 'function' ||
      typeof continuityRuntime.readback !== 'function') throw new Error('RELIABILITY_DURABLE_CONTINUITY_REQUIRED');
  if (!packetId || typeof modelOutput !== 'string') throw new Error('RELIABILITY_MODEL_OUTPUT_REQUIRED');
  const before = orderContinuityHistory(await continuityRuntime.readback());
  const turn = before.filter(e => e.event_kind === 'RAW_SIGNAL').length;
  if (!turn) throw new Error('RELIABILITY_RAW_TURN_MISSING');

  let assessment = null;
  let recovery = null;
  const evidenceAccepted = Boolean(structuredCandidate && independentlyVerifiedSnapshot &&
    evidenceVerifierReceipt?.independent === true &&
    evidenceVerifierReceipt?.verified === true &&
    evidenceVerifierReceipt?.world_id === independentlyVerifiedSnapshot.world_id &&
    evidenceVerifierReceipt?.source_kind === 'EXTERNAL_EVIDENCE_VERIFIER');
  if (evidenceAccepted) {
    // The caller-supplied structured candidate is never treated as a trusted fact.
    // The verifier's receipt must originate at the trusted execution boundary.
    assessment = assessDrift({trustedSnapshot: independentlyVerifiedSnapshot, candidate: structuredCandidate});
    const manifest = proposeDriftRecovery({
      trustedSnapshot: independentlyVerifiedSnapshot, candidate: structuredCandidate, assessment
    });
    recovery = verifyDriftRecovery({trustedSnapshot: independentlyVerifiedSnapshot, manifest});
    // Structural correction is not a published world-state update.
    // Independent outcome verification and publication are separate gates.
  }
  const categories = classifyReliabilityFindings(assessment?.codes || []);
  const payload = {
    cycle_version: CONTINUOUS_RELIABILITY_VERSION,
    event_type: 'MODEL_OUTPUT_ASSESSMENT',
    turn,
    packet_digest: digest(packetId),
    model_output_digest: digest(modelOutput),
    model_response_digest: modelResponseId ? digest(modelResponseId) : null,
    evaluation_status: evidenceAccepted ? 'EVALUATED_WITH_INDEPENDENT_EVIDENCE' : 'NOT_EVALUATED',
    evaluation_scope: evidenceAccepted ? 'STRUCTURED_ASSERTIONS_ONLY' : 'NO_VERIFIED_STRUCTURED_CANDIDATE',
    drift: categories.drift,
    hallucination_suspected: categories.hallucination_suspected,
    hallucination_confirmed: null,
    independent_truth_adjudication: false,
    correction_proposed: Boolean(recovery?.corrected),
    correction_published_to_active_state: false,
    recovery_independently_verified: false,
    external_actions_authorized: false,
  };
  const committed = await continuityRuntime.appendStage({
    stage: 'VERIFICATION',
    entityId: 'reliability:'+packetId,
    eventId: 'reliability:'+packetId,
    epistemicStatus: 'UNVERIFIED',
    effectiveTime: observedAt, assertionTime: observedAt,
    evidenceRefs: evidenceAccepted ? [
      ...independentlyVerifiedSnapshot.facts.map(f=>f.evidence_ref),
      ...independentlyVerifiedSnapshot.obligations.map(o=>o.evidence_ref),
    ] : [],
    payload,
    provenance: {source: CONTINUOUS_RELIABILITY_VERSION, evaluation_model: 'deterministic'},
  });
  const after = orderContinuityHistory(await continuityRuntime.readback());
  const copied = after.find(e => e.event_id === committed.event_id);
  if (!copied || JSON.stringify(copied.payload) !== JSON.stringify(payload))
    throw new Error('RELIABILITY_RECEIPT_READBACK_UNVERIFIED');
  let backcheck = computeHistoricalBackcheck(after);
  let checkpointReadbackVerified = false;
  if (backcheck) {
    const checkpoint = await continuityRuntime.appendStage({
      stage: 'VERIFICATION',
      entityId: 'historical-backcheck:'+String(backcheck.total_turns),
      eventId: 'historical-backcheck:'+String(backcheck.total_turns)+':'+continuityRuntime.spine.continuity_root_id,
      epistemicStatus: 'UNVERIFIED',
      payload: {
        cycle_version: CONTINUOUS_RELIABILITY_VERSION,
        event_type: 'HISTORICAL_BACKCHECK',
        ...backcheck,
      },
      provenance: {source:CONTINUOUS_RELIABILITY_VERSION, evaluation_model:'deterministic'},
    });
    const confirm = await continuityRuntime.readback();
    checkpointReadbackVerified = confirm.some(event => event.event_id === checkpoint.event_id &&
      event.payload?.event_type === 'HISTORICAL_BACKCHECK' &&
      event.payload?.window_end === backcheck.window_end);
    if (!checkpointReadbackVerified) throw new Error('RELIABILITY_CHECKPOINT_READBACK_UNVERIFIED');
  }
  return Object.freeze({
    version: CONTINUOUS_RELIABILITY_VERSION, turn,
    evaluation_status: payload.evaluation_status,
    drift: categories.drift,
    hallucination_suspected: categories.hallucination_suspected,
    hallucination_rate_pct: null, drift_rate_pct: null,
    correction_proposed: payload.correction_proposed,
    correction_published_to_active_state: false,
    receipt_id: committed.event_id,
    readback_verified: true,
    checkpoint: backcheck ? { ...backcheck, readback_verified: checkpointReadbackVerified } : null,
  });
}
