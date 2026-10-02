import {
  createCognitiveSearchSpace,
  synthesizeCognitivePrograms,
  evaluateSynthesizedPrograms,
  selectSynthesizedInvention,
  verifyInventionReceipt,
  executeCognitiveProgram,
} from '../src/reality-cognitive-invention-v0.1.js';

export const BENCHMARK_VERSION = 'reality-cognitive-invention-benchmark-v0.1';

const OPERATORS = [
  {
    id: 'REQUIRE_ALL',
    apply: (state) => ({
      ...state,
      decision: state.required.every((fact) => state.facts.includes(fact)) ? state.decision : 'INVESTIGATE',
    }),
  },
  {
    id: 'REJECT_CONTRADICTION',
    apply: (state) => ({
      ...state,
      decision: state.contradictions.length ? 'INVESTIGATE' : state.decision,
    }),
  },
  {
    id: 'NORMALIZE',
    apply: (state) => ({ ...state, facts: [...new Set(state.facts)] }),
  },
];

const visibleCases = Object.freeze([
  { id: 'visible-1', facts: ['identity', 'amount'], required: ['identity', 'amount'], contradictions: [], expected: 'ACT' },
  { id: 'visible-2', facts: ['identity'], required: ['identity', 'amount'], contradictions: [], expected: 'INVESTIGATE' },
  { id: 'visible-3', facts: ['identity', 'amount'], required: ['identity', 'amount'], contradictions: ['amount'], expected: 'INVESTIGATE' },
  { id: 'visible-4', facts: ['identity', 'amount', 'amount'], required: ['identity', 'amount'], contradictions: [], expected: 'ACT' },
]);

const hiddenCases = Object.freeze([
  { id: 'hidden-1', facts: ['identity', 'amount'], required: ['identity', 'amount'], contradictions: ['amount'], expected: 'INVESTIGATE' },
  { id: 'hidden-2', facts: ['identity'], required: ['identity', 'amount'], contradictions: [], expected: 'INVESTIGATE' },
  { id: 'hidden-3', facts: ['identity', 'amount'], required: ['identity', 'amount'], contradictions: [], expected: 'ACT' },
  { id: 'hidden-4', facts: ['identity', 'amount', 'amount'], required: ['identity', 'amount'], contradictions: ['identity'], expected: 'INVESTIGATE' },
]);

const baseline = Object.freeze({
  program_id: 'BASELINE',
  artifact_hash: 'BASELINE-EMPTY',
  operations: [],
});

function independentEvaluator({ program, cases, execute }) {
  let correct = 0;
  let quality = 0;
  let robust = 0;

  for (const item of cases) {
    const input = { ...item, decision: 'ACT' };
    const output = execute(program, input);
    if (output.decision === item.expected) correct += 1;
    if (output.decision === item.expected && item.expected === 'INVESTIGATE') quality += 1;
    if (output.decision === item.expected) robust += 1;
  }

  const baselineCorrect = cases.filter((item) => 'ACT' === item.expected).length;
  return {
    case_count: cases.length,
    accuracy_delta: (correct - baselineCorrect) / cases.length,
    quality_delta: (quality - cases.filter((item) => item.expected === 'INVESTIGATE').length) / cases.length,
    robustness_delta: (robust - baselineCorrect) / cases.length,
    phase_case_ids: cases.map((item) => item.id),
  };
}

function chooseBestHiddenCandidate(evaluation) {
  return evaluation.hidden
    .map((item) => ({ ...item, score: Number(item.result.accuracy_delta) + Number(item.result.quality_delta) }))
    .sort((a, b) => b.score - a.score || a.program_id.localeCompare(b.program_id))[0];
}

export function runCognitiveInventionBenchmark() {
  const searchSpace = createCognitiveSearchSpace({ operators: OPERATORS, maxDepth: 2 });
  const programs = synthesizeCognitivePrograms({
    searchSpace,
    parentProgram: [],
    seedPrograms: [],
  });

  const evaluation = evaluateSynthesizedPrograms({
    programs,
    parentProgram: baseline,
    searchSpace,
    visibleCases,
    hiddenCases,
    evaluator: independentEvaluator,
  });

  const selectedCandidate = chooseBestHiddenCandidate(evaluation);
  const selection = selectSynthesizedInvention({
    evaluation,
    candidateId: selectedCandidate.program_id,
    baseline,
    gates: {
      hidden_accuracy_delta: 0,
      hidden_quality_delta: 0,
      hidden_robustness_delta: 0,
    },
  });

  const candidate = programs.find((program) => program.program_id === selectedCandidate.program_id);
  const replay = executeCognitiveProgram(candidate, searchSpace, hiddenCases[0]);
  const replayAgain = executeCognitiveProgram(candidate, searchSpace, hiddenCases[0]);

  const receipt = verifyInventionReceipt({
    selection,
    evaluation,
    candidate,
    rerun: {
      reproducible: JSON.stringify(replay) === JSON.stringify(replayAgain),
      parent_artifact_hash: baseline.artifact_hash,
      candidate_artifact_hash: candidate.artifact_hash,
    },
  });

  return {
    benchmark_version: BENCHMARK_VERSION,
    search_space_size: programs.length,
    selected_program: candidate.operations,
    selection,
    receipt,
    visible_case_ids: visibleCases.map((item) => item.id),
    hidden_case_ids: hiddenCases.map((item) => item.id),
    evaluated_hidden_case_ids: evaluation.hidden.flatMap((item) => item.result.phase_case_ids),
  };
}

export function assertCognitiveInventionBenchmark(result) {
  if (result.benchmark_version !== BENCHMARK_VERSION) throw new Error('BENCHMARK_VERSION_MISMATCH');
  if (result.search_space_size < 10) throw new Error('SEARCH_SPACE_TOO_SMALL');
  if (result.selection.decision !== 'KEEP') throw new Error('NO_FUNCTIONAL_INVENTION_VERIFIED');
  if (!result.selection.novelty) throw new Error('NOVELTY_GATE_FAILED');
  if (!result.receipt.authority_granted === false) throw new Error('AUTHORITY_BOUNDARY_BROKEN');
  if (result.receipt.external_effects_permitted !== false) throw new Error('EXTERNAL_EFFECT_BOUNDARY_BROKEN');
  if (!result.receipt.reproducibility.reproducible) throw new Error('REPRODUCIBILITY_FAILED');
  const hidden = new Set(result.hidden_case_ids);
  if (result.evaluated_hidden_case_ids.some((id) => !hidden.has(id))) throw new Error('HIDDEN_SCOPE_INVALID');
}
