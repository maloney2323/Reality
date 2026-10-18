import shiftHandler from './shift.js';
import { validateCronAuthorization } from '../../src/reality-cron-governance-v1.0.js';

function json(res, status, body) {
  if (typeof res.status === 'function' && typeof res.status(status).json === 'function') {
    return res.status(status).json(body);
  }
  res.statusCode = status;
  res.setHeader?.('content-type', 'application/json');
  return res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader?.('allow', 'GET');
    return json(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  }

  const authorization = validateCronAuthorization(req, process.env.CRON_SECRET);
  if (!authorization.authorized) {
    return json(res, authorization.status, {
      error: authorization.error,
      message: authorization.message,
    });
  }

  // Delegate only after the cron boundary has been validated. The underlying
  // shift handler retains its existing, tested execution logic.
  return shiftHandler(req, res);
}
