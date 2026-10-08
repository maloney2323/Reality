import assert from 'node:assert/strict';
import {
  ATTENTION_ENGINE_VERSION,
  assessAttentionCandidate,
  buildAttentionAgenda,
  proposeAttentionWork,
} from '../src/reality-attention-stewardship-v0.1.js';

const failingSystem = assessAttentionCandidate({
  observation_id: 'obs:production-failure',
  domain: 'SYSTEM_HEALTH',
  failure: true,
  severity: 'HIGH',
  evidence_references: ['vercel-live-read:1', 'github-run:2'],
});

assert.equal(failingSystem.engine_version, ATTENTION_ENGINE_VERSION);
assert.equal(failingSystem.domain, 'SYSTEM_HEALTH');
assert.equal(failingSystem.materiality, 'HIGH');
assert.equal(failingSystem.disposition, 'INVESTIGATE');
assert.equal(failingSystem.action_authorized, false);
assert.equal(failingSystem.truth_authorized, false);
assert.equal(failingSystem.authority, 'NONE_UNLESS_EXPLICITLY_ESTABLISHED');

const unknownSignal = assessAttentionCandidate({
  observation_id: 'obs:possible-competitor-change',
  domain: 'EXTERNAL_COMPETITION',
  external_change: true,
});

assert.equal(unknownSignal.epistemic_status, 'EVIDENCE_NEEDED');
assert.equal(unknownSignal.evidence_sufficient_for_investigation, false);
assert.equal(unknownSignal.disposition, 'INVESTIGATE');

const recurring = assessAttentionCandidate({
  observation_id: 'obs:recurring-work',
  recurring_work: true,
  evidence_references: ['event:1', 'event:2', 'event:3'],
});

const agenda = buildAttentionAgenda({
  observations: [unknownSignal, recurring, failingSystem],
});

assert.equal(agenda.candidates.length, 3);
assert.equal(agenda.candidates[0].materiality, 'HIGH');
assert.equal(agenda.constitutional_contract.attention_is_not_authority, true);
assert.equal(agenda.constitutional_contract.execution_requires_separate_authorization, true);

const proposal = proposeAttentionWork(unknownSignal);
assert.equal(proposal.state, 'PROPOSED');
assert.equal(proposal.objective, 'ACQUIRE_EVIDENCE_AND_REASSESS');
assert.equal(proposal.authority, 'NONE_UNLESS_EXPLICITLY_ESTABLISHED');
assert.equal(proposal.execution, 'NOT_EXECUTED');
assert.equal(proposal.action_authorized, false);
assert.equal(proposal.verification_required, true);

console.log('REALITY_ATTENTION_STEWARDSHIP_V0_1_PASS');
