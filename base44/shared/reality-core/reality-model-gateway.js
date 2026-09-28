// Reality Model Gateway — the SOLE governed internal model boundary for Reality.
//
// Production architecture:
//   request -> Reality governance/context -> RealityModelGateway
//           -> Base44 managed InvokeLLM -> model response
//           -> Reality validation/post-processing -> response
//
// HARD RULES (non-negotiable):
// - Base44's managed InvokeLLM is the ONLY model transport. No direct OpenAI,
//   api.openai.com, OPENAI_API_KEY, Anthropic, Gemini HTTP, or any other
//   direct provider path is permitted from production Reality code.
// - There is NO provider fallback. If the managed service fails, the gateway
//   fails closed with a controlled MODEL_PROVIDER_UNAVAILABLE error. It never
//   switches providers, never uses an OpenAI key, and never executes a
//   consequential action because of a model-provider failure.
// - The model is an advisory/reasoning component. This gateway grants no
//   authority, creates no execution warrant, modifies no protected state,
//   and never bypasses Reality's consequence boundary. Model output is an
//   INPUT to Reality's deterministic governance, never direct execution:
//     MODEL -> PROPOSAL -> REALITY GOVERNANCE -> AUTHORITY -> EXECUTION
// - Provider/model metadata is preserved for lineage; the model is never
//   treated as authoritative merely because Base44 generated the response.

export const REALITY_MODEL_GATEWAY_VERSION = 'reality-model-gateway-v1.0';
export const REALITY_MODEL_GATEWAY_AUTHORITY = 'BASE44_MANAGED_LLM_ONLY';
export const DEFAULT_REALITY_MODEL = 'automatic';

const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_PROMPT_CHARS = 200_000;

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function gatewayError(message, { code = 'REALITY_MODEL_GATEWAY_ERROR', status = 503, cause } = {}) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  if (cause) error.cause = cause;
  return error;
}

function extractText(raw) {
  if (typeof raw === 'string') return raw.trim();
  if (raw && typeof raw === 'object') {
    if (typeof raw.output_text === 'string') return raw.output_text.trim();
    if (typeof raw.text === 'string') return raw.text.trim();
    const parts = [];
    for (const item of (raw.output || [])) {
      for (const content of (item?.content || [])) {
        if (typeof content?.text === 'string') parts.push(content.text);
        else if (typeof content?.value === 'string') parts.push(content.value);
      }
    }
    if (parts.length) return parts.join('\n').trim();
  }
  return '';
}

function normalizeManagedResult(raw, wantsJson) {
  if (wantsJson) {
    // Base44 managed InvokeLLM with response_json_schema returns a parsed dict.
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return { text: JSON.stringify(raw), parsed: raw };
    }
    const text = extractText(raw);
    if (!nonEmpty(text)) return null;
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw gatewayError('Managed LLM returned non-JSON where JSON was requested.', {
        code: 'REALITY_MODEL_JSON_PARSE_FAILED',
        status: 502,
      });
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw gatewayError('Managed LLM JSON result was not an object.', {
        code: 'REALITY_MODEL_JSON_NOT_OBJECT',
        status: 502,
      });
    }
    return { text, parsed };
  }
  const text = extractText(raw);
  if (!nonEmpty(text)) return null;
  return { text, parsed: null };
}

export function createRealityModelGateway(service, options = {}) {
  if (!service || typeof service !== 'object') {
    throw gatewayError('A Base44 service-role client is required.', {
      code: 'REALITY_MODEL_GATEWAY_NO_SERVICE',
      status: 500,
    });
  }
  const timeoutMs = Math.max(1_000, Number(options.timeoutMs) || DEFAULT_TIMEOUT_MS);
  const defaultModel = nonEmpty(options.model) ? options.model : DEFAULT_REALITY_MODEL;

  async function generate(payload = {}) {
    if (!nonEmpty(payload.prompt)) {
      throw gatewayError('Model prompt is required.', {
        code: 'REALITY_MODEL_PROMPT_REQUIRED',
        status: 400,
      });
    }
    const prompt = payload.prompt.length > MAX_PROMPT_CHARS
      ? payload.prompt.slice(0, MAX_PROMPT_CHARS)
      : payload.prompt;
    const model = nonEmpty(payload.model) ? payload.model : defaultModel;
    const wantsJson = payload.response_json_schema && typeof payload.response_json_schema === 'object';
    const invokeArgs = {
      prompt,
      model,
      ...(wantsJson ? { response_json_schema: payload.response_json_schema } : {}),
      ...(payload.add_context_from_internet === true ? { add_context_from_internet: true } : {}),
    };

    // Enforce a bounded request timeout. The underlying managed call may
    // outlive the race, but the gateway fails closed on timeout rather than
    // blocking the caller indefinitely or falling back to another provider.
    const timeoutError = gatewayError(
      `Managed LLM exceeded its ${Math.round(timeoutMs / 1000)} second bound.`,
      { code: 'REALITY_MODEL_TIMEOUT', status: 504 },
    );
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(timeoutError), timeoutMs));

    let raw;
    try {
      raw = await Promise.race([
        service.integrations.Core.InvokeLLM(invokeArgs),
        timeoutPromise,
      ]);
    } catch (error) {
      // Fail closed. No provider fallback. No OpenAI key. No silent switch.
      const code = error?.code === 'REALITY_MODEL_TIMEOUT' ? 'REALITY_MODEL_TIMEOUT' : 'MODEL_PROVIDER_UNAVAILABLE';
      throw gatewayError(error?.message || 'Base44 managed LLM invocation failed.', {
        code,
        status: Number(error?.status) || 503,
        cause: error,
      });
    }

    const normalized = normalizeManagedResult(raw, wantsJson);
    if (!normalized) {
      throw gatewayError('Managed LLM returned an empty response.', {
        code: 'MODEL_PROVIDER_UNAVAILABLE',
        status: 502,
      });
    }

    return Object.freeze({
      text: normalized.text,
      parsed: normalized.parsed,
      metadata: Object.freeze({
        gateway_version: REALITY_MODEL_GATEWAY_VERSION,
        authority: REALITY_MODEL_GATEWAY_AUTHORITY,
        provider: 'BASE44_MANAGED_INVOKE_LLM',
        model,
        fallback_used: false,
        direct_openai_used: false,
        timeout_ms: timeoutMs,
      }),
      raw,
    });
  }

  return Object.freeze({
    generate,
    version: REALITY_MODEL_GATEWAY_VERSION,
    authority: REALITY_MODEL_GATEWAY_AUTHORITY,
    provider: 'BASE44_MANAGED_INVOKE_LLM',
    model: defaultModel,
    fallback_enabled: false,
  });
}