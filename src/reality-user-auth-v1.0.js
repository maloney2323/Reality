const AUTH_TIMEOUT_MS = 5000;

function jsonSafeError(status, error, message) {
  return { authorized: false, status, error, message };
}

export async function verifyRealityAdmin(req) {
  const raw = req?.headers?.authorization || req?.headers?.Authorization || '';
  const match = /^Bearer\s+([^\s]+)$/i.exec(String(raw));
  if (!match) {
    return jsonSafeError(401, 'USER_AUTH_REQUIRED', 'Sign in with the authorized Reality administrator account.');
  }

  const supabaseUrl = String(process.env.SUPABASE_URL || process.env.REALITY_UNIVERSE_PERSISTENCE_URL || '').replace(/\/+$/, '');
  const apiKey = String(process.env.SUPABASE_PUBLISHABLE_KEY || '');
  const adminEmail = String(process.env.REALITY_ADMIN_EMAIL || '').trim().toLowerCase();
  if (!supabaseUrl || !apiKey || !adminEmail) {
    return jsonSafeError(503, 'USER_AUTH_NOT_CONFIGURED', 'Verified user authentication is not configured on this deployment.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
  try {
    const response = await fetch(supabaseUrl + '/auth/v1/user', {
      method: 'GET',
      headers: {
        apikey: apiKey,
        authorization: 'Bearer ' + match[1],
        accept: 'application/json',
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      return jsonSafeError(401, 'USER_TOKEN_INVALID', 'The sign-in session is invalid or expired.');
    }
    const user = await response.json();
    if (!user?.id || typeof user.email !== 'string' || user.email.trim().toLowerCase() !== adminEmail) {
      return jsonSafeError(403, 'ADMIN_ROLE_REQUIRED', 'This account is not authorized to change Reality configuration.');
    }
    return { authorized: true, user: { id: user.id, email: user.email.trim().toLowerCase() } };
  } catch {
    return jsonSafeError(503, 'USER_AUTH_PROVIDER_UNAVAILABLE', 'Identity verification is temporarily unavailable; no configuration change was made.');
  } finally {
    clearTimeout(timeout);
  }
}
