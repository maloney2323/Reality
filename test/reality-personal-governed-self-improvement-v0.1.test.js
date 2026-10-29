import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createContinuitySpine} from '../src/reality-continuity-spine-v2.0.js';
import {personalGoalScope} from '../src/reality-personal-goal-readback-v0.1.js';
import {projectAuthenticatedSelfImprovement,inspectAuthenticatedSelfImprovement}
 from '../src/reality-personal-governed-self-improvement-v0.1.js';

const owner=randomUUID(),conversationId=randomUUID();
const session={user_id:owner,config:{url:'https://hvkfreoagbrphwghjajw.supabase.co'}};
const env={VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 VERCEL_GIT_COMMIT_SHA:'5f24a188d042fe7efb58c34f308423af1c040bf7'};
const scope=personalGoalScope({userId:owner,conversationId});
const spine=createContinuitySpine({continuityRootId:scope.root,worldlineId:scope.worldline,subjectId:owner});
const originalWork='work:24cda9611404e9bcb47909976067605c';
const originalGoal='user-goal:219764fa8213a41a2ba638c5c2533d5b';
const goal={principal_id:owner,conversation_id:conversationId,
 persisted_source:'ISOLATED_CONTINUITY_VERIFIED_READBACK',scope,
 state:{active_goal_id:originalGoal,continuity_root_id:spine.continuity_root_id,
  world_id:scope.world,active_goal:{
   goal_id:originalGoal,status:'ACTIVE',user_confirmed:true,
   title:'Reality independently improves its capabilities and completes owner work',
   source_user_message_ref:'supabase:reality_chat_messages:'+randomUUID(),
   last_transition_receipt_id:randomUUID(),
  }}};
const job={conversation_id:conversationId,work_id:originalWork,
 original_work_id:originalWork,job_completed:false,action_completed:true,
 goal_still_current:true,source_receipt_id:randomUUID(),
 issue_url:'https://github.com/maloney2323/Reality/issues/143'};
function sources(queue=[job]){
 return {
  listWork:async()=>({execution_authorized:false,unfinished_count:queue.length,
   scanned_conversations:1,unreadable_conversations:0,coverage_limited:false,
   jobs:queue}),
  readGoal:async()=>goal,
 };
}
test('signed-in owner goal and canonical unfinished work become one read-only Reality orientation',()=>{
 const r=projectAuthenticatedSelfImprovement({session,job,goal,env});
 assert.equal(r.original_work_id,originalWork);
 assert.equal(r.goal_id,originalGoal);
 assert.equal(r.original_conversation_id,conversationId);
 assert.equal(r.orientation.self_improvement_state,'DISCOVERING');
 assert.equal(r.orientation.next_required_step,'OBSERVE_AND_CONFIRM_MISSING_CAPABILITY');
 assert.equal(r.durable_self_improvement_checkpoint,false);
 assert.equal(r.model_builder_connected,false);
 assert.equal(r.model_can_install,false);
 assert.equal(r.original_job_completed,false);
 assert.ok(r.orientation.checkpoint_hash);
});
test('discover across verified conversations, not user-supplied work ID',async()=>{
 const x=await inspectAuthenticatedSelfImprovement({session,env,...sources()});
 assert.equal(x.status,'ORIGINAL_JOB_IDENTIFIED_AWAITING_INDEPENDENT_GAP_OBSERVATION');
 assert.equal(x.original_work_id,originalWork);
 assert.equal(x.candidate_work_count,1);
 assert.equal(x.scanned_conversations,1);
 assert.equal(x.external_action_performed,false);
});
test('missing eligible unfinished job cannot be promoted into synthetic work',async()=>{
 const x=await inspectAuthenticatedSelfImprovement({session,env,...sources([])});
 assert.equal(x.status,'NO_VERIFIED_ELIGIBLE_WORK');
 assert.equal(x.model_builder_connected,false);
 assert.equal(x.original_job_completed,false);
 assert.equal(x.original_work_id,undefined);
});
test('no eligible work under partial coverage is not represented as exhaustive discovery',async()=>{
 const x=await inspectAuthenticatedSelfImprovement({
  session,env,
  listWork:async()=>({execution_authorized:false,unfinished_count:0,
   scanned_conversations:50,unreadable_conversations:2,
   coverage_limited:true,jobs:[]}),
 });
 assert.equal(x.status,'NO_VERIFIED_ELIGIBLE_WORK_PARTIAL_COVERAGE');
 assert.equal(x.unreadable_conversations,2);
});
test('owner mismatch is rejected before any candidate proposal',()=>{
 assert.throws(()=>projectAuthenticatedSelfImprovement({
  session,job,goal:{...goal,principal_id:randomUUID()},env
 }),/SELF_IMPROVEMENT_OWNER_GOAL_UNVERIFIED/);
});
test('other conversation identity is not allowed to inherit owner goal',()=>{
 assert.throws(()=>projectAuthenticatedSelfImprovement({
  session,job:{...job,conversation_id:randomUUID()},goal,env
 }),/SELF_IMPROVEMENT_OWNER_GOAL_UNVERIFIED/);
});
test('assistant proposals are not user-confirmed goals',()=>{
 assert.throws(()=>projectAuthenticatedSelfImprovement({
  session,job,goal:{...goal,state:{...goal.state,
   active_goal:{...goal.state.active_goal,user_confirmed:false}}},env
 }),/SELF_IMPROVEMENT_OWNER_GOAL_UNVERIFIED/);
});
test('expired or missing provenance cannot initialize self-improvement',()=>{
 for(const patch of [{source_user_message_ref:null},
  {last_transition_receipt_id:'fake'}]){
  assert.throws(()=>projectAuthenticatedSelfImprovement({
   session,job,goal:{...goal,state:{...goal.state,active_goal:{
    ...goal.state.active_goal,...patch}}},env}),
   /SELF_IMPROVEMENT_GOAL_PROVENANCE_UNVERIFIED/);
 }
});
test('incorrect canonical Continuity lineage is rejected',()=>{
 assert.throws(()=>projectAuthenticatedSelfImprovement({
  session,job,goal:{...goal,state:{...goal.state,continuity_root_id:randomUUID()}},env
 }),/SELF_IMPROVEMENT_CANONICAL_SCOPE_MISMATCH/);
});
test('fabricated completed job or unverified tracking action cannot become active self-improvement',()=>{
 for(const patch of [{job_completed:true},{action_completed:false},
 {original_work_id:'work:'+'f'.repeat(32)},
 {issue_url:'https://github.com/another/repo/issues/143'}]){
  assert.throws(()=>projectAuthenticatedSelfImprovement({
   session,job:{...job,...patch},goal,env
  }),/SELF_IMPROVEMENT_ORIGINAL_JOB_NOT_GROUNDED/);
 }
});
test('developer preview and trusted release reference are mandatory',async()=>{
 await assert.rejects(inspectAuthenticatedSelfImprovement({
  session,env:{...env,VERCEL_ENV:'production'},...sources()
 }),/SELF_IMPROVEMENT_AUTHENTICATED_PREVIEW_REQUIRED/);
 assert.throws(()=>projectAuthenticatedSelfImprovement({
  session,job,goal,env:{...env,VERCEL_GIT_COMMIT_SHA:''}
 }),/SELF_IMPROVEMENT_TRUSTED_RELEASE_REF_REQUIRED/);
});
test('untrusted unfinished list may not assert authority for the driver',async()=>{
 await assert.rejects(inspectAuthenticatedSelfImprovement({
  session,env,listWork:async()=>({execution_authorized:true,jobs:[job]}),
  readGoal:async()=>goal,
 }),/SELF_IMPROVEMENT_UNFINISHED_READBACK_INVALID/);
});
test('the authenticated gateway is read-only: no POST, no client work or owner scope',()=>{
 const source=readFileSync('api/reality/personal-self-improvement.js','utf8');
 assert.match(source,/authenticatedChatSession/);
 assert.match(source,/privateChatConfig/);
 assert.match(source,/req\.method!=='GET'/);
 assert.match(source,/SELF_IMPROVEMENT_CLIENT_SCOPE_NOT_ACCEPTED/);
 assert.doesNotMatch(source,/executeSelfBuild|githubPost|publishPrivateAssistantAtomically|completeOriginal143OwnerAction/);
});
