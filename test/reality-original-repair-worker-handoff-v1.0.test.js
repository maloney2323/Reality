import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {queueVerifiedOriginalRepair}
 from '../src/reality-original-repair-worker-handoff-v1.0.js';

const project='hvkfreoagbrphwghjajw';
const url='https://'+project+'.supabase.co';
const owner=randomUUID(),conversation=randomUUID(),receipt=randomUUID();
const transition=randomUUID(),root=randomUUID(),worldline=randomUUID();
const workId='work:'+'a'.repeat(32),goalId='user-goal:original-live-repair';
const work={
 original_work_id:workId,original_conversation_id:conversation,
 source_receipt_id:receipt,goal_id:goalId,
 original_source_sha:'a'.repeat(40),
 original_provider_failed_run_id:41177409146,
 issue_url:'https://github.com/maloney2323/Reality/issues/188',
};
const env={
 VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_SHA:'f'.repeat(40),
 REALITY_GOVERNED_AUTO_TRIGGER_ENABLED:'true',
 REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:project,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:project,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:url,
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
 REALITY_PERSONAL_CHAT_SUPABASE_URL:url,
 REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY:'sb_publishable_test',
 REALITY_CHAT_RECEIPT_HMAC_KEY:'test-secret-26-characters-long',
 SUPABASE_SECRET_KEY:'test-service-role-not-production',
};
const session={user_id:owner,config:{url}};
const job={
 ...work,conversation_id:conversation,state:'REAL_SOURCE_BACKED_REPAIR_PENDING',
 action_completed:true,goal_still_current:true,job_completed:false,
};
const goal={
 principal_id:owner,conversation_id:conversation,
 state:{active_goal_id:goalId,active_goal:{
  goal_id:goalId,status:'ACTIVE',user_confirmed:true,
  last_transition_receipt_id:transition,
  source_user_message_ref:'supabase:chat:'+randomUUID(),
 }},
 scope:{root,worldline},
};
function setup(extra={}){
 const calls=[];
 const params={
  session,work,env,
  listWork:async()=>({status:'SCOPED_READ_ONLY',coverage_limited:false,
   result_truncated:false,jobs:[job]}),
  readGoal:async()=>goal,
  call:async(_db,name,payload)=>{
   calls.push({kind:'db',name,payload});
   if(name==='reality_read_owner_existing_original_issue_v1')return {
    status:'NO_PRIOR_ORIGINAL',installation_authorized:false,job_completed:false};
   if(name==='reality_read_owner_existing_original_issue_v1')return {
   status:'NO_PRIOR_ORIGINAL',installation_authorized:false,job_completed:false};
  if(name==='reality_read_exact_original_queue_v1')return {};
   if(name==='reality_enqueue_exact_original_queue_v1')return {
    queue_id:'d8019af0-c741-4d43-8fa8-f871d4d2cc04',
    original_work_id:workId,goal_id:goalId,phase:'QUEUED_DISCOVERY',
    installation_authorized:false,job_completed:false,
   };
   if(name==='reality_mark_governed_build_dispatched_v1')return {
    queue_id:payload.p_queue_id,dispatched:true,
   };
   throw Error('UNEXPECTED_DB_REQUEST');
  },
  dispatch:async input=>{
   calls.push({kind:'dispatch',input});
   return {worker_sha:'b'.repeat(40),
    request_path:'reality-requests/d8019af0-c741-4d43-8fa8-f871d4d2cc04.json'};
  },...extra,
 };
 return {calls,params};
}
test('the exact owner source, not a historical discovery, drives queue and worker',async()=>{
 const x=setup();
 const r=await queueVerifiedOriginalRepair(x.params);
 assert.equal(r.status,'ORIGINAL_JOB_DISPATCHED_TO_ISOLATED_WORKER');
 assert.equal(r.original_work_id,workId);
 assert.equal(r.worker_dispatch_started,true);
 assert.equal(r.installation_authorized,false);
 assert.equal(r.original_job_completed,false);
 assert.equal(x.calls.length,5);
 assert.equal(x.calls[0].name,'reality_read_owner_existing_original_issue_v1');
 assert.equal(x.calls[1].name,'reality_read_exact_original_queue_v1');
 assert.equal(x.calls[2].payload.p_original_work_id,workId);
 assert.equal(x.calls[2].payload.p_conversation_id,conversation);
 assert.equal(x.calls[2].payload.p_goal_transition_event_id,transition);
 assert.equal(x.calls[3].input.original_work_id,workId);
 assert.equal(x.calls[3].input.issue_url,work.issue_url);
});
test('a foreign provider run, owner, work ID or source receipt cannot dispatch',async()=>{
 for(const patch of [
  {original_provider_failed_run_id:100},
  {source_receipt_id:randomUUID()},
  {original_conversation_id:randomUUID()},
  {original_work_id:'work:'+'f'.repeat(32)},
  {original_source_sha:'c'.repeat(40)},
 ]){
  const x=setup({work:{...work,...patch}});
  await assert.rejects(queueVerifiedOriginalRepair(x.params),
   /REAL_ORIGINAL_BUILD_INDEPENDENT_ORIGINAL_WORK_READBACK_CHANGED/);
  assert.equal(x.calls.length,0);
 }
});
test('goal drift blocks before any queue or external effects',async()=>{
 for(const active of [
  {...goal.state.active_goal,user_confirmed:false},
  {...goal.state.active_goal,status:'PAUSED'},
  {...goal.state.active_goal,last_transition_receipt_id:null},
 ]){
  const x=setup({readGoal:async()=>({...goal,state:{
   ...goal.state,active_goal:active}})});
  await assert.rejects(queueVerifiedOriginalRepair(x.params),
   /REAL_ORIGINAL_BUILD_FRESH_OWNER_GOAL_AND_SCOPE_REQUIRED/);
  assert.equal(x.calls.length,0);
 }
});
test('no live dispatch on production, disabled feature or partial owner ledger',async()=>{
 for(const config of [
  {env:{...env,VERCEL_ENV:'production'}},
  {env:{...env,REALITY_GOVERNED_AUTO_TRIGGER_ENABLED:'false'}},
  {listWork:async()=>({status:'PARTIAL_COVERAGE',jobs:[job]})},
  {listWork:async()=>({status:'SCOPED_READ_ONLY',coverage_limited:true,jobs:[job]})},
 ]){
  const x=setup(config);
  await assert.rejects(queueVerifiedOriginalRepair(x.params),
   /REAL_ORIGINAL_BUILD_/);
  assert.equal(x.calls.length,0);
 }
});
test('a previous claim or escalation is preserved without second worker dispatch',async()=>{
 const x=setup({call:async(_db,name)=>{
  if(name==='reality_read_owner_existing_original_issue_v1')return {
   status:'NO_PRIOR_ORIGINAL',installation_authorized:false,job_completed:false};
  if(name==='reality_read_exact_original_queue_v1')return {};
  assert.equal(name,'reality_enqueue_exact_original_queue_v1');
  return {queue_id:randomUUID(),original_work_id:workId,goal_id:goalId,
   phase:'ESCALATED',installation_authorized:false,job_completed:false};
 }});
 const r=await queueVerifiedOriginalRepair(x.params);
 assert.equal(r.status,'EXISTING_ORIGINAL_QUEUE_PRESERVED');
 assert.equal(r.phase,'ESCALATED');
 assert.equal(r.worker_dispatch_started,false);
 assert.equal(x.calls.length,0);
});
test('dispatch failure preserves original queue and never implies installation',async()=>{
 const x=setup({dispatch:async()=>{throw Error('GOVERNED_BUILD_DISPATCH_CREDENTIAL_UNAVAILABLE')}});
 const r=await queueVerifiedOriginalRepair(x.params);
 assert.equal(r.status,'ORIGINAL_QUEUE_DISPATCH_RECONCILIATION_REQUIRED');
 assert.equal(r.dispatch_error,'GOVERNED_BUILD_DISPATCH_CREDENTIAL_UNAVAILABLE');
 assert.equal(r.installation_authorized,false);
 assert.equal(r.original_job_completed,false);
});
test('an uncertain DB dispatch-recording failure remains unresolved, not successful',async()=>{
 const x=setup({call:async(_db,name)=>{
  if(name==='reality_read_owner_existing_original_issue_v1')return {
   status:'NO_PRIOR_ORIGINAL',installation_authorized:false,job_completed:false};
  if(name==='reality_read_exact_original_queue_v1')return {};
  if(name==='reality_enqueue_exact_original_queue_v1')return {
   queue_id:randomUUID(),original_work_id:workId,goal_id:goalId,
   phase:'QUEUED_DISCOVERY',installation_authorized:false,job_completed:false,
  };
  return {dispatched:false};
 }});
 await assert.rejects(queueVerifiedOriginalRepair(x.params),
  /REAL_ORIGINAL_BUILD_DISPATCH_COMMIT_READBACK_MISSING/);
});

