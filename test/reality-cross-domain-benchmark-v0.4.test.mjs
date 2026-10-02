import test from 'node:test';
import assert from 'node:assert/strict';
import { runCrossDomainBenchmark, assertCrossDomainBenchmark, BENCHMARK_VERSION } from './reality-cross-domain-benchmark-v0.4.test.js';

test('cross-domain benchmark spans seven operational domains', () => {
  const result = runCrossDomainBenchmark();
  assert.equal(BENCHMARK_VERSION, 'reality-hidden-world-benchmark-v0.4-cross-domain');
  assertCrossDomainBenchmark(result);
  assert.equal(result.domains.length, 7);
});

test('experience transfers conditionally without becoming universal', () => {
  const result = runCrossDomainBenchmark();
  assert(result.metrics.improvement >= 0);
  assert(result.metrics.novelContextStops >= 2);
  assert(result.metrics.evidenceStops >= 3);
});

test('material context changes produce investigation rather than inherited action', () => {
  const result = runCrossDomainBenchmark();
  const deployment = result.results.find((r) => r.id === 'deployment-novel-domain-transfer');
  const inventory = result.results.find((r) => r.id === 'inventory-novel-context');
  assert.equal(deployment.experience.proposal, 'INVESTIGATE');
  assert.equal(inventory.experience.proposal, 'INVESTIGATE');
});

test('current contradictions and incomplete evidence remain unresolved', () => {
  const result = runCrossDomainBenchmark();
  const billing = result.results.find((r) => r.id === 'billing-contradiction');
  const docs = result.results.find((r) => r.id === 'documents-01');
  assert.equal(billing.experience.proposal, 'INVESTIGATE');
  assert.equal(docs.experience.proposal, 'INVESTIGATE');
});
