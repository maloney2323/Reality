export const COGNITIVE_EVOLUTION_PROTOCOL_VERSION = 'reality-cognitive-evolution-v0.1';
export const PROBLEM_DECOMPOSITION_PRIMITIVE_VERSION = 'problem-decomposition-v1';

const STATUSES = Object.freeze(['CANDIDATE', 'EXPERIMENTAL', 'VERIFIED', 'DEPRECATED']);
const DECISIONS = Object.freeze(['KEEP', 'REJECT', 'RETEST']);

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + stableStringify(value[key])).join(',') + '}';
}

function hashLike(value) {
  let hash = 2166136261;
  for (const char of stableStringify(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function createReasoningPrimitive({
  primitiveId,
  version = '1.0.0',
  parentPrimitiveId = null,
  purpose,
  inputContract,
  outputContract,
  strategy,
  preconditions = [],
  applicabilityDomain = 'general',
  resourceBudget = {},
  allowedTools = [],
  evaluationProtocol = 'cognitive-capability-evaluator-v0.1',
  knownFailureModes = [],
  knownLimits = [],
  createdBy = 'reality-cognitive-evolution',
  status = 'CANDIDATE',
  metadata = {},
} = {}) {
  if (!primitiveId) throw new Error('PRIMITIVE_ID_REQUIRED');
  if (!purpose) throw new Error('PRIMITIVE_PURPOSE_REQUIRED');
  if (!strategy) throw new Error('PRIMITIVE_STRATEGY_REQUIRED');
  if (!STATUSES.includes(status)) throw new Error('PRIMITIVE_STATUS_INVALID');

  return Object.freeze({
    protocol_version: COGNITIVE_EVOLUTION_PROTOCOL_VERSION,
    primitive_id: primitiveId,
    version,
    parent_primitive_id: parentPrimitiveId,
    purpose,
    input_contract: clone(inputContract || {}),
    output_contract: clone(outputContract || {}),
    strategy,
    preconditions: clone(preconditions),
    applicability_domain: applicabilityDomain,
    resource_budget: clone(resourceBudget),
    allowed_tools: [...allowedTools],
    evaluation_protocol: evaluationProtocol,
    known_failure_modes: clone(knownFailureModes),
    known_limits: clone(knownLimits),
    created_by: createdBy,
    created_at: new Date().toISOString(),
    status,
    metadata: clone(metadata),
  });
}

export function fingerprintPrimitive(primitive) {
  if (!primitive?.primitive_id) throw new Error('PRIMITIVE_REQUIRED');
  return hashLike({
    protocol_version: primitive.protocol_version,
    primitive_id: primitive.primitive_id,
    version: primitive.version,
    parent_primitive_id: primitive.parent_primitive_id,
    purpose: primitive.purpose,
    strategy: primitive.strategy,
    preconditions: primitive.preconditions,
    applicability_domain: primitive.applicability_domain,
  });
}

function validateProblem(problem) {
  if (!problem?.id) throw new Error('PROBLEM_ID_REQUIRED');
  if (!problem?.statement) throw new Error('PROBLEM_STATEMENT_REQUIRED');
  return problem;
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

export function decomposeProblemV1(problem) {
  validateProblem(problem);

  const entities = unique([
    ...(problem.entities || []),
    ...(problem.context?.entities || []),
  ]);

  const constraints = unique([
    ...(problem.constraints || []),
    ...(problem.context?.constraints || []),
  ]);

  const unknowns = unique([
    ...(problem.unknowns || []),
    ...(problem.context?.unknowns || []),
  ]);

  const requestedOutcomes = unique(problem.requestedOutcomes || []);

  const subproblems = [
    ...entities.map((entity, index) => ({
      id: `${problem.id}:entity:${index + 1}`,
      type: 'ENTITY_STATE',
      question: `What verified state is currently true for ${entity}?`,
      depends_on: [],
    })),
    ...unknowns.map((unknown, index) => ({
      id: `${problem.id}:unknown:${index + 1}`,
      type: 'UNKNOWN',
      question: `What evidence is required to resolve: ${unknown}?`,
      depends_on: [],
    })),
    ...constraints.map((constraint, index) => ({
      id: `${problem.id}:constraint:${index + 1}`,
      type: 'CONSTRAINT',
      question: `Is the constraint satisfied: ${constraint}?`,
      depends_on: [],
    })),
    ...requestedOutcomes.map((outcome, index) => ({
      id: `${problem.id}:outcome:${index + 1}`,
      type: 'OUTCOME',
      question: `What must be true for the outcome '${outcome}' to be achieved?`,
      depends_on: [],
    })),
  ];

  if (subproblems.length === 0) {
    subproblems.push({
      id: `${problem.id}:core`,
      type: 'CORE',
      question: problem.statement,
      depends_on: [],
    });
  }

  return {
    primitive_id: 'PDP-001',
    primitive_version: PROBLEM_DECOMPOSITION_PRIMITIVE_VERSION,
    problem_id: problem.id,
    method: 'DIRECT_FACTORS',
    statement: problem.statement,
    subproblems,
    dependencies: [],
    unknowns,
    constraints,
    assumptions: [],
    expected_information_gain_order: subproblems.map((item) => item.id),
  };
}

export function decomposeProblemV2(problem) {
  validateProblem(problem);

  const entities = unique([
    ...(problem.entities || []),
    ...(problem.context?.entities || []),
  ]);
  const transitions = unique([
    ...(problem.transitions || []),
    ...(problem.context?.transitions || []),
  ]);
  const unknowns = unique([
    ...(problem.unknowns || []),
    ...(problem.context?.unknowns || []),
  ]);
  const constraints = unique([
    ...(problem.constraints || []),
    ...(problem.context?.constraints || []),
  ]);

  const nodes = [
    ...entities.map((entity, index) => ({
      id: `${problem.id}:entity:${index + 1}`,
      type: 'ENTITY_STATE',
      question: `What verified state is currently true for ${entity}?`,
    })),
    ...transitions.map((transition, index) => ({
      id: `${problem.id}:transition:${index + 1}`,
      type: 'STATE_TRANSITION',
      question: `What evidence establishes the transition: ${transition}?`,
    })),
    ...unknowns.map((unknown, index) => ({
      id: `${problem.id}:unknown:${index + 1}`,
      type: 'UNKNOWN',
      question: `What evidence would most reduce uncertainty about: ${unknown}?`,
    })),
    ...constraints.map((constraint, index) => ({
      id: `${problem.id}:constraint:${index + 1}`,
      type: 'CONSTRAINT',
      question: `Is the constraint satisfied: ${constraint}?`,
    })),
  ];

  if (nodes.length === 0) {
    nodes.push({
      id: `${problem.id}:core`,
      type: 'CORE',
      question: problem.statement,
    });
  }

  const dependencies = [];
  const unknownNodes = nodes.filter((node) => node.type === 'UNKNOWN');
  const transitionNodes = nodes.filter((node) => node.type === 'STATE_TRANSITION');

  for (const transition of transitionNodes) {
    for (const entity of nodes.filter((node) => node.type === 'ENTITY_STATE')) {
      dependencies.push({ from: entity.id, to: transition.id, relation: 'STATE_PRECONDITION' });
    }
  }

  for (const unknown of unknownNodes) {
    for (const transition of transitionNodes) {
      dependencies.push({ from: unknown.id, to: transition.id, relation: 'EVIDENCE_REQUIRED_FOR' });
    }
  }

  const priority = [...nodes].sort((a, b) => {
    const score = (node) => (
      node.type === 'UNKNOWN' ? 4 :
      node.type === 'CONSTRAINT' ? 3 :
      node.type === 'STATE_TRANSITION' ? 2 : 1
    );
    return score(b) - score(a);
  });

  return {
    primitive_id: 'PDP-002',
    primitive_version: '2.0.0',
    problem_id: problem.id,
    method: 'DEPENDENCY_AND_INFORMATION_GAIN',
    statement: problem.statement,
    subproblems: nodes.map((node) => ({
      ...node,
      depends_on: dependencies.filter((edge) => edge.to === node.id).map((edge) => edge.from),
    })),
    dependencies,
    unknowns,
    constraints,
    assumptions: [],
    expected_information_gain_order: priority.map((node) => node.id),
  };
}

export function generateProblemDecompositionPrimitive({ parentPrimitive, failureProfile = {} } = {}) {
  if (!parentPrimitive?.primitive_id) throw new Error('PARENT_PRIMITIVE_REQUIRED');

  const shouldAddDependencyModel = (
    failureProfile.hidden_dependencies > 0
    || failureProfile.missed_unknowns > 0
    || failureProfile.low_novel_problem_performance === true
  );

  const nextId = shouldAddDependencyModel ? 'PDP-002' : `PDP-CANDIDATE-${hashLike(failureProfile).slice(0, 6)}`;

  return createReasoningPrimitive({
    primitiveId: nextId,
    version: shouldAddDependencyModel ? '2.0.0' : 'candidate',
    parentPrimitiveId: parentPrimitive.primitive_id,
    purpose: shouldAddDependencyModel
      ? 'Decompose problems by dependencies, unknowns, and information gain.'
      : 'Generate a candidate refinement of problem decomposition from observed failures.',
    inputContract: { problem: 'structured problem object' },
    outputContract: { decomposition: 'structured problem graph' },
    strategy: shouldAddDependencyModel
      ? 'Identify entities, state transitions, unknowns, constraints, dependencies, and prioritize uncertainty-reducing work.'
      : 'Refine the parent strategy according to the observed failure profile.',
    knownFailureModes: [],
    knownLimits: ['Candidate generation is not evidence of capability improvement.'],
    status: 'CANDIDATE',
    metadata: { failure_profile: clone(failureProfile), generated_from: parentPrimitive.primitive_id },
  });
}

export function evaluatePrimitive({ primitive, baselinePrimitive, cases = [], executor } = {}) {
  if (!primitive?.primitive_id || !baselinePrimitive?.primitive_id) throw new Error('PRIMITIVE_PAIR_REQUIRED');
  if (!Array.isArray(cases) || cases.length === 0) throw new Error('EVALUATION_CASES_REQUIRED');
  if (typeof executor !== 'function') throw new Error('PRIMITIVE_EXECUTOR_REQUIRED');

  const results = cases.map((problem) => {
    const expected = problem.groundTruth;
    const candidate = executor(primitive, problem);
    const baseline = executor(baselinePrimitive, problem);

    return {
      problem_id: problem.id,
      expected,
      candidate,
      baseline,
      candidate_correct: candidate?.proposal === expected,
      baseline_correct: baseline?.proposal === expected,
      candidate_cost: Number(candidate?.cost ?? 0),
      baseline_cost: Number(baseline?.cost ?? 0),
      candidate_generalizes: candidate?.generalizes === true,
      baseline_generalizes: baseline?.generalizes === true,
      candidate_quality_score: Number(candidate?.quality_score ?? 0),
      baseline_quality_score: Number(baseline?.quality_score ?? 0),
    };
  });

  const rate = (key) => results.filter((result) => result[key]).length / results.length;
  const candidateAccuracy = rate('candidate_correct');
  const baselineAccuracy = rate('baseline_correct');
  const candidateGeneralization = rate('candidate_generalizes');
  const baselineGeneralization = rate('baseline_generalizes');
  const candidateQuality = results.reduce((sum, r) => sum + r.candidate_quality_score, 0) / results.length;
  const baselineQuality = results.reduce((sum, r) => sum + r.baseline_quality_score, 0) / results.length;

  return {
    evaluator_version: 'cognitive-capability-evaluator-v0.1',
    primitive_id: primitive.primitive_id,
    baseline_primitive_id: baselinePrimitive.primitive_id,
    case_count: results.length,
    results,
    metrics: {
      candidate_accuracy: candidateAccuracy,
      baseline_accuracy: baselineAccuracy,
      accuracy_delta: candidateAccuracy - baselineAccuracy,
      candidate_generalization: candidateGeneralization,
      baseline_generalization: baselineGeneralization,
      generalization_delta: candidateGeneralization - baselineGeneralization,
      candidate_quality_score: candidateQuality,
      baseline_quality_score: baselineQuality,
      quality_delta: candidateQuality - baselineQuality,
      candidate_mean_cost: results.reduce((sum, r) => sum + r.candidate_cost, 0) / results.length,
      baseline_mean_cost: results.reduce((sum, r) => sum + r.baseline_cost, 0) / results.length,
    },
  };
}

export function selectPrimitive({ evaluation, minimumAccuracyDelta = 0, minimumGeneralizationDelta = 0, minimumQualityDelta = 0 } = {}) {
  if (!evaluation?.metrics) throw new Error('EVALUATION_REQUIRED');

  const passes = (
    evaluation.metrics.accuracy_delta >= minimumAccuracyDelta
    && evaluation.metrics.generalization_delta >= minimumGeneralizationDelta
    && evaluation.metrics.quality_delta >= minimumQualityDelta
  );

  return {
    decision: passes ? 'KEEP' : 'REJECT',
    primitive_id: evaluation.primitive_id,
    rationale: passes
      ? 'Candidate exceeded the configured capability gates.'
      : 'Candidate did not exceed the configured capability gates.',
    metrics: clone(evaluation.metrics),
  };
}

export function composePrimitives({ primitiveIds = [], purpose = 'Composite reasoning strategy' } = {}) {
  if (!Array.isArray(primitiveIds) || primitiveIds.length < 2) throw new Error('COMPOSITION_REQUIRES_TWO_PRIMITIVES');

  return createReasoningPrimitive({
    primitiveId: `COMPOSITE-${hashLike({ primitiveIds, purpose }).slice(0, 10)}`,
    version: '1.0.0',
    purpose,
    inputContract: { problem: 'structured problem object' },
    outputContract: { result: 'composed reasoning result' },
    strategy: 'Sequentially compose verified reasoning primitives; preserve each primitive result and lineage.',
    metadata: { composed_from: [...primitiveIds] },
    status: 'CANDIDATE',
  });
}

export function assertPrimitiveEvaluationIntegrity({ evaluation, hiddenCases = [] } = {}) {
  if (!evaluation || evaluation.evaluator_version !== 'cognitive-capability-evaluator-v0.1') {
    throw new Error('EVALUATION_VERSION_INVALID');
  }
  if (!Array.isArray(hiddenCases) || hiddenCases.length === 0) throw new Error('HIDDEN_CASES_REQUIRED');

  const evaluatedIds = new Set((evaluation.results || []).map((result) => result.problem_id));
  if (hiddenCases.some((problem) => evaluatedIds.has(problem.id))) {
    throw new Error('HIDDEN_CASE_LEAK');
  }

  return {
    integrity: 'HELD_OUT',
    evaluated_case_count: evaluation.case_count,
    hidden_case_count: hiddenCases.length,
  };
}
