import test from 'node:test';
import assert from 'node:assert/strict';
import {createGeneralConstitutionalCheckpointService}
 from '../src/reality-general-constitutional-checkpoint-v1.0.js';
import {createGovernedSelfImprovement}
 from '../src/reality-governed-self-improvement-spine-v1.0.js';
import {createContinuitySpine,appendContinuityNode}
 from '../src/reality-continuity-spine-v2.0.js';
const owner='11111111-1111-4111-8111-111111111111',
 conversation='22222222-2222-4222-8222-222222222222',
 transition='33333333-3333-4333-8333-333333333333',
 work='work:'+'b'.repeat(32),goalId='confirmed:goal',
 goalMessage='supabase:authenticated:user:message';
const env={VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true'};
const url='https://sample-preview.supabase.co';
const session={user_id:owner,config:{url}},
 db={url,strictSecrets:true,secretKey:'unit-test-preview-only'};
const root='owner:root',worldline='owner:world';
const spine=createContinuitySpine({continuityRootId:root,worldlineId:worldline,subjectId:owner});
const original=appendContinuityNode({
 spine,stage:'RAW_SIGNAL',entityId:work,eventId:'verified:source:work',
 effectiveTime:'2026-10-31T06:00:00.000Z',assertionTime:'2026-10-31T06:00:00.000Z',
 payload:{original_work_id:work}});
const scope={owner_id:owner,goal_id:goalId,original_work_id:work,
 continuity_root_id:spine.continuity_root_id,worldline_id:spine.worldline_id,
 goal_transition_receipt_ref:transition,goal_evidence_ref:goalMessage,
 target_environment:'ISOLATED_PREVIEW',governance_kernel_hash:'sha256:verified:base'};
const state=createGovernedSelfImprovement({scope});
const readGoal=async()=>({
 principal_id:owner,conversation_id:conversation,
 persisted_source:'ISOLATED_CONTINUITY_VERIFIED_READBACK',
 scope:{root,worldline},state:{continuity_root_id:spine.continuity_root_id,
 active_goal_id:goalId,active_goal:{goal_id:goalId,status:'ACTIVE',
 user_confirmed:true,last_transition_receipt_id:transition,
 source_user_message_ref:goalMessage}}});
function harness(){
 const rows=[original];let writes=0;
 const createPersistence=()=>({
  reconstruct:async()=>rows,
  appendEvent:async event=>{writes++;
   const persisted={...event,provenance:{...event.provenance,
    continuity_spine:{prior_lineage_hash:event.prior_lineage_hash,
      transformation_receipt_id:event.transformation_receipt_id||null}}};
   rows.push(persisted);return persisted},
 });
 return {rows,writes:()=>writes,createPersistence};
}
test('persist general checkpoint in canonical Continuity with independent readback',async()=>{
 const h=harness();
 const svc=createGeneralConstitutionalCheckpointService({
  session,conversationId:conversation,originalWorkId:work,
  originalWorkEvidenceRef:original.event_id,db,env,readGoal,
  createPersistence:h.createPersistence});
 const committed=await svc.persistCheckpoint(state);
 assert.equal(committed.persisted,true);
 assert.equal(committed.independent_readback_verified,true);
 assert.equal(committed.original_work_id,work);
 assert.equal(h.writes(),1);
 assert.equal((await svc.readLatestCheckpoint()).state.phase,'DISCOVERING');
 await svc.persistCheckpoint(state);
 assert.equal(h.writes(),1);
});
test('wrong original source or owner cannot write checkpoint',async()=>{
 const h=harness();
 const svc=createGeneralConstitutionalCheckpointService({
  session,conversationId:conversation,originalWorkId:'work:'+'f'.repeat(32),
  originalWorkEvidenceRef:original.event_id,db,env,readGoal,
  createPersistence:h.createPersistence});
 await assert.rejects(svc.persistCheckpoint(state),
  /GENERAL_CHECKPOINT_ORIGINAL_GOAL_OR_WORLDLINE_CHANGED/);
 assert.equal(h.writes(),0);
});

test('checkpoint reobserves chain and hashes a new parent when a concurrent append wins',async()=>{
 const h=harness();let raced=false,attempts=0;
 const createPersistence=()=>{
  const baseStore=h.createPersistence();
  return {
   reconstruct:baseStore.reconstruct,
   async appendEvent(event){
    attempts++;
    if(!raced){
     raced=true;
     const prior=h.rows.at(-1);
     const competing=appendContinuityNode({
      spine,stage:'OBSERVATION',entityId:work,
      eventId:'77777777-7777-4777-8777-777777777777',
      parentEventId:prior.event_id,priorLineageHash:prior.lineage_hash,
      effectiveTime:'2026-10-31T06:00:00.100Z',
      assertionTime:'2026-10-31T06:00:00.100Z',
      payload:{event:'another-real-owner-event'},
     });
     h.rows.push({...competing,provenance:{...competing.provenance,
      continuity_spine:{prior_lineage_hash:competing.prior_lineage_hash,
       transformation_receipt_id:competing.transformation_receipt_id||null}}});
     throw Error('CONTINUITY_APPEND_NOT_TAIL');
    }
    return baseStore.appendEvent(event);
   },
  };
 };
 const service=createGeneralConstitutionalCheckpointService({
  session,conversationId:conversation,originalWorkId:work,
  originalWorkEvidenceRef:original.event_id,db,env,readGoal,createPersistence});
 const receipt=await service.persistCheckpoint(state);
 assert.equal(receipt.independent_readback_verified,true);
 assert.equal(attempts,2);
 assert.equal(h.rows.at(-1).parent_event_id,'77777777-7777-4777-8777-777777777777');
 assert.equal((await service.readLatestCheckpoint()).state.head_hash,state.head_hash);
});
test('non-tail failure cannot bypass genuine fork/integrity errors',async()=>{
 const h=harness();let appendCalls=0;
 const createPersistence=()=>({
  reconstruct:async()=>h.rows,
  appendEvent:async()=>{appendCalls++;throw Error('CONTINUITY_LINEAGE_HASH_INVALID');},
 });
 const service=createGeneralConstitutionalCheckpointService({
  session,conversationId:conversation,originalWorkId:work,
  originalWorkEvidenceRef:original.event_id,db,env,readGoal,createPersistence});
 await assert.rejects(service.persistCheckpoint(state),/CONTINUITY_LINEAGE_HASH_INVALID/);
 assert.equal(appendCalls,1);
});
