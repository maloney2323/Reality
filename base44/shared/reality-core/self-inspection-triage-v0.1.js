import { canonicalJson, sha256Hex } from '../action-gate/canonical.js';

export const SELF_INSPECTION_TRIAGE_VERSION = 'reality-self-inspection-triage-v0.1';
export const TRIAGE_AUTHORITY = 'ANALYSIS_AND_VERIFICATION_PLANNING_ONLY';

const FORBIDDEN = Object.freeze({
  execution_authority: false,
  mutation_authority: false,
  merge_authority: false,
  deploy_authority: false,
});

function list(value) {
  return [...new Set((Array.isArray(value) ? value : []).filter(v => typeof v === 'string' && v.trim()).map(v => v.trim()))];
}

export async function digestTriageInput(workUnit) {
  return sha256Hex(canonicalJson({
    schema: SELF_INSPECTION_TRIAGE_VERSION,
    work_unit_id: workUnit?.work_unit_id || null,
    delta_digest: workUnit?.delta_digest || null,
    current_tree_hash: workUnit?.current_tree_hash || null,
    verification_requirements: list(workUnit?.verification_requirements),
  }));
}

export async function buildSelfInspectionTriage(workUnit = {}) {
  const known = list(workUnit.known);
  const unknown = list(workUnit.unknown);
  const contradictions = list(workUnit.contradictions);
  const requirements = list(workUnit.verification_requirements);
  const delta = workUnit.delta || {};
  const changed = list(delta.changed);
  const added = list(delta.added);
  const removed = list(delta.removed);

  const structuralIntegrity = [];
  if (!workUnit.delta_digest) structuralIntegrity.push('MISSING_DELTA_DIGEST');
  if (!workUnit.current_tree_hash) structuralIntegrity.push('MISSING_CURRENT_TREE_HASH');
  if (!workUnit.inspection_record_ref) structuralIntegrity.push('MISSING_INSPECTION_RECORD');
  if (workUnit.execution_authority !== false || workUnit.mutation_authority !== false || workUnit.merge_authority !== false || workUnit.deploy_authority !== false) {
    structuralIntegrity.push('ACTION_AUTHORITY_PRESENT');
  }

  const coverageGaps = [];
  if ((added.length || changed.length || removed.length) && requirements.length === 0) coverageGaps.push('STRUCTURAL_DELTA_HAS_NO_VERIFICATION_REQUIREMENT');
  if (changed.some(path => path.includes('functions/') || path.includes('reality-core/')) &&
      !requirements.some(r => r.includes('FUNCTIONAL') || r.includes('REGRESSION'))) {
    coverageGaps.push('CODE_CHANGE_WITHOUT_FUNCTIONAL_REGRESSION_REQUIREMENT');
  }
  if (added.some(path => /capability|authorization|action-gate/i.test(path)) &&
      !requirements.some(r => r.includes('AUTHORIZATION'))) {
    coverageGaps.push('CAPABILITY_BOUNDARY_CHANGE_WITHOUT_AUTHORIZATION_REVIEW');
  }

  const adversarialQuestions = [
    'Does the recorded tree delta exactly correspond to the cited inspection record?',
    'Are potentially affected files being treated as potentially affected rather than proven affected?',
    'Are relevant tests evidence of execution, or merely candidate verification requirements?',
    'Did any prior contradiction or epistemic debt disappear without an explicit resolution?',
    'Has any proposal, requirement, or review output acquired execution or mutation authority?',
  ];

  const status = structuralIntegrity.length
    ? 'HALT_INTEGRITY_REVIEW'
    : (unknown.length || contradictions.length || coverageGaps.length ? 'REVIEW_REQUIRED' : 'VERIFICATION_READY');

  return Object.freeze({
    schema_version: SELF_INSPECTION_TRIAGE_VERSION,
    authority: TRIAGE_AUTHORITY,
    work_unit_id: workUnit.work_unit_id || null,
    input_digest: await digestTriageInput(workUnit),
    observer: { observed_delta: { added, changed, removed }, known, unknown, contradictions, verification_requirements: requirements },
    verifier: { structural_integrity_findings: structuralIntegrity, coverage_gaps: coverageGaps, requirement_count: requirements.length },
    adversary: { questions: adversarialQuestions, model_output_status: 'MODEL_GENERATED_ANALYSIS_NOT_EVIDENCE' },
    status,
    ...FORBIDDEN,
  });
}

export async function verifySelfInspectionTriage(triage = {}) {
  if (triage.schema_version !== SELF_INSPECTION_TRIAGE_VERSION) return { valid:false, code:'SCHEMA_MISMATCH' };
  if (triage.authority !== TRIAGE_AUTHORITY) return { valid:false, code:'AUTHORITY_MISMATCH' };
  for (const key of Object.keys(FORBIDDEN)) if (triage[key] !== false) return { valid:false, code:'ACTION_AUTHORITY_PRESENT' };
  if (!triage.work_unit_id || !triage.input_digest) return { valid:false, code:'IDENTITY_MISSING' };
  return { valid:true, code:'VALID' };
}