import crypto from 'node:crypto';

export const OBSERVATION_BOUNDARY_VERSION = 'reality-observation-boundary-v0.1';

const ACTION_PATTERNS = [
  /\b(send|email|reply|respond|publish|post|delete|buy|purchase|schedule|cancel|transfer|write|update|change|deploy|merge)\b/i,
];
const SENSITIVE_PATTERNS = [
  /\b(password|passcode|api[ _-]?key|secret|token|ssn|social security|credit card|bank account|routing number)\b/i,
];
const DURABLE_FACT_PATTERNS = [
  /\bmy name is\b/i,
  /\bi live in\b/i,
  /\bi work (?:at|for)\b/i,
  /\bmy (?:company|business|address|phone|email) is\b/i,
];
const INFERENCE_PATTERNS = [
  /\b(why|probably|likely|seems|might|maybe|assume|infer|guess|predict)\b/i,
];

const digest = (value) =>
  `sha256:${crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;

export function observeUserMessage({ message, observedAt = new Date().toISOString() } = {}) {
  if (typeof message !== 'string' || !message.trim()) throw new Error('MESSAGE_REQUIRED');
  const text = message.trim();

  const proposedActions = ACTION_PATTERNS.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
  const sensitiveSignals = SENSITIVE_PATTERNS.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
  const durableFactSignals = DURABLE_FACT_PATTERNS.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
  const inferenceSignals = INFERENCE_PATTERNS.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);

  const observations = [{
    type: 'USER_MESSAGE',
    content_digest: digest(text),
    observed_at: observedAt,
  }];

  const classifications = {
    observations,
    inferences: inferenceSignals.map((pattern) => ({ pattern, epistemic_status: 'UNVERIFIED' })),
    durable_facts: durableFactSignals.map((pattern) => ({ pattern, status: 'CANDIDATE_ONLY', persistence: 'NOT_AUTHORIZED' })),
    sensitive_data: sensitiveSignals.map((pattern) => ({ pattern, handling: 'PROTECTED', publication: 'GATED' })),
    proposed_actions: proposedActions.map((pattern) => ({ pattern, authorization: 'REQUIRED', execution: 'NOT_AUTHORIZED' })),
  };

  return Object.freeze({
    boundary_version: OBSERVATION_BOUNDARY_VERSION,
    observation_id: `obs:${digest({ text, observedAt }).slice(7, 39)}`,
    observed_at: observedAt,
    source: 'USER_MESSAGE',
    classifications,
    gates: {
      generation: 'REQUIRES_GOVERNED_CONTEXT',
      publication: sensitiveSignals.length ? 'GATED' : 'ALLOWED_WITH_EPISTEMIC_LABELS',
      material_action: proposedActions.length ? 'AUTHORIZATION_REQUIRED' : 'NOT_PRESENT',
      durable_memory: durableFactSignals.length ? 'CANDIDATE_REQUIRES_PROVENANCE' : 'NOT_PRESENT',
    },
    authority: {
      observation_authorized: true,
      publication_authorized: sensitiveSignals.length === 0,
      memory_write_authorized: false,
      action_authorized: false,
    },
  });
}

export function evaluateGeneratedConclusion({ boundary, conclusion, evidence = [], material = false } = {}) {
  if (!boundary?.boundary_version) throw new Error('OBSERVATION_BOUNDARY_REQUIRED');
  if (typeof conclusion !== 'string' || !conclusion.trim()) {
    return { status: 'BLOCKED', reason: 'CONCLUSION_REQUIRED' };
  }
  if (material === true && evidence.length === 0) {
    return { status: 'BLOCKED', reason: 'MATERIAL_CONCLUSION_REQUIRES_EVIDENCE' };
  }
  if (boundary.gates.publication === 'GATED') {
    return { status: 'BLOCKED', reason: 'PUBLICATION_GATE_REQUIRED' };
  }
  return {
    status: 'READY_FOR_GOVERNED_PUBLICATION',
    epistemic_status: evidence.length ? 'EVIDENCE_SUPPORTED' : 'UNVERIFIED',
    evidence_required: material === true,
  };
}

export function assertGenerationAfterObservation({ boundary } = {}) {
  if (!boundary?.boundary_version) throw new Error('OBSERVATION_BOUNDARY_REQUIRED');
  return {
    allowed: true,
    rule: 'OBSERVE_BEFORE_GENERATE',
    generation_context: {
      observation_id: boundary.observation_id,
      inference_must_remain_unverified: true,
      durable_fact_requires_provenance: true,
      material_conclusion_requires_evidence: true,
      proposed_action_requires_authorization: true,
    },
  };
}
