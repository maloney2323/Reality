// Governed Personal Reality chat-turn to Continuity Thread bridge.
//
// The independent Vercel route remains the model execution plane. This module
// records what crossed the authenticated user boundary and what the model
// returned without promoting model output into evidence, truth, or authority.
// Stable turn-bound event ids make retries idempotent at the Continuity layer.

export const CHAT_CONTINUITY_AUTHORITY = 'GOVERNED_PERSONAL_CHAT_CONTINUITY_RECORDING';
export const CHAT_CONTINUITY_RECORD_VERSION = 'continuity-thread-v0.1';
export const CHAT_CONTINUITY_WORLD_ID = 'personal-reality-chat-v0.1';

function text(value, max = 4000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function occurredAt(value, offset = 0) {
  const parsed = Date.parse(value || '');
  return new Date((Number.isFinite(parsed) ? parsed : Date.now()) + offset).toISOString();
}

export function chatContinuityEventId(turnId, side) {
  const turn = text(turnId, 100);
  const suffix = side === 'assistant' ? 'assistant-response' : 'user-observation';
  return `continuity:personal-chat:${turn}:${suffix}`.slice(0, 160);
}

export function sanitizeChatTransport(value = {}) {
  const research = value?.research && typeof value.research === 'object'
    ? {
      requested: value.research.requested === true,
      executed: value.research.executed === true || value.research.used === true,
    }
    : null;
  const provider = typeof value?.model_provider === 'string'
    ? text(value.model_provider, 120)
    : value?.model_provider && typeof value.model_provider === 'object'
      ? text([value.model_provider.provider, value.model_provider.model].filter(Boolean).join(':'), 120)
      : '';
  return Object.freeze({
    source_version: text(value?.source_version, 160) || null,
    model_provider: provider || null,
    base44_function_gateway_required: value?.base44_function_gateway_required === true,
    base44_session_verified: value?.base44_session_verified === true,
    governed_context_migrated: value?.governed_context_migrated === true,
    truth_authorized: value?.truth_authorized === true,
    action_authorized: value?.action_authorized === true,
    research,
  });
}

function baseEvent({ principalId, thoughtId, conversationId, turnId, occurred, transport, spec, index }) {
  return Object.freeze({
    event_id: chatContinuityEventId(turnId, spec.side),
    thread_id: text(thoughtId, 160),
    record_version: CHAT_CONTINUITY_RECORD_VERSION,
    user_id: text(principalId, 220),
    work_world_id: CHAT_CONTINUITY_WORLD_ID,
    subject: 'Personal Reality Thought',
    event_type: 'OBSERVATION_RECORDED',
    payload: Object.freeze(spec.payload),
    provenance: Object.freeze({
      authority: CHAT_CONTINUITY_AUTHORITY,
      source_kind: spec.source_kind,
      admission_kind: spec.admission_kind,
      authenticated_user_id: text(principalId, 220),
      conversation_id: text(conversationId, 160),
      thought_id: text(thoughtId, 160),
      turn_id: text(turnId, 100),
      transport,
    }),
    source_refs: Object.freeze(spec.source_refs),
    evidence_status: 'PRESENT',
    requires_juan_approval: false,
    juan_approval_status: 'NOT_REQUIRED',
    consequential_action: false,
    authorization_is_completion: false,
    client_occurred_at: occurredAt(occurred, index),
  });
}

export function projectPersonalChatUserPreflightToContinuity({
  principalId,
  thoughtId,
  conversationId,
  turnId,
  observationId,
  userMessageId,
  userText,
  userTextSha256,
  admittedInputSha256,
  occurredAt: occurred,
} = {}) {
  if (!principalId || !thoughtId || !conversationId || !turnId || !observationId || !userMessageId) {
    return null;
  }

  return baseEvent({
    principalId,
    thoughtId,
    conversationId,
    turnId,
    occurred,
    transport: sanitizeChatTransport({}),
    index: 0,
    spec: {
      side: 'user',
      source_kind: 'AUTHENTICATED_PERSONAL_REALITY_USER_TURN',
      admission_kind: 'AUTHENTICATED_USER_OBSERVATION',
      source_refs: [
        `Observation:${text(observationId, 220)}`,
        `PersonalMessage:${text(userMessageId, 220)}`,
        `RealityCoreTurn:${text(turnId, 100)}`,
      ],
      payload: {
        observation_kind: 'AUTHENTICATED_PERSONAL_REALITY_USER_TURN',
        governance_phase: 'PRE_GENERATION_OBSERVATION_PREFLIGHT',
        turn_id: text(turnId, 100),
        conversation_id: text(conversationId, 160),
        thought_id: text(thoughtId, 160),
        observation_id: text(observationId, 220),
        personal_message_id: text(userMessageId, 220),
        display_text_excerpt: text(userText, 700),
        display_text_sha256: text(userTextSha256, 80),
        admitted_model_input_sha256: text(admittedInputSha256, 80),
        evidence_boundary: 'This event proves Reality received an authenticated user statement before model generation. It does not by itself establish the statement as world truth.',
        truth_established: false,
        action_authorized: false,
      },
    },
  });
}

export function projectPersonalChatTurnToContinuity({
  principalId,
  thoughtId,
  conversationId,
  turnId,
  observationId,
  userMessageId,
  assistantMessageId,
  userText,
  assistantText,
  userTextSha256,
  admittedInputSha256,
  assistantTextSha256,
  transport,
  occurredAt: occurred,
} = {}) {
  if (!principalId || !thoughtId || !conversationId || !turnId || !observationId || !userMessageId || !assistantMessageId) {
    return Object.freeze([]);
  }

  const safeTransport = sanitizeChatTransport(transport);
  const userEvent = projectPersonalChatUserPreflightToContinuity({
    principalId,
    thoughtId,
    conversationId,
    turnId,
    observationId,
    userMessageId,
    userText,
    userTextSha256,
    admittedInputSha256,
    occurredAt: occurred,
  });

  const assistantEvent = baseEvent({
    principalId,
    thoughtId,
    conversationId,
    turnId,
    occurred,
    transport: safeTransport,
    index: 1,
    spec: {
      side: 'assistant',
      source_kind: 'INDEPENDENT_REALITY_MODEL_RESPONSE',
      admission_kind: 'UNTRUSTED_ASSISTANT_HISTORY',
      source_refs: [
        `PersonalMessage:${text(assistantMessageId, 220)}`,
        `RealityCoreTurn:${text(turnId, 100)}`,
      ],
      payload: {
        observation_kind: 'UNTRUSTED_ASSISTANT_RESPONSE_EMITTED',
        turn_id: text(turnId, 100),
        conversation_id: text(conversationId, 160),
        thought_id: text(thoughtId, 160),
        personal_message_id: text(assistantMessageId, 220),
        response_excerpt: text(assistantText, 700),
        response_text_sha256: text(assistantTextSha256, 80),
        evidence_boundary: 'This event records that Reality emitted this assistant response. The response claims are not admitted as evidence, verified truth, authorization, or proof of action.',
        claims_authorized_as_evidence: false,
        truth_established: false,
        action_authorized: false,
      },
    },
  });

  return Object.freeze([userEvent, assistantEvent]);
}