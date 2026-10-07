import crypto from 'node:crypto';
import {
  createLearnerAdapter,
  createBenchmarkContract,
  freezeBaseline,
  createTrainingEpisode,
  createLearningSignal,
  runSandboxLearning,
  independentlyEvaluateCandidate,
  createTrainingManifest,
  promoteLearningCandidate,
} from './reality-gsi-training-ground-v0.1.js';
import { createIntelligenceSubstrate } from './reality-intelligence-substrate-v1.0.js';

export const REALITY_LEARNING_PROOF_VERSION = 'reality-learning-proof-v1.0';

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

/**
 * Deterministic integration proof:
 * verified experience -> learning signal -> sandbox learner -> independent evaluation
 * -> governed promotion -> Intelligence Substrate.
 *
 * This is a proof harness, not a claim of production learning or superintelligence.
 */
export function runRealityLearningProof() {
  const learner = createLearnerAdapter({
    learnerId: 'learner:reality-proof',
    provider: 'replaceable',
    version: 'baseline-0',
    observe: () => ({}),
    reason: () => ({}),
    propose: () => ({}),
    explain: () => ({}),
  });

  const contract = createBenchmarkContract({
    benchmarkVersion: 'gsi-training-benchmark-v1',
    visibleCaseIds: ['visible:1', 'visible:2'],
    hiddenCaseIds: ['hidden:1'],
    metrics: ['quality'],
    rules: ['heldout-generalization', 'regression'],
    seed: 'reality-learning-proof-seed-v1',
  });

  const baseline = freezeBaseline({
    learner,
    benchmarkVersion: contract.benchmark_version,
    cases: [{ id: 'visible:1' }, { id: 'visible:2' }],
    hiddenCaseIds: ['hidden:1'],
    governanceKernelHash: 'kernel:proof-v1',
    baselineResults: { visible: { quality: 0.50 }, hidden: { quality: 0.50 } },
    evaluationContract: { metrics: ['quality'], rules: ['heldout-generalization', 'regression'] },
    seed: contract.seed,
  });

  const episode = createTrainingEpisode({
    episodeId: 'episode:reality-proof:1',
    task: 'complete a governed sandbox operation',
    evidence: [{ id: 'observation:verified-outcome:1', kind: 'VERIFIED_OUTCOME' }],
    worldState: { source: 'sandbox', state: 'reconciled' },
    expectedOutcomeContract: { status: 'VERIFIED' },
    verificationContract: { independent: true },
  });

  const verifiedOutcome = Object.freeze({
    status: 'VERIFIED',
    outcome_id: 'outcome:reality-proof:1',
    verification_id: 'verification:reality-proof:1',
    evidence_refs: ['observation:verified-outcome:1'],
  });

  const learningSignal = createLearningSignal({
    signalId: 'signal:reality-proof:1',
    episodeId: episode.episode_id,
    sourceObservations: [{ id: 'observation:verified-outcome:1' }],
    verifiedOutcome,
    corrections: [{ type: 'strategy_correction', from: 'baseline', to: 'verified_strategy' }],
    failureSignals: [],
    capabilityDelta: { quality: 0.10 },
    independentVerifierRef: 'verifier:reality-proof:1',
  });

  const sandbox = runSandboxLearning({
    baseline,
    episode,
    learner,
    learningSignal,
    candidate: {
      candidate_id: 'candidate:reality-proof:1',
      strategy: 'APPLY_VERIFIED_LEARNING_SIGNAL',
    },
    governanceKernelHash: baseline.governance_kernel_hash,
  });

  const evaluation = independentlyEvaluateCandidate({
    baseline,
    candidate: sandbox.candidate,
    candidateResults: { quality: 0.60 },
    hiddenResults: { quality: 0.61 },
    regressionResults: { passed: true },
    governanceKernelHash: baseline.governance_kernel_hash,
    benchmarkContractHash: baseline.benchmark_contract_hash,
    heldoutCaseIds: ['hidden:1'],
    trainingCaseIds: ['visible:1', 'visible:2'],
    independentVerifier: () => ({ passed: true, governance_preserved: true }),
  });

  const promotion = promoteLearningCandidate({
    evaluation,
    promotionAuthority: { approved: true, authorized_by: 'proof:explicit-authority' },
    promotionRef: 'promotion:reality-proof:1',
  });

  const manifest = createTrainingManifest({
    baseline,
    benchmarkContract: contract,
    episodes: [episode],
    learningSignals: [learningSignal],
    candidateRefs: [sandbox.candidate.candidate_id],
    hiddenEvaluationRef: 'hidden-evaluation:sealed:1',
    governanceKernelHash: baseline.governance_kernel_hash,
  });

  const substrate = createIntelligenceSubstrate({
    universeEntries: [{
      id: 'observation:verified-outcome:1',
      content: 'A sandbox operation produced an independently verified outcome.',
      type: 'OBSERVATION',
    }],
    verifiedLearningSignals: [learningSignal],
    workItems: [{ id: 'work:reality-proof:1', status: 'RECONCILED' }],
    capabilityState: { quality: { status: 'MEASURED', delta: 0.10 } },
    governanceState: { kernel_hash: baseline.governance_kernel_hash },
    hiddenEvaluation: { ref: 'hidden-evaluation:sealed:1' },
    query: { terms: ['verified', 'sandbox', 'outcome'] },
  });

  const proof = {
    proof_version: REALITY_LEARNING_PROOF_VERSION,
    baseline_id: baseline.baseline_id,
    episode_id: episode.episode_id,
    verified_outcome_id: verifiedOutcome.outcome_id,
    learning_signal_id: learningSignal.signal_id,
    learning_signal_hash: learningSignal.signal_hash,
    candidate_id: sandbox.candidate.candidate_id,
    evaluation_verdict: evaluation.verdict,
    promotion_state: promotion.state,
    manifest_hash: manifest.manifest_hash,
    substrate_context_id: substrate.context_id,
    substrate_signal_ids: substrate.verified_learning_signals.map((s) => s.signal_id),
    hidden_evaluation_status: substrate.hidden_evaluation.status,
    authority_granted_by_learner: false,
    production_graph_write_permitted: sandbox.candidate.production_graph_write_permitted,
    proof_hash: digest({
      baseline_id: baseline.baseline_id,
      episode_id: episode.episode_id,
      learning_signal_hash: learningSignal.signal_hash,
      candidate_id: sandbox.candidate.candidate_id,
      evaluation_verdict: evaluation.verdict,
      promotion_state: promotion.state,
      manifest_hash: manifest.manifest_hash,
      substrate_context_id: substrate.context_id,
    }),
  };

  if (evaluation.verdict !== 'VERIFIED') throw new Error('LEARNING_PROOF_EVALUATION_FAILED');
  if (promotion.state !== 'PROMOTED') throw new Error('LEARNING_PROOF_PROMOTION_FAILED');
  if (substrate.verified_learning_signals.length !== 1) throw new Error('LEARNING_PROOF_SUBSTRATE_MISSING_SIGNAL');
  if (substrate.hidden_evaluation.status !== 'SEALED') throw new Error('LEARNING_PROOF_HIDDEN_EVAL_EXPOSED');
  if (sandbox.candidate.production_graph_write_permitted !== false) throw new Error('LEARNING_PROOF_PRODUCTION_WRITE_ENABLED');

  return Object.freeze({
    status: 'VERIFIED_INTEGRATION_PROOF',
    proof,
    artifacts: Object.freeze({ baseline, episode, verifiedOutcome, learningSignal, sandbox, evaluation, promotion, manifest, substrate }),
  });
}
