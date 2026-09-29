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

const ACTIONS = new Set(['read_capabilities', 'read_repository', 'read_project']);

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

function capabilitySnapshot() {
  return {
    service: 'reality-world-access',
    version: '0.1.0',
    providers: Object.fromEntries(
      Object.entries(PROVIDERS).map(([id, p]) => [
        id,
        { name: p.name, read: p.read, write: p.write, scope: p.scope },
      ]),
    ),
    policy: {
      no_implicit_authority: true,
      no_unverified_completion: true,
      bounded_actions_only: true,
      independent_verification_required: true,
    },
  };
}

async function readGithub(path) {
  if (!process.env.GITHUB_TOKEN) throw new Error('GitHub read capability is not configured.');
  const url = new URL('https://api.github.com/repos/maloney2323/Reality/contents/' + path.replace(/^\//, ''));
  const r = await fetch(url, {
    headers: {
      authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
      accept: 'application/vnd.github+json',
      'user-agent': 'reality-world-access/0.1.0',
    },
  });
  const body = await r.json();
  if (!r.ok) throw new Error('GitHub read failed: ' + (body.message || r.status));
  return body;
}

async function readVercelProject() {
  if (!process.env.VERCEL_TOKEN) throw new Error('Vercel read capability is not configured.');
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
      return json(res, 400, {
        error: 'ACTION_NOT_ALLOWED',
        allowed_actions: [...ACTIONS],
      });
    }

    if (action === 'read_capabilities') {
      return json(res, 200, { capability: capabilitySnapshot() });
    }

    if (action === 'read_repository') {
      if (typeof body.path !== 'string' || body.path.length > 300) {
        return json(res, 400, { error: 'INVALID_PATH' });
      }
      const result = await readGithub(body.path);
      return json(res, 200, {
        provider: 'github',
        verified_read: true,
        result,
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
  } catch (error) {
    return json(res, 502, {
      error: 'WORLD_ACCESS_FAILED',
      message: error instanceof Error ? error.message : String(error),
      verified: false,
    });
  }
}
