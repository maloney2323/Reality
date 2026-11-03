import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyRealityCompletion } from '../../src/reality-extensions/reality-general-execution-receipt.mjs';

const OWNER = '11111111-1111-4111-8111-111111111111';
const WORK = `work:${'c'.repeat(32)}`;
const GOAL = 'verified:user:goal';
const ARTIFACT = 'a'.repeat(64);
const COMMIT = 'b'.repeat(40);
const REPOSITORY = 'reality/reality';

function valid() {
  return {
    owner_id: OWNER,
    goal_id: GOAL,
    original_work_id: WORK,
    artifact_hash: ARTIFACT,
    repository: REPOSITORY,
    signed_owner_approval: {
      verified: true,
      consumed_once: true,
      owner_id: OWNER,
      original_work_id: WORK,
      artifact_hash: ARTIFACT,
      origin: 'AUTHENTICATED_OWNER_EXPLICIT_ACTION',
      reservation_ref: 'supabase:owner:single-use:receipt',
    },
    sandbox: {
      independently_verified: true,
      artifact_hash: ARTIFACT,
      frozen_regression_passed: true,
      governance_preserved: true,
    },
    installation: {
      independent_provider_readback: true,
      original_work_id: WORK,
      artifact_hash: ARTIFACT,
      installed_commit_sha: COMMIT,
      production_changed: false,
      installed_branch: 'feature/reality-customer-repair',
    },
    resumption: {
      independent_provider_readback: true,
      real_execution_observed: true,
      original_work_id: WORK,
      installed_commit_sha: COMMIT,
      executor_run_ref: 'github:actions:run:111:job:222',
      outcome: 'SUCCEEDED',
    },
    settlement: {
      durable_settlement_readback: true,
      independent_outcome_verified: true,
      original_work_id: WORK,
      artifact_hash: ARTIFACT,
      installed_commit_sha: COMMIT,
      receipt_ref: 'supabase:universe_events:33333333-3333-4333-8333-333333333333',
    },
  };
}

const EXPECTED = {
  owner_id: OWNER,
  goal_id: GOAL,
  original_work_id: WORK,
  artifact_hash: ARTIFACT,
  repository: REPOSITORY,
  current_commit_sha: COMMIT,
};

test('accepts complete provider-bound evidence matching trusted provenance', () => {
  const result = verifyRealityCompletion(valid(), EXPECTED);
  assert.deepEqual(result, {
    verified: true,
    status: 'VERIFIED_SETTLED',
    original_work_id: WORK,
    production_changed: false,
  });
});

test('rejects missing provider attestations and non-provider receipt sources', () => {
  const missing = valid();
  missing.installation.independent_provider_readback = false;
  assert.equal(verifyRealityCompletion(missing, EXPECTED).verified, false);

  const fabricated = valid();
  fabricated.resumption.executor_run_ref = 'model:claimed:successful';
  assert.equal(verifyRealityCompletion(fabricated, EXPECTED).verified, false);

  const unverified = valid();
  unverified.settlement.independent_outcome_verified = false;
  assert.equal(verifyRealityCompletion(unverified, EXPECTED).verified, false);
});

test('binds owner, goal, work, repository, artifact, and current commit to trusted values', () => {
  const cases = [
    { expected: { ...EXPECTED, owner_id: '22222222-2222-4222-8222-222222222222' } },
    { expected: { ...EXPECTED, goal_id: 'foreign:goal' } },
    { expected: { ...EXPECTED, original_work_id: `work:${'d'.repeat(32)}` } },
    { expected: { ...EXPECTED, repository: 'foreign/repository' } },
    { expected: { ...EXPECTED, artifact_hash: 'e'.repeat(64) } },
    { expected: { ...EXPECTED, current_commit_sha: 'c'.repeat(40) } },
  ];

  for (const { expected } of cases) {
    assert.equal(verifyRealityCompletion(valid(), expected).verified, false);
  }
});

test('rejects stale or superseded success before otherwise valid evidence', () => {
  const receipt = valid();
  receipt.superseding_success = true;
  receipt.settlement.independent_outcome_verified = false;
  const result = verifyRealityCompletion(receipt, EXPECTED);
  assert.equal(result.verified, false);
  assert.equal(result.reason, 'SUPERSEDED_EVIDENCE');
});

test('model completion fields cannot replace durable settlement', () => {
  const receipt = valid();
  delete receipt.settlement;
  receipt.model_claim = 'FULLY_COMPLETE';
  receipt.completed = true;
  const result = verifyRealityCompletion(receipt, EXPECTED);
  assert.equal(result.verified, false);
  assert.notEqual(result.status, 'VERIFIED_SETTLED');
});
