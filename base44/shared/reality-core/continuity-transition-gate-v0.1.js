// Reality Continuity Transition Gate v0.1
// Constitutional admissibility gate for State(n) -> State(n+1).
// Passing never grants truth, authority, execution, or governance permission.

import { canonicalJson, sha256Hex } from '../action-gate/canonical.js';
import { verifyContinuityPackage } from './continuity-of-intelligence-v0.1.js';
import { buildContinuityDebtManifest, verifyContinuityDebtManifest, assertDebtContinuity } from './continuity-integrity-v0.1.js';
import { createContinuityHalt, HaltReason } from './governed-continuity-halt-protocol-v0.1.js';

export const CONTINUITY_TRANSITION_GATE_VERSION = 'reality-continuity-transition-gate-v0.1';
export const CONTINUITY_TRANSITION_GATE_AUTHORITY = 'CONSTITUTIONAL_TRANSITION_ADMISSIBILITY_ONLY';

const nonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;
const itemMap = (pkg) => new Map([
  ...(pkg?.inherited || []), ...(pkg?.produced || []), ...(pkg?.forwarded || []),
].map((item) => [item.item_id, item]));

function preservationViolations(previous, received) {
  const out = []; const prior = itemMap(previous); const next = itemMap(received);
  for (const [id, item] of prior) {
    const candidate = next.get(id);
    if (!candidate) out.push({ code: 'CONTINUITY_ITEM_DROPPED', item_id: id });
    else if (candidate.epistemic_status !== item.epistemic_status) out.push({
      code: 'EPISTEMIC_STATUS_CHANGED_WITHOUT_GATE', item_id: id,
      previous_status: item.epistemic_status, received_status: candidate.epistemic_status,
    });
  }
  return out;
}

function roleViolations(previous, received) {
  return canonicalJson(previous?.role_context || null) === canonicalJson(received?.role_context || null)
    ? [] : [{ code: 'ROLE_CONTEXT_CHANGED' }];
}

function ruleViolations(previous, received) {
  const next = new Map((received?.rule_stack || []).map((r) => [r.rule_id, r])); const out = [];
  for (const rule of previous?.rule_stack || []) {
    if (rule.status !== 'ACTIVE') continue;
    const candidate = next.get(rule.rule_id);
    if (!candidate) out.push({ code: 'ACTIVE_RULE_DROPPED', rule_id: rule.rule_id });
    else if (candidate.status === 'ACTIVE' && canonicalJson(candidate) !== canonicalJson(rule)) {
      out.push({ code: 'ACTIVE_RULE_MUTATED', rule_id: rule.rule_id });
    }
  }
  return out;
}

function contradictionViolations(previous, received) {
  const prior = new Set([...(previous?.inherited || []), ...(previous?.forwarded || [])]
    .filter((i) => i.kind === 'CONTRADICTION').map((i) => i.item_id));
  const next = new Set([...(received?.inherited || []), ...(received?.forwarded || [])].map((i) => i.item_id));
  return [...prior].filter((id) => !next.has(id)).map((item_id) => ({ code: 'CONTRADICTION_DROPPED', item_id }));
}

async function debtViolations(previousDebt, receivedDebt) {
  const source = Array.isArray(previousDebt) ? previousDebt : [];
  const handoff = Array.isArray(receivedDebt) ? receivedDebt : [];
  const manifest = await buildContinuityDebtManifest({
    source_snapshot_id: 'continuity-transition-source', active_epistemic_debt: source,
  });
  if (!(await verifyContinuityDebtManifest(manifest))) return [{ code: 'DEBT_MANIFEST_INVALID' }];
  try {
    await assertDebtContinuity({ source_debts: source, handoff_debts: handoff, manifest });
    return [];
  } catch (error) {
    return [{ code: 'EPISTEMIC_DEBT_NOT_PRESERVED', detail: error.message }];
  }
}

export function serializeContinuityPackage(continuityPackage = {}) {
  if (!continuityPackage || typeof continuityPackage !== 'object' || !nonEmpty(continuityPackage.continuity_digest)) {
    throw new Error('continuity package with continuity_digest is required');
  }
  const { continuity_digest: _digest, ...body } = continuityPackage;
  return canonicalJson(body);
}

export async function computeConsumedContinuityDigest(serializedBytes) {
  if (typeof serializedBytes !== 'string') throw new Error('serializedBytes must be exact consumed package bytes');
  return sha256Hex(serializedBytes);
}

export async function verifyConsumptionEquivalence({ continuityPackage, serializedBytes, consumption_digest } = {}) {
  if (!(await verifyContinuityPackage(continuityPackage)) || !nonEmpty(consumption_digest)) return false;
  const consumedDigest = await computeConsumedContinuityDigest(serializedBytes);
  if (consumedDigest !== consumption_digest) return false;
  // The bytes actually consumed must be the canonical package body whose digest
  // the sender attested. The digest field itself is excluded to avoid recursive hashing.
  return consumedDigest === continuityPackage.continuity_digest;
}

