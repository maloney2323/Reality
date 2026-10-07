export const REALITY_MODEL_GATEWAY_VERSION = 'reality-model-gateway-v0.1';
export const MODEL_TRANSPORT_AUTHORITY = 'OPENAI_RESPONSES_ONLY';

const DEFAULT_MODEL = process.env.REALITY_OPENAI_MODEL || 'gpt-6-luna';

function requireField(value, code) {
  if (value == null || value === '') throw new Error(code);
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function extractOutputText(response) {
  if (typeof response?.output_text === 'string') return response.output_text;
  return (response?.output || [])
    .flatMap((item) => item?.content || [])
    .filter((item) => item?.type === 'output_text' && typeof item?.text === 'string')
    .map((item) => item.text)
    .join('');
}

function materialityForFragments(fragments = []) {
  const text = fragments.map((f) => f.cleaned_text || '').join('\n').toLowerCase();
  const consequential = /\b(send|email|reply|publish|post|delete|buy|purchase|schedule|cancel|transfer|pay|write|update|change|deploy|merge)\b/.test(text);
  return {
    mode: consequential ? 'ACTION_CANDIDATE' : 'CONVERSATIONAL',
    consequential,
    governance: consequential ? 'PROPORTIONAL_ACTION_GOVERNANCE' : 'NO_ACTION_GOVERNANCE',
  };
}

export function buildModelInput({ governedSignal, systemContext = null } = {}) {
  requireField(governedSignal?.cleaner_version, 'GOVERNED_SIGNAL_REQUIRED');
  requireField(governedSignal?.packet?.packet_id, 'SIGNAL_PACKET_REQUIRED');
  requireField(governedSignal?.transformation_receipt?.receipt_id, 'TRANSFORMATION_RECEIPT_REQUIRED');

  const fragments = clone(governedSignal.fragments || []);
  const materiality = materialityForFragments(fragments);

  return {
    gateway_version: REALITY_MODEL_GATEWAY_VERSION,
    transport_authority: MODEL_TRANSPORT_AUTHORITY,
    governed_signal: {
      packet_id: governedSignal.packet.packet_id,
      raw_content_digest: governedSignal.packet.raw_content_digest,
      fragments,
      transformation_receipt: clone(governedSignal.transformation_receipt),
      lineage: clone(governedSignal.lineage),
    },
    materiality,
    system_context: systemContext,
    authority: {
      granted: false,
      execution_authorized: false,
      principle: 'INTELLIGENCE_MAY_INTERPRET; AUTHORITY_REMAINS_SEPARATE',
    },
  };
}

export async function invokeRealityModel({ governedSignal, systemContext = null, model = DEFAULT_MODEL, apiKey = process.env.OPENAI_API_KEY, fetchImpl = fetch } = {}) {
  requireField(apiKey, 'OPENAI_API_KEY_REQUIRED');
  const input = buildModelInput({ governedSignal, systemContext });

  const response = await fetchImpl('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'system',
          content: [{
            type: 'input_text',
            text: 'You are Reality intelligence. Interpret the governed signal accurately. Do not treat user intent as authorization. Do not claim external actions occurred. Separate observations, inferences, uncertainty, recommendations, and proposed consequential actions. Governance is proportional to consequence: ordinary cognition remains unobstructed; consequential effects require separate authority and verification.',
          }],
        },
        {
          role: 'user',
          content: [{
            type: 'input_text',
            text: JSON.stringify(input),
          }],
        },
      ],
    }),
  });

  const body = await response.json();
  if (!response.ok) {
    const error = new Error(body?.error?.message || 'OPENAI_RESPONSES_REQUEST_FAILED');
    error.status = response.status;
    error.provider_error = body?.error?.code || null;
    throw error;
  }

  return {
    gateway_version: REALITY_MODEL_GATEWAY_VERSION,
    transport_authority: MODEL_TRANSPORT_AUTHORITY,
    model,
    response_id: body.id || null,
    answer: extractOutputText(body),
    materiality: input.materiality,
    signal_lineage: input.governed_signal.lineage,
    transformation_receipt_id: input.governed_signal.transformation_receipt.receipt_id,
    authority_granted: false,
    execution_authorized: false,
    provider_status: body.status || null,
  };
}
