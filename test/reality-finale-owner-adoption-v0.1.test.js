import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createContinuitySpine,appendContinuityNode}
 from '../src/reality-continuity-spine-v2.0.js';
import {
 adoptControlledFinaleIntoOwnerContinuity,
 FINALE_OWNER_ADOPTION_INTENT,
} from '../src/reality-finale-owner-adoption-v0.1.js';
const owner='11111111-1111-4111-8111-111111111111';
const conversation='22222222-2222-4222-8222-222222222222';
const revision='33333333-3333-4333-8333-333333333333';
const goalId='44444444-4444-4444-8444-444444444444';
const source='c0f0fc86cd2ed11fe7e8c01484ebaf1b698143028c9c81ff323c6b7f8cd857ae';
const work='work:8f71513a2c1955569e84c0e9af0962ec';
function fixture(){
 const session={user_id:owner,config:{url:'https://owner-db.example'}};
 const env={VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
  REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'owner-test'};
 const spine=createContinuitySpine({
  continuityRootId:'owner-root:'+owner,worldlineId:'owner-world:'+conversation,subjectId:owner,
 });
 const start=appendContinuityNode({spine,stage:'RAW_SIGNAL',entityId:'test:initial',
  eventId:'55555555-5555-4555-8555-555555555555',
  effectiveTime:'2026-10-27T00:00:00.000Z',assertionTime:'2026-10-27T00:00:00.000Z',
  payload:{goal:'test'},epistemicStatus:'OBSERVED'});
 const storedRepresentation=e=>({...e,provenance:{...e.provenance,
  continuity_spine:{version:'reality-continuity-spine-v2.1',
   prior_lineage_hash:e.prior_lineage_hash||null,
   transformation_receipt_id:e.transformation_receipt_id||null}},
 });
 const history=[storedRepresentation(start)];
 const stored=[];
 const readGoal=async()=>({
  principal_id:owner,conversation_id:conversation,
  scope:{root:spine.continuity_root_source,worldline:spine.worldline_source,
   world:'world:owner-test'},
  state:{continuity_root_id:spine.continuity_root_id,world_id:'world:owner-test',
   active_goal_id:goalId,active_goal:{goal_id:goalId,title:'Complete Reality controlled construction estimate self-repair finale',user_confirmed:true,
    status:'ACTIVE',last_transition_receipt_id:revision}},
 });
 const verifyEvidence=async()=>({
  state:'REVALIDATION_REQUIRED_BASE_MOVED',
  original_work_id:work,
  source_sha256:source,
  test_kind:'CONTROLLED_NONCUSTOMER',
  frozen_cases_passed:6,additional_holdout_cases_passed:21,
  owner_bound_warrant_issued:false,installation_authorized:false,
  controlled_job_completed:false,
  source_path:'src/reality-extensions/construction-estimate-approval-gate.mjs',
  github_pr_number:152,
  independent_run_ids:[40715822942,40716279333,40717353722],
  target_base_moved_since_review:true,
 });
 const createPersistence=()=>({
  reconstruct:async()=>history,
  appendEvent:async e=>{const copy=storedRepresentation(e);
   history.push(copy);stored.push(copy);},
 });
 const args={session,conversationId:conversation,confirmation:FINALE_OWNER_ADOPTION_INTENT,
  env,readGoal,createPersistence,verifyEvidence,
  resolveDb:()=>({strictSecrets:true,secretKey:'secret',url:session.config.url,
   project:'owner-test'})};
 return {args,history,stored};
}
test('explicit owner adopts historical evidence into append-only owner Continuity',async()=>{
 const x=fixture();
 const one=await adoptControlledFinaleIntoOwnerContinuity(x.args);
 assert.equal(one.status,'HISTORICAL_CONTROLLED_FINALE_OWNER_ADOPTED');
 assert.equal(one.independently_reobserved,true);
 assert.equal(one.already_recorded,false);
 assert.equal(one.warrant_issued,false);
 assert.equal(one.installation_authorized,false);
 assert.equal(one.original_job_completed,false);
 assert.equal(x.stored.length,1);
 const e=x.stored[0];
 assert.equal(e.entity_type,'personal_controlled_finale_owner_adoption');
 assert.equal(e.event_kind,'WORK');
 assert.equal(e.payload.evidence_role,'HISTORICAL_CONTROLLED_FINALE_ADOPTED_BY_OWNER');
 assert.equal(e.payload.owner_sandbox_receipt_persisted,false);
 assert.equal(e.payload.owner_bound_warrant_issued,false);
 assert.equal(e.payload.original_job_completed,false);
 assert.equal(e.provenance.principal_id,owner);
 assert.equal(e.parent_event_id,x.history[0].event_id);
});
test('one-time adopted proof reads back without appending a duplicate',async()=>{
 const x=fixture();
 await adoptControlledFinaleIntoOwnerContinuity(x.args);
 const again=await adoptControlledFinaleIntoOwnerContinuity(x.args);
 assert.equal(again.already_recorded,true);
 assert.equal(x.stored.length,1);
});
test('generic approval phrase does NOT adopt a pilot',async()=>{
 const x=fixture();
 await assert.rejects(adoptControlledFinaleIntoOwnerContinuity({
  ...x.args,confirmation:'APPROVE_ANYTHING',
 }),/FINALE_OWNER_EXACT_ADOPTION_REQUIRED/);
 assert.equal(x.stored.length,0);
});
test('unconfirmed owner goal cannot acquire work',async()=>{
 const x=fixture();
 const goal=await x.args.readGoal();
 goal.state.active_goal.user_confirmed=false;
 await assert.rejects(adoptControlledFinaleIntoOwnerContinuity({
  ...x.args,readGoal:async()=>goal,
 }),/FINALE_OWNER_FRESH_CONFIRMED_GOAL_REQUIRED/);
 assert.equal(x.stored.length,0);
});
test('model-generated candidate that changed is not adopted',async()=>{
 const x=fixture();const proof=await x.args.verifyEvidence();
 proof.source_sha256='0'.repeat(64);
 await assert.rejects(adoptControlledFinaleIntoOwnerContinuity({
  ...x.args,verifyEvidence:async()=>proof,
 }),/FINALE_OWNER_INDEPENDENT_HISTORICAL_EVIDENCE_MISSING/);
 assert.equal(x.stored.length,0);
});
test('no sandbox receipt or warrant is invented even for valid evidence',async()=>{
 const x=fixture();const a=await adoptControlledFinaleIntoOwnerContinuity(x.args);
 assert.equal(a.owner_sandbox_verified,false);
 assert.equal(a.warrant_issued,false);
 const forbidden=x.stored.filter(e=>[
  'personal_upgrade_sandbox_verified','personal_upgrade_evidence_warrant',
  'personal_original_job_settlement'].includes(e.entity_type));
 assert.equal(forbidden.length,0);
});

test('unrelated existing owner goal cannot silently be replaced by pilot',async()=>{
 const x=fixture();
 const goal=await x.args.readGoal();
 goal.state.active_goal.title='Send weekly marketing updates';
 await assert.rejects(adoptControlledFinaleIntoOwnerContinuity({
  ...x.args,readGoal:async()=>goal,
 }),/FINALE_OWNER_EXPLICIT_SCOPE_GOAL_REQUIRED/);
 assert.equal(x.stored.length,0);
});
