export const COGNITIVE_RESEARCH_ENGINE_VERSION = 'reality-cognitive-research-engine-v0.1';
export const COGNITIVE_GENOME_VERSION = 'reality-cognitive-genome-v0.1';

const ARCHIVE_STATUSES = Object.freeze(['CANDIDATE', 'EXPERIMENTAL', 'VERIFIED', 'RETIRED']);
const RESEARCH_STATES = Object.freeze(['OPEN', 'EXPERIMENTING', 'EVALUATING', 'RESOLVED', 'BLOCKED']);

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

function requireFunction(fn, code) {
  if (typeof fn !== 'function') throw new Error(code);
}

export function createCognitiveGenome({
  genomeId,
  parentGenomeId = null,
  modules = {},
  researchObjective,
  resourceBudget = {},
  evaluationContract = {},
  governanceBoundary = 'IMMUTABLE_GOVERNANCE_KERNEL',
  status = 'CANDIDATE',
  metadata = {},
} = {}) {
  if (!genomeId) throw new Error('GENOME_ID_REQUIRED');
  if (!researchObjective) throw new Error('GENOME_OBJECTIVE_REQUIRED');
  if (!ARCHIVE_STATUSES.includes(status)) throw new Error('GENOME_STATUS_INVALID');

  return Object.freeze({
    genome_version: COGNITIVE_GENOME_VERSION,
    genome_id: genomeId,
    parent_genome_id: parentGenomeId,
    modules: clone(modules),
    research_objective: researchObjective,
    resource_budget: clone(resourceBudget),
    evaluation_contract: clone(evaluationContract),
    governance_boundary: governanceBoundary,
    status,
    metadata: clone(metadata),
    created_at: new Date().toISOString(),
  });
}

export function fingerprintCognitiveGenome(genome) {
  if (!genome?.genome_id) throw new Error('GENOME_REQUIRED');
  return hashLike({
    genome_version: genome.genome_version,
    parent_genome_id: genome.parent_genome_id,
    modules: genome.modules,
    research_objective: genome.research_objective,
    evaluation_contract: genome.evaluation_contract,
    governance_boundary: genome.governance_boundary,
  });
}

export function createResearchProblem({
  researchProblemId,
  capabilityGap,
  evidence = [],
  failureHistory = [],
  affectedDomains = [],
  constraints = [],
  objective,
  state = 'OPEN',
  metadata = {},
} = {}) {
  if (!researchProblemId) throw new Error('RESEARCH_PROBLEM_ID_REQUIRED');
  if (!capabilityGap) throw new Error('CAPABILITY_GAP_REQUIRED');
  if (!objective) throw new Error('RESEARCH_OBJECTIVE_REQUIRED');
  if (!RESEARCH_STATES.includes(state)) throw new Error('RESEARCH_STATE_INVALID');

  return Object.freeze({
    engine_version: COGNITIVE_RESEARCH_ENGINE_VERSION,
    research_problem_id: researchProblemId,
    capability_gap: capabilityGap,
    evidence: clone(evidence),
    failure_history: clone(failureHistory),
    affected_domains: [...affectedDomains],
    constraints: clone(constraints),
    objective,
    state,
    hypotheses: [],
    experiments: [],
    candidate_genomes: [],
    resolution: null,
    created_at: new Date().toISOString(),
    metadata: clone(metadata),
  });
}

export function recordResearchHypothesis(researchProblem, hypothesis) {
  if (!researchProblem?.research_problem_id) throw new Error('RESEARCH_PROBLEM_REQUIRED');
  if (!hypothesis?.hypothesis_id) throw new Error('HYPOTHESIS_ID_REQUIRED');
  return {
    ...clone(researchProblem),
    state: 'EXPERIMENTING',
    hypotheses: [...(researchProblem.hypotheses || []), clone(hypothesis)],
  };
}

