import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAT_CONTINUITY_AUTHORITY,
  CHAT_CONTINUITY_WORLD_ID,
  chatContinuityEventId,
  projectPersonalChatTurnToContinuity,
  sanitizeChatTransport,
} from './chat-continuity.js';

const source = Object.freeze({
  principalId: 'user_1',
  thoughtId: 'thought_12345678',
  conversationId: 'personal_12345678',
  turnId: 'chat_turn_12345678',
  observationId: 'obs_1',
  userMessageId: 'msg_user_1',
  assistantMessageId: 'msg_assistant_1',
  userText: 'Continue the continuity update.',
  assistantText: 'I found the current implementation boundary.',
  userTextSha256: 'u'.repeat(64),
  admittedInputSha256: 'i'.repeat(64),
  assistantTextSha256: 'a'.repeat(64),
  occurredAt: '2026-08-25T20:00:00.000Z',
  transport: {
    source_version: 'reality-core-api-v0.4',
    model_provider: 'OPENAI',
    base44_session_verified: true,
    governed_context_migrated: false,
    truth_authorized: false,
    action_authorized: false,
    research: { requested: true, executed: true, raw_results: ['must not persist'] },
    arbitrary_secret: 'must not persist',
  },
});

test('chat continuity uses deterministic turn-bound ids and the persistent Thought as the thread', () => {
  const [userEvent, assistantEvent] = projectPersonalChatTurnToContinuity(source);
  assert.equal(userEvent.thread_id, source.thoughtId);
  assert.equal(assistantEvent.thread_id, source.thoughtId);
  assert.equal(userEvent.work_world_id, CHAT_CONTINUITY_WORLD_ID);
  assert.equal(assistantEvent.work_world_id, CHAT_CONTINUITY_WORLD_ID);
  assert.equal(userEvent.event_id, chatContinuityEventId(source.turnId, 'user'));
  assert.equal(assistantEvent.event_id, chatContinuityEventId(source.turnId, 'assistant'));
  assert.notEqual(userEvent.event_id, assistantEvent.event_id);
  assert.equal(userEvent.provenance.authority, CHAT_CONTINUITY_AUTHORITY);
});

test('authenticated user turn is evidence of the statement being received, not automatic world truth', () => {
  const [userEvent] = projectPersonalChatTurnToContinuity(source);
  assert.equal(userEvent.event_type, 'OBSERVATION_RECORDED');
  assert.equal(userEvent.evidence_status, 'PRESENT');
  assert.equal(userEvent.provenance.admission_kind, 'AUTHENTICATED_USER_OBSERVATION');
  assert.equal(userEvent.payload.truth_established, false);
  assert.equal(userEvent.payload.action_authorized, false);
  assert.match(userEvent.payload.evidence_boundary, /does not by itself establish.*world truth/i);
  assert.deepEqual(userEvent.source_refs, [
    'Observation:obs_1',
    'PersonalMessage:msg_user_1',
    `RealityCoreTurn:${source.turnId}`,
  ]);
});

test('assistant response occurrence is retained while all assistant claims remain untrusted', () => {
  const [, assistantEvent] = projectPersonalChatTurnToContinuity(source);
  assert.equal(assistantEvent.event_type, 'OBSERVATION_RECORDED');
  assert.equal(assistantEvent.evidence_status, 'PRESENT');
  assert.equal(assistantEvent.provenance.admission_kind, 'UNTRUSTED_ASSISTANT_HISTORY');
  assert.equal(assistantEvent.payload.claims_authorized_as_evidence, false);
  assert.equal(assistantEvent.payload.truth_established, false);
  assert.equal(assistantEvent.payload.action_authorized, false);
  assert.equal(assistantEvent.consequential_action, false);
  assert.equal(assistantEvent.authorization_is_completion, false);
  assert.match(assistantEvent.payload.evidence_boundary, /claims are not admitted as evidence/i);
});

test('transport provenance is allow-listed and cannot widen authority', () => {
  const transport = sanitizeChatTransport(source.transport);
  assert.deepEqual(transport.research, { requested: true, executed: true });
  assert.equal('arbitrary_secret' in transport, false);
  assert.equal('raw_results' in transport.research, false);
  assert.equal(transport.governed_context_migrated, false);
  assert.equal(transport.truth_authorized, false);
  assert.equal(transport.action_authorized, false);
});

test('invalid incomplete source cannot manufacture a continuity event', () => {
  assert.deepEqual(projectPersonalChatTurnToContinuity({ ...source, observationId: '' }), []);
});