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

test('real internal failure reports the precise safe intake blocker instead of silent reconciliation',async()=>{
 const {executeAuthorizedWork}=await import('../src/reality-governed-execution-engine-v0.1.js');
 const failure={
  verified:false,independent:true,independently_verified:true,
  original_work_id:work,evidence_kind:'OBSERVED_FAILURE',
  blocker_class:'MISSING_INSTRUMENT',capability_id:'business.observed.missing',
  source_ref:'https://github.com/maloney2323/Reality/actions/runs/41350477102',
  verification_suite_ref:'source:pinned:frozen-regression',
  external_action_performed:false,provider_effect_may_have_occurred:false,
  no_automatic_retry:false,
 };
 const args={
  workItem:job.work_item,workflowId:job.work_item.workflow_id,
  authorization:job.authorization,connector:job.connector,
  independentVerifier:{verify:async()=>failure},originalWorkId:work,
 };
 let called=0;
 const observed=await executeAuthorizedWork({
  ...args,onVerifiedCapabilityGap:async()=>{called++;
   throw Error('GENUINE_CAPABILITY_INTAKE_INDEPENDENT_PROVIDER_FAILURE_CHANGED')},
 });
 assert.equal(called,1);
 assert.equal(observed.status,'UNRESOLVED');
 assert.equal(observed.self_repair.status,'REPAIR_HANDOFF_NEEDS_RECONCILIATION');
 assert.equal(observed.self_repair.intake_attempted,true);
 assert.equal(observed.self_repair.handoff_error_code,
  'GENUINE_CAPABILITY_INTAKE_INDEPENDENT_PROVIDER_FAILURE_CHANGED');
 assert.equal(observed.self_repair.original_job_completed,false);
 const unsafe=await executeAuthorizedWork({
  ...args,onVerifiedCapabilityGap:async()=>{throw Error('secret-supabase-token-do-not-print')},
 });
 assert.equal(unsafe.self_repair.handoff_error_code,'REPAIR_HANDOFF_UNTRUSTED_FAILURE');
 assert.equal(JSON.stringify(unsafe.self_repair).includes('secret-supabase'),false);
});

test('trusted runner forwards only bounded intake failures and keeps original job open',async()=>{
 const runner=createGenuineOriginalWorkRunner({
  session,conversationId:conversation,loadAuthorizedInternalJob:async()=>job,
  makeProviderReadback:()=>async()=>({}),workerWake:async()=>({}),
  makeLiveIntake:()=>async()=>({}),
  runExecution:async()=>({
   status:'UNRESOLVED',self_repair:{
    status:'REPAIR_HANDOFF_NEEDS_RECONCILIATION',intake_attempted:true,
    handoff_error_code:'GENUINE_PREVIEW_CURRENT_CONFIRMED_OWNER_GOAL_REQUIRED',
    original_work_id:work,new_job_created:false,original_job_completed:false,
   },
  }),
 });
 const observed=await runner({originalWorkId:work});
 assert.equal(observed.handoff_error_code,
  'GENUINE_PREVIEW_CURRENT_CONFIRMED_OWNER_GOAL_REQUIRED');
 assert.equal(observed.intake_attempted,true);
 assert.equal(observed.original_job_completed,false);
 assert.equal(observed.new_job_created,false);
});

test('independent original-source readback failure explains empty queue without granting upgrade',async()=>{
 const {executeAuthorizedWork}=await import('../src/reality-governed-execution-engine-v0.1.js');
 let enqueueCalls=0;
 const runner=createGenuineOriginalWorkRunner({
  session,conversationId:conversation,
  loadAuthorizedInternalJob:async()=>({
   ...job,
   independent_verifier:{verify:async()=>{
    throw Error('GENUINE_SOURCE_JOB_CURRENT_PREVIEW_FROZEN_SUITE_CHANGED');
   }},
  }),
  makeProviderReadback:()=>async()=>({}),
  makeLiveIntake:()=>async()=>{
   enqueueCalls++;throw Error('UNEXPECTED_QUEUE');
  },
  runExecution:executeAuthorizedWork,
 });
 const result=await runner({originalWorkId:work});
 assert.equal(result.execution_status,'UNRESOLVED');
 assert.equal(result.capability_response,null);
 assert.equal(result.independent_source_readback_error_code,
  'GENUINE_SOURCE_JOB_CURRENT_PREVIEW_FROZEN_SUITE_CHANGED');
 assert.equal(enqueueCalls,0);
 assert.equal(result.original_job_completed,false);
 assert.equal(result.production_changed,false);
});
test('unexpected independent provider exception never leaks private source or generates capabilities',async()=>{
 const {executeAuthorizedWork}=await import('../src/reality-governed-execution-engine-v0.1.js');
 let enqueueCalls=0;
 const runner=createGenuineOriginalWorkRunner({
  session,conversationId:conversation,
  loadAuthorizedInternalJob:async()=>({
   ...job,independent_verifier:{verify:async()=>{
    throw Error('internal-sensitive-secret-dont-print');
   }},
  }),
  makeProviderReadback:()=>async()=>({}),
  makeLiveIntake:()=>async()=>{enqueueCalls++;return {};},
  runExecution:executeAuthorizedWork,
 });
 const result=await runner({originalWorkId:work});
 assert.equal(result.execution_status,'UNRESOLVED');
 assert.equal(result.independent_source_readback_error_code,null);
 assert.equal(enqueueCalls,0);
 assert.equal(JSON.stringify(result).includes('internal-sensitive-secret'),false);
});
