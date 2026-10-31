import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {queueOwnerGovernedBuild,readOwnerGovernedBuild}
 from '../src/reality-governed-build-chat-connection-v1.0.js';
const project='hvkfreoagbrphwghjajw';
const env={
 VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_SHA:'a'.repeat(40),
 REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:project,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:project,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:'https://'+project+'.supabase.co',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
 REALITY_PERSONAL_CHAT_SUPABASE_URL:'https://'+project+'.supabase.co',
 REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY:'sb_publishable_test',
 REALITY_CHAT_RECEIPT_HMAC_KEY:'test-secret-26-characters-long',
 SUPABASE_SECRET_KEY:'test-server-role-not-real',
};
const user=randomUUID(),conversation=randomUUID(),transition=randomUUID();
const work='work:'+'b'.repeat(32),goalId='user-goal:'+'c'.repeat(32);
const session={user_id:user};
const observed={
 status:'ORIGINAL_JOB_IDENTIFIED_AWAITING_INDEPENDENT_GAP_OBSERVATION',
 original_conversation_id:conversation,original_work_id:work,
 original_job_tracking_receipt_ref:'universe:tracking-verified',
 issue_url:'https://github.com/maloney2323/Reality/issues/143',
 goal_id:goalId,goal_transition_receipt_ref:transition,
};
const goal={principal_id:user,
 state:{active_goal_id:goalId,active_goal:{goal_id:goalId,status:'ACTIVE',
  user_confirmed:true,last_transition_receipt_id:transition,
  source_user_message_ref:'supabase:reality_chat_messages:'+randomUUID()}},
 scope:{root:randomUUID(),worldline:randomUUID()}};
function mock(extra={}){
 const calls=[];
 return {calls,params:{session,env,
  expectedOriginalWorkId:work,
  inspect:async()=>observed,readGoal:async()=>goal,
  dispatch:async()=>({dispatched:true,worker_sha:'d'.repeat(40),
   request_path:'reality-requests/00000000-0000-4000-8000-000000000001.json',
   workflow_runs_url:'https://github.com/maloney2323/Reality/actions/workflows/reality-governed-build-worker-v1.yml'}),
  call:async(db,name,input)=>{
   calls.push({db:{url:db.url,strictSecrets:db.strictSecrets},
    name,input});
   if(name==='reality_mark_governed_build_dispatched_v1')
    return {queue_id:input.p_queue_id,dispatched:true};
   if(name==='reality_enqueue_governed_build_v1')
    return {queue_id:randomUUID(),original_work_id:work,goal_id:goalId,
     phase:'QUEUED_DISCOVERY',installation_authorized:false,job_completed:false};
   return {queue_id:randomUUID(),original_work_id:work,goal_id:goalId,
    phase:'QUEUED_DISCOVERY',installation_authorized:false,job_completed:false};
  },...extra
 }};
}
test('authenticated owner goal and canonical unfinished work enqueue through SERVICE ONLY',async()=>{
 const m=mock();
 const result=await queueOwnerGovernedBuild(m.params);
 assert.equal(result.phase,'DISPATCHED_TO_ISOLATED_WORKER');
 assert.equal(result.model_generated,false);
 assert.equal(result.sandbox_executed,false);
 assert.equal(result.capability_installed,false);
 assert.equal(m.calls[0].name,'reality_enqueue_governed_build_v1');
 assert.equal(m.calls[0].input.p_original_work_id,work);
 assert.equal(m.calls[0].input.p_owner_id,user);
 assert.equal(m.calls[0].input.p_goal_transition_event_id,transition);
 assert.equal(m.calls[0].db.url,'https://'+project+'.supabase.co');
});
test('a changed original job is rejected before database queue or dispatch',async()=>{
 const m=mock({expectedOriginalWorkId:'work:'+'f'.repeat(32)});
 await assert.rejects(queueOwnerGovernedBuild(m.params),
  /GOVERNED_BUILD_OWNER_REVIEWED_WORK_CHANGED/);
 assert.equal(m.calls.length,0);
});
test('queue cannot run in production or without signed-in owner',async()=>{
 const m=mock();
 await assert.rejects(queueOwnerGovernedBuild({...m.params,
  session:{},}),/GOVERNED_BUILD_AUTHENTICATED_PREVIEW_ONLY/);
 await assert.rejects(queueOwnerGovernedBuild({...m.params,
  env:{...env,VERCEL_ENV:'production'}}),/GOVERNED_BUILD_AUTHENTICATED_PREVIEW_ONLY/);
});
test('trusted owner database must match authenticated chat project',async()=>{
 const m=mock();
 await assert.rejects(queueOwnerGovernedBuild({...m.params,
  env:{...env,REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'anotherprojectref123'}}),
 /CHAT_DATABASE_PROJECT_MISMATCH|GOVERNED_BUILD_OWNER_DB_BOUNDARY_CHANGED/);
});
test('assistant-proposed or paused goals cannot enqueue builds',async()=>{
 for(const patch of [{user_confirmed:false},{status:'PAUSED'},
  {last_transition_receipt_id:randomUUID()}]){
  const m=mock({readGoal:async()=>({...goal,state:{...goal.state,
   active_goal:{...goal.state.active_goal,...patch}}})});
  await assert.rejects(queueOwnerGovernedBuild(m.params),
   /GOVERNED_BUILD_FRESH_CONFIRMED_GOAL_REQUIRED/);
 }
});
test('user cannot switch the original conversation through a forged discovery result',async()=>{
 const m=mock({inspect:async()=>({...observed,original_conversation_id:'claimed'})});
 await assert.rejects(queueOwnerGovernedBuild(m.params),
  /GOVERNED_BUILD_VERIFIED_UNFINISHED_WORK_REQUIRED/);
});
test('empty or ineligible work never queues a fabricated developer task',async()=>{
 const m=mock({inspect:async()=>({status:'NO_VERIFIED_ELIGIBLE_WORK'})});
 await assert.rejects(queueOwnerGovernedBuild(m.params),
  /GOVERNED_BUILD_VERIFIED_UNFINISHED_WORK_REQUIRED/);
});
test('server must reject fabricated or missing atomic database receipt',async()=>{
 const m=mock({call:async()=>({queue_id:randomUUID(),original_work_id:work,
  job_completed:true,goal_id:goalId})});
 await assert.rejects(queueOwnerGovernedBuild(m.params),
  /GOVERNED_BUILD_QUEUE_READBACK_NOT_CONFIRMED/);
});
test('READ status never grants execution authority or implies settled job',async()=>{
 const m=mock();
 const result=await readOwnerGovernedBuild(m.params);
 assert.equal(result.queued,true);
 assert.equal(result.completed,false);
 assert.equal(result.external_execution_authorized,false);
 assert.equal(result.capability_installed,false);
});
test('API request scope, origin and intent remain server-owned',()=>{
 const source=readFileSync('api/reality/personal-governed-build.js','utf8');
 assert.match(source,/authenticatedChatSession/);
 assert.match(source,/assertSameOrigin\(req\)/);
 assert.match(source,/body.intent!=='QUEUE_SAFE_AUTONOMOUS_DISCOVERY'/);
 assert.match(source,/expected_original_work_id,intent/);
 assert.match(source,/expectedOriginalWorkId:body\.expected_original_work_id/);
 assert.match(source,/Object.keys\(req.query\|\|\{\}\).length/);
 assert.doesNotMatch(source,/completeOriginal143OwnerAction|githubPost|githubPut|promoteVerifiedUpgrade/);
});
test('Work Center connects live queue inspection and one consented discovery action',()=>{
 const html=readFileSync('index.html','utf8');
 for(const [,script]of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))
  new vm.Script(script);
 assert.match(html,/id="privateContinueOriginal143"/);
 assert.match(html,/wcLoadUnfinishedWork\(\)/);
 assert.match(html,/id="wcInspectGovernedBuild"/);
 assert.match(html,/id="wcStartGovernedBuild"[^>]*disabled/);
 assert.match(html,/\/api\/reality\/personal-governed-build/);
 assert.match(html,/QUEUE_SAFE_AUTONOMOUS_DISCOVERY/);
 assert.match(html,/id="wcRepairConsentDialog"/);
 assert.match(html,/wcRepairConsentCheckbox/);
 assert.match(html,/dialog\.showModal\(\)/);
 assert.match(html,/data\.eligible_for_investigation===true/);
 assert.doesNotMatch(html,/String\(data\.original_work_id\)!=='work:[a-f0-9]{32}'/);
 assert.match(html,/No verified, unfinished job is eligible right now/);
 assert.doesNotMatch(html,/setInterval\(.*wcReadGovernedBuild/);
});

