// Direct model-provider transport for Reality backend functions.
//
// This module is transport only. It does not establish truth, evidence,
// authorization, implementation safety, or action authority. Callers remain
// responsible for applying Reality's existing contracts and gates to every
// provider result.

export const REALITY_OPENAI_MODEL = 'gpt-5.6-terra';
export const REALITY_OPENAI_CODING_MODEL = 'gpt-5.6-sol';
export const REALITY_GEMINI_MODEL = 'gemini-3.8-flash';
export const REALITY_OPENAI_ENDPOINT = 'https://api.openai.com/v1/responses';
export const REALITY_GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';
export const DIRECT_MODEL_PROVIDER_AUTHORITY = 'MODEL_TRANSPORT_ONLY';

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseJsonObject(text, label) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${label}_INVALID_JSON`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label}_NOT_OBJECT`);
  }
  return parsed;
}

function openAiOutputText(response) {
  const output = Array.isArray(response?.output) ? response.output : [];
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    if (item.type && item.type !== 'message') continue;
    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (part && typeof part === 'object' && typeof part.text === 'string' && (!part.type || part.type === 'output_text')) {
        return part.text;
      }
    }
  }
  return typeof response?.output_text === 'string' ? response.output_text : null;
}

function geminiOutputText(interaction) {
  const outputs = Array.isArray(interaction?.outputs) ? interaction.outputs : [];
  for (const item of outputs) {
    if (item && typeof item === 'object' && item.type === 'text' && typeof item.text === 'string') return item.text;
  }
  const steps = Array.isArray(interaction?.steps) ? interaction.steps : [];
  const modelOutputs = steps.filter((step) => step && typeof step === 'object' && step.type === 'model_output');
  for (let index = modelOutputs.length - 1; index >= 0; index -= 1) {
    const content = Array.isArray(modelOutputs[index].content) ? modelOutputs[index].content : [];
    const text = content
      .filter((part) => part && typeof part === 'object' && part.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text)
      .join('');
    if (text) return text;
  }
  if (typeof interaction?.text === 'string') return interaction.text;
  if (typeof interaction?.output_text === 'string') return interaction.output_text;
  return null;
}

function safeProviderFailure(provider, status, raw) {
  const snippet = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').slice(0, 240) : '';
  const suffix = snippet ? `:${snippet}` : '';
  const error = new Error(`${provider}_REQUEST_FAILED_${status}${suffix}`);
  error.code = `${provider}_HTTP_${status}`;
  error.status = status;
  error.provider = provider;
  return error;
}

async function readUpstreamText(upstream) {
  if (typeof upstream?.text === 'function') return upstream.text();
  if (typeof upstream?.json === 'function') {
    const value = await upstream.json();
    return typeof value === 'string' ? value : JSON.stringify(value);
  }
  if (typeof upstream?.body === 'string') return upstream.body;
  throw new Error('MODEL_UPSTREAM_BODY_UNREADABLE');
}

export async function invokeOpenAIResponses({
  apiKey,
  prompt,
  response_json_schema,
  model = REALITY_OPENAI_MODEL,
  webModel = model,
  add_context_from_internet = false,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!nonEmpty(apiKey)) throw new Error('OPENAI_API_KEY_NOT_CONFIGURED');
  if (!nonEmpty(prompt)) throw new Error('OPENAI_PROMPT_REQUIRED');
  if (typeof fetchImpl !== 'function') throw new Error('OPENAI_FETCH_UNAVAILABLE');

  const requestBody = {
    model: add_context_from_internet ? webModel : model,
    input: prompt,
    store: false,
  };
  if (add_context_from_internet) requestBody.tools = [{ type: 'web_search' }];
  if (response_json_schema && typeof response_json_schema === 'object') {
    requestBody.text = {
      format: {
        type: 'json_schema',
        name: 'reality_structured_output',
        schema: response_json_schema,
        strict: false,
      },
    };
  }

  const upstream = await fetchImpl(REALITY_OPENAI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(requestBody),
  });
  const raw = await readUpstreamText(upstream);
  if (!upstream.ok) throw safeProviderFailure('OPENAI', upstream.status, raw);
  const envelope = parseJsonObject(raw, 'OPENAI_ENVELOPE');
  const text = openAiOutputText(envelope);
  if (!nonEmpty(text)) throw new Error('OPENAI_OUTPUT_TEXT_MISSING');
  if (response_json_schema && typeof response_json_schema === 'object') return parseJsonObject(text, 'OPENAI_RESULT');
  return text.trim();
}

