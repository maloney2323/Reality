import { canonicalJson, sha256Hex } from '../action-gate/canonical.js';
import { verifyEpistemicDebt } from './operating-point-epistemic-debt-v0.1.js';

export const CONTINUITY_INTEGRITY_VERSION = 'reality-continuity-integrity-v0.1';
export const CONTINUITY_INTEGRITY_AUTHORITY = 'CONTINUITY_COMPLETENESS_CHECK_ONLY';

function fail(message) { throw new Error('Reality continuity integrity invalid: ' + message); }
function nonEmpty(v) { return typeof v === 'string' && v.trim().length > 0; }
function ids(debts) {
  if (!Array.isArray(debts)) fail('active debt set must be an array');
  const out = debts.map((d) => {
    if (!d || !nonEmpty(d.debt_id)) fail('debt_id required');
    return d.debt_id.trim();
  });
  if (new Set(out).size !== out.length) fail('duplicate debt_id');
  return out.sort();
}
async function digest(value) { return sha256Hex(canonicalJson(value)); }

export async function buildContinuityDebtManifest({ source_snapshot_id, active_epistemic_debt = [], omitted_debt_ids = [], omission_reasons = {} } = {}) {
  if (!nonEmpty(source_snapshot_id)) fail('source_snapshot_id required');
  for (const debt of active_epistemic_debt) {
    if (!(await verifyEpistemicDebt(debt))) fail('active debt must be verified');
    if (debt.status !== 'OPEN') fail('active debt must be OPEN');
  }
  const source_ids = ids(active_epistemic_debt);
  const omitted = [...new Set((omitted_debt_ids || []).filter(nonEmpty).map((x) => x.trim()))].sort();
  for (const id of omitted) {
    if (!source_ids.includes(id)) fail('omitted debt id is not in source active debt set');
    if (!nonEmpty(omission_reasons[id])) fail('every omitted debt requires an explicit reason');
  }
  const carried_ids = source_ids.filter((id) => !omitted.includes(id));
  const body = {
    schema_version: CONTINUITY_INTEGRITY_VERSION,
    authority: CONTINUITY_INTEGRITY_AUTHORITY,
    source_snapshot_id: source_snapshot_id.trim(),
    source_active_debt_ids: source_ids,
    carried_debt_ids: carried_ids,
    omitted_debt_ids: omitted,
    omission_reasons: Object.fromEntries(omitted.map((id) => [id, omission_reasons[id].trim()])),
    completeness: omitted.length === 0 ? 'COMPLETE' : 'EXPLICIT_OMISSIONS',
    action_authorized: false,
    governance_change_authorized: false,
    canonical_digest: null,
  };
  const { canonical_digest: _ignored, ...digestBody } = body;
  return Object.freeze({ ...body, canonical_digest: await digest(digestBody) });
}

export async function verifyContinuityDebtManifest(manifest = {}) {
  try {
    if (manifest.schema_version !== CONTINUITY_INTEGRITY_VERSION || manifest.authority !== CONTINUITY_INTEGRITY_AUTHORITY) return false;
    if (!Array.isArray(manifest.source_active_debt_ids) || !Array.isArray(manifest.carried_debt_ids) || !Array.isArray(manifest.omitted_debt_ids)) return false;
    const expectedCarried = manifest.source_active_debt_ids.filter((id) => !manifest.omitted_debt_ids.includes(id)).sort();
    if (canonicalJson(expectedCarried) !== canonicalJson([...manifest.carried_debt_ids].sort())) return false;
    if (manifest.omitted_debt_ids.some((id) => !manifest.source_active_debt_ids.includes(id))) return false;
    if (manifest.omitted_debt_ids.some((id) => !nonEmpty(manifest.omission_reasons?.[id]))) return false;
    if (manifest.action_authorized !== false || manifest.governance_change_authorized !== false) return false;
    const { canonical_digest, ...body } = manifest;
    return nonEmpty(canonical_digest) && (await digest(body)) === canonical_digest;
  } catch { return false; }
}

export async function assertDebtContinuity({ source_debts = [], handoff_debts = [], manifest } = {}) {
  if (!(await verifyContinuityDebtManifest(manifest))) fail('invalid continuity debt manifest');
  const source = ids(source_debts);
  const handoff = ids(handoff_debts);
  if (canonicalJson(source) !== canonicalJson(manifest.source_active_debt_ids)) fail('source debt set does not match manifest');
  const expected = manifest.carried_debt_ids;
  if (canonicalJson(handoff) !== canonicalJson(expected)) fail('handoff debt set is incomplete or altered');
  for (const debt of handoff_debts) {
    if (!(await verifyEpistemicDebt(debt))) fail('handoff contains invalid debt');
    if (debt.status !== 'OPEN') fail('handoff debt is not OPEN');
  }
  return Object.freeze({ status: 'PASS', source_count: source.length, carried_count: handoff.length, omitted_count: manifest.omitted_debt_ids.length, action_authorized: false, governance_change_authorized: false });
}