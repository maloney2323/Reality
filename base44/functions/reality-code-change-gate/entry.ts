import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  evaluateCodeChangeWarrant,
} from '../../shared/action-gate/code-change.js';
import {
  getCodeChangePolicy,
  listCodeChangePolicies,
} from '../../shared/action-gate/code-change-policies.js';

// Reality Code Change Gate v0.1
//
// READ ONLY. This backend function collects GitHub repository state and GitHub
// Actions verification for a server-owned policy, then sends those observations
// through Reality's deterministic Code Change warrant. It cannot merge, push,
// commit, dispatch a workflow, mint an execution permit, or alter a repository.

const GITHUB_API = 'https://api.github.com';
const GITHUB_API_VERSION = '2026-03-10';

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function githubHeaders(accessToken: string) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${accessToken}`,
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
    'User-Agent': 'Reality-Code-Change-Gate',
  };
}

async function githubRequest(accessToken: string, path: string) {
  const response = await fetch(`${GITHUB_API}${path}`, {
    method: 'GET',
    headers: githubHeaders(accessToken),
  });
  const text = await response.text();
  let data: any = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!response.ok) {
    const error: any = new Error(data?.message || `GitHub request failed with ${response.status}`);
    error.status = response.status;
    error.github = data;
    throw error;
  }
  return data;
}

function splitRepository(fullName: string) {
  const [owner, repo, ...extra] = String(fullName || '').split('/');
  if (!owner || !repo || extra.length) throw new Error('policy repository must be owner/name');
  return { owner, repo };
}

function refPath(ref: string) {
  return encodeURIComponent(ref);
}

async function resolveCommit(accessToken: string, owner: string, repo: string, ref: string) {
  return githubRequest(
    accessToken,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${refPath(ref)}`,
  );
}

async function compareCommits(accessToken: string, owner: string, repo: string, baseSha: string, headSha: string) {
  return githubRequest(
    accessToken,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/compare/${encodeURIComponent(baseSha)}...${encodeURIComponent(headSha)}`,
  );
}

function decodeBase64Utf8(value: string) {
  const binary = atob(String(value || '').replace(/\s+/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function fileAtRef(accessToken: string, owner: string, repo: string, path: string, ref: string) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const data = await githubRequest(
    accessToken,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`,
  );
  if (Array.isArray(data) || data?.type !== 'file' || typeof data?.content !== 'string') {
    throw new Error(`protected invariant path is not a readable file: ${path}`);
  }
  if (data.encoding !== 'base64') throw new Error(`unsupported GitHub content encoding for ${path}`);
  return decodeBase64Utf8(data.content);
}

async function inspectInvariant(accessToken: string, owner: string, repo: string, candidateSha: string, invariant: any) {
  try {
    const content = await fileAtRef(accessToken, owner, repo, invariant.path, candidateSha);
    const missing_required = (invariant.required_strings || []).filter((value: string) => !content.includes(value));
    const present_forbidden = (invariant.forbidden_strings || []).filter((value: string) => content.includes(value));
    return Object.freeze({
      id: invariant.id,
      path: invariant.path,
      passed: missing_required.length === 0 && present_forbidden.length === 0,
      missing_required,
      present_forbidden,
      read_error: null,
    });
  } catch (error: any) {
    return Object.freeze({
      id: invariant.id,
      path: invariant.path,
      passed: false,
      missing_required: Object.freeze([...(invariant.required_strings || [])]),
      present_forbidden: Object.freeze([]),
      read_error: error?.message || String(error),
    });
  }
}

async function collectRepositoryObservation(accessToken: string, policy: any, candidateHeadRef: string) {
  const { owner, repo } = splitRepository(policy.repository);
  const [baseCommit, candidateCommit] = await Promise.all([
    resolveCommit(accessToken, owner, repo, policy.authoritative_base_ref),
    resolveCommit(accessToken, owner, repo, candidateHeadRef),
  ]);

  const authoritativeBaseSha = baseCommit.sha;
  const candidateHeadSha = candidateCommit.sha;
  const compare = await compareCommits(accessToken, owner, repo, authoritativeBaseSha, candidateHeadSha);
  const files = Array.isArray(compare.files) ? compare.files : [];
  const changedPaths = files.map((file: any) => String(file.filename || '')).filter(Boolean);
  const forbiddenPaths = changedPaths.filter((path: string) =>
    (policy.forbidden_path_prefixes || []).some((prefix: string) => path.startsWith(prefix))
  );

  const invariantResults = await Promise.all(
    (policy.invariants || []).map((invariant: any) =>
      inspectInvariant(accessToken, owner, repo, candidateHeadSha, invariant)
    )
  );

  const mergeBaseSha = compare?.merge_base_commit?.sha || null;
  const behindBy = Number.isInteger(compare?.behind_by) ? compare.behind_by : null;
  const aheadBy = Number.isInteger(compare?.ahead_by) ? compare.ahead_by : null;
  const baseIsAncestor = mergeBaseSha === authoritativeBaseSha && behindBy === 0 &&
    (compare?.status === 'ahead' || compare?.status === 'identical');

  return Object.freeze({
    repository: policy.repository,
    authoritative_base_ref: policy.authoritative_base_ref,
    authoritative_base_sha: authoritativeBaseSha,
    candidate_head_ref: candidateHeadRef,
    candidate_head_sha: candidateHeadSha,
    compare_status: compare?.status || null,
    ahead_by: aheadBy,
    behind_by: behindBy,
    changed_file_count: changedPaths.length,
    changed_paths: Object.freeze(changedPaths),
    forbidden_paths: Object.freeze(forbiddenPaths),
    invariant_results: Object.freeze(invariantResults),
    base_is_authoritative: true,
    base_is_ancestor: baseIsAncestor,
    candidate_is_distinct: candidateHeadSha !== authoritativeBaseSha && (aheadBy || 0) > 0,
    change_scope_bounded: changedPaths.length > 0 && changedPaths.length <= policy.max_changed_files,
    forbidden_paths_clear: forbiddenPaths.length === 0,
    protected_invariants_preserved: invariantResults.length > 0 && invariantResults.every((item: any) => item.passed === true),
  });
}