test('an existing unresolved original job cannot be silently replaced by a new intake identity',async()=>{
 const x=setup({call:async(_db,name)=>{
  if(name==='reality_read_owner_existing_original_issue_v1')return {
   status:'NO_PRIOR_ORIGINAL',installation_authorized:false,job_completed:false};
  assert.equal(name,'reality_read_exact_original_queue_v1');
  return {queue_id:randomUUID(),original_work_id:'work:'+'9'.repeat(32),
   phase:'ESCALATED',job_completed:false};
 }});
 await assert.rejects(queueVerifiedOriginalRepair(x.params),
  /REAL_ORIGINAL_BUILD_EXISTING_UNFINISHED_WORK_IDENTITY_RECONCILIATION_REQUIRED/);
 assert.equal(x.calls.length,0,'no second enqueue and no worker dispatch');
});

test('cross-conversation older original-work ID blocks new queue and dispatch',async()=>{
 const x=setup({call:async(_db,name)=>{
  assert.equal(name,'reality_read_owner_existing_original_issue_v1');
  return {status:'EXISTING_UNFINISHED_ORIGINAL',
   original_work_id:'work:'+'9'.repeat(32),installation_authorized:false,
   job_completed:false};
 }});
 await assert.rejects(queueVerifiedOriginalRepair(x.params),
  /REAL_ORIGINAL_BUILD_PRIOR_ORIGINAL_ISSUE_WORK_ID_MUST_BE_RECONCILED/);
 assert.equal(x.calls.length,0);
});

test('existing exact dispatched original is monitored; no new release queue or ticket',async()=>{
 const qid=randomUUID();const workerSha='b'.repeat(40);
 const seen=[];
 const x=setup({call:async(_db,name,payload)=>{
  seen.push(name);
  if(name==='reality_read_owner_existing_original_issue_v1')return {
   status:'EXISTING_UNFINISHED_ORIGINAL',original_work_id:workId,
   installation_authorized:false,job_completed:false};
  assert.equal(name,'reality_read_exact_original_queue_v1');
  return {queue_id:qid,original_work_id:workId,goal_id:goalId,
   phase:'QUEUED_DISCOVERY',dispatch_commit_sha:workerSha,
   request_path:'reality-requests/'+qid+'.json',
   installation_authorized:false,job_completed:false};
 },verifyContinuity:async({queue})=>{
  assert.equal(queue.queue_id,qid);
  return {decision:'WORKER_RUNNING_MONITOR_SAME_JOB',
   worker_observation:{state:'DISCOVERY_WORKER_PENDING'},
   original_work_id:workId,queue_id:qid,
   installation_authorized:false,original_job_completed:false,
   production_changed:false,dispatch_allowed:false};
 },dispatch:async()=>{throw Error('DUPLICATE_DISPATCH_NOT_ALLOWED')}});
 const r=await queueVerifiedOriginalRepair(x.params);
 assert.equal(r.status,'EXISTING_ORIGINAL_QUEUE_PRESERVED');
 assert.equal(r.continuity_decision,'WORKER_RUNNING_MONITOR_SAME_JOB');
 assert.equal(r.worker_dispatch_started,true);
 assert.equal(r.installation_authorized,false);
 assert.deepEqual(seen,['reality_read_owner_existing_original_issue_v1',
  'reality_read_exact_original_queue_v1']);
});
test('existing same-job queue in a different preview release reuses its ticket',async()=>{
 const qid=randomUUID();const seen=[];
 const x=setup({call:async(_db,name,payload)=>{
  seen.push(name);
  if(name==='reality_read_owner_existing_original_issue_v1')return {
   status:'EXISTING_UNFINISHED_ORIGINAL',original_work_id:workId,
   installation_authorized:false,job_completed:false};
  if(name==='reality_read_exact_original_queue_v1')return {
   queue_id:qid,original_work_id:workId,goal_id:goalId,
   phase:'QUEUED_DISCOVERY',preview_release_sha:'c'.repeat(40),
   installation_authorized:false,job_completed:false};
  if(name==='reality_mark_governed_build_dispatched_v1')return {
   queue_id:qid,dispatched:true};
  throw Error('NO_NEW_PER_RELEASE_QUEUE_ALLOWED '+name);
 },dispatch:async({queue_id})=>{
  assert.equal(queue_id,qid);
  return {worker_sha:'b'.repeat(40),request_path:'reality-requests/'+qid+'.json'};
 }});
 const result=await queueVerifiedOriginalRepair(x.params);
 assert.equal(result.status,'ORIGINAL_JOB_DISPATCHED_TO_ISOLATED_WORKER');
 assert.equal(result.queue_id,qid);
 assert.equal(result.worker_dispatch_started,true);
 assert.deepEqual(seen,['reality_read_owner_existing_original_issue_v1',
  'reality_read_exact_original_queue_v1','reality_mark_governed_build_dispatched_v1']);
});
test('partial dispatch receipt never creates another ticket',async()=>{
 const qid=randomUUID();let dispatch=0;
 const x=setup({call:async(_db,name)=>{
  if(name==='reality_read_owner_existing_original_issue_v1')return {
   status:'EXISTING_UNFINISHED_ORIGINAL',original_work_id:workId,
   installation_authorized:false,job_completed:false};
  if(name==='reality_read_exact_original_queue_v1')return {
   queue_id:qid,original_work_id:workId,goal_id:goalId,
   phase:'QUEUED_DISCOVERY',dispatch_commit_sha:'b'.repeat(40),
   installation_authorized:false,job_completed:false};
  throw Error('UNEXPECTED_QUEUE_MUTATION');
 },dispatch:async()=>{dispatch++}});
 const result=await queueVerifiedOriginalRepair(x.params);
 assert.equal(result.continuity_decision,'DISPATCH_RECEIPT_RECONCILIATION_REQUIRED');
 assert.equal(dispatch,0);
 assert.equal(result.original_job_completed,false);
});
