// Reality Operating Constitution v1.0
// The constitution defines what Reality must establish before it can claim
// responsibility for operating a business. It does not grant execution authority.

export const REALITY_OPERATING_CONSTITUTION_VERSION = 'reality-operating-constitution-v1.0';

export const CONSTITUTIONAL_STATES = Object.freeze([
  'BUSINESS_UNKNOWN',
  'BUSINESS_ESTABLISHED',
  'RESPONSIBILITIES_PARTIAL',
  'RESPONSIBILITIES_ESTABLISHED',
  'READY_FOR_WORK_DISCOVERY',
  'READY_FOR_GOVERNED_EXECUTION',
]);

const REQUIREMENTS = Object.freeze([
  ['business_identity', 'BUSINESS_IDENTITY', 'What business is Reality responsible for operating?'],
  ['success_criteria', 'SUCCESS_CRITERIA', 'What outcomes define successful operation?'],
  ['responsibilities', 'RESPONSIBILITIES', 'What recurring operational responsibilities belong to Reality?'],
  ['work_evidence', 'WORK_EVIDENCE', 'What legitimate work is actually occurring?'],
  ['authority', 'AUTHORITY', 'What explicit authority exists for each consequential work item?'],
  ['verification', 'VERIFICATION', 'How will completion be independently verified?'],
]);

export function evaluateOperatingConstitution({ evidence = {} } = {}) {
  const e = evidence && typeof evidence === 'object' ? evidence : {};
  const checks = REQUIREMENTS.map(([id, kind, question]) => ({
    id, kind, question,
    established: Boolean(e[id]),
    evidence_ref: e[id]?.evidence_ref || null,
  }));
  const business = checks.find(x => x.id === 'business_identity')?.established;
  const success = checks.find(x => x.id === 'success_criteria')?.established;
  const responsibilities = checks.find(x => x.id === 'responsibilities')?.established;
  const work = checks.find(x => x.id === 'work_evidence')?.established;
  const authority = checks.find(x => x.id === 'authority')?.established;
  const verification = checks.find(x => x.id === 'verification')?.established;

  let state = 'BUSINESS_UNKNOWN';
  if (business) state = 'BUSINESS_ESTABLISHED';
  if (business && success && responsibilities) state = 'RESPONSIBILITIES_ESTABLISHED';
  if (business && success && responsibilities && work) state = 'READY_FOR_WORK_DISCOVERY';
  if (business && success && responsibilities && work && authority && verification) state = 'READY_FOR_GOVERNED_EXECUTION';

  return Object.freeze({
    version: REALITY_OPERATING_CONSTITUTION_VERSION,
    state,
    checks: Object.freeze(checks.map(Object.freeze)),
    execution_authority: state === 'READY_FOR_GOVERNED_EXECUTION'
      ? 'MUST_STILL_BE_GRANTED_PER_WORK_ITEM'
      : 'NOT_ESTABLISHED',
    unresolved: Object.freeze(checks.filter(x => !x.established).map(x => x.id)),
    principle: 'RESPONSIBILITY_MUST_BE_EVIDENCE_GROUNDED_BEFORE_AUTONOMOUS_OPERATION',
  });
}

export function constitutionalEvidenceFromShift(evidence = {}) {
  const e = evidence && typeof evidence === 'object' ? evidence : {};
  return {
    business_identity: e.business_identity || null,
    success_criteria: e.success_criteria || null,
    responsibilities: e.responsibilities || null,
    work_evidence: Number(e.discovered_work_count || 0) > 0
      ? { discovered_work_count: e.discovered_work_count, evidence_ref: e.work_evidence_ref || null }
      : null,
    authority: e.authority && e.authority !== 'NONE_UNLESS_EXPLICITLY_GRANTED_PER_WORK_ITEM'
      ? { basis: e.authority }
      : null,
    verification: e.verification_plan
      ? { plan: e.verification_plan }
      : null,
  };
}
