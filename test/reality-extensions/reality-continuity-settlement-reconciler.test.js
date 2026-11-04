import test from 'node:test';
import assert from 'node:assert/strict';
import { assessContinuityReconciliation as assess } from '../../src/reality-extensions/reality-continuity-settlement-reconciler.mjs';

const owner = '11111111-1111-4111-8111-111111111111';
const root = '22222222-2222-4222-8222-222222222222';
const worldline = '33333333-3333-4333-8333-333333333333';
const sourceEvent = '44444444-4444-4444-8444-444444444444';
const approvalId = '55555555-5555-4555-8555-555555555555';
const workId = `work:${'a'.repeat(32)}`;
const sourceHash = 'a'.repeat(64);
const artifactHash = 'b'.repeat(64);
const sourceLineage = 'c'.repeat(64);
const ledgerTip = 'd'.repeat(64);
const outcomeDigest = 'e'.repeat(64);
const outcomeArtifact = 'f'.repeat(64);
const commit = '818a74ed47079765153ff80a4d8261486df251f7';

function customerEvidence() {
  return {
    original: {
      owner_id: owner,
      goal_id: 'user-goal:test',
      original_work_id: workId,
      continuity_root_id: root,
      worldline_id: worldline,
      original_event_id: sourceEvent,
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
      evidence_source: 'GITHUB_ACTIONS_API',
      run_id: 41390537103,
      current_run_id: 41390537103,
      run_head_sha: commit,
      run_status: 'completed',
      run_conclusion: 'failure',
      original_job_success: true,
      resume_job_success: true,
      settlement_job_success: true,
      unrelated_job_failure_verified: true,
      independent_provider_readback: true,
      settlement_artifact_digest: outcomeArtifact,
      provider_outcome_digest: outcomeDigest
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
      head_lineage_hash: ledgerTip,
      verified_completion_events: []
    }
  };
}

test('proposes reconciliation when distinct source and artifact hashes are fully bound', () => {
  const result = assess(customerEvidence());
  assert.equal(result.status, 'RECONCILIATION_REQUIRED');
  assert.equal(result.reconciliation.source_content_hash, sourceHash);
  assert.equal(result.reconciliation.artifact_sha256, artifactHash);
  assert.equal(result.reconciliation.prior_lineage_hash, ledgerTip);
  assert.equal(result.reconciliation.append_authorized, false);
  assert.equal(result.installation_authorized, false);
  assert.equal(result.production_changed, false);
});

test('requires job-level proof for settlement from an overall failed workflow', () => {
  for (const mutate of [
    x => { x.provider.resume_job_success = false; },
    x => { x.provider.settlement_job_success = false; },
    x => { delete x.provider.unrelated_job_failure_verified; },
    x => { x.provider.settlement_artifact_digest = 'not-a-sha'; },
    x => { delete x.provider.evidence_source; }
  ]) {
    const evidence = customerEvidence();
    mutate(evidence);
    assert.equal(assess(evidence).status, 'BLOCKED');
  }
});

test('rejects unverified ancestry, foreign source, SHA drift, and superseding runs', () => {
  const ancestry = customerEvidence();
  ancestry.ledger.original_event_in_chain_verified = false;
  assert.equal(assess(ancestry).status, 'BLOCKED');

  const foreignSource = customerEvidence();
  foreignSource.provider.evidence_source = 'MODEL';
  assert.equal(assess(foreignSource).status, 'BLOCKED');

  const drift = customerEvidence();
  drift.provider.run_head_sha = '0'.repeat(40);
  assert.equal(assess(drift).status, 'BLOCKED');

  const superseded = customerEvidence();
  superseded.provider.latest_successful_run_id = 41390537104;
  assert.equal(assess(superseded).status, 'BLOCKED');
});

test('reads one exact verified completion but blocks duplicates and contradictions', () => {
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

  const existing = customerEvidence();
  existing.ledger.verified_completion_events = [completion];
  const result = assess(existing);
  assert.equal(result.status, 'ALREADY_RECONCILED');
  assert.equal(result.universe_settlement_verified, true);
  assert.equal(result.reconciliation, null);

  const duplicate = customerEvidence();
  duplicate.ledger.verified_completion_events = [completion, { ...completion }];
  assert.equal(assess(duplicate).status, 'BLOCKED');

  const contradictory = customerEvidence();
  contradictory.ledger.verified_completion_events = [
    { ...completion, installed_commit_sha: '0'.repeat(40) }
  ];
  assert.equal(assess(contradictory).status, 'BLOCKED');
});
