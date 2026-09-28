// Shared GitHub provider-read bridge for Reality's independent runtime.
//
// Executes authenticated, bounded, read-only GitHub API calls through the
// Base44 GitHub connector SDK — NOT the dead external staging gateway. Used by
// both world-inspection-plan (chat enrichment) and reality-connect-proxy
// (plugin browser provider proof test) so the same credential path serves the
// user-facing provider proof test and the chat world-inspection flow.
//
// Authority: GITHUB_CONNECTOR_READONLY. A read establishes that Reality's
// adapter can reach GitHub; it never writes, never mutates, never authorizes an
// action, and never establishes the truth of repository content. Write
// capability is inspected non-mutatingly (X-OAuth-Scopes header only); a
// write-capable scope is "exposed", never "authorized" or "executed".

export const GITHUB_ADAPTER = Object.freeze({
  id: 'github-read-v0.1',
  operation: 'repository_context',
  purpose:
    'Read repository metadata, branches, commits, pull requests, and bounded source context relevant to the user request.',
});

export const GITHUB_PROVIDER_AUTHORITY = 'GITHUB_CONNECTOR_READONLY';

import { githubHeaders } from './github-client.ts';

const GITHUB_API = 'https://api.github.com';
const GITHUB_REPO_HINT =
  /(?:github\.com[:/])?([A-Za-z0-9][A-Za-z0-9_.-]{0,38})\/([A-Za-z0-9][A-Za-z0-9_.-]{0,99})/;

