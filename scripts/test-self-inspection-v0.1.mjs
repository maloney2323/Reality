import assert from 'node:assert/strict';
import { buildSelfInspectionWorkUnit, verifySelfInspectionWorkUnit, deriveSelfInspectionRequirements } from '../base44/shared/reality-core/self-inspection-v0.1.js';

const input = {
  world_id:'reality-dev',
  previous_tree_hash:'prev',
  current_tree_hash:'curr',
  added:['base44/shared/reality-core/capability-manifest-v0.1.js'],
  changed:['base44/functions/personal-reality-chat/entry.ts'],
  removed:[],
  inspection_record_ref:'inspection:1',
  evidence_refs:['tree:curr'],
  known:['structural delta observed'],
  unknown:['semantic correctness'],
  contradictions:[],
  verification_requirements:['RUN_RELEVANT_FUNCTIONAL_AND_REGRESSION_TESTS'],
  proposed_next_actions:['inspect affected modules'],
  observed_at:'2026-09-27T16:00:00.000Z'
};

const a = await buildSelfInspectionWorkUnit(input);
const b = await buildSelfInspectionWorkUnit(input);
assert.equal(a.work_unit_id, b.work_unit_id);
assert.equal(a.idempotency_key, b.idempotency_key);
assert.equal(a.delta_digest, b.delta_digest);
assert.equal(a.execution_authority, false);
assert.equal(a.mutation_authority, false);
assert.equal((await verifySelfInspectionWorkUnit(a)).valid, true);

const tampered = {...a, current_tree_hash:'tampered'};
assert.equal((await verifySelfInspectionWorkUnit(tampered)).valid, false);

const promoted = {...a, mutation_authority:true};
assert.equal((await verifySelfInspectionWorkUnit(promoted)).code, 'ACTION_AUTHORITY_PRESENT');

const reqs = deriveSelfInspectionRequirements({
  added:['base44/shared/reality-core/capability-manifest-v0.1.js'],
  changed:['base44/functions/personal-reality-chat/entry.ts','base44/shared/reality-core/reality-executor-v0.1.js'],
  removed:[]
});
assert.ok(reqs.includes('REVIEW_CAPABILITY_AND_AUTHORIZATION_BOUNDARIES'));
assert.ok(reqs.includes('RUN_RELEVANT_FUNCTIONAL_AND_REGRESSION_TESTS'));

const noDelta = await buildSelfInspectionWorkUnit({
  ...input,
  added:[], changed:[], removed:[],
  verification_requirements:[],
});
assert.equal(noDelta.status,'CLOSED');

console.log('G2.5 self-inspection contract suite: PASS');
