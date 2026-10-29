import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {personalGoalScope} from '../src/reality-personal-goal-readback-v0.1.js';
import {createContinuitySpine} from '../src/reality-continuity-spine-v2.0.js';
import {
 inspectFirstUpgrade178,startFirstUpgrade178
} from '../src/reality-personal-first-upgrade-178-v0.1.js';
const owner='11111111-1111-4111-8111-111111111111',
 conversationId='22222222-2222-4222-8222-222222222222',
 transition='33333333-3333-4333-8333-333333333333',
 queueId='44444444-4444-4444-8444-444444444444';
const url='https://hvkfreoagbrphwghjajw.supabase.co';
const env={
 VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_SHA:'a'.repeat(40),
 REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_PERSONAL_CHAT_SUPABASE_URL:url,
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw',
 REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY:'sb_publishable_'+'a'.repeat(30),
 REALITY_CHAT_RECEIPT_HMAC_KEY:'valid-test-hmac-long-enough',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:'hvkfreoagbrphwghjajw',
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:'hvkfreoagbrphwghjajw',
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:url,
 REALITY_UNIVERSE_PERSISTENCE_KEY:'isolated-test-secret-key',
 REALITY_STANDALONE_OPENAI_API_KEY:'isolated-test-model-secret-not-real',
 REALITY_SEMANTIC_REVIEW_MODEL:'gpt-6',
};
const session={user_id:owner,config:{url,key:env.REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY}};
const scope=personalGoalScope({userId:owner,conversationId});
const spine=createContinuitySpine({
 continuityRootId:scope.root,worldlineId:scope.worldline,subjectId:owner
});
const originalGoal={
 principal_id:owner,conversation_id:conversationId,scope,
 persisted_source:'ISOLATED_CONTINUITY_VERIFIED_READBACK',
 state:{
  continuity_root_id:spine.continuity_root_id,world_id:scope.world,
  active_goal_id:'user-goal:real-confirmed-first-proof',
  active_goal:{
   goal_id:'user-goal:real-confirmed-first-proof',status:'ACTIVE',
   user_confirmed:true,last_transition_receipt_id:transition,
   source_user_message_ref:'supabase:chat:verified-original-goal',
  }
 }
};
const readGoal=async()=>originalGoal;
const queueEmpty=async(_db,name)=>{
 assert.equal(name,'reality_read_governed_build_v1');return {queue_id:null}
};
test('read-only readiness binds first job 178 to exact owner, not old #143',async()=>{
 const result=await inspectFirstUpgrade178({session,conversationId,env,readGoal,
  call:queueEmpty});
 assert.equal(result.status,'READY_FOR_EXACT_OWNER_CONFIRMATION');
 assert.equal(result.issue_number,178);
 assert.match(result.original_work_id,/^work:[a-f0-9]{32}$/);
 assert.notEqual(result.original_work_id,'work:24cda9611404e9bcb47909976067605c');
 assert.equal(result.installation_authorized,false);
 assert.equal(result.model_generated,false);
});
test('model provider must be configured, GitHub write token is unnecessary',async()=>{
 const missing={...env,REALITY_STANDALONE_OPENAI_API_KEY:''};
 const result=await inspectFirstUpgrade178({
  session,conversationId,env:missing,readGoal,call:queueEmpty});
 assert.equal(result.status,'BLOCKED_MODEL_PROVIDER_NOT_CONFIGURED');
 await assert.rejects(()=>startFirstUpgrade178({
  session,conversationId,env:missing,readGoal,
  call:()=>{throw Error('UNEXPECTED_DB_CALL');},
 }),/FIRST_PROOF_MODEL_PROVIDER_NOT_CONFIGURED/);
 const withoutGitHubWriteToken=await inspectFirstUpgrade178({
  session,conversationId,env:{...env,REALITY_BUILDER_DISPATCH_GITHUB_TOKEN:''},
  readGoal,call:queueEmpty});
 assert.equal(withoutGitHubWriteToken.status,'READY_FOR_EXACT_OWNER_CONFIRMATION');
});
test('foreign or changed owner goal prevents any provider call',async()=>{
 let called=false;
 for(const changed of [
  {...originalGoal,principal_id:'aaaa1111-1111-4111-8111-111111111111'},
  {...originalGoal,state:{...originalGoal.state,
   active_goal:{...originalGoal.state.active_goal,user_confirmed:false}}},
 ]){
  await assert.rejects(()=>inspectFirstUpgrade178({
   session,conversationId,env,readGoal:async()=>changed,
   call:()=>{called=true;return {queue_id:null}}
  }),/FIRST_PROOF_OWNER_CONFIRMED_GOAL_REQUIRED/);
 }
 assert.equal(called,false);
});
test('existing queued different work cannot be silently reassigned to #178',async()=>{
 const result=await inspectFirstUpgrade178({session,conversationId,env,readGoal,
  call:async()=>({queue_id:queueId,goal_id:originalGoal.state.active_goal_id,
   original_work_id:'work:'+'f'.repeat(32)})});
 assert.equal(result.status,'BLOCKED_BY_DIFFERENT_QUEUED_WORK');
 assert.equal(result.installation_authorized,false);
});
test('original #178 source-linked once-only queue has no GitHub write or installation',async()=>{
 const called=[];let actualWork;
 const call=async(_db,name,args)=>{
  called.push(name);
  if(name==='reality_read_governed_build_v1')return {queue_id:null};
  if(name==='reality_enqueue_governed_build_v1'){
   assert.equal(args.p_owner_id,owner);
   assert.equal(args.p_conversation_id,conversationId);
   assert.equal(args.p_goal_transition_event_id,transition);
   actualWork=args.p_original_work_id;
   return {queue_id:queueId,original_work_id:actualWork,
    goal_id:args.p_goal_id,job_completed:false,installation_authorized:false};
  }
  throw Error('UNEXPECTED_RPC_'+name);
 };
 const observe=async({scope,apiToken})=>{
  assert.equal(apiToken,null,'public source must not require GitHub write credential');
  return {status:'INDEPENDENT_CI_MISSING_CAPABILITY_OBSERVED',
   original_work_id:scope.original_work_id,goal_id:scope.goal_id,owner_id:scope.owner_id,
   provider_receipt_ref:'github:actions:run:40962921090:job:123760052647'};
 };
 const persistWork=async({scope,providerEvidence})=>{
  assert.equal(scope.original_work_id,actualWork);
  assert.equal(providerEvidence.original_work_id,actualWork);
  return {receipt_id:'55555555-5555-4555-8555-555555555555',
   original_work_id:actualWork,verified_readback:true,installation_authorized:false};
 };
 const r=await startFirstUpgrade178({
  session,conversationId,env,readGoal,call,observe,persistWork,
 });
 assert.equal(r.status,'QUEUED_DIRECT_CONSTITUTIONAL');
 assert.equal(r.worker_dispatch_required,false);
 assert.equal(r.continuity_work_receipt_id,'55555555-5555-4555-8555-555555555555');
 assert.equal(r.original_work_id,actualWork);
 assert.equal(r.model_generated,false);
 assert.equal(r.installation_authorized,false);
 assert.deepEqual(called,['reality_read_governed_build_v1',
  'reality_enqueue_governed_build_v1']);
});
test('unverified provider outcome cannot create work or bypass gate',async()=>{
 let writes=0;
 await assert.rejects(()=>startFirstUpgrade178({
  session,conversationId,env,readGoal,
  call:async(_db,name)=>{if(name==='reality_read_governed_build_v1')
   return {queue_id:null};writes++},
  observe:async()=>({status:'MODEL_CLAIMS_VERIFIED'}),
 }),/FIRST_PROOF_EXACT_PROVIDER_GAP_NOT_PROVEN/);
 assert.equal(writes,0);
});
test('missing Continuity receipt aborts before any execution authority',async()=>{
 const observed=async({scope})=>({
  status:'INDEPENDENT_CI_MISSING_CAPABILITY_OBSERVED',
  original_work_id:scope.original_work_id,goal_id:scope.goal_id,owner_id:scope.owner_id,
  provider_receipt_ref:'github:verified',
 });
 await assert.rejects(()=>startFirstUpgrade178({
  session,conversationId,env,readGoal,observe:observed,
  call:async(_db,name,args)=>{
   if(name==='reality_read_governed_build_v1')return {queue_id:null};
   return {queue_id:queueId,original_work_id:args.p_original_work_id,
    goal_id:args.p_goal_id,job_completed:false,installation_authorized:false};
  },
  persistWork:async()=>({verified_readback:false}),
 }),/FIRST_PROOF_CONTINUITY_WORK_READBACK_FAILED/);
});
test('Work Center script parses and exact first proof has disabled-start + owner confirmation',()=>{
 const html=readFileSync('index.html','utf8');
 for(const [,script]of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))
  new vm.Script(script);
 for(const id of ['wcFirstUpgrade178','wcInspectFirstGap178','wcStartFirstGap178'])
  assert.ok(html.includes('id="'+id+'"'));
 assert.match(html,/id="wcStartFirstGap178" type="button" disabled/);
 assert.match(html,/INVESTIGATE_VERIFIED_FIRST_CAPABILITY_GAP_178/);
 assert.match(html,/wcFirstGap178ReadyConversation=conv/);
 assert.match(html,/window\.confirm\(/);
});
