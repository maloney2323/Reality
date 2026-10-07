// Reality Governed Claim Ledger v1.0
// Claims are append-only epistemic objects. The Operating Constitution is a projection.
// Inference can be proposed, but cannot become active responsibility without authority.

export const REALITY_CLAIM_LEDGER_VERSION = 'reality-governed-claim-ledger-v1.0';

export const CLAIM_TYPES = Object.freeze([
  'business','success_criterion','responsibility','authority','work_scope','unknown',
]);

export const EPISTEMIC_STATUSES = Object.freeze([
  'observed','inferred','proposed','approved','rejected','superseded',
]);

function clean(value) { return typeof value === 'string' ? value.trim() : ''; }
function list(value) { return Array.isArray(value) ? value.filter(Boolean) : []; }

export function createGovernedClaim({
  claim_id,
  claim_type,
  content,
  epistemic_status = 'proposed',
  evidence_refs = [],
  authority_ref = null,
  scope = {},
  valid_from = new Date().toISOString(),
  expires_at = null,
  supersedes = null,
  confidence = null,
  last_verified_at = null,
} = {}) {
  if (!clean(claim_id)) throw new Error('CLAIM_ID_REQUIRED');
  if (!CLAIM_TYPES.includes(claim_type)) throw new Error('CLAIM_TYPE_INVALID');
  if (!clean(content)) throw new Error('CLAIM_CONTENT_REQUIRED');
  if (!EPISTEMIC_STATUSES.includes(epistemic_status)) throw new Error('CLAIM_EPISTEMIC_STATUS_INVALID');
  if (epistemic_status === 'approved' && !clean(authority_ref)) throw new Error('APPROVED_CLAIM_AUTHORITY_REQUIRED');
  if (claim_type === 'responsibility' && ['approved'].includes(epistemic_status) && !clean(authority_ref)) {
    throw new Error('RESPONSIBILITY_AUTHORITY_REQUIRED');
  }
  const verified = last_verified_at || null;
  return Object.freeze({
    version: REALITY_CLAIM_LEDGER_VERSION,
    claim_id: clean(claim_id),
    claim_type,
    content: clean(content),
    epistemic_status,
    evidence_refs: Object.freeze(list(evidence_refs).map(String)),
    authority_ref: authority_ref ? clean(authority_ref) : null,
    scope: Object.freeze(scope && typeof scope === 'object' ? {...scope} : {}),
    valid_from,
    expires_at,
    supersedes: supersedes ? clean(supersedes) : null,
    confidence: Number.isFinite(Number(confidence)) ? Number(confidence) : null,
    last_verified_at: verified,
    append_only: true,
  });
}

export function projectOperatingConstitution(claims = []) {
  const active = Array.isArray(claims)
    ? claims.filter(c => c && !['rejected','superseded'].includes(c.epistemic_status))
    : [];
  const latest = (type) => active
    .filter(c => c.claim_type === type)
    .sort((a,b) => String(b.valid_from || '').localeCompare(String(a.valid_from || '')))[0] || null;

  const business = latest('business');
  const success = latest('success_criterion');
  const responsibilityClaims = active.filter(c => c.claim_type === 'responsibility');
  const approvedResponsibilities = responsibilityClaims.filter(c => c.epistemic_status === 'approved' && c.authority_ref);
  const workScope = latest('work_scope');
  const authorityClaims = active.filter(c => c.claim_type === 'authority' && c.epistemic_status === 'approved' && c.authority_ref);
  const unknowns = active.filter(c => c.claim_type === 'unknown' && c.epistemic_status !== 'rejected');

  const checks = {
    business_identity: Boolean(business),
    success_criteria: Boolean(success),
    responsibilities: approvedResponsibilities.length > 0,
    work_evidence: Boolean(workScope),
    authority: authorityClaims.length > 0,
    verification: authorityClaims.some(c => c.scope?.verification_method),
  };

  let state = 'BUSINESS_UNKNOWN';
  if (checks.business_identity) state = 'BUSINESS_ESTABLISHED';
  if (checks.business_identity && checks.success_criteria && checks.responsibilities) state = 'RESPONSIBILITIES_ESTABLISHED';
  if (checks.business_identity && checks.success_criteria && checks.responsibilities && checks.work_evidence) state = 'READY_FOR_WORK_DISCOVERY';
  if (Object.values(checks).every(Boolean)) state = 'READY_FOR_GOVERNED_EXECUTION';

  return Object.freeze({
    version: REALITY_CLAIM_LEDGER_VERSION,
    projection: 'OPERATING_CONSTITUTION',
    state,
    checks: Object.freeze(checks),
    business_identity_claim: business,
    success_criteria_claim: success,
    active_responsibility_claims: Object.freeze(approvedResponsibilities),
    work_scope_claim: workScope,
    authority_claims: Object.freeze(authorityClaims),
    unresolved_unknowns: Object.freeze(unknowns),
    execution_authority: state === 'READY_FOR_GOVERNED_EXECUTION'
      ? 'MUST_STILL_MATCH_EXACT_AUTHORITY_PER_OPERATION'
      : 'NOT_ESTABLISHED',
    principle: 'INFERENCE_MAY_PROPOSE_BUT_CANNOT_ACTIVATE_RESPONSIBILITY_WITHOUT_AUTHORITY',
  });
}

export async function appendGovernedClaim({ persistence, continuityRootId, worldlineId, claim, parentEventId = null, provenance = {} } = {}) {
  if (!persistence?.appendEvent) throw new Error('CLAIM_PERSISTENCE_REQUIRED');
  const now = new Date().toISOString();
  return persistence.appendEvent({
    event_id: claim.claim_id,
    event_kind: 'governance',
    entity_type: 'governed_claim',
    entity_id: claim.claim_id,
    continuity_root_id: continuityRootId,
    worldline_id: worldlineId,
    parent_event_id: parentEventId,
    effective_time: claim.valid_from || now,
    assertion_time: now,
    epistemic_status: claim.epistemic_status.toUpperCase(),
    payload: claim,
    evidence_refs: claim.evidence_refs,
    provenance: { ...provenance, source: provenance.source || 'reality-governed-claim-ledger-v1.0' },
  });
}
