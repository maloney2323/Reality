import { discoverWork, qualifyWorkCandidate, rankWorkForMoney } from './reality-work-discovery-foundation-v1.0.js';
import { githubGet, githubWrite } from './reality-connector-github-v1.0.js';

const OWNER = 'maloney2323';
const REPO = 'Reality';

// Public provider read is permitted ONLY for this published repository, ONLY
// in isolated preview, and ONLY for the two stewarded discovery GET queries.
// It cannot be used to write GitHub data or substitute for owner approval.
export async function readStewardshipGitHub(path,{
 env=process.env,fetchImpl=fetch,
}={}){
 if(!/^\/repos\/maloney2323\/Reality\/(?:actions\/runs\?per_page=\d{1,3}|pulls\?state=open&per_page=\d{1,3})$/.test(path))
  throw Error('DISCOVERY_PUBLIC_GITHUB_SOURCE_OUT_OF_SCOPE');
 // Preview discovery reads this PUBLIC repo's Actions/PR evidence without
 // credentials even if an Issues-only write credential is configured.
 // Fine-grained Issues tokens need not have Actions read permission;
 // discovery must not silently expand the token's scope.
 if(env.VERCEL_ENV!=='preview'){
  if(!env.REALITY_GITHUB_TOKEN)
   throw Error('DISCOVERY_AUTHENTICATED_GITHUB_CONNECTOR_REQUIRED');
  return githubGet(path);
 }
 const response=await fetchImpl('https://api.github.com'+path,{
  method:'GET',
  headers:{Accept:'application/vnd.github+json',
   'X-GitHub-Api-Version':'2022-11-28',
   'User-Agent':'Reality-ReadOnly-Public-Stewardship'},
 });
 if(!response.ok)throw Error('DISCOVERY_PUBLIC_GITHUB_HTTP_'+response.status);
 const body=await response.json();
 if(path.includes('/actions/runs?')){
  if(!Array.isArray(body?.workflow_runs))
   throw Error('DISCOVERY_PUBLIC_GITHUB_RUNS_INVALID');
 }else if(!Array.isArray(body))
  throw Error('DISCOVERY_PUBLIC_GITHUB_PULLS_INVALID');
 return body;
}


