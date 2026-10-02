export const COGNITIVE_INVENTION_VERSION = 'reality-cognitive-invention-v0.1';

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

export function createCognitiveSearchSpace({ operators = [], maxDepth = 2 } = {}) {
  if (!Array.isArray(operators) || operators.length < 2) throw new Error('OPERATOR_SPACE_TOO_SMALL');
  if (!Number.isInteger(maxDepth) || maxDepth < 1) throw new Error('MAX_DEPTH_INVALID');
  const normalized = operators.map((operator) => {
    if (!operator?.id || typeof operator.apply !== 'function') throw new Error('OPERATOR_INVALID');
    return { id: operator.id, apply: operator.apply };
  });
  return Object.freeze({ version: 'reality-cognitive-search-space-v0.1', operators: normalized, max_depth: maxDepth });
}

export function synthesizeCognitivePrograms({ searchSpace, parentProgram = [], seedPrograms = [] } = {}) {
  if (!searchSpace?.operators?.length) throw new Error('SEARCH_SPACE_REQUIRED');
  const seen = new Set(seedPrograms.map((program) => program.join('>')));
  const candidates = [];

  function visit(prefix, depth) {
    if (prefix.length >= 1) {
      const key = prefix.join('>');
      if (!seen.has(key)) {
        seen.add(key);
        candidates.push(Object.freeze({
          program_id: 'PROGRAM-' + hashLike(prefix),
          parent_program: [...parentProgram],
          operations: [...prefix],
          artifact_hash: hashLike({ operations: prefix }),
          provenance: 'SYNTHESIZED_BY_SEARCH',
        }));
      }
    }
    if (depth >= searchSpace.max_depth) return;
    for (const operator of searchSpace.operators) visit([...prefix, operator.id], depth + 1);
  }

  visit([], 0);
  return candidates;
}

export function executeCognitiveProgram(program, searchSpace, input) {
  const byId = new Map(searchSpace.operators.map((operator) => [operator.id, operator]));
  return program.operations.reduce((state, operationId) => {
    const operator = byId.get(operationId);
    if (!operator) throw new Error('UNKNOWN_SYNTHESIZED_OPERATOR');
    return operator.apply(clone(state));
  }, clone(input));
}

export function evaluateSynthesizedPrograms({
  programs,
  parentProgram,
  searchSpace,
  visibleCases,
  hiddenCases,
  evaluator,
} = {}) {
  if (!programs?.length) throw new Error('NO_SYNTHESIZED_PROGRAMS');
  if (!Array.isArray(hiddenCases) || !hiddenCases.length) throw new Error('HIDDEN_CASES_REQUIRED');
  if (typeof evaluator !== 'function') throw new Error('INDEPENDENT_EVALUATOR_REQUIRED');

  const visibleIds = new Set(visibleCases.map((item) => item.id));
  if (hiddenCases.some((item) => visibleIds.has(item.id))) throw new Error('HIDDEN_VISIBLE_COLLISION');

  const run = (cases, phase) => programs.map((program) => ({
    program_id: program.program_id,
    artifact_hash: program.artifact_hash,
    phase,
    result: evaluator({
      program,
      parent_program: parentProgram,
      cases: clone(cases),
      execute: (candidate, input) => executeCognitiveProgram(candidate, searchSpace, input),
    }),
  }));

  return {
    version: 'reality-independent-invention-evaluator-v0.1',
    visible: run(visibleCases, 'VISIBLE'),
    hidden: run(hiddenCases, 'HIDDEN'),
  };
}

export function selectSynthesizedInvention({
  evaluation,
  candidateId,
  baseline,
  gates = { hidden_accuracy_delta: 0, hidden_quality_delta: 0, hidden_robustness_delta: 0 },
} = {}) {
  const candidate = evaluation.hidden.find((item) => item.program_id === candidateId);
  const visible = evaluation.visible.find((item) => item.program_id === candidateId);
  if (!candidate || !visible) throw new Error('INVENTION_EVALUATION_NOT_FOUND');

  const novelty = candidate.artifact_hash !== baseline.artifact_hash;
  const metrics = {
    visible_accuracy_delta: Number(visible.result.accuracy_delta ?? 0),
    hidden_accuracy_delta: Number(candidate.result.accuracy_delta ?? 0),
    hidden_quality_delta: Number(candidate.result.quality_delta ?? 0),
    hidden_robustness_delta: Number(candidate.result.robustness_delta ?? 0),
  };
  const passes = novelty && Object.entries(gates).every(([key, minimum]) =>
    Number(metrics[key] ?? -Infinity) >= Number(minimum)
  );

  return {
    decision: passes ? 'KEEP' : 'REJECT',
    novelty,
    candidate_id: candidateId,
    metrics,
    artifact_hash: candidate.artifact_hash,
  };
}

export function verifyInventionReceipt({
  selection,
  evaluation,
  candidate,
  rerun,
} = {}) {
  if (selection?.decision !== 'KEEP') throw new Error('INVENTION_NOT_VERIFIED');
  if (!selection.novelty) throw new Error('FUNCTIONAL_NOVELTY_REQUIRED');
  if (!rerun?.reproducible) throw new Error('REPRODUCIBILITY_REQUIRED');
  const hidden = evaluation.hidden.find((item) => item.program_id === candidate.program_id);
  if (!hidden) throw new Error('HIDDEN_RESULT_REQUIRED');
  return Object.freeze({
    invention_version: COGNITIVE_INVENTION_VERSION,
    invention_id: 'INV-' + candidate.artifact_hash,
    candidate_program_id: candidate.program_id,
    artifact_hash: candidate.artifact_hash,
    parent_artifact_hash: rerun.parent_artifact_hash,
    novelty: true,
    capability_gain: clone(selection.metrics),
    held_out_evidence: clone(hidden.result),
    reproducibility: clone(rerun),
    provenance: clone(candidate.provenance),
    governance_boundary: 'IMMUTABLE_GOVERNANCE_KERNEL',
    authority_granted: false,
    external_effects_permitted: false,
  });
}