export function recordResearchExperiment(researchProblem, experiment) {
  if (!researchProblem?.research_problem_id) throw new Error('RESEARCH_PROBLEM_REQUIRED');
  if (!experiment?.experiment_id) throw new Error('EXPERIMENT_ID_REQUIRED');
  return {
    ...clone(researchProblem),
    state: 'EVALUATING',
    experiments: [...(researchProblem.experiments || []), clone(experiment)],
  };
}

export function createCandidatePopulation({ candidates = [], parentGenomeId = null } = {}) {
  if (!Array.isArray(candidates) || candidates.length === 0) throw new Error('CANDIDATE_POPULATION_REQUIRED');
  const seen = new Set();
  const unique = candidates.filter((candidate) => {
    if (!candidate?.genome_id || seen.has(candidate.genome_id)) return false;
    seen.add(candidate.genome_id);
    return true;
  });
  if (!unique.length) throw new Error('CANDIDATE_POPULATION_EMPTY');
  return Object.freeze({
    population_version: 'reality-cognitive-population-v0.1',
    parent_genome_id: parentGenomeId,
    candidates: unique.map(clone),
    diversity: unique.map((candidate) => ({
      genome_id: candidate.genome_id,
      fingerprint: fingerprintCognitiveGenome(candidate),
    })),
  });
}

export function generateCandidatePopulation({
  researchProblem,
  parentGenome,
  generator,
  populationSize = 3,
} = {}) {
  if (!researchProblem?.research_problem_id) throw new Error('RESEARCH_PROBLEM_REQUIRED');
  if (!parentGenome?.genome_id) throw new Error('PARENT_GENOME_REQUIRED');
  requireFunction(generator, 'ARCHITECTURE_GENERATOR_REQUIRED');
  if (!Number.isInteger(populationSize) || populationSize < 1) throw new Error('POPULATION_SIZE_INVALID');

  const candidates = generator({
    research_problem: clone(researchProblem),
    parent_genome: clone(parentGenome),
    population_size: populationSize,
  });

  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error('ARCHITECTURE_GENERATOR_RETURNED_NO_CANDIDATES');
  }

  return createCandidatePopulation({ candidates, parentGenomeId: parentGenome.genome_id });
}

export function evaluateCognitivePopulation({
  population,
  baselineGenome,
  cases = [],
  hiddenCases = [],
  evaluator,
} = {}) {
  if (!population?.candidates?.length) throw new Error('POPULATION_REQUIRED');
  if (!baselineGenome?.genome_id) throw new Error('BASELINE_GENOME_REQUIRED');
  requireFunction(evaluator, 'CAPABILITY_EVALUATOR_REQUIRED');
  if (!Array.isArray(cases) || !cases.length) throw new Error('VISIBLE_CASES_REQUIRED');
  if (!Array.isArray(hiddenCases) || !hiddenCases.length) throw new Error('HIDDEN_CASES_REQUIRED');

  const visible = population.candidates.map((candidate) => evaluator({
    candidate,
    baseline: baselineGenome,
    cases: clone(cases),
    phase: 'VISIBLE',
  }));

  const evaluatedIds = new Set(cases.map((item) => item.id));
  if (hiddenCases.some((item) => evaluatedIds.has(item.id))) throw new Error('HIDDEN_CASE_ID_COLLISION');

  const hidden = population.candidates.map((candidate) => ({
    genome_id: candidate.genome_id,
    result: evaluator({
      candidate,
      baseline: baselineGenome,
      cases: clone(hiddenCases),
      phase: 'HIDDEN',
    }),
  }));

  return {
    evaluator_version: 'reality-independent-capability-evaluator-v0.1',
    population_id: population.diversity.map((item) => item.genome_id).join('|'),
    visible,
    hidden,
  };
}

