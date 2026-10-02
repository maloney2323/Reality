import {
  runIntelligencePrimitiveBenchmark,
  assertIntelligencePrimitiveBenchmark,
} from './reality-intelligence-primitives-v0.1.test.js';

const result = runIntelligencePrimitiveBenchmark();
assertIntelligencePrimitiveBenchmark(result);
console.log(JSON.stringify({
  status: 'PASS',
  benchmark_version: result.benchmark_version,
  detected_gap: result.detected_gap.gap_id,
  critique: result.critique.disposition,
  retained_status: result.retained_status,
  ledger_size: result.ledger_size,
}, null, 2));
