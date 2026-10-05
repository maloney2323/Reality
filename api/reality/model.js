import { invokeOpenAiStructured, REALITY_OPENAI_MODEL } from '../../src/reality-direct-model-provider.js';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return json(res, 503, { error: 'OPENAI_API_KEY_NOT_CONFIGURED', verified: false });

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const queryPrompt = typeof req.query?.prompt === 'string' ? req.query.prompt.trim() : '';
  const prompt = req.method === 'GET'
    ? (queryPrompt || 'Return exactly JSON with answer set to MODEL_PATH_LIVE_OK.')
    : (typeof body.prompt === 'string' ? body.prompt.trim() : '');

  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('allow', 'GET, POST');
    return json(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  }
  if (!prompt) return json(res, 400, { error: 'PROMPT_REQUIRED', verified: false });

  try {
    const result = await invokeOpenAiStructured({
      apiKey,
      prompt,
      response_json_schema: body.response_json_schema || {
        type: 'object',
        properties: { answer: { type: 'string' } },
        required: ['answer'],
        additionalProperties: false,
      },
      schemaName: body.schemaName || 'reality_runtime_response',
      model: body.model || REALITY_OPENAI_MODEL,
      reasoningEffort: body.reasoningEffort || 'medium',
    });

    return json(res, 200, {
      runtime: 'reality',
      transport: 'direct_openai',
      model: body.model || REALITY_OPENAI_MODEL,
      response: result,
      governance: {
        authority_created: false,
        authority_widened: false,
        action_authorized: false,
        external_effects_permitted: false,
      },
      verified: true,
    });
  } catch (error) {
    return json(res, 502, {
      runtime: 'reality',
      transport: 'direct_openai',
      verified: false,
      error: error?.message || 'MODEL_REQUEST_FAILED',
    });
  }
}
