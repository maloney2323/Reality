const PROVIDERS = Object.freeze({
  github: {
    name: 'GitHub',
    read: Boolean(process.env.GITHUB_TOKEN),
    write: Boolean(process.env.GITHUB_TOKEN),
    scope: 'repository',
  },
  vercel: {
    name: 'Vercel',
    read: Boolean(process.env.VERCEL_TOKEN),
    write: Boolean(process.env.VERCEL_TOKEN),
    scope: 'project',
  },
});

const ACTIONS = new Set([
  'read_capabilities',
  'read_repository',
  'create_repository_file',
  'update_repository_file',
  'create_pull_request',
  'read_project',
  'read_deployment',
  'trigger_deployment',
]);

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

function capabilitySnapshot() {
  return {
    service: 'reality-world-access',
    version: '0.2.0',
    providers: Object.fromEntries(
      Object.entries(PROVIDERS).map(([id, p]) => [
        id,
        { name: p.name, read: p.read, write: p.write, scope: p.scope },
      ]),
    ),
    execution: {
      authorization_key_configured: Boolean(process.env.REALITY_EXECUTION_KEY),
      fail_closed_without_key: true,
    },
    policy: {
      no_implicit_authority: true,
      no_unverified_completion: true,
      bounded_actions_only: true,
      independent_verification_required: true,
      contradiction_preservation: true,
    },
  };
}

function authorized(req, body, provider, scope) {
  const key = req.headers['x-reality-execution-key'];
  if (!process.env.REALITY_EXECUTION_KEY || key !== process.env.REALITY_EXECUTION_KEY) {
    return { allowed: false, reason: 'EXECUTION_KEY_REQUIRED' };
  }
  if (body?.authorization?.authorized !== true) {
    return { allowed: false, reason: 'EXPLICIT_AUTHORIZATION_REQUIRED' };
  }
  if (body.authorization.scope !== scope) {
    return { allowed: false, reason: 'AUTHORITY_SCOPE_MISMATCH' };
  }
  if (!provider || !scope) return { allowed: false, reason: 'ACTION_NOT_BOUND' };
  return { allowed: true };
}

function githubHeaders() {
  return {
    authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
    accept: 'application/vnd.github+json',
    'user-agent': 'reality-world-access/0.2.0',
  };
}

async function githubRequest(path, options = {}) {
  if (!process.env.GITHUB_TOKEN) throw new Error('GitHub capability is not configured.');
  const r = await fetch('https://api.github.com' + path, {
    ...options,
    headers: { ...githubHeaders(), ...(options.headers || {}) },
  });
  const body = await r.json();
  if (!r.ok) throw new Error('GitHub request failed: ' + (body.message || r.status));
  return body;
}

