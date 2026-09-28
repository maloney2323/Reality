// Governed phone-call to Continuity Thread bridge.
//
// RealityOutboundCallEvent remains the provider/source ledger. This module
// deterministically projects each immutable source event into the general
// ContinuityThreadEvent contract. Stable event ids make the projection
// idempotent; later confirmations, corrections, contradictions, and provider
// observations are appended rather than rewriting earlier history.

export const CALL_CONTINUITY_AUTHORITY = 'GOVERNED_CALL_CONTINUITY_SOURCE_PROJECTION';
export const CALL_CONTINUITY_RECORD_VERSION = 'continuity-thread-v0.1';

function text(value, max = 4000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function values(value, maxItems = 10, maxLength = 500) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => text(item, maxLength)).filter(Boolean).slice(0, maxItems);
}

function maskedPhone(value) {
  const phone = text(value, 40);
  if (!phone) return '';
  const suffix = phone.replace(/\D/g, '').slice(-4);
  return suffix ? `•••-${suffix}` : 'masked';
}

function eventTime(source, index) {
  const parsed = Date.parse(source?.created_at || source?.created_date || '');
  return new Date((Number.isFinite(parsed) ? parsed : Date.now()) + index).toISOString();
}

function stableEventId(source, suffix) {
  return `continuity:${text(source?.event_id, 100)}:${suffix}`.slice(0, 160);
}

function delegatedSourceRefs(source) {
  const payload = source?.payload || {};
  if (text(payload?.source_kind, 120) !== 'DELEGATED_CUSTOMER_UPDATE_V0_2_VERIFIED') return [];
  return [
    payload?.source_delegated_run_id ? `DELEGATED_CUSTOMER_UPDATE_RUN:${text(payload.source_delegated_run_id, 220)}` : '',
    payload?.source_candidate_hash ? `DELEGATED_CUSTOMER_UPDATE_CANDIDATE_SHA256:${text(payload.source_candidate_hash, 220)}` : '',
    payload?.source_verification_event_id ? `DelegatedCustomerUpdateEvent:${text(payload.source_verification_event_id, 220)}` : '',
    payload?.source_reconciled_event_id ? `DelegatedCustomerUpdateEvent:${text(payload.source_reconciled_event_id, 220)}` : '',
  ].filter(Boolean);
}

function baseProjectedEvent(source, spec, index) {
  const providerCallId = text(source?.provider_call_id, 220);
  const sourceRef = `RealityOutboundCallEvent:${text(source?.event_id, 160)}`;
  return Object.freeze({
    event_id: stableEventId(source, spec.suffix),
    thread_id: text(source?.call_thread_id, 160),
    record_version: CALL_CONTINUITY_RECORD_VERSION,
    user_id: text(source?.user_id, 220),
    work_world_id: text(source?.work_world_id, 220),
    project_id: text(source?.project_id, 220),
    subject: text(source?.subject, 240) || 'Governed outbound phone call',
    event_type: spec.event_type,
    payload: Object.freeze(spec.payload || {}),
    provenance: Object.freeze({
      authority: CALL_CONTINUITY_AUTHORITY,
      source_kind: 'REALITY_OUTBOUND_CALL_EVENT',
      source_event_id: text(source?.event_id, 160),
      source_event_type: text(source?.event_type, 120),
      source_record_version: text(source?.record_version, 120),
      source_created_at: text(source?.created_at || source?.created_date, 120),
      authenticated_user_id: text(source?.user_id, 220),
      provider: text(source?.provider, 80),
      provider_call_id: providerCallId,
      admission_kind: source?.event_type === 'CALL_PREPARED'
        ? 'AUTHENTICATED_USER_REQUEST'
        : source?.event_type === 'CALL_AUTHORIZED' || source?.event_type === 'CALL_DELIVERY_CONFIRMED'
          ? 'AUTHENTICATED_USER_CONFIRMATION'
          : 'SERVICE_WRITTEN_OBSERVATION',
    }),
    source_refs: Object.freeze([
      sourceRef,
      ...delegatedSourceRefs(source),
      ...(providerCallId ? [`VAPI_CALL:${providerCallId}`] : []),
    ]),
    evidence_status: spec.evidence_status || source?.evidence_status || 'PENDING',
    requires_juan_approval: spec.requires_juan_approval === true,
    juan_approval_status: spec.juan_approval_status || 'NOT_REQUIRED',
    consequential_action: spec.consequential_action === true,
    authorization_is_completion: false,
    client_occurred_at: eventTime(source, index),
  });
}

