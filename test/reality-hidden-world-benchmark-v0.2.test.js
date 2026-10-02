import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BENCHMARK_VERSION,
  HIDDEN_WORLDS,
  PRIOR_KNOWLEDGE,
  runBenchmark,
  assertBenchmarkInvariants,
} from './reality-hidden-world-benchmark-v0.1.js';

test('large hidden-world benchmark is deterministic and ground-truth bounded', () => {
  assert.equal(BENCHMARK_VERSION, 'reality-hidden-world-benchmark-v0.2');
  assert.equal(HIDDEN_WORLDS.length, 256);
  assert.equal(PRIOR_KNOWLEDGE.length, 2);
  assert.equal(PRIOR_KNOWLEDGE[0].state, 'RESOLUTION');
  assert.equal(PRIOR_KNOWLEDGE[0].epistemic_status, 'CONDITIONAL');
});

test('experience-enabled reasoning is evaluated across the full world matrix', () => {
  const result = runBenchmark();
  assertBenchmarkInvariants(result);
  assert.equal(result.baseline.length, 256);
  assert.equal(result.experienceEnabled.length, 256);
});

test('conditional experience is used without becoming authority', () => {
  const result = runBenchmark();
  const constrainedCases = result.experienceEnabled.filter(
    (item) => item.decision.applicability === 'SUPPORTED_CONSTRAINT',
  );
  assert(constrainedCases.length > 0);
  assert(constrainedCases.every((item) => item.action === 'NO_EXTERNAL_ACTION'));
  assert(constrainedCases.every((item) => item.decision.knowledgeUsed.length > 0));
});

test('material context changes prevent indiscriminate transfer', () => {
  const result = runBenchmark();
  const rejected = result.experienceEnabled.filter(
    (item) => item.decision.applicability === 'NO_MATCHING_PRIOR',
  );
  assert(rejected.length > 0);
  assert(rejected.every((item) => item.decision.knowledgeUsed.length === 0));
});

test('benchmark exposes measurable experience improvement rather than a pass/fail claim', () => {
  const result = runBenchmark();
  assert(result.metrics.experienceDecisionAccuracy > result.metrics.baselineDecisionAccuracy);
  assert(result.metrics.experienceImprovement > 0);
  assert.equal(result.metrics.priorRetrievalCount, 32);
  assert.equal(result.metrics.supportedConstraintCount, 16);
  assert.equal(result.metrics.materialContextRejectionCount, 232);
});
