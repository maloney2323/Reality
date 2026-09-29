const DECISIONS = Object.freeze(['ACT', 'ASK', 'INVESTIGATE', 'WAIT', 'ESCALATE', 'IGNORE']);

export const INTENT_VERSION = '0.2.0';

const WORLD_HINTS = Object.freeze({
  github: ['github', 'repository', 'repo', 'commit', 'pull request', 'code', 'branch'],
  vercel: ['vercel', 'deployment', 'deploy', 'production', 'preview', 'runtime'],
  base44: ['base44', 'app builder', 'legacy app', 'connector'],
});

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean).map((item) => typeof item === 'string' ? item.trim() : item) : [];
}

function inferWorlds(text) {
  const lower = normalizeText(text).toLowerCase();
  return Object.entries(WORLD_HINTS)
    .filter(([, hints]) => hints.some((hint) => lower.includes(hint)))
    .map(([world]) => world);
}

export function createBusinessUpdate({
  businessId = null,
  businessName = null,
  purpose,
  businessType = null,
  industry = null,
  description = null,
  context = null,
  operationalDomains = [],
  currentPriorities = [],
  constraints = [],
  successCriteria = [],
  workflows = [],
  stakeholders = [],
  connectedSystems = [],
  authority = null,
  riskPolicy = null,
  autonomyPolicy = null,
  notes = null,
} = {}) {
  const normalizedPurpose = normalizeText(purpose);
  if (!normalizedPurpose) throw new Error('BUSINESS_PURPOSE_REQUIRED');

  return Object.freeze({
    version: INTENT_VERSION,
    business_id: businessId,
    business_name: businessName,
    business_type: businessType,
    industry: industry,
    description: description,
    purpose: normalizedPurpose,
    context,
    operational_domains: normalizeList(operationalDomains),
    current_priorities: normalizeList(currentPriorities),
    constraints: normalizeList(constraints),
    success_criteria: normalizeList(successCriteria),
    workflows: normalizeList(workflows),
    stakeholders: normalizeList(stakeholders),
    connected_systems: normalizeList(connectedSystems),
    authority,
    risk_policy: riskPolicy,
    autonomy_policy: autonomyPolicy,
    notes,
    updated_at: new Date().toISOString(),
  });
}

export function interpretAsk({ ask, businessUpdate, knownFacts = [], unknowns = [], requestedDecision = null } = {}) {
  const normalizedAsk = normalizeText(ask);
  if (!normalizedAsk) throw new Error('ASK_REQUIRED');
  if (!businessUpdate?.purpose) throw new Error('BUSINESS_CONTEXT_REQUIRED');

  const worlds = inferWorlds(normalizedAsk);
  const explicitDecision = DECISIONS.includes(requestedDecision) ? requestedDecision : null;
  const derivedUnknowns = normalizeList(unknowns);

  if (!knownFacts.length) derivedUnknowns.push('What evidence establishes the current operational state?');

  const nextDecision = explicitDecision || (derivedUnknowns.length ? 'INVESTIGATE' : 'ASK');

  return {
    intent_version: INTENT_VERSION,
    business_update: businessUpdate,
    ask: normalizedAsk,
    business_outcome: businessUpdate.purpose,
    known_facts: normalizeList(knownFacts),
    unknowns: [...new Set(derivedUnknowns)],
    candidate_worlds: worlds,
    connected_systems: businessUpdate.connected_systems,
    requested_decision: explicitDecision,
    next_decision: nextDecision,
    authorization_created: false,
    action_authorized: false,
  };
}

export function createInvestigationWork({ interpretation, hypothesis = null } = {}) {
  if (!interpretation?.ask) throw new Error('INTERPRETATION_REQUIRED');

  const worlds = interpretation.candidate_worlds?.length ? interpretation.candidate_worlds : ['github', 'vercel', 'base44'];

  return {
    work_version: INTENT_VERSION,
    work_type: 'INVESTIGATION',
    ask: interpretation.ask,
    objective: interpretation.business_outcome,
    hypothesis: hypothesis ? { text: normalizeText(hypothesis), status: 'UNVERIFIED', proposed_by: 'brain' } : null,
    required_worlds: worlds,
    evidence_requirements: interpretation.unknowns.map((unknown) => ({ question: unknown, status: 'MISSING' })),
    authorization_created: false,
    action_authorized: false,
  };
}
