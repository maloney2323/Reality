// Reality Self-Evolution Integrity Gate v0.1
//
// Deterministic boundary between self-observation and the existing strategic /
// engineering-review / WIP pipeline. This is not a new reviewer council.
// Model output, Self Model statements, and proposals remain non-evidence.
//
// Authority: SELF_EVOLUTION_INTEGRITY_GATE_ONLY
// No implementation, code-write, merge, deploy, governance-change, Self Model
// promotion, or external-action authority can emerge from this gate.

import { canonicalJson, sha256Hex } from '../action-gate/canonical.js';

export const SELF_EVOLUTION_INTEGRITY_GATE_VERSION = 'reality-self-evolution-integrity-gate-v0.1';
export const SELF_EVOLUTION_INTEGRITY_GATE_AUTHORITY = 'SELF_EVOLUTION_INTEGRITY_GATE_ONLY';

export const IntegrityDecision = Object.freeze({
  NO_CHANGE: 'NO_CHANGE',
  INVESTIGATE_MORE: 'INVESTIGATE_MORE',
  PLAN_CHANGE: 'PLAN_CHANGE',
  HUMAN_REVIEW_REQUIRED: 'HUMAN_REVIEW_REQUIRED',
  HALTED_INTEGRITY_FAILURE: 'HALTED_INTEGRITY_FAILURE',
});

export const GovernanceImpact = Object.freeze({
  NONE: 'NONE',
  CAPABILITY: 'CAPABILITY',
  AUTHORIZATION: 'AUTHORIZATION',
  EVIDENCE: 'EVIDENCE',
  EXECUTION: 'EXECUTION',
  DEPLOYMENT: 'DEPLOYMENT',
  SELF_MODEL: 'SELF_MODEL',
  CONSTITUTIONAL: 'CONSTITUTIONAL',
});

const DECISIONS = new Set(Object.values(IntegrityDecision));
const IMPACTS = new Set(Object.values(GovernanceImpact));
const FORBIDDEN_TRUE_FLAGS = [
  'implementation_authorized',
  'code_write_authorized',
  'merge_authorized',
  'deploy_authorized',
  'governance_change_authorized',
  'self_model_promotion_authorized',
  'external_action_authorized',
];