function preparedSpecs(source) {
  const facts = values(source?.approved_update_facts, 8, 500);
  const forbidden = values(source?.forbidden_topics, 10, 500);
  const recipient = Object.freeze({
    label: text(source?.customer_name, 160) || 'Prepared recipient',
    phone_masked: maskedPhone(source?.customer_phone_e164),
  });
  return [
    {
      suffix: 'goal',
      event_type: 'GOAL_RECORDED',
      evidence_status: 'PRESENT',
      payload: {
        workflow: 'GOVERNED_OUTBOUND_PHONE_CALL',
        goal: 'Deliver the approved project update to the intended recipient without adding unapproved facts or commitments.',
        request_observation_kind: 'AUTHENTICATED_USER_REQUEST',
        intended_recipient: recipient,
        approved_update_facts: facts,
        completion_status: 'NOT_STARTED',
      },
    },
    {
      suffix: 'success',
      event_type: 'SUCCESS_CONDITIONS_RECORDED',
      evidence_status: 'PRESENT',
      payload: {
        conditions: [
          'HUMAN_AUTHORIZATION_RECORDED_WITH_EXACT_SCOPE',
          'VAPI_ACTUAL_CALL_ATTEMPT_OBSERVED',
          'RECIPIENT_CONNECTION_OBSERVED',
          'APPROVED_UPDATE_UTTERANCE_OBSERVED',
          'AUTHENTICATED_DELIVERY_CONFIRMATION_RECORDED',
          'UNRESOLVED_QUESTIONS_SURFACED_WITHOUT_INVENTED_ANSWERS',
        ],
        missing_evidence_means: 'PENDING_NOT_COMPLETED',
      },
    },
    {
      suffix: 'decision',
      event_type: 'DECISION_RECORDED',
      evidence_status: 'PRESENT',
      requires_juan_approval: true,
      juan_approval_status: 'PENDING',
      payload: {
        decision: 'Prepare one bounded outbound call for review without placing it.',
        call_authorized: false,
        call_requested: false,
        completion_status: 'NOT_COMPLETED',
      },
    },
    {
      suffix: 'reasoning',
      event_type: 'REASONING_RECEIPT_RECORDED',
      evidence_status: 'PRESENT',
      payload: {
        reasoning_summary: 'The call is limited to authenticated user-supplied update facts; consequential commitments and unknown answers are forbidden and must return to Juan.',
        approved_update_facts: facts,
        forbidden_topics: forbidden,
        uncertainty: [
          'Provider execution is not established by preparation.',
          'Connection, delivery, questions, and outcome remain unknown until provider observations arrive.',
        ],
      },
    },
    {
      suffix: 'expected',
      event_type: 'EXPECTED_OUTCOME_RECORDED',
      evidence_status: 'PENDING',
      payload: {
        expected_outcome: 'One authorized call reaches the intended recipient, states only the approved update, captures unanswered questions, and is explicitly reconciled.',
        authorization_is_completion: false,
        outcome_status: 'PENDING',
      },
    },
    {
      suffix: 'next',
      event_type: 'NEXT_RIGHT_ACTION_RECORDED',
      evidence_status: 'PENDING',
      requires_juan_approval: true,
      juan_approval_status: 'PENDING',
      consequential_action: true,
      payload: {
        summary: 'Juan must review the exact recipient, approved facts, and forbidden topics, then explicitly approve or reject this one prepared call.',
        action: 'REVIEW_AND_AUTHORIZE_ONE_PREPARED_CALL',
        action_executed: false,
      },
    },
  ];
}

