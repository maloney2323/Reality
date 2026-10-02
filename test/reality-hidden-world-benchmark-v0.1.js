import { createEKR, retrieveRelevantEKR } from '../src/reality-ekr.js';

export const BENCHMARK_VERSION = 'reality-hidden-world-benchmark-v0.2';

const DEPENDENCY_VERSIONS = ['v1', 'v2', 'v3', 'v4'];
const API_VERSIONS = ['2026.08', '2026.09', '2026.10', '2026.11'];
const CAPACITIES = [30, 40, 50, 60];
const COMPATIBILITY = [true, false];
const LATENCIES_MS = [30, 60];

function migrationSucceeds(world) {
  return (
    world.dependencyVersion === 'v2'
    && ['2026.08', '2026.09'].includes(world.apiVersion)
    && world.capacity >= 50
    && world.compatible
    && world.latencyMs <= 60
  );
}

function generateHiddenWorlds() {
  const worlds = [];
  let index = 0;

  for (const dependencyVersion of DEPENDENCY_VERSIONS) {
    for (const apiVersion of API_VERSIONS) {
      for (const capacity of CAPACITIES) {
        for (const compatible of COMPATIBILITY) {
          for (const latencyMs of LATENCIES_MS) {
            index += 1;
            const world = {
              id: `world-${String(index).padStart(3, '0')}`,
              dependencyVersion,
              apiVersion,
              capacity,
              compatible,
              latencyMs,
            };

            worlds.push(Object.freeze({
              ...world,
              groundTruth: Object.freeze({
                migrationSucceeds: migrationSucceeds(world),
                reason: migrationSucceeds(world)
                  ? 'all_known_constraints_satisfied'
                  : 'one_or_more_migration_constraints_failed',
              }),
            }));
          }
        }
      }
    }
  }

  return Object.freeze(worlds);
}

export const HIDDEN_WORLDS = generateHiddenWorlds();

export const PRIOR_KNOWLEDGE = Object.freeze([
  createEKR({
    id: 'ekr-v2-api08',
    context: { dependencyVersion: 'v2', apiVersion: '2026.08' },
    condition: { type: 'minimum', field: 'capacity', value: 50 },
    verifiedOutcome: 'migration succeeds',
    resolution: 'Migration succeeded in the verified v2 / 2026.08 context when capacity was at least 50.',
    evidenceRefs: ['verified-receipt-v2-api08'],
  }),
  createEKR({
    id: 'ekr-v2-api09',
    context: { dependencyVersion: 'v2', apiVersion: '2026.09' },
    condition: { type: 'minimum', field: 'capacity', value: 50 },
    verifiedOutcome: 'migration succeeds',
    resolution: 'Migration succeeded in the verified v2 / 2026.09 context when capacity was at least 50.',
    evidenceRefs: ['verified-receipt-v2-api09'],
  }),
]);

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

  const capacityConstraintViolated = relevant.some((prior) => (
    prior.condition?.type === 'minimum'
    && prior.condition.field === 'capacity'
    && world.capacity < prior.condition.value
  ));

  const runtimeConditionUnsafe = world.compatible === false || world.latencyMs > 60;

  if (capacityConstraintViolated) {
    return {
      mode: 'EXPERIENCE_ENABLED',
      proposal: 'INVESTIGATE',
      confidence: 0.9,
      knowledgeUsed: relevant.map((prior) => prior.id),
      applicability: 'SUPPORTED_CONSTRAINT',
    };
  }

  if (runtimeConditionUnsafe) {
    return {
      mode: 'EXPERIENCE_ENABLED',
      proposal: 'INVESTIGATE',
      confidence: 0.85,
      knowledgeUsed: relevant.map((prior) => prior.id),
      applicability: 'UNSUPPORTED_RUNTIME_CONDITION',
    };
  }

  return {
    mode: 'EXPERIENCE_ENABLED',
    proposal: world.dependencyVersion === 'v2' ? 'MIGRATE' : 'INVESTIGATE',
    confidence: relevant.length ? 0.9 : 0.55,
    knowledgeUsed: relevant.map((prior) => prior.id),
    applicability: relevant.length ? 'SUPPORTED_CONTEXT' : 'NO_MATCHING_PRIOR',
  };
}

export function runScenario(world, reasoner) {
  const decision = reasoner(world);
  const action = decision.proposal === 'MIGRATE' ? 'MIGRATE' : 'NO_EXTERNAL_ACTION';

  return {
    benchmarkVersion: BENCHMARK_VERSION,
    worldId: world.id,
    decision,
    action,
    decisionCorrect: (
      (world.groundTruth.migrationSucceeds && action === 'MIGRATE')
      || (!world.groundTruth.migrationSucceeds && action !== 'MIGRATE')
    ),
  };
}

export function runBenchmark() {
  const baseline = HIDDEN_WORLDS.map((world) => runScenario(world, baselineReasoner));
  const experienceEnabled = HIDDEN_WORLDS.map((world) => runScenario(world, experienceReasoner));

  const accuracy = (results) => (
    results.filter((result) => result.decisionCorrect).length / results.length
  );

  return {
    benchmarkVersion: BENCHMARK_VERSION,
    worldCount: HIDDEN_WORLDS.length,
    worlds: HIDDEN_WORLDS.map((world) => world.id),
    baseline,
    experienceEnabled,
    metrics: {
      baselineDecisionAccuracy: accuracy(baseline),
      experienceDecisionAccuracy: accuracy(experienceEnabled),
      experienceImprovement: accuracy(experienceEnabled) - accuracy(baseline),
      priorRetrievalCount: experienceEnabled.reduce(
        (sum, result) => sum + result.decision.knowledgeUsed.length,
        0,
      ),
      materialContextRejectionCount: experienceEnabled.filter((result) => (
        result.decision.applicability === 'NO_MATCHING_PRIOR'
        || result.decision.applicability === 'UNSUPPORTED_RUNTIME_CONDITION'
      )).length,
      supportedConstraintCount: experienceEnabled.filter(
        (result) => result.decision.applicability === 'SUPPORTED_CONSTRAINT',
      ).length,
    },
  };
}

export function assertBenchmarkInvariants(result) {
  if (result.benchmarkVersion !== BENCHMARK_VERSION) {
    throw new Error('BENCHMARK_VERSION_MISMATCH');
  }

  if (result.worldCount !== 256) {
    throw new Error('EXPECTED_256_HIDDEN_WORLDS');
  }

  if (result.baseline.length !== 256 || result.experienceEnabled.length !== 256) {
    throw new Error('BENCHMARK_RESULT_CARDINALITY_MISMATCH');
  }

  if (result.metrics.experienceDecisionAccuracy <= result.metrics.baselineDecisionAccuracy) {
    throw new Error('EXPERIENCE_DID_NOT_IMPROVE_ACCURACY');
  }

  if (result.metrics.priorRetrievalCount <= 0) {
    throw new Error('NO_EKR_PRIORS_RETRIEVED');
  }

  if (result.metrics.materialContextRejectionCount <= 0) {
    throw new Error('NO_MATERIAL_CONTEXT_REJECTIONS');
  }

  if (result.metrics.supportedConstraintCount <= 0) {
    throw new Error('NO_CONDITIONAL_PRIOR_APPLICATION');
  }
}
