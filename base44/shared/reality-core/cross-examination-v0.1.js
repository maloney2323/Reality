// Reality Governed Cross-Examination v0.1
// Bounded interaction after independent fan-out.
// Independence happens first. Cross-examination may inspect other lanes'
// MODEL-GENERATED findings, but those findings remain non-evidence.

import { laneEvidenceForPrompt, materialEpistemicState, materialStateChanged, parseLaneEvidence } from './lane-evidence-contract-v0.1.js';

export const CROSS_EXAMINATION_VERSION = 'reality-cross-examination-v0.1';
export const DEFAULT_MAX_ROUNDS = 2;

const ROLE_CONTRACTS = Object.freeze({
  OBSERVER: [
    'Challenge whether other lanes are claiming anything not explicitly observable in the canonical packet.',
    'Identify where another lane has introduced an interpretation that is not directly grounded in the packet.',
  ],
  VERIFIER: [
    'Challenge whether other lanes have actually established support for their claims.',
    'Identify unsupported inferences, missing provenance, and unresolved verification requirements.',
  ],
  ADVERSARY: [
    'Challenge the strongest apparent interpretation and look for failure modes.',
    'Check authority boundaries and whether proposal, authorization, execution, or verification has been conflated.',
  ],
});

function otherLaneContext(laneName, laneRecords) {
  return laneRecords
    .filter((record) => record.lane_name !== laneName)
    .map((record) => ({
      lane_name: record.lane_name,
      label: 'MODEL_GENERATED_ANALYSIS_NOT_EVIDENCE',
      lane_evidence: record.lane_evidence || parseLaneEvidence(record.lane_output),
    }));
}

export function buildCrossExamPrompt({ laneName, packet, laneRecords, phase, challenges = [] }) {
  if (!ROLE_CONTRACTS[laneName]) throw new Error('unknown lane: ' + laneName);
  const context = otherLaneContext(laneName, laneRecords);
  const challengeContext = challenges.map((item) => ({
    challenger: item.lane_name,
    label: 'MODEL_GENERATED_ANALYSIS_NOT_EVIDENCE',
    output: item.lane_evidence || parseLaneEvidence(item.lane_output),
  }));
  return [
    `You are the ${laneName} lane in Reality's governed ${phase.toLowerCase()} phase.`,
    '',
    'The independent fan-out has already occurred. Other lane findings below are MODEL-GENERATED ANALYSIS ONLY, never independent evidence.',
    'Do not treat agreement between models as proof. Do not use model-generated findings to manufacture evidence.',
    '',
    phase === 'CHALLENGE' ? 'Your job:' : 'Your job is to rebut or refine the challenges while preserving valid uncertainty:',
    ...ROLE_CONTRACTS[laneName].map((q) => '- ' + q),
    '',
    'Return ONLY valid JSON matching reality-lane-evidence-contract-v0.1.',
    'If a challenge is valid, say so in analysis and adjust the structured fields.',
    'If it is not valid, explain why without inventing evidence.',
    '',
    'CANONICAL PACKET (the only evidence input):',
    JSON.stringify(packet, null, 2),
    '',
    'OTHER LANE FINDINGS (analysis only):',
    JSON.stringify(context, null, 2),
    '',
    'CURRENT CHALLENGES (analysis only):',
    JSON.stringify(challengeContext, null, 2),
  ].join('\n');
}

export function shouldCrossExamine(laneRecords) {
  const evidence = laneRecords.map((r) => r.lane_evidence || parseLaneEvidence(r.lane_output));
  // Lane outputs are intentionally different because lane jobs are different.
  // Different outputs alone are NOT a disagreement signal. Debate starts only
  // when the structured epistemic state contains material uncertainty,
  // contradiction, or unsupported claims that warrant challenge/rebuttal.
  return evidence.some((e) =>
    e.contradictions.length > 0 ||
    e.unresolved_items.length > 0 ||
    e.unsupported_claims.length > 0
  );
}

export function buildStopDecision({ before, after, roundNumber, maxRounds = DEFAULT_MAX_ROUNDS }) {
  const changed = materialStateChanged(before, after);
  if (roundNumber >= maxRounds) {
    return Object.freeze({ stop: true, reason: 'MAX_ROUNDS_REACHED', material_state_changed: changed });
  }
  if (!changed) {
    return Object.freeze({ stop: true, reason: 'NO_MATERIAL_EPISTEMIC_CHANGE', material_state_changed: false });
  }
  return Object.freeze({ stop: false, reason: 'MATERIAL_EPISTEMIC_CHANGE', material_state_changed: true });
}

