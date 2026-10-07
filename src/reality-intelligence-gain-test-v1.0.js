/**
 * REALITY INTELLIGENCE GAIN TEST v1.0
 *
 * Measures whether the same learner performs better when operating
 * inside Reality's governed Universe than outside it.
 *
 * This is an evaluation harness, not a claim of intelligence gain.
 * Scores are produced only from executed cases and independent grading.
 */

export const REALITY_INTELLIGENCE_GAIN_TEST_VERSION =
  'reality-intelligence-gain-test-v1.0';

export const CONDITIONS = Object.freeze([
  'BASELINE_MODEL',
  'PROMPTED_MODEL',
  'REALITY_UNIVERSE',
  'REALITY_UNIVERSE_PLUS_VERIFIED_LEARNING',
]);

export const CAPABILITIES = Object.freeze([
  'EVIDENCE_GROUNDING',
  'WORLD_RECONSTRUCTION',
  'CONTRADICTION_HANDLING',
  'UNCERTAINTY_CALIBRATION',
  'WORK_DISCOVERY',
  'PLANNING',
  'VERIFICATION',
  'RECOVERY_FROM_WRONG_ASSUMPTIONS',
  'GENERALIZATION',
]);

const clone = (v) => v == null ? v : JSON.parse(JSON.stringify(v));

function requireField(v, code) {
  if (v == null || v === '') throw new Error(code);
}

export function createGainBenchmark({
  benchmarkId = 'REALITY-INTELLIGENCE-GAIN-001',
  heldoutCases,
  seed,
} = {}) {
  requireField(seed, 'BENCHMARK_SEED_REQUIRED');
  if (!Array.isArray(heldoutCases) || heldoutCases.length < 2) {
    throw new Error('HELDOUT_CASES_REQUIRED');
  }

  return Object.freeze({
    schema: REALITY_INTELLIGENCE_GAIN_TEST_VERSION,
    benchmark_id: benchmarkId,
    seed,
    conditions: clone(CONDITIONS),
    capabilities: clone(CAPABILITIES),
    heldout_cases: Object.freeze(heldoutCases.map(clone)),
    learner_identity: 'SAME_LEARNER_ACROSS_ALL_CONDITIONS',
    scoring_identity: 'INDEPENDENT_EVALUATOR_REQUIRED',
    answer_leakage: 'PROHIBITED',
  });
}

export function scoreCondition({ condition, cases, evaluator }) {
  if (!CONDITIONS.includes(condition)) throw new Error('UNKNOWN_CONDITION');
  if (!Array.isArray(cases) || cases.length === 0) throw new Error('CASES_REQUIRED');
  requireField(evaluator?.id, 'INDEPENDENT_EVALUATOR_REQUIRED');

  const results = cases.map((item) => {
    const scores = Object.fromEntries(
      CAPABILITIES.map((capability) => [
        capability,
        Number.isFinite(item?.scores?.[capability]) ? item.scores[capability] : null,
      ]),
    );

    return {
      case_id: item.case_id,
      scores,
      evidence_refs: clone(item.evidence_refs || []),
      evaluator_ref: evaluator.id,
    };
  });

  const measurable = results.flatMap((r) =>
    Object.values(r.scores).filter((v) => Number.isFinite(v)),
  );

  const mean = measurable.length
    ? measurable.reduce((a, b) => a + b, 0) / measurable.length
    : null;

  return {
    condition,
    case_count: results.length,
    results,
    mean_score: mean,
    evaluated_independently: true,
  };
}

export function compareConditions({ benchmark, scoredConditions }) {
  requireField(benchmark?.benchmark_id, 'BENCHMARK_REQUIRED');
  const byCondition = Object.fromEntries(
    scoredConditions.map((x) => [x.condition, x]),
  );

  const baseline = byCondition.BASELINE_MODEL?.mean_score ?? null;
  const prompted = byCondition.PROMPTED_MODEL?.mean_score ?? null;
  const reality = byCondition.REALITY_UNIVERSE?.mean_score ?? null;
  const learning = byCondition.REALITY_UNIVERSE_PLUS_VERIFIED_LEARNING?.mean_score ?? null;

  const delta = (a, b) =>
    Number.isFinite(a) && Number.isFinite(b) ? a - b : null;

  const result = {
    schema: REALITY_INTELLIGENCE_GAIN_TEST_VERSION,
    benchmark_id: benchmark.benchmark_id,
    status: Number.isFinite(learning) ? 'MEASURED' : 'INSUFFICIENT_EVIDENCE',
    means: { baseline, prompted, reality, learning },
    deltas: {
      reality_vs_baseline: delta(reality, baseline),
      reality_vs_prompted: delta(reality, prompted),
      learning_vs_reality: delta(learning, reality),
      learning_vs_baseline: delta(learning, baseline),
    },
    claim: 'NO_GAIN_CLAIM_UNTIL_HELDOUT_GENERALIZATION_IS_VERIFIED',
  };

  if (Number.isFinite(learning) && Number.isFinite(reality)) {
    result.claim =
      learning > reality
        ? 'CANDIDATE_GAIN_REQUIRES_REPRODUCTION_AND_GENERALIZATION'
        : 'NO_MEASURED_GAIN_OVER_REALITY_UNIVERSE_BASELINE';
  }

  return result;
}
