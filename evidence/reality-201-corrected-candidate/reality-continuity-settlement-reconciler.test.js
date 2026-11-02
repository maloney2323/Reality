import test from 'node:test';
import assert from 'node:assert/strict';
import {assessContinuityReconciliation} from '../../src/reality-extensions/reality-continuity-settlement-reconciler.mjs';

const owner = '11111111-1111-4111-8111-111111111111';
const root = '22222222-2222-4222-8222-222222222222';
const worldline = '33333333-3333-4333-8333-333333333333';
const eventId = '44444444-4444-4444-8444-444444444444';
const approvalId = '55555555-5555-4555-8555-555555555555';
const workId = `work:${'a'.repeat(32)}`;
const artifact = 'b'.repeat(64);
const lineage = 'c'.repeat(64);
const digest = 'd'.repeat(64);
const commit = 'e'.repeat(40);

function evidence() {
  return {
    original: {
      owner_id: owner,
      goal_id: 'user-goal:test',
      original_work_id: workId,
      continuity_root_id: root,
      worldline_id: worldline,
      original_event_id: eventId,
      epistemic_status: 'VERIFIED',
      original_job_completed: false,
      source_content_hash: artifact,
      original_event_lineage_hash: lineage
    },
    approval: {
      owner_id: owner,
      original_work_id: workId,
      approval_id: approvalId,
      target_environment: 'ISOLATED_PREVIEW',
      consumed_once: true,
      source: 'AUTHENTICATED_OWNER_EXPLICIT_ACTION',
      artifact_sha256: artifact
    },
    installation: {
      original_work_id: workId,
      artifact_sha256: artifact,
      installed_commit_sha: commit,
      installed_source_verified: true,
      production_changed: false
    },
    provider: {
      repository: 'maloney2323/Reality',
      run_id: 42,
      run_status: 'completed',
      run_conclusion: 'success',
      original_job_success: true,
      independent_provider_readback: true,
      provider_outcome_digest: digest,
      run_head_sha: commit,
      evidence_source: 'GITHUB_ACTIONS_API'
    },
    settlement: {
      status: 'SETTLED_ISOLATED',
      original_work_id: workId,
      original_job_completed: true,
      independent_outcome_verified: true,
      owner_approval_id: approvalId,
      artifact_sha256: artifact,
      installed_commit_sha: commit,
      provider_run_id: 42,
      provider_outcome_digest: digest,
      production_changed: false
    },
    ledger: {
      continuity_root_id: root,
      worldline_id: worldline,
      append_only_verified: true,
      head_lineage_hash: lineage,
      verified_completion_events: []
    }
  };
}

test('prepares a non-appended, non-authorized proposal from bound evidence', () => {
  const result = assessContinuityReconciliation(evidence());
  assert.equal(result.status, 'RECONCILIATION_REQUIRED');
  assert.equal(result.universe_settlement_verified, false);
  assert.equal(result.installation_authorized, false);
  assert.equal(result.reconciliation.status, 'PROPOSED_NOT_APPENDED');
  assert.equal(result.reconciliation.append_authorized, false);
  assert.equal(result.reconciliation.installed_commit_sha, commit);
});

test('rejects foreign repositories, provider SHA drift, and dashboard evidence', () => {
  const foreign = evidence();
  foreign.provider.repository = 'attacker/Reality';
  assert.equal(assessContinuityReconciliation(foreign).status, 'BLOCKED');

  const drifted = evidence();
  drifted.provider.run_head_sha = 'f'.repeat(40);
  assert.equal(assessContinuityReconciliation(drifted).status, 'BLOCKED');

  const dashboard = evidence();
  dashboard.provider.evidence_source = 'DASHBOARD';
  assert.equal(assessContinuityReconciliation(dashboard).status, 'BLOCKED');
});

test('rejects a stale run before generating a proposal', () => {
  const stale = evidence();
  stale.provider.latest_successful_run_id = 43;
  const result = assessContinuityReconciliation(stale);
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reason, 'PROVIDER_RUN_STALE_OR_SUPERSEDED');
  assert.equal(result.reconciliation, null);
});

test('reads exactly one matching independently verified completion without proposing another', () => {
  const input = evidence();
  input.ledger.verified_completion_events.push({
    original_work_id: workId,
    owner_id: owner,
    continuity_root_id: root,
    worldline_id: worldline,
    installed_commit_sha: commit,
    provider_run_id: 42,
    provider_outcome_digest: digest,
    epistemic_status: 'VERIFIED',
    constitutional_phase: 'SETTLED',
    original_job_completed: true
  });

  const result = assessContinuityReconciliation(input);
  assert.equal(result.status, 'ALREADY_RECONCILED');
  assert.equal(result.universe_settlement_verified, true);
  assert.equal(result.reconciliation, null);
});

test('foreign goal bindings and duplicate completions fail closed', () => {
  const foreignGoal = evidence();
  foreignGoal.settlement.goal_id = 'user-goal:foreign';
  assert.equal(assessContinuityReconciliation(foreignGoal).status, 'BLOCKED');

  const duplicate = evidence();
  const completion = {
    original_work_id: workId,
    owner_id: owner,
    continuity_root_id: root,
    worldline_id: worldline,
    installed_commit_sha: commit,
    provider_run_id: 42,
    provider_outcome_digest: digest,
    epistemic_status: 'VERIFIED',
    constitutional_phase: 'SETTLED',
    original_job_completed: true
  };
  duplicate.ledger.verified_completion_events = [completion, {...completion}];
  assert.equal(assessContinuityReconciliation(duplicate).status, 'BLOCKED');
});
