import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenuineOriginalWorkRunner}
 from '../src/reality-genuine-capability-execution-runtime-v1.js';

const work='work:'+'a'.repeat(32);
const session={user_id:'11111111-1111-4111-8111-111111111111'};
const conversation='22222222-2222-4222-8222-222222222222';
const job={
 owner_id:session.user_id,conversation_id:conversation,
 original_work_id:work,original_job_settled:false,
 execution_previously_completed:false,goal_still_authorized:true,
 work_item:{work_item_id:work,workflow_id:'workflow:'+work,
  connector:null,operation:'read',consequential:false},
 authorization:{authorization_id:'server:existing-authority'},
 connector:{execute:async()=>({providerExecutionId:'server:read'})},
 independent_verifier:{verify:async()=>({verified:false,independent:true})},
};
test('real original-job runtime connects trusted verifier to durable intake with no manual issue',async()=>{
 let calls=0,received=0;
 const runner=createGenuineOriginalWorkRunner({
  session,conversationId:conversation,
  loadAuthorizedInternalJob:async params=>{
   calls++;assert.equal(params.original_work_id,work);
   assert.equal(params.owner_id,session.user_id);
   return job;
  },
  makeProviderReadback:record=>{assert.equal(record,job);
   return async()=>({})},
  workerWake:async()=>({}),
  makeLiveIntake:({session:s,providerReadback})=>{
   assert.equal(s,session);
   assert.equal(typeof providerReadback,'function');
   return async()=>({status:'GENUINE_CAPABILITY_GAP_DURABLY_QUEUED'});
  },
  runExecution:async args=>{
   received++;
   assert.equal(args.originalWorkId,work);
   assert.equal(args.workItem,job.work_item);
   assert.equal(args.connector,job.connector);
   const response=await args.onVerifiedCapabilityGap({original_work_id:work});
   assert.equal(response.status,'GENUINE_CAPABILITY_GAP_DURABLY_QUEUED');
   return {status:'UNRESOLVED',
    self_repair:{status:response.status,original_work_id:work,
     new_job_created:false,original_job_completed:false}};
  },
 });
 const result=await runner({originalWorkId:work});
 assert.equal(calls,1);assert.equal(received,1);
 assert.equal(result.capability_response,'GENUINE_CAPABILITY_GAP_DURABLY_QUEUED');
 assert.equal(result.execution_status,'UNRESOLVED');
 assert.equal(result.original_job_completed,false);
 assert.equal(result.production_changed,false);
});
test('browser cannot inject work item, goal or provider into job execution',async()=>{
 for(const bad of [
  {original_work_id:'work:'+'b'.repeat(32)},
  {goal_still_authorized:false},
  {original_job_settled:true},
  {execution_previously_completed:true},
  {work_item:{...job.work_item,connector:'github'}},
  {work_item:{...job.work_item,consequential:true}},
  {owner_id:'33333333-3333-4333-8333-333333333333'},
 ]){
  let invoked=false;
  const runner=createGenuineOriginalWorkRunner({
   session,conversationId:conversation,loadAuthorizedInternalJob:async()=>({...job,...bad}),
   makeProviderReadback:()=>async()=>({}),
   workerWake:async()=>({}),
   makeLiveIntake:()=>async()=>{invoked=true;return {}},
   runExecution:async()=>{invoked=true;return {}},
  });
  await assert.rejects(runner({originalWorkId:work}),/GENUINE_EXECUTION_RUNTIME_CURRENT_AUTHORIZED_INTERNAL_ORIGINAL_JOB_REQUIRED/);
  assert.equal(invoked,false);
 }
});
test('a repair handoff must not turn original failed job into verified completion',async()=>{
 const runner=createGenuineOriginalWorkRunner({
  session,conversationId:conversation,
  loadAuthorizedInternalJob:async()=>job,
  makeProviderReadback:()=>async()=>({}),
  workerWake:async()=>({}),
  makeLiveIntake:()=>async()=>({}),
  runExecution:async()=>({status:'VERIFIED',self_repair:{
   original_work_id:work,new_job_created:false,original_job_completed:false}}),
 });
 await assert.rejects(runner({originalWorkId:work}),
  /GENUINE_EXECUTION_RUNTIME_ORIGINAL_EXECUTION_NOT_PRESERVED/);
});
