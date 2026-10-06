import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createRawSignalPacket,
  cleanFragmentedSignal,
  buildGovernedChatSignal,
} from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';

test('preserves raw signal and creates deterministic packet identity', () => {
  const a = createRawSignalPacket({ message: 'Hello  world' , observedAt: '2026-10-05T00:00:00.000Z' });
  const b = createRawSignalPacket({ message: 'Hello  world' , observedAt: '2026-10-05T00:00:00.000Z' });
  assert.equal(a.packet_id, b.packet_id);
  assert.equal(a.raw_content, 'Hello  world');
  assert.match(a.raw_content_digest, /^sha256:/);
});

test('fragments without silently changing meaning and preserves transformation receipt', () => {
  const result = buildGovernedChatSignal({
    message: 'What is the difference?  Explain it simply.',
    observedAt: '2026-10-05T00:00:00.000Z',
  });
  assert.equal(result.packet.raw_content, 'What is the difference?  Explain it simply.');
  assert.ok(result.fragments.length >= 1);
  assert.equal(result.transformation_receipt.meaning_change_claimed, false);
  assert.equal(result.transformation_receipt.fragment_count, result.fragments.length);
  assert.equal(result.lineage.transformation_receipt_id, result.transformation_receipt.receipt_id);
});

test('cleaning never grants action authority', () => {
  const result = buildGovernedChatSignal({ message: 'Send the invoice to John.' });
  assert.equal(result.lineage.continuity_required, true);
  assert.equal(result.fragments[0].epistemic_status, 'OBSERVED');
  assert.equal(Object.hasOwn(result, 'authorization'), false);
});

test('missing message fails closed', () => {
  assert.throws(() => buildGovernedChatSignal({}), /MESSAGE_REQUIRED/);
});