async function readGithub(path, ref = 'main') {
  const encoded = path.replace(/^\//, '').split('/').map(encodeURIComponent).join('/');
  const query = ref ? '?ref=' + encodeURIComponent(ref) : '';
  return githubRequest('/repos/maloney2323/Reality/contents/' + encoded + query);
}

async function writeGithubFile({ path, content, message, branch = 'main', sha }) {
  const encoded = path.replace(/^\//, '').split('/').map(encodeURIComponent).join('/');
  const body = {
    message,
    content: Buffer.from(content, 'utf8').toString('base64'),
    branch,
  };
  if (sha) body.sha = sha;
  return githubRequest('/repos/maloney2323/Reality/contents/' + encoded, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function createPullRequest({ head, base = 'main', title, body }) {
  return githubRequest('/repos/maloney2323/Reality/pulls', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ head, base, title, body }),
  });
}

async function readVercelProject() {
  if (!process.env.VERCEL_TOKEN) throw new Error('Vercel capability is not configured.');
  const team = process.env.VERCEL_TEAM_ID;
  const project = process.env.VERCEL_PROJECT_ID || 'prj_5A3b0WG9IuvzyEUBw9tD9v8jcha8';
  const url = new URL('https://api.vercel.com/v9/projects/' + project);
  if (team) url.searchParams.set('teamId', team);
  const r = await fetch(url, {
    headers: { authorization: 'Bearer ' + process.env.VERCEL_TOKEN },
  });
  const body = await r.json();
  if (!r.ok) throw new Error('Vercel read failed: ' + (body.error?.message || r.status));
  return body;
}

async function readVercelDeployment(id) {
  if (!process.env.VERCEL_TOKEN) throw new Error('Vercel capability is not configured.');
  const team = process.env.VERCEL_TEAM_ID;
  const url = new URL('https://api.vercel.com/v13/deployments/' + encodeURIComponent(id));
  if (team) url.searchParams.set('teamId', team);
  const r = await fetch(url, { headers: { authorization: 'Bearer ' + process.env.VERCEL_TOKEN } });
  const body = await r.json();
  if (!r.ok) throw new Error('Vercel deployment read failed: ' + (body.error?.message || r.status));
  return body;
}

async function triggerVercelDeployment({ branch = 'main', name = 'reality' }) {
  if (!process.env.VERCEL_TOKEN) throw new Error('Vercel capability is not configured.');
  const team = process.env.VERCEL_TEAM_ID;
  const project = process.env.VERCEL_PROJECT_ID || 'prj_5A3b0WG9IuvzyEUBw9tD9v8jcha8';
  const url = new URL('https://api.vercel.com/v13/deployments');
  if (team) url.searchParams.set('teamId', team);
  const payload = {
    name,
    project,
    target: 'production',
    gitSource: {
      type: 'github',
      repo: 'maloney2323/Reality',
      ref: branch,
    },
  };
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: 'Bearer ' + process.env.VERCEL_TOKEN,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const body = await r.json();
  if (!r.ok) throw new Error('Vercel deployment trigger failed: ' + (body.error?.message || r.status));
  return body;
}

function receipt({ provider, action, target, before, after, verified, details = {} }) {
  return {
    receipt_version: '0.2.0',
    provider,
    action,
    target,
    before,
    after,
    verified,
    verification: verified ? 'VERIFIED_MATCH' : 'VERIFICATION_FAILED',
    executed_at: new Date().toISOString(),
    ...details,
  };
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') return json(res, 200, capabilitySnapshot());

    if (req.method !== 'POST') {
      res.setHeader('allow', 'GET, POST');
      return json(res, 405, { error: 'METHOD_NOT_ALLOWED' });
    }

    const body = typeof req.body === 'object' && req.body ? req.body : {};
    const action = body.action;

    if (!ACTIONS.has(action)) {
      return json(res, 400, { error: 'ACTION_NOT_ALLOWED', allowed_actions: [...ACTIONS] });
    }

    if (action === 'read_capabilities') return json(res, 200, { capability: capabilitySnapshot() });

    if (action === 'read_repository') {
      if (typeof body.path !== 'string' || body.path.length > 300) {
        return json(res, 400, { error: 'INVALID_PATH' });
      }
      const result = await readGithub(body.path, body.ref || 'main');
      return json(res, 200, { provider: 'github', verified_read: true, result });
    }

    if (action === 'create_repository_file' || action === 'update_repository_file') {
      const auth = authorized(req, body, 'github', 'repository');
      if (!auth.allowed) return json(res, 403, { error: auth.reason, verified: false });
      if (typeof body.path !== 'string' || typeof body.content !== 'string' || typeof body.message !== 'string') {
        return json(res, 400, { error: 'INVALID_WRITE_PAYLOAD' });
      }
      if (action === 'create_repository_file' && body.sha) {
        return json(res, 400, { error: 'CREATE_MUST_NOT_INCLUDE_SHA' });
      }
      if (action === 'update_repository_file' && typeof body.sha !== 'string') {
        return json(res, 400, { error: 'UPDATE_REQUIRES_CURRENT_SHA' });
      }
      const branch = body.branch || 'main';
      const before = await readGithub(body.path, branch).catch(() => null);
      const written = await writeGithubFile({
        path: body.path,
        content: body.content,
        message: body.message,
        branch,
        sha: body.sha,
      });
      const after = await readGithub(body.path, branch);
      const verified = after?.sha !== undefined && after?.content !== undefined;
      return json(res, verified ? 200 : 502, {
        receipt: receipt({
          provider: 'github',
          action,
          target: { path: body.path, branch },
          before: before ? { sha: before.sha } : null,
          after: { sha: after?.sha, content_present: after?.content !== undefined },
          verified,
          details: { commit_sha: written.commit?.sha || null },
        }),
      });
    }

    if (action === 'create_pull_request') {
      const auth = authorized(req, body, 'github', 'repository');
      if (!auth.allowed) return json(res, 403, { error: auth.reason, verified: false });
      if (typeof body.head !== 'string' || typeof body.title !== 'string') {
        return json(res, 400, { error: 'INVALID_PR_PAYLOAD' });
      }
      const created = await createPullRequest({
        head: body.head,
        base: body.base || 'main',
        title: body.title,
        body: body.body || '',
      });
      const verified = created?.number != null && created?.head?.ref === body.head;
      return json(res, verified ? 200 : 502, {
        receipt: receipt({
          provider: 'github',
          action,
          target: { pull_request: created?.number, head: body.head, base: body.base || 'main' },
          before: null,
          after: { number: created?.number, state: created?.state, head: created?.head?.ref },
          verified,
          details: { url: created?.html_url || null },
        }),
      });
    }

    if (action === 'read_project') {
      const result = await readVercelProject();
      return json(res, 200, {
        provider: 'vercel',
        verified_read: true,
        result: {
          id: result.id,
          name: result.name,
          accountId: result.accountId,
          framework: result.framework,
          link: result.link,
        },
      });
    }

    if (action === 'read_deployment') {
      if (typeof body.deploymentId !== 'string') return json(res, 400, { error: 'INVALID_DEPLOYMENT_ID' });
      const result = await readVercelDeployment(body.deploymentId);
      return json(res, 200, {
        provider: 'vercel',
        verified_read: true,
        result: {
          id: result.id,
          state: result.readyState,
          url: result.url,
          target: result.target,
          createdAt: result.createdAt,
        },
      });
    }

    if (action === 'trigger_deployment') {
      const auth = authorized(req, body, 'vercel', 'project');
      if (!auth.allowed) return json(res, 403, { error: auth.reason, verified: false });
      const created = await triggerVercelDeployment({
        branch: body.branch || 'main',
        name: body.name || 'reality',
      });
      const verified = Boolean(created?.id);
      let after = null;
      if (verified) {
        after = await readVercelDeployment(created.id).catch(() => null);
      }
      const independentlyVerified = Boolean(after?.id && after?.id === created.id);
      return json(res, independentlyVerified ? 200 : 502, {
        receipt: receipt({
          provider: 'vercel',
          action,
          target: { project: process.env.VERCEL_PROJECT_ID || 'prj_5A3b0WG9IuvzyEUBw9tD9v8jcha8', branch: body.branch || 'main' },
          before: null,
          after: after ? { id: after.id, state: after.readyState, url: after.url } : null,
          verified: independentlyVerified,
          details: { deployment_id: created.id, deployment_url: created.url || null },
        }),
      });
    }
  } catch (error) {
    return json(res, 502, {
      error: 'WORLD_ACCESS_FAILED',
      message: error instanceof Error ? error.message : String(error),
      verified: false,
    });
  }
}