export function selectCognitiveGenome({
  evaluation,
  candidateId,
  gates = {},
} = {}) {
  if (!evaluation?.visible || !evaluation?.hidden) throw new Error('POPULATION_EVALUATION_REQUIRED');
  const visible = evaluation.visible.find((item) => item.genome_id === candidateId);
  const hidden = evaluation.hidden.find((item) => item.genome_id === candidateId);
  if (!visible || !hidden) throw new Error('CANDIDATE_EVALUATION_NOT_FOUND');

  const metrics = {
    visible_accuracy_delta: Number(visible.metrics?.accuracy_delta ?? 0),
    hidden_accuracy_delta: Number(hidden.result?.accuracy_delta ?? 0),
    hidden_generalization_delta: Number(hidden.result?.generalization_delta ?? 0),
    hidden_quality_delta: Number(hidden.result?.quality_delta ?? 0),
    hidden_robustness_delta: Number(hidden.result?.robustness_delta ?? 0),
    hidden_efficiency_delta: Number(hidden.result?.efficiency_delta ?? 0),
  };

  const passes = Object.entries(gates).every(([metric, minimum]) =>
    Number(metrics[metric] ?? -Infinity) >= Number(minimum)
  );

  return {
    decision: passes ? 'KEEP' : 'REJECT',
    candidate_id: candidateId,
    metrics,
    rationale: passes
      ? 'Candidate satisfied every configured capability gate on visible and held-out evaluation.'
      : 'Candidate failed at least one configured capability gate.',
  };
}

export function archiveVerifiedGenome({ genome, selection, evidenceRefs = [] } = {}) {
  if (!genome?.genome_id) throw new Error('GENOME_REQUIRED');
  if (selection?.decision !== 'KEEP') throw new Error('ONLY_VERIFIED_GENOMES_CAN_BE_ARCHIVED');
  return Object.freeze({
    ...clone(genome),
    status: 'VERIFIED',
    verification: {
      selection: clone(selection),
      evidence_refs: [...evidenceRefs],
      verified_at: new Date().toISOString(),
    },
  });
}

export function createCognitiveArchive({ entries = [] } = {}) {
  return {
    archive_version: 'reality-cognitive-archive-v0.1',
    entries: entries.map(clone),
  };
}

export function addToCognitiveArchive(archive, genome) {
  if (!archive?.archive_version) throw new Error('ARCHIVE_REQUIRED');
  if (!genome?.genome_id) throw new Error('GENOME_REQUIRED');
  const existing = new Set((archive.entries || []).map((entry) => entry.genome_id));
  if (existing.has(genome.genome_id)) return clone(archive);
  return {
    ...clone(archive),
    entries: [...(archive.entries || []), clone(genome)],
  };
}

export function beginCognitiveResearch({
  researchProblem,
  parentGenome,
  generator,
  evaluator,
  visibleCases,
  hiddenCases,
  populationSize = 3,
} = {}) {
  const population = generateCandidatePopulation({
    researchProblem,
    parentGenome,
    generator,
    populationSize,
  });

  const evaluation = evaluateCognitivePopulation({
    population,
    baselineGenome: parentGenome,
    cases: visibleCases,
    hiddenCases,
    evaluator,
  });

  return {
    engine_version: COGNITIVE_RESEARCH_ENGINE_VERSION,
    research_problem_id: researchProblem.research_problem_id,
    parent_genome_id: parentGenome.genome_id,
    population,
    evaluation,
  };
}

export function resolveResearchProblem({
  researchProblem,
  selectedGenome,
  selection,
  evidenceRefs = [],
} = {}) {
  if (!researchProblem?.research_problem_id) throw new Error('RESEARCH_PROBLEM_REQUIRED');
  const resolved = selection?.decision === 'KEEP';
  return {
    ...clone(researchProblem),
    state: resolved ? 'RESOLVED' : 'OPEN',
    resolution: {
      status: resolved ? 'CAPABILITY_GAIN_VERIFIED' : 'NO_CAPABILITY_GAIN_VERIFIED',
      selected_genome_id: resolved ? selectedGenome?.genome_id || null : null,
      selection: clone(selection),
      evidence_refs: [...evidenceRefs],
      resolved_at: resolved ? new Date().toISOString() : null,
    },
  };
}
