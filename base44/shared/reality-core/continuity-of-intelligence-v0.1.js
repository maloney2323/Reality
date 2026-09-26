// Reality Continuity of Intelligence v0.1
//
// Purpose:
//   Carry structured cognitive continuity from one layer to the next without
//   collapsing provenance, epistemic status, rules, role, uncertainty, or
//   downstream requirements into an untyped summary.
//
// This is a continuity contract, not an authority grant.
// A receiving layer may reason over inherited context, but inheritance alone
// never promotes epistemic status or creates authority.
//
// Core invariant:
//   INHERIT what the prior layer established.
//   ADD what the current layer established.
//   FORWARD what the next layer must preserve or resolve.
//   NEVER silently rewrite the prior layer's meaning.

import { canonicalJson, sha256Hex } from '../action-gate/canonical.js';

export const CONTINUITY_OF_INTELLIGENCE_VERSION =
  'reality-continuity-of-intelligence-v0.1';
export const CONTINUITY_OF_INTELLIGENCE_AUTHORITY =
  'GOVERNED_CONTEXT_CONTINUITY_ONLY';

export const ContinuityItemKind = Object.freeze({
  FACT: 'FACT',
  CLAIM: 'CLAIM',
  EVIDENCE: 'EVIDENCE',
  RULE: 'RULE',
  ROLE: 'ROLE',
  CONTRADICTION: 'CONTRADICTION',
  UNCERTAINTY: 'UNCERTAINTY',
  EPISTEMIC_DEBT: 'EPISTEMIC_DEBT',
  REQUIREMENT: 'REQUIREMENT',
  FINDING: 'FINDING',
});

export const ContinuityDisposition = Object.freeze({
  INHERITED: 'INHERITED',
  PRODUCED: 'PRODUCED',
  FORWARDED: 'FORWARDED',
});

export const ContinuityEpistemicStatus = Object.freeze({
  OBSERVED: 'OBSERVED',
  SUPPORTED: 'SUPPORTED',
  DERIVED: 'DERIVED',
  HYPOTHESIS: 'HYPOTHESIS',
  CONTESTED: 'CONTESTED',
  ESTABLISHED: 'ESTABLISHED',
  UNKNOWN: 'UNKNOWN',
  UNRESOLVED: 'UNRESOLVED',
  SUPERSEDED: 'SUPERSEDED',
});

function fail(message) {
  throw new Error('Reality continuity of intelligence invalid: ' + message);
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function list(value, field) {
  if (!Array.isArray(value)) fail(field + ' must be an array');
  const normalized = value.map((item) => {
    if (!nonEmpty(item)) fail(field + ' contains an invalid reference');
    return item.trim();
  });
  return [...new Set(normalized)];
}

function clone(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(clone);
  const output = {};
  for (const key of Object.keys(value)) output[key] = clone(value[key]);
  return output;
}

const VALID_KINDS = new Set(Object.values(ContinuityItemKind));
const VALID_DISPOSITIONS = new Set(Object.values(ContinuityDisposition));
const VALID_STATUS = new Set(Object.values(ContinuityEpistemicStatus));

function normalizeItem(item, field) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    fail(field + ' must contain objects');
  }
  if (!nonEmpty(item.item_id)) fail(field + '.item_id is required');
  if (!VALID_KINDS.has(item.kind)) fail(field + '.kind is invalid');
  if (!VALID_DISPOSITIONS.has(item.disposition)) fail(field + '.disposition is invalid');
  if (!VALID_STATUS.has(item.epistemic_status)) {
    fail(field + '.epistemic_status is invalid');
  }
  if (item.disposition === ContinuityDisposition.INHERITED && !(Array.isArray(item.source_refs) && item.source_refs.some(nonEmpty))) {
    fail(field + '.inherited items require source_refs');
  }
  return {
    item_id: item.item_id.trim(),
    kind: item.kind,
    disposition: item.disposition,
    epistemic_status: item.epistemic_status,
    value: clone(item.value),
    source_refs: list(item.source_refs || [], field + '.source_refs'),
    evidence_refs: list(item.evidence_refs || [], field + '.evidence_refs'),
    parent_item_refs: list(item.parent_item_refs || [], field + '.parent_item_refs'),
    rationale: nonEmpty(item.rationale) ? item.rationale.trim() : null,
  };
}

