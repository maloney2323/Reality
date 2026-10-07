// Reality Operating Constitution v1.0
// The constitution is a projection over versioned governed claims.
// It is never the source of truth and never grants execution authority.

import { projectOperatingConstitution } from './reality-governed-claim-ledger-v1.0.js';

export const REALITY_OPERATING_CONSTITUTION_VERSION = 'reality-operating-constitution-v1.0';

export const CONSTITUTIONAL_STATES = Object.freeze([
  'BUSINESS_UNKNOWN',
  'BUSINESS_ESTABLISHED',
  'RESPONSIBILITIES_PARTIAL',
  'RESPONSIBILITIES_ESTABLISHED',
  'READY_FOR_WORK_DISCOVERY',
  'READY_FOR_GOVERNED_EXECUTION',
]);

export function evaluateOperatingConstitution({ evidence = {}, claims = [] } = {}) {
  const e = evidence && typeof evidence === 'object' ? evidence : {};
  const projected = projectOperatingConstitution(Array.isArray(claims) ? claims : []);
  const observedChecks = {
    business_identity: Boolean(e.business_identity),
    success_criteria: Boolean(e.success_criteria),
    responsibilities: false,
    work_evidence: Boolean(e.work_evidence),
    authority: false,
    verification: Boolean(e.verification_plan),
  };
  const checks = { ...observedChecks, ...projected.checks };

  let state = projected.state;
  if (state === 'BUSINESS_UNKNOWN' && observedChecks.business_identity) state = 'BUSINESS_ESTABLISHED';
  if (state === 'RESPONSIBILITIES_ESTABLISHED' && observedChecks.work_evidence) state = 'READY_FOR_WORK_DISCOVERY';

  return Object.freeze({
    version: REALITY_OPERATING_CONSTITUTION_VERSION,
    projection: 'VERSIONED_GOVERNED_CLAIMS',
    state,
    checks: Object.freeze(checks),
    claim_projection: projected,
    execution_authority: projected.execution_authority,
    unresolved: Object.freeze(Object.entries(checks).filter(([,v]) => !v).map(([k]) => k)),
    principle: 'RESPONSIBILITY_MUST_BE_EVIDENCE_GROUNDED_AND_AUTHORITY_BOUND',
  });
}

export function constitutionalEvidenceFromShift(evidence = {}) {
  const e = evidence && typeof evidence === 'object' ? evidence : {};
  return {
    business_identity: e.business_identity || null,
    success_criteria: e.success_criteria || null,
    responsibilities: null,
    work_evidence: Number(e.discovered_work_count || 0) > 0
      ? { discovered_work_count: e.discovered_work_count, evidence_ref: e.work_evidence_ref || null }
      : null,
    authority: null,
    verification_plan: e.verification_plan || null,
  };
}
