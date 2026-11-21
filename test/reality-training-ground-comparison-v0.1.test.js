import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COMPARISON_LANES, FAILURE_MEASURES, createFrozenComparisonContract,
  sealCeoEventChain, verifyCeoEventChain, recordComparisonTrial,
  compareTrainingGroundRuns, createCeoUpdateTrace,
} from '../src/reality-training-ground-comparison-v0.1.js';

const contract = createFrozenComparisonContract({
  benchmarkId: 'construction-office-frozen-v1',
  modelIdentity: 'openai:test-model:immutable-config',
  cases: [{ id: 'C01', case_digest: 'sha256:frozen01', hidden: false }, { id: 'H01', case_digest: 'sha256:holdout01', hidden: true }],
  scorerVersion: 'independent-scorer:v1',
  scorerDigest: 'sha256:immutable-scorer',
  seed: 'fixed-seed-1',
});
const upgradedEvidence = {
  candidate_digest: 'sha256:upgrade-1',
  approved_candidate_digest: 'sha256:upgrade-1',
  human_approval_ref: 'approval:human-1',
  deployment_ref: 'deploy:verified-1',
  regression_ref: 'ci:passed-1',
  heldout_ref: 'holdout:verified-1',
};
function eventsFor(lane, id, verified = true) {
  const e = (type, extra = {}) => ({ event_id: id + ':' + type, type, actor: type === 'INDEPENDENTLY_VERIFIED' ? 'external-verifier' : 'orchestrator', evidence_refs: [id + ':receipt:' + type], ...extra });
  const stages = [e('WORK_ACCEPTED'), e('EVIDENCE_ADMITTED'), e('STATE_RECONSTRUCTED')];
  if (lane === 'REALITY_GOVERNED_UPGRADED') {
    stages.push(e('FAILURE_DIAGNOSED'), e('UPGRADE_CANDIDATE'),
      e('UPGRADE_TESTED'), e('UPGRADE_APPROVED', { approved: true, candidate_digest: upgradedEvidence.candidate_digest }),
      e('UPGRADE_DEPLOYED', { candidate_digest: upgradedEvidence.candidate_digest }), e('WORK_RESUMED'));
  }
  stages.push(e('AUTHORITY_DECIDED', { authorized: true }), e('ACTION_EXECUTED'), e('OUTCOME_OBSERVED'));
  if (verified) stages.push(e('INDEPENDENTLY_VERIFIED'));
  return stages;
}
function makeTrial(lane, caseId, outcome = 'VERIFIED_COMPLETE', overrides = {}) {
  const id = lane + '-' + caseId;
  return recordComparisonTrial({
    contract, lane, caseId,
    caseDigest: contract.cases.find(c => c.id === caseId).case_digest,
    modelIdentity: contract.model_identity,
    events: eventsFor(lane, id, outcome !== 'UNVERIFIED'),
    outcome,
    verifier: outcome === 'UNVERIFIED' ? null : { kind: 'INDEPENDENT_HARNESS', id: 'independent-scorer', evidence_refs: ['witness:' + id], verdict: outcome },
    annotations: { ...Object.fromEntries(FAILURE_MEASURES.map(m => [m, false])), evidence_refs: ['scored:' + id] },
    measured: { human_minutes: 10, total_cost_usd: 5, evidence_refs: ['billing:' + id] },
    upgradeEvidence: lane === 'REALITY_GOVERNED_UPGRADED' ? upgradedEvidence : null,
    ...overrides,
  });
}

test('freezes the same agent, scorer and case identities across four lanes', () => {
  assert.equal(contract.required_lanes.length, 4);
  assert.equal(contract.frozen, true);
  assert.ok(contract.contract_digest);
  assert.throws(() => createFrozenComparisonContract({
    benchmarkId: 'x', modelIdentity: 'm', cases: [{ id: 'duplicate', case_digest: 'a', hidden: false }, { id: 'duplicate', case_digest: 'b', hidden: true }],
    scorerVersion: 'v', scorerDigest: 'h', seed: 's',
  }), /DUPLICATE_CASE_ID/);
  assert.throws(() => makeTrial('AGENT_ALONE', 'C01', 'VERIFIED_COMPLETE', { modelIdentity: 'different-model' }), /BASE_MODEL_CHANGED/);
});

test('record cannot claim a successful outcome without an independent witness', () => {
  assert.throws(() => makeTrial('AGENT_ALONE', 'C01', 'VERIFIED_COMPLETE', { verifier: null }), /INDEPENDENT_OUTCOME_WITNESS_REQUIRED/);
  assert.throws(() => makeTrial('AGENT_ALONE', 'C01', 'VERIFIED_COMPLETE', { events: eventsFor('AGENT_ALONE', 'no-verifier', false) }), /INDEPENDENT_OUTCOME_WITNESS_REQUIRED/);
  assert.throws(() => makeTrial('AGENT_ALONE', 'C01', 'VERIFIED_COMPLETE', {
    verifier: { kind: 'INDEPENDENT_HARNESS', id: 'independent-scorer', evidence_refs: ['w'], verdict: 'VERIFIED_FAILED' },
  }), /OUTCOME_VERIFIER_MISMATCH/);
});