test('read-only GET returns exact scoped eligibility without any installation authority',async()=>{
 const m=mock({call:async(_db,name)=>name==='reality_read_governed_build_v1'?
  {queue_id:null}:{}});
 const r=await readOwnerGovernedBuild(m.params);
 assert.equal(r.phase,'NOT_QUEUED');
 assert.equal(r.original_work_id,work);
 assert.equal(r.eligible_for_investigation,true);
 assert.equal(r.completed,false);
 assert.equal(r.installation_authorized,false);
 assert.equal(r.capability_installed,false);
});
test('empty eligibility never fabricates a queue and a prior queue cannot claim model generation',async()=>{
 const m=mock({inspect:async()=>({status:'NO_VERIFIED_ELIGIBLE_WORK'})});
 const empty=await readOwnerGovernedBuild(m.params);
 assert.equal(empty.queued,false);
 assert.equal(empty.phase,'NO_VERIFIED_ELIGIBLE_WORK');
 assert.equal(empty.completed,false);
 const prior=await readOwnerGovernedBuild(mock().params);
 assert.equal(prior.queued,true);
 assert.equal(prior.model_generated,false);
 assert.equal(prior.sandbox_executed,false);
 assert.equal(prior.installation_authorized,false);
 assert.equal(prior.capability_installed,false);
});
test('missing worker credential is recorded as an explicit non-executed blocker',async()=>{
 const m=mock({dispatch:async()=>{throw Error('GOVERNED_BUILD_DISPATCH_CREDENTIAL_UNAVAILABLE')}});
 const r=await queueOwnerGovernedBuild(m.params);
 assert.equal(r.phase,'QUEUED_DISPATCH_BLOCKED');
 assert.equal(r.dispatch_error,'GOVERNED_BUILD_DISPATCH_CREDENTIAL_UNAVAILABLE');
 assert.equal(r.model_generated,false);
 assert.equal(r.capability_installed,false);
});
test('the client cannot choose an arbitrary repository, branch or work ID',()=>{
 const code=readFileSync('src/reality-governed-build-github-dispatch-v1.0.js','utf8');
 assert.match(code,/const WORKER='reality\/worker\/foundational-build-queue-v1'/);
 assert.match(code,/const REPO='maloney2323\/Reality'/);
 assert.match(code,/REALITY_BUILDER_DISPATCH_GITHUB_TOKEN/);
 assert.match(code,/force:false/);
 assert.match(code,/request_path:file/);
});
