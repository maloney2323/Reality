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
  assert.equal(BENCHMARK_VERSION, 'reality-hidden-world-benchmark-v0.2');
  assert.equal(HIDDEN_WORLDS[1].groundTruth.migrationSucceeds, false);
  assert.equal(HIDDEN_WORLDS[2].apiVersion, '2026.08');
  assert.equal(PRIOR_KNOWLEDGE[0].state, 'RESOLUTION');
});

test('experience-enabled reasoning improves transfer without treating prior knowledge as authority', () => {
  const result = runBenchmark();
  assertBenchmarkInvariants(result);
  const matchedPrior = result.experienceEnabled.find(item => item.decision.knowledgeUsed.includes('ekr-v2-api08'));
  assert.ok(matchedPrior, 'a context-matched prior should be used');
  assert.equal(matchedPrior.action, 'NO_EXTERNAL_ACTION');
});

test('benchmark reports the baseline and experience delta explicitly', () => {
  const result = runBenchmark();
  assert.equal(result.metrics.baselineDecisionAccuracy, 0.78125);
  assert.equal(result.metrics.experienceDecisionAccuracy, 0.9375);
  assert.equal(result.metrics.experienceImprovement, 0.15625);
});

test('benchmark rejects an over-broad prior when a material context dimension changes', () => {
  const result = runBenchmark();
  assert.equal(result.experienceEnabled[1].decision.knowledgeUsed.length, 0);
  assert.equal(result.experienceEnabled[1].decision.applicability, 'NO_MATCHING_PRIOR');
});
