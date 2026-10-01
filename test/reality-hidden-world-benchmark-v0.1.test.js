import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BENCHMARK_VERSION,
  HIDDEN_WORLDS,
  PRIOR_KNOWLEDGE,
  runBenchmark,
  assertBenchmarkInvariants,
} from './reality-hidden-world-benchmark-v0.1.js';

test('hidden-world benchmark is deterministic and ground-truth bounded', () => {
  assert.equal(BENCHMARK_VERSION, 'reality-hidden-world-benchmark-v0.1');
  assert.equal(HIDDEN_WORLDS.WORLD_B.groundTruth.migrationSucceeds, false);
  assert.equal(HIDDEN_WORLDS.WORLD_C.apiVersion, '2026.10');
  assert.equal(PRIOR_KNOWLEDGE[0].status, 'RESOLUTION');
});

test('experience-enabled reasoning improves transfer without treating prior knowledge as authority', () => {
  const result = runBenchmark();
  assertBenchmarkInvariants(result);
  assert.equal(result.experienceEnabled[0].decision.knowledgeUsed[0], 'ekr-prior-001');
  assert.equal(result.experienceEnabled[0].action, 'NO_EXTERNAL_ACTION');
});

test('benchmark reports the baseline and experience delta explicitly', () => {
  const result = runBenchmark();
  assert.equal(result.metrics.baselineDecisionAccuracy, 0.5);
  assert.equal(result.metrics.experienceDecisionAccuracy, 1);
  assert.equal(result.metrics.novelCaseTransferImprovement, 0.5);
});

test('benchmark rejects an over-broad prior when a material context dimension changes', () => {
  const result = runBenchmark();
  assert.equal(result.experienceEnabled[1].decision.knowledgeUsed.length, 0);
  assert.equal(result.experienceEnabled[1].decision.applicability, 'NO_MATCHING_PRIOR');
});
