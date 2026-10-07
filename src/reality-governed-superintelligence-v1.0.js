/**
 * Reality Governed Superintelligence Specification v1.0
 *
 * This module defines a falsifiable target. It does NOT claim Reality is
 * superintelligent. A claim of achievement requires every hard gate below
 * to be demonstrated by independently reproducible evidence.
 */
export const GSI_SPEC_VERSION = 'reality-governed-superintelligence-v1.0';

export const GSI_GATES = Object.freeze([
  'CAPABILITY',
  'WORLD_GROUNDING',
  'EPISTEMIC_DISCIPLINE',
  'LONG_HORIZON_AUTONOMY',
  'AUTHORITY_SEPARATION',
  'INDEPENDENT_VERIFICATION',
  'GOVERNED_SELF_IMPROVEMENT',
  'CONSTITUTIONAL_INVARIANCE',
  'ADVERSARIAL_ROBUSTNESS',
  'REPRODUCIBLE_SUPERHUMANITY',
]);

export const GSI_HARD_INVARIANTS = Object.freeze({
  inference_is_not_observation: true,
  capability_is_not_authority: true,
  intent_is_not_authorization: true,
  execution_is_not_verification: true,
  model_output_is_not_truth: true,
  model_output_is_not_authority: true,
  self_improvement_is_not_self_authorization: true,
  governance_kernel_is_not_mutable_by_learner: true,
});

export const GSI_STATUS = Object.freeze([
  'NOT_ASSESSED',
  'FAILED',
  'PARTIALLY_VERIFIED',
  'VERIFIED',
]);

export const GSI_LEVELS = Object.freeze([
  'L0_TARGET_DEFINED',
  'L1_GOVERNED_INTELLIGENCE',
  'L2_GOVERNED_AUTONOMY',
  'L3_GOVERNED_CAPABILITY_GROWTH',
  'L4_SUPERHUMAN_GOVERNED_INTELLIGENCE',
  'L5_GOVERNED_SUPERINTELLIGENCE',
]);

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function requireStatus(value) {
  if (!GSI_STATUS.includes(value)) throw new Error('GSI_STATUS_INVALID');
}

export function createGsiAssessment({
  assessmentId,
  learnerId,
  evidence = [],
  gates = {},
  benchmarkVersion,
  governanceKernelHash,
  evaluatedAt = new Date().toISOString(),
} = {}) {
  if (!assessmentId) throw new Error('GSI_ASSESSMENT_ID_REQUIRED');
  if (!learnerId) throw new Error('GSI_LEARNER_ID_REQUIRED');
  if (!benchmarkVersion) throw new Error('GSI_BENCHMARK_VERSION_REQUIRED');
  if (!governanceKernelHash) throw new Error('GSI_GOVERNANCE_KERNEL_HASH_REQUIRED');

  const normalized = {};
  for (const gate of GSI_GATES) {
    const value = gates[gate] || { status: 'NOT_ASSESSED', evidence_refs: [], metrics: {} };
    requireStatus(value.status);
    normalized[gate] = {
      status: value.status,
      evidence_refs: [...(value.evidence_refs || [])],
      metrics: clone(value.metrics || {}),
      failure_reasons: [...(value.failure_reasons || [])],
    };
  }

  return Object.freeze({
    spec_version: GSI_SPEC_VERSION,
    assessment_id: assessmentId,
    learner_id: learnerId,
    benchmark_version: benchmarkVersion,
    governance_kernel_hash: governanceKernelHash,
    hard_invariants: clone(GSI_HARD_INVARIANTS),
    gates: normalized,
    evidence_refs: [...evidence],
    evaluated_at: evaluatedAt,
    claimable_level: determineGsiLevel(normalized),
  });
}

export function determineGsiLevel(gates) {
  const hard = ['AUTHORITY_SEPARATION', 'INDEPENDENT_VERIFICATION', 'CONSTITUTIONAL_INVARIANCE'];
  if (hard.some((gate) => gates[gate]?.status !== 'VERIFIED')) {
    if (gates.CAPABILITY?.status === 'VERIFIED') return 'L1_GOVERNED_INTELLIGENCE';
    return 'L0_TARGET_DEFINED';
  }

  if (gates.CAPABILITY?.status !== 'VERIFIED' ||
      gates.WORLD_GROUNDING?.status !== 'VERIFIED' ||
      gates.EPISTEMIC_DISCIPLINE?.status !== 'VERIFIED') {
    return 'L1_GOVERNED_INTELLIGENCE';
  }

  if (gates.LONG_HORIZON_AUTONOMY?.status !== 'VERIFIED') return 'L2_GOVERNED_AUTONOMY';
  if (gates.GOVERNED_SELF_IMPROVEMENT?.status !== 'VERIFIED') return 'L3_GOVERNED_CAPABILITY_GROWTH';
  if (gates.REPRODUCIBLE_SUPERHUMANITY?.status !== 'VERIFIED') return 'L4_SUPERHUMAN_GOVERNED_INTELLIGENCE';

  if (gates.ADVERSARIAL_ROBUSTNESS?.status !== 'VERIFIED') return 'L4_SUPERHUMAN_GOVERNED_INTELLIGENCE';

  return 'L5_GOVERNED_SUPERINTELLIGENCE';
}

export function assertGsiClaim(assessment, requestedLevel) {
  if (!assessment?.claimable_level) throw new Error('GSI_ASSESSMENT_REQUIRED');
  const order = new Map(GSI_LEVELS.map((level, index) => [level, index]));
  if (!order.has(requestedLevel)) throw new Error('GSI_LEVEL_INVALID');
  if (order.get(assessment.claimable_level) < order.get(requestedLevel)) {
    throw new Error('GSI_CLAIM_NOT_SUPPORTED_BY_EVIDENCE');
  }
  return true;
}
