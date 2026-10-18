function logCronAuthorizationRejection(req, status, error) {
  // This guard is called before any protected handler's downstream work.
  // Keep this record free of request headers and secret material.
  const endpoint = String(req?.url || req?.originalUrl || 'unknown').split('?')[0];
  console.warn(JSON.stringify({
    event: 'CRON_AUTHORIZATION_REJECTED',
    endpoint,
    status,
    error,
    connectorCalls: 0,
    stateMutations: 0,
    downstreamInvoked: false,
    timestamp: new Date().toISOString(),
  }));
}

export function validateCronAuthorization(req, configuredSecret) {
  const secret = String(configuredSecret ?? '');
  if (!secret.trim()) {
    const result = {
      authorized: false,
      status: 500,
      error: 'CRON_SECRET_UNCONFIGURED',
      message: 'Server cron authorization secret is not configured.',
    };
    logCronAuthorizationRejection(req, result.status, result.error);
    return result;
  }

  const headers = req?.headers || {};
  const authorization = typeof headers.get === 'function'
    ? headers.get('authorization') || ''
    : headers.authorization || headers.Authorization || '';

  if (authorization !== `Bearer ${secret}`) {
    const result = {
      authorized: false,
      status: 401,
      error: 'UNAUTHORIZED_CRON_EXECUTION',
      message: 'Invalid or missing Bearer authorization token.',
    };
    logCronAuthorizationRejection(req, result.status, result.error);
    return result;
  }

  return { authorized: true };
}
