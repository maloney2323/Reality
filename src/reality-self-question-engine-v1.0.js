// Reality Self-Question Engine v1.0
// Deterministic question formation is owned by Reality's governance layer.
// A model may answer these questions, but it does not decide what Reality is
// responsible for asking itself.

export const REALITY_SELF_QUESTION_ENGINE_VERSION = 'reality-self-question-engine-v1.0';

const QUESTIONS = Object.freeze([
  {
    id: 'business.identity',
    domain: 'BUSINESS',
    priority: 100,
    question: 'What business am I trying to operate, and what evidence currently establishes that?',
    requires: ['business_identity_evidence'],
  },
  {
    id: 'business.success',
    domain: 'BUSINESS',
    priority: 99,
    question: 'What outcomes define successful operation of this business, and how can each outcome be independently verified?',
    requires: ['success_criteria_evidence'],
  },
  {
    id: 'work.today',
    domain: 'WORK',
    priority: 98,
    question: 'What legitimate work is due, unfinished, blocked, or at risk right now?',
    requires: ['current_work_evidence'],
  },
  {
    id: 'work.recurring',
    domain: 'WORK',
    priority: 97,
    question: 'What work repeats across time, who owns it, why does it recur, and which parts could Reality legitimately own?',
    requires: ['repeated_work_observations'],
  },
  {
    id: 'owner.load',
    domain: 'OWNER_TIME',
    priority: 96,
    question: 'What work is the owner repeatedly doing that could be reduced, delegated, automated, or eliminated without creating unacceptable risk?',
    requires: ['owner_work_evidence'],
  },
  {
    id: 'system.health',
    domain: 'RELIABILITY',
    priority: 95,
    question: 'What is broken, degraded, failing, or at risk in the systems Reality depends on?',
    requires: ['live_system_observations'],
  },
  {
    id: 'bugs.regressions',
    domain: 'ENGINEERING',
    priority: 94,
    question: 'What bugs, regressions, failed tests, or unfinished engineering work are evidenced right now?',
    requires: ['code_or_runtime_evidence'],
  },
  {
    id: 'capability.gaps',
    domain: 'CAPABILITY',
    priority: 93,
    question: 'What material capability is missing that prevents Reality from completing a legitimate responsibility it has evidence for?',
    requires: ['capability_gap_evidence'],
  },
  {
    id: 'product.upgrades',
    domain: 'PRODUCT',
    priority: 80,
    question: 'What upgrade would materially improve Reality or the business, and what evidence shows that it is worth building?',
    requires: ['product_evidence'],
  },
  {
    id: 'competition',
    domain: 'COMPETITIVE',
    priority: 70,
    question: 'What meaningful competitor, market, or technology change could materially affect the business, and what evidence supports that conclusion?',
    requires: ['fresh_competitive_evidence'],
  },
  {
    id: 'governance',
    domain: 'GOVERNANCE',
    priority: 110,
    question: 'What authority, evidence, contradiction, or verification boundary could make the next action unsafe or invalid?',
    requires: ['governance_evidence'],
  },
  {
    id: 'verification',
    domain: 'VERIFICATION',
    priority: 109,
    question: 'For each proposed consequential action, what independent observation will prove whether the intended outcome actually happened?',
    requires: ['verification_path'],
  },
]);

function hasEvidence(evidence, requirement) {
  const e = evidence && typeof evidence === 'object' ? evidence : {};
  switch (requirement) {
    case 'business_identity_evidence':
      return Boolean(e.business_identity || e.business || e.owner_business);
    case 'success_criteria_evidence':
      return Boolean(e.success_criteria);
    case 'current_work_evidence':
      return Number(e.current_work_count || 0) > 0 || Number(e.discovered_work_count || 0) > 0;
    case 'repeated_work_observations':
      return Number(e.recurring_work_observations || 0) > 0 || Number(e.recurring_work_count || 0) > 0;
    case 'owner_work_evidence':
      return Number(e.owner_work_observations || 0) > 0;
    case 'live_system_observations':
      return Number(e.live_observation_count || e.recent_observation_count || 0) > 0;
    case 'code_or_runtime_evidence':
      return Boolean(e.code_health || e.runtime_health || e.repository);
    case 'capability_gap_evidence':
      return Number(e.capability_gap_count || 0) > 0;
    case 'product_evidence':
      return Boolean(e.product_evidence);
    case 'fresh_competitive_evidence':
      return Number(e.competitive_observation_count || 0) > 0;
    case 'governance_evidence':
      return Boolean(e.authority || e.governance || e.execution);
    case 'verification_path':
      return Boolean(e.verification_plan || e.independent_verification);
    default:
      return false;
  }
}

export function buildRealitySelfQuestionAgenda({ evidence = {}, phase = 'CONVERSATION', limit = 12 } = {}) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 12, QUESTIONS.length));
  const normalizedEvidence = evidence && typeof evidence === 'object' ? evidence : {};

  const questions = QUESTIONS
    .filter(q => phase !== 'CONVERSATION' || q.domain !== 'COMPETITIVE' || normalizedEvidence.competitive_monitoring_enabled)
    .map(q => ({
      ...q,
      status: q.requires.every(requirement => hasEvidence(normalizedEvidence, requirement))
        ? 'EVIDENCE_AVAILABLE'
        : 'EVIDENCE_NEEDED',
      missing_evidence: q.requires.filter(requirement => !hasEvidence(normalizedEvidence, requirement)),
    }))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, safeLimit);

  return Object.freeze({
    version: REALITY_SELF_QUESTION_ENGINE_VERSION,
    phase,
    question_count: questions.length,
    questions: Object.freeze(questions.map(q => Object.freeze(q))),
    principle: 'REALITY_MUST_ASK_WHAT_IT_NEEDS_TO_KNOW_BEFORE_DECIDING_WHAT_TO_DO',
  });
}

export function buildSelfQuestionPrompt(agenda) {
  return [
    'Reality self-question agenda:',
    JSON.stringify(agenda),
    '',
    'Use these questions to direct inquiry. Do not manufacture answers.',
    'If evidence is missing, identify the missing evidence and pursue observation rather than inference.',
    'Prioritize questions that materially affect legitimate business operation, owner time, reliability, capability, governance, or verification.',
  ].join('\n');
}
