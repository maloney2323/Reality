import assert from 'node:assert/strict';
import {
  CONTINUITY_SEAM_REPAIR_VERSION,
  continuityRootIdForParticle,
  buildContinuityRoot,
  assertNoSyntheticContinuityId,
  validateContinuityChild,
  assertConsequentialLineage,
} from '../src/reality-continuity-seam-repair-v0.1.js';

assert.equal(CONTINUITY_SEAM_REPAIR_VERSION, '0.1.0');

const particle = 'particle:admission:001';
const rootA = buildContinuityRoot({ particleId: particle });
const rootB = buildContinuityRoot({ particleId: particle });

assert.equal(rootA.continuity_event_id, rootB.continuity_event_id);
assert.equal(rootA.continuity_root_id, continuityRootIdForParticle(particle));
assert.equal(rootA.parent_continuity_event_id, null);
assert.equal(rootA.event_type, 'RAW_SIGNAL');

// Mutable admission fields must not change the root identity.
assert.equal(
  continuityRootIdForParticle(particle),
  continuityRootIdForParticle(particle),
  'retries must preserve root identity',
);

assert.throws(() => buildContinuityRoot({}), /PARTICLE_ID_REQUIRED/);
assert.throws(() => assertNoSyntheticContinuityId('connector-bridge-continuity'), /SYNTHETIC_CONTINUITY_ID_REJECTED/);
assert.throws(() => assertConsequentialLineage({ continuityEventId: 'e1' }), /CONTINUITY_ROOT_ID_REQUIRED/);
assert.throws(() => assertConsequentialLineage({ continuityEventId: 'e1', continuityRootId: 'r1' }), /PARENT_CONTINUITY_EVENT_ID_REQUIRED/);
assert.throws(() => assertConsequentialLineage({ continuityEventId: 'r1', continuityRootId: 'r1', parentContinuityEventId: 'e1' }), /ROOT_CANNOT_HAVE_PARENT/);

const child = {
  continuity_event_id: 'event:child:001',
  continuity_root_id: rootA.continuity_root_id,
  parent_continuity_event_id: rootA.continuity_event_id,
  worldline_id: rootA.worldline_id,
  event_type: 'SIGNAL',
};

assert.equal(validateContinuityChild({
  child,
  parent: rootA,
  expectedRootId: rootA.continuity_root_id,
  expectedWorldlineId: rootA.worldline_id,
  expectedParentTypes: ['RAW_SIGNAL'],
}), true);

for (const mutation of [
  { name: 'wrong root', patch: { continuity_root_id: 'other-root' }, error: /PARENT_WRONG_ROOT/ },
  { name: 'wrong worldline', patch: { worldline_id: 'other-worldline' }, error: /PARENT_WRONG_WORLDLINE/ },
  { name: 'wrong parent', patch: { parent_continuity_event_id: 'wrong-parent' }, error: /PARENT_MISMATCH/ },
]) {
  assert.throws(
    () => validateContinuityChild({
      child: { ...child, ...mutation.patch },
      parent: rootA,
      expectedRootId: rootA.continuity_root_id,
      expectedWorldlineId: rootA.worldline_id,
      expectedParentTypes: ['RAW_SIGNAL'],
    }),
    mutation.error,
    mutation.name,
  );
}

assert.throws(() => validateContinuityChild({
  child,
  parent: null,
  expectedRootId: rootA.continuity_root_id,
  expectedWorldlineId: rootA.worldline_id,
}), /CONTINUITY_PARENT_MISSING/);

const auth = { ...child, event_type: 'AUTHORITY', parent_continuity_event_id: child.continuity_event_id };
assert.equal(assertConsequentialLineage({
  continuityEventId: auth.continuity_event_id,
  continuityRootId: auth.continuity_root_id,
  parentContinuityEventId: auth.parent_continuity_event_id,
}), true);

console.log('Continuity Seam Repair v0.1: PASS');