function normalizeRole(role) {
  if (role == null) return null;
  if (!role || typeof role !== 'object' || Array.isArray(role)) {
    fail('role_context must be an object or null');
  }
  if (!nonEmpty(role.role_id)) fail('role_context.role_id is required');
  return {
    role_id: role.role_id.trim(),
    role_version: nonEmpty(role.role_version) ? role.role_version.trim() : null,
    responsibilities: list(role.responsibilities || [], 'role_context.responsibilities'),
    constraints: list(role.constraints || [], 'role_context.constraints'),
    source_refs: list(role.source_refs || [], 'role_context.source_refs'),
  };
}

function normalizeRules(rules) {
  if (!Array.isArray(rules)) fail('rule_stack must be an array');
  const seen = new Map();
  const normalized = rules.map((rule, index) => {
    if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
      fail('rule_stack[' + index + '] must be an object');
    }
    if (!nonEmpty(rule.rule_id)) fail('rule_stack[' + index + '].rule_id is required');
    if (!nonEmpty(rule.rule_version)) fail('rule_stack[' + index + '].rule_version is required');
    if (!nonEmpty(rule.rule_text)) fail('rule_stack[' + index + '].rule_text is required');
    const status = rule.status || 'ACTIVE';
    if (!['ACTIVE', 'SUSPENDED', 'SUPERSEDED'].includes(status)) {
      fail('rule_stack[' + index + '].status is invalid');
    }
    const normalizedRule = {
      rule_id: rule.rule_id.trim(),
      rule_version: rule.rule_version.trim(),
      rule_text: rule.rule_text.trim(),
      status,
      source_refs: list(rule.source_refs || [], 'rule_stack[' + index + '].source_refs'),
      supersedes: list(rule.supersedes || [], 'rule_stack[' + index + '].supersedes'),
    };
    const prior = seen.get(normalizedRule.rule_id);
    if (prior && JSON.stringify(prior) !== JSON.stringify(normalizedRule)) {
      fail('rule_stack contains conflicting definitions for the same rule_id');
    }
    seen.set(normalizedRule.rule_id, normalizedRule);
    return normalizedRule;
  });
  return normalized;
}

function normalizeCollection(value, field) {
  if (!Array.isArray(value)) fail(field + ' must be an array');
  return value.map((item) => normalizeItem(item, field));
}

export async function buildContinuityPackage({
  continuity_id,
  source_layer,
  target_layer,
  epoch_id,
  lineage_root,
  parent_continuity_id = null,
  role_context = null,
  rule_stack = [],
  inherited = [],
  produced = [],
  forwarded = [],
  captured_at,
} = {}) {
  for (const [name, value] of [
    ['continuity_id', continuity_id],
    ['source_layer', source_layer],
    ['target_layer', target_layer],
    ['epoch_id', epoch_id],
    ['lineage_root', lineage_root],
    ['captured_at', captured_at],
  ]) {
    if (!nonEmpty(value)) fail(name + ' is required');
  }
  if (!Number.isFinite(Date.parse(captured_at))) fail('captured_at must be a valid timestamp');

  const body = {
    schema_version: CONTINUITY_OF_INTELLIGENCE_VERSION,
    authority: CONTINUITY_OF_INTELLIGENCE_AUTHORITY,
    continuity_id: continuity_id.trim(),
    source_layer: source_layer.trim(),
    target_layer: target_layer.trim(),
    epoch_id: epoch_id.trim(),
    lineage_root: lineage_root.trim(),
    parent_continuity_id: nonEmpty(parent_continuity_id) ? parent_continuity_id.trim() : null,
    role_context: normalizeRole(role_context),
    rule_stack: normalizeRules(rule_stack),
    inherited: normalizeCollection(inherited, 'inherited'),
    produced: normalizeCollection(produced, 'produced'),
    forwarded: normalizeCollection(forwarded, 'forwarded'),
    semantics: {
      inherited_context_is_not_reinterpreted_as_new_evidence: true,
      receiving_layer_must_preserve_epistemic_status: true,
      provenance_is_required_for_inherited_claims: true,
      contradictions_are_preserved: true,
      unresolved_items_are_preserved: true,
      forwarded_rules_grant_no_authority: true,
      continuity_grants_no_action_authority: true,
      continuity_grants_no_governance_authority: true,
    },
    captured_at: new Date(captured_at).toISOString(),
  };

  const digest = await sha256Hex(canonicalJson(body));
  return Object.freeze({ ...body, continuity_digest: digest });
}

