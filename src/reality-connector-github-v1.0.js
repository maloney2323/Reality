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

// Diagnostics use ONLY an allowlisted classification of GitHub's error.
// No raw HTTP error message, token, rate-limit identity or header is exposed.
export function classifyGitHub403(body,headers=null){
 const message=typeof body?.message==='string'?body.message.toLowerCase().slice(0,640):'';
 const sso=headers&&typeof headers.get==='function'?
  String(headers.get('x-github-sso')||'').toLowerCase():'';
 if(sso.startsWith('required')||/saml|single sign.on|sso authorization/.test(message))
  return 'SSO_AUTHORIZATION_REQUIRED';
 if(/secondary rate limit|abuse detection|abuse rate limit/.test(message))
  return 'SECONDARY_RATE_LIMIT';
 if(/rate limit exceeded|api rate limit/.test(message))
  return 'PRIMARY_RATE_LIMIT';
 if(/resource not accessible by personal access token|resource not accessible by integration|integration.*not.*accessible/.test(message))
  return 'TOKEN_REPOSITORY_OR_ISSUES_SCOPE_DENIED';
 if(/ip address|ip allow list|ip allowlist|network restriction/.test(message))
  return 'NETWORK_ACCESS_POLICY';
 if(/repository is archived|repository.*archived|issues are disabled/.test(message))
  return 'REPOSITORY_WRITE_UNAVAILABLE';
 if(/personal access token.*not permitted|personal access token.*restricted|permission.*denied|operation is not permitted|access denied/.test(message))
  return 'GITHUB_WRITE_POLICY_RESTRICTED';
 return 'FORBIDDEN_REASON_NOT_DISCLOSED';
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
    // Sanitized, bounded for downstream immutable receipts; never propagate
    // an arbitrary provider message or headers to client-facing code.
    error.safeGitHubDenial = response.status===403?
      classifyGitHub403(body,response.headers):null;
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