export async function verifyContinuityTransition({
  previous_package, received_package, previous_epistemic_debt = [], received_epistemic_debt = [],
  serialized_received_bytes, consumption_digest, sender_continuity_digest = null,
  transition_id, source_state_id, source_state_digest, proposed_state_id, proposed_state_digest,
  handoff_id, epoch_id, lineage_root, created_at,
} = {}) {
  const violations = [];
  const checks = {
    previous_package_valid: await verifyContinuityPackage(previous_package),
    received_package_valid: await verifyContinuityPackage(received_package),
    serialization_integrity: false, lineage_integrity: false, epistemic_preservation: false,
    contradiction_preservation: false, role_continuity: false, rule_continuity: false, debt_continuity: false,
  };
  if (!checks.previous_package_valid) violations.push({ code: 'PREVIOUS_PACKAGE_INVALID' });
  if (!checks.received_package_valid) violations.push({ code: 'RECEIVED_PACKAGE_INVALID' });

  if (checks.received_package_valid && typeof serialized_received_bytes === 'string') {
    checks.serialization_integrity = await verifyConsumptionEquivalence({
      continuityPackage: received_package, serializedBytes: serialized_received_bytes, consumption_digest,
    });
    if (!checks.serialization_integrity) violations.push({ code: 'CONSUMPTION_DIGEST_MISMATCH' });
  } else violations.push({ code: 'CONSUMED_BYTES_OR_DIGEST_MISSING' });

  if (checks.previous_package_valid && checks.received_package_valid) {
    checks.lineage_integrity =
      received_package.parent_continuity_id === previous_package.continuity_id &&
      received_package.epoch_id === previous_package.epoch_id &&
      received_package.lineage_root === previous_package.lineage_root &&
      received_package.source_layer === previous_package.target_layer;
    if (!checks.lineage_integrity) violations.push({ code: 'LINEAGE_MISMATCH' });

    const status = preservationViolations(previous_package, received_package);
    checks.epistemic_preservation = status.length === 0; violations.push(...status);
    const contradictions = contradictionViolations(previous_package, received_package);
    checks.contradiction_preservation = contradictions.length === 0; violations.push(...contradictions);
    const roles = roleViolations(previous_package, received_package);
    checks.role_continuity = roles.length === 0; violations.push(...roles);
    const rules = ruleViolations(previous_package, received_package);
    checks.rule_continuity = rules.length === 0; violations.push(...rules);
  }

  const debt = await debtViolations(previous_epistemic_debt, received_epistemic_debt);
  checks.debt_continuity = debt.length === 0; violations.push(...debt);

  if (nonEmpty(sender_continuity_digest) && previous_package?.continuity_digest !== sender_continuity_digest) {
    violations.push({ code: 'SENDER_DIGEST_MISMATCH' });
  }

  const pass = violations.length === 0; let halt = null;
  if (!pass) {
    const reason = violations.some((v) => v.code.includes('EPISTEMIC') || v.code.includes('CONTRADICTION'))
      ? HaltReason.EPISTEMIC_VIOLATION : HaltReason.CONTINUITY_FAILURE;
    halt = createContinuityHalt({
      halt_id: 'halt:' + (transition_id || crypto.randomUUID()),
      transition_id: transition_id || 'unknown-transition',
      source_state_id: source_state_id || 'unknown-state',
      source_state_digest: source_state_digest || 'unknown-digest',
      proposed_state_id: proposed_state_id || null, proposed_state_digest: proposed_state_digest || null,
      violation_code: reason, violation_details: violations.map((v) => v.code).join(', '),
      missing_basis_refs: violations.filter((v) => v.code.includes('MISSING')).map((v) => v.code),
      contradiction_refs: violations.filter((v) => v.code.includes('CONTRADICTION')).map((v) => v.item_id || v.code),
      epistemic_debt_refs: violations.filter((v) => v.code.includes('DEBT')).map((v) => v.code),
      handoff_id: handoff_id || 'unknown-handoff',
      epoch_id: epoch_id || received_package?.epoch_id || previous_package?.epoch_id || 'unknown-epoch',
      lineage_root: lineage_root || received_package?.lineage_root || previous_package?.lineage_root || 'unknown-lineage',
      created_at: created_at || new Date().toISOString(),
    });
  }

  return Object.freeze({
    schema_version: CONTINUITY_TRANSITION_GATE_VERSION, authority: CONTINUITY_TRANSITION_GATE_AUTHORITY,
    disposition: pass ? 'PASS' : 'HALT', checks: Object.freeze(checks),
    violations: Object.freeze(violations), halt,
    state_advanced: false, authority_created: false, execution_authorized: false, governance_changed: false,
  });
}

export async function assertContinuityTransition(args = {}) {
  const result = await verifyContinuityTransition(args);
  if (result.disposition !== 'PASS') throw new Error(
    'Reality continuity transition rejected: ' + result.violations.map((v) => v.code).join(', '),
  );
  return result;
}