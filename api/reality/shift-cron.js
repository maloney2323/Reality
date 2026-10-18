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

  const url = new URL(req.url || '/', 'http://localhost');
  const dryRunRequested = req.query?.dryRun === 'true' || url.searchParams.get('dryRun') === 'true';
  if (dryRunRequested) {
    if (process.env.CRON_AUTH_DRY_RUN_ENABLED !== 'true') {
      return json(res, 403, { error: 'CRON_DRY_RUN_DISABLED' });
    }
    // This branch intentionally returns before shiftHandler, persistence, or
    // any connector can be invoked. It verifies authorization + dry-run routing,
    // not the real scheduled execution path.
    return json(res, 200, {
      status: 'AUTHORIZED_DRY_RUN_SUCCESS',
      authorizationGateVerified: true,
      executionPathVerified: false,
      connectorCalls: 0,
      stateMutations: 0,
      downstreamInvoked: false,
    });
  }

  // Delegate only after the cron boundary has been validated. The underlying
  // shift handler retains its existing, tested execution logic.
  return shiftHandler(req, res);
}
