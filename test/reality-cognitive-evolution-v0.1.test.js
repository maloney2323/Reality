import {
  createReasoningPrimitive,
  decomposeProblemV1,
  decomposeProblemV2,
  generateProblemDecompositionPrimitive,
  evaluatePrimitive,
  selectPrimitive,
  composePrimitives,
  assertPrimitiveEvaluationIntegrity,
  fingerprintPrimitive,
} from '../src/reality-cognitive-evolution-v0.1.js';

export const BENCHMARK_VERSION = 'reality-cognitive-evolution-benchmark-v0.1';

const PROBLEMS = Object.freeze([
  {
    id: 'pd-01',
    statement: 'Determine why fulfillment performance dropped.',
    entities: ['orders', 'inventory', 'staffing'],
    transitions: ['orders → fulfillment', 'inventory → fulfillment'],
    unknowns: ['whether staffing changed before the drop'],
    constraints: ['inventory data must be current'],
    groundTruth: 'INVESTIGATE',
  },
  {
    id: 'pd-02',
    statement: 'Determine whether a deployment should proceed.',
    entities: ['service', 'capacity', 'rollback'],
    transitions: ['candidate → production'],
    unknowns: ['whether rollback is ready'],
    constraints: ['capacity must remain above threshold'],
    groundTruth: 'INVESTIGATE',
  },
  {
    id: 'pd-03',
    statement: 'Determine whether an invoice can be approved.',
    entities: ['invoice', 'customer', 'payment'],
    transitions: ['invoice → approved'],
    unknowns: ['whether required fields are verified'],
    constraints: ['approval requires complete evidence'],
    groundTruth: 'INVESTIGATE',
  },
  {
    id: 'pd-04',
    statement: 'Determine whether a customer follow-up is ready.',
    entities: ['customer', 'message'],
    transitions: ['customer reply → follow-up'],
    unknowns: ['whether the customer has replied'],
    constraints: ['do not send without verified readiness'],
    groundTruth: 'PREPARE',
  },
]);

const HIDDEN_PROBLEMS = Object.freeze([
  {
    id: 'hidden-01',
    statement: 'Determine why a scheduled job missed its window.',
    entities: ['job', 'scheduler', 'worker'],
    transitions: ['queued → running', 'running → completed'],
    unknowns: ['whether worker capacity was available'],
    constraints: ['scheduler state must be current'],
    groundTruth: 'INVESTIGATE',
  },
  {
    id: 'hidden-02',
    statement: 'Determine whether inventory replenishment should proceed.',
    entities: ['warehouse', 'sku', 'supplier'],
    transitions: ['reorder → replenishment'],
    unknowns: ['whether supplier lead time changed'],
    constraints: ['lead time must be current'],
    groundTruth: 'INVESTIGATE',
  },
]);

const baselinePrimitive = createReasoningPrimitive({
  primitiveId: 'PDP-001',
  version: '1.0.0',
  purpose: 'Decompose a problem into direct factors.',
  inputContract: { problem: 'structured problem object' },
  outputContract: { decomposition: 'direct factor list' },
  strategy: 'Identify entities, unknowns, constraints, and requested outcomes.',
  status: 'VERIFIED',
});

const candidatePrimitive = createReasoningPrimitive({
  primitiveId: 'PDP-002',
  version: '2.0.0',
  parentPrimitiveId: 'PDP-001',
  purpose: 'Decompose a problem into dependencies and information-gain priorities.',
  inputContract: { problem: 'structured problem object' },
  outputContract: { decomposition: 'dependency graph' },
  strategy: 'Identify entities, transitions, unknowns, constraints, dependencies, then prioritize uncertainty-reducing work.',
  status: 'EXPERIMENTAL',
});

function execute(primitive, problem) {
  const decomposition = primitive.primitive_id === 'PDP-001'
    ? decomposeProblemV1(problem)
    : decomposeProblemV2(problem);

  const hasUnknown = decomposition.subproblems.some((item) => item.type === 'UNKNOWN');
  const hasDependency = decomposition.dependencies.length > 0;
  const proposal = hasUnknown || hasDependency ? 'INVESTIGATE' : 'PREPARE';

  return {
    proposal,
    decomposition,
    cost: decomposition.subproblems.length + decomposition.dependencies.length,
    generalizes: hasDependency || hasUnknown,
  };
}

export function runCognitiveEvolutionBenchmark() {
  const evaluation = evaluatePrimitive({
    primitive: candidatePrimitive,
    baselinePrimitive,
    cases: PROBLEMS,
    executor: execute,
  });

  const selection = selectPrimitive({
    evaluation,
    minimumAccuracyDelta: 0,
    minimumGeneralizationDelta: 0,
  });

  const heldOut = assertPrimitiveEvaluationIntegrity({
    evaluation,
    hiddenCases: HIDDEN_PROBLEMS,
  });

  const generated = generateProblemDecompositionPrimitive({
    parentPrimitive: baselinePrimitive,
    failureProfile: { hidden_dependencies: 3, missed_unknowns: 2, low_novel_problem_performance: true },
  });

  const composite = composePrimitives({
    primitiveIds: [candidatePrimitive.primitive_id, 'ADVERSARIAL-TEST-v1'],
    purpose: 'Decompose then challenge the decomposition.',
  });

  return {
    benchmark_version: BENCHMARK_VERSION,
    evaluation,
    selection,
    held_out: heldOut,
    generated_primitive: generated,
    composite_primitive: composite,
    fingerprints: {
      baseline: fingerprintPrimitive(baselinePrimitive),
      candidate: fingerprintPrimitive(candidatePrimitive),
    },
  };
}

export function assertCognitiveEvolutionBenchmark(result) {
  if (result.benchmark_version !== BENCHMARK_VERSION) throw new Error('BENCHMARK_VERSION_MISMATCH');
  if (result.evaluation.case_count !== PROBLEMS.length) throw new Error('CASE_COUNT_MISMATCH');
  if (result.held_out.integrity !== 'HELD_OUT') throw new Error('HELD_OUT_INTEGRITY_FAILED');
  if (result.selection.decision !== 'KEEP') throw new Error('CANDIDATE_NOT_SELECTED');
  if (!result.generated_primitive.parent_primitive_id) throw new Error('GENERATOR_LINEAGE_MISSING');
  if (result.composite_primitive.metadata.composed_from.length !== 2) throw new Error('COMPOSITION_LINEAGE_MISSING');
}
