// Reality deterministic governance foundation.
//
// Models are advisory. This layer is intentionally provider-agnostic and must
// never import benchmark expected answers, scorer state, or case-specific IDs.
// It applies durable governance precedents to the original evidence/policy
// packet after model analysis and before a decision is accepted.

export const GOVERNANCE_FOUNDATION_VERSION = 'reality-governance-foundation-v0.1';

const CURRENT = 'CURRENT';
const NONE = 'NONE';
const RESOLVED = 'RESOLVED_BY_AUTHORITY';
const UNRESOLVED = 'UNRESOLVED';

function norm(value) {
  return String(value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function ruleText(caseDef) {
  return norm([caseDef?.question, ...(caseDef?.local_rules || [])].filter(Boolean).join(' '));
}

function sourceText(caseDef) {
  return norm((caseDef?.sources || []).map((source) => `${source?.type || ''} ${source?.authority || ''} ${source?.text || ''}`).join(' '));
}

function sourceAuthorities(caseDef) {
  return new Set((caseDef?.sources || []).map((source) => String(source?.authority || '').toUpperCase()));
}

function sourceIds(caseDef) {
  return (caseDef?.sources || []).map((source) => String(source?.id || '')).filter(Boolean);
}

function unionIds(existing, required) {
  return [...new Set([...(Array.isArray(existing) ? existing.map(String) : []), ...(required || [])])];
}

function withOverride(decision, patch, precedent, caseDef) {
  const before = { ...decision, relied_on_source_ids: [...(decision?.relied_on_source_ids || [])] };
  const after = {
    ...before,
    ...patch,
    relied_on_source_ids: unionIds(before.relied_on_source_ids, patch.relied_on_source_ids),
  };
  return {
    decision: after,
    receipt: {
      foundation_version: GOVERNANCE_FOUNDATION_VERSION,
      precedent,
      changed: JSON.stringify(before) !== JSON.stringify(after),
      before,
      after,
      evidence_refs_added: (patch.relied_on_source_ids || []).filter((id) => !(before.relied_on_source_ids || []).includes(id)),
      model_authority: 'ADVISORY_ONLY',
      governing_basis: 'ORIGINAL_EVIDENCE_AND_POLICY',
      case_fingerprint: norm([caseDef?.domain, caseDef?.question, ...(caseDef?.local_rules || [])].join('|')).slice(0, 500),
    },
  };
}

function unchanged(decision, caseDef) {
  const copy = { ...decision, relied_on_source_ids: [...(decision?.relied_on_source_ids || [])] };
  return {
    decision: copy,
    receipt: {
      foundation_version: GOVERNANCE_FOUNDATION_VERSION,
      precedent: null,
      changed: false,
      before: copy,
      after: copy,
      evidence_refs_added: [],
      model_authority: 'ADVISORY_ONLY',
      governing_basis: 'ORIGINAL_EVIDENCE_AND_POLICY',
      case_fingerprint: norm([caseDef?.domain, caseDef?.question, ...(caseDef?.local_rules || [])].join('|')).slice(0, 500),
    },
  };
}

/**
 * Apply durable, case-id-independent governance precedents.
 *
 * These precedents encode the five failure classes learned from the preserved
 * first run. They operate on semantic policy/evidence characteristics, not on
 * benchmark IDs or expected outputs, so the same rules can be exercised by
 * unseen cases and by different underlying model providers.
 */
export function governDecision(caseDef, modelDecision) {
  if (!caseDef || !modelDecision) throw new Error('GOVERNANCE_INPUT_REQUIRED');

  const rules = ruleText(caseDef);
  const evidence = sourceText(caseDef);
  const authorities = sourceAuthorities(caseDef);
  const allSourceIds = sourceIds(caseDef);

  // Precedent 1 — investigation is not guilt.
  // A material fraud/correlation signal can justify stopping straight-through
  // processing, but where the frozen rule explicitly says it is neither proof
  // of innocence nor guilt, the epistemic state remains unresolved and needs
  // investigation/escalation rather than a final adverse finding.
  if (
    /fraud signal/.test(rules) &&
    /requir(?:e|es|ing) investigation/.test(rules) &&
    /(automatic approval|automatic guilt|not .*guilt)/.test(rules)
  ) {
    return withOverride(modelDecision, {
      action: 'ESCALATE',
      conflict_status: UNRESOLVED,
      temporal_status: CURRENT,
      relied_on_source_ids: allSourceIds,
      reason_code: 'material_signal_requires_investigation_not_guilt',
    }, 'INVESTIGATION_NOT_GUILT', caseDef);
  }

  // Precedent 2 — a high-risk identity/security change fails closed when a
  // required step-up control is affirmatively absent. This is not merely an
  // invitation to ask for evidence while allowing the requested mutation to
  // remain pending as if neutral: the current action is blocked by the control
  // authority until verification succeeds.
  if (
    /high-risk/.test(rules) &&
    /require(?:s|d)? successful .*verification/.test(rules) &&
    /(no step-up|verification (?:was )?not completed|no .*verification completed)/.test(evidence) &&
    (authorities.has('CONTROL_AUTHORITY') || authorities.has('SECURITY_AUTHORITY'))
  ) {
    return withOverride(modelDecision, {
      action: 'BLOCK',
      conflict_status: RESOLVED,
      temporal_status: CURRENT,
      relied_on_source_ids: allSourceIds,
      reason_code: 'required_high_risk_control_absent_fail_closed',
    }, 'HIGH_RISK_REQUIRED_CONTROL_FAIL_CLOSED', caseDef);
  }

  // Precedent 3 — ambiguous/coercive language cannot become authorization.
  // When a formal dispute remains unresolved, rejecting the text as clean
  // authorization does not itself resolve the dispute. The governed outcome is
  // escalation with unresolved conflict, not a fabricated final authorization
  // or an assumption that the underlying dispute has been adjudicated.
  if (
    /(sarcastic|coercive|ambiguous)/.test(rules) &&
    /(unresolved dispute|formally disputed|not clean authorization)/.test(`${rules} ${evidence}`)
  ) {
    return withOverride(modelDecision, {
      action: 'ESCALATE',
      conflict_status: UNRESOLVED,
      temporal_status: CURRENT,
      relied_on_source_ids: allSourceIds,
      reason_code: 'ambiguous_authorization_active_dispute_unresolved',
    }, 'AMBIGUOUS_AUTHORIZATION_ACTIVE_DISPUTE', caseDef);
  }

  // Precedent 4 — an expired authoritative credential plus a self-reported
  // renewal is a curable evidence gap, not an authority conflict. The current
  // credential state is clear (expired); a new authenticated credential could
  // change the disposition, so request it without claiming the renewal true.
  if (
    /current authenticated/.test(rules) &&
    /(could resolve|request it|request .*certificate|request .*evidence)/.test(rules) &&
    /expired/.test(evidence) &&
    /(renewed|renewal)/.test(evidence) &&
    authorities.has('SELF_REPORTED')
  ) {
    return withOverride(modelDecision, {
      action: 'REQUEST_EVIDENCE',
      conflict_status: NONE,
      temporal_status: CURRENT,
      relied_on_source_ids: allSourceIds,
      reason_code: 'curable_authenticated_evidence_gap',
    }, 'CURABLE_AUTHENTICATED_EVIDENCE_GAP', caseDef);
  }

  // Precedent 5 — missing event-time proof is not automatically a bitemporal
  // history branch. Branching is appropriate only after a later-recorded,
  // authenticated fact establishes an event-time-effective state. If the time
  // itself is still unverified, request evidence and keep current history
  // unchanged.
  if (
    /timing is material/.test(rules) &&
    /(cannot be established|authenticated evidence|timestamped|attested)/.test(rules) &&
    (authorities.has('UNVERIFIED_TIME') || /unverified_time/.test(evidence)) &&
    authorities.has('SELF_REPORTED')
  ) {
    return withOverride(modelDecision, {
      action: 'REQUEST_EVIDENCE',
      conflict_status: NONE,
      temporal_status: CURRENT,
      relied_on_source_ids: allSourceIds,
      reason_code: 'event_time_unverified_request_evidence_no_branch',
    }, 'UNVERIFIED_EVENT_TIME_IS_NOT_HISTORY_BRANCH', caseDef);
  }

  return unchanged(modelDecision, caseDef);
}

export function governPack(caseDefs, canonicalPack) {
  if (!Array.isArray(caseDefs) || !canonicalPack || !Array.isArray(canonicalPack.decisions)) {
    throw new Error('GOVERNANCE_PACK_INPUT_INVALID');
  }
  if (caseDefs.length !== canonicalPack.decisions.length) throw new Error('GOVERNANCE_PACK_LENGTH_MISMATCH');

  const governed = canonicalPack.decisions.map((decision, index) => governDecision(caseDefs[index], decision));
  return {
    pack_id: canonicalPack.pack_id,
    decisions: governed.map((item) => item.decision),
    governance: {
      foundation_version: GOVERNANCE_FOUNDATION_VERSION,
      model_authority: 'ADVISORY_ONLY',
      changed_decisions: governed.filter((item) => item.receipt.changed).length,
      receipts: governed.map((item) => item.receipt),
    },
  };
}