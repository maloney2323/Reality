// Reality Governed Multi-Lane Fan-Out v0.1.
//
// Takes ONE canonical signal packet (produced by the existing Fragmented Signal
// Cleaner at chat ingress) and passes that IDENTICAL packet independently to
// three read-only analysis lanes:
//   1. OBSERVER  — identify what the supplied signal actually contains.
//   2. VERIFIER  — determine what claims are supported / unsupported / unresolved / contradictory.
//   3. ADVERSARY — actively look for missing evidence, contradictions, ambiguity, and assumed authority.
//
// Independence: every lane receives the identical packet. No lane receives
// another lane's output before producing its own result. There is no majority
// voting or consensus. If lanes disagree, the disagreement is preserved.
//
// The lanes are read-only analysis only. They MUST NOT invent evidence, grant
// truth/action authority, execute external actions, modify repositories, or
// deploy. Insufficient evidence / visibility is preserved explicitly.
//
// This module is the orchestration contract only. The actual model invocation
// is injected (invokeLane) so the contract is testable without a live LLM.
// Lane results are collected into governed lane records for later synthesis.

import { sha256Hex } from '../action-gate/canonical.js';
import { laneEvidenceForPrompt, parseLaneEvidence } from './lane-evidence-contract-v0.1.js';

export const MULTI_LANE_FANOUT_VERSION = 'reality-multi-lane-fanout-v0.1';
export const LANE_NAMES = Object.freeze(['OBSERVER', 'VERIFIER', 'ADVERSARY']);

const LANE_CONTRACTS = Object.freeze({
  OBSERVER: [
    'What signals/claims are explicitly present?',
    'What entities, timestamps, values, and source references are present?',
    'What is directly observable?',
    'What information is missing?',
  ],
  VERIFIER: [
    'Which claims are directly supported?',
    'Which are unsupported?',
    'Which remain unresolved?',
    'Are there contradictions?',
    'What evidence would be required to resolve an uncertainty?',
  ],
  ADVERSARY: [
    'What could make the apparent interpretation wrong?',
    'What evidence is missing?',
    'Are there conflicting signals?',
    'Is any authority being assumed without evidence?',
    'Is any proposal being mistaken for authorization?',
    'Is any authorization being mistaken for execution?',
    'Is any execution being mistaken for verification?',
  ],
});

const LANE_GOVERNANCE = Object.freeze([
  'Do not invent evidence, sources, or timestamps.',
  'Do not resolve contradictions without evidence.',
  'Do not treat model-generated text as independent evidence.',
  'Do not grant truth authority or action authority.',
  'Do not execute external actions, modify repositories, or deploy anything.',
  'If evidence is insufficient, explicitly state "INSUFFICIENT EVIDENCE".',
  'If system visibility is insufficient, explicitly state "INSUFFICIENT VISIBILITY".',
]);

// Stable serialization of the canonical packet so all three lanes (and the
// input_packet_hash) provably reference the identical input.
export function serializePacketForLane(packet) {
  return JSON.stringify({
    packet_version: packet.packet_version,
    packet_id: packet.packet_id,
    observations: packet.observations,
    conflicts: packet.conflicts,
    metadata: {
      cleaner_version: packet.metadata.cleaner_version,
      authority: packet.metadata.authority,
      semantic_policy: packet.metadata.semantic_policy,
      conflict_policy: packet.metadata.conflict_policy,
      independence_policy: packet.metadata.independence_policy,
      dedupe_policy: packet.metadata.dedupe_policy,
    },
  }, null, 2);
}

export function computePacketHash(packet) {
  return sha256Hex(serializePacketForLane(packet));
}

export function buildLanePrompt(laneName, packet) {
  if (!LANE_CONTRACTS[laneName]) throw new Error(`unknown lane: ${laneName}`);
  return [
    `You are the ${laneName} analysis lane in Reality's governed multi-lane fan-out.`,
    '',
    'You receive ONE canonical signal packet produced by the Fragmented Signal Cleaner.',
    "Analyze ONLY what is present in this packet. You do not see any other lane's output.",
    '',
    'Answer ONLY:',
    ...LANE_CONTRACTS[laneName].map((q) => `- ${q}`),
    '',
    'Governance rules:',
    ...LANE_GOVERNANCE.map((r) => `- ${r}`),
    '',
    'Your output is a governed lane analysis. It is not truth, not authorization, not execution.',
    '',
    'Return ONLY valid JSON matching this exact schema:',
    '{',
    '  "schema_version": "reality-lane-evidence-contract-v0.1",',
    '  "observations": [],',
    '  "supported_claims": [],',
    '  "unsupported_claims": [],',
    '  "unresolved_items": [],',
    '  "contradictions": [],',
    '  "missing_evidence": [],',
    '  "authority_findings": [],',
    '  "verification_requirements": [],',
    '  "analysis": ""',
    '}',
    'Use only strings in arrays. Do not invent evidence. The analysis field is reasoning, not evidence.',
    '',
    'CANONICAL SIGNAL PACKET (your only input):',
    serializePacketForLane(packet),
  ].join('\n');
}

