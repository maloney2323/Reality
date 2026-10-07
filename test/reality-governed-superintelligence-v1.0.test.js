import assert from 'node:assert/strict';
import test from 'node:test';
import { GSI_GATES, GSI_HARD_INVARIANTS, createGsiAssessment, determineGsiLevel, assertGsiClaim } from '../src/reality-governed-superintelligence-v1.0.js';

test('GSI specification exposes hard governance invariants', () => {
  assert.equal(GSI_HARD_INVARIANTS.capability_is_not_authority, true);
  assert.equal(GSI_HARD_INVARIANTS.execution_is_not_verification, true);
  assert.equal(GSI_HARD_INVARIANTS.governance_kernel_is_not_mutable_by_learner, true);
});

test('GSI cannot claim L5 without every hard gate', () => {
  const gates = Object.fromEntries(GSI_GATES.map((gate) => [gate, { status: 'VERIFIED', evidence_refs: ['evidence:' + gate], metrics: {} }]));
  gates.ADVERSARIAL_ROBUSTNESS.status = 'PARTIALLY_VERIFIED';
  const assessment = createGsiAssessment({ assessmentId: 'gsi-test-1', learnerId: 'learner:test', benchmarkVersion: 'gsi-benchmark-v1', governanceKernelHash: 'kernel:test', gates });
  assert.equal(assessment.claimable_level, 'L4_SUPERHUMAN_GOVERNED_INTELLIGENCE');
  assert.throws(() => assertGsiClaim(assessment, 'L5_GOVERNED_SUPERINTELLIGENCE'), /GSI_CLAIM_NOT_SUPPORTED/);
});

test('GSI L5 requires reproducible superhumanity and adversarial robustness', () => {
  const gates = Object.fromEntries(GSI_GATES.map((gate) => [gate, { status: 'VERIFIED', evidence_refs: [], metrics: {} }]));
  assert.equal(determineGsiLevel(gates), 'L5_GOVERNED_SUPERINTELLIGENCE');
  const assessment = createGsiAssessment({ assessmentId: 'gsi-test-2', learnerId: 'learner:test', benchmarkVersion: 'gsi-benchmark-v1', governanceKernelHash: 'kernel:test', gates });
  assert.equal(assessment.claimable_level, 'L5_GOVERNED_SUPERINTELLIGENCE');
  assert.equal(assertGsiClaim(assessment, 'L5_GOVERNED_SUPERINTELLIGENCE'), true);
});