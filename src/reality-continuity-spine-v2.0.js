import crypto from 'node:crypto';

export const REALITY_CONTINUITY_SPINE_VERSION = 'reality-continuity-spine-v2.0';
export const SPINE_STAGES = Object.freeze([
  'RAW_SIGNAL','TRANSFORMATION','OBSERVATION','SITUATION','WORK',
  'AUTHORITY','EXECUTION','VERIFICATION','OUTCOME','LEARNING','CAPABILITY',
]);

const text = (v) => typeof v === 'string' ? v.trim() : '';
const list = (v) => Array.isArray(v) ? v.filter(Boolean).map(String) : [];
function stable(v) {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(stable);
  return Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable(v[k])]));
}
function digest(v) { return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex'); }
function required(v, code) { if (!text(v)) throw new Error(code); return text(v); }

export function createContinuitySpine({ continuityRootId = null, worldlineId = 'reality:primary', seedStage = 'RAW_SIGNAL', subjectId } = {}) {
  const subject = required(subjectId, 'CONTINUITY_SUBJECT_REQUIRED');
  if (!SPINE_STAGES.includes(seedStage)) throw new Error('CONTINUITY_STAGE_INVALID');
  const root = text(continuityRootId) || 'cr:' + digest({ subject, worldlineId }).slice(0, 32);
  const worldline = required(worldlineId, 'WORLDLINE_ID_REQUIRED');
  return Object.freeze({
    continuity_root_id: root,
    worldline_id: worldline,
    subject_id: subject,
    current_stage: seedStage,
    spine_version: REALITY_CONTINUITY_SPINE_VERSION,
  });
}

export function appendContinuityNode({
  spine, stage, entityId, eventId = null, parentEventId = null, evidenceRefs = [],
  transformationReceiptId = null, effectiveTime = new Date().toISOString(),
  assertionTime = new Date().toISOString(), epistemicStatus = 'OBSERVED',
  payload = {}, priorLineageHash = null, provenance = {},
} = {}) {
  if (!spine?.continuity_root_id) throw new Error('CONTINUITY_SPINE_REQUIRED');
  if (!SPINE_STAGES.includes(stage)) throw new Error('CONTINUITY_STAGE_INVALID');
  const entity = required(entityId, 'CONTINUITY_ENTITY_ID_REQUIRED');
  const event = text(eventId) || 'continuity:' + stage.toLowerCase() + ':' + crypto.randomUUID();
  const parent = text(parentEventId) || null;
  const prior = text(priorLineageHash) || null;
  if (stage !== 'RAW_SIGNAL' && !parent) throw new Error('CONTINUITY_PARENT_REQUIRED');
  if (stage !== 'RAW_SIGNAL' && !prior) throw new Error('CONTINUITY_PRIOR_LINEAGE_HASH_REQUIRED');

  const lineageHash = digest({
    spine_version: REALITY_CONTINUITY_SPINE_VERSION,
    continuity_root_id: spine.continuity_root_id,
    worldline_id: spine.worldline_id,
    parent_event_id: parent,
    prior_lineage_hash: prior,
    stage, entity_id: entity, evidence_refs: list(evidenceRefs),
    transformation_receipt_id: text(transformationReceiptId) || null,
    effective_time: effectiveTime, assertion_time: assertionTime,
    epistemic_status: text(epistemicStatus) || 'OBSERVED', payload, provenance,
  });

  return Object.freeze({
    event_id: event, event_kind: stage, entity_type: stage.toLowerCase(), entity_id: entity,
    continuity_root_id: spine.continuity_root_id, worldline_id: spine.worldline_id,
    parent_event_id: parent, prior_lineage_hash: prior, lineage_hash: lineageHash,
    effective_time: effectiveTime, assertion_time: assertionTime,
    epistemic_status: text(epistemicStatus) || 'OBSERVED',
    evidence_refs: Object.freeze(list(evidenceRefs)),
    transformation_receipt_id: text(transformationReceiptId) || null,
    payload, provenance,
  });
}

export function advanceSpine(spine, node) {
  if (!spine?.continuity_root_id || !node?.continuity_root_id) throw new Error('CONTINUITY_SPINE_REQUIRED');
  if (spine.continuity_root_id !== node.continuity_root_id) throw new Error('CONTINUITY_ROOT_MISMATCH');
  if (spine.worldline_id !== node.worldline_id) throw new Error('WORLDLINE_MISMATCH');
  return Object.freeze({ ...spine, current_stage: node.event_kind, last_event_id: node.event_id, last_lineage_hash: node.lineage_hash });
}

export function validateContinuityChain(nodes = []) {
  const ordered = Array.isArray(nodes) ? nodes : [];
  if (!ordered.length) return Object.freeze({ valid: true, event_count: 0, broken_links: [] });
  const broken = [];
  for (let i = 0; i < ordered.length; i += 1) {
    const node = ordered[i];
    if (!node?.continuity_root_id || !node?.worldline_id || !node?.event_id || !node?.lineage_hash) {
      broken.push({ index: i, reason: 'NODE_IDENTITY_INCOMPLETE' }); continue;
    }
    if (i === 0) continue;
    const prev = ordered[i - 1];
    if (node.parent_event_id !== prev.event_id) broken.push({ index: i, reason: 'PARENT_EVENT_MISMATCH' });
    if (node.prior_lineage_hash !== prev.lineage_hash) broken.push({ index: i, reason: 'LINEAGE_HASH_MISMATCH' });
    if (node.continuity_root_id !== prev.continuity_root_id) broken.push({ index: i, reason: 'ROOT_MISMATCH' });
    if (node.worldline_id !== prev.worldline_id) broken.push({ index: i, reason: 'WORLDLINE_MISMATCH' });
  }
  return Object.freeze({ valid: broken.length === 0, event_count: ordered.length, broken_links: broken });
}
