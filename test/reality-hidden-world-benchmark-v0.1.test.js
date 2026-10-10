import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BENCHMARK_VERSION,
  HIDDEN_WORLDS,
  PRIOR_KNOWLEDGE,
  runBenchmark,
  assertBenchmarkInvariants,
  experienceReasoner,
  runScenario,
} from './reality-hidden-world-benchmark-v0.1.js';

test('hidden-world benchmark is deterministic and ground-truth bounded', () => {
  assert.equal(BENCHMARK_VERSION, 'reality-hidden-world-benchmark-v0.2');
  assert.equal(HIDDEN_WORLDS.length, 256);
  assert.equal(HIDDEN_WORLDS[0].groundTruth.migrationSucceeds, false);
  assert.equal(HIDDEN_WORLDS.some((world) => world.apiVersion === '2026.10'), true);
  assert.equal(PRIOR_KNOWLEDGE[0].state, 'RESOLUTION');
  assert.equal(PRIOR_KNOWLEDGE[0].epistemic_status, 'CONDITIONAL');
});

test('experience-enabled reasoning uses relevant prior knowledge without granting authority', () => {
  const world = HIDDEN_WORLDS.find((item) =>
    item.dependencyVersion === 'v2'
    && item.apiVersion === '2026.08'
    && item.capacity === 40
    && item.compatible
    && item.latencyMs === 30
  );
  assert.ok(world, 'fixture must exist in frozen hidden-world matrix');
  const decision = experienceReasoner(world);
  assert.equal(decision.applicability, 'SUPPORTED_CONSTRAINT');
  assert.ok(decision.knowledgeUsed.includes('ekr-v2-api08'));
  assert.equal(runScenario(world, experienceReasoner).action, 'NO_EXTERNAL_ACTION');
});

test('benchmark reports baseline and measured experience delta explicitly', () => {
  const result = runBenchmark();
  assertBenchmarkInvariants(result);
  assert.equal(result.metrics.baselineDecisionAccuracy, 0.5);
  assert.ok(result.metrics.experienceDecisionAccuracy > result.metrics.baselineDecisionAccuracy);
  assert.equal(result.metrics.experienceImprovement,
    result.metrics.experienceDecisionAccuracy - result.metrics.baselineDecisionAccuracy);
});

test('benchmark rejects an over-broad prior when a material context dimension changes', () => {
  const world = HIDDEN_WORLDS.find((item) => item.dependencyVersion !== 'v2');
  assert.ok(world, 'fixture must include a world outside prior applicability');
  const decision = experienceReasoner(world);
  assert.equal(decision.knowledgeUsed.length, 0);
  assert.equal(decision.applicability, 'NO_MATCHING_PRIOR');
});
