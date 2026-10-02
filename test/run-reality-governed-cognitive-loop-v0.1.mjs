import { runGovernedLoopBenchmark, assertGovernedLoopBenchmark } from './reality-governed-cognitive-loop-v0.1.test.js';

const result = runGovernedLoopBenchmark();
assertGovernedLoopBenchmark(result);
console.log(JSON.stringify({
  status: 'PASS',
  benchmark_version: result.benchmark_version,
  state: result.result.state,
  gap: result.result.gap.gap_id,
  ledger_status: result.result.capability_evolution.status,
}, null, 2));
