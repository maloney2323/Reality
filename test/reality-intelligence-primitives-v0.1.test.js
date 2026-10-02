import {
  detectCapabilityGaps,
  createResearchProblemFromGap,
} from '../src/reality-capability-gap-detector-v0.1.js';
import {
  generateAdversarialCritique,
  assertCritiqueIntegrity,
} from '../src/reality-adversarial-critique-v0.1.js';
import {
  createCapabilityEvolutionLedger,
  createCapabilityEvolutionEntry,
  retainCapabilityEvolution,
  appendCapabilityEvolution,
} from '../src/reality-capability-evolution-ledger-v0.1.js';

export const BENCHMARK_VERSION = 'reality-intelligence-primitives-benchmark-v0.1';

export function runIntelligencePrimitiveBenchmark() {
  const observations = [
    { capability: 'temporal-reasoning', outcome: 'FAIL', failure_mode: 'async-order', evidence_ref: 'E1', quality_score: 0.4 },
    { capability: 'temporal-reasoning', outcome: 'FAIL', failure_mode: 'async-order', evidence_ref: 'E2', quality_score: 0.5 },
    { capability: 'temporal-reasoning', outcome: 'PASS', evidence_ref: 'E3', quality_score: 0.9 },
    { capability: 'evidence-reconciliation', outcome: 'PASS', evidence_ref: 'E4', quality_score: 0.9 },
    { capability: 'evidence-reconciliation', outcome: 'PASS', evidence_ref: 'E5', quality_score: 0.8 },
    { capability: 'evidence-reconciliation', outcome: 'PASS', evidence_ref: 'E6', quality_score: 0.9 },
  ];

  const gaps = detectCapabilityGaps({
    observations,
    failureThreshold: 0.5,
    minimumObservations: 3,
  });

  if (gaps.length !== 1) throw new Error('GAP_DETECTION_FAILED');

  const researchProblem = createResearchProblemFromGap({
    gap: gaps[0],
    objective: 'Improve temporal reasoning without changing consequence authority.',
    constraints: ['Governance boundary is immutable.'],
  });

  const critique = generateAdversarialCritique({
    proposal: 'Use dependency-aware temporal reconstruction before final classification.',
    evidence: [{ id: 'E1' }, { id: 'E2' }],
    alternatives: ['Use source-priority ordering without temporal reconstruction.'],
    authority: { allowed: true },
    uncertainty: ['Source clocks may disagree.'],
  });

  const critiqueIntegrity = assertCritiqueIntegrity({ critique });

  let ledger = createCapabilityEvolutionLedger();
  const entry = createCapabilityEvolutionEntry({
    entryId: 'CEL-001',
    capabilityGap: gaps[0].gap_id,
    baselineRef: 'BASELINE-TEMPORAL-V0',
    hypothesis: 'Dependency-aware reconstruction improves held-out temporal classification.',
    candidateRef: 'CANDIDATE-TEMPORAL-V1',
    experimentRef: 'EXP-001',
  });

  const verified = retainCapabilityEvolution({
    entry,
    independentVerification: { passed: true, ref: 'WITNESS-001' },
    regressionCheck: { passed: true, ref: 'REGRESSION-001' },
    governanceCheck: { preserved: true },
  });

  ledger = appendCapabilityEvolution(ledger, verified);

  return {
    benchmark_version: BENCHMARK_VERSION,
    detected_gap: gaps[0],
    research_problem: researchProblem,
    critique,
    critique_integrity: critiqueIntegrity,
    ledger_size: ledger.entries.length,
    retained_status: ledger.entries[0].status,
  };
}

export function assertIntelligencePrimitiveBenchmark(result) {
  if (result.benchmark_version !== BENCHMARK_VERSION) throw new Error('BENCHMARK_VERSION_MISMATCH');
  if (result.detected_gap.capability !== 'temporal-reasoning') throw new Error('WRONG_GAP');
  if (result.research_problem.state !== 'OPEN') throw new Error('RESEARCH_PROBLEM_NOT_OPEN');
  if (result.critique_integrity.integrity !== 'VALID') throw new Error('CRITIQUE_INTEGRITY_FAILED');
  if (result.retained_status !== 'VERIFIED') throw new Error('CAPABILITY_NOT_VERIFIED');
  if (result.ledger_size !== 1) throw new Error('LEDGER_WRITE_FAILED');
}
