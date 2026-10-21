const BASE44_APP_ID = '6a7bd610756b32bc21c39ad0';
const BASE44_ME_URL = `https://base44.app/api/apps/${BASE44_APP_ID}/entities/User/me`;

export async function verifyBase44Principal(req, { fetchImpl = fetch } = {}) {
  const authorization = req.headers?.authorization;
  if (typeof authorization !== 'string' || !/^Bearer [^\s]+$/.test(authorization)) {
    const error = new Error('AUTHENTICATION_REQUIRED');
    error.status = 401;
    throw error;
  }
  let response;
  try {
    response = await fetchImpl(BASE44_ME_URL, {
      method: 'GET',
      headers: { Authorization: authorization, 'X-App-Id': BASE44_APP_ID, Accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    const error = new Error('IDENTITY_PROVIDER_UNAVAILABLE');
    error.status = 503;
    throw error;
  }
  if (!response.ok) {
    const error = new Error(response.status === 401 || response.status === 403 ? 'INVALID_SESSION' : 'IDENTITY_VERIFICATION_FAILED');
    error.status = response.status === 401 || response.status === 403 ? 401 : 503;
    throw error;
  }
  let data;
  try { data = await response.json(); } catch { data = null; }
  const user = data?.data?.id ? data.data : data;
  if (typeof user?.id !== 'string' || !user.id.trim()) {
    const error = new Error('IDENTITY_VERIFICATION_FAILED');
    error.status = 503;
    throw error;
  }
  return Object.freeze({ principal_id: `base44:${user.id}` });
}