export async function invokeOpenAiStructured({
  apiKey,
  prompt,
  response_json_schema,
  schemaName = 'reality_structured_result',
  model = REALITY_OPENAI_MODEL,
  reasoningEffort = 'medium',
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!nonEmpty(apiKey)) throw new Error('OPENAI_API_KEY_NOT_CONFIGURED');
  if (!nonEmpty(prompt)) throw new Error('OPENAI_PROMPT_REQUIRED');
  if (!response_json_schema || typeof response_json_schema !== 'object' || Array.isArray(response_json_schema)) {
    throw new Error('OPENAI_RESPONSE_SCHEMA_REQUIRED');
  }
  if (typeof fetchImpl !== 'function') throw new Error('OPENAI_FETCH_UNAVAILABLE');

  const upstream = await fetchImpl(REALITY_OPENAI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      store: false,
      reasoning: { effort: reasoningEffort },
      input: [
        {
          role: 'developer',
          content: 'Return only the requested structured object. Do not expose chain-of-thought or claim authority beyond the caller contract.',
        },
        { role: 'user', content: prompt },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: schemaName,
          strict: false,
          schema: response_json_schema,
        },
      },
    }),
  });

  const raw = await readUpstreamText(upstream);
  if (!upstream.ok) throw safeProviderFailure('OPENAI', upstream.status, raw);
  const envelope = parseJsonObject(raw, 'OPENAI_ENVELOPE');
  const text = openAiOutputText(envelope);
  if (!nonEmpty(text)) throw new Error('OPENAI_OUTPUT_TEXT_MISSING');
  return parseJsonObject(text, 'OPENAI_RESULT');
}

export async function invokeGeminiText({
  apiKey,
  prompt,
  model = REALITY_GEMINI_MODEL,
  thinkingLevel = 'high',
  systemInstruction,
  tools = [],
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!nonEmpty(apiKey)) throw new Error('GEMINI_API_KEY_NOT_CONFIGURED');
  if (!nonEmpty(prompt)) throw new Error('GEMINI_PROMPT_REQUIRED');
  if (typeof fetchImpl !== 'function') throw new Error('GEMINI_FETCH_UNAVAILABLE');

  const upstream = await fetchImpl(REALITY_GEMINI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      model,
      input: prompt,
      ...(nonEmpty(systemInstruction) ? { system_instruction: systemInstruction } : {}),
      generation_config: { thinking_level: thinkingLevel },
      ...(Array.isArray(tools) && tools.length ? { tools } : {}),
    }),
  });

  const raw = await readUpstreamText(upstream);
  if (!upstream.ok) throw safeProviderFailure('GEMINI', upstream.status, raw);
  const envelope = parseJsonObject(raw, 'GEMINI_ENVELOPE');
  const text = geminiOutputText(envelope);
  if (!nonEmpty(text)) throw new Error('GEMINI_OUTPUT_TEXT_MISSING');
  return text.trim();
}

export async function invokeGeminiJson({
  apiKey,
  prompt,
  model = REALITY_GEMINI_MODEL,
  thinkingLevel = 'high',
  tools = [],
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!nonEmpty(apiKey)) throw new Error('GEMINI_API_KEY_NOT_CONFIGURED');
  if (!nonEmpty(prompt)) throw new Error('GEMINI_PROMPT_REQUIRED');
  if (typeof fetchImpl !== 'function') throw new Error('GEMINI_FETCH_UNAVAILABLE');

  const upstream = await fetchImpl(REALITY_GEMINI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      model,
      input: prompt,
      generation_config: { thinking_level: thinkingLevel },
      response_format: { type: 'text', mime_type: 'application/json' },
      ...(Array.isArray(tools) && tools.length ? { tools } : {}),
    }),
  });

  const raw = await readUpstreamText(upstream);
  if (!upstream.ok) throw safeProviderFailure('GEMINI', upstream.status, raw);
  const envelope = parseJsonObject(raw, 'GEMINI_ENVELOPE');
  const text = geminiOutputText(envelope);
  if (!nonEmpty(text)) throw new Error('GEMINI_OUTPUT_TEXT_MISSING');
  return parseJsonObject(text, 'GEMINI_RESULT');
}