import test from 'node:test';
import assert from 'node:assert/strict';
import {assessContinuityReconciliation as assess} from '../../src/reality-extensions/reality-continuity-settlement-reconciler.mjs';

const owner = '11111111-1111-4111-8111-111111111111';
const root = '22222222-2222-4222-8222-222222222222';
const worldline = '33333333-3333-4333-8333-333333333333';
const eventId = '44444444-4444-4444-8444-444444444444';
const approvalId = '55555555-5555-4555-8555-555555555555';
const workId = `work:${'a'.repeat(32)}`;
const sourceHash = 'a'.repeat(64);
const artifactHash = 'b'.repeat(64);
const sourceLineage = 'c'.repeat(64);
const currentTip = 'd'.repeat(64);
const outcomeDigest = 'e'.repeat(64);
const settlementArtifactDigest = 'f'.repeat(64);
const commit = '818a74ed47079765153ff80a4d8261486df251f7';

function observedEvidence() {
  return {
    original: {
      owner_id: owner,
      goal_id: 'user-goal:actual',
      original_work_id: workId,
      continuity_root_id: root,
      worldline_id: worldline,
      original_event_id: eventId,
      source_content_hash: sourceHash,
      original_event_lineage_hash: sourceLineage,
      epistemic_status: 'VERIFIED',
      original_job_completed: false
    },
    approval: {
      owner_id: owner,
      original_work_id: workId,
      approval_id: approvalId,
      source: 'AUTHENTICATED_OWNER_EXPLICIT_ACTION',
      target_environment: 'ISOLATED_PREVIEW',
      consumed_once: true,
      artifact_sha256: artifactHash
    },
    installation: {
      original_work_id: workId,
      artifact_sha256: artifactHash,
      installed_commit_sha: commit,
      installed_source_verified: true,
      production_changed: false
    },
    provider: {
      repository: 'maloney2323/Reality',
      run_id: 41390537103,
      run_status: 'completed',
      run_conclusion: 'failure',
      original_job_success: true,
      independent_provider_readback: true,
      resume_job_success: true,
      settlement_job_success: true,
      unrelated_job_failure_verified: true,
      settlement_artifact_digest: settlementArtifactDigest,
      provider_outcome_digest: outcomeDigest,
      evidence_source: 'GITHUB_ACTIONS_API',
      run_head_sha: commit
    },
    settlement: {
      status: 'SETTLED_ISOLATED',
      original_work_id: workId,
      original_job_completed: true,
      independent_outcome_verified: true,
      owner_approval_id: approvalId,
      artifact_sha256: artifactHash,
      installed_commit_sha: commit,
      provider_run_id: 41390537103,
      provider_outcome_digest: outcomeDigest,
      production_changed: false
    },
    ledger: {
      continuity_root_id: root,
      worldline_id: worldline,
      append_only_verified: true,
      original_event_in_chain_verified: true,
      head_lineage_hash: currentTip,
      verified_completion_events: []
    }
  };
}

test('prepares only a non-authorized proposal from the observed job-level settlement evidence', () => {
  const result = assess(observedEvidence());
  assert.equal(result.status, 'RECONCILIATION_REQUIRED');
  assert.equal(result.original_work_id, workId);
  assert.equal(result.universe_settlement_verified, false);
  assert.equal(result.installation_authorized, false);
  assert.equal(result.production_changed, false);
  assert.equal(result.original_job_completed_in_universe, false);
  assert.equal(result.reconciliation.status, 'PROPOSED_NOT_APPENDED');
  assert.equal(result.reconciliation.append_authorized, false);
  assert.equal(result.reconciliation.artifact_sha256, artifactHash);
  assert.equal(result.reconciliation.source_content_hash, sourceHash);
  assert.equal(result.reconciliation.prior_lineage_hash, currentTip);
});

test('artifact receipts bind to one another rather than to a different original event hash', () => {
  const valid = observedEvidence();
  assert.notEqual(valid.original.source_content_hash, valid.approval.artifact_sha256);
  assert.equal(assess(valid).status, 'RECONCILIATION_REQUIRED');

  for (const mutate of [
    value => { value.installation.artifact_sha256 = '0'.repeat(64); },
    value => { value.settlement.artifact_sha256 = '0'.repeat(64); },
    value => { value.settlement.installed_commit_sha = '0'.repeat(40); },
    value => { value.provider.provider_outcome_digest = '0'.repeat(64); }
  ]) {
    const input = observedEvidence();
    mutate(input);
    assert.equal(assess(input).status, 'BLOCKED');
  }
});

test('overall workflow failure requires exact independent successful job evidence', () => {
  for (const mutate of [
    value => { value.provider.settlement_job_success = false; },
    value => { delete value.provider.resume_job_success; },
    value => { delete value.provider.unrelated_job_failure_verified; },
    value => { value.provider.settlement_artifact_digest = 'not-a-sha'; },
    value => { value.provider.independent_provider_readback = false; },
    value => { value.provider.evidence_source = 'DASHBOARD'; }
  ]) {
    const input = observedEvidence();
    mutate(input);
    assert.equal(assess(input).status, 'BLOCKED');
  }
});

test('an advanced tip requires explicit verified ancestry of the original event', () => {
  const missing = observedEvidence();
  delete missing.ledger.original_event_in_chain_verified;
  assert.equal(assess(missing).status, 'BLOCKED');

  const denied = observedEvidence();
  denied.ledger.original_event_in_chain_verified = false;
  assert.equal(assess(denied).status, 'BLOCKED');

  const originalStillAtTip = observedEvidence();
  originalStillAtTip.ledger.head_lineage_hash = sourceLineage;
  delete originalStillAtTip.ledger.original_event_in_chain_verified;
  assert.equal(assess(originalStillAtTip).status, 'RECONCILIATION_REQUIRED');
});

test('foreign, drifted, stale, or production evidence fails closed', () => {
  for (const mutate of [
    value => { value.approval.owner_id = '66666666-6666-4666-8666-666666666666'; },
    value => { value.settlement.goal_id = 'user-goal:foreign'; },
    value => { value.installation.original_work_id = `work:${'f'.repeat(32)}`; },
    value => { value.provider.repository = 'foreign/Reality'; },
    value => { value.provider.run_head_sha = '0'.repeat(40); },
    value => { value.provider.latest_successful_run_id = 41390537104; },
    value => { value.installation.production_changed = true; }
  ]) {
    const input = observedEvidence();
    mutate(input);
    const result = assess(input);
    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.reconciliation, null);
    assert.equal(result.production_changed, false);
  }
});

test('one exact verified completion is read without proposing a duplicate', () => {
  const input = observedEvidence();
  const completion = {
    original_work_id: workId,
    owner_id: owner,
    continuity_root_id: root,
    worldline_id: worldline,
    installed_commit_sha: commit,
    provider_run_id: 41390537103,
    provider_outcome_digest: outcomeDigest,
    epistemic_status: 'VERIFIED',
    constitutional_phase: 'SETTLED',
    original_job_completed: true
  };
  input.ledger.verified_completion_events = [completion];

  const result = assess(input);
  assert.equal(result.status, 'ALREADY_RECONCILED');
  assert.equal(result.universe_settlement_verified, true);
  assert.equal(result.original_job_completed_in_universe, true);
  assert.equal(result.reconciliation, null);

  input.ledger.verified_completion_events = [completion, {...completion}];
  assert.equal(assess(input).status, 'BLOCKED');
});
