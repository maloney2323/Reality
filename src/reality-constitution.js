const DEFAULT_LIMITS = Object.freeze({
  maxFinancialActionCents: 50000,
  maxDiscoveryCostCents: 1000,
  maxRisk: 'medium',
});

const DECISIONS = Object.freeze(['ACT', 'ASK', 'INVESTIGATE', 'WAIT', 'ESCALATE', 'IGNORE']);

export const CONSTITUTION_VERSION = '1.0.0';

export const CONSTITUTION = Object.freeze({
  version: CONSTITUTION_VERSION,
  principles: Object.freeze({
    evidenceFirst: true,
    noImplicitAuthority: true,
    preserveContradictions: true,
    noUnverifiedCompletion: true,
    intelligenceCannotRewriteConstitution: true,
  }),
  limits: Object.freeze(DEFAULT_LIMITS),
});

function hasContradiction(state = {}) {
  return state.contradiction === true || state.contradictions === true;
}

function evidenceSufficient(state = {}) {
  return state.evidenceSufficient === true;
}

function authorized(proposal = {}) {
  return proposal.authorization?.authorized === true;
}

function scopeMatches(proposal = {}) {
  return Boolean(proposal.authorization?.scope) &&
    proposal.authorization.scope === proposal.requiredScope;
}

function riskAllowed(proposal = {}) {
  const order = { low: 0, medium: 1, high: 2, critical: 3 };
  const risk = proposal.risk || 'critical';
  return order[risk] <= order[CONSTITUTION.limits.maxRisk];
}

function withinFinancialLimit(proposal = {}) {
  const cents = Number(proposal.amountCents);
  if (!Number.isFinite(cents)) return true;
  return cents <= CONSTITUTION.limits.maxFinancialActionCents;
}

function withinDiscoveryBudget(proposal = {}) {
  const cents = Number(proposal.discoveryCostCents);
  if (!Number.isFinite(cents)) return true;
  return cents <= CONSTITUTION.limits.maxDiscoveryCostCents;
}

export function evaluateConstitution({ proposal = {}, state = {}, constitution = CONSTITUTION } = {}) {
  const constitutionVersion = constitution.version || CONSTITUTION_VERSION;

  if (proposal.constitutionPatch || proposal.overrideConstitution || proposal.systemPromptOverride) {
    return deny('CONSTITUTION_MUTATION_ATTEMPT', constitutionVersion);
  }

  if (hasContradiction(state)) {
    return deny('CONTRADICTORY_EVIDENCE', constitutionVersion, 'ESCALATE');
  }

  if (!evidenceSufficient(state)) {
    return deny('INSUFFICIENT_EVIDENCE', constitutionVersion, 'INVESTIGATE');
  }

  if (!authorized(proposal)) {
    return deny('EXPLICIT_AUTHORIZATION_REQUIRED', constitutionVersion, 'ESCALATE');
  }

  if (!scopeMatches(proposal)) {
    return deny('AUTHORITY_SCOPE_MISMATCH', constitutionVersion, 'ESCALATE');
  }

  if (!riskAllowed(proposal)) {
    return deny('RISK_LIMIT_EXCEEDED', constitutionVersion, 'ESCALATE');
  }

  if (!withinFinancialLimit(proposal)) {
    return deny('FINANCIAL_LIMIT_EXCEEDED', constitutionVersion, 'ESCALATE');
  }

  if (!withinDiscoveryBudget(proposal)) {
    return deny('DISCOVERY_BUDGET_EXCEEDED', constitutionVersion, 'WAIT');
  }

  const decision = proposal.requestedDecision || 'ACT';
  if (!DECISIONS.includes(decision)) {
    return deny('DECISION_NOT_ALLOWED', constitutionVersion, 'ESCALATE');
  }

  return {
    allowed: decision === 'ACT',
    decision,
    reason: decision === 'ACT' ? 'CONSTITUTION_SATISFIED' : 'NON_ACTION_DECISION',
    constitutionVersion,
    attested: true,
  };
}

function deny(reason, constitutionVersion, decision = 'ESCALATE') {
  return {
    allowed: false,
    decision,
    reason,
    constitutionVersion,
    attested: true,
  };
}
