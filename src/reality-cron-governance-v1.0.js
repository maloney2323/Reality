export function validateCronAuthorization(req, configuredSecret) {
  const secret = String(configuredSecret ?? '');
  if (!secret.trim()) {
    return {
      authorized: false,
      status: 500,
      error: 'CRON_SECRET_UNCONFIGURED',
      message: 'Server cron authorization secret is not configured.',
    };
  }

  const headers = req?.headers || {};
  const authorization = typeof headers.get === 'function'
    ? headers.get('authorization') || ''
    : headers.authorization || headers.Authorization || '';

  if (authorization !== `Bearer ${secret}`) {
    return {
      authorized: false,
      status: 401,
      error: 'UNAUTHORIZED_CRON_EXECUTION',
      message: 'Invalid or missing Bearer authorization token.',
    };
  }

  return { authorized: true };
}
