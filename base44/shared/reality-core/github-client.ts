// Shared GitHub API helpers for Reality backend functions.
// Extracted so functions like reality-hcast-proof and reality-code-apply-candidate
// share one implementation instead of maintaining parallel copies.

const GITHUB_API = 'https://api.github.com';
const GITHUB_API_VERSION = '2026-03-10';

export function githubJsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function githubHeaders(accessToken: string) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${accessToken}`,
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
    'User-Agent': 'Reality-Backend',
  };
}

export async function githubRequest(accessToken: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: { ...githubHeaders(accessToken), ...(init.headers || {}) },
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

export function encodeBase64Utf8(value: string) {
  return btoa(unescape(encodeURIComponent(String(value || ''))));
}

function decodeBase64Utf8(b64: string) {
  return decodeURIComponent(escape(atob(String(b64 || '').replace(/\s/g, ''))));
}

// Apply a set of exact file edits to a GitHub repository as a single commit on a
// new branch, then open a pull request. Used by both the governed candidate
// pipeline (reality-code-apply-candidate) and the direct grounded request flow
// (reality-code-request). Does NOT merge, deploy, or authorize — the human merges.
export async function applyCodeEditsToGitHub(
  accessToken: string,
  owner: string,
  repo: string,
  baseRef: string,
  branchName: string,
  edits: Array<{ path: string; replacement_content: string }>,
  commitMessage: string,
  prTitle: string,
  prBody: string,
) {
  const repoPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

  // 1. Resolve base commit SHA from the base ref.
  const baseRefData = await githubRequest(accessToken, `${repoPath}/git/refs/heads/${encodeURIComponent(baseRef)}`);
  const baseCommitSha = baseRefData?.object?.sha;
  if (!baseCommitSha) throw new Error('Could not resolve base commit SHA.');

  // 2. Get the base tree SHA.
  const baseCommitData = await githubRequest(accessToken, `${repoPath}/git/commits/${encodeURIComponent(baseCommitSha)}`);
  const baseTreeSha = baseCommitData?.tree?.sha;
  if (!baseTreeSha) throw new Error('Could not resolve base tree SHA.');

  // 3. Create a blob for each edit's replacement content.
  const treeEntries = [];
  for (const edit of edits) {
    const blob = await githubRequest(accessToken, `${repoPath}/git/blobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: encodeBase64Utf8(edit.replacement_content), encoding: 'base64' }),
    });
    treeEntries.push({ path: edit.path, mode: '100644', type: 'blob', sha: blob.sha });
  }

  // 4. Create the new tree on top of the base tree.
  const newTree = await githubRequest(accessToken, `${repoPath}/git/trees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base_tree: baseTreeSha, tree: treeEntries }),
  });

  // 5. Create the commit.
  const newCommit = await githubRequest(accessToken, `${repoPath}/git/commits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: commitMessage, tree: newTree.sha, parents: [baseCommitSha] }),
  });

  // 6. Create the branch.
  await githubRequest(accessToken, `${repoPath}/git/refs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: newCommit.sha }),
  });

  // 7. Open the pull request.
  const pr = await githubRequest(accessToken, `${repoPath}/pulls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: prTitle, head: branchName, base: baseRef, body: prBody }),
  });

  return { branch: branchName, commit_sha: newCommit.sha, pull_request_url: pr?.html_url || null, pull_request_number: pr?.number || null };
}

// Read a bounded source-file tree + selected file contents for an external repo.
// Used by reality-code-request to ground a change in the actual source of a
// software company's repository rather than hallucinated context.
export async function readExternalRepoFileTree(
  accessToken: string,
  owner: string,
  repo: string,
  baseRef: string,
) {
  const repoPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const branch = await githubRequest(accessToken, `${repoPath}/branches/${encodeURIComponent(baseRef)}`);
  const treeSha = branch?.commit?.commit?.tree?.sha;
  if (!treeSha) throw new Error('Could not resolve repository tree SHA.');
  const tree = await githubRequest(accessToken, `${repoPath}/git/trees/${encodeURIComponent(treeSha)}?recursive=1`);
  return Array.isArray(tree?.tree) ? tree.tree : [];
}

export async function fetchBlobContent(accessToken: string, owner: string, repo: string, blobSha: string) {
  const repoPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const blob = await githubRequest(accessToken, `${repoPath}/git/blobs/${encodeURIComponent(blobSha)}`);
  if (blob?.encoding === 'base64' && typeof blob.content === 'string') {
    return decodeBase64Utf8(blob.content);
  }
  return '';
}