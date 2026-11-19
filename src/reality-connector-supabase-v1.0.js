/**
 * Reality-owned Supabase connector.
 * Uses the existing Reality Universe persistence credentials.
 */
function baseUrl() {
  const value = process.env.SUPABASE_URL;
  if (!value) throw new Error("CONNECTOR_CREDENTIAL_MISSING:supabase_url");
  return value.replace(/\/$/, "");
}

function headers() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("CONNECTOR_CREDENTIAL_MISSING:supabase");
  return { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" };
}

export async function supabaseGet(path) {
  const response = await fetch(`${baseUrl()}/rest/v1/${path}`, { headers: headers() });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const error = new Error(`SUPABASE_CONNECTOR_${response.status}`);
    error.status = response.status; error.body = body; throw error;
  }
  return body;
}

export async function supabaseWrite(path, method, body) {
  const response = await fetch(`${baseUrl()}/rest/v1/${path}`, {
    method,
    headers: { ...headers(), "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let result = null;
  try { result = text ? JSON.parse(text) : null; } catch { result = text; }
  if (!response.ok) {
    const error = new Error(`SUPABASE_CONNECTOR_${response.status}`);
    error.status = response.status; error.body = result; throw error;
  }
  return result;
}
