import assert from 'node:assert/strict';
import test from 'node:test';
import { buildGovernedChatSignal } from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';

test('ordinary questions produce governed signal without a generation gate', () => {
  const signal = buildGovernedChatSignal({ message: 'What is the capital of France?' });
  assert.equal(signal.fragments[0].cleaned_text, 'What is the capital of France?');
  assert.equal(signal.transformation_receipt.meaning_change_claimed, false);
  assert.equal(Object.hasOwn(signal, 'generation_gate'), false);
  assert.equal(Object.hasOwn(signal, 'authorization'), false);
});

test('action language is preserved as signal and does not become authorization', () => {
  const signal = buildGovernedChatSignal({ message: 'Send the invoice to the customer.' });
  assert.equal(signal.fragments[0].cleaned_text, 'Send the invoice to the customer.');
  assert.equal(Object.hasOwn(signal, 'authorization'), false);
});
