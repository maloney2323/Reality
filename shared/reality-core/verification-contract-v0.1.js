// Reality Core Verification Contract v0.1 — deterministic, fail-closed.
// A receipt's integrity is distinct from the truth of the claims it records.
export const VERIFICATION_STATES = Object.freeze(['NOT_EVALUATED','INCOMPLETE','CONTRADICTED','FAILED','VERIFIED']);
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
export function evaluateVerificationContract(input={}) {
  const evidence=Array.isArray(input.evidence)?input.evidence:[];
  const checks=Array.isArray(input.checks)?input.checks:[];
  const conflicts=Array.isArray(input.unresolved_conflicts)?input.unresolved_conflicts:[];
  const referencesValid=evidence.length>0 && evidence.every(e=>e && typeof e.id==='string' && e.id.trim() && e.verified===true && typeof e.source==='string' && e.source.trim());
  const checksComplete=checks.length>0 && checks.every(c=>c && c.status==='VERIFIED' && c.independent===true && typeof c.name==='string' && c.name.trim());
  const authorized=input.authorization?.status==='AUTHORIZED' && typeof input.authorization?.actor==='string' && input.authorization.actor.trim().length>0;
  const conflictFree=conflicts.length===0;
  const hasFailure=checks.some(c=>c?.status==='FAILED') || evidence.some(e=>e?.verified===false);
  const status=hasFailure?'FAILED':!conflictFree?'CONTRADICTED':referencesValid&&checksComplete&&authorized?'VERIFIED':'INCOMPLETE';
  return Object.freeze({schema:'reality.core.verification-contract.v0.1',status,verified:status==='VERIFIED',may_mark_resolved:status==='VERIFIED',
    evidence_verified:referencesValid,independent_checks_verified:checksComplete,authorization_verified:authorized,conflicts_resolved:conflictFree,
    receipt_integrity_verified:input.receipt_integrity_verified===true,
    // A valid receipt alone never upgrades the decision to VERIFIED.
    missing:[...(!referencesValid?['VERIFIED_EVIDENCE']:[]),...(!checksComplete?['INDEPENDENT_CHECKS']:[]),...(!authorized?['AUTHORIZATION']:[]),...(!conflictFree?['UNRESOLVED_CONFLICTS']:[])]});
}
