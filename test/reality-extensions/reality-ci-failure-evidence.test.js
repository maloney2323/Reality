import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyVerifiedCiFailure } from '../../src/reality-extensions/reality-ci-failure-evidence.mjs';

function evidence(overrides = {}) {
  return {
    owner_id: 'owner:test-owner',
    goal_id: 'user-goal:test-goal',
    original_work_id: `work:${'1'.repeat(32)}`,
    repository: 'maloney2323/Reality',
    source: 'GITHUB_ACTIONS_INDEPENDENT_PROVIDER_READBACK',
    provider_readback_verified: true,
    original_goal_verified: true,
    repository_base_sha: 'a'.repeat(40),
    run_head_sha: 'a'.repeat(40),
    latest_head_sha: 'a'.repeat(40),
    run_id: 101,
    job_id: 202,
    run_status: 'completed',
    run_conclusion: 'failure',
    run_url: 'https://github.com/maloney2323/Reality/actions/runs/101',
    failure_log_sha256: 'b'.repeat(64),
    error_code: 'ERR_MODULE_NOT_FOUND',
    missing_capability_id: 'reality.ci-failure-evidence-v1',
    current_capability_registry_status: 'ABSENT',
    frozen_regression_manifest_ref: 'first-ci-evidence-gap-v1',
    frozen_regression_sha256: 'c'.repeat(64),
    source_receipt_ref: 'github:actions:run:101:job:202:verified',
    superseding_success: null,
    ...overrides,
  };
}

function assertNoAuthority(result) {
  assert.equal(result.installation_authorized, false);
  assert.equal(result.external_execution_authorized, false);
  assert.equal(result.original_job_completed, false);
  assert.equal(result.production_changed, false);
}

test('complete provider-bound evidence nominates generation without approval', () => {
  const input = evidence();
  const result = classifyVerifiedCiFailure(input);

  assert.equal(result.decision, 'MISSING_CAPABILITY');
  assert.equal(result.can_generate_candidate, true);
  assert.equal(result.failure_log_sha256, input.failure_log_sha256);
  assert.equal(result.frozen_regression_sha256, input.frozen_regression_sha256);
  assert.equal(result.source_receipt_ref, input.source_receipt_ref);
  assertNoAuthority(result);
});

test('receipt and URL must be bound to the attested run and job', () => {
  for (const patch of [
    { source_receipt_ref: 'github:actions:run:999:job:202:verified' },
    { source_receipt_ref: 'github:actions:run:101:job:999:verified' },
    { source_receipt_ref: 'github:actions:run:101:job:202:model-claimed' },
    { run_url: 'https://github.com/maloney2323/Reality/actions/runs/999' },
  ]) {
    const result = classifyVerifiedCiFailure(evidence(patch));
    assert.equal(result.decision, 'INSUFFICIENT_EVIDENCE');
    assert.equal(result.can_generate_candidate, false);
    assertNoAuthority(result);
  }
});

test('all three exact current SHAs are independently validated and must agree', () => {
  for (const patch of [
    { repository_base_sha: 'not-a-sha' },
    { run_head_sha: 'd'.repeat(40) },
    { latest_head_sha: 'e'.repeat(40) },
    { failure_log_sha256: 'b'.repeat(63) },
    { frozen_regression_sha256: 'C'.repeat(64) },
  ]) {
    const result = classifyVerifiedCiFailure(evidence(patch));
    assert.equal(result.decision, 'INSUFFICIENT_EVIDENCE');
    assert.equal(result.can_generate_candidate, false);
  }
});

test('forged, foreign, and incomplete provenance fails closed', () => {
  for (const patch of [
    { repository: 'attacker/Reality' },
    { source: 'GITHUB_ISSUE_TEXT' },
    { provider_readback_verified: false },
    { original_goal_verified: false },
    { owner_id: 'foreign-owner' },
    { goal_id: 'foreign-goal' },
    { original_work_id: 'work:not-hex' },
    { run_id: 0 },
    { job_id: null },
    { missing_capability_id: 'forged.capability' },
    { frozen_regression_manifest_ref: 'other-manifest' },
  ]) {
    const result = classifyVerifiedCiFailure(evidence(patch));
    assert.equal(result.decision, 'INSUFFICIENT_EVIDENCE');
    assert.equal(result.can_generate_candidate, false);
    assertNoAuthority(result);
  }
});

test('verified newer green run makes the failure stale before generation', () => {
  const result = classifyVerifiedCiFailure(evidence({
    superseding_success: {
      repository: 'maloney2323/Reality',
      run_head_sha: 'a'.repeat(40),
      run_id: 102,
      run_status: 'completed',
      run_conclusion: 'success',
      independently_verified: true,
    },
  }));

  assert.equal(result.decision, 'STALE_OR_ALREADY_REPAIRED');
  assert.equal(result.can_generate_candidate, false);
  assertNoAuthority(result);
});

test('malformed or unverified superseding data cannot be ignored', () => {
  for (const superseding_success of [
    {},
    { repository: 'maloney2323/Reality', run_id: 102 },
    {
      repository: 'maloney2323/Reality',
      run_head_sha: 'a'.repeat(40),
      run_id: 102,
      run_status: 'completed',
      run_conclusion: 'success',
      independently_verified: false,
    },
  ]) {
    const result = classifyVerifiedCiFailure(evidence({ superseding_success }));
    assert.equal(result.decision, 'INSUFFICIENT_EVIDENCE');
    assert.equal(result.can_generate_candidate, false);
  }
});

test('authority errors and active capabilities never become generation candidates', () => {
  for (const error_code of [
    'PERMISSION_DENIED',
    'SERVICE_ROLE_REQUIRED',
    'AUTHORITY_REQUIRED',
    'CREDENTIAL_UNAVAILABLE',
  ]) {
    const result = classifyVerifiedCiFailure(evidence({ error_code }));
    assert.equal(result.decision, 'AUTHORITY_OR_CONFIGURATION_BLOCK');
    assert.equal(result.can_generate_candidate, false);
  }

  const repair = classifyVerifiedCiFailure(evidence({
    error_code: 'ERR_ASSERTION',
    current_capability_registry_status: 'ACTIVE',
  }));
  assert.equal(repair.decision, 'REPAIR_EXISTING_DEFECT');
  assert.equal(repair.can_generate_candidate, false);
});