function authorizedSpecs(source) {
  return [
    {
      suffix: 'authorization',
      event_type: 'AUTHORIZATION_RECORDED',
      evidence_status: 'PRESENT',
      requires_juan_approval: true,
      juan_approval_status: 'APPROVED',
      consequential_action: true,
      payload: {
        action: 'PLACE_ONE_PREPARED_OUTBOUND_CALL',
        authorization_scope: text(source?.payload?.authorization_scope, 220) || 'ONE_PREPARED_OUTBOUND_CALL_ONLY',
        authority: text(source?.payload?.authority, 220) || 'EXPLICIT_AUTHENTICATED_USER_APPROVAL',
        intended_recipient: {
          label: text(source?.customer_name, 160) || 'Prepared recipient',
          phone_masked: maskedPhone(source?.customer_phone_e164),
        },
        approved_update_facts: values(source?.approved_update_facts, 8, 500),
        forbidden_topics: values(source?.forbidden_topics, 10, 500),
        completion_status: 'NOT_COMPLETED_BY_AUTHORIZATION',
      },
    },
    {
      suffix: 'authorized-state',
      event_type: 'STATE_CHANGE_RECORDED',
      evidence_status: 'PRESENT',
      payload: {
        prior_state: 'PREPARED_AWAITING_APPROVAL',
        state: 'AUTHORIZED_NOT_EXECUTED',
        call_requested: false,
        call_completed: false,
        authorization_is_completion: false,
      },
    },
  ];
}

function requestedSpecs(source) {
  return [
    {
      suffix: 'request-observation',
      event_type: 'OBSERVATION_RECORDED',
      evidence_status: 'PENDING',
      payload: {
        observation_kind: 'VAPI_CALL_REQUEST_ACCEPTED',
        provider: text(source?.provider, 80) || 'VAPI',
        provider_call_id: text(source?.provider_call_id, 220),
        provider_status: text(source?.provider_status, 120),
        provider_request_accepted: source?.payload?.provider_request_accepted === true,
        actual_call_attempt_established: false,
        completion_status: 'PENDING_PROVIDER_OBSERVATION',
      },
    },
    {
      suffix: 'requested-state',
      event_type: 'STATE_CHANGE_RECORDED',
      evidence_status: 'PENDING',
      payload: {
        prior_state: 'AUTHORIZED_NOT_EXECUTED',
        state: 'CALL_REQUESTED_AWAITING_PROVIDER_OBSERVATION',
        call_completed: false,
      },
    },
    {
      suffix: 'request-next',
      event_type: 'NEXT_RIGHT_ACTION_RECORDED',
      evidence_status: 'PENDING',
      payload: {
        summary: 'Retrieve Vapi status and transcript evidence before deciding whether the call was attempted, connected, or delivered.',
        action: 'REFRESH_PROVIDER_OBSERVATION',
        action_executed: false,
      },
    },
  ];
}

