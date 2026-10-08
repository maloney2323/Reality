/**
 * Reality Consequence Constitution v1.1
 *
 * The constitution governs CONSEQUENCES, not cognition.
 *
 * Reality may investigate, reason, hypothesize, plan, research, code,
 * build in isolated workspaces, discover work, run experiments, and improve
 * its capabilities without asking for action authority.
 *
 * Authority begins at the external-consequence boundary:
 * AUTHORITY -> EXECUTION -> INDEPENDENT VERIFICATION.
 *
 * This module intentionally does not cap intelligence, evidence gathering,
 * planning, or capability development. It only constrains consequential
 * external effects and constitutional mutation.
 */

const DEFAULT_LIMITS = Object.freeze({
  maxFinancialActionCents: 50000,
  maxDiscoveryCostCents: 1000,
  maxRisk: 'medium',
});

const DECISIONS = Object.freeze(['ACT', 'ASK', 'INVESTIGATE', 'WAIT', 'ESCALATE', 'IGNORE']);

export const CONSTITUTION_VERSION = '1.1.0';

export const CONSTITUTION = Object.freeze({
  version: CONSTITUTION_VERSION,
  principles: Object.freeze({
    governConsequencesNotCognition: true,
    evidenceFirst: true,
    noImplicitAuthority: true,
    preserveContradictions: true,
    noUnverifiedCompletion: true,
    intelligenceCannotRewriteConstitution: true,
    capabilityIsNotAuthority: true,
    authorizationIsNotExecution: true,
    executionIsNotVerification: true,
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

function riskAllowed(proposal = {}, constitution = CONSTITUTION) {
  const order = { low: 0, medium: 1, high: 2, critical: 3 };
  const risk = proposal.risk || 'critical';
  return order[risk] <= order[constitution.limits.maxRisk];
}

function withinFinancialLimit(proposal = {}, constitution = CONSTITUTION) {
  const cents = Number(proposal.amountCents);
  if (!Number.isFinite(cents)) return true;
  return cents <= constitution.limits.maxFinancialActionCents;
}

function withinDiscoveryBudget(proposal = {}, constitution = CONSTITUTION) {
  const cents = Number(proposal.discoveryCostCents);
  if (!Number.isFinite(cents)) return true;
  return cents <= constitution.limits.maxDiscoveryCostCents;
}

function isConsequential(proposal = {}) {
  return proposal.consequential === true ||
    proposal.externalEffect === true ||
    proposal.external_effect === true ||
    proposal.consequenceClass && proposal.consequenceClass !== 'NO_EXTERNAL_EFFECT' ||
    proposal.consequence_class && proposal.consequence_class !== 'NO_EXTERNAL_EFFECT' ||
    proposal.actionProfile?.external_effect === true;
}

/**
 * Cognition path.
 *
 * This is deliberately permissive. Intelligence does not need authority to
 * think. A caller may still record evidence, uncertainty, contradictions,
 * hypotheses, plans, experiments, and proposed actions.
 */
export function evaluateCognition({ proposal = {}, constitution = CONSTITUTION } = {}) {
  if (proposal.constitutionPatch || proposal.overrideConstitution || proposal.systemPromptOverride) {
    return deny('CONSTITUTION_MUTATION_ATTEMPT', constitution.version, 'ESCALATE');
  }

  return {
    allowed: true,
    decision: proposal.requestedDecision || 'INVESTIGATE',
    reason: 'COGNITION_NOT_GOVERNED_BY_ACTION_AUTHORITY',
    constitutionVersion: constitution.version,
    attested: true,
    authorityRequired: false,
    executionPermitted: false,
  };
}

/**
 * Consequence path.
 *
 * This is the small hard boundary. External effects must satisfy authority,
 * scope, evidence, risk, financial and verification requirements.
 */
export function evaluateConsequence({ proposal = {}, state = {}, constitution = CONSTITUTION } = {}) {
  const constitutionVersion = constitution.version || CONSTITUTION_VERSION;

  if (proposal.constitutionPatch || proposal.overrideConstitution || proposal.systemPromptOverride) {
    return deny('CONSTITUTION_MUTATION_ATTEMPT', constitutionVersion);
  }

  if (!isConsequential(proposal)) {
    return evaluateCognition({ proposal, constitution });
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

  if (!riskAllowed(proposal, constitution)) {
    return deny('RISK_LIMIT_EXCEEDED', constitutionVersion, 'ESCALATE');
  }

  if (!withinFinancialLimit(proposal, constitution)) {
    return deny('FINANCIAL_LIMIT_EXCEEDED', constitutionVersion, 'ESCALATE');
  }

  if (!withinDiscoveryBudget(proposal, constitution)) {
    return deny('DISCOVERY_BUDGET_EXCEEDED', constitutionVersion, 'WAIT');
  }

  const decision = proposal.requestedDecision || 'ACT';
  if (!DECISIONS.includes(decision)) {
    return deny('DECISION_NOT_ALLOWED', constitutionVersion, 'ESCALATE');
  }

  return {
    allowed: decision === 'ACT',
    decision,
    reason: decision === 'ACT' ? 'CONSEQUENCE_CONSTITUTION_SATISFIED' : 'NON_ACTION_DECISION',
    constitutionVersion,
    attested: true,
    authorityRequired: true,
    executionPermitted: decision === 'ACT',
  };
}

/**
 * Compatibility entry point.
 *
 * Existing callers are routed to the appropriate boundary. New code should
 * call evaluateCognition() for intelligence and evaluateConsequence() for
 * external effects explicitly.
 */
export function evaluateConstitution(args = {}) {
  return isConsequential(args.proposal || {})
    ? evaluateConsequence(args)
    : evaluateCognition(args);
}

function deny(reason, constitutionVersion, decision = 'ESCALATE') {
  return {
    allowed: false,
    decision,
    reason,
    constitutionVersion,
    attested: true,
    authorityRequired: true,
    executionPermitted: false,
  };
}
