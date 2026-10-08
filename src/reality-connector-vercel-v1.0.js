/**
 * Reality-owned Vercel connector.
 * Uses REALITY_VERCEL_TOKEN only. Never imports ChatGPT/plugin state.
 */
const API = "https://api.vercel.com";

function headers() {
  const token = process.env.REALITY_VERCEL_TOKEN;
  if (!token) throw new Error("CONNECTOR_CREDENTIAL_MISSING:vercel");
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json"
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const error = new Error(`VERCEL_CONNECTOR_${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

export async function vercelGet(path) { return request(path); }

export async function vercelWrite(path, method, body) {
  if (![ "POST", "PATCH", "PUT", "DELETE" ].includes(method)) throw new Error("VERCEL_CONNECTOR_INVALID_METHOD");
  return request(path, { method, body: JSON.stringify(body) });
}

export async function verifyVercelConnection() {
  const team = process.env.REALITY_VERCEL_TEAM_ID;
  const suffix = team ? `?teamId=${encodeURIComponent(team)}` : "";
  const result = await vercelGet(`/v2/user${suffix}`);
  return { provider: "vercel", status: "CONNECTED", authenticated: Boolean(result?.user || result?.id), user: result?.user?.username || null };
}
