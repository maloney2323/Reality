import { createEKR, retrieveRelevantEKR } from '../src/reality-ekr.js';

export const BENCHMARK_VERSION = 'reality-hidden-world-benchmark-v0.3-adversarial';

function makeWorld(id, overrides = {}) {
  return Object.freeze({
    id,
    dependencyVersion: 'v2',
    apiVersion: '2026.09',
    capacity: 60,
    compatible: true,
    latencyMs: 30,
    evidenceComplete: true,
    ...overrides,
  });
}

export const ADVERSARIAL_WORLDS = Object.freeze([
  makeWorld('adversarial-supported', {
    groundTruth: { migrationSucceeds: true, reason: 'supported_prior_context' },
    priors: [createEKR({ id: 'ekr-supported', context: { dependencyVersion: 'v2', apiVersion: '2026.09' }, condition: { type: 'minimum', field: 'capacity', value: 50 }, verifiedOutcome: 'migration succeeds', resolution: 'Migration succeeded under this dependency/API context with sufficient capacity.' })],
  }),
  makeWorld('adversarial-stale', {
    groundTruth: { migrationSucceeds: true, reason: 'stale_prior_must_not_control_current_reasoning' },
    priors: [createEKR({ id: 'ekr-stale', context: { dependencyVersion: 'v2', apiVersion: '2026.09' }, condition: { type: 'minimum', field: 'capacity', value: 50 }, verifiedOutcome: 'migration succeeds', resolution: 'Historical migration succeeded.', observedAt: '2025-01-01T00:00:00.000Z' })],
    stale: true,
  }),
  makeWorld('adversarial-contradiction', {
    groundTruth: { migrationSucceeds: true, reason: 'conflicting_experience_requires_resolution' },
    priors: [
      createEKR({ id: 'ekr-conflict-a', context: { dependencyVersion: 'v2', apiVersion: '2026.09' }, condition: { type: 'minimum', field: 'capacity', value: 50 }, verifiedOutcome: 'migration succeeds', resolution: 'Migration succeeded.' }),
      createEKR({ id: 'ekr-conflict-b', context: { dependencyVersion: 'v2', apiVersion: '2026.09' }, condition: { type: 'minimum', field: 'capacity', value: 50 }, verifiedOutcome: 'migration fails', resolution: 'Migration failed under the same declared context.' }),
    ],
  }),
  makeWorld('adversarial-partial-evidence', {
    groundTruth: { migrationSucceeds: true, reason: 'insufficient_current_evidence' },
    evidenceComplete: false,
    priors: [createEKR({ id: 'ekr-partial', context: { dependencyVersion: 'v2', apiVersion: '2026.09' }, condition: { type: 'minimum', field: 'capacity', value: 50 }, verifiedOutcome: 'migration succeeds', resolution: 'Migration succeeded when the recorded conditions were verified.' })],
  }),
  makeWorld('adversarial-false-pattern', {
    groundTruth: { migrationSucceeds: false, reason: 'historical_pattern_is_not_current_truth' },
    compatible: false,
    priors: [createEKR({ id: 'ekr-false-pattern', context: { dependencyVersion: 'v2', apiVersion: '2026.09' }, condition: { type: 'minimum', field: 'capacity', value: 50 }, verifiedOutcome: 'migration succeeds', resolution: 'Migration repeatedly succeeded in earlier compatible environments.' })],
  }),
  makeWorld('adversarial-novel-combination', {
    groundTruth: { migrationSucceeds: false, reason: 'novel_combination_requires_investigation' },
    dependencyVersion: 'v4',
    apiVersion: '2026.11',
    priors: [createEKR({ id: 'ekr-novel-prior', context: { dependencyVersion: 'v2', apiVersion: '2026.09' }, condition: { type: 'minimum', field: 'capacity', value: 50 }, verifiedOutcome: 'migration succeeds', resolution: 'Migration succeeded in the prior context.' })],
  }),
]);

