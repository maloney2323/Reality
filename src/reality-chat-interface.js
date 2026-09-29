export const CHAT_INTERFACE_VERSION = '0.1.0';

export const CHAT_BOUNDARY = Object.freeze({
  execution_access: false,
  constitutional_write_access: false,
  world_write_access: false,
  reality_core_read_access: true,
  governed_opinion_access: true,
});

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
  status,
  establishedFacts = [],
  unresolvedQuestions = [],
  contradictions = [],
  nextStep = null,
} = {}) {
  return {
    opinion_version: CHAT_INTERFACE_VERSION,
    status: status || 'UNKNOWN',
    established_facts: [...establishedFacts],
    unresolved_questions: [...unresolvedQuestions],
    contradictions: [...contradictions],
    next_step: nextStep,
    epistemic_status: 'GOVERNED_READ_ONLY',
    authorization_created: false,
    execution_authorized: false,
  };
}

export function assertChatCannotExecute(request = {}) {
  if (request.execute === true || request.write === true || request.authorization?.authorized === true) {
    return {
      allowed: false,
      reason: 'CHAT_BOUNDARY_PROHIBITS_EXECUTION',
      execution: 'BLOCKED',
    };
  }
  return { allowed: true, execution: 'NOT_REQUESTED' };
}
