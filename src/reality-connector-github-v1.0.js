/**
 * Reality-owned GitHub connector.
 * Uses REALITY_GITHUB_TOKEN only. Never imports ChatGPT/plugin state.
 */
const API = "https://api.github.com";

function headers() {
  const token = process.env.REALITY_GITHUB_TOKEN;
  if (!token) throw new Error("CONNECTOR_CREDENTIAL_MISSING:github");
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) }
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const error = new Error(`GITHUB_CONNECTOR_${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

export async function githubGet(path) {
  return request(path);
}

export async function githubWrite(path, method, body) {
  if (![ "POST", "PATCH", "PUT", "DELETE" ].includes(method)) throw new Error("GITHUB_CONNECTOR_INVALID_METHOD");
  return request(path, { method, body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
}

export async function verifyGitHubConnection() {
  const profile = await githubGet("/user");
  return {
    provider: "github",
    status: "CONNECTED",
    authenticated_as: profile?.login || null,
    can_read: true
  };
}