function classifyLaneOutput(output) {
  const text = String(output || '').toUpperCase();
  if (text.includes('INSUFFICIENT VISIBILITY')) return 'INSUFFICIENT_VISIBILITY';
  if (text.includes('INSUFFICIENT EVIDENCE')) return 'INSUFFICIENT_EVIDENCE';
  return 'COMPLETED';
}

export function buildLaneRecord({ lane_name, packet, lane_output, governance_status, produced_at, fanout_run_id, input_packet_hash }) {
  const canonicalSignalId = (packet.observations && packet.observations[0] && packet.observations[0].id) || packet.packet_id;
  return Object.freeze({
    record_version: 'reality-governed-lane-record-v0.1',
    fanout_run_id,
    lane_name,
    canonical_signal_id: canonicalSignalId,
    packet_id: packet.packet_id,
    input_packet_ref: `canonical-packet:${packet.packet_id}`,
    input_packet_hash,
    lane_output: String(lane_output || ''),
    lane_evidence: parseLaneEvidence(lane_output),
    governance_status: governance_status || classifyLaneOutput(lane_output),
    unresolved_contradictions: Object.freeze(parseLaneEvidence(lane_output).contradictions),
    evidence_refs: Object.freeze([packet.packet_id]),
    truth_authority: false,
    execution_authority: false,
    produced_at,
  });
}

// Orchestrator. Runs all three lanes against the IDENTICAL packet. Each lane
// receives ONLY its own prompt (built from the packet); no lane receives
// another lane's output. Lane invocation failures are recorded honestly
// (FAILED_CLOSED) rather than silently bypassed.
export async function fanOutLanes({ packet, invokeLane, fanout_run_id, produced_at, packetHasher }) {
  if (!packet || !packet.packet_id) throw new Error('fan-out requires a canonical packet');
  if (typeof invokeLane !== 'function') throw new Error('fan-out requires an invokeLane function');
  const runId = fanout_run_id || `fanout:${crypto.randomUUID()}`;
  const ts = produced_at || new Date().toISOString();
  const packetHash = packetHasher ? await packetHasher(packet) : await computePacketHash(packet);

  // Build ALL lane prompts from the IDENTICAL packet BEFORE any lane runs.
  // By construction no prompt contains another lane's output.
  const lanePrompts = LANE_NAMES.map((laneName) => ({
    laneName,
    prompt: buildLanePrompt(laneName, packet),
  }));

  // async wrapper so a synchronous throw inside invokeLane becomes a rejected
  // promise that Promise.allSettled captures (fail-closed, no silent bypass).
  const settled = await Promise.allSettled(
    lanePrompts.map(async ({ laneName, prompt }) => invokeLane(laneName, prompt)),
  );

  const records = LANE_NAMES.map((laneName, index) => {
    const result = settled[index];
    let laneOutput;
    let governanceStatus;
    if (result.status === 'fulfilled') {
      laneOutput = String(result.value || '').trim();
      if (!laneOutput) {
        laneOutput = 'INSUFFICIENT EVIDENCE';
        governanceStatus = 'INSUFFICIENT_EVIDENCE';
      } else {
        governanceStatus = classifyLaneOutput(laneOutput);
      }
    } else {
      laneOutput = `FAILED_CLOSED: ${result.reason && result.reason.message ? result.reason.message : 'lane invocation failed'}`;
      governanceStatus = 'FAILED_CLOSED';
    }
    return buildLaneRecord({
      lane_name: laneName,
      packet,
      lane_output: laneOutput,
      governance_status: governanceStatus,
      produced_at: ts,
      fanout_run_id: runId,
      input_packet_hash: packetHash,
    });
  });

  return Object.freeze({
    fanout_version: MULTI_LANE_FANOUT_VERSION,
    fanout_run_id: runId,
    packet_id: packet.packet_id,
    input_packet_hash: records[0].input_packet_hash,
    lane_records: Object.freeze(records),
    produced_at: ts,
  });
}

// Prove all three lanes analyzed the identical canonical input and carry no
// truth/action authority.
export function verifyLaneIndependence(fanoutResult) {
  const records = fanoutResult.lane_records;
  if (!Array.isArray(records) || records.length !== 3) return false;
  const hashes = new Set(records.map((r) => r.input_packet_hash));
  const signalIds = new Set(records.map((r) => r.canonical_signal_id));
  const names = new Set(records.map((r) => r.lane_name));
  if (hashes.size !== 1 || signalIds.size !== 1 || names.size !== 3) return false;
  if (!LANE_NAMES.every((n) => names.has(n))) return false;
  if (records.some((r) => r.truth_authority === true || r.execution_authority === true)) return false;
  return true;
}