export async function runBoundedCrossExamination({
  packet,
  laneRecords,
  invokeLane,
  maxRounds = DEFAULT_MAX_ROUNDS,
  roundIdFactory = (n) => `cross-round:${n}`,
}) {
  if (!packet?.packet_id) throw new Error('cross-examination requires a canonical packet');
  if (!Array.isArray(laneRecords) || laneRecords.length !== 3) throw new Error('cross-examination requires three independent lane records');
  if (typeof invokeLane !== 'function') throw new Error('cross-examination requires invokeLane');

  let current = laneRecords.map((r) => ({
    ...r,
    lane_evidence: r.lane_evidence || parseLaneEvidence(r.lane_output),
  }));
  const rounds = [];

  if (!shouldCrossExamine(current)) {
    return Object.freeze({ version: CROSS_EXAMINATION_VERSION, stopped: true, stop_reason: 'NO_MATERIAL_DISAGREEMENT', rounds: Object.freeze([]), final_lane_records: Object.freeze(current) });
  }

  for (let roundNumber = 1; roundNumber <= maxRounds; roundNumber += 1) {
    const roundId = roundIdFactory(roundNumber);
    const prompts = current.map((record) => ({
      laneName: record.lane_name,
      prompt: buildCrossExamPrompt({ laneName: record.lane_name, packet, laneRecords: current, phase: 'CHALLENGE' }),
    }));
    const challengeResults = await Promise.allSettled(prompts.map((p) => invokeLane(p.laneName, p.prompt)));
    const challenges = current.map((record, index) => {
      const result = challengeResults[index];
      const output = result.status === 'fulfilled' ? String(result.value || '').trim() : `FAILED_CLOSED: ${result.reason?.message || 'lane invocation failed'}`;
      return { lane_name: record.lane_name, lane_output: output, lane_evidence: parseLaneEvidence(output), governance_status: result.status === 'fulfilled' ? 'COMPLETED' : 'FAILED_CLOSED' };
    });

    const rebuttalPrompts = current.map((record) => ({
      laneName: record.lane_name,
      prompt: buildCrossExamPrompt({ laneName: record.lane_name, packet, laneRecords: current, phase: 'REBUTTAL', challenges }),
    }));
    const rebuttalResults = await Promise.allSettled(rebuttalPrompts.map((p) => invokeLane(p.laneName, p.prompt)));
    const next = current.map((record, index) => {
      const result = rebuttalResults[index];
      const output = result.status === 'fulfilled' ? String(result.value || '').trim() : `FAILED_CLOSED: ${result.reason?.message || 'lane invocation failed'}`;
      return {
        ...record,
        lane_output: output,
        lane_evidence: parseLaneEvidence(output),
        governance_status: result.status === 'fulfilled' ? 'COMPLETED' : 'FAILED_CLOSED',
      };
    });

    const beforeState = { lane_evidence: { ...current[0].lane_evidence, contradictions: current.flatMap((r) => r.lane_evidence.contradictions), unresolved_items: current.flatMap((r) => r.lane_evidence.unresolved_items), unsupported_claims: current.flatMap((r) => r.lane_evidence.unsupported_claims) } };
    const afterState = { lane_evidence: { ...next[0].lane_evidence, contradictions: next.flatMap((r) => r.lane_evidence.contradictions), unresolved_items: next.flatMap((r) => r.lane_evidence.unresolved_items), unsupported_claims: next.flatMap((r) => r.lane_evidence.unsupported_claims) } };
    const stop = buildStopDecision({ before: beforeState.lane_evidence, after: afterState.lane_evidence, roundNumber, maxRounds });

    rounds.push(Object.freeze({
      round_id: roundId,
      round_number: roundNumber,
      challenges: Object.freeze(challenges),
      rebuttals: Object.freeze(next.map((r) => ({ lane_name: r.lane_name, lane_output: r.lane_output, lane_evidence: r.lane_evidence, governance_status: r.governance_status }))),
      material_state_changed: stop.material_state_changed,
      stop: stop.stop,
      stop_reason: stop.reason,
    }));

    current = next;
    if (stop.stop) {
      return Object.freeze({ version: CROSS_EXAMINATION_VERSION, stopped: true, stop_reason: stop.reason, rounds: Object.freeze(rounds), final_lane_records: Object.freeze(current) });
    }
  }

  return Object.freeze({ version: CROSS_EXAMINATION_VERSION, stopped: true, stop_reason: 'MAX_ROUNDS_REACHED', rounds: Object.freeze(rounds), final_lane_records: Object.freeze(current) });
}