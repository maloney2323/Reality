import { canonicalJson, sha256Hex } from '../action-gate/canonical.js';

export const REALITY_INTELLIGENCE_CONTRACT_VERSION = 'reality-intelligence-contract-v0.1';

export const EPISTEMIC_STATUSES = Object.freeze([
  'OBSERVED',
  'CALCULATED',
  'INFERRED',
  'OPINION',
  'HYPOTHESIS',
  'RECOMMENDATION',
  'INSUFFICIENT_EVIDENCE'
]);

export const COGNITIVE_OPERATIONS = Object.freeze([
  'OBSERVE',
  'RESEARCH',
  'ANALYZE',
  'QUESTION',
  'REASON',
  'CHALLENGE',
  'FORM_OPINION',
  'FORM_HYPOTHESIS',
  'RECOMMEND',
  'REQUEST_EVIDENCE'
]);

export const AUTHORITY_OPERATIONS = Object.freeze([
  'CREATE',
  'EDIT',
  'COMMUNICATE',
  'EXECUTE',
  'MERGE',
  'DEPLOY',
  'DELETE',
  'FINANCIAL',
  'PERMISSIONS',
  'GOVERNANCE'
]);

export const INTELLIGENCE_INVARIANT =
  'FULL_INTELLIGENCE_GOVERNED_CONSEQUENCE';

export function classifyCognitiveOutput({ status, claim, evidence_refs = [], reasoning = null, uncertainty = null } = {}) {
  if (!EPISTEMIC_STATUSES.includes(status)) {
    throw new Error(`invalid epistemic status: ${status}`);
  }
  if (typeof claim !== 'string' || claim.trim() === '') throw new Error('claim required');

  return {
    schema_version: REALITY_INTELLIGENCE_CONTRACT_VERSION,
    invariant: INTELLIGENCE_INVARIANT,
    epistemic_status: status,
    claim,
    evidence_refs: [...new Set(evidence_refs)].sort(),
    reasoning,
    uncertainty,
    action_authority_granted: false
  };
}

export function canThink(operation) {
  return COGNITIVE_OPERATIONS.includes(operation);
}

export function separatesCognitionFromAuthority(output) {
  return Boolean(
    output &&
    output.action_authority_granted === false &&
    EPISTEMIC_STATUSES.includes(output.epistemic_status)
  );
}

export async function digestCognitiveOutput(output) {
  return sha256Hex(canonicalJson(output));
}
