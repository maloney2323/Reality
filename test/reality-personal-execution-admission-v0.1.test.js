import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {bindWorkToAuthenticatedGoal} from '../src/reality-execution-goal-grounding-v0.1.js';
import {issuePersonalWorkGroundingProof}
 from '../src/reality-personal-work-grounding-proof-v0.1.js';
import {createAuthorityPolicy,fingerprintApprovedWorkItem}
 from '../src/reality-authority-v1.0.js';
import {prepareAuthenticatedPersonalExecution}
 from '../src/reality-personal-execution-admission-service-v0.1.js';
import admissionApi from '../api/reality/personal-execution-admission.js';
const ref='hvkfreoagbrphwghjajw';
const env={
 VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:ref,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:ref,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:'https://'+ref+'.supabase.co',
 REALITY_UNIVERSE_PERSISTENCE_KEY:'test-only-database-secret',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:ref,
 REALITY_PERSONAL_CHAT_SUPABASE_URL:'https://'+ref+'.supabase.co',
 REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY:'sb_publishable_test_only',
 REALITY_CHAT_RECEIPT_HMAC_KEY:'test-only-signed-goal-authority-000000000000000000000',
};
Object.assign(process.env,env);
const user=randomUUID(),conversation=randomUUID();
const workItem={
  work_item_id:'wi:123',workflow_id:'wf:123',
  connector:'github',operation:'create_issue',
  resource:'maloney2323/Reality',consequential:true,
  action:'Create exact authorized issue',
  inputs:{repository:'maloney2323/Reality',title:'Test subject'},
};
const state=()=>{
 const receipt='user-goal-receipt:test';
 return {
  principal_id:user,continuity_root_id:'root:confirmed',world_id:'world:confirmed',
  authority_source:'AUTHENTICATED_RLS_USER_GOAL_COMMAND_AND_LEDGER_READBACK',
  assistant_can_mutate_goals:false,semantic_reviewer_can_mutate_goals:false,
  external_execution_authorized:false,transition_count:1,
  active_goal_id:'goal:confirmed',
  active_goal:{goal_id:'goal:confirmed',status:'ACTIVE',
   source_user_message_ref:'supabase:reality_chat_messages:'+randomUUID(),
   last_transition_receipt_id:receipt,user_confirmed:true,
   external_execution_authorized:false},
  recent_transition_receipts:[{event_id:receipt,principal_id:user,confirmed_by_user:true}],
 };
};
function setup(){
 const latest=state(),session={user_id:user,config:{url:env.REALITY_PERSONAL_CHAT_SUPABASE_URL}};
 const binding=bindWorkToAuthenticatedGoal({
  workItem,authoritativeState:latest,serverVerifiedPrincipalId:user,
 });
 const groundingProof=issuePersonalWorkGroundingProof({
  binding,principalId:user,conversationId:conversation,env,
 });
 const base=createAuthorityPolicy({
  principalId:user,mode:'auto',expiresAt:new Date(Date.now()+90000).toISOString(),
  scopes:[{connector:'github',operation:'create_issue',
   resource:'maloney2323/Reality',work_item_id:workItem.work_item_id,
   work_item_fingerprint:fingerprintApprovedWorkItem(workItem)}],
 });
 const policy={...base,goal_binding:{
  version:'reality-personal-action-authority-v0.1',
  user_confirmation:'APPROVE_THIS_EXACT_WORK_ITEM',
  principal_id:user,conversation_id:conversation,
  goal_id:binding.goal_id,goal_revision:binding.goal_revision,
  goal_transition_receipt_id:binding.goal_transition_receipt_id,
  continuity_root_id:binding.continuity_root_id,world_id:binding.world_id,
  goal_source_user_message_ref:binding.goal_source_user_message_ref,
  work_item_fingerprint:binding.work_item_fingerprint,
 }};
 return {latest,session,groundingProof,policy,binding};
}
function args(x){
 return {session:x.session,conversationId:conversation,workItem,
  groundingProof:x.groundingProof,env,
  readGoal:async()=>({state:x.latest}),loadPolicy:async()=>x.policy};
}
test('authenticated current goal + separate exact approval produce admission but never execute',async()=>{
 const x=setup();
 const r=await prepareAuthenticatedPersonalExecution(args(x));
 assert.equal(r.status,'GOAL_AND_ACTION_ADMITTED_PENDING_EXECUTION_LEASE');
 assert.equal(r.goal_id,x.binding.goal_id);
 assert.equal(r.execution_authorized,false);
 assert.equal(r.external_action_performed,false);
 assert.equal(r.durable_execution_lease_verified,false);
 assert.equal(r.internal.serverFreshGoalAdmission.principal_id,user);
});
test('old policy without goal binding cannot be reused in authenticated execution',async()=>{
 const x=setup();
 await assert.rejects(prepareAuthenticatedPersonalExecution({
  ...args(x),loadPolicy:async()=>({...x.policy,goal_binding:null}),
 }),/PERSONAL_EXECUTION_PERSISTED_GOAL_BOUND_APPROVAL_REQUIRED/);
});
test('fresh ledger revision changed since authorization fails closed',async()=>{
 const x=setup();
 const changed={...x.latest,transition_count:2,
  active_goal:{...x.latest.active_goal,last_transition_receipt_id:'receipt:later'},
  recent_transition_receipts:[{event_id:'receipt:later',principal_id:user,confirmed_by_user:true}]};
 await assert.rejects(prepareAuthenticatedPersonalExecution({
  ...args(x),readGoal:async()=>({state:changed}),
 }),/GOAL_GROUNDING_GOAL_REVISION_STALE/);
});
test('different signed-in principal and project never receive an old admission',async()=>{
 const x=setup();
 await assert.rejects(prepareAuthenticatedPersonalExecution({
  ...args(x),session:{user_id:randomUUID(),config:x.session.config},
 }),/GOAL_BINDING_PROOF_SCOPE_MISMATCH/);
 await assert.rejects(prepareAuthenticatedPersonalExecution({
  ...args(x),session:{user_id:user,config:{url:'https://untrusted.supabase.co'}},
 }),/PERSONAL_EXECUTION_ISOLATED_AUTHORITY_PROJECT_REQUIRED/);
});
test('failed ledger reconstruction cannot turn into implied approval',async()=>{
 const x=setup();
 await assert.rejects(prepareAuthenticatedPersonalExecution({
  ...args(x),readGoal:async()=>{throw Error('CONTINUITY_READBACK_UNAVAILABLE')},
 }),/CONTINUITY_READBACK_UNAVAILABLE/);
});
function response(){
 const state={status:200,payload:null};const res={
  setHeader:()=>res,status(n){state.status=n;return res},
  json(body){state.payload=body;return res},
 };
 return {res,state};
}
test('preview admission endpoint rejects clients pretending to supply approval',async()=>{
 const {res,state}=response();
 await admissionApi({method:'POST',headers:{
  origin:'https://example.test',host:'example.test','content-type':'application/json',
 },body:{conversation_id:conversation,work_item:workItem,
  authorization:{authorized:true}}},res);
 assert.equal(state.status,400);
 assert.equal(state.payload.error,'PERSONAL_EXECUTION_CLIENT_AUTHORITY_REJECTED');
 assert.equal(state.payload.external_action_performed,false);
});
test('preview admission endpoint refuses missing request origin',async()=>{
 const {res,state}=response();
 await admissionApi({method:'POST',headers:{
  host:'example.test','content-type':'application/json',
 },body:{conversation_id:conversation,work_item:workItem}},res);
 assert.equal(state.status,403);
 assert.equal(state.payload.external_action_performed,false);
});
