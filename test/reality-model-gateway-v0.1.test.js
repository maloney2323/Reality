import assert from 'node:assert/strict';
import test from 'node:test';
import { buildModelInput, invokeRealityModel } from '../src/reality-model-gateway-v0.1.js';
import { buildGovernedChatSignal } from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';

const observedAt='2026-10-22T10:00:00Z';
const signal=buildGovernedChatSignal({message:'What is Reality?',observedAt});

test('model input preserves signal lineage and does not grant authority', () => {
  const input = buildModelInput({ governedSignal: signal });
  assert.equal(input.governed_signal.packet_id, signal.packet.packet_id);
  assert.equal(input.governed_signal.transformation_receipt.receipt_id,signal.transformation_receipt.receipt_id);
  assert.equal(input.authority.granted, false);
  assert.equal(input.authority.execution_authorized, false);
  assert.equal(input.materiality.mode, 'CONVERSATIONAL');
});

test('consequential language is classified without blocking intelligence', () => {
  const input = buildModelInput({
    governedSignal:buildGovernedChatSignal({
      message:'Send the email to the customer.',observedAt,
    }),
  });
  assert.equal(input.materiality.mode, 'ACTION_CANDIDATE');
  assert.equal(input.materiality.governance, 'PROPORTIONAL_ACTION_GOVERNANCE');
  assert.equal(input.authority.granted, false);
});

test('missing API key fails closed', async () => {
  await assert.rejects(
    () => invokeRealityModel({ governedSignal: signal, apiKey: '' }),
    /OPENAI_API_KEY_REQUIRED/,
  );
});

test('provider request preserves the governed signal and uses Responses API', async () => {
  let captured = null;
  const fakeFetch = async (url, options) => {
    captured = { url, options };
    return {
      ok: true,
      async json() {
        return {
          id: 'resp_test',
          status: 'completed',
          output_text: 'Test answer',
        };
      },
    };
  };

  const result = await invokeRealityModel({
    governedSignal: signal,
    apiKey: 'test-key',
    model: 'test-model',
    fetchImpl: fakeFetch,
  });

  assert.equal(captured.url, 'https://api.openai.com/v1/responses');
  const payload = JSON.parse(captured.options.body);
  assert.equal(payload.model, 'test-model');
  assert.equal(payload.input[1].role, 'user');
  assert.ok(payload.input[1].content[0].text.includes(signal.packet.packet_id));
  assert.equal(result.answer, 'Test answer');
  assert.equal(result.transformation_receipt_id,signal.transformation_receipt.receipt_id);
  assert.equal(result.authority_granted, false);
  assert.equal(result.execution_authorized, false);
});
