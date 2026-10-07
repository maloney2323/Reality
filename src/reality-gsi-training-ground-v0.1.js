import crypto from 'node:crypto';

export const GSI_TRAINING_GROUND_VERSION = 'reality-gsi-training-ground-v0.1';

export const LEARNING_STATES = Object.freeze([
  'BASELINE_FROZEN',
  'EPISODE_CAPTURED',
  'LEARNING_PROPOSED',
  'SANDBOX_RUNNING',
  'EVALUATING',
  'VERIFIED',
  'REJECTED',
  'PROMOTION_PENDING',
  'PROMOTED',
]);

export const TRAINING_GROUND_INVARIANTS = Object.freeze({
  governance_kernel_immutable: true,
  authority_not_derived_from_capability: true,
  model_output_not_truth: true,
  model_output_not_authority: true,
  training_example_not_ground_truth: true,
  sandbox_cannot_write_production_graph: true,
  hidden_evaluation_is_not_exposed_to_learner: true,
  promotion_requires_independent_verification: true,
  promotion_requires_regression_pass: true,
  promotion_requires_measured_generalization: true,
  failed_candidate_cannot_promote: true,
  learner_provider_is_replaceable: true,
});

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function stable(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stable);
  return Object.fromEntries(Object.keys(value).sort().map((k) => [k, stable(value[k])]));
}

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

function requireText(value, code) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(code);
}

function requireArray(value, code) {
  if (!Array.isArray(value) || value.length === 0) throw new Error(code);
}

export function createLearnerAdapter({
  learnerId,
  provider = 'replaceable',
  version = 'unknown',
  capabilities = [],
  observe,
  reason,
  propose,
  explain,
  learn,
} = {}) {
  requireText(learnerId, 'LEARNER_ID_REQUIRED');
  requireText(provider, 'LEARNER_PROVIDER_REQUIRED');
  for (const [name, fn] of Object.entries({ observe, reason, propose, explain })) {
    if (typeof fn !== 'function') throw new Error(`LEARNER_${name.toUpperCase()}_REQUIRED`);
  }

  return Object.freeze({
    adapter_version: 'reality-learner-adapter-v0.1',
    learner_id: learnerId,
    provider,
    version,
    capabilities: clone(capabilities),
    observe,
    reason,
    propose,
    explain,
    learn: typeof learn === 'function' ? learn : null,
  });
}

export function freezeBaseline({
  learner,
  benchmarkVersion,
  cases,
  hiddenCaseIds = [],
  governanceKernelHash,
  baselineResults,
} = {}) {
  if (!learner?.learner_id) throw new Error('LEARNER_REQUIRED');
  requireText(benchmarkVersion, 'BENCHMARK_VERSION_REQUIRED');
  requireArray(cases, 'VISIBLE_BASELINE_CASES_REQUIRED');
  requireText(governanceKernelHash, 'GOVERNANCE_KERNEL_HASH_REQUIRED');
  if (!baselineResults) throw new Error('BASELINE_RESULTS_REQUIRED');

  const visibleIds = new Set(cases.map((item) => item.id).filter(Boolean));
  if (hiddenCaseIds.some((id) => visibleIds.has(id))) throw new Error('HIDDEN_CASE_ID_COLLISION');

  const baseline = {
    training_ground_version: GSI_TRAINING_GROUND_VERSION,
    learner_id: learner.learner_id,
    learner_provider: learner.provider,
    learner_version: learner.version,
    benchmark_version: benchmarkVersion,
    visible_case_ids: [...visibleIds],
    hidden_case_ids: [...hiddenCaseIds],
    governance_kernel_hash: governanceKernelHash,
    results: clone(baselineResults),
  };

  return Object.freeze({
    ...baseline,
    baseline_id: `baseline:${digest(baseline)}`,
    baseline_hash: digest(baseline),
    state: 'BASELINE_FROZEN',
  });
}