function providerObservationSpecs(source) {
  const outcome = text(source?.payload?.provider_outcome, 120) || 'PENDING';
  const providerStatus = text(source?.provider_status, 120);
  const endedReason = text(source?.provider_ended_reason, 240);
  const startedAt = text(source?.payload?.provider_started_at, 120);
  const attemptObserved = Boolean(
    startedAt
    || ['in-progress', 'ended'].includes(providerStatus.toLowerCase())
    || (outcome && outcome !== 'PENDING')
    || endedReason
  );
  const connected = source?.provider_connection_established === true;
  const utterance = source?.update_utterance_observed === true;
  const transcript = text(source?.transcript_excerpt, 12000);
  const terminal = ['ENDED', 'NO_ANSWER', 'VOICEMAIL', 'FAILED'].includes(outcome);
  const goalStatus = utterance
    ? 'PARTIALLY_OBSERVED_AWAITING_AUTHENTICATED_CONFIRMATION'
    : terminal
      ? 'NOT_ACHIEVED'
      : 'PENDING';
  const next = utterance
    ? 'Review the provider observation and explicitly confirm delivery; provider evidence alone does not complete the goal.'
    : terminal
      ? 'Review the provider outcome. Any new call attempt requires a new explicit approval.'
      : 'Refresh Vapi until a terminal provider observation is available.';

  return [
    {
      suffix: 'provider-observation',
      event_type: 'OBSERVATION_RECORDED',
      evidence_status: 'PRESENT',
      payload: {
        observation_kind: 'VAPI_CALL_OUTCOME_AND_TRANSCRIPT',
        provider: text(source?.provider, 80) || 'VAPI',
        provider_call_id: text(source?.provider_call_id, 220),
        provider_status: providerStatus,
        provider_ended_reason: endedReason,
        provider_outcome: outcome,
        actual_call_attempt_established: attemptObserved,
        provider_connection_established: connected,
        approved_update_utterance_observed: utterance,
        transcript_available: Boolean(transcript),
        transcript_excerpt: transcript,
        transcript_authority: 'PROVIDER_GENERATED_OBSERVATION_NOT_INDEPENDENTLY_VERIFIED',
        delivery_confirmed: false,
      },
    },
    {
      suffix: 'provider-reconciliation',
      event_type: 'RECONCILIATION_RECORDED',
      evidence_status: 'PRESENT',
      payload: {
        goal_status: goalStatus,
        success_condition_status: {
          vapi_actual_call_attempt: attemptObserved ? 'OBSERVED' : terminal ? 'NOT_ESTABLISHED' : 'PENDING',
          recipient_connection: connected ? 'OBSERVED' : terminal ? 'NOT_ACHIEVED' : 'PENDING',
          approved_update_utterance: utterance ? 'OBSERVED_AWAITING_CONFIRMATION' : terminal ? 'NOT_ESTABLISHED' : 'PENDING',
          authenticated_delivery_confirmation: 'PENDING',
        },
        reconciliation_rule: 'AUTHORIZATION_AND_PROVIDER_REQUEST_DO_NOT_ESTABLISH_COMPLETION',
      },
    },
    {
      suffix: 'provider-state',
      event_type: 'STATE_CHANGE_RECORDED',
      evidence_status: 'PRESENT',
      payload: {
        state: utterance
          ? 'UPDATE_UTTERANCE_OBSERVED_AWAITING_CONFIRMATION'
          : terminal
            ? 'CALL_OBSERVED_OUTCOME_NOT_ACHIEVED'
            : 'CALL_IN_PROGRESS_OR_PENDING',
        provider_outcome: outcome,
        call_completed: false,
      },
    },
    {
      suffix: 'provider-next',
      event_type: 'NEXT_RIGHT_ACTION_RECORDED',
      evidence_status: utterance ? 'PRESENT' : 'PENDING',
      requires_juan_approval: utterance,
      juan_approval_status: utterance ? 'PENDING' : 'NOT_REQUIRED',
      payload: {
        summary: next,
        action: utterance ? 'CONFIRM_OR_CONTRADICT_DELIVERY' : terminal ? 'REVIEW_OUTCOME_BEFORE_NEW_AUTHORIZATION' : 'REFRESH_PROVIDER_OBSERVATION',
        action_executed: false,
      },
    },
  ];
}

function questionSpecs(source) {
  return [
    {
      suffix: 'question-observation',
      event_type: 'OBSERVATION_RECORDED',
      evidence_status: 'PRESENT',
      payload: {
        observation_kind: 'CUSTOMER_QUESTION_CANDIDATE',
        question: text(source?.payload?.question, 2000),
        source: text(source?.payload?.source, 300),
        answer_established: false,
        transcript_observation_only: true,
      },
    },
    {
      suffix: 'question-next',
      event_type: 'NEXT_RIGHT_ACTION_RECORDED',
      evidence_status: 'PENDING',
      requires_juan_approval: true,
      juan_approval_status: 'PENDING',
      payload: {
        summary: 'Juan needs to review the captured customer question and decide whether and how to answer it.',
        action: 'JUAN_REVIEW_CAPTURED_QUESTION',
        question: text(source?.payload?.question, 2000),
        action_executed: false,
      },
    },
  ];
}

function deliverySpecs(source) {
  return [
    {
      suffix: 'delivery-confirmation',
      event_type: 'CONFIRMATION_RECORDED',
      evidence_status: 'PRESENT',
      requires_juan_approval: true,
      juan_approval_status: 'APPROVED',
      payload: {
        confirmation_type: 'CALL_DELIVERY_CONFIRMED',
        confirmation_authority: text(source?.payload?.confirmation_authority, 300) || 'AUTHENTICATED_USER_CONFIRMATION_AFTER_PROVIDER_EVIDENCE',
        confirmation_statement: text(source?.payload?.confirmation_statement, 1000),
        provider_evidence_ref: text(source?.payload?.provider_evidence_ref, 220),
      },
    },
    {
      suffix: 'delivery-reconciliation',
      event_type: 'RECONCILIATION_RECORDED',
      evidence_status: 'PRESENT',
      payload: {
        goal_status: 'ACHIEVED',
        success_condition_status: {
          provider_connection: 'OBSERVED',
          approved_update_utterance: 'OBSERVED',
          authenticated_delivery_confirmation: 'CONFIRMED',
        },
        completion_basis: 'PROVIDER_EVIDENCE_PLUS_AUTHENTICATED_USER_CONFIRMATION',
      },
    },
    {
      suffix: 'delivery-state',
      event_type: 'STATE_CHANGE_RECORDED',
      evidence_status: 'PRESENT',
      payload: {
        state: 'CALL_DELIVERY_CONFIRMED',
        call_completed: true,
        authorization_is_completion: false,
      },
    },
    {
      suffix: 'delivery-next',
      event_type: 'NEXT_RIGHT_ACTION_RECORDED',
      evidence_status: 'PRESENT',
      payload: {
        summary: 'Review any separately captured customer question; otherwise no further call action is required.',
        action: 'REVIEW_CAPTURED_QUESTION_OR_CLOSE_THREAD',
        action_executed: false,
      },
    },
  ];
}

