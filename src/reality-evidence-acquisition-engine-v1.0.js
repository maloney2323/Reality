// Reality Evidence Acquisition Engine v1.0
// Converts unanswered governed questions into evidence-acquisition work.
// It never converts uncertainty into truth, authority, or execution permission.

import crypto from 'node:crypto';

export const REALITY_EVIDENCE_ACQUISITION_VERSION = 'reality-evidence-acquisition-v1.0';

const STRATEGIES = Object.freeze({
  business_identity_evidence: {
    class: 'INTERNAL_OBSERVATION',
    action: 'Inspect authoritative business records, operating context, and prior governed claims.',
    authority: 'READ_ONLY',
    verification: 'Cross-check against independent business evidence and preserve contradictions.',
  },
  success_criteria_evidence: {
    class: 'OWNER_DISCOVERY',
    action: 'Reconstruct explicit success criteria from existing governed claims; ask only for unresolved criteria.',
    authority: 'READ_ONLY_UNTIL_UNRESOLVED',
    verification: 'Require explicit owner-established criteria before treating them as governed success conditions.',
  },
  market_opportunity_evidence: {
    class: 'EXTERNAL_RESEARCH',
    action: 'Research observable market demand, competing solutions, pricing signals, and recurring problem evidence.',
    authority: 'RESEARCH_ONLY',
    verification: 'Preserve source provenance, dates, contradictions, and distinguish market signals from conclusions.',
  },
  niche_evidence: {
    class: 'MARKET_SEGMENTATION',
    action: 'Construct competing niche hypotheses from market evidence and identify what evidence would discriminate between them.',
    authority: 'RESEARCH_ONLY',
    verification: 'Do not select a niche solely from model preference; require comparative evidence and falsification criteria.',
  },
  customer_problem_evidence: {
    class: 'CUSTOMER_DISCOVERY',
    action: 'Find evidence of repeated customer pain, existing workarounds, cost, frequency, and consequences.',
    authority: 'RESEARCH_OR_PREPARE_OUTREACH',
    verification: 'Prioritize observed past behavior, spending, workarounds, or independently corroborated reports over stated enthusiasm.',
  },
  offer_evidence: {
    class: 'OFFER_VALIDATION',
    action: 'Compare candidate solutions with existing alternatives and identify evidence needed to establish willingness to pay.',
    authority: 'RESEARCH_ONLY_UNTIL_AUTHORIZED_TEST',
    verification: 'Treat payment, deposit, signed pilot, or repeated use as stronger evidence than compliments.',
  },
  positioning_evidence: {
    class: 'COMPETITIVE_RESEARCH',
    action: 'Map alternatives, differentiation, switching costs, and evidence-backed reasons a target niche would choose the offer.',
    authority: 'RESEARCH_ONLY',
    verification: 'Require evidence for both differentiation and customer relevance.',
  },
  distribution_evidence: {
    class: 'CHANNEL_RESEARCH',
    action: 'Identify where the niche congregates, buys, searches, or receives recommendations and compare reachable channels.',
    authority: 'RESEARCH_ONLY_UNTIL_CAMPAIGN_AUTHORIZATION',
    verification: 'Measure reachable audience and channel response rather than assuming channel fit.',
  },
  economics_evidence: {
    class: 'ECONOMIC_ANALYSIS',
    action: 'Model price, acquisition cost, fulfillment cost, capacity, margin, and sensitivity using observed or explicitly labeled assumptions.',
    authority: 'ANALYSIS_ONLY',
    verification: 'Separate measured economics from estimates and update with actual transaction evidence.',
  },
  experiment_evidence: {
    class: 'EXPERIMENT_DESIGN',
    action: 'Design the smallest reversible experiment capable of falsifying the highest-risk business assumption.',
    authority: 'PROPOSAL_ONLY',
    verification: 'Define success, failure, stopping conditions, and independent outcome evidence before execution.',
  },
  growth_outcome_evidence: {
    class: 'OUTCOME_VERIFICATION',
    action: 'Define and locate independent telemetry that can prove whether growth activity produced the intended outcome.',
    authority: 'READ_ONLY_UNTIL_EXECUTION',
    verification: 'Use a source independent of the planning model and preserve the before/after record.',
  },
});

