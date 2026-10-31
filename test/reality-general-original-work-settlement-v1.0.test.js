import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenericVerifiedOriginalWorkSettlement}
 from '../src/reality-general-original-work-settlement-v1.0.js';
import {createContinuitySpine,appendContinuityNode}
 from '../src/reality-continuity-spine-v2.0.js';
const owner='11111111-1111-4111-8111-111111111111';
const original='work:'+'a'.repeat(32),hash='b'.repeat(64),commit='c'.repeat(40);
const session={user_id:owner},db={strictSecrets:true,secretKey:'unit-test-only'};
const scope={owner_id:owner,original_work_id:original,goal_id:'confirmed:goal',
 continuity_root_id:'root:generic:owner',worldline_id:'world:generic:owner',
 target_environment:'ISOLATED_PREVIEW'};
const registration={kind:'CAPABILITY_REGISTERED',verified:true,status:'ACTIVE',
 owner_id:owner,original_work_id:original,artifact_hash:hash,
 installed_commit_sha:commit,
 registry_receipt_ref:'supabase:universe_capabilities:22222222-2222-4222-8222-222222222222',
 production_changed:false};
const execution={kind:'ORIGINAL_JOB_RESUMED',owner_id:owner,
 original_work_id:original,installed_commit_sha:commit,
 independent_provider_readback:true,real_execution_observed:true,
 observed_outcome:'SUCCEEDED',evidence_hash:'d'.repeat(64),
 executor_run_ref:'github:actions:run:1234:job:5678',
 production_changed:false};
function store(){
 const spine=createContinuitySpine({
  continuityRootId:scope.continuity_root_id,worldlineId:scope.worldline_id,
  subjectId:owner});
 const rows=[appendContinuityNode({
  spine,stage:'RAW_SIGNAL',entityId:original,eventId:'canonical:source:work',
  payload:{original_work_id:original},epistemicStatus:'OBSERVED',
  effectiveTime:'2026-10-31T06:00:00.000Z',
  assertionTime:'2026-10-31T06:00:00.000Z',
 })];
 let writes=0;
 return {createPersistence:()=>({
  reconstruct:async()=>rows,
  appendEvent:async event=>{writes++;rows.push(event);return event},
 }),writes:()=>writes};
}
test('independent provider verified same original work writes durable settlement and reads it back',async()=>{
 const p=store();
 const service=createGenericVerifiedOriginalWorkSettlement({
  session,scope,db,createPersistence:p.createPersistence,
  verifyOriginalExecution:async()=>({verified:true,
   independent_provider_readback:true,original_work_id:original,
   executor_run_ref:execution.executor_run_ref,
   evidence_hash:execution.evidence_hash,observed_outcome:'SUCCEEDED'}),
 });
 const result=await service.recordAndReadback({registration,execution});
 assert.equal(result.kind,'ORIGINAL_JOB_SETTLED');
 assert.equal(result.verified,true);
 assert.equal(result.durable_settlement_readback,true);
 assert.equal(result.production_changed,false);
 assert.equal(result.customer_acceptance_recorded,false);
 assert.equal(p.writes(),1);
 await service.recordAndReadback({registration,execution});
 assert.equal(p.writes(),1,'no duplicate final settlement');
});
test('provider cannot verify original execution so no settlement can be written',async()=>{
 const p=store();
 const service=createGenericVerifiedOriginalWorkSettlement({
  session,scope,db,createPersistence:p.createPersistence,
  verifyOriginalExecution:async()=>({verified:false}),
 });
 await assert.rejects(service.recordAndReadback({registration,execution}),
  /GENERAL_SETTLEMENT_INDEPENDENT_ORIGINAL_EXECUTION_READBACK_REQUIRED/);
 assert.equal(p.writes(),0);
});
test('green sandbox alone and foreign work cannot create final settlement',async()=>{
 const p=store();
 const service=createGenericVerifiedOriginalWorkSettlement({
  session,scope,db,createPersistence:p.createPersistence,
  verifyOriginalExecution:async()=>{throw Error('not called')},
 });
 await assert.rejects(service.recordAndReadback({registration,
  execution:{...execution,original_work_id:'work:'+'f'.repeat(32)}}),
  /GENERAL_SETTLEMENT_DISTINCT_ORIGINAL_PROVIDER_CONSEQUENCES_REQUIRED/);
 assert.equal(p.writes(),0);
});
