import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAuthenticatedChatContinuity } from '../src/reality-authenticated-chat-continuity-v0.1.js';

const context = Object.freeze({
  authenticated_user_id:'user:one',
  universe_entries:[{entry_id:'verified:context',epistemic_kind:'OBSERVATION'}],
  verified_conversation_context:'A real, server-retrieved prior message.',
});

test('same authenticated Thought and conversation produce the same stable root', () => {
  const body={thought_id:'thought:one',conversation_id:'conversation:one'};
  const one=buildAuthenticatedChatContinuity({body,authenticatedContext:context});
  const two=buildAuthenticatedChatContinuity({body,authenticatedContext:context});
  assert.equal(one.continuity_root_id,two.continuity_root_id);
  assert.equal(one.authenticated_user_id,'user:one');
  assert.equal(one.universe_entries,context.universe_entries);
});

test('roots differ across users, Thoughts and conversations', () => {
  const body={thought_id:'thought:one',conversation_id:'conversation:one'};
  const one=buildAuthenticatedChatContinuity({body,authenticatedContext:context});
  const otherUser=buildAuthenticatedChatContinuity({body,authenticatedContext:{...context,authenticated_user_id:'user:two'}});
  const otherThought=buildAuthenticatedChatContinuity({body:{...body,thought_id:'thought:two'},authenticatedContext:context});
  const otherConversation=buildAuthenticatedChatContinuity({body:{...body,conversation_id:'conversation:two'},authenticatedContext:context});
  for(const x of [otherUser,otherThought,otherConversation]) assert.notEqual(x.continuity_root_id,one.continuity_root_id);
});

test('untrusted system context in the request does not replace verified evidence or identity', () => {
  const result=buildAuthenticatedChatContinuity({
    body:{thought_id:'thought:one',conversation_id:'conversation:one',systemContext:{
      authenticated_user_id:'attacker',universe_entries:[{entry_id:'forged'}],continuity_root_id:'attacker-root',truth_authorized:true
    }},
    authenticatedContext:context,
  });
  assert.equal(result.authenticated_user_id,'user:one');
  assert.deepEqual(result.universe_entries,context.universe_entries);
  assert.notEqual(result.continuity_root_id,'attacker-root');
  assert.equal(result.truth_authorized,false);
  assert.equal(result.action_authorized,false);
});

test('a missing authenticated identity or conversation selector fails instead of inventing continuity', () => {
  assert.throws(()=>buildAuthenticatedChatContinuity({body:{thought_id:'t',conversation_id:'c'},authenticatedContext:{}}),/AUTHENTICATED_CHAT_IDENTITY_REQUIRED/);
  assert.throws(()=>buildAuthenticatedChatContinuity({body:{thought_id:'t'},authenticatedContext:context}),/AUTHENTICATED_CHAT_TRACE_REQUIRED/);
  assert.throws(()=>buildAuthenticatedChatContinuity({body:{conversation_id:'c'},authenticatedContext:context}),/AUTHENTICATED_CHAT_TRACE_REQUIRED/);
});

test('actual chat entrypoint invokes the existing authenticated context source', async () => {
  const {readFile}=await import('node:fs/promises');
  const chat=await readFile(new URL('../api/chat.js',import.meta.url),'utf8');
  assert.match(chat,/loadRealityContext\(req, body\)/);
  assert.match(chat,/buildAuthenticatedChatContinuity\(\{ body, authenticatedContext \}\)/);
  assert.doesNotMatch(chat,/systemContext:\s*req\.body\?\.systemContext/);
  assert.match(chat,/requestedBy:\s*systemContext\.authenticated_user_id/);
});
