import test from 'node:test';
import assert from 'node:assert/strict';
import { runAdversarialBenchmark, assertAdversarialBenchmark, BENCHMARK_VERSION } from './reality-hidden-world-benchmark-v0.3.js';

test('adversarial benchmark covers stale, contradictory, partial, false-pattern, and novel experience', () => {
  assert.equal(BENCHMARK_VERSION, 'reality-hidden-world-benchmark-v0.3-adversarial');
  const result = runAdversarialBenchmark();
  assertAdversarialBenchmark(result);
  assert.equal(result.metrics.decisionAccuracy, 1);
});

test('contradictory experience causes investigation rather than forced synthesis', () => {
  const result = runAdversarialBenchmark();
  const item = result.results.find((entry) => entry.worldId === 'adversarial-contradiction');
  assert.equal(item.decision.proposal, 'INVESTIGATE');
  assert.equal(item.decision.epistemicState, 'CONTRADICTORY_PRIORS');
});

test('partial current evidence blocks action even when prior experience is supportive', () => {
  const result = runAdversarialBenchmark();
  const item = result.results.find((entry) => entry.worldId === 'adversarial-partial-evidence');
  assert.equal(item.decision.proposal, 'INVESTIGATE');
  assert.equal(item.decision.epistemicState, 'INSUFFICIENT_CURRENT_EVIDENCE');
});

test('stale experience is rejected instead of treated as current truth', () => {
  const result = runAdversarialBenchmark();
  const item = result.results.find((entry) => entry.worldId === 'adversarial-stale');
  assert.equal(item.decision.proposal, 'INVESTIGATE');
  assert.equal(item.decision.epistemicState, 'STALE_PRIOR_REJECTED');
});
