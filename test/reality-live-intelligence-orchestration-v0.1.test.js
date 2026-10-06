import test from 'node:test';
import assert from 'node:assert/strict';
import { runLiveIntelligenceOrchestration } from '../src/reality-live-intelligence-orchestration-v0.1.js';

function fakeFetch(url, options) {
  assert.equal(url, 'https://api.openai.com/v1/responses');
  const input = JSON.parse(options.body);
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({
      id: 'resp:test-live-orchestration',
      status: 'completed',
      output_text: 'Model interpretation: no external action is authorized.',
    }),
  });
}

test('ordinary cognition reaches the live orchestration boundary without action governance', async () => {
  const result = await runLiveIntelligenceOrchestration({
    message: 'Explain why evidence lineage matters.',
    apiKey: 'test-key',
    fetchImpl: fakeFetch,
  });

  assert.equal(result.mode, 'CONVERSATIONAL');
  assert.equal(result.governance, 'NO_ACTION_GOVERNANCE');
  assert.equal(result.intelligence.response_id, 'resp:test-live-orchestration');
  assert.equal(result.authority.granted, false);
  assert.equal(result.execution.status, 'NOT_EXECUTED');
  assert.equal(result.work, null);
  assert.ok(result.governed_signal.transformation_receipt.receipt_id);
});

test('consequential intelligence produces a governed work proposal but cannot authorize execution', async () => {
  const result = await runLiveIntelligenceOrchestration({
    message: 'Send an email to the customer confirming the appointment.',
    apiKey: 'test-key',
    fetchImpl: fakeFetch,
  });

  assert.equal(result.mode, 'ACTION_CANDIDATE');
  assert.equal(result.governance, 'PROPORTIONAL_ACTION_GOVERNANCE');
  assert.equal(result.authority.granted, false);
  assert.equal(result.intelligence.execution_authorized, false);
  assert.equal(result.work.preflight.execution_permitted, false);
  assert.equal(result.work.authorization_request.authorized, false);
  assert.equal(result.execution.status, 'NOT_EXECUTED');
  assert.equal(result.work.run.state, 'CAPTURED');
  assert.ok(result.governed_signal.packet.packet_id);
  assert.ok(result.governed_signal.transformation_receipt.receipt_id);
});

test('missing model credential fails closed before orchestration can produce a work result', async () => {
  await assert.rejects(
    () => runLiveIntelligenceOrchestration({
      message: 'What is operational verification?',
      apiKey: '',
      fetchImpl: fakeFetch,
    }),
    /OPENAI_API_KEY_REQUIRED/
  );
});
