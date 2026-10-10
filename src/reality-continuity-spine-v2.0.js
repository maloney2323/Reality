import crypto from 'node:crypto';

export const REALITY_CONTINUITY_SPINE_VERSION = 'reality-continuity-spine-v2.1';
export const SPINE_STAGES = Object.freeze([
  'RAW_SIGNAL','TRANSFORMATION','OBSERVATION','SITUATION','WORK',
  'AUTHORITY','EXECUTION','VERIFICATION','OUTCOME','LEARNING','CAPABILITY',
]);

const text = (v) => typeof v === 'string' ? v.trim() : '';
const list = (v) => Array.isArray(v) ? v.filter(Boolean).map(String) : [];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function stable(v) {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(stable);
  return Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable(v[k])]));
}
function digest(v) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
}
function canonicalTimestamp(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('CONTINUITY_TIMESTAMP_INVALID');
  return date.toISOString();
}
function computeLegacyLineageHash(fields) {
  return digest({
    spine_version: fields.spineVersion,
    continuity_root_id: fields.continuityRootId,
    worldline_id: fields.worldlineId,
    parent_event_id: fields.parentEventId,
    prior_lineage_hash: fields.priorLineageHash,
    stage: fields.stage,
    entity_id: fields.entityId,
    evidence_refs: list(fields.evidenceRefs),
    transformation_receipt_id: text(fields.transformationReceiptId) || null,
    effective_time: fields.effectiveTime,
    assertion_time: fields.assertionTime,
    epistemic_status: text(fields.epistemicStatus) || 'OBSERVED',
    payload: fields.payload,
    provenance: fields.provenance,
  });
}
function required(v, code) {
  if (!text(v)) throw new Error(code);
  return text(v);
}
function uuidFromText(value) {
  const source = required(value, 'UUID_SOURCE_REQUIRED');
  if (UUID_RE.test(source)) return source.toLowerCase();
  const bytes = crypto.createHash('sha256').update(source).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Buffer.from(bytes).toString('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

export function computeContinuityLineageHash({
  spineVersion = REALITY_CONTINUITY_SPINE_VERSION,
  continuityRootId, worldlineId, parentEventId = null, priorLineageHash = null,
  stage, entityId, evidenceRefs = [], transformationReceiptId = null,
  effectiveTime, assertionTime, epistemicStatus = 'OBSERVED', payload = {}, provenance = {},
} = {}) {
  return digest({
    spine_version: spineVersion,
    continuity_root_id: continuityRootId,
    worldline_id: worldlineId,
    parent_event_id: parentEventId,
    prior_lineage_hash: priorLineageHash,
    stage,
    entity_id: entityId,
    evidence_refs: list(evidenceRefs),
    transformation_receipt_id: text(transformationReceiptId) || null,
    effective_time: canonicalTimestamp(effectiveTime),
    assertion_time: canonicalTimestamp(assertionTime),
    epistemic_status: text(epistemicStatus) || 'OBSERVED',
    payload,
    provenance,
  });
}

export function createContinuitySpine({
  continuityRootId = null,
  worldlineId = 'reality:primary',
  seedStage = 'RAW_SIGNAL',
  subjectId,
} = {}) {
  const subject = required(subjectId, 'CONTINUITY_SUBJECT_REQUIRED');
  if (!SPINE_STAGES.includes(seedStage)) throw new Error('CONTINUITY_STAGE_INVALID');
  const sourceRoot = text(continuityRootId) || `subject:${subject}|worldline:${worldlineId}`;
  const root = uuidFromText(sourceRoot);
  const worldline = uuidFromText(worldlineId);
  return Object.freeze({
    continuity_root_id: root,
    continuity_root_source: sourceRoot,
    worldline_id: worldline,
    worldline_source: worldlineId,
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
  const entitySource = required(entityId, 'CONTINUITY_ENTITY_ID_REQUIRED');
  const entity = uuidFromText(entitySource);
  const eventSource = text(eventId) || `${spine.continuity_root_id}|${stage}|${entitySource}`;
  const event = uuidFromText(eventSource);
  const parent = text(parentEventId) ? uuidFromText(parentEventId) : null;
  const prior = text(priorLineageHash) || null;

  if (stage !== 'RAW_SIGNAL' && !parent) throw new Error('CONTINUITY_PARENT_REQUIRED');
  if (stage !== 'RAW_SIGNAL' && !prior) throw new Error('CONTINUITY_PRIOR_LINEAGE_HASH_REQUIRED');

  const canonicalEffectiveTime = canonicalTimestamp(effectiveTime);
  const canonicalAssertionTime = canonicalTimestamp(assertionTime);
  const lineageHash = computeContinuityLineageHash({
    continuityRootId: spine.continuity_root_id,
    worldlineId: spine.worldline_id,
    parentEventId: parent,
    priorLineageHash: prior,
    stage,
    entityId: entity,
    evidenceRefs,
    transformationReceiptId,
    effectiveTime: canonicalEffectiveTime,
    assertionTime: canonicalAssertionTime,
    epistemicStatus,
    payload,
    provenance,
  });

  return Object.freeze({
    event_id: event,
    event_id_source: eventSource,
    event_kind: stage,
    entity_type: stage.toLowerCase(),
    entity_id: entity,
    entity_id_source: entitySource,
    continuity_root_id: spine.continuity_root_id,
    continuity_root_source: spine.continuity_root_source,
    worldline_id: spine.worldline_id,
    worldline_source: spine.worldline_source,
    parent_event_id: parent,
    prior_lineage_hash: prior,
    lineage_hash: lineageHash,
    effective_time: canonicalEffectiveTime,
    assertion_time: canonicalAssertionTime,
    epistemic_status: text(epistemicStatus) || 'OBSERVED',
    evidence_refs: Object.freeze(list(evidenceRefs)),
    transformation_receipt_id: text(transformationReceiptId) || null,
    payload,
    provenance,
  });
}

export function advanceSpine(spine, node) {
  if (!spine?.continuity_root_id || !node?.continuity_root_id) throw new Error('CONTINUITY_SPINE_REQUIRED');
  if (spine.continuity_root_id !== node.continuity_root_id) throw new Error('CONTINUITY_ROOT_MISMATCH');
  if (spine.worldline_id !== node.worldline_id) throw new Error('WORLDLINE_MISMATCH');
  return Object.freeze({
    ...spine,
    current_stage: node.event_kind,
    last_event_id: node.event_id,
    last_lineage_hash: node.lineage_hash,
  });
}

export function validateContinuityChain(nodes = []) {
  const ordered = Array.isArray(nodes) ? nodes : [];
  if (!ordered.length) return Object.freeze({ valid: true, event_count: 0, broken_links: [] });
  const broken = [];
  for (let i = 0; i < ordered.length; i += 1) {
    const node = ordered[i];
    if (!node?.continuity_root_id || !node?.worldline_id || !node?.event_id || !node?.lineage_hash) {
      broken.push({ index: i, reason: 'NODE_IDENTITY_INCOMPLETE' });
      continue;
    }
    if (!SPINE_STAGES.includes(node.event_kind)) {
      broken.push({ index: i, reason: 'CONTINUITY_STAGE_INVALID' });
    }

    const persistedContinuity = node?.provenance?.continuity_spine || null;
    const priorLineageHash = node.prior_lineage_hash ?? persistedContinuity?.prior_lineage_hash ?? null;
    const transformationReceiptId = node.transformation_receipt_id
      ?? persistedContinuity?.transformation_receipt_id
      ?? null;
    // The persistence adapter adds this envelope after the event hash is minted.
    // Exclude that envelope when recomputing the hash, while retaining the version
    // it records so older spine versions can be checked using their own contract.
    const provenance = node.provenance && typeof node.provenance === 'object'
      ? Object.fromEntries(Object.entries(node.provenance).filter(([key]) => key !== 'continuity_spine'))
      : {};
    const hashFields = {
      spineVersion: persistedContinuity?.version || REALITY_CONTINUITY_SPINE_VERSION,
      continuityRootId: node.continuity_root_id,
      worldlineId: node.worldline_id,
      parentEventId: node.parent_event_id || null,
      priorLineageHash,
      stage: node.event_kind,
      entityId: node.entity_id,
      evidenceRefs: node.evidence_refs || [],
      transformationReceiptId,
      effectiveTime: node.effective_time,
      assertionTime: node.assertion_time,
      epistemicStatus: node.epistemic_status,
      payload: node.payload ?? {},
      provenance,
    };
    const expectedHash = computeContinuityLineageHash(hashFields);
    // v2.1 events were hashed from the caller's original timestamp strings. Keep
    // a read-only compatibility check for that representation while canonical
    // UTC timestamps are used for all newly minted events.
    const legacyHash = persistedContinuity?.version === 'reality-continuity-spine-v2.1'
      ? computeLegacyLineageHash(hashFields)
      : null;
    if (expectedHash !== node.lineage_hash && legacyHash !== node.lineage_hash) {
      broken.push({ index: i, reason: 'LINEAGE_HASH_CONTENT_MISMATCH' });
    }

    if (i === 0) {
      if (node.parent_event_id != null) broken.push({ index: i, reason: 'ROOT_PARENT_MUST_BE_NULL' });
      if (priorLineageHash != null) broken.push({ index: i, reason: 'ROOT_PRIOR_HASH_MUST_BE_NULL' });
      continue;
    }
    const prev = ordered[i - 1];
    if (node.parent_event_id !== prev.event_id) broken.push({ index: i, reason: 'PARENT_EVENT_MISMATCH' });
    if (priorLineageHash !== prev.lineage_hash) broken.push({ index: i, reason: 'LINEAGE_HASH_MISMATCH' });
    if (node.continuity_root_id !== prev.continuity_root_id) broken.push({ index: i, reason: 'ROOT_MISMATCH' });
    if (node.worldline_id !== prev.worldline_id) broken.push({ index: i, reason: 'WORLDLINE_MISMATCH' });
  }
  return Object.freeze({
    valid: broken.length === 0,
    event_count: ordered.length,
    broken_links: Object.freeze(broken.map((item) => Object.freeze(item))),
  });
}


// Legacy stage names are classified for diagnostics only. Classification never
// promotes the event into the current verified contract or makes the chain resumable.
export function classifyContinuityHistoryDisposition(nodes = [], validation = null) {
  const rows = Array.isArray(nodes) ? nodes : [];
  const legacyStage = rows.find((node) => node?.event_kind === 'CAPABILITY_VERIFIED');
  if (legacyStage) {
    return Object.freeze({
      status: 'LEGACY_UNVERIFIABLE',
      eligible_for_resume: false,
      reason: 'LEGACY_STAGE_OUTSIDE_CURRENT_CONTRACT',
      event_id: legacyStage.event_id || null,
      event_kind: legacyStage.event_kind,
      event_count: rows.length,
      broken_links: Object.freeze([...(validation?.broken_links || [])]),
    });
  }
  const result = validation || validateContinuityChain(rows);
  return Object.freeze({
    status: result.valid ? 'VERIFIED' : 'INVALID',
    eligible_for_resume: result.valid,
    reason: result.valid ? null : 'CONTINUITY_HISTORY_INVALID',
    event_count: result.event_count,
    broken_links: Object.freeze([...(result.broken_links || [])]),
  });
}
