import crypto from 'node:crypto';

export const SYSTEM_ACCESS_VERSION = 'reality-governed-system-access-v0.1';
export const SYSTEM_ACCESS_GOVERNANCE = Object.freeze({
  readIsNotAuthority: true,
  writeRequiresExplicitAuthorization: true,
  deploymentIsNotVerification: true,
  independentVerificationRequired: true,
  failClosedWhenCredentialMissing: true,
});

const GITHUB_API = 'https://api.github.com';
const VERCEL_API = 'https://api.vercel.com';

function required(value, code) {
  if (typeof value !== 'string' || value.length === 0) throw new Error(code);
  return value;
}

function jsonHeaders(token) {
  return {
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
  if (!response.ok) {
    const error = new Error(`EXTERNAL_REQUEST_FAILED:${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

function githubToken() {
  return process.env.GITHUB_TOKEN || process.env.REALITY_GITHUB_TOKEN || null;
}

function vercelToken() {
  return process.env.VERCEL_TOKEN || process.env.REALITY_VERCEL_TOKEN || null;
}

export function capabilitySnapshot() {
  return {
    version: SYSTEM_ACCESS_VERSION,
    github: {
      read: true,
      write: Boolean(githubToken()),
      scope: 'repository:maloney2323/Reality',
      authority: 'github-runtime-credential',
    },
    vercel: {
      read: Boolean(vercelToken()),
      write: Boolean(vercelToken()),
      scope: 'project:reality',
      authority: 'vercel-runtime-credential',
    },
    governance: SYSTEM_ACCESS_GOVERNANCE,
  };
}

export async function inspectGitHubRepository({
  owner = 'maloney2323',
  repo = 'Reality',
  ref = 'main',
} = {}) {
  required(owner, 'GITHUB_OWNER_REQUIRED');
  required(repo, 'GITHUB_REPO_REQUIRED');
  required(ref, 'GITHUB_REF_REQUIRED');

  const repository = await fetchJson(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    { headers: jsonHeaders(githubToken()) },
  );
  const commit = await fetchJson(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(ref)}`,
    { headers: jsonHeaders(githubToken()) },
  );
  const tree = await fetchJson(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(commit.sha)}?recursive=1`,
    { headers: jsonHeaders(githubToken()) },
  );

  return {
    provider: 'github',
    operation: 'inspect_repository',
    observed_at: new Date().toISOString(),
    repository: {
      full_name: repository.full_name,
      default_branch: repository.default_branch,
      visibility: repository.visibility,
      permissions: repository.permissions || null,
    },
    source: {
      ref,
      commit_sha: commit.sha,
      commit_message: commit.commit?.message || null,
    },
    tree: {
      sha: tree.sha,
      truncated: tree.truncated === true,
      paths: (tree.tree || []).map((item) => ({
        path: item.path,
        type: item.type,
        sha: item.sha,
      })),
    },
  };
}

export async function readGitHubFile({
  owner = 'maloney2323',
  repo = 'Reality',
  path,
  ref = 'main',
} = {}) {
  required(path, 'GITHUB_PATH_REQUIRED');
  const file = await fetchJson(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ref)}`,
    { headers: jsonHeaders(githubToken()) },
  );
  if (Array.isArray(file)) throw new Error('GITHUB_PATH_IS_DIRECTORY');
  const content = Buffer.from(file.content || '', 'base64').toString('utf8');
  return {
    provider: 'github',
    operation: 'read_file',
    observed_at: new Date().toISOString(),
    path,
    ref,
    sha: file.sha,
    content,
  };
}

export async function compareGitHubCommits({
  owner = 'maloney2323',
  repo = 'Reality',
  base,
  head,
} = {}) {
  required(base, 'GITHUB_BASE_REQUIRED');
  required(head, 'GITHUB_HEAD_REQUIRED');
  return {
    provider: 'github',
    operation: 'compare_commits',
    observed_at: new Date().toISOString(),
    ...(await fetchJson(
      `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`,
      { headers: jsonHeaders(githubToken()) },
    )),
  };
}

function authorizeWrite({ provider, action, authorization, expectedScope }) {
  const capability = capabilitySnapshot()[provider];
  if (!capability?.write) {
    return { allowed: false, reason: 'WRITE_CAPABILITY_NOT_CONFIGURED' };
  }
  if (authorization?.authorized !== true) {
    return { allowed: false, reason: 'EXPLICIT_AUTHORIZATION_REQUIRED' };
  }
  if (authorization.scope !== expectedScope) {
    return { allowed: false, reason: 'AUTHORITY_SCOPE_MISMATCH' };
  }
  if (authorization.provider !== provider || authorization.action !== action) {
    return { allowed: false, reason: 'AUTHORITY_ACTION_MISMATCH' };
  }
  return { allowed: true };
}

export async function createGitHubBranch({
  owner = 'maloney2323',
  repo = 'Reality',
  branch,
  baseSha,
  authorization,
} = {}) {
  required(branch, 'GITHUB_BRANCH_REQUIRED');
  required(baseSha, 'GITHUB_BASE_SHA_REQUIRED');
  const gate = authorizeWrite({
    provider: 'github',
    action: 'create_branch',
    authorization,
    expectedScope: `repository:${owner}/${repo}`,
  });
  if (!gate.allowed) return { status: 'BLOCKED', ...gate };

  const ref = await fetchJson(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs`,
    {
      method: 'POST',
      headers: { ...jsonHeaders(githubToken()), 'content-type': 'application/json' },
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
    },
  );
  return {
    status: 'EXECUTED',
    provider: 'github',
    operation: 'create_branch',
    branch,
    base_sha: baseSha,
    ref: ref.ref,
  };
}

export async function writeGitHubFile({
  owner = 'maloney2323',
  repo = 'Reality',
  path,
  content,
  message,
  branch = 'main',
  contentSha,
  authorization,
} = {}) {
  required(path, 'GITHUB_PATH_REQUIRED');
  required(content, 'GITHUB_CONTENT_REQUIRED');
  required(message, 'GITHUB_COMMIT_MESSAGE_REQUIRED');

  const gate = authorizeWrite({
    provider: 'github',
    action: 'write_file',
    authorization,
    expectedScope: `repository:${owner}/${repo}`,
  });
  if (!gate.allowed) return { status: 'BLOCKED', ...gate };

  const response = await fetchJson(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split('/').map(encodeURIComponent).join('/')}`,
    {
      method: 'PUT',
      headers: { ...jsonHeaders(githubToken()), 'content-type': 'application/json' },
      body: JSON.stringify({
        message,
        content: Buffer.from(content, 'utf8').toString('base64'),
        branch,
        ...(contentSha ? { sha: contentSha } : {}),
      }),
    },
  );

  return {
    status: 'EXECUTED',
    provider: 'github',
    operation: 'write_file',
    path,
    branch,
    commit_sha: response.commit?.sha || null,
    content_sha: response.content?.sha || null,
  };
}

export async function inspectVercelDeployment({
  deploymentId,
} = {}) {
  required(deploymentId, 'VERCEL_DEPLOYMENT_ID_REQUIRED');
  const token = vercelToken();
  if (!token) return { status: 'BLOCKED', reason: 'READ_CAPABILITY_NOT_CONFIGURED' };

  const deployment = await fetchJson(
    `${VERCEL_API}/v13/deployments/${encodeURIComponent(deploymentId)}`,
    { headers: { authorization: `Bearer ${token}` } },
  );

  return {
    provider: 'vercel',
    operation: 'inspect_deployment',
    observed_at: new Date().toISOString(),
    deployment,
  };
}

export function independentInspectionDigest(observation) {
  required(JSON.stringify(observation), 'OBSERVATION_REQUIRED');
  return `sha256:${crypto.createHash('sha256').update(JSON.stringify(observation)).digest('hex')}`;
}