export function adversarialReasoner(world) {
  const relevant = retrieveRelevantEKR({ records: world.priors || [], observedContext: world });

  if (!world.evidenceComplete) return { proposal: 'INVESTIGATE', confidence: 0.95, knowledgeUsed: relevant.map((p) => p.id), epistemicState: 'INSUFFICIENT_CURRENT_EVIDENCE' };
  if (world.stale) return { proposal: 'INVESTIGATE', confidence: 0.9, knowledgeUsed: [], epistemicState: 'STALE_PRIOR_REJECTED' };

  const outcomes = new Set(relevant.map((p) => p.verified_outcome));
  if (outcomes.has('migration succeeds') && outcomes.has('migration fails')) {
    return { proposal: 'INVESTIGATE', confidence: 0.99, knowledgeUsed: relevant.map((p) => p.id), epistemicState: 'CONTRADICTORY_PRIORS' };
  }

  if (world.compatible === false || world.latencyMs > 60) {
    return { proposal: 'INVESTIGATE', confidence: 0.9, knowledgeUsed: relevant.map((p) => p.id), epistemicState: 'CURRENT_CONDITION_CONFLICT' };
  }

  if (relevant.length === 0) return { proposal: 'INVESTIGATE', confidence: 0.6, knowledgeUsed: [], epistemicState: 'NOVEL_CONTEXT' };

  const conditionSatisfied = relevant.some((p) => p.condition?.type === 'minimum' && p.condition.field === 'capacity' && world.capacity >= p.condition.value);
  if (conditionSatisfied && world.dependencyVersion === 'v2') {
    return { proposal: 'MIGRATE', confidence: 0.9, knowledgeUsed: relevant.map((p) => p.id), epistemicState: 'CONDITIONALLY_SUPPORTED' };
  }

  return { proposal: 'INVESTIGATE', confidence: 0.8, knowledgeUsed: relevant.map((p) => p.id), epistemicState: 'PRIOR_NOT_APPLICABLE' };
}

export function runAdversarialBenchmark() {
  const results = ADVERSARIAL_WORLDS.map((world) => {
    const decision = adversarialReasoner(world);
    const correct = (world.groundTruth.migrationSucceeds && decision.proposal === 'MIGRATE') || (!world.groundTruth.migrationSucceeds && decision.proposal !== 'MIGRATE');
    return { worldId: world.id, decision, groundTruth: world.groundTruth, decisionCorrect: correct };
  });

  return {
    benchmarkVersion: BENCHMARK_VERSION,
    worldCount: results.length,
    results,
    metrics: {
      decisionAccuracy: results.filter((r) => r.decisionCorrect).length / results.length,
      contradictionCases: results.filter((r) => r.decision.epistemicState === 'CONTRADICTORY_PRIORS').length,
      stalePriorRejections: results.filter((r) => r.decision.epistemicState === 'STALE_PRIOR_REJECTED').length,
      insufficientEvidenceStops: results.filter((r) => r.decision.epistemicState === 'INSUFFICIENT_CURRENT_EVIDENCE').length,
      novelContextStops: results.filter((r) => r.decision.epistemicState === 'NOVEL_CONTEXT').length,
      conditionalApplications: results.filter((r) => r.decision.epistemicState === 'CONDITIONALLY_SUPPORTED').length,
    },
  };
}

export function assertAdversarialBenchmark(result) {
  if (result.benchmarkVersion !== BENCHMARK_VERSION) throw new Error('BENCHMARK_VERSION_MISMATCH');
  if (result.worldCount !== 6) throw new Error('WORLD_COUNT_MISMATCH');
  if (result.metrics.decisionAccuracy !== 1) throw new Error('ADVERSARIAL_ACCURACY_FAILED');
  if (result.metrics.contradictionCases !== 1) throw new Error('CONTRADICTION_CASE_MISSING');
  if (result.metrics.stalePriorRejections !== 1) throw new Error('STALE_PRIOR_REJECTION_MISSING');
  if (result.metrics.insufficientEvidenceStops !== 1) throw new Error('INSUFFICIENT_EVIDENCE_STOP_MISSING');
  if (result.metrics.conditionalApplications !== 1) throw new Error('CONDITIONAL_APPLICATION_MISSING');
}
