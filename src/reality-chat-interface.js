export const CHAT_INTERFACE_VERSION = '0.2.0';

export const CHAT_BOUNDARY = Object.freeze({
  execution_access: false,
  constitutional_write_access: false,
  world_write_access: false,
  reality_core_read_access: true,
  governed_opinion_access: true,
});

const VALID_STATUSES = Object.freeze([
  'ESTABLISHED',
  'INFORMATIONAL',
  'INVESTIGATION_REQUIRED',
  'INSUFFICIENT_EVIDENCE',
  'UNRESOLVED_CONTRADICTION',
  'BLOCKED',
]);

export function createChatContext({ businessUpdate = null, governedOpinion = null } = {}) {
  return {
    version: CHAT_INTERFACE_VERSION,
    mode: 'CONVERSATIONAL_INTELLIGENCE',
    business_context: businessUpdate,
    governed_opinion: governedOpinion,
    boundary: CHAT_BOUNDARY,
  };
}

export function governedOpinion({
  status = 'INFORMATIONAL',
  answer = null,
  establishedFacts = [],
  evidenceRefs = [],
  unresolvedQuestions = [],
  contradictions = [],
  hypotheses = [],
  nextStep = null,
  decision = null,
  authorityRequired = false,
  basis = [],
} = {}) {
  const normalizedStatus = VALID_STATUSES.includes(status) ? status : 'INFORMATIONAL';

  return Object.freeze({
    opinion_version: CHAT_INTERFACE_VERSION,
    status: normalizedStatus,
    answer,
    established_facts: [...establishedFacts],
    evidence_refs: [...evidenceRefs],
    unresolved_questions: [...unresolvedQuestions],
    contradictions: [...contradictions],
    hypotheses: hypotheses.map((h) => ({ ...h, epistemic_status: 'UNVERIFIED' })),
    next_step: nextStep,
    decision: decision || null,
    authority_required: authorityRequired === true,
    basis: [...basis],
    epistemic_status: 'GOVERNED_READ_ONLY',
    authorization_created: false,
    execution_authorized: false,
  });
}

export function governedOpinionFromState({ state = {}, evidence = [], ask = null, nextStep = null } = {}) {
  const contradictions = state.contradictions || [];
  const establishedFacts = state.establishedFacts || [];
  const unresolvedQuestions = state.unresolvedQuestions || [];
  let status = 'INFORMATIONAL';

  if (contradictions.length) status = 'UNRESOLVED_CONTRADICTION';
  else if (state.evidenceSufficient !== true) status = 'INVESTIGATION_REQUIRED';
  else if (establishedFacts.length) status = 'ESTABLISHED';

  return governedOpinion({
    status,
    answer: state.answer || null,
    establishedFacts,
    evidenceRefs: evidence.map((item) => item.evidence_id || item.receipt_id).filter(Boolean),
    unresolvedQuestions,
    contradictions,
    hypotheses: state.hypotheses || [],
    nextStep,
    decision: state.decision || null,
    authorityRequired: state.authorityRequired === true,
    basis: ask ? [{ type: 'ASK', value: ask }] : [],
  });
}

export function assertChatCannotExecute(request = {}) {
  if (request.execute === true || request.write === true || request.authorization?.authorized === true || request.action === 'EXECUTE') {
    return { allowed: false, reason: 'CHAT_BOUNDARY_PROHIBITS_EXECUTION', execution: 'BLOCKED' };
  }
  return { allowed: true, execution: 'NOT_REQUESTED' };
}

export const GOVERNED_OPINION_CONTRACT = Object.freeze({
  principle: 'Chat may interpret governed state but cannot create authority or external truth.',
  truth_source: 'REALITY_CORE_EVIDENCE_STATE',
  execution_authority: 'CONSTITUTIONAL_GATE',
  unresolved_state_must_remain_visible: true,
});
