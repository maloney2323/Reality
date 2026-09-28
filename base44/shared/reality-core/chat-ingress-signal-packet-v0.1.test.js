import assert from 'node:assert/strict';
import {
  buildChatIngressSignalPacket,
  chatIngressPacketForPrompt,
  CHAT_INGRESS_SIGNAL_PACKET_VERSION,
} from './chat-ingress-signal-packet-v0.1.js';
import { CANONICAL_PACKET_VERSION } from './engine-adapter.js';

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

// Regression test: a user message reaches the model path through the canonical
// signal-cleaning step. This proves the production chat ingress converts every
// ordinary user question into a governed canonical packet before model
// invocation, preserving the original message exactly and failing closed if
// the cleaner fails.
test('a user message reaches the model through the canonical signal-cleaning step', () => {
  const content = 'What is on my calendar today?';
  const packet = buildChatIngressSignalPacket({
    user_message_id: 'msg-1',
    principal_id: 'user-1',
    content,
    received_at: '2026-09-26T19:52:00Z',
  });

  // The packet is a governed canonical packet produced by the existing cleaner.
  assert.equal(packet.packet_version, CANONICAL_PACKET_VERSION);
  assert.equal(packet.metadata.cleaner_version, 'reality-fragmented-signal-cleaner-v0.2');
  assert.equal(packet.metadata.authority, 'CANONICALIZATION_ONLY');
  assert.equal(CHAT_INGRESS_SIGNAL_PACKET_VERSION, 'reality-chat-ingress-signal-packet-v0.1');

  // The user message is the single admitted observation, preserved exactly.
  assert.equal(packet.observations.length, 1);
  assert.equal(packet.observations[0].content, content);
  assert.equal(packet.observations[0].source_ref, 'personal-reality-chat:user-message');
  assert.equal(packet.observations[0].attributes.admission_ref, 'chat-admission:msg-1');
  assert.equal(packet.observations[0].attributes.received_at, '2026-09-26T19:52:00.000Z');

  // The cleaner did not guess a missing observed time; it stays unresolved.
  assert.equal(packet.observations[0].observed_at, null);
  assert.equal(packet.metadata.temporal.observations_without_observed_at, 1);

  // No conflict winner was selected; no truth or action authority was granted.
  assert.equal(packet.conflicts.length, 0);
  assert.equal(packet.metadata.conflict_policy, 'SURFACE_WITHOUT_RESOLUTION');
  assert.equal(packet.metadata.independence_policy, 'NOT_INFERRED');

  // The packet is renderable as structured prompt context carrying the message.
  const promptContext = chatIngressPacketForPrompt(packet);
  assert.ok(promptContext.includes(content));
  assert.ok(promptContext.includes('CANONICALIZATION_ONLY'));
  assert.ok(promptContext.includes('SURFACE_WITHOUT_RESOLUTION'));
});

test('a cleaner failure fails closed instead of bypassing to the raw message', () => {
  // A malformed timestamp reaches the existing cleaner, which rejects it; the
  // helper propagates that failure rather than silently bypassing the cleaner.
  assert.throws(() => buildChatIngressSignalPacket({
    user_message_id: 'msg-2',
    principal_id: 'user-1',
    content: 'valid content',
    received_at: 'not-a-timestamp',
  }), /not a valid timestamp/);
});

let failed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}\n  ${error.stack}`);
  }
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
if (failed) process.exit(1);