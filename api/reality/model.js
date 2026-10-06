import { buildGovernedChatSignal } from '../../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import { invokeRealityModel } from '../../src/reality-model-gateway-v0.1.js';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST');
    return json(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {};

  try {
    const governedSignal = buildGovernedChatSignal({ message: body.message });
    const result = await invokeRealityModel({
      governedSignal,
      systemContext: body.systemContext || null,
      model: body.model || undefined,
    });

    return json(res, 200, {
      ok: true,
      result,
    });
  } catch (error) {
    return json(res, error.status || 400, {
      ok: false,
      error: error.message,
      verified: false,
    });
  }
}
