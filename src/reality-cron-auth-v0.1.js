export function isAuthorizedCronRequest(req, configuredSecret) {
  const secret = String(configuredSecret || '').trim();
  if (!secret) return false;
  const authorization = String(req?.headers?.authorization || '');
  return authorization === `Bearer ${secret}`;
}