function stable(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stable);
  return Object.fromEntries(Object.keys(value).sort().map((k) => [k, stable(value[k])]));
}

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

function strategyFor(requirement) {
  return STRATEGIES[requirement] || {
    class: 'EVIDENCE_RETRIEVAL',
    action: 'Identify an observable source capable of answering the missing evidence requirement.',
    authority: 'READ_ONLY',
    verification: 'Independently verify the retrieved evidence and preserve provenance.',
  };
}

function riskWeight(question) {
  const domain = String(question?.domain || '').toUpperCase();
  if (domain === 'GOVERNANCE' || domain === 'VERIFICATION') return 5;
  if (domain === 'BUSINESS' || domain === 'MARKET' || domain === 'CUSTOMER') return 4;
  if (domain === 'GROWTH') return 3;
  return 2;
}

/*
  The engine produces an epistemic work graph:
  QUESTION -> UNKNOWN -> EVIDENCE REQUIREMENT -> ACQUISITION METHOD -> AUTHORITY BOUNDARY -> VERIFICATION.
  It does not perform the acquisition.
*/
export function buildEvidenceAcquisitionPlan({ agenda, availableEvidence = {}, limit = 12 } = {}) {
  if (!agenda || !Array.isArray(agenda.questions)) throw new Error('QUESTION_AGENDA_REQUIRED');

  const items = [];
  for (const question of agenda.questions) {
    if (question.status === 'EVIDENCE_AVAILABLE') continue;
    for (const requirement of (question.missing_evidence || question.requires || [])) {
      const strategy = strategyFor(requirement);
      const key = question.id + ':' + requirement;
      items.push({
        acquisition_id: 'evidence_acquisition:' + digest(key).slice(0, 32),
        question_id: question.id,
        domain: question.domain,
        question: question.question,
        evidence_requirement: requirement,
        acquisition_class: strategy.class,
        proposed_work: strategy.action,
        authority_boundary: strategy.authority,
        verification_plan: strategy.verification,
        epistemic_status: 'EVIDENCE_NEEDED',
        priority_score: (Number(question.priority) || 0) + riskWeight(question),
        execution: 'NOT_EXECUTED',
        authority: 'NONE_UNLESS_EXPLICITLY_ESTABLISHED',
      });
    }
  }

  const deduped = [...new Map(items.map((item) => [item.acquisition_id, item])).values()]
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, Math.max(1, Math.min(Number(limit) || 12, 50)));

  return Object.freeze({
    version: REALITY_EVIDENCE_ACQUISITION_VERSION,
    graph_type: 'EPISTEMIC_WORK_GRAPH',
    question_count: agenda.questions.length,
    unresolved_count: deduped.length,
    available_evidence: Object.freeze({ ...availableEvidence }),
    acquisition_work: Object.freeze(deduped.map(Object.freeze)),
    principle: 'UNKNOWN_MUST_GENERATE_EVIDENCE_WORK_BEFORE_IT_GENERATES_ACTION',
    authority_rule: 'EVIDENCE_ACQUISITION_NEVER_GRANTS_EXECUTION_AUTHORITY',
  });
}

export function validateEvidenceAcquisitionPlan(plan) {
  if (!plan || plan.graph_type !== 'EPISTEMIC_WORK_GRAPH') throw new Error('EVIDENCE_ACQUISITION_PLAN_REQUIRED');
  const valid = Array.isArray(plan.acquisition_work) && plan.acquisition_work.every((item) =>
    item.epistemic_status === 'EVIDENCE_NEEDED' &&
    item.execution === 'NOT_EXECUTED' &&
    item.authority === 'NONE_UNLESS_EXPLICITLY_ESTABLISHED' &&
    item.acquisition_id && item.question_id && item.evidence_requirement && item.verification_plan
  );
  return Object.freeze({ ...plan, valid });
}