export function createTrainingEpisode({
  episodeId,
  task,
  evidence = [],
  worldState = {},
  expectedOutcomeContract = {},
  verificationContract = {},
  authority = { status: 'NOT_AUTHORIZED' },
} = {}) {
  requireText(episodeId, 'EPISODE_ID_REQUIRED');
  requireText(task, 'EPISODE_TASK_REQUIRED');
  requireArray(evidence, 'EPISODE_EVIDENCE_REQUIRED');

  const episode = {
    episode_version: 'reality-governed-training-episode-v0.1',
    episode_id: episodeId,
    task,
    evidence: clone(evidence),
    world_state: clone(worldState),
    expected_outcome_contract: clone(expectedOutcomeContract),
    verification_contract: clone(verificationContract),
    authority: clone(authority),
    learner_authority: 'NONE',
    created_at: new Date().toISOString(),
  };

  return Object.freeze({
    ...episode,
    episode_hash: digest(episode),
    state: 'EPISODE_CAPTURED',
  });
}

export function createLearningSignal({
  signalId,
  episodeId,
  sourceObservations = [],
  verifiedOutcome,
  corrections = [],
  failureSignals = [],
  capabilityDelta = {},
} = {}) {
  requireText(signalId, 'LEARNING_SIGNAL_ID_REQUIRED');
  requireText(episodeId, 'LEARNING_SIGNAL_EPISODE_REQUIRED');
  if (verifiedOutcome?.status !== 'VERIFIED') throw new Error('LEARNING_SIGNAL_REQUIRES_VERIFIED_OUTCOME');
  requireArray(sourceObservations, 'LEARNING_SIGNAL_OBSERVATIONS_REQUIRED');

  const signal = {
    signal_version: 'reality-governed-learning-signal-v0.1',
    signal_id: signalId,
    episode_id: episodeId,
    source_observations: clone(sourceObservations),
    verified_outcome: clone(verifiedOutcome),
    corrections: clone(corrections),
    failure_signals: clone(failureSignals),
    capability_delta: clone(capabilityDelta),
    truth_status: 'EVIDENCE_GROUNDED',
  };

  return Object.freeze({
    ...signal,
    signal_hash: digest(signal),
  });
}

export function runSandboxLearning({
  baseline,
  episode,
  learner,
  learningSignal,
  candidate,
  governanceKernelHash,
} = {}) {
  if (baseline?.state !== 'BASELINE_FROZEN') throw new Error('BASELINE_NOT_FROZEN');
  if (episode?.state !== 'EPISODE_CAPTURED') throw new Error('EPISODE_NOT_CAPTURED');
  if (!learner?.learner_id) throw new Error('LEARNER_REQUIRED');
  if (learningSignal?.episode_id !== episode.episode_id) throw new Error('LEARNING_SIGNAL_EPISODE_MISMATCH');
  if (learningSignal?.signal_hash == null) throw new Error('LEARNING_SIGNAL_REQUIRED');
  if (governanceKernelHash !== baseline.governance_kernel_hash) throw new Error('GOVERNANCE_KERNEL_HASH_MISMATCH');
  if (candidate?.modifies_governance === true || candidate?.modifies_authority === true) {
    throw new Error('LEARNER_GOVERNANCE_OR_AUTHORITY_MODIFICATION_FORBIDDEN');
  }

  const candidateArtifact = {
    candidate_id: candidate?.candidate_id || `candidate:${digest({ baseline: baseline.baseline_id, signal: learningSignal.signal_hash })}`,
    parent_baseline_id: baseline.baseline_id,
    parent_learner_version: learner.version,
    learning_signal_hash: learningSignal.signal_hash,
    strategy: candidate?.strategy || 'APPLY_VERIFIED_LEARNING_SIGNAL',
    production_graph_write_permitted: false,
    governance_kernel_hash: governanceKernelHash,
    authority_scope: 'NONE',
    sandbox_worldline: candidate?.sandbox_worldline || `sandbox:${digest(learningSignal.signal_hash)}`,
  };

  return Object.freeze({
    state: 'SANDBOX_RUNNING',
    candidate: candidateArtifact,
    sandbox_constraints: {
      production_graph_write_permitted: false,
      governance_kernel_mutable: false,
      authority_grant_permitted: false,
      hidden_evaluation_access: false,
    },
    candidate_hash: digest(candidateArtifact),
  });
}

function metricDelta(candidate, baseline, key) {
  return Number(candidate?.[key] ?? 0) - Number(baseline?.[key] ?? 0);
}

export function independentlyEvaluateCandidate({
  baseline,
  candidate,
  candidateResults,
  hiddenResults,
  independentVerifier,
  regressionResults,
  governanceKernelHash,
} = {}) {
  if (baseline?.state !== 'BASELINE_FROZEN') throw new Error('BASELINE_NOT_FROZEN');
  if (!candidate?.candidate_id) throw new Error('CANDIDATE_REQUIRED');
  if (!candidateResults || !hiddenResults) throw new Error('EVALUATION_RESULTS_REQUIRED');
  if (typeof independentVerifier !== 'function') throw new Error('INDEPENDENT_VERIFIER_REQUIRED');
  if (governanceKernelHash !== baseline.governance_kernel_hash) throw new Error('GOVERNANCE_KERNEL_CHANGED');

  const verification = independentVerifier({
    baseline: clone(baseline),
    candidate: clone(candidate),
    candidate_results: clone(candidateResults),
    hidden_results: clone(hiddenResults),
    regression_results: clone(regressionResults),
  });

  const generalizationDelta = metricDelta(hiddenResults, baseline.results.hidden, 'quality');
  const capabilityDelta = metricDelta(candidateResults, baseline.results.visible, 'quality');
  const regressionPassed = regressionResults?.passed === true;
  const independentPassed = verification?.passed === true;
  const generalizationPassed = generalizationDelta > 0;
  const governancePreserved = verification?.governance_preserved === true;

  const verdict = independentPassed && regressionPassed && generalizationPassed && governancePreserved
    ? 'VERIFIED'
    : 'REJECTED';

  return Object.freeze({
    state: 'EVALUATING',
    verdict,
    metrics: {
      capability_delta: capabilityDelta,
      hidden_generalization_delta: generalizationDelta,
      regression_passed: regressionPassed,
      independently_verified: independentPassed,
      governance_preserved: governancePreserved,
    },
    verification: clone(verification),
    evidence: {
      baseline_id: baseline.baseline_id,
      candidate_id: candidate.candidate_id,
      candidate_hash: candidate.candidate_hash,
      governance_kernel_hash: baseline.governance_kernel_hash,
    },
  });
}

export function promoteLearningCandidate({
  evaluation,
  promotionAuthority,
  promotionRef,
} = {}) {
  if (evaluation?.verdict !== 'VERIFIED') throw new Error('CANDIDATE_NOT_VERIFIED');
  if (promotionAuthority?.approved !== true) throw new Error('PROMOTION_AUTHORIZATION_REQUIRED');
  requireText(promotionRef, 'PROMOTION_REF_REQUIRED');

  return Object.freeze({
    state: 'PROMOTED',
    promotion_ref: promotionRef,
    approved_by: promotionAuthority.authorized_by || 'explicit_promotion_authority',
    candidate_id: evaluation.evidence.candidate_id,
    baseline_id: evaluation.evidence.baseline_id,
    learning_commit: {
      verified_outcome: true,
      hidden_generalization_verified: evaluation.metrics.hidden_generalization_delta > 0,
      regression_verified: evaluation.metrics.regression_passed,
      governance_preserved: evaluation.metrics.governance_preserved,
    },
    promotion_hash: digest({
      candidate_id: evaluation.evidence.candidate_id,
      promotionRef,
      governance_kernel_hash: evaluation.evidence.governance_kernel_hash,
    }),
  });
}
