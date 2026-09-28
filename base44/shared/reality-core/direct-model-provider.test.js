import assert from 'node:assert/strict';
import {
  DIRECT_MODEL_PROVIDER_AUTHORITY,
  REALITY_GEMINI_MODEL,
  REALITY_OPENAI_CODING_MODEL,
  REALITY_OPENAI_MODEL,
  invokeGeminiJson,
  invokeOpenAiStructured,
} from './direct-model-provider.js';

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() { return typeof body === 'string' ? body : JSON.stringify(body); },
  };
}

test('direct provider is transport-only and uses explicit reasoning/coding model roles', () => {
  assert.equal(DIRECT_MODEL_PROVIDER_AUTHORITY, 'MODEL_TRANSPORT_ONLY');
  assert.equal(REALITY_OPENAI_MODEL, 'gpt-5.6-terra');
  assert.equal(REALITY_OPENAI_CODING_MODEL, 'gpt-5.6-sol');
  assert.equal(REALITY_GEMINI_MODEL, 'gemini-3.6-flash');
});

test('OpenAI transport returns only parsed structured result and keeps schema boundary', async () => {
  let request = null;
  const fetchImpl = async (_url, options) => {
    request = JSON.parse(options.body);
    assert.equal(options.headers.Authorization, 'Bearer test-openai-key');
    return response({
      output: [{ type: 'message', content: [{ type: 'output_text', text: '{"ok":true,"value":"bounded"}' }] }],
    });
  };
  const result = await invokeOpenAiStructured({
    apiKey: 'test-openai-key',
    prompt: 'Return bounded result',
    response_json_schema: { type: 'object', properties: { ok: { type: 'boolean' }, value: { type: 'string' } }, required: ['ok', 'value'] },
    fetchImpl,
  });
  assert.deepEqual(result, { ok: true, value: 'bounded' });
  assert.equal(request.store, false);
  assert.equal(request.text.format.type, 'json_schema');
  assert.equal(request.text.format.strict, false);
  assert.equal(JSON.stringify(result).includes('test-openai-key'), false);
});

test('OpenAI provider failure exposes status but not the API key', async () => {
  await assert.rejects(
    () => invokeOpenAiStructured({
      apiKey: 'secret-never-leak',
      prompt: 'x',
      response_json_schema: { type: 'object' },
      fetchImpl: async () => response({ error: { message: 'invalid request' } }, 401),
    }),
    (error) => /OPENAI_REQUEST_FAILED_401/.test(error.message) && !error.message.includes('secret-never-leak'),
  );
});

test('Gemini transport parses current steps response, supports Google Search tools, and keeps key out of result', async () => {
  let keyHeader = null;
  let request = null;
  const result = await invokeGeminiJson({
    apiKey: 'test-gemini-key',
    prompt: 'Return JSON',
    tools: [{ type: 'google_search' }],
    fetchImpl: async (_url, options) => {
      keyHeader = options.headers['x-goog-api-key'];
      request = JSON.parse(options.body);
      return response({ steps: [{ type: 'model_output', content: [{ type: 'text', text: '{"status":"COMPLETED"}' }] }] });
    },
  });
  assert.equal(keyHeader, 'test-gemini-key');
  assert.deepEqual(request.tools, [{ type: 'google_search' }]);
  assert.deepEqual(result, { status: 'COMPLETED' });
  assert.equal(JSON.stringify(result).includes('test-gemini-key'), false);
});

test('missing provider keys fail before a network call', async () => {
  let called = false;
  const fetchImpl = async () => { called = true; return response({}); };
  await assert.rejects(() => invokeOpenAiStructured({ apiKey: '', prompt: 'x', response_json_schema: { type: 'object' }, fetchImpl }), /OPENAI_API_KEY_NOT_CONFIGURED/);
  await assert.rejects(() => invokeGeminiJson({ apiKey: '', prompt: 'x', fetchImpl }), /GEMINI_API_KEY_NOT_CONFIGURED/);
  assert.equal(called, false);
});

let failed = 0;
for (const [name, fn] of tests) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}\n${error.stack}`);
  }
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
if (failed) process.exit(1);