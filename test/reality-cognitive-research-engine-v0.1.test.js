import {
  createCognitiveGenome,
  createResearchProblem,
  generateCandidatePopulation,
  evaluateCognitivePopulation,
  selectCognitiveGenome,
  archiveVerifiedGenome,
  createCognitiveArchive,
  addToCognitiveArchive,
  beginCognitiveResearch,
  resolveResearchProblem,
  fingerprintCognitiveGenome,
} from '../src/reality-cognitive-research-engine-v0.1.js';

export const BENCHMARK_VERSION = 'reality-cognitive-research-engine-benchmark-v0.1';

const visibleCases = Object.freeze([
  { id: 'visible-1', class: 'dependency', difficulty: 1 },
  { id: 'visible-2', class: 'uncertainty', difficulty: 1 },
  { id: 'visible-3', class: 'novel', difficulty: 2 },
]);

const hiddenCases = Object.freeze([
  { id: 'hidden-1', class: 'dependency', difficulty: 3 },
  { id: 'hidden-2', class: 'novel', difficulty: 3 },
  { id: 'hidden-3', class: 'adversarial', difficulty: 4 },
]);

const parentGenome = createCognitiveGenome({
  genomeId: 'GEN-BASELINE',
  researchObjective: 'Improve capability on unseen operational problems.',
  modules: { reasoning: 'baseline' },
  status: 'VERIFIED',
});

function generator({ parent_genome, population_size }) {
  return Array.from({ length: population_size }, (_, index) =>
    createCognitiveGenome({
      genomeId: `GEN-CANDIDATE-${index + 1}`,
      parentGenomeId: parent_genome.genome_id,
      researchObjective: parent_genome.research_objective,
      modules: { reasoning: `candidate-${index + 1}`, search: index % 2 ? 'broad' : 'focused' },
      metadata: { candidate_index: index },
    })
  );
}

function evaluator({ candidate, baseline, cases }) {
  const candidateIndex = Number(candidate.metadata?.candidate_index ?? 0);
  const candidateAdvantage = candidateIndex === 1 ? 0.25 : 0;
  const baselineAccuracy = 0.5;
  const candidateAccuracy = Math.min(1, baselineAccuracy + candidateAdvantage);
  const baselineGeneralization = 0.5;
  const candidateGeneralization = Math.min(1, baselineGeneralization + candidateAdvantage);
  const baselineQuality = 0.5;
  const candidateQuality = Math.min(1, baselineQuality + candidateAdvantage);
  const baselineRobustness = 0.5;
  const candidateRobustness = Math.min(1, baselineRobustness + candidateAdvantage);
  const baselineEfficiency = 0.5;
  const candidateEfficiency = baselineEfficiency;

  return {
    genome_id: candidate.genome_id,
    baseline_genome_id: baseline.genome_id,
    case_count: cases.length,
    phase_case_ids: cases.map((item) => item.id),
    metrics: {
      accuracy_delta: candidateAccuracy - baselineAccuracy,
      generalization_delta: candidateGeneralization - baselineGeneralization,
      quality_delta: candidateQuality - baselineQuality,
      robustness_delta: candidateRobustness - baselineRobustness,
      efficiency_delta: candidateEfficiency - baselineEfficiency,
    },
  };
}

export function runCognitiveResearchEngineBenchmark() {
  const researchProblem = createResearchProblem({
    researchProblemId: 'RP-001',
    capabilityGap: 'Current reasoning does not generalize reliably to unseen problem classes.',
    evidence: [{ type: 'evaluation', ref: 'benchmark-v0.1' }],
    objective: 'Discover a cognitive architecture that improves held-out capability without changing the governance boundary.',
  });

  const run = beginCognitiveResearch({
    researchProblem,
    parentGenome,
    generator,
    evaluator,
    visibleCases,
    hiddenCases,
    populationSize: 3,
  });

  const selected = selectCognitiveGenome({
    evaluation: run.evaluation,
    candidateId: 'GEN-CANDIDATE-2',
    gates: {
      visible_accuracy_delta: 0,
      hidden_accuracy_delta: 0,
      hidden_generalization_delta: 0,
      hidden_quality_delta: 0,
      hidden_robustness_delta: 0,
    },
  });

  const verified = archiveVerifiedGenome({
    genome: run.population.candidates.find((candidate) => candidate.genome_id === 'GEN-CANDIDATE-2'),
    selection: selected,
    evidenceRefs: ['benchmark-v0.1-visible', 'benchmark-v0.1-hidden'],
  });

  let archive = createCognitiveArchive();
  archive = addToCognitiveArchive(archive, verified);

  const resolved = resolveResearchProblem({
    researchProblem,
    selectedGenome: verified,
    selection: selected,
    evidenceRefs: ['benchmark-v0.1-hidden'],
  });

  return {
    benchmark_version: BENCHMARK_VERSION,
    parent_fingerprint: fingerprintCognitiveGenome(parentGenome),
    population_size: run.population.candidates.length,
    visible_cases: visibleCases.length,
    hidden_cases: hiddenCases.length,
    selected,
    verified_genome_id: verified.genome_id,
    archive_size: archive.entries.length,
    resolved_state: resolved.state,
    hidden_case_ids: hiddenCases.map((item) => item.id),
    evaluated_hidden_case_ids: run.evaluation.hidden.flatMap((item) => item.result.phase_case_ids),
  };
}

export function assertCognitiveResearchEngineBenchmark(result) {
  if (result.benchmark_version !== BENCHMARK_VERSION) throw new Error('BENCHMARK_VERSION_MISMATCH');
  if (result.population_size !== 3) throw new Error('POPULATION_SIZE_MISMATCH');
  if (result.hidden_cases !== 3) throw new Error('HIDDEN_CASE_COUNT_MISMATCH');
  if (result.selected.decision !== 'KEEP') throw new Error('CANDIDATE_NOT_KEPT');
  if (result.verified_genome_id !== 'GEN-CANDIDATE-2') throw new Error('VERIFIED_GENOME_MISMATCH');
  if (result.archive_size !== 1) throw new Error('ARCHIVE_SIZE_MISMATCH');
  if (result.resolved_state !== 'RESOLVED') throw new Error('RESEARCH_NOT_RESOLVED');
  if (result.evaluated_hidden_case_ids.some((id) => !result.hidden_case_ids.includes(id))) {
    throw new Error('HIDDEN_EVALUATION_SCOPE_INVALID');
  }
}