async function collectVerificationObservation(accessToken: string, policy: any, candidateHeadSha: string) {
  const { owner, repo } = splitRepository(policy.repository);
  const data = await githubRequest(
    accessToken,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs?head_sha=${encodeURIComponent(candidateHeadSha)}&per_page=100`,
  );
  const runs = Array.isArray(data?.workflow_runs) ? data.workflow_runs : [];
  const matching = runs
    .filter((run: any) => run?.name === policy.required_workflow_name)
    .sort((a: any, b: any) => String(b?.created_at || '').localeCompare(String(a?.created_at || '')))[0] || null;

  return Object.freeze({
    candidate_head_sha: candidateHeadSha,
    required_workflow_name: policy.required_workflow_name,
    required_workflow_found: matching !== null,
    required_workflow_success: matching?.status === 'completed' && matching?.conclusion === 'success',
    verified_head_matches_candidate: matching?.head_sha === candidateHeadSha,
    workflow_run_id: matching?.id || null,
    workflow_status: matching?.status || null,
    workflow_conclusion: matching?.conclusion || null,
    workflow_head_sha: matching?.head_sha || null,
    workflow_url: matching?.html_url || null,
  });
}

async function evaluateCandidate(accessToken: string, policyId: string, candidateHeadRef: string) {
  if (typeof candidateHeadRef !== 'string' || candidateHeadRef.trim().length === 0) {
    throw new Error('head_ref required');
  }
  const policy = getCodeChangePolicy(policyId);
  const repositoryObservation = await collectRepositoryObservation(accessToken, policy, candidateHeadRef.trim());
  const verificationObservation = await collectVerificationObservation(
    accessToken,
    policy,
    repositoryObservation.candidate_head_sha,
  );
  const result = evaluateCodeChangeWarrant({ repositoryObservation, verificationObservation });

  return Object.freeze({
    schema: 'reality.code-change-gate-result.v0.1',
    mode: 'READ_ONLY',
    policy: Object.freeze({
      id: policy.id,
      version: policy.version,
      repository: policy.repository,
      authoritative_base_ref: policy.authoritative_base_ref,
      required_workflow_name: policy.required_workflow_name,
      max_changed_files: policy.max_changed_files,
    }),
    candidate: Object.freeze({
      requested_head_ref: candidateHeadRef.trim(),
      resolved_head_sha: repositoryObservation.candidate_head_sha,
    }),
    result,
    limitations: Object.freeze([
      'Intent matching is not established in v0.1.',
      'Passing structural invariants and CI does not prove complete semantic safety.',
      'No runtime behavior is established beyond evidence exposed by the required workflow.',
      'This function cannot mutate GitHub and does not mint an execution permit.',
    ]),
  });
}

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const principal = await base44.auth.me();
    if (!principal?.id) return json({ error: 'Authentication required.' }, 401);
    if (principal.role !== 'admin') return json({ error: 'Admin access required.' }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'policies';

    if (action === 'policies') {
      return json({
        schema: 'reality.code-change-policies.v0.1',
        mode: 'READ_ONLY',
        policies: listCodeChangePolicies(),
      });
    }

    if (action !== 'evaluate') return json({ error: 'Unknown code-change gate action.' }, 400);

    const policyId = typeof body?.policy_id === 'string' ? body.policy_id : '';
    const headRef = typeof body?.head_ref === 'string' ? body.head_ref : '';
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('github');
    const evaluated = await evaluateCandidate(accessToken, policyId, headRef);
    return json(evaluated);
  } catch (error: any) {
    console.error('reality-code-change-gate failed', error);
    return json({
      error: 'Reality could not evaluate the code candidate.',
      diagnostic: error?.message || String(error),
      mode: 'READ_ONLY',
      mutation_performed: false,
    }, error?.status || 500);
  }
}