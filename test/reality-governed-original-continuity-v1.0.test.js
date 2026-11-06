import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {verifyGovernedOriginalContinuity}
 from '../src/reality-governed-original-continuity-v1.0.js';

const owner=randomUUID(),conversation=randomUUID(),source=randomUUID(),transition=randomUUID();
const work={original_work_id:'work:'+'a'.repeat(32),
 original_conversation_id:conversation,source_receipt_id:source,
 goal_id:'user-goal:reliability'};
const session={user_id:owner};
const goal={principal_id:owner,conversation_id:conversation,
 state:{active_goal_id:work.goal_id,active_goal:{
  goal_id:work.goal_id,status:'ACTIVE',user_confirmed:true,
  last_transition_receipt_id:transition}}};
const qid=randomUUID();
const queue={queue_id:qid,original_work_id:work.original_work_id,
 goal_id:work.goal_id,phase:'QUEUED_DISCOVERY',
 installation_authorized:false,job_completed:false};
const env={VERCEL_ENV:'preview'};
const sha='b'.repeat(40);
const ticket='reality-requests/'+qid+'.json';
const workerStates=(state)=>({
 state,production_changed:false,installation_authorized:false,
 original_job_settled:false,model_generated:false});
const verify=options=>verifyGovernedOriginalContinuity({
 session,work,goal,queue,env,...options,
});
test('first dispatch is permitted only for owner-verified exact queued original',async()=>{
 const receipt=await verify();
 assert.equal(receipt.decision,'SAFE_FIRST_DISPATCH');
 assert.equal(receipt.dispatch_allowed,true);
 assert.equal(receipt.queue_id,qid);
 assert.equal(receipt.new_customer_job_created,false);
 assert.equal(receipt.installation_authorized,false);
 assert.equal(receipt.original_job_completed,false);
});
test('persisted dispatched ticket is observed; no new dispatch even when phase remains QUEUED',async()=>{
 let count=0;
 const r=await verify({queue:{...queue,dispatch_commit_sha:sha,request_path:ticket},
  observeWorker:async input=>{
   count++;
   assert.equal(input.queue.queue_id,qid);
   assert.equal(input.queue.dispatch_commit_sha,sha);
   return workerStates('DISCOVERY_WORKER_PENDING');
  }});
 assert.equal(count,1);
 assert.equal(r.decision,'WORKER_RUNNING_MONITOR_SAME_JOB');
 assert.equal(r.dispatch_allowed,false);
 assert.equal(r.original_job_completed,false);
});
test('successful discovery is not an installation, resumption or settlement receipt',async()=>{
 const r=await verify({queue:{...queue,dispatch_commit_sha:sha,request_path:ticket},
  observeWorker:async()=>workerStates('DISCOVERY_WORKER_SUCCESS_OBSERVED')});
 assert.equal(r.decision,'DISCOVERY_EXECUTED_NOT_FINAL_SETTLEMENT');
 assert.equal(r.dispatch_allowed,false);
 assert.equal(r.installation_authorized,false);
 assert.equal(r.original_job_completed,false);
});
test('unacknowledged wake or unavailable provider stays unreplayed',async()=>{
 for(const state of ['WORKER_RUN_NOT_OBSERVED','WORKER_RUN_AMBIGUOUS',
  'WORKER_PROVIDER_READBACK_UNAVAILABLE','DISCOVERY_WORKER_FAILED']){
  const r=await verify({queue:{...queue,dispatch_commit_sha:sha,request_path:ticket},
   observeWorker:async()=>workerStates(state)});
  assert.equal(r.dispatch_allowed,false,state);
  assert.equal(r.original_job_completed,false,state);
 }
});
test('claimed, blocked and settled phases cannot be restarted by the trigger',async()=>{
 for(const phase of ['CLAIMED_DISCOVERY','ESCALATED','FAILED','CANCELLED','AWAITING_SANDBOX',
  'SETTLED_ISOLATED']){
  const r=await verify({queue:{...queue,phase},
   observeWorker:async()=>{throw Error('worker should not be observed');}});
  assert.equal(r.dispatch_allowed,false,phase);
 }
});
test('mismatched owner or goal, forged queue and partial dispatch receipt fail closed',async()=>{
 for(const extra of [
  {goal:{...goal,principal_id:randomUUID()}},
  {goal:{...goal,state:{...goal.state,active_goal:{...goal.state.active_goal,user_confirmed:false}}}},
  {queue:{...queue,original_work_id:'work:'+'c'.repeat(32)}},
  {queue:{...queue,installation_authorized:true}},
 ]){
  await assert.rejects(verify(extra),/GOVERNED_ORIGINAL_CONTINUITY_/);
 }
 const partial=await verify({queue:{...queue,dispatch_commit_sha:sha}});
 assert.equal(partial.decision,'DISPATCH_RECEIPT_RECONCILIATION_REQUIRED');
 assert.equal(partial.dispatch_allowed,false);
 const forged=await verify({queue:{...queue,dispatch_commit_sha:sha,request_path:'foreign.json'}});
 assert.equal(forged.decision,'DISPATCH_RECEIPT_RECONCILIATION_REQUIRED');
});
test('provider cannot claim settlement or authorization through readback',async()=>{
 await assert.rejects(verify({
  queue:{...queue,dispatch_commit_sha:sha,request_path:ticket},
  observeWorker:async()=>({...workerStates('DISCOVERY_WORKER_PENDING'),
   installation_authorized:true}),
 }),/WORKER_INDEPENDENT_READBACK_INVALID/);
});