test('event chain prevents unauthorized actions and unapproved upgrade deployment', () => {
  assert.throws(() => sealCeoEventChain([
    { event_id: 'start', type: 'WORK_ACCEPTED', actor: 'a', evidence_refs: ['r'] },
    { event_id: 'action', type: 'ACTION_EXECUTED', actor: 'a', evidence_refs: ['r2'] },
  ]), /EXECUTION_WITHOUT_AUTHORITY/);
  assert.throws(() => sealCeoEventChain([
    { event_id: 'start', type: 'WORK_ACCEPTED', actor: 'a', evidence_refs: ['r'] },
    { event_id: 'deploy', type: 'UPGRADE_DEPLOYED', candidate_digest: 'other', actor: 'a', evidence_refs: ['r2'] },
  ]), /UNAPPROVED_UPGRADE_DEPLOYMENT/);
  assert.throws(() => makeTrial('REALITY_GOVERNED_UPGRADED', 'C01', 'VERIFIED_COMPLETE', {
    upgradeEvidence: { ...upgradedEvidence, approved_candidate_digest: 'mismatched' },
  }), /EXACT_UPGRADE_APPROVAL_AND_TEST_EVIDENCE_REQUIRED/);
  const chain = sealCeoEventChain(eventsFor('AGENT_ALONE', 'test-chain'));
  assert.equal(verifyCeoEventChain(chain), true);
  chain.events[0].event.type = 'ACTION_EXECUTED';
  assert.equal(verifyCeoEventChain(chain), false);
});

test('baseline, guardrails, Reality, and approved upgrade yield separately measurable gains', () => {
  const trials = [];
  for (const lane of COMPARISON_LANES) {
    for (const c of contract.cases) {
      let outcome = 'VERIFIED_COMPLETE';
      if (c.hidden && lane !== 'REALITY_GOVERNED_UPGRADED') outcome = 'VERIFIED_FAILED';
      const errors = Object.fromEntries(FAILURE_MEASURES.map(m => [m, false]));
      if (lane === 'AGENT_ALONE') {
        errors.hallucination_escape = true;
        errors.unauthorized_action_escape = true;
      }
      if (lane === 'STANDARD_GUARDRAILS') errors.legitimate_action_overblock = true;
      const t = makeTrial(lane, c.id, outcome, {
        annotations: { ...errors, evidence_refs: ['expert-scored:' + lane + ':' + c.id] },
        measured: { human_minutes: lane === 'REALITY_GOVERNED_UPGRADED' ? 3 : 10, total_cost_usd: lane === 'REALITY_GOVERNED_UPGRADED' ? 8 : 5, evidence_refs: ['clock-and-cost:' + lane + ':' + c.id] },
      });
      trials.push(t);
    }
  }
  const report = compareTrainingGroundRuns({ contract, trials });
  assert.equal(report.status, 'FULLY_MEASURED');
  assert.equal(report.lanes.AGENT_ALONE.verified_completion_rate, 0.5);
  assert.equal(report.lanes.REALITY_GOVERNED.verified_completion_rate, 0.5);
  assert.equal(report.lanes.REALITY_GOVERNED_UPGRADED.verified_completion_rate, 1);
  assert.equal(report.deltas.governance_unauthorized_action_escape_rate, -1);
  assert.equal(report.deltas.approved_upgrade_completion_rate, 0.5);
  assert.equal(report.deltas.newly_verified_hidden_case_successes, 1);
  assert.equal(report.deltas.upgraded_total_human_minutes_change, -14);
  assert.equal(report.deltas.upgraded_total_cost_usd_change, 6);
  assert.equal(report.lanes.REALITY_GOVERNED_UPGRADED.cost_per_verified_completion, 8);
  const trace = createCeoUpdateTrace(trials[7]);
  assert.equal(trace.outcome, 'VERIFIED_COMPLETE');
  assert.ok(trace.events.some(e => e.stage === 'UPGRADE_DEPLOYED'));
  assert.ok(trace.events.every(e => e.evidence_refs.length));
});

test('missing independent evidence is never silently counted as zero failure or cost savings', () => {
  const partial = [];
  for (const lane of COMPARISON_LANES) {
    partial.push(makeTrial(lane, 'C01'));
    partial.push(makeTrial(lane, 'H01', 'UNVERIFIED', {
      annotations: {}, measured: {},
    }));
  }
  const report = compareTrainingGroundRuns({ contract, trials: partial });
  assert.equal(report.status, 'PARTIAL_EVIDENCE');
  assert.equal(report.lanes.AGENT_ALONE.verified_completion_rate, null);
  assert.equal(report.lanes.AGENT_ALONE.failure_rates.hallucination_escape, null);
  assert.equal(report.lanes.AGENT_ALONE.cost_per_verified_completion, null);
  assert.equal(report.deltas.approved_upgrade_completion_rate, null);
  assert.equal(report.deltas.newly_verified_hidden_case_successes, null);
});

test('rejects unmatched or tampered comparative evidence', () => {
  const trials = COMPARISON_LANES.flatMap(l => [makeTrial(l, 'C01'), makeTrial(l, 'H01')]);
  assert.throws(() => compareTrainingGroundRuns({ contract, trials: trials.slice(1) }), /MISSING_OR_DUPLICATE_MATCHED_CASES/);
  const altered = [...trials];
  altered[0] = { ...altered[0], outcome: 'VERIFIED_FAILED' };
  assert.throws(() => compareTrainingGroundRuns({ contract, trials: altered }), /TRIAL_INTEGRITY_OR_COHORT_MISMATCH/);
});
