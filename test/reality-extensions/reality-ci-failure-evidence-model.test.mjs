import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyVerifiedCiFailure } from '../../src/reality-extensions/reality-ci-failure-evidence.mjs';

function fixture(patch = {}) {
  return {
    owner_id: 'owner:model-test',
    goal_id: 'user-goal:model-test',
    original_work_id: `work:${'1'.repeat(32)}`,
    repository: 'maloney2323/Reality',
    source: 'GITHUB_ACTIONS_INDEPENDENT_PROVIDER_READBACK',
    provider_readback_verified: true,
    original_goal_verified: true,
    repository_base_sha: '2'.repeat(40),
    run_head_sha: '2'.repeat(40),
    latest_head_sha: '2'.repeat(40),
    run_id: 42,
    job_id: 7,
    run_status: 'completed',
    run_conclusion: 'failure',
    run_url: 'https://github.com/maloney2323/Reality/actions/runs/42',
    failure_log_sha256: '3'.repeat(64),
    error_code: 'ERR_MODULE_NOT_FOUND',
    missing_capability_id: 'reality.ci-failure-evidence-v1',
    current_capability_registry_status: 'ABSENT',
    frozen_regression_manifest_ref: 'model-authored-regression',
    frozen_regression_sha256: '4'.repeat(64),
    source_receipt_ref: 'github:actions:run:42:job:7:verified',
    superseding_success: null,
    ...patch,
  };
}

function assertNoAuthority(result) {
  assert.equal(result.installation_authorized, false);
  assert.equal(result.external_execution_authorized, false);
  assert.equal(result.original_job_completed, false);
  assert.equal(result.production_changed, false);
}

test('only the exact absent CI evidence capability is a candidate', () => {
  const result = classifyVerifiedCiFailure(fixture());
  assert.equal(result.decision, 'MISSING_CAPABILITY');
  assert.equal(result.can_generate_candidate, true);
  assertNoAuthority(result);

  for (const patch of [
    { missing_capability_id: 'some.other-capability' },
    { error_code: 'ERR_UNKNOWN' },
    { current_capability_registry_status: 'UNKNOWN' },
  ]) {
    const rejected = classifyVerifiedCiFailure(fixture(patch));
    assert.equal(rejected.can_generate_candidate, false);
    assertNoAuthority(rejected);
  }
});

test('receipt, URL, hash, and commit scope must agree exactly', () => {
  for (const patch of [
    { source_receipt_ref: 'github:actions:run:42:job:8:verified' },
    { run_url: 'https://github.com/maloney2323/Reality/actions/runs/41' },
    { failure_log_sha256: 'not-a-hash' },
    { repository_base_sha: '5'.repeat(40) },
    { latest_head_sha: '5'.repeat(40) },
  ]) {
    const result = classifyVerifiedCiFailure(fixture(patch));
    assert.equal(result.can_generate_candidate, false);
    assertNoAuthority(result);
  }
});

test('unverified superseding metadata is insufficient and verified green is stale', () => {
  const unverified = classifyVerifiedCiFailure(fixture({
    superseding_success: {
      repository: 'maloney2323/Reality',
      run_head_sha: '2'.repeat(40),
      run_id: 43,
      run_status: 'completed',
      run_conclusion: 'success',
      independently_verified: false,
    },
  }));
  assert.equal(unverified.decision, 'INSUFFICIENT_EVIDENCE');
  assert.equal(unverified.can_generate_candidate, false);
  assertNoAuthority(unverified);

  const verified = classifyVerifiedCiFailure(fixture({
    superseding_success: {
      repository: 'maloney2323/Reality',
      run_head_sha: '2'.repeat(40),
      run_id: 43,
      run_status: 'completed',
      run_conclusion: 'success',
      independently_verified: true,
    },
  }));
  assert.equal(verified.decision, 'STALE_OR_ALREADY_REPAIRED');
  assert.equal(verified.can_generate_candidate, false);
  assertNoAuthority(verified);
});
