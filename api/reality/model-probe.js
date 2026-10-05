import { invokeOpenAiStructured, REALITY_OPENAI_MODEL } from '../../src/reality-direct-model-provider.js';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return json(res, 503, { error: 'OPENAI_API_KEY_NOT_CONFIGURED', verified: false });
  try {
    const result = await invokeOpenAiStructured({
      apiKey,
      prompt: 'Return the exact word READY in the answer field. Do not add any other text.',
      response_json_schema: {
        type: 'object',
        properties: { answer: { type: 'string' } },
        required: ['answer'],
        additionalProperties: false,
      },
      schemaName: 'reality_runtime_probe',
      model: REALITY_OPENAI_MODEL,
      reasoningEffort: 'low',
    });
    return json(res, 200, {
      runtime: 'reality',
      probe: 'direct_openai',
      model: REALITY_OPENAI_MODEL,
      response: result,
      governance: { authority_created: false, authority_widened: false, action_authorized: false, external_effects_permitted: false },
      verified: true,
    });
  } catch (error) {
    return json(res, 502, {
      runtime: 'reality',
      probe: 'direct_openai',
      verified: false,
      error: error?.message || 'MODEL_REQUEST_FAILED',
    });
  }
}
