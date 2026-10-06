import crypto from 'node:crypto';

const ALLOWED_REPOSITORY = 'maloney2323/Reality';
const ALLOWED_OPERATION = 'create_issue';

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function fail(status, error) {
  const e = new Error(error);
  e.status = status;
  throw e;
}

function fingerprint(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function githubHeaders() {
  const token = text(process.env.REALITY_GITHUB_TOKEN);
  if (!token) fail(503, 'REALITY_GITHUB_TOKEN_NOT_CONFIGURED');
  return {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${token}`,
    'x-github-api-version': '2022-11-28',
    'content-type': 'application/json',
  };
}

async function github(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: { ...githubHeaders(), ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error('GITHUB_REQUEST_FAILED');
    error.status = response.status;
    error.provider_error = payload?.message || null;
    throw error;
  }
  return payload;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).setHeader('Allow', 'POST').json({ error: 'METHOD_NOT_ALLOWED' });

  try {
    const { workItem, authorization, execution } = req.body || {};
    if (!workItem?.work_item_id || !authorization?.authorized || !execution?.execution_id) {
      return res.status(400).json({ ok: false, error: 'WORK_ITEM_AUTHORIZATION_EXECUTION_REQUIRED' });
    }

    if (workItem.connector !== 'github' || workItem.operation !== ALLOWED_OPERATION) {
      return res.status(403).json({ ok: false, error: 'GITHUB_OPERATION_NOT_ALLOWED' });
    }

    const input = workItem.inputs || {};
    const repository = text(input.repository);
    const title = text(input.title);
    const body = typeof input.body === 'string' ? input.body : '';

    if (repository !== ALLOWED_REPOSITORY) return res.status(403).json({ ok: false, error: 'GITHUB_REPOSITORY_NOT_ALLOWED' });
    if (!title) return res.status(400).json({ ok: false, error: 'GITHUB_ISSUE_TITLE_REQUIRED' });
    if (title.length > 200) return res.status(400).json({ ok: false, error: 'GITHUB_ISSUE_TITLE_TOO_LONG' });
    if (body.length > 10000) return res.status(400).json({ ok: false, error: 'GITHUB_ISSUE_BODY_TOO_LONG' });

    const result = await github(`/repos/${ALLOWED_REPOSITORY}/issues`, {
      method: 'POST',
      body: JSON.stringify({ title, body }),
    });

    return res.status(200).json({
      ok: true,
      provider: 'github',
      operation: ALLOWED_OPERATION,
      providerExecutionId: String(result.id),
      observation: {
        repository: ALLOWED_REPOSITORY,
        issue_number: result.number,
        issue_url: result.html_url,
        title: result.title,
        state: result.state,
      },
      request_fingerprint: fingerprint({ repository, title, body }),
    });
  } catch (error) {
    return res.status(error.status || 500).json({ ok: false, error: error.message, provider_error: error.provider_error || null });
  }
}