function list(value) {
  return [...new Set((Array.isArray(value) ? value : [])
    .filter((v) => typeof v === 'string' && v.trim())
    .map((v) => v.trim()))].sort();
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function bool(value) {
  return value === true;
}

function assertNoAuthorityEscalation(input) {
  for (const field of FORBIDDEN_TRUE_FLAGS) {
    if (input?.[field] === true) throw new Error(`FORGED_AUTHORITY_FLAG:${field}`);
  }
}

function setFrom(value) {
  return new Set(list(value));
}

export async function buildSelfEvolutionIntegrityDecision(input = {}) {
  assertNoAuthorityEscalation(input);

  const currentTreeHash = nonEmpty(input.current_code_tree_hash) ? input.current_code_tree_hash.trim() : null;
  const observedTreeHash = nonEmpty(input.observed_code_tree_hash) ? input.observed_code_tree_hash.trim() : null;
  const currentSelfModelVersion = nonEmpty(input.current_self_model_version) ? input.current_self_model_version.trim() : null;
  const observedSelfModelVersion = nonEmpty(input.observed_self_model_version) ? input.observed_self_model_version.trim() : null;

  const selfObservationRefs = list(input.self_observation_refs);
  const independentEvidenceRefs = list(input.independent_evidence_refs);
  const selfModelEvidenceRefs = list(input.self_model_evidence_refs);
  const modelAnalysisRefs = list(input.model_analysis_refs);
  const dissentRefs = list(input.dissent_refs);
  const blockingRefs = list(input.blocking_dissent_refs);
  const regressionRefs = list(input.regression_evidence_refs);
  const unresolvedRefs = list(input.unresolved_refs);
  const corroborationRefs = list(input.corroboration_refs);
  const governanceImpacts = list(input.governance_impacts);
  const sourceRefs = list(input.source_refs);

  if (governanceImpacts.some((value) => !IMPACTS.has(value))) {
    return Object.freeze({ version: SELF_EVOLUTION_INTEGRITY_GATE_VERSION, authority: SELF_EVOLUTION_INTEGRITY_GATE_AUTHORITY, decision: IntegrityDecision.HALTED_INTEGRITY_FAILURE, reason_code: 'UNKNOWN_GOVERNANCE_IMPACT', evidence_status: 'INVALID' });
  }

  const treeCurrent = Boolean(currentTreeHash && observedTreeHash && currentTreeHash === observedTreeHash);
  const selfModelCurrent = Boolean(currentSelfModelVersion && observedSelfModelVersion && currentSelfModelVersion === observedSelfModelVersion);
  const modelEvidenceOverlap = modelAnalysisRefs.some((ref) => independentEvidenceRefs.includes(ref));
  const selfModelEvidenceOverlap = selfModelEvidenceRefs.some((ref) => independentEvidenceRefs.includes(ref));
  const corroborated = independentEvidenceRefs.length > 0
    && corroborationRefs.length > 0
    && corroborationRefs.every((ref) => independentEvidenceRefs.includes(ref))
    && !modelEvidenceOverlap
    && !selfModelEvidenceOverlap;
  const selfObservationOnly = independentEvidenceRefs.length === 0
    && (selfObservationRefs.length > 0 || selfModelEvidenceRefs.length > 0 || modelAnalysisRefs.length > 0);
  const regressionSatisfied = regressionRefs.length > 0;
  const hasMaterialDissent = dissentRefs.length > 0;
  const hasBlockingDissent = blockingRefs.length > 0;
  const constitutional = governanceImpacts.includes(GovernanceImpact.CONSTITUTIONAL);
  const governanceSensitive = governanceImpacts.some((impact) =>
    [GovernanceImpact.AUTHORIZATION, GovernanceImpact.EVIDENCE, GovernanceImpact.EXECUTION, GovernanceImpact.DEPLOYMENT, GovernanceImpact.SELF_MODEL, GovernanceImpact.CONSTITUTIONAL].includes(impact)
  );

  let decision = IntegrityDecision.INVESTIGATE_MORE;
  let reasonCode = 'INSUFFICIENT_INDEPENDENT_CORROBORATION';

  if (modelEvidenceOverlap) {
    decision = IntegrityDecision.INVESTIGATE_MORE;
    reasonCode = 'MODEL_ANALYSIS_CANNOT_SERVE_AS_INDEPENDENT_EVIDENCE';
  } else if (selfModelEvidenceOverlap) {
    decision = IntegrityDecision.INVESTIGATE_MORE;
    reasonCode = 'SELF_MODEL_CANNOT_SERVE_AS_INDEPENDENT_EVIDENCE';
  } else if (!currentTreeHash || !observedTreeHash || !treeCurrent) {
    decision = IntegrityDecision.HALTED_INTEGRITY_FAILURE;
    reasonCode = 'CODE_TREE_OBSERVATION_STALE_OR_UNBOUND';
  } else if (governanceSensitive && !selfModelCurrent) {
    decision = IntegrityDecision.HALTED_INTEGRITY_FAILURE;
    reasonCode = 'SELF_MODEL_SNAPSHOT_STALE_OR_UNBOUND';
  } else if (selfObservationOnly) {
    decision = IntegrityDecision.INVESTIGATE_MORE;
    reasonCode = 'SELF_OBSERVATION_IS_NOT_INDEPENDENT_CORROBORATION';
  } else if (!corroborated) {
    decision = IntegrityDecision.INVESTIGATE_MORE;
    reasonCode = 'INDEPENDENT_CORROBORATION_INCOMPLETE';
  } else if (constitutional) {
    decision = IntegrityDecision.HUMAN_REVIEW_REQUIRED;
    reasonCode = 'CONSTITUTIONAL_SCOPE_REQUIRES_HUMAN_REVIEW';
  } else if (hasBlockingDissent) {
    decision = IntegrityDecision.INVESTIGATE_MORE;
    reasonCode = 'UNRESOLVED_BLOCKING_DISSENT';
  } else if (governanceImpacts.includes(GovernanceImpact.AUTHORIZATION) || governanceImpacts.includes(GovernanceImpact.EVIDENCE) || governanceImpacts.includes(GovernanceImpact.EXECUTION) || governanceImpacts.includes(GovernanceImpact.DEPLOYMENT)) {
    decision = IntegrityDecision.HUMAN_REVIEW_REQUIRED;
    reasonCode = 'CONSEQUENTIAL_GOVERNANCE_IMPACT_REQUIRES_HUMAN_REVIEW';
  } else if (!regressionSatisfied) {
    decision = IntegrityDecision.INVESTIGATE_MORE;
    reasonCode = 'INDEPENDENT_REGRESSION_EVIDENCE_REQUIRED';
  } else if (!hasMaterialDissent) {
    decision = input.requested_decision === IntegrityDecision.NO_CHANGE
      ? IntegrityDecision.NO_CHANGE
      : IntegrityDecision.PLAN_CHANGE;
    reasonCode = input.requested_decision === IntegrityDecision.NO_CHANGE
      ? 'INDEPENDENTLY_CORROBORATED_NO_CHANGE'
      : 'INDEPENDENTLY_CORROBORATED_BOUNDED_PLAN_CHANGE';
  } else {
    decision = input.requested_decision === IntegrityDecision.NO_CHANGE
      ? IntegrityDecision.NO_CHANGE
      : IntegrityDecision.INVESTIGATE_MORE;
    reasonCode = 'MATERIAL_DISSENT_PRESERVED';
  }

  const payload = {
    version: SELF_EVOLUTION_INTEGRITY_GATE_VERSION,
    authority: SELF_EVOLUTION_INTEGRITY_GATE_AUTHORITY,
    decision,
    reason_code: reasonCode,
    current_code_tree_hash: currentTreeHash,
    observed_code_tree_hash: observedTreeHash,
    current_self_model_version: currentSelfModelVersion,
    observed_self_model_version: observedSelfModelVersion,
    self_observation_refs: selfObservationRefs,
    independent_evidence_refs: independentEvidenceRefs,
    self_model_evidence_refs: selfModelEvidenceRefs,
    model_analysis_refs: modelAnalysisRefs,
    corroboration_refs: corroborationRefs,
    regression_evidence_refs: regressionRefs,
    source_refs: sourceRefs,
    dissent_refs: dissentRefs,
    blocking_dissent_refs: blockingRefs,
    unresolved_refs: unresolvedRefs,
    governance_impacts: governanceImpacts,
    checks: {
      self_observation_present: selfObservationRefs.length > 0,
      independent_corroboration_present: corroborated,
      self_model_not_used_as_independent_evidence: !selfModelEvidenceOverlap,
      model_analysis_not_used_as_evidence: !modelEvidenceOverlap,
      tree_binding_current: treeCurrent,
      self_model_binding_current: selfModelCurrent,
      regression_evidence_present: regressionSatisfied,
      material_dissent_preserved: hasMaterialDissent,
      blocking_dissent_present: hasBlockingDissent,
      constitutional_scope_detected: constitutional,
    },
    implementation_authorized: false,
    code_write_authorized: false,
    merge_authorized: false,
    deploy_authorized: false,
    governance_change_authorized: false,
    self_model_promotion_authorized: false,
    external_action_authorized: false,
  };

  return Object.freeze({
    ...payload,
    decision_digest: await sha256Hex(canonicalJson(payload)),
  });
}

export function verifySelfEvolutionIntegrityDecision(decision = {}) {
  try {
    if (decision.version !== SELF_EVOLUTION_INTEGRITY_GATE_VERSION) return { valid: false, code: 'CONTRACT_MISMATCH' };
    if (decision.authority !== SELF_EVOLUTION_INTEGRITY_GATE_AUTHORITY) return { valid: false, code: 'AUTHORITY_MISMATCH' };
    if (!DECISIONS.has(decision.decision)) return { valid: false, code: 'DECISION_INVALID' };
    if (!Array.isArray(decision.independent_evidence_refs)) return { valid: false, code: 'INDEPENDENT_EVIDENCE_MISSING' };
    if (!Array.isArray(decision.corroboration_refs)) return { valid: false, code: 'CORROBORATION_MISSING' };
    if (decision.corroboration_refs.some((ref) => !decision.independent_evidence_refs.includes(ref))) return { valid: false, code: 'CORROBORATION_NOT_IN_EVIDENCE' };
    if (!Array.isArray(decision.dissent_refs) || !Array.isArray(decision.blocking_dissent_refs)) return { valid: false, code: 'DISSENT_NOT_PRESERVED' };
    if (!DECISIONS.has(decision.decision)) return { valid: false, code: 'DECISION_INVALID' };
    for (const field of FORBIDDEN_TRUE_FLAGS) if (decision[field] === true) return { valid: false, code: `AUTHORITY_ESCALATION:${field}` };

    if (decision.decision === IntegrityDecision.PLAN_CHANGE) {
      if (!decision.checks?.independent_corroboration_present) return { valid: false, code: 'PLAN_CHANGE_WITHOUT_CORROBORATION' };
      if (!decision.checks?.regression_evidence_present) return { valid: false, code: 'PLAN_CHANGE_WITHOUT_REGRESSION_EVIDENCE' };
      if (decision.checks?.material_dissent_preserved !== false && decision.blocking_dissent_refs?.length > 0) return { valid: false, code: 'PLAN_CHANGE_BLOCKED_BY_DISSENT' };
      if (decision.checks?.constitutional_scope_detected) return { valid: false, code: 'PLAN_CHANGE_CONSTITUTIONAL_SCOPE' };
    }
    return { valid: true, code: 'VALID' };
  } catch {
    return { valid: false, code: 'VALIDATION_ERROR' };
  }
}