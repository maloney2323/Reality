import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TRAINING_GROUND_INVARIANTS,
  createLearnerAdapter,
  freezeBaseline,
  createTrainingEpisode,
  createLearningSignal,
  runSandboxLearning,
  independentlyEvaluateCandidate,
  promoteLearningCandidate,
} from '../src/reality-gsi-training-ground-v0.1.js';

const learner = createLearnerAdapter({
  learnerId: 'learner:test',
  provider: 'fresh-model',
  version: 'baseline-0',
  observe: () => ({ observed: true }),
  reason: () => ({ reasoning: 'candidate' }),
  propose: () => ({ proposal: 'candidate' }),
  explain: () => ({ explanation: 'candidate' }),
});

const baseline = freezeBaseline({
  learner,
  benchmarkVersion: 'gsi-training-benchmark-v0.1',
  cases: [{ id: 'visible-1' }, { id: 'visible-2' }],
  hiddenCaseIds: ['hidden-1'],
  governanceKernelHash: 'kernel:v1',
  baselineResults: { visible: { quality: 0.50 }, hidden: { quality: 0.50 } },
  seed: 'gsi-training-seed-v1',
});

test('training ground exposes non-negotiable invariants', () => {
  assert.equal(TRAINING_GROUND_INVARIANTS.governance_kernel_immutable, true);
  assert.equal(TRAINING_GROUND_INVARIANTS.authority_not_derived_from_capability, true);
  assert.equal(TRAINING_GROUND_INVARIANTS.sandbox_cannot_write_production_graph, true);
  assert.equal(TRAINING_GROUND_INVARIANTS.hidden_evaluation_is_not_exposed_to_learner, true);
});

test('baseline is frozen before learning', () => {
  assert.equal(baseline.state, 'BASELINE_FROZEN');
  assert.equal(baseline.hidden_case_ids[0], 'hidden-1');
});

test('verified experience creates an evidence-grounded learning signal', () => {
  const episode = createTrainingEpisode({
    episodeId: 'episode:1',
    task: 'solve a governed operational problem',
    evidence: [{ id: 'obs:1', kind: 'observation' }],
  });
  const signal = createLearningSignal({
    signalId: 'signal:1',
    episodeId: episode.episode_id,
    sourceObservations: [{ id: 'obs:1' }],
    verifiedOutcome: { status: 'VERIFIED', id: 'outcome:1' },
    corrections: [{ kind: 'verified_correction' }],
    independentVerifierRef: 'verifier:test-v1',
  });
  assert.equal(signal.truth_status, 'EVIDENCE_GROUNDED');
});

test('sandbox cannot modify governance or authority', () => {
  const episode = createTrainingEpisode({
    episodeId: 'episode:2',
    task: 'sandbox task',
    evidence: [{ id: 'obs:2' }],
  });
  const signal = createLearningSignal({
    signalId: 'signal:2',
    episodeId: episode.episode_id,
    sourceObservations: [{ id: 'obs:2' }],
    verifiedOutcome: { status: 'VERIFIED', id: 'outcome:2' },
    independentVerifierRef: 'verifier:test-v1',
  });
  assert.throws(() => runSandboxLearning({
    baseline,
    episode,
    learner,
    learningSignal: signal,
    candidate: { candidate_id: 'candidate:bad', modifies_governance: true },
    governanceKernelHash: 'kernel:v1',
  }), /GOVERNANCE_OR_AUTHORITY_MODIFICATION_FORBIDDEN/);
});

test('candidate must beat baseline on hidden evaluation and independent verification', () => {
  const episode = createTrainingEpisode({
    episodeId: 'episode:3',
    task: 'generalization task',
    evidence: [{ id: 'obs:3' }],
  });
  const signal = createLearningSignal({
    signalId: 'signal:3',
    episodeId: episode.episode_id,
    sourceObservations: [{ id: 'obs:3' }],
    verifiedOutcome: { status: 'VERIFIED', id: 'outcome:3' },
    independentVerifierRef: 'verifier:test-v1',
  });
  const sandbox = runSandboxLearning({
    baseline,
    episode,
    learner,
    learningSignal: signal,
    candidate: { candidate_id: 'candidate:good' },
    governanceKernelHash: 'kernel:v1',
  });

  const evaluation = independentlyEvaluateCandidate({
    baseline,
    candidate: sandbox.candidate,
    candidateResults: { quality: 0.60 },
    hiddenResults: { quality: 0.61 },
    regressionResults: { passed: true },
    governanceKernelHash: 'kernel:v1',
    benchmarkContractHash: baseline.benchmark_contract_hash,
    heldoutCaseIds: ['hidden-1'],
    independentVerifier: () => ({ passed: true, governance_preserved: true }),
  });

  assert.equal(evaluation.verdict, 'VERIFIED');
  const promotion = promoteLearningCandidate({
    evaluation,
    promotionAuthority: { approved: true, authorized_by: 'human:test' },
    promotionRef: 'promotion:test',
  });
  assert.equal(promotion.state, 'PROMOTED');
});

test('candidate that does not generalize cannot promote', () => {
  const evaluation = independentlyEvaluateCandidate({
    baseline,
    candidate: { candidate_id: 'candidate:overfit', candidate_hash: 'hash' },
    candidateResults: { quality: 0.90 },
    hiddenResults: { quality: 0.49 },
    regressionResults: { passed: true },
    governanceKernelHash: 'kernel:v1',
    benchmarkContractHash: baseline.benchmark_contract_hash,
    heldoutCaseIds: ['hidden-1'],
    independentVerifier: () => ({ passed: true, governance_preserved: true }),
  });
  assert.equal(evaluation.verdict, 'REJECTED');
  assert.throws(() => promoteLearningCandidate({
    evaluation,
    promotionAuthority: { approved: true },
    promotionRef: 'promotion:bad',
  }), /CANDIDATE_NOT_VERIFIED/);
});
