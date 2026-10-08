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

async function github(path) {
  const response = await fetch(`${GITHUB_API}${path}`, { headers: headers() });
  const body = await response.json();
  if (!response.ok) throw new Error(`GITHUB_READ_FAILED:${response.status}`);
  return body;
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
      external_effects_permitted: false,
      authority: 'NONE_UNLESS_EXPLICITLY_ESTABLISHED',
      next_action: work.state === 'QUALIFIED'
        ? 'PROPOSE_GOVERNED_WORK'
        : 'COLLECT_MISSING_EVIDENCE',
    }));

  return Object.freeze({
    version: 'reality-stewardship-pass-v1.0',
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
    governance: {
      discovery_automatic: true,
      authority_automatic: false,
      external_effects_permitted: false,
      rule: 'When Reality knows less, it is allowed to do less.',
    },
  });
}