async function executeRecurringMaintenance({ owner, repo, workflow, failedRuns }) {
  const marker = `reality-recurring-work:${workflow}`;
  const issues = await githubGet(
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

  let result;
  if (existing) {
    result = await githubWrite(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${existing.number}`,
      'PATCH',
      { body }
    );
  } else {
    result = await githubWrite(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`,
      'POST',
      {
        title: `Reality recurring work: repair repeated ${workflow} failures`,
        body,
        labels: ['reality-recurring-work'],
      }
    );
  }

  // Independent read-back: execution is not considered verified until GitHub
  // returns the resulting issue with Reality's marker.
  const verified = await githubGet(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${result.number}`
  );
  if (!verified || verified.number !== result.number || !String(verified.body || '').includes(marker)) {
    throw new Error('GITHUB_EXECUTION_READBACK_FAILED');
  }

  return {
    action: existing ? 'UPDATED_EXISTING_ISSUE' : 'CREATED_ISSUE',
    issue_number: verified.number,
    issue_url: verified.html_url,
    verification: {
      status: 'INDEPENDENTLY_VERIFIED',
      provider: 'github',
      issue_read_back: true,
      marker_present: true
    }
  };
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
  readGithub = readStewardshipGitHub,
} = {}) {
  const runs = await readGithub(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs?per_page=${perPage}`);
  const prs = await readGithub(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=open&per_page=${perPage}`);

  const workflowFailures = new Map(),latestSuccessfulRun=new Map();
  const runTime=run=>Date.parse(run.updated_at||run.created_at||'');
  for (const run of runs.workflow_runs || []) {
    const key=run.name||run.workflow_id||'unknown-workflow';
    const at=runTime(run);
    if(run.conclusion==='success'&&Number.isFinite(at)){
      const prior=latestSuccessfulRun.get(key);
      if(prior===undefined||at>prior)latestSuccessfulRun.set(key,at);
    }
    if(!['failure','timed_out','action_required'].includes(run.conclusion))continue;
    const arr=workflowFailures.get(key)||[];
    arr.push(run);workflowFailures.set(key,arr);
  }

  const observations = [];

  for (const [workflow, failedRuns] of workflowFailures) {
    // A fresh successful workflow run is evidence the preceding failures
    // may already be resolved. Repeated failures must be AFTER that success
    // to qualify as work needing renewed investigation.
    const successAt=latestSuccessfulRun.get(workflow);
    const actionableFailures=failedRuns.filter(run=>{
      if(successAt===undefined)return true;
      const at=runTime(run);
      return Number.isFinite(at)&&at>successAt;
    });
    if (actionableFailures.length < 2) continue;

    // Preserve each observed failure as a distinct observation. The work
    // discovery foundation establishes recurrence by counting observations
    // with the same work_key; collapsing the runs into one observation would
    // make recurrence_count look high while incorrectly leaving recurring=false.
    for (const run of actionableFailures) {
      observations.push({
        observation_id: `github-workflow-failure:${workflow}:${run.id || run.run_number || run.updated_at || run.created_at}`,
        work_key: `workflow-failure:${workflow}`,
        kind: 'SYSTEM_MAINTENANCE',
        objective: `Investigate repeated ${workflow} failures`,
        action: 'inspect_and_repair_repeated_workflow_failure',
        occurred_at: run.updated_at || run.created_at,
        evidence_refs: [run.html_url].filter(Boolean),
        source: 'github_actions',
      });
    }
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
    .map(work => {
      if (work.kind !== 'SYSTEM_MAINTENANCE' || work.state !== 'QUALIFIED') {
        return {
          ...work,
          authorization_required: false,
          external_effects_permitted: false,
          next_action: work.state === 'QUALIFIED' ? 'PROPOSE_GOVERNED_WORK' : 'COLLECT_MISSING_EVIDENCE',
        };
      }

      const workflowId = `workflow:${work.work_id}`;
      const title = `Reality recurring work: repair repeated ${work.work_key.replace(/^workflow-failure:/, '')} failures`;
      const body = [
        '<!-- Reality recurring work -->',
        '## Reality recurring maintenance',
        '',
        `Reality detected ${work.recurrence_count} recent failures for **${work.work_key.replace(/^workflow-failure:/, '')}**.`,
        '',
        '### Evidence',
        ...work.evidence_refs.map(ref => `- ${ref}`),
        '',
        '### Required work',
        `Investigate the repeated failure, repair the underlying cause, and independently verify the next successful run.`,
        '',
        'This work item was discovered by Reality. Execution remains blocked until the exact work item is explicitly authorized.',
      ].join('\\n');

      return {
        ...work,
        workflow_id: workflowId,
        authorization_required: true,
        authority: 'EXPLICIT_USER_AUTHORIZATION_REQUIRED',
        external_effects_permitted: true,
        next_action: 'AWAITING_USER_AUTHORIZATION',
        execution_work_item: {
          work_item_id: work.work_id,
          workflow_id: workflowId,
          action: 'Create a bounded recurring-maintenance tracking issue for the repeated workflow failure',
          connector: 'github',
          operation: 'create_issue',
          inputs: { repository: `${owner}/${repo}`, title, body },
          authority_required: [{ connector: 'github', operation: 'create_issue', work_item_id: work.work_id }],
          expected_effect: 'Create or track the bounded recurring maintenance work item in GitHub.',
          success_conditions: ['GitHub issue exists with Reality recurring-work evidence and required-work text.'],
          verification_method: 'Reality-owned GitHub read-back',
          reversibility: 'issue_can_be_closed',
          consequential: true,
          status: 'AWAITING_AUTHORIZATION',
        },
      };
    });

  // Discovery is deliberately side-effect free. Every consequential recurring
  // candidate is returned as an executable work item and must pass the normal
  // authority -> execution -> independent verification path.
  const execution = [];
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
      authority_automatic: false,
      authority_scope: 'Consequential recurring work is surfaced as bounded work items and cannot execute until explicitly authorized.',
      external_effects_permitted: false,
      code_merge_or_deploy_permitted: false,
      rule: 'When Reality knows less, it is allowed to do less.',
    },
  });
}
