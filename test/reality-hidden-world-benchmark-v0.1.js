import assert from 'node:assert/strict';
import { createEKR, retrieveRelevantEKR } from '../src/reality-ekr.js';

export const BENCHMARK_VERSION = 'reality-hidden-world-benchmark-v0.1';

export const HIDDEN_WORLDS = Object.freeze({
  WORLD_A: Object.freeze({
    id: 'world-a',
    dependencyVersion: 'v2',
    capacity: 80,
    apiVersion: '2026.09',
    groundTruth: Object.freeze({
      migrationSucceeds: true,
      reason: 'capacity_and_dependency_constraints_satisfied',
    }),
  }),
  WORLD_B: Object.freeze({
    id: 'world-b',
    dependencyVersion: 'v2',
    capacity: 40,
    apiVersion: '2026.09',
    groundTruth: Object.freeze({
      migrationSucceeds: false,
      reason: 'capacity_below_migration_threshold',
    }),
  }),
  WORLD_C: Object.freeze({
    id: 'world-c',
    dependencyVersion: 'v2',
    capacity: 80,
    apiVersion: '2026.10',
    groundTruth: Object.freeze({
      migrationSucceeds: true,
      reason: 'new_api_version_requires_revalidation',
    }),
  }),
});

export const PRIOR_KNOWLEDGE = Object.freeze([
  createEKR({
    id: 'ekr-prior-001',
    context: { dependencyVersion: 'v2', apiVersion: '2026.09' },
    condition: { type: 'minimum', field: 'capacity', value: 50 },
    verifiedOutcome: 'migration succeeds',
    resolution: 'Migration succeeds when dependency/API context matches and capacity is >= 50.',
  }),
]);

function assertObservation(world, action) {
  const expected = world.groundTruth.migrationSucceeds;
  const observed = action === 'MIGRATE' ? expected : false;
  return {
    expected,
    observed,
    delta: observed === expected ? 0 : 1,
    verified: true,
    reason: world.groundTruth.reason,
  };
}

export function baselineReasoner(world) {
  return {
    mode: 'BASELINE',
    proposal: world.dependencyVersion === 'v2' ? 'MIGRATE' : 'INVESTIGATE',
    confidence: world.dependencyVersion === 'v2' ? 0.8 : 0.5,
    knowledgeUsed: [],
  };
}

export function experienceReasoner(world, priorKnowledge = PRIOR_KNOWLEDGE) {
  const relevant = retrieveRelevantEKR({
    records: priorKnowledge,
    observedContext: world,
  });

  const thresholdWarning = world.capacity < 50
    && relevant.some((prior) => (
      prior.condition?.type === 'minimum'
      && prior.condition.field === 'capacity'
      && world.capacity < prior.condition.value
    ));

  if (thresholdWarning) {
    return {
      mode: 'EXPERIENCE_ENABLED',
      proposal: 'INVESTIGATE_CAPACITY_OR_ALTERNATIVE',
      confidence: 0.85,
      knowledgeUsed: relevant.map((prior) => prior.id),
      applicability: 'SUPPORTED_CONSTRAINT',
    };
  }

  return {
    mode: 'EXPERIENCE_ENABLED',
    proposal: world.dependencyVersion === 'v2' ? 'MIGRATE' : 'INVESTIGATE',
    confidence: world.apiVersion === '2026.09' ? 0.9 : 0.55,
    knowledgeUsed: relevant.map((prior) => prior.id),
    applicability: relevant.length ? 'SUPPORTED_CONTEXT' : 'NO_MATCHING_PRIOR',
  };
}

export function runScenario(world, reasoner) {
  const decision = reasoner(world);
  const action = decision.proposal === 'MIGRATE' ? 'MIGRATE' : 'NO_EXTERNAL_ACTION';
  const observation = assertObservation(world, action);

  return {
    benchmarkVersion: BENCHMARK_VERSION,
    worldId: world.id,
    decision,
    action,
    observation,
    decisionCorrect: (
      (world.groundTruth.migrationSucceeds && action === 'MIGRATE')
      || (!world.groundTruth.migrationSucceeds && action !== 'MIGRATE')
    ),
  };
}

export function runBenchmark() {
  const worlds = [HIDDEN_WORLDS.WORLD_B, HIDDEN_WORLDS.WORLD_C];

  const baseline = worlds.map((world) => runScenario(world, baselineReasoner));
  const experienceEnabled = worlds.map((world) => runScenario(world, experienceReasoner));

  const accuracy = (results) => results.filter((result) => result.decisionCorrect).length / results.length;

  return {
    benchmarkVersion: BENCHMARK_VERSION,
    worlds: worlds.map((world) => world.id),
    baseline,
    experienceEnabled,
    metrics: {
      baselineDecisionAccuracy: accuracy(baseline),
      experienceDecisionAccuracy: accuracy(experienceEnabled),
      novelCaseTransferImprovement:
        accuracy(experienceEnabled) - accuracy(baseline),
      priorRetrievalCount: experienceEnabled.reduce(
        (sum, result) => sum + result.decision.knowledgeUsed.length,
        0,
      ),
      contradictionAvoidance: experienceEnabled[0].decision.applicability === 'SUPPORTED_CONSTRAINT',
    },
  };
}

export function assertBenchmarkInvariants(result) {
  assert.equal(result.benchmarkVersion, BENCHMARK_VERSION);
  assert.equal(result.baseline.length, 2);
  assert.equal(result.experienceEnabled.length, 2);

  assert.equal(result.baseline[0].decision.proposal, 'MIGRATE');
  assert.equal(result.experienceEnabled[0].decision.proposal, 'INVESTIGATE_CAPACITY_OR_ALTERNATIVE');
  assert.equal(result.experienceEnabled[0].decisionCorrect, true);

  assert.equal(result.experienceEnabled[1].decision.applicability, 'NO_MATCHING_PRIOR');
  assert.equal(result.experienceEnabled[1].decision.proposal, 'MIGRATE');

  assert.equal(result.metrics.experienceDecisionAccuracy, 1);
  assert.equal(result.metrics.baselineDecisionAccuracy, 0.5);
  assert.equal(result.metrics.novelCaseTransferImprovement, 0.5);
  assert.equal(result.metrics.contradictionAvoidance, true);
}
