export const CAPABILITY_GAP_DETECTOR_VERSION = 'reality-capability-gap-detector-v0.1';

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function detectCapabilityGaps({
  observations = [],
  failureThreshold = 0.25,
  minimumObservations = 3,
} = {}) {
  if (!Array.isArray(observations)) throw new Error('OBSERVATIONS_REQUIRED');

  const groups = new Map();
  for (const observation of observations) {
    if (!observation?.capability) continue;
    const group = groups.get(observation.capability) || [];
    group.push(observation);
    groups.set(observation.capability, group);
  }

  const gaps = [];
  for (const [capability, items] of groups.entries()) {
    if (items.length < minimumObservations) continue;

    const failures = items.filter((item) => item.outcome === 'FAIL' || item.passed === false);
    const failureRate = failures.length / items.length;
    const qualityScores = items
      .map((item) => Number(item.quality_score))
      .filter(Number.isFinite);

    if (failureRate < failureThreshold) continue;

    gaps.push({
      gap_id: `GAP-${capability}-${items.length}`,
      detector_version: CAPABILITY_GAP_DETECTOR_VERSION,
      capability,
      observation_count: items.length,
      failure_count: failures.length,
      failure_rate: failureRate,
      mean_quality_score: qualityScores.length ? mean(qualityScores) : null,
      evidence_refs: items.map((item) => item.evidence_ref).filter(Boolean),
      observed_failure_modes: [...new Set(failures.map((item) => item.failure_mode).filter(Boolean))],
      status: 'CANDIDATE',
    });
  }

  return gaps.sort((a, b) => b.failure_rate - a.failure_rate);
}

export function createResearchProblemFromGap({ gap, objective, constraints = [] } = {}) {
  if (!gap?.gap_id) throw new Error('CAPABILITY_GAP_REQUIRED');
  if (!objective) throw new Error('RESEARCH_OBJECTIVE_REQUIRED');

  return {
    research_problem_id: `RP-${gap.gap_id}`,
    capability_gap: gap.capability,
    evidence: clone(gap.evidence_refs || []),
    failure_history: clone(gap.observed_failure_modes || []),
    affected_domains: [],
    constraints: clone(constraints),
    objective,
    state: 'OPEN',
    hypotheses: [],
    experiments: [],
    candidate_genomes: [],
    resolution: null,
  };
}