function failedSpecs(source) {
  return [
    {
      suffix: 'failure-observation',
      event_type: 'OBSERVATION_RECORDED',
      evidence_status: source?.evidence_status || 'MISSING',
      payload: {
        observation_kind: 'CALL_EXECUTION_FAILED_CLOSED',
        reason: text(source?.payload?.reason, 300),
        missing: values(source?.payload?.missing, 10, 300),
        provider_diagnostic: text(source?.payload?.diagnostic, 1000),
        call_requested: source?.payload?.call_requested === true,
        actual_call_attempt_established: false,
        completion_status: 'NOT_COMPLETED',
      },
    },
    {
      suffix: 'failure-reconciliation',
      event_type: 'RECONCILIATION_RECORDED',
      evidence_status: source?.evidence_status || 'MISSING',
      payload: {
        goal_status: 'NOT_ACHIEVED',
        reconciliation_rule: 'MISSING_EXECUTION_EVIDENCE_REMAINS_PENDING_OR_NOT_COMPLETED',
      },
    },
    {
      suffix: 'failure-state',
      event_type: 'STATE_CHANGE_RECORDED',
      evidence_status: source?.evidence_status || 'MISSING',
      payload: {
        state: 'AUTHORIZED_WITHOUT_EXECUTION',
        call_completed: false,
      },
    },
    {
      suffix: 'failure-next',
      event_type: 'NEXT_RIGHT_ACTION_RECORDED',
      evidence_status: 'PENDING',
      requires_juan_approval: true,
      juan_approval_status: 'PENDING',
      consequential_action: true,
      payload: {
        summary: 'Resolve the provider failure, then require a fresh explicit approval before any new call request.',
        action: 'RESOLVE_PROVIDER_AND_REAUTHORIZE',
        action_executed: false,
      },
    },
  ];
}

export function projectCallEventToContinuity(source) {
  if (!source?.event_id || !source?.call_thread_id || !source?.user_id) return Object.freeze([]);
  let specs = [];
  if (source.event_type === 'CALL_PREPARED') specs = preparedSpecs(source);
  else if (source.event_type === 'CALL_AUTHORIZED') specs = authorizedSpecs(source);
  else if (source.event_type === 'CALL_REQUESTED') specs = requestedSpecs(source);
  else if (source.event_type === 'CALL_PROVIDER_OBSERVED') specs = providerObservationSpecs(source);
  else if (source.event_type === 'CALL_QUESTION_CANDIDATE') specs = questionSpecs(source);
  else if (source.event_type === 'CALL_DELIVERY_CONFIRMED') specs = deliverySpecs(source);
  else if (source.event_type === 'CALL_FAILED_CLOSED') specs = failedSpecs(source);
  return Object.freeze(specs.map((spec, index) => baseProjectedEvent(source, spec, index)));
}

function timestamp(event) {
  const parsed = Date.parse(event?.client_occurred_at || event?.created_at || event?.created_date || '');
  return Number.isFinite(parsed) ? parsed : 0;
}

export function mergeCallContinuityEvents(storedEvents = [], callEvents = []) {
  const byId = new Map();
  for (const event of storedEvents || []) {
    if (event?.event_id) byId.set(event.event_id, event);
  }
  for (const callEvent of callEvents || []) {
    for (const projected of projectCallEventToContinuity(callEvent)) {
      if (!byId.has(projected.event_id)) byId.set(projected.event_id, projected);
    }
  }
  return Object.freeze([...byId.values()].sort((a, b) => timestamp(a) - timestamp(b) || String(a?.event_id || '').localeCompare(String(b?.event_id || ''))));
}

