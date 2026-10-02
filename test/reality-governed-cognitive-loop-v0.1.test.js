import { runGovernedCognitiveDevelopmentCycle } from '../src/reality-governed-cognitive-loop-v0.1.js';

export const BENCHMARK_VERSION = 'reality-governed-cognitive-loop-benchmark-v0.1';

export function runGovernedLoopBenchmark() {
  const observations = [
    { capability: 'temporal-reasoning', outcome: 'FAIL', evidence_ref: 'E1', failure_mode: 'async-order' },
    { capability: 'temporal-reasoning', outcome: 'FAIL', evidence_ref: 'E2', failure_mode: 'async-order' },
    { capability: 'temporal-reasoning', outcome: 'PASS', evidence_ref: 'E3' },
  ];

  const result = runGovernedCognitiveDevelopmentCycle({
    observations,
    proposal: 'Use dependency-aware temporal reconstruction before classification.',
    evidence: [{ id: 'E1' }, { id: 'E2' }],
    alternatives: ['Use source-priority ordering only.'],
    authority: { allowed: true },
    uncertainty: ['Source clocks may disagree.'],
    baselineRef: 'BASELINE-TEMPORAL-V0',
    candidateRef: 'CANDIDATE-TEMPORAL-V1',
    experimentRef: 'EXP-001',
    independentVerification: { passed: true, ref: 'WITNESS-001' },
    regressionCheck: { passed: true, ref: 'REGRESSION-001' },
    governanceCheck: { preserved: true },
  });

  return { benchmark_version: BENCHMARK_VERSION, result };
}

export function assertGovernedLoopBenchmark(output) {
  if (output.benchmark_version !== BENCHMARK_VERSION) throw new Error('BENCHMARK_VERSION_MISMATCH');
  if (output.result.state !== 'CAPABILITY_CHANGE_VERIFIED') throw new Error('VERIFIED_CHANGE_MISSING');
  if (output.result.capability_evolution.status !== 'VERIFIED') throw new Error('LEDGER_STATUS_INVALID');
  if (output.result.ledger.entries.length !== 1) throw new Error('LEDGER_ENTRY_MISSING');
  if (output.result.critique_integrity.integrity !== 'VALID') throw new Error('CRITIQUE_INVALID');
  if (output.result.research_problem.state !== 'OPEN') throw new Error('RESEARCH_PROBLEM_INVALID');
}
