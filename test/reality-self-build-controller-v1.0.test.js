import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSelfBuildProposal,
  authorizeSelfBuild,
  validateSelfBuildContract,
  executeSelfBuild,
} from '../src/reality-self-build-controller-v1.0.js';

test('self-build requires explicit authorization before provider access', async () => {
  const proposal = createSelfBuildProposal({
    requestedBy: 'customer:test',
    objective: 'repair deployment verification',
    files: [{ path: 'src/example.js', content: 'export const ok = true;\n' }],
  });

  assert.equal(proposal.state, 'PROPOSED');
  await assert.rejects(
    () => executeSelfBuild(proposal, { provider: {} }),
    /SELF_BUILD_NOT_AUTHORIZED/
  );
});

test('self-build is isolated to a branch and cannot authorize production merge', async () => {
  const proposal = createSelfBuildProposal({
    requestedBy: 'customer:test',
    objective: 'repair deployment verification',
    files: [{ path: 'src/example.js', content: 'export const ok = true;\n' }],
    verificationPlan: ['run tests', 'independently inspect PR'],
  });

  const build = authorizeSelfBuild(proposal, {
    authorizationRef: 'auth:self-build:test',
    authorizedBy: 'customer:test',
  });

  assert.equal(validateSelfBuildContract(build), true);

  const calls = [];
  const result = await executeSelfBuild(build, {
    provider: {
      async createBranch(args) { calls.push(['branch', args]); return { branchSha: 'base-sha' }; },
      async writeFiles(args) { calls.push(['write', args]); return { commitSha: 'commit-sha' }; },
      async openPullRequest(args) { calls.push(['pr', args]); return { number: 1, url: 'https://github.com/example/pr/1' }; },
    },
  });

  assert.equal(result.state, 'PR_OPENED');
  assert.equal(result.commit_sha, 'commit-sha');
  assert.equal(result.production_merge_permitted, false);
  assert.equal(calls.length, 3);
  assert.match(calls[0][1].branch, /^reality\/build\//);
});

test('self-build rejects path escape', () => {
  const proposal = createSelfBuildProposal({
    requestedBy: 'customer:test',
    objective: 'bad change',
    files: [{ path: '../package.json', content: '{}' }],
  });

  const build = authorizeSelfBuild(proposal, {
    authorizationRef: 'auth:test',
    authorizedBy: 'customer:test',
  });

  assert.throws(() => validateSelfBuildContract(build), /SELF_BUILD_PATH_ESCAPE/);
});