export function isCallContinuityRequest(message) {
  const value = String(message || '');
  const call = /\b(?:phone[ -]?call|outbound call|vapi|call workflow|call history)\b/i.test(value);
  const continuity = /\b(?:continuity|governed history|reconstruct|what happened|authorization|authorized|attempted|transcript|call outcome|provenance|original goal|success conditions|next-right action|next right action)\b/i.test(value);
  return call && continuity;
}

function eventSummary(event) {
  const payload = event?.payload || {};
  const parts = [
    payload.goal,
    payload.decision,
    payload.expected_outcome,
    payload.summary,
    payload.reasoning_summary,
    payload.confirmation_statement,
    payload.question ? `Captured question: ${payload.question}` : '',
    payload.state ? `State: ${payload.state}` : '',
    payload.goal_status ? `Goal status: ${payload.goal_status}` : '',
    payload.authorization_scope ? `Authorization scope: ${payload.authorization_scope}` : '',
    payload.provider_outcome ? `Provider outcome: ${payload.provider_outcome}` : '',
    payload.transcript_excerpt ? `Provider transcript observation: ${text(payload.transcript_excerpt, 900)}` : '',
  ].filter(Boolean);
  if (parts.length) return parts.join(' ');
  return JSON.stringify(payload).slice(0, 1100);
}

export function continuityEventReference(event, index = 0) {
  const source = event?.provenance || {};
  const occurred = text(event?.client_occurred_at || event?.created_date, 120) || 'time unknown';
  const evidence = text(event?.evidence_status, 60) || 'PENDING';
  const approval = text(event?.juan_approval_status, 60) || 'NOT_REQUIRED';
  const exactText = `Governed Continuity Thread event ${text(event?.event_type, 100)} at ${occurred} for "${text(event?.subject, 240)}": ${eventSummary(event)} Evidence status: ${evidence}. Juan approval status: ${approval}. Authorization is not completion. Provenance: ${text(source?.source_kind, 120) || 'ContinuityThreadEvent'} ${text(source?.source_event_id, 160)}.`.slice(0, 1750);
  return Object.freeze({
    id: `continuity-event:${text(event?.event_id, 300)}`,
    authority: CALL_CONTINUITY_AUTHORITY,
    reference_role: 'CONTINUITY_EVENT',
    transition_id: text(event?.event_id, 300),
    event_sequence: index + 1,
    subject: text(event?.subject, 240),
    state_type: `continuity.${text(event?.event_type, 100).toLowerCase()}`,
    transition_type: text(event?.event_type, 100),
    reason_code: text(event?.payload?.reason || event?.payload?.goal_status || event?.event_type, 160),
    candidate_value: text((event?.juan_approval_status && event.juan_approval_status !== 'NOT_REQUIRED') ? event.juan_approval_status : event?.payload?.state || event?.payload?.goal_status || event?.event_type, 160),
    epistemic_status: text(event?.evidence_status, 60) || 'PENDING',
    state_version: null,
    evidence_refs: Object.freeze([...(event?.source_refs || [])]),
    proof_only: false,
    proof_kind: null,
    exact_text: exactText,
  });
}

export function latestCallContinuityContext({ storedEvents = [], callEvents = [] } = {}) {
  const calls = [...(callEvents || [])].sort((a, b) => timestamp(a) - timestamp(b));
  const latestThreadId = calls[calls.length - 1]?.call_thread_id
    || [...(storedEvents || [])].sort((a, b) => timestamp(a) - timestamp(b))[storedEvents.length - 1]?.thread_id
    || '';
  const merged = mergeCallContinuityEvents(storedEvents, callEvents);
  const events = latestThreadId ? merged.filter((event) => event?.thread_id === latestThreadId) : [];
  const references = events.map((event, index) => continuityEventReference(event, index));
  return Object.freeze({
    authority: CALL_CONTINUITY_AUTHORITY,
    available: events.length > 0,
    thread_id: latestThreadId || null,
    events: Object.freeze(events),
    references: Object.freeze(references),
    stored_event_count: events.filter((event) => (storedEvents || []).some((stored) => stored?.event_id === event?.event_id)).length,
    source_call_event_count: calls.filter((event) => event?.call_thread_id === latestThreadId).length,
    action_authorized: false,
  });
}