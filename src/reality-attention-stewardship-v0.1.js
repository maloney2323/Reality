/**
 * Reality Attention & Stewardship Engine v0.1
 *
 * Constitutional role:
 * Continuously determine which observed changes deserve investigation or
 * human attention. Attention is not authority. This module never grants
 * execution permission and never converts inference into truth.
 */

import crypto from 'node:crypto';

export const ATTENTION_ENGINE_VERSION = 'reality-attention-stewardship-v0.1';

export const ATTENTION_DOMAINS = Object.freeze([
  'BUSINESS_ACTIVITY',
  'SYSTEM_HEALTH',
  'RECURRING_WORK',
  'CAPABILITY_GAP',
  'UNRESOLVED_COMMITMENT',
  'EXTERNAL_COMPETITION',
  'MARKET_CHANGE',
  'RESEARCH',
  'OPPORTUNITY',
  'GOVERNANCE',
]);

export const ATTENTION_DISPOSITIONS = Object.freeze([
  'WATCH',
  'INVESTIGATE',
  'REQUIRES_HUMAN_ATTENTION',
  'PROPOSE_GOVERNED_WORK',
]);

const MATERIALITY_WEIGHTS = Object.freeze({
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  NONE: 0,
});

function stableId(prefix, value) {
  return `${prefix}:${crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 24)}`;
}

function normalizeEvidence(observation) {
  return Array.isArray(observation?.evidence_references)
    ? observation.evidence_references.filter(Boolean)
    : [];
}

function materialityFromObservation(observation) {
  if (observation?.materiality && MATERIALITY_WEIGHTS[observation.materiality]) {
    return observation.materiality;
  }

  if (observation?.severity === 'CRITICAL') return 'CRITICAL';
  if (observation?.severity === 'HIGH') return 'HIGH';

  if (
    observation?.failure === true ||
    observation?.regression === true ||
    observation?.commitment_overdue === true ||
    observation?.recurring_work === true
  ) return 'HIGH';

  if (
    observation?.capability_gap === true ||
    observation?.external_change === true ||
    observation?.opportunity === true
  ) return 'MEDIUM';

  return 'LOW';
}

function domainFromObservation(observation) {
  if (ATTENTION_DOMAINS.includes(observation?.domain)) return observation.domain;

  if (observation?.recurring_work === true) return 'RECURRING_WORK';
  if (observation?.capability_gap === true) return 'CAPABILITY_GAP';
  if (observation?.commitment_overdue === true) return 'UNRESOLVED_COMMITMENT';
  if (observation?.failure === true || observation?.regression === true) return 'SYSTEM_HEALTH';
  if (observation?.external_change === true) return 'EXTERNAL_COMPETITION';
  if (observation?.opportunity === true) return 'OPPORTUNITY';

  return 'BUSINESS_ACTIVITY';
}

/**
 * Assess one observation without deciding that it is true beyond the evidence
 * supplied to this function.
 */
export function assessAttentionCandidate(observation = {}) {
  const evidence = normalizeEvidence(observation);
  const materiality = materialityFromObservation(observation);
  const domain = domainFromObservation(observation);

  const epistemicStatus = observation.epistemic_status || (
    evidence.length > 0 ? 'EVIDENCE_BACKED_OBSERVATION' : 'EVIDENCE_NEEDED'
  );

  const evidenceSufficientForInvestigation = evidence.length > 0;
  const requiresInvestigation =
    materiality === 'CRITICAL' ||
    materiality === 'HIGH' ||
    observation.requires_investigation === true ||
    !evidenceSufficientForInvestigation;

  const disposition = observation.action_required === true
    ? 'REQUIRES_HUMAN_ATTENTION'
    : requiresInvestigation
      ? 'INVESTIGATE'
      : 'WATCH';

  const authority = 'NONE_UNLESS_EXPLICITLY_ESTABLISHED';

  return {
    attention_candidate_id: stableId('attention', {
      observation_id: observation.observation_id || null,
      domain,
      materiality,
      evidence,
    }),
    engine_version: ATTENTION_ENGINE_VERSION,
    observation_id: observation.observation_id || null,
    domain,
    materiality,
    materiality_weight: MATERIALITY_WEIGHTS[materiality],
    epistemic_status: epistemicStatus,
    evidence_references: evidence,
    evidence_sufficient_for_investigation: evidenceSufficientForInvestigation,
    disposition,
    authority,
    action_authorized: false,
    truth_authorized: false,
    rationale: buildRationale({ domain, materiality, evidenceSufficientForInvestigation }),
  };
}

function buildRationale({ domain, materiality, evidenceSufficientForInvestigation }) {
  if (!evidenceSufficientForInvestigation) {
    return 'Attention is warranted because the signal may matter but evidence is insufficient; acquire evidence before treating it as established.';
  }

  return `Observed signal classified as ${materiality} materiality in ${domain}; investigation or attention is determined without granting execution authority.`;
}

/**
 * Turn a set of connected-world observations into a ranked attention agenda.
 * The engine may elevate work for investigation, but it cannot authorize action.
 */
export function buildAttentionAgenda({ observations = [] } = {}) {
  const candidates = observations
    .filter(Boolean)
    .map(assessAttentionCandidate)
    .sort((a, b) =>
      b.materiality_weight - a.materiality_weight ||
      String(a.attention_candidate_id).localeCompare(String(b.attention_candidate_id))
    );

  return {
    agenda_id: stableId('agenda', candidates.map((candidate) => candidate.attention_candidate_id)),
    engine_version: ATTENTION_ENGINE_VERSION,
    candidates,
    constitutional_contract: {
      attention_is_not_authority: true,
      inference_is_not_observation: true,
      unknown_must_generate_evidence_work: true,
      execution_requires_separate_authorization: true,
      independent_verification_required_for_execution: true,
    },
  };
}

/**
 * Produce governed next-work proposals from attention candidates.
 * These are proposals only. No authority is inferred or created.
 */
export function proposeAttentionWork(candidate) {
  if (!candidate?.attention_candidate_id) {
    throw new Error('ATTENTION_CANDIDATE_REQUIRED');
  }

  const evidenceNeeded = candidate.evidence_sufficient_for_investigation !== true;

  return {
    work_proposal_id: stableId('attention-work', candidate.attention_candidate_id),
    source_attention_candidate_id: candidate.attention_candidate_id,
    state: 'PROPOSED',
    objective: evidenceNeeded
      ? 'ACQUIRE_EVIDENCE_AND_REASSESS'
      : 'INVESTIGATE_MATERIAL_SIGNAL',
    domain: candidate.domain,
    materiality: candidate.materiality,
    evidence_references: candidate.evidence_references,
    epistemic_status: evidenceNeeded ? 'EVIDENCE_NEEDED' : candidate.epistemic_status,
    authority: 'NONE_UNLESS_EXPLICITLY_ESTABLISHED',
    execution: 'NOT_EXECUTED',
    action_authorized: false,
    verification_required: true,
  };
}
