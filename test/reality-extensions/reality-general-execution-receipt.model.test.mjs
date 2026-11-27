import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyRealityCompletion } from '../../src/reality-extensions/reality-general-execution-receipt.mjs';

const OWNER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const WORK = `work:${'1'.repeat(32)}`;
const ARTIFACT = '2'.repeat(64);
const COMMIT = '3'.repeat(40);

function receipt() {
  return {
    owner_id: OWNER,
    goal_id: 'verified:user:repair',
    original_work_id: WORK,
    artifact_hash: ARTIFACT,
    signed_owner_approval: {
      verified: true,
      consumed_once: true,
      owner_id: OWNER,
      original_work_id: WORK,
      artifact_hash: ARTIFACT,
      origin: 'AUTHENTICATED_OWNER_EXPLICIT_ACTION',
      reservation_ref: 'supabase:owner:single-use:receipt-1',
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
      installed_branch: 'feature/scoped-repair',
    },
    resumption: {
      independent_provider_readback: true,
      real_execution_observed: true,
      original_work_id: WORK,
      installed_commit_sha: COMMIT,
      executor_run_ref: 'github:actions:run:12:job:34',
      outcome: 'SUCCEEDED',
    },
    settlement: {
      durable_settlement_readback: true,
      independent_outcome_verified: true,
      original_work_id: WORK,
      artifact_hash: ARTIFACT,
      installed_commit_sha: COMMIT,
      receipt_ref: 'supabase:universe_events:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    },
  };
}

test('verification is fail-closed and requires one continuous receipt chain', () => {
  assert.deepEqual(verifyRealityCompletion(receipt()), {
    verified: true,
    status: 'VERIFIED_SETTLED',
    original_work_id: WORK,
    production_changed: false,
  });

  for (const value of [null, undefined, 'complete', [], {}]) {
    assert.equal(verifyRealityCompletion(value).verified, false);
  }

  const missingSettlement = receipt();
  delete missingSettlement.settlement;
  missingSettlement.model_claim = 'FULLY_COMPLETE';
  missingSettlement.completed = true;
  assert.equal(verifyRealityCompletion(missingSettlement).verified, false);

  const substitutions = [
    value => { value.signed_owner_approval.owner_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'; },
    value => { value.sandbox.artifact_hash = '4'.repeat(64); },
    value => { value.resumption.installed_commit_sha = '5'.repeat(40); },
    value => { value.settlement.original_work_id = `work:${'6'.repeat(32)}`; },
    value => { value.installation.production_changed = true; },
    value => { value.settlement.independent_outcome_verified = false; },
  ];

  for (const substitute of substitutions) {
    const value = receipt();
    substitute(value);
    assert.equal(verifyRealityCompletion(value).verified, false);
  }
});
