/**
 * Preview-only connectivity probe for Reality's existing OpenAI credential.
 * Does not accept user prompts, write application data, or return secret values.
 * Vercel deployment protection must remain enabled for Preview deployments.
 */
export default async function handler(req, res) {
  if (process.env.VERCEL_ENV !== 'preview') {
    return res.status(404).json({ ok: false, error: 'PREVIEW_ONLY' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (typeof apiKey !== 'string' || !apiKey.trim()) {
    return res.status(503).json({
      ok: false,
      stage: 'runtime_secret_lookup',
      error: 'OPENAI_API_KEY_NOT_AVAILABLE_IN_PREVIEW',
    });
  }

  let upstream;
  try {
    upstream = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: 'Reply with exactly: REALITY_OPENAI_CONNECTIVITY_OK',
        max_output_tokens: 24,
        store: false,
      }),
    });
  } catch {
    return res.status(502).json({
      ok: false,
      stage: 'network_request',
      error: 'OPENAI_NETWORK_REQUEST_FAILED',
    });
  }

  const payload = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    // Never return the key or raw provider payload.
    const providerCode = typeof payload?.error?.code === 'string'
      ? payload.error.code
      : null;
    const providerType = typeof payload?.error?.type === 'string'
      ? payload.error.type
      : null;
    return res.status(502).json({
      ok: false,
      stage: 'openai_auth_or_request',
      upstream_status: upstream.status,
      provider_code: providerCode,
      provider_type: providerType,
      error: upstream.status === 401
        ? 'OPENAI_REJECTED_CREDENTIAL'
        : upstream.status === 429
          ? 'OPENAI_RATE_OR_QUOTA_LIMIT'
          : 'OPENAI_REQUEST_REJECTED',
    });
  }

  const outputText = Array.isArray(payload?.output)
    ? payload.output.flatMap(item => Array.isArray(item?.content) ? item.content : [])
        .filter(item => item?.type === 'output_text')
        .map(item => item.text || '')
        .join('')
    : '';

  return res.status(200).json({
    ok: outputText.trim() === 'REALITY_OPENAI_CONNECTIVITY_OK',
    stage: 'complete',
    provider: 'openai',
    model: payload?.model || 'gpt-4.1-mini',
    response_id: payload?.id || null,
    output_matches_probe: outputText.trim() === 'REALITY_OPENAI_CONNECTIVITY_OK',
  });
}
