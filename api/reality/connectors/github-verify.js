const ALLOWED_REPOSITORY = 'maloney2323/Reality';

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function fail(status, error) {
  const e = new Error(error);
  e.status = status;
  throw e;
}

function githubHeaders() {
  const token = text(process.env.REALITY_GITHUB_TOKEN);
  if (!token) fail(503, 'REALITY_GITHUB_TOKEN_NOT_CONFIGURED');
  return {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${token}`,
    'x-github-api-version': '2022-11-28',
  };
}

async function github(path) {
  const response = await fetch(`https://api.github.com${path}`, { headers: githubHeaders() });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error('GITHUB_VERIFICATION_REQUEST_FAILED');
    error.status = response.status;
    error.provider_error = payload?.message || null;
    throw error;
  }
  return payload;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).setHeader('Allow', 'POST').json({ error: 'METHOD_NOT_ALLOWED' });

  try {
    const { workItem, execution, providerResult } = req.body || {};
    if (workItem?.connector !== 'github' || workItem?.operation !== 'create_issue') {
      return res.status(403).json({ ok: false, error: 'GITHUB_OPERATION_NOT_ALLOWED' });
    }

    const repository = text(workItem.inputs?.repository);
    const issueNumber = Number(providerResult?.observation?.issue_number);
    if (repository !== ALLOWED_REPOSITORY || !Number.isInteger(issueNumber) || issueNumber < 1) {
      return res.status(400).json({ ok: false, error: 'VERIFICATION_TARGET_INVALID' });
    }

    const observed = await github(`/repos/${ALLOWED_REPOSITORY}/issues/${issueNumber}`);
    const expectedTitle = text(workItem.inputs?.title);
    const verified = observed.number === issueNumber &&
      observed.title === expectedTitle &&
      observed.state === 'open';

    return res.status(200).json({
      ok: true,
      verified,
      independent: true,
      basis: 'FRESH_GITHUB_READBACK',
      verification_id: `github-verification:${observed.id}`,
      observedState: {
        repository: ALLOWED_REPOSITORY,
        issue_number: observed.number,
        title: observed.title,
        state: observed.state,
        url: observed.html_url,
        execution_id: execution?.execution_id || null,
      },
      mismatch: verified ? null : {
        expected_title: expectedTitle,
        observed_title: observed.title,
        expected_state: 'open',
        observed_state: observed.state,
      },
    });
  } catch (error) {
    return res.status(error.status || 500).json({ ok: false, error: error.message, provider_error: error.provider_error || null });
  }
}
