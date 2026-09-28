import { canonicalJson, sha256Hex } from '../action-gate/canonical.js';

export const SELF_INSPECTION_VERSION = 'reality-self-inspection-v0.1';
export const SELF_INSPECTION_AUTHORITY = 'OBSERVATION_AND_VERIFICATION_ONLY';

const ACTION_FORBIDDEN = Object.freeze({
  execution_authority: false,
  mutation_authority: false,
  merge_authority: false,
  deploy_authority: false,
});

function list(value) {
  return [...new Set((Array.isArray(value) ? value : []).filter(v => typeof v === 'string' && v.trim()).map(v => v.trim()))];
}

export async function digestTreeDelta({ previous_tree_hash = null, current_tree_hash, added = [], changed = [], removed = [] }) {
  if (!current_tree_hash) throw new Error('current_tree_hash is required');
  return sha256Hex(canonicalJson({
    schema: 'reality.self-inspection-delta.v0.1',
    previous_tree_hash,
    current_tree_hash,
    added: list(added).sort(),
    changed: list(changed).sort(),
    removed: list(removed).sort(),
  }));
}

export async function buildSelfInspectionWorkUnit({
  world_id,
  previous_tree_hash = null,
  current_tree_hash,
  added = [],
  changed = [],
  removed = [],
  inspection_record_ref,
  continuity_state_ref = null,
  evidence_refs = [],
  known = [],
  unknown = [],
  contradictions = [],
  verification_requirements = [],
  proposed_next_actions = [],
  observed_at,
}) {
  if (!world_id || !current_tree_hash || !inspection_record_ref || !observed_at) {
    throw new Error('world_id, current_tree_hash, inspection_record_ref and observed_at are required');
  }

  const normalizedDelta = {
    added: list(added).sort(),
    changed: list(changed).sort(),
    removed: list(removed).sort(),
  };
  const delta_digest = await digestTreeDelta({ previous_tree_hash, current_tree_hash, ...normalizedDelta });
  const idempotency_key = await sha256Hex(canonicalJson({
    world_id,
    previous_tree_hash,
    current_tree_hash,
    delta_digest,
  }));

  const hasDelta = normalizedDelta.added.length + normalizedDelta.changed.length + normalizedDelta.removed.length > 0;
  const status = hasDelta
    ? (verification_requirements.length ? 'VERIFICATION_REQUIRED' : 'REVIEW_REQUIRED')
    : 'CLOSED';

  return Object.freeze({
    work_unit_id: 'self-inspection:' + idempotency_key,
    schema_version: SELF_INSPECTION_VERSION,
    authority: SELF_INSPECTION_AUTHORITY,
    world_id,
    previous_tree_hash,
    current_tree_hash,
    delta_digest,
    delta: normalizedDelta,
    observed_at: new Date(observed_at).toISOString(),
    inspection_record_ref,
    continuity_state_ref,
    evidence_refs: list(evidence_refs),
    known: list(known),
    unknown: list(unknown),
    contradictions: list(contradictions),
    verification_requirements: list(verification_requirements),
    proposed_next_actions: list(proposed_next_actions),
    status,
    ...ACTION_FORBIDDEN,
    idempotency_key,
    created_at: new Date().toISOString(),
  });
}

export async function verifySelfInspectionWorkUnit(workUnit = {}) {
  try {
    if (workUnit.schema_version !== SELF_INSPECTION_VERSION) return { valid:false, code:'SCHEMA_MISMATCH' };
    if (workUnit.authority !== SELF_INSPECTION_AUTHORITY) return { valid:false, code:'AUTHORITY_MISMATCH' };
    if (workUnit.execution_authority !== false || workUnit.mutation_authority !== false || workUnit.merge_authority !== false || workUnit.deploy_authority !== false) {
      return { valid:false, code:'ACTION_AUTHORITY_PRESENT' };
    }
    if (!workUnit.current_tree_hash || !workUnit.delta_digest || !workUnit.idempotency_key) {
      return { valid:false, code:'IDENTITY_MISSING' };
    }

    const expectedDeltaDigest = await digestTreeDelta({
      previous_tree_hash: workUnit.previous_tree_hash ?? null,
      current_tree_hash: workUnit.current_tree_hash,
      ...(workUnit.delta || {}),
    });
    if (expectedDeltaDigest !== workUnit.delta_digest) return { valid:false, code:'DELTA_DIGEST_MISMATCH' };

    const expectedIdempotency = await sha256Hex(canonicalJson({
      world_id: workUnit.world_id,
      previous_tree_hash: workUnit.previous_tree_hash ?? null,
      current_tree_hash: workUnit.current_tree_hash,
      delta_digest: workUnit.delta_digest,
    }));
    if (expectedIdempotency !== workUnit.idempotency_key) return { valid:false, code:'IDEMPOTENCY_KEY_MISMATCH' };
    if (workUnit.work_unit_id !== 'self-inspection:' + expectedIdempotency) return { valid:false, code:'WORK_UNIT_ID_MISMATCH' };

    return { valid:true, code:'VALID', idempotent:true };
  } catch {
    return { valid:false, code:'VALIDATION_ERROR' };
  }
}

export function deriveSelfInspectionRequirements(delta = {}) {
  const requirements = [];
  if ((delta.added || []).some(p => p.includes('capability') || p.includes('authorization') || p.includes('action-gate'))) {
    requirements.push('REVIEW_CAPABILITY_AND_AUTHORIZATION_BOUNDARIES');
  }
  if ((delta.changed || []).some(p => p.includes('functions/') || p.includes('reality-core/'))) {
    requirements.push('RUN_RELEVANT_FUNCTIONAL_AND_REGRESSION_TESTS');
  }
  if ((delta.changed || []).some(p => p.includes('generated-code-tree-hash') || p.includes('generated-code-index'))) {
    requirements.push('VERIFY_SELF_MODEL_ARTIFACTS_MATCH_OBSERVED_TREE');
  }
  if ((delta.added || []).some(p => p.includes('executor') || p.includes('write-gate') || p.includes('github'))) {
    requirements.push('REVIEW_EXTERNAL_EXECUTION_BOUNDARY');
  }
  return [...new Set(requirements)];
}
