import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { bindWorkToAuthenticatedGoal }
 from '../src/reality-execution-goal-grounding-v0.1.js';
import { issuePersonalWorkGroundingProof }
 from '../src/reality-personal-work-grounding-proof-v0.1.js';
import { policyMatchesGoalBoundWork,recordAuthenticatedPersonalActionApproval }
 from '../src/reality-personal-action-authority-v0.1.js';
import { createAuthorityPolicy,fingerprintApprovedWorkItem,autoAuthorize,issueBoundExecutionApproval }
 from '../src/reality-authority-v1.0.js';
import { issueFreshGoalExecutionAdmission }
 from '../src/reality-fresh-goal-execution-admission-v0.1.js';
import approvalApi from '../api/reality/personal-action-authority.js';

const env={
 VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw',
 REALITY_CHAT_RECEIPT_HMAC_KEY:'unit-test-exact-authority-signing-not-a-production-secret-0000',
 REALITY_PERSONAL_CHAT_SUPABASE_URL:'https://hvkfreoagbrphwghjajw.supabase.co',
 REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY:'sb_publishable_test_only',
};
Object.assign(process.env,env);
const user=randomUUID(),conversation=randomUUID();
const workItem={work_item_id:'work:123',workflow_id:'workflow:123',
  connector:'github',operation:'create_issue',consequential:true,
  resource:'maloney2323/Reality',action:'Create exactly approved issue',
  inputs:{repository:'maloney2323/Reality',title:'Example scoped task'}};
function state(){
 const goal='user-goal:'+randomUUID();
 const source='supabase:reality_chat_messages:'+randomUUID();
 const receipt='receipt:'+randomUUID();
 return {
  principal_id:user,continuity_root_id:'root:verified',
  world_id:'personal:world',active_goal_id:goal,transition_count:1,
  authority_source:'AUTHENTICATED_RLS_USER_GOAL_COMMAND_AND_LEDGER_READBACK',
  assistant_can_mutate_goals:false,semantic_reviewer_can_mutate_goals:false,
  external_execution_authorized:false,
  active_goal:{goal_id:goal,status:'ACTIVE',user_confirmed:true,
    source_user_message_ref:source,last_transition_receipt_id:receipt,
    external_execution_authorized:false},
  recent_transition_receipts:[{event_id:receipt,principal_id:user,confirmed_by_user:true}],
 };
}
function setup(){
 const latest=state();
 const binding=bindWorkToAuthenticatedGoal({
  workItem,authoritativeState:latest,serverVerifiedPrincipalId:user,
 });
 assert.equal(binding.status,'BOUND_FOR_FRESHNESS_CHECK');
 const groundingProof=issuePersonalWorkGroundingProof({
  binding,principalId:user,conversationId:conversation,env,
 });
 return {latest,binding,groundingProof,session:{user_id:user,
   config:{url:env.REALITY_PERSONAL_CHAT_SUPABASE_URL}}};
}
function storage(){
 let saved=null;
 return {
  appendEvent:async e=>{saved=e},
  reconstruct:async()=>saved?[saved]:[],
  get latest(){return saved},
 };
}
test('explicit authenticated approval is durably read back with exact goal revision',async()=>{
 const x=setup(),store=storage();
 const result=await recordAuthenticatedPersonalActionApproval({
  session:x.session,conversationId:conversation,workItem,
  groundingProof:x.groundingProof,confirmedAction:'APPROVE_THIS_EXACT_WORK_ITEM',
  env,readGoal:async()=>({state:x.latest}),persistence:store,
 });
 assert.equal(result.action_approved_for_this_exact_goal,true);
 assert.equal(result.external_action_performed,false);
 assert.equal(store.latest.payload.goal_binding.goal_id,x.binding.goal_id);
 assert.equal(store.latest.payload.goal_binding.goal_transition_receipt_id,
  x.binding.goal_transition_receipt_id);
 assert.equal(policyMatchesGoalBoundWork({
  policy:store.latest.payload,workItem,binding:x.binding,
  principalId:user,conversationId:conversation,
 }),true);
});
test('approval denial for unsigned human confirmation',async()=>{
 const x=setup();
 await assert.rejects(recordAuthenticatedPersonalActionApproval({
  session:x.session,conversationId:conversation,workItem,
  groundingProof:x.groundingProof,confirmedAction:'assistant-approved',
  env,readGoal:async()=>({state:x.latest}),persistence:storage(),
 }),/PERSONAL_ACTION_EXPLICIT_USER_CONFIRMATION_REQUIRED/);
});
test('approval denial if the verified goal changed since prepare',async()=>{
 const x=setup(),s={...x.latest,transition_count:2,
  active_goal:{...x.latest.active_goal,last_transition_receipt_id:'receipt:new'},
  recent_transition_receipts:[{event_id:'receipt:new',principal_id:user,confirmed_by_user:true}],
 };
 await assert.rejects(recordAuthenticatedPersonalActionApproval({
  session:x.session,conversationId:conversation,workItem,
  groundingProof:x.groundingProof,confirmedAction:'APPROVE_THIS_EXACT_WORK_ITEM',
  env,readGoal:async()=>({state:s}),persistence:storage(),
 }),/GOAL_GROUNDING_GOAL_REVISION_STALE/);
});
test('tampered action inputs cannot reuse the goal-bound human approval',async()=>{
 const x=setup(),changed={...workItem,inputs:{...workItem.inputs,title:'Different'}};
 await assert.rejects(recordAuthenticatedPersonalActionApproval({
  session:x.session,conversationId:conversation,workItem:changed,
  groundingProof:x.groundingProof,confirmedAction:'APPROVE_THIS_EXACT_WORK_ITEM',
  env,readGoal:async()=>({state:x.latest}),persistence:storage(),
 }),/GOAL_GROUNDING_WORK_ITEM_CHANGED/);
});
test('old generic policy cannot mint a fresh goal execution admission',()=>{
 const x=setup();
 const generic=createAuthorityPolicy({principalId:user,mode:'auto',
  scopes:[{connector:workItem.connector,operation:workItem.operation,
   work_item_id:workItem.work_item_id,
   work_item_fingerprint:fingerprintApprovedWorkItem(workItem)}]});
 const authorization=autoAuthorize({policy:generic,workItem});
 const serverApprovalProof=issueBoundExecutionApproval({
  policy:generic,workItem,authorization,principalId:user,
 });
 assert.throws(()=>issueFreshGoalExecutionAdmission({
  workItem,groundingProof:x.groundingProof,
  latestAuthoritativeState:x.latest,principalId:user,
  conversationId:conversation,policy:generic,authorization,
  serverApprovalProof,env,
 }),/EXECUTION_GOAL_BOUND_ACTION_POLICY_REQUIRED/);
});
test('policy from another goal or another conversation cannot be used',()=>{
 const x=setup();
 const policy=createAuthorityPolicy({principalId:user,mode:'auto',
  scopes:[{connector:workItem.connector,operation:workItem.operation,
   work_item_id:workItem.work_item_id,
   work_item_fingerprint:fingerprintApprovedWorkItem(workItem)}]});
 const forged={...policy,goal_binding:{
   version:'reality-personal-action-authority-v0.1',
   user_confirmation:'APPROVE_THIS_EXACT_WORK_ITEM',
   principal_id:user,conversation_id:randomUUID(),
   goal_id:x.binding.goal_id,goal_revision:x.binding.goal_revision,
   goal_transition_receipt_id:x.binding.goal_transition_receipt_id,
   continuity_root_id:x.binding.continuity_root_id,
   world_id:x.binding.world_id,
   goal_source_user_message_ref:x.binding.goal_source_user_message_ref,
   work_item_fingerprint:x.binding.work_item_fingerprint,
 }};
 assert.equal(policyMatchesGoalBoundWork({
  policy:forged,workItem,binding:x.binding,
  principalId:user,conversationId:conversation,
 }),false);
});
function response(){
 const state={status:200,body:null};const r={
  setHeader:()=>r,status(n){state.status=n;return r},
  json(b){state.body=b;return r}};
 return {r,state};
}
test('approval endpoint refuses missing Origin before DB or auth',async()=>{
 const {r,state}=response();
 await approvalApi({method:'POST',headers:{
  'content-type':'application/json',host:'example.test'
 },body:{conversation_id:conversation,work_item:workItem,
  confirmation:'APPROVE_THIS_EXACT_WORK_ITEM'}},r);
 assert.equal(state.status,403);
 assert.equal(state.body.external_action_performed,false);
});
test('approval endpoint refuses raw client authority fields',async()=>{
 const {r,state}=response();
 await approvalApi({method:'POST',headers:{
  origin:'https://example.test',host:'example.test','content-type':'application/json'
 },body:{conversation_id:conversation,work_item:workItem,
  confirmation:'APPROVE_THIS_EXACT_WORK_ITEM',
  authorization:{authorized:true}}},r);
 assert.equal(state.status,400);
 assert.equal(state.body.error,'ACTION_APPROVAL_CLIENT_AUTHORITY_NOT_TRUSTED');
});
