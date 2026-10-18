import { runRealityStewardshipPass } from '../../src/reality-stewardship-pass-v1.0.js';
import { validateCronAuthorization } from '../../src/reality-cron-governance-v1.0.js';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('allow', 'GET, POST');
    return json(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  }

  const authorization = validateCronAuthorization(req, process.env.CRON_SECRET);
  if (!authorization.authorized) {
    return json(res, authorization.status, { error: authorization.error, message: authorization.message });
  }

  try {
    const result = await runRealityStewardshipPass();
    return json(res, 200, result);
  } catch (error) {
    return json(res, 502, {
      status: 'BLOCKED',
      verified: false,
      error: error.message,
      governance: {
        discovery_automatic: true,
        authority_automatic: false,
        external_effects_permitted: false,
      },
    });
  }
}