async function fetchBounded(url: string, init: RequestInit = {}, timeoutMs = 4000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function decodeBase64Utf8(b64: string): string {
  const binary = atob(String(b64 || '').replace(/\n/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}

function escapeRegExp(value: string): string {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function ts(value: unknown): number {
  const n = Date.parse(String(value || ''));
  return Number.isFinite(n) ? n : 0;
}

// Use the SAME headers as the proven github-client.ts (User-Agent + current
// X-GitHub-Api-Version). GitHub rejects requests without a valid User-Agent
// header with HTTP 403, which was the root cause of the provider-read bridge
// returning 403 even with a valid connector token.
function ghHeaders(accessToken: string) {
  return githubHeaders(accessToken);
}

export interface GithubReadDiagnostics {
  provider: string;
  operation: string;
  execution_attempted: boolean;
  auth_context_available: boolean;
  provider_response_status: number | null;
  failure_boundary: string | null;
  evidence_binding_created: boolean;
  evidence_binding_count: number;
}

export interface GithubReadResult extends GithubReadDiagnostics {
  adapter: { provider: string; id: string; operation: string; purpose: string };
  read_executed: boolean;
  readability_established: boolean;
  completeness_established: boolean;
  evidence: string[];
  provenance: string | null;
  exact_ref_sha: string | null;
  provider_identity: object | null;
  reason: string;
}

function baseResult(message = ''): GithubReadResult {
  return {
    adapter: { provider: 'github', ...GITHUB_ADAPTER },
    provider: 'github',
    operation: GITHUB_ADAPTER.operation,
    execution_attempted: true,
    auth_context_available: false,
    provider_response_status: null,
    failure_boundary: null,
    evidence_binding_created: false,
    evidence_binding_count: 0,
    read_executed: false,
    readability_established: false,
    completeness_established: false,
    evidence: [],
    provenance: null,
    exact_ref_sha: null,
    provider_identity: null,
    reason: message,
  };
}

// Execute a bounded, authenticated GitHub repository read. Resolves the target
// repo from the message (owner/repo hint); defaults to maloney2323/TAKE so a
// bare provider-read proof test still binds real evidence. Returns a full
// diagnostic envelope so a failed provider call reports exactly where
// execution stopped, without exposing the token.
export async function executeGithubRead(
  base44: any,
  message = '',
): Promise<GithubReadResult> {
  const result = baseResult();
  let conn: any;
  try {
    conn = await base44.asServiceRole.connectors.getConnection('github');
  } catch (error: any) {
    return {
      ...result,
      execution_attempted: true,
      auth_context_available: false,
      failure_boundary: 'CONNECTOR_RESOLUTION_FAILED',
      reason:
        error?.message ||
        'GitHub connector could not be resolved for the backend provider call.',
    };
  }
  const accessToken = conn?.accessToken;
  if (!accessToken) {
    return {
      ...result,
      execution_attempted: true,
      auth_context_available: false,
      failure_boundary: 'NO_CONNECTOR_CREDENTIAL',
      reason:
        'GitHub connector is not authorized; no access token is available to the backend provider call.',
    };
  }
  result.auth_context_available = true;

  const match = GITHUB_REPO_HINT.exec(message || '');
  let owner: string | null = null;
  let repoName: string | null = null;
  if (match) {
    const o = match[1];
    const r = match[2];
    if (o && r && !/^(https?|www|com|github)$/i.test(o)) {
      owner = o;
      repoName = r;
    }
  }
  const headers = ghHeaders(accessToken);

  // If the message does not contain an owner/repo reference, resolve the target
  // repository by listing the authenticated user's repositories and matching a
  // repo name against the message (case-sensitive whole word). A bare
  // "TAKE is crashing" resolves to the actual TAKE repo this way. For an empty
  // message (the provider proof test), keep the default so the proof still
  // binds real evidence. A non-empty message that names no connected repo
  // returns an honest diagnostic instead of fabricating a read.
  if (!owner) {
    const messageText = String(message || '');
    if (messageText.trim()) {
      try {
        const reposRes = await fetchBounded(`${GITHUB_API}/user/repos?per_page=100&sort=updated`, { headers });
        if (reposRes.ok) {
          const repos: any[] = await reposRes.json();
          const candidates = (Array.isArray(repos) ? repos : [])
            .filter((r: any) => r && r.name && r.owner?.login)
            .filter((r: any) => new RegExp(`\\b${escapeRegExp(r.name)}\\b`).test(messageText))
            .sort((a: any, b: any) => ts(b.updated_at) - ts(a.updated_at));
          if (candidates.length > 0) {
            owner = candidates[0].owner.login;
            repoName = candidates[0].name;
          }
        }
      } catch {
        // repo-name resolution is best-effort; fall through to diagnostic below.
      }
      if (!owner) {
        return {
          ...result,
          failure_boundary: 'NO_REPOSITORY_REFERENCE_RESOLVED',
          reason:
            'No connected repository reference was found in the request. Name the repository as owner/repo (e.g. maloney2323/TAKE) or by its exact repo name so Reality can inspect the actual repository.',
        };
      }
    } else {
      // Empty message: preserve the default for the provider proof test.
      owner = 'maloney2323';
      repoName = 'TAKE';
    }
  }

  // 1) repository metadata
  let repoData: any = null;
  try {
    const repoRes = await fetchBounded(`${GITHUB_API}/repos/${owner}/${repoName}`, { headers });
    result.provider_response_status = repoRes.status;
    if (!repoRes.ok) {
      let bodyText: string | null = null;
      try { bodyText = await repoRes.text(); } catch { /* non-text body */ }
      let bodyMessage: string | null = null;
      try { bodyMessage = bodyText ? JSON.parse(bodyText)?.message : null; } catch { /* non-JSON */ }
      const retryAfter = repoRes.headers.get('retry-after');
      const rateRemaining = repoRes.headers.get('x-ratelimit-remaining');
      // Probe /user on failure to reveal which GitHub identity the backend
      // provider call actually authenticated as — without exposing the token.
      // This distinguishes a token-access issue from a transient rate limit.
      let authedLogin: string | null = null;
      let authedScopes: string | null = null;
      let userStatus: number | null = null;
      try {
        const userRes = await fetchBounded(`${GITHUB_API}/user`, { headers });
        userStatus = userRes.status;
        authedScopes = userRes.headers.get('x-oauth-scopes');
        if (userRes.ok) {
          const userData = await userRes.json();
          authedLogin = String(userData?.login || '') || null;
        }
      } catch { /* /user probe is best-effort */ }
      return {
        ...result,
        failure_boundary: `REPO_METADATA_HTTP_${repoRes.status}`,
        reason:
          (bodyMessage ? String(bodyMessage).slice(0, 400) : `GitHub repo metadata returned HTTP ${repoRes.status}.`) +
          (retryAfter ? ` (retry-after ${retryAfter}s)` : '') +
          (rateRemaining !== null ? ` (x-ratelimit-remaining ${rateRemaining})` : ''),
        diagnostics: {
          repo_status: repoRes.status,
          repo_body_message: bodyMessage,
          retry_after: retryAfter,
          x_ratelimit_remaining: rateRemaining,
          authenticated_login: authedLogin,
          authenticated_oauth_scopes: authedScopes,
          user_probe_status: userStatus,
        },
      };
    }
    repoData = await repoRes.json();
  } catch (error: any) {
    return {
      ...result,
      failure_boundary: 'REPO_METADATA_FETCH_FAILED',
      reason:
        error?.name === 'AbortError'
          ? 'GitHub repo metadata read timed out.'
          : error?.message || 'GitHub repo metadata fetch failed.',
    };
  }
  const defaultBranch = String(repoData?.default_branch || 'master');

  // 2) branch HEAD SHA
  let headSha = '';
  try {
    const branchRes = await fetchBounded(
      `${GITHUB_API}/repos/${owner}/${repoName}/branches/${encodeURIComponent(defaultBranch)}`,
      { headers },
    );
    if (branchRes.ok) {
      const branchData = await branchRes.json();
      headSha = String(branchData?.commit?.sha || '');
    }
  } catch {
    // SHA is best-effort; metadata alone still binds evidence.
  }

  // 3) vercel.json at HEAD (bounded file read)
  let vercelJson: string | null = null;
  let vercelJsonMeta: any = null;
  if (headSha) {
    try {
      const fileRes = await fetchBounded(
        `${GITHUB_API}/repos/${owner}/${repoName}/contents/vercel.json?ref=${headSha}`,
        { headers },
      );
      if (fileRes.ok) {
        const fileMeta = await fileRes.json();
        vercelJsonMeta = {
          path: fileMeta?.path,
          sha: fileMeta?.sha,
          size: fileMeta?.size,
          encoding: fileMeta?.encoding,
          type: fileMeta?.type,
        };
        if (fileMeta?.content && fileMeta?.encoding === 'base64') {
          vercelJson = decodeBase64Utf8(String(fileMeta.content));
        }
      }
    } catch {
      // File read is best-effort; metadata + SHA still bind evidence.
    }
  }

  const evidence: string[] = [];
  evidence.push(
    JSON.stringify({
      kind: 'repository_metadata',
      owner,
      repo: repoName,
      default_branch: defaultBranch,
      head_sha: headSha,
      private: repoData?.private,
      pushed_at: repoData?.pushed_at,
      html_url: repoData?.html_url,
    }).slice(0, 1800),
  );
  if (vercelJson !== null) {
    evidence.push(
      JSON.stringify({
        kind: 'file_at_commit',
        path: 'vercel.json',
        ref: headSha,
        blob_sha: vercelJsonMeta?.sha,
        contents: vercelJson,
      }).slice(0, 4000),
    );
  } else if (headSha) {
    evidence.push(
      JSON.stringify({ kind: 'file_not_found', path: 'vercel.json', ref: headSha }).slice(0, 600),
    );
  }

  const providerIdentity = Object.freeze({
    provider: 'github',
    owner,
    repo: repoName,
    default_branch: defaultBranch,
    head_sha: headSha || null,
  });

  return {
    ...result,
    provider_response_status: result.provider_response_status,
    read_executed: true,
    readability_established: true,
    completeness_established: false,
    evidence,
    evidence_binding_created: evidence.length > 0,
    evidence_binding_count: evidence.length,
    provenance: GITHUB_PROVIDER_AUTHORITY,
    provider_identity: providerIdentity,
    exact_ref_sha: headSha || null,
    reason: headSha
      ? `GitHub connector read ${owner}/${repoName} at commit ${headSha}.`
      : `GitHub connector read ${owner}/${repoName} metadata; HEAD SHA not established.`,
  };
}

// ============================================================================
// Phase 1 — Deep repository inspection at an exact commit SHA (read-only).
//
// inspectRepositoryAtCommit retrieves the recursive file tree and reads bounded
// key-file contents (manifests, README/docs, build config, deployment config,
// tests, env examples, integration configs, and a capped sample of source files)
// so a governed assessment can evaluate the repository as a real business/product
// from the actual code rather than generic advice. Reads ONLY — no blobs created,
// no commits, no branches, no mutations. The inspected commit SHA is pinned in
// the result so the assessment is reproducible against an immutable snapshot.
// ============================================================================

const INSPECT_MAX_FILES = 110;
const INSPECT_MAX_TOTAL_CHARS = 185000;
const INSPECT_MAX_FILE_CHARS = 60000;
const INSPECT_CAP_KEY_SOURCE = 14;
const INSPECT_CAP_API_SOURCE = 6;

const INSPECT_SKIP = /(^|\/)(node_modules|\.git|dist|build|\.next|\.cache|coverage|vendor|target|__pycache__|\.turbo|\.svelte-kit|out)(\/|$)|\.lock$|\.min\.js$|\.min\.css$|\.map$|\.wasm$|\.png$|\.jpg$|\.jpeg$|\.gif$|\.ico$|\.svg$|\.woff2?$|\.ttf$|\.eot$|\.mp4$|\.webm$|\.zip$|\.tar\.gz$/i;

const INSPECT_MANIFEST = /^(package\.json|requirements\.txt|Pipfile|pyproject\.toml|go\.mod|Cargo\.toml|pom\.xml|build\.gradle|build\.gradle\.kts|app\/build\.gradle\.kts|settings\.gradle\.kts|gradle\.properties|gradle\/libs\.versions\.toml|composer\.json|Gemfile|Gemfile\.lock|tsconfig\.json|tsconfig\.base\.json|jsconfig\.json|proguard-rules\.pro|app\/proguard-rules\.pro)$/i;
const INSPECT_ANDROID_MANIFEST = /^app\/src\/main\/AndroidManifest\.xml$/i;
const INSPECT_README = /^(README.*|CHANGELOG.*|CONTRIBUTING.*|LICENSE.*|SECURITY.*)\.(md|mdx|rst|txt)$|^docs\/.*\.(md|mdx|rst)$|^(docs|documentation|doc)\/.*\.(md|mdx|rst)$/i;
const INSPECT_MD = /\.md$/i;
const INSPECT_BUILD = /^(vercel\.json|next\.config\.(js|ts|mjs|cjs|mts)|vite\.config\.(js|ts|mjs)|webpack\.config\.(js|ts)|rollup\.config\.(js|ts)|esbuild\.(js|ts|go)|babel\.config\.(js|json)|\.babelrc.*|Makefile|CMakeLists\.txt|gulpfile\.(js|ts)|Gruntfile\.(js|ts)|tailwind\.config\.(js|ts|cjs|mjs)|postcss\.config\.(js|ts|cjs)|eslint\.config\.(js|ts|mjs)|\.eslintrc.*|prettier\.config.*|\.prettierrc.*|jest\.config.*|vitest\.config.*|playwright\.config.*|cypress\.config.*)$/i;
const INSPECT_DEPLOY = /^(Dockerfile.*|docker-compose.*|\.dockerignore|Procfile|app\.json|netlify\.toml|render\.yaml|fly\.toml|railway\.json|heroku\.yml|\.github\/workflows\/.*|\.github\/dependabot\.yml|\.circleci\/config\.yml|\.gitlab-ci\.yml|azure-pipelines\.yml)$/i;
const INSPECT_ENV = /^\.env\.(example|sample|template|local\.example|defaults)$/i;
const INSPECT_INTEGRATION = /(^config\/|^configs\/|^src\/config\/|^src\/configs\/).+\.(js|ts|json|ya?ml)$/i;
const INSPECT_TEST = /\.(test|spec)\.(js|ts|jsx|tsx|py|go|rs|java|kt)$|(^|\/)(__tests__|test|tests|androidTest|spec|specs)\/.+\.(js|ts|jsx|tsx|py|go|rs|java|kt)$/i;
const INSPECT_ENTRY = /(^|\/)(index|main|app|server|cli|start|run)\.(js|ts|jsx|tsx|mjs|cjs|py|go|rs|rb|php|kt|java)$/i;
// Business-logic source files (.kt/.java/.js) whose names indicate core engines,
// services, managers, or domain logic. These are the files a real business
// assessment must read to distinguish operational from merely implemented.
const INSPECT_KEY_SOURCE = /(^|\/)[A-Z][A-Za-z0-9]*(Engine|Brain|Orchestrator|Manager|Service|Provider|Store|ViewModel|Repository|Controller|Router|Handler|Worker|Ledger|Settlement|Sync|Coach|Demand|Shift|Platform|Earnings|Accessibility|Lifecycle|Driver|Ride|Trip|Fare|Decision|Classifier|Composer|Brain|Truth|Library|Bridge|Adapter)\.(kt|java)$/i;
// Vercel/Node API backend source (api/**/*.js) that backs the mobile app.
const INSPECT_API_SOURCE = /^api\/.+\.(js|ts)$/i;

function classifyInspectFile(path: string): string | null {
  const p = String(path || '');
  if (INSPECT_SKIP.test(p)) return null;
  if (INSPECT_MANIFEST.test(p)) return 'manifest';
  if (INSPECT_ANDROID_MANIFEST.test(p)) return 'android_manifest';
  if (INSPECT_README.test(p)) return 'readme';
  if (INSPECT_BUILD.test(p)) return 'build_config';
  if (INSPECT_DEPLOY.test(p)) return 'deploy';
  if (INSPECT_ENV.test(p)) return 'env_example';
  if (INSPECT_INTEGRATION.test(p)) return 'integration_config';
  if (INSPECT_TEST.test(p)) return 'test';
  if (INSPECT_ENTRY.test(p)) return 'entry';
  if (INSPECT_API_SOURCE.test(p)) return 'api_source';
  if (INSPECT_KEY_SOURCE.test(p)) return 'key_source';
  if (INSPECT_MD.test(p) && p.length < 80) return 'readme';
  return null;
}

export interface InspectKeyFile {
  path: string;
  category: string;
  size: number;
  char_count: number;
  truncated: boolean;
  contents: string;
}

export interface RepositoryInspection {
  owner: string;
  repo: string;
  commit_sha: string;
  default_branch: string;
  read_executed: boolean;
  readability_established: boolean;
  completeness_established: boolean;
  file_count: number;
  tree_truncated: boolean;
  file_tree: Array<{ path: string; type: string; size: number }>;
  key_files_read: InspectKeyFile[];
  total_chars: number;
  categories_present: string[];
  reason: string;
  provenance: string;
  mutations_made: false;
  authority: 'GITHUB_CONNECTOR_READONLY_INSPECTION';
}

export async function inspectRepositoryAtCommit(
  base44: any,
  owner: string,
  repo: string,
  commitSha?: string | null,
): Promise<RepositoryInspection> {
  const fail = (reason: string, partial: Partial<RepositoryInspection> = {}): RepositoryInspection => ({
    owner,
    repo,
    commit_sha: commitSha || '',
    default_branch: '',
    read_executed: false,
    readability_established: false,
    completeness_established: false,
    file_count: 0,
    tree_truncated: false,
    file_tree: [],
    key_files_read: [],
    total_chars: 0,
    categories_present: [],
    reason,
    provenance: GITHUB_PROVIDER_AUTHORITY,
    mutations_made: false as const,
    authority: 'GITHUB_CONNECTOR_READONLY_INSPECTION',
    ...partial,
  });
  let conn: any;
  try {
    conn = await base44.asServiceRole.connectors.getConnection('github');
  } catch (error: any) {
    return fail(error?.message || 'GitHub connector could not be resolved.');
  }
  const accessToken = conn?.accessToken;
  if (!accessToken) return fail('GitHub connector is not authorized; no access token available.');
  const headers = ghHeaders(accessToken);
  const repoPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

  // 1. Resolve default branch + commit SHA.
  let defaultBranch = 'master';
  let resolvedSha = commitSha || '';
  try {
    const repoRes = await fetchBounded(`${GITHUB_API}${repoPath}`, { headers });
    if (!repoRes.ok) {
      const body = await repoRes.text().catch(() => '');
      return fail(`Repository metadata returned HTTP ${repoRes.status}. ${String(body).slice(0, 200)}`);
    }
    const repoData = await repoRes.json();
    defaultBranch = String(repoData?.default_branch || 'master');
    if (!resolvedSha) {
      const branchRes = await fetchBounded(`${GITHUB_API}${repoPath}/branches/${encodeURIComponent(defaultBranch)}`, { headers });
      if (branchRes.ok) {
        const branchData = await branchRes.json();
        resolvedSha = String(branchData?.commit?.sha || '');
      }
    }
    if (!resolvedSha) return fail('Could not resolve a commit SHA to inspect.');
  } catch (error: any) {
    return fail(error?.name === 'AbortError' ? 'Repository metadata read timed out.' : (error?.message || 'Repository metadata fetch failed.'));
  }

  // 2. Recursive file tree at the commit SHA.
  let treeEntries: any[] = [];
  let treeTruncated = false;
  try {
    const treeRes = await fetchBounded(`${GITHUB_API}${repoPath}/git/trees/${encodeURIComponent(resolvedSha)}?recursive=1`, { headers }, 6000);
    if (!treeRes.ok) {
      const body = await treeRes.text().catch(() => '');
      return fail(`File tree returned HTTP ${treeRes.status}. ${String(body).slice(0, 200)}`, { commit_sha: resolvedSha, default_branch: defaultBranch });
    }
    const treeData = await treeRes.json();
    treeTruncated = Boolean(treeData?.truncated);
    treeEntries = Array.isArray(treeData?.tree) ? treeData.tree : [];
  } catch (error: any) {
    return fail(error?.name === 'AbortError' ? 'File tree read timed out.' : (error?.message || 'File tree fetch failed.'), { commit_sha: resolvedSha, default_branch: defaultBranch });
  }

  const blobs = treeEntries.filter((e: any) => e?.type === 'blob' && e?.path);
  const fileTree = blobs.map((e: any) => ({ path: String(e.path), type: 'blob', size: Number(e.size) || 0 }));
  const categoriesPresent = new Set<string>();

  // 3. Select key files to read. Collect ALL classified entries first (no
  // per-category cap yet), sort by (priority, size ASC), then cap per-category
  // in the read loop. This reads the smallest, most diverse files from each
  // category first instead of whichever happened to appear first in tree order.
  const prioritized: Array<{ entry: any; category: string; priority: number }> = [];
  for (const entry of blobs) {
    const cat = classifyInspectFile(entry.path);
    if (!cat) continue;
    categoriesPresent.add(cat);
    const priority = cat === 'manifest' ? 0 : cat === 'android_manifest' ? 0 : cat === 'readme' ? 1 : cat === 'key_source' ? 2 : cat === 'build_config' ? 3 : cat === 'deploy' ? 4 : cat === 'env_example' ? 4 : cat === 'api_source' ? 5 : cat === 'entry' ? 5 : cat === 'integration_config' ? 6 : cat === 'test' ? 7 : 8;
    prioritized.push({ entry, category: cat, priority });
  }
  prioritized.sort((a, b) => a.priority - b.priority || (Number(a.entry.size) - Number(b.entry.size)));

  const keyFiles: InspectKeyFile[] = [];
  let totalChars = 0;
  const readCategoryCounts: Record<string, number> = {};
  for (const { entry, category } of prioritized) {
    if (keyFiles.length >= INSPECT_MAX_FILES) break;
    if (totalChars >= INSPECT_MAX_TOTAL_CHARS) break;
    if (category === 'key_source' && (readCategoryCounts.key_source || 0) >= INSPECT_CAP_KEY_SOURCE) continue;
    if (category === 'api_source' && (readCategoryCounts.api_source || 0) >= INSPECT_CAP_API_SOURCE) continue;
    const size = Number(entry.size) || 0;
    if (size > INSPECT_MAX_FILE_CHARS * 1.5) continue; // skip very large files
    readCategoryCounts[category] = (readCategoryCounts[category] || 0) + 1;
    try {
      const blobRes = await fetchBounded(`${GITHUB_API}${repoPath}/git/blobs/${encodeURIComponent(entry.sha)}`, { headers }, 5000);
      if (!blobRes.ok) continue;
      const blobData = await blobRes.json();
      let contents = '';
      if (blobData?.encoding === 'base64' && typeof blobData.content === 'string') {
        contents = decodeBase64Utf8(blobData.content);
      } else if (typeof blobData?.content === 'string') {
        contents = blobData.content;
      }
      let truncated = false;
      if (contents.length > INSPECT_MAX_FILE_CHARS) {
        contents = contents.slice(0, INSPECT_MAX_FILE_CHARS);
        truncated = true;
      }
      keyFiles.push({ path: String(entry.path), category, size, char_count: contents.length, truncated, contents });
      totalChars += contents.length;
    } catch {
      // best-effort read; skip unreadable blobs
    }
  }

  return {
    owner,
    repo,
    commit_sha: resolvedSha,
    default_branch: defaultBranch,
    read_executed: keyFiles.length > 0 || fileTree.length > 0,
    readability_established: keyFiles.length > 0,
    completeness_established: !treeTruncated && totalChars < INSPECT_MAX_TOTAL_CHARS,
    file_count: fileTree.length,
    tree_truncated: treeTruncated,
    file_tree: fileTree.slice(0, 400),
    key_files_read: keyFiles,
    total_chars: totalChars,
    categories_present: [...categoriesPresent],
    reason: keyFiles.length > 0
      ? `Inspected ${owner}/${repo} at commit ${resolvedSha.slice(0, 7)}: ${fileTree.length} files in tree, ${keyFiles.length} key files read (${totalChars} chars).`
      : `Inspected ${owner}/${repo} tree at ${resolvedSha.slice(0, 7)} (${fileTree.length} files) but no key files were readable.`,
    provenance: GITHUB_PROVIDER_AUTHORITY,
    mutations_made: false as const,
    authority: 'GITHUB_CONNECTOR_READONLY_INSPECTION',
  };
}

// Non-mutating capability check: determines whether GitHub EXPOSES write
// operations via the granted scopes, WITHOUT executing any write. Reads the
// X-OAuth-Scopes response header from a read-only /user call. Write capability
// exposed != write authorized and != write executed.
export async function checkGithubWriteCapability(base44: any) {
  const base = {
    provider: 'github',
    write_capability_exposed: 'UNKNOWN' as string,
    scopes: null as string[] | null,
    method: 'non-mutating X-OAuth-Scopes header inspection',
    reason: '',
    auth_context_available: false,
    provider_response_status: null as number | null,
    write_executed: false,
  };
  let accessToken: string;
  try {
    const conn = await base44.asServiceRole.connectors.getConnection('github');
    accessToken = conn?.accessToken;
  } catch (error: any) {
    return { ...base, reason: error?.message || 'GitHub connector could not be resolved.' };
  }
  if (!accessToken) {
    return {
      ...base,
      reason: 'GitHub connector is not authorized; no access token available.',
    };
  }
  try {
    const res = await fetchBounded(`${GITHUB_API}/user`, { headers: ghHeaders(accessToken) });
    const scopesHeader = res.headers.get('x-oauth-scopes') || '';
    const scopes = scopesHeader
      ? scopesHeader.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];
    const writeExposed = scopes.some((s: string) =>
      /^(repo|delete_repo|admin:|write:|workflow)$/i.test(s),
    );
    return {
      ...base,
      auth_context_available: true,
      provider_response_status: res.status,
      write_capability_exposed: writeExposed ? 'EXPOSED' : 'NOT_EXPOSED',
      scopes,
      reason: writeExposed
        ? 'GitHub token grants a write-capable scope. No write operation was executed.'
        : 'GitHub token scopes do not include a write-capable scope.',
      write_executed: false,
    };
  } catch (error: any) {
    return {
      ...base,
      auth_context_available: true,
      reason: error?.message || 'Capability check failed closed.',
      write_executed: false,
    };
  }
}