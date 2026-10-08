import { discoverWork, qualifyWorkCandidate, rankWorkForMoney } from './reality-work-discovery-foundation-v1.0.js';

const GITHUB_API = 'https://api.github.com';
const OWNER = 'maloney2323';
const REPO = 'Reality';

function headers() {
  const token = process.env.REALITY_GITHUB_TOKEN;
  return {
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2026-03-10',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

async function github(path, options = {}) {
  const response = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`GITHUB_REQUEST_FAILED:${response.status}`);
  return body;
}

async function executeRecurringMaintenance({ owner, repo, workflow, failedRuns }) {
  const token = process.env.REALITY_GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_WRITE_AUTHORITY_MISSING');

  const marker = `reality-recurring-work:${workflow}`;
  const issues = await github(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?state=open&per_page=100`
  );
  const existing = (issues || []).find(issue =>
    !issue.pull_request &&
    typeof issue.body === 'string' &&
    issue.body.includes(marker)
  );

  const evidence = failedRuns.map(run => `- ${run.html_url}`).filter(Boolean).join('\n');
  const body = [
    `<!-- ${marker} -->`,
    '## Reality recurring maintenance',
    '',
    `Reality detected ${failedRuns.length} recent failures of **${workflow}**.`,
    '',
    '### Evidence',
    evidence,
    '',
    '### Required work',
    'Investigate the repeated failure, repair the underlying cause, and independently verify the next successful run.',
    '',
    'This issue was created/updated by Reality Stewardship. It is bounded to tracking and recurring follow-up; it does not merge code or deploy changes.',
  ].join('\n');

  if (existing) {
    await github(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${existing.number}`,
      { method: 'PATCH', body: JSON.stringify({ body }), headers: { 'content-type': 'application/json' } }
    );
    return { action: 'UPDATED_EXISTING_ISSUE', issue_number: existing.number, issue_url: existing.html_url };
  }

  const created = await github(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`,
    {
      method: 'POST',
      body: JSON.stringify({
        title: `Reality recurring work: repair repeated ${workflow} failures`,
        body,
        labels: ['reality-recurring-work'],
      }),
      headers: { 'content-type': 'application/json' },
    }
  );
  return { action: 'CREATED_ISSUE', issue_number: created.number, issue_url: created.html_url };
}

function ageDays(value) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? Math.max(0, (Date.now() - time) / 86400000) : null;
}

export async function runRealityStewardshipPass({
  owner = OWNER,
  repo = REPO,
  perPage = 30,
  stalePrDays = 7,
} = {}) {
  const runs = await github(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs?per_page=${perPage}`);
  const prs = await github(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=open&per_page=${perPage}`);

  const workflowFailures = new Map();
  for (const run of runs.workflow_runs || []) {
    if (!['failure', 'timed_out', 'action_required'].includes(run.conclusion)) continue;
    const key = run.name || run.workflow_id || 'unknown-workflow';
    const arr = workflowFailures.get(key) || [];
    arr.push(run);
    workflowFailures.set(key, arr);
  }

  const observations = [];

  for (const [workflow, failedRuns] of workflowFailures) {
    if (failedRuns.length < 2) continue;
    observations.push({
      observation_id: `github-workflow-failure:${workflow}`,
      work_key: `workflow-failure:${workflow}`,
      kind: 'SYSTEM_MAINTENANCE',
      objective: `Investigate repeated ${workflow} failures`,
      action: 'inspect_and_repair_repeated_workflow_failure',
      occurred_at: failedRuns[0].updated_at || failedRuns[0].created_at,
      evidence_refs: failedRuns.map(run => run.html_url).filter(Boolean),
      recurrence_count: failedRuns.length,
      source: 'github_actions',
    });
  }

  for (const pr of prs) {
    const age = ageDays(pr.updated_at || pr.created_at);
    if (age === null || age < stalePrDays) continue;
    observations.push({
      observation_id: `github-stale-pr:${pr.number}`,
      work_key: `stale-pr:${pr.number}`,
      kind: 'FOLLOW_UP',
      objective: `Review stale pull request #${pr.number}: ${pr.title}`,
      action: 'review_stale_pull_request',
      occurred_at: pr.updated_at || pr.created_at,
      evidence_refs: [pr.html_url].filter(Boolean),
      source: 'github_pull_requests',
      age_days: Number(age.toFixed(1)),
    });
  }

  const discovered = discoverWork({
    observations,
    existingWork: [],
    minimumRecurrences: 2,
  });

  const qualified = discovered
    .map(work => qualifyWorkCandidate(work, { evidenceRequired: true }))
    .map(work => rankWorkForMoney(work))
    .map(work => ({
      ...work,
      external_effects_permitted: work.kind === 'SYSTEM_MAINTENANCE',
      authority: work.kind === 'SYSTEM_MAINTENANCE'
        ? 'USER_AUTHORIZED_BOUNDED_RECURRING_MAINTENANCE'
        : 'NONE_UNLESS_EXPLICITLY_ESTABLISHED',
      next_action: work.kind === 'SYSTEM_MAINTENANCE' && work.state === 'QUALIFIED'
        ? 'EXECUTE_BOUNDED_RECURRING_MAINTENANCE'
        : work.state === 'QUALIFIED'
          ? 'PROPOSE_GOVERNED_WORK'
          : 'COLLECT_MISSING_EVIDENCE',
    }));

  const execution = [];
  for (const [workflow, failedRuns] of workflowFailures) {
    if (failedRuns.length < 2) continue;
    try {
      execution.push({
        workflow,
        ...await executeRecurringMaintenance({ owner, repo, workflow, failedRuns }),
      });
    } catch (error) {
      execution.push({
        workflow,
        action: 'BLOCKED',
        error: error.message,
      });
    }
  }

  return Object.freeze({
    version: 'reality-stewardship-pass-v1.1',
    status: 'OBSERVED',
    observed_at: new Date().toISOString(),
    source: { provider: 'github', repository: `${owner}/${repo}` },
    evidence: {
      workflow_runs_observed: (runs.workflow_runs || []).length,
      open_pull_requests_observed: prs.length,
      repeated_failure_workflows: [...workflowFailures.entries()]
        .filter(([, failedRuns]) => failedRuns.length >= 2)
        .map(([name, failedRuns]) => ({ name, failures: failedRuns.length })),
    },
    work: qualified,
    execution,
    governance: {
      discovery_automatic: true,
      authority_automatic: true,
      authority_scope: 'Create or update a tracking issue for repeated GitHub workflow failures only.',
      external_effects_permitted: execution.some(x => x.action === 'CREATED_ISSUE' || x.action === 'UPDATED_EXISTING_ISSUE'),
      code_merge_or_deploy_permitted: false,
      rule: 'When Reality knows less, it is allowed to do less.',
    },
  });
}
