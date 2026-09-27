import assert from 'node:assert/strict';
import {
  buildContinuitySnapshot,
  buildExecutionRequest,
  digestExecutionTarget,
  digestExecutionCandidate,
} from '../base44/shared/reality-core/reality-executor-v0.1.js';
import { verifyGithubExecutionOutcome } from '../base44/shared/reality-core/github-execution-verification-v0.1.js';

const snapshot = await buildContinuitySnapshot({
  continuity_state_id: 'cs:github:test',
  world_id: 'world:test',
  transition_type: 'GITHUB_TEST',
  transition_reason: 'G4 receipt verification',
  evidence_refs: ['e:test'],
  epistemic_state: {},
  open_debt: [],
  created_at: '2026-09-27T15:00:00.000Z',
});

const target = {
  repository: 'maloney2323/Reality',
  base_ref: 'reality-governed-dev-001',
  changed_paths: ['a.js', 'b.js'],
};
const candidate = { candidate_id: 'candidate:g4:test' };
const auth = {
  authorization_id: 'auth:g4:test',
  continuity_state_id: snapshot.continuity_state_id,
  continuity_state_digest: snapshot.state_digest,
  action_class: 'GITHUB_CREATE_BRANCH_COMMIT_PR',
  target_digest: await digestExecutionTarget(target),
  candidate_digest: await digestExecutionCandidate(candidate),
  issued_at: '2026-09-27T15:00:00.000Z',
  expires_at: '2026-09-27T15:05:00.000Z',
  status: 'ISSUED',
};
const request = await buildExecutionRequest({
  request_id: 'req:g4:test',
  authorization: auth,
  continuity_snapshot: snapshot,
  action_class: auth.action_class,
  target,
  candidate,
  requested_at: '2026-09-27T15:00:00.000Z',
});

let result = await verifyGithubExecutionOutcome({
  request,
  observed: {
    repository: target.repository,
    base_ref: target.base_ref,
    branch: 'reality/test-branch',
    commit_sha: 'abc123',
    pull_request_url: 'https://example.test/pr/1',
    pull_request_number: 1,
    changed_paths: target.changed_paths,
  },
});
assert.equal(result.verified, true);
assert.equal(result.receipt_eligible, true);

result = await verifyGithubExecutionOutcome({
  request,
  observed: {
    repository: target.repository,
    base_ref: target.base_ref,
    branch: 'reality/test-branch',
    commit_sha: 'abc123',
    pull_request_url: 'https://example.test/pr/1',
    pull_request_number: 1,
    changed_paths: ['a.js'],
  },
});
assert.equal(result.verified, false);
assert.ok(result.failures.includes('CHANGED_PATHS_MISMATCH'));

console.log('Reality GitHub G4 verification contract tests: PASS');