export async function extendContinuityPackage({
  previous,
  target_layer,
  produced = [],
  forwarded = [],
  additional_rules = [],
  role_context = undefined,
  captured_at,
  continuity_id,
} = {}) {
  if (!(await verifyContinuityPackage(previous))) fail('previous continuity package is invalid');
  if (!nonEmpty(target_layer)) fail('target_layer is required');
  if (!nonEmpty(captured_at) || !Number.isFinite(Date.parse(captured_at))) fail('captured_at must be a valid timestamp');
  if (!nonEmpty(continuity_id)) fail('continuity_id is required');

  const activePreviousRules = previous.rule_stack.filter((rule) => rule.status === 'ACTIVE');
  const nextRules = [...activePreviousRules, ...additional_rules];
  const nextRole = role_context === undefined ? previous.role_context : role_context;

  const inherited = [
    ...previous.inherited,
    ...previous.produced.map((item) => ({
      ...item,
      disposition: ContinuityDisposition.INHERITED,
      parent_item_refs: [...new Set([...(item.parent_item_refs || []), item.item_id])],
      source_refs: [...new Set([...(item.source_refs || []), 'continuity:' + previous.continuity_id])],
    })),
  ];

  return buildContinuityPackage({
    continuity_id,
    source_layer: previous.target_layer,
    target_layer,
    epoch_id: previous.epoch_id,
    lineage_root: previous.lineage_root,
    parent_continuity_id: previous.continuity_id,
    role_context: nextRole,
    rule_stack: nextRules,
    inherited,
    produced,
    forwarded,
    captured_at,
  });
}

export async function verifyContinuityPackage(pkg = {}) {
  try {
    if (!pkg || pkg.schema_version !== CONTINUITY_OF_INTELLIGENCE_VERSION) return false;
    if (pkg.authority !== CONTINUITY_OF_INTELLIGENCE_AUTHORITY) return false;
    if (!nonEmpty(pkg.continuity_digest)) return false;
    if (!pkg.semantics || pkg.semantics.receiving_layer_must_preserve_epistemic_status !== true) return false;
    if (pkg.semantics.continuity_grants_no_action_authority !== true) return false;
    if (pkg.semantics.continuity_grants_no_governance_authority !== true) return false;

    const { continuity_digest, ...body } = pkg;
    const expected = await sha256Hex(canonicalJson(body));
    if (expected !== continuity_digest) return false;

    normalizeRole(pkg.role_context);
    normalizeRules(pkg.rule_stack);
    normalizeCollection(pkg.inherited, 'inherited');
    normalizeCollection(pkg.produced, 'produced');
    normalizeCollection(pkg.forwarded, 'forwarded');

    if (pkg.inherited.some((item) => item.disposition !== ContinuityDisposition.INHERITED)) return false;
    if (pkg.produced.some((item) => item.disposition !== ContinuityDisposition.PRODUCED)) return false;
    if (pkg.forwarded.some((item) => item.disposition !== ContinuityDisposition.FORWARDED)) return false;

    return true;
  } catch {
    return false;
  }
}

export function inspectContinuityPackage(pkg = {}) {
  if (!pkg || pkg.schema_version !== CONTINUITY_OF_INTELLIGENCE_VERSION) {
    return Object.freeze({ valid: false });
  }
  return Object.freeze({
    valid: true,
    continuity_id: pkg.continuity_id || null,
    source_layer: pkg.source_layer || null,
    target_layer: pkg.target_layer || null,
    parent_continuity_id: pkg.parent_continuity_id || null,
    inherited_count: pkg.inherited?.length || 0,
    produced_count: pkg.produced?.length || 0,
    forwarded_count: pkg.forwarded?.length || 0,
    rule_count: pkg.rule_stack?.length || 0,
    role_id: pkg.role_context?.role_id || null,
    continuity_grants_no_action_authority: true,
    continuity_grants_no_governance_authority: true,
  });
}