import crypto from 'node:crypto';

export const CONTINUITY_SEAM_REPAIR_VERSION = '0.1.0';
export const CONTINUITY_ROOT_NAMESPACE = 'reality:continuity-root:v0.1';

const LIFECYCLE = Object.freeze({
  ROOT: 'RAW_SIGNAL',
  SIGNAL: 'SIGNAL',
  EVIDENCE: 'EVIDENCE',
  RECONSTRUCTION: 'RECONSTRUCTION',
  WORK: 'WORK',
  AUTHORITY: 'AUTHORITY',
  EXECUTION: 'EXECUTION',
  TARGET_OBSERVATION: 'TARGET_OBSERVATION',
  VERIFICATION: 'VERIFICATION',
  OUTCOME: 'OUTCOME',
});

const SYNTHETIC_IDS = new Set([
  'connector-bridge-continuity',
  'unknown',
  'legacy-root',
]);

function required(value, code) {
  if (typeof value !== 'string' || value.length === 0) throw new Error(code);
  return value;
}

export function continuityRootIdForParticle(particleId) {
  const id = required(particleId, 'PARTICLE_ID_REQUIRED');
  return `cr:${crypto.createHash('sha256').update(`${CONTINUITY_ROOT_NAMESPACE}:${id}`).digest('hex')}`;
}

export function buildContinuityRoot({ particleId, sourceRefs = [] } = {}) {
  const id = required(particleId, 'PARTICLE_ID_REQUIRED');
  const continuityRootId = continuityRootIdForParticle(id);
  return Object.freeze({
    continuity_event_id: continuityRootId,
    continuity_root_id: continuityRootId,
    parent_continuity_event_id: null,
    worldline_id: continuityRootId,
    event_type: LIFECYCLE.ROOT,
    particle_id: id,
    source_refs: Object.freeze([id, ...sourceRefs.filter(Boolean)]),
  });
}

export function assertNoSyntheticContinuityId(value) {
  if (SYNTHETIC_IDS.has(value)) throw new Error('SYNTHETIC_CONTINUITY_ID_REJECTED');
  return value;
}

export function validateContinuityChild({
  child,
  parent,
  expectedRootId,
  expectedWorldlineId,
  expectedParentTypes = [],
} = {}) {
  if (!child || !parent) throw new Error('CONTINUITY_PARENT_MISSING');
  assertNoSyntheticContinuityId(child.continuity_event_id);
  assertNoSyntheticContinuityId(child.continuity_root_id);
  assertNoSyntheticContinuityId(parent.continuity_event_id);
  if (!expectedRootId || child.continuity_root_id !== expectedRootId || parent.continuity_root_id !== expectedRootId) {
    throw new Error('PARENT_WRONG_ROOT');
  }
  if (!expectedWorldlineId || child.worldline_id !== expectedWorldlineId || parent.worldline_id !== expectedWorldlineId) {
    throw new Error('PARENT_WRONG_WORLDLINE');
  }
  if (child.parent_continuity_event_id !== parent.continuity_event_id) {
    throw new Error('PARENT_MISMATCH');
  }
  if (expectedParentTypes.length && !expectedParentTypes.includes(parent.event_type)) {
    throw new Error('PARENT_WRONG_TYPE');
  }
  return true;
}

export function assertConsequentialLineage({ continuityEventId, continuityRootId, parentContinuityEventId } = {}) {
  if (!continuityEventId) throw new Error('CONTINUITY_EVENT_ID_REQUIRED');
  if (!continuityRootId) throw new Error('CONTINUITY_ROOT_ID_REQUIRED');
  assertNoSyntheticContinuityId(continuityEventId);
  assertNoSyntheticContinuityId(continuityRootId);
  if (continuityEventId === continuityRootId && parentContinuityEventId) {
    throw new Error('ROOT_CANNOT_HAVE_PARENT');
  }
  if (continuityEventId !== continuityRootId && !parentContinuityEventId) {
    throw new Error('PARENT_CONTINUITY_EVENT_ID_REQUIRED');
  }
  return true;
}

export const CONTINUITY_EVENT_TYPES = Object.freeze(LIFECYCLE);
