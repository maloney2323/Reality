import { detectCapabilityGaps, createResearchProblemFromGap } from './reality-capability-gap-detector-v0.1.js';
import { generateAdversarialCritique, assertCritiqueIntegrity } from './reality-adversarial-critique-v0.1.js';
import {
  createCapabilityEvolutionLedger,
  createCapabilityEvolutionEntry,
  retainCapabilityEvolution,
  appendCapabilityEvolution,
} from './reality-capability-evolution-ledger-v0.1.js';

export const GOVERNED_COGNITIVE_LOOP_VERSION = 'reality-governed-cognitive-loop-v0.1';

export function runGovernedCognitiveDevelopmentCycle({
  observations = [],
  proposal,
  evidence = [],
  alternatives = [],
  authority = { allowed: true },
  uncertainty = [],
  baselineRef,
  candidateRef,
  experimentRef,
  independentVerification = { passed: false },
  regressionCheck = { passed: false },
  governanceCheck = { preserved: true },
  ledger = createCapabilityEvolutionLedger(),
} = {}) {
  const gaps = detectCapabilityGaps({ observations });
  if (!gaps.length) {
    return {
      loop_version: GOVERNED_COGNITIVE_LOOP_VERSION,
      state: 'NO_VERIFIED_CAPABILITY_GAP',
      gaps: [],
      ledger,
    };
  }

  const gap = gaps[0];
  const researchProblem = createResearchProblemFromGap({
    gap,
    objective: `Improve ${gap.capability} using evidence-backed experimentation.`,
    constraints: ['Governance boundary remains immutable.'],
  });

  const critique = generateAdversarialCritique({
    proposal,
    evidence,
    alternatives,
    authority,
    uncertainty,
  });
  const critiqueIntegrity = assertCritiqueIntegrity({ critique });

  const entry = createCapabilityEvolutionEntry({
    entryId: `CEL-${gap.gap_id}`,
    capabilityGap: gap.gap_id,
    baselineRef,
    hypothesis: proposal,
    candidateRef,
    experimentRef,
  });

  const retained = critique.disposition === 'BLOCK' || critique.disposition === 'INSUFFICIENT_EVIDENCE'
    ? { ...entry, status: 'REJECTED', rejection_reasons: [critique.disposition] }
    : retainCapabilityEvolution({
      entry,
      independentVerification,
      regressionCheck,
      governanceCheck,
    });

  const nextLedger = appendCapabilityEvolution(ledger, retained);

  return {
    loop_version: GOVERNED_COGNITIVE_LOOP_VERSION,
    state: retained.status === 'VERIFIED' ? 'CAPABILITY_CHANGE_VERIFIED' : 'CAPABILITY_CHANGE_NOT_VERIFIED',
    gap,
    research_problem: researchProblem,
    critique,
    critique_integrity: critiqueIntegrity,
    capability_evolution: retained,
    ledger: nextLedger,
  };
}
