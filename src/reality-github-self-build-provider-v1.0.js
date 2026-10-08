import crypto from 'node:crypto';

export const GITHUB_SELF_BUILD_PROVIDER_VERSION = 'reality-github-self-build-provider-v1.0';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(name + '_NOT_CONFIGURED');
  return value;
}

function repoParts(repo) {
  const match = /^([^/]+)\/([^/]+)$/.exec(repo || '');
  if (!match) throw new Error('GITHUB_REPOSITORY_INVALID');
  return match;
}

async function githubRequest(path, { method = 'GET', body } = {}) {
  const token = requireEnv('REALITY_GITHUB_TOKEN');
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28',
      'content-type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(`GITHUB_API_${response.status}`);
    error.provider_error = payload?.message || null;
    error.provider_status = response.status;
    throw error;
  }
  return payload;
}

export function createGitHubSelfBuildProvider({
  repository = process.env.REALITY_GITHUB_REPOSITORY || 'maloney2323/Reality',
} = {}) {
  const [owner, repo] = repoParts(repository);

  return {
    provider_version: GITHUB_SELF_BUILD_PROVIDER_VERSION,

    async createBranch({ baseRef, branch }) {
      const base = await githubRequest(`/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(baseRef)}`);
      const branchRef = `refs/heads/${branch}`;
      const existing = await githubRequest(`/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`).catch((error) => {
        if (error.provider_status === 404) return null;
        throw error;
      });

      if (existing) return { branchSha: existing.object?.sha, branch, reused: true };

      await githubRequest(`/repos/${owner}/${repo}/git/refs`, {
        method: 'POST',
        body: { ref: branchRef, sha: base.object.sha },
      });
      return { branchSha: base.object.sha, branch, reused: false };
    },

    async writeFiles({ branch, baseRef, files, expectedBaseSha = null, buildId }) {
      const ref = await githubRequest(`/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`);
      if (expectedBaseSha && ref.object?.sha !== expectedBaseSha) {
        const error = new Error('SELF_BUILD_BRANCH_MOVED');
        error.expected = expectedBaseSha;
        error.actual = ref.object?.sha || null;
        throw error;
      }

      const commit = await githubRequest(`/repos/${owner}/${repo}/git/commits/${ref.object.sha}`);
      const treeEntries = [];

      for (const file of files) {
        const blob = await githubRequest(`/repos/${owner}/${repo}/git/blobs`, {
          method: 'POST',
          body: { content: file.content, encoding: 'utf-8' },
        });
        treeEntries.push({
          path: file.path,
          mode: file.mode || '100644',
          type: 'blob',
          sha: blob.sha,
        });
      }

      const tree = await githubRequest(`/repos/${owner}/${repo}/git/trees`, {
        method: 'POST',
        body: { base_tree: commit.tree.sha, tree: treeEntries },
      });

      const commitResult = await githubRequest(`/repos/${owner}/${repo}/git/commits`, {
        method: 'POST',
        body: {
          message: `Reality self-build: ${buildId}`,
          tree: tree.sha,
          parents: [ref.object.sha],
        },
      });

      await githubRequest(`/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
        method: 'PATCH',
        body: { sha: commitResult.sha, force: false },
      });

      return { commitSha: commitResult.sha, treeSha: tree.sha };
    },

    async openPullRequest({ branch, baseRef, title, body }) {
      return githubRequest(`/repos/${owner}/${repo}/pulls`, {
        method: 'POST',
        body: { title, head: branch, base: baseRef, body, draft: true },
      });
    },
  };
}

export function buildSelfBuildRequestFingerprint(build) {
  return crypto.createHash('sha256').update(JSON.stringify({
    build_id: build?.build_id,
    authorization_ref: build?.authorization_ref,
    files: (build?.files || []).map((f) => [f.path, f.content]),
  })).digest('hex');
}
