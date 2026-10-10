import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createRawSignalPacket,
  cleanFragmentedSignal,
  buildGovernedChatSignal,
  verifyGovernedSignal,
} from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';

test('preserves raw signal and creates deterministic packet identity', () => {
  const a = createRawSignalPacket({ message: 'Hello  world', observedAt: '2026-10-05T00:00:00.000Z' });
  const b = createRawSignalPacket({ message: 'Hello  world', observedAt: '2026-10-05T00:00:00.000Z' });
  assert.equal(a.packet_id, b.packet_id);
  assert.equal(a.raw_content, 'Hello  world');
  assert.match(a.raw_content_digest, /^sha256:/);
});

test('fragments without silently changing meaning and preserves a verifiable transformation receipt', () => {
  const result = buildGovernedChatSignal({
    message: 'What is the difference?  Explain it simply.',
    observedAt: '2026-10-05T00:00:00.000Z',
  });
  assert.equal(result.packet.raw_content, 'What is the difference?  Explain it simply.');
  assert.ok(result.fragments.length >= 1);
  assert.equal(result.transformation_receipt.meaning_change_claimed, false);
  assert.equal(result.transformation_receipt.fragment_count, result.fragments.length);
  assert.equal(result.lineage.transformation_receipt_id, result.transformation_receipt.receipt_id);
  assert.deepEqual(verifyGovernedSignal(result), { valid: true, reasons: [] });
});

test('cleaning never grants action authority', () => {
  const result = buildGovernedChatSignal({ message: 'Send the invoice to John.' });
  assert.equal(result.lineage.continuity_required, true);
  assert.equal(result.fragments[0].epistemic_status, 'OBSERVED');
  assert.equal(Object.hasOwn(result, 'authorization'), false);
  assert.equal(verifyGovernedSignal(result).valid, true);
});

test('rejects raw-content tampering even if the packet digest is left unchanged', () => {
  const signal = structuredClone(buildGovernedChatSignal({ message: 'Original content.' }));
  signal.packet.raw_content = 'Changed content.';
  assert.ok(verifyGovernedSignal(signal).reasons.includes('RAW_CONTENT_DIGEST_MISMATCH'));
  assert.ok(verifyGovernedSignal(signal).reasons.includes('PACKET_ID_MISMATCH'));
});

test('rejects fragment tampering', () => {
  const signal = structuredClone(buildGovernedChatSignal({ message: 'Keep this sentence.' }));
  signal.fragments[0].cleaned_text = 'Altered sentence.';
  const result = verifyGovernedSignal(signal);
  assert.equal(result.valid, false);
  assert.ok(result.reasons.includes('FRAGMENT_CLEANED_DIGEST_MISMATCH:0'));
  assert.ok(result.reasons.includes('RECEIPT_ID_MISMATCH'));
});

test('rejects receipt tampering and missing receipt', () => {
  const altered = structuredClone(buildGovernedChatSignal({ message: 'A verified receipt.' }));
  altered.transformation_receipt.output_digest = 'sha256:forged';
  assert.ok(verifyGovernedSignal(altered).reasons.includes('RECEIPT_OUTPUT_DIGEST_MISMATCH'));

  const missing = structuredClone(buildGovernedChatSignal({ message: 'A receipt is required.' }));
  delete missing.transformation_receipt;
  assert.ok(verifyGovernedSignal(missing).reasons.includes('TRANSFORMATION_RECEIPT_MISSING'));
  assert.ok(verifyGovernedSignal(missing).reasons.includes('LINEAGE_RECEIPT_MISMATCH'));
});

test('rejects receipt-to-fragment map drift and broken continuity linkage', () => {
  const signal = structuredClone(buildGovernedChatSignal({ message: 'Map must match.' }));
  signal.transformation_receipt.transformations[0].output_digest = 'sha256:wrong';
  signal.lineage.continuity_required = false;
  const result = verifyGovernedSignal(signal);
  assert.ok(result.reasons.includes('RECEIPT_TRANSFORMATION_MAP_MISMATCH'));
  assert.ok(result.reasons.includes('CONTINUITY_REQUIREMENT_MISSING'));
});

test('missing message fails closed', () => {
  assert.throws(() => buildGovernedChatSignal({}), /MESSAGE_REQUIRED/);
  assert.throws(() => buildGovernedChatSignal({ message: '   ' }), /MESSAGE_REQUIRED/);
});
