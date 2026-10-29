import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import groundingApi from '../api/reality/personal-work-grounding.js';
import {personalGoalScope,readFreshPersonalGoalState}
 from '../src/reality-personal-goal-readback-v0.1.js';
import {bindWorkToAuthenticatedGoal}
 from '../src/reality-execution-goal-grounding-v0.1.js';
import {issuePersonalWorkGroundingProof,verifyPersonalWorkGroundingProof}
 from '../src/reality-personal-work-grounding-proof-v0.1.js';

const ref='hvkfreoagbrphwghjajw';
const url='https://'+ref+'.supabase.co';
const env={
 VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:ref,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:ref,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:url,
 REALITY_UNIVERSE_PERSISTENCE_KEY:'unit-test-only-not-real',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:ref,
 REALITY_PERSONAL_CHAT_SUPABASE_URL:url,
 REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY:'sb_publishable_test_only',
 REALITY_CHAT_RECEIPT_HMAC_KEY:'unit-test-nonproduction-personal-work-goal-hmac-key-0000',
};
Object.assign(process.env,env);
const user=randomUUID(),conversation=randomUUID();
const workItem={work_item_id:'w1',workflow_id:'f1',
 connector:'github',operation:'create_issue',resource:'owner/repo',
 action:'Create issue for current verified project',
 inputs:{repository:'owner/repo',title:'Current task'},consequential:true};
const fakeState=()=>{
 const scope=personalGoalScope({userId:user,conversationId:conversation});
 return {
  principal_id:user,continuity_root_id:scope.root,world_id:scope.world,
  authority_source:'AUTHENTICATED_RLS_USER_GOAL_COMMAND_AND_LEDGER_READBACK',
  transition_count:1,active_goal_id:'user-goal:1',
  assistant_can_mutate_goals:false,semantic_reviewer_can_mutate_goals:false,
  external_execution_authorized:false,
  active_goal:{goal_id:'user-goal:1',status:'ACTIVE',user_confirmed:true,
    source_user_message_ref:'supabase:reality_chat_messages:'+randomUUID(),
    last_transition_receipt_id:'receipt:1',external_execution_authorized:false},
  recent_transition_receipts:[{event_id:'receipt:1',
    confirmed_by_user:true,principal_id:user}],
 };
};
function mockRes(){
 let status=200,payload=null;
 const r={setHeader(){return r},status(x){status=x;return r},
  json(x){payload=x;return r}};
 return {r,result:()=>({status,payload})};
}
function request(body,{origin='https://example.test',cookie=''}={}){
 return {method:'POST',headers:{origin,host:'example.test',
  'content-type':'application/json',cookie},body};
}
test('scope is derived from authenticated principal plus conversation (not supplied goal)',()=>{
 const one=personalGoalScope({userId:user,conversationId:conversation});
 const two=personalGoalScope({userId:randomUUID(),conversationId:conversation});
 assert.notEqual(one.root,two.root);
 assert.equal(one.root,one.worldline);
 assert.throws(()=>personalGoalScope({userId:'attacker',conversationId:conversation}));
});
test('isolated authenticated readback refuses production, wrong project, missing user',async()=>{
 await assert.rejects(readFreshPersonalGoalState({
  session:{user_id:user,config:{url}},conversationId:conversation,
  env:{...env,VERCEL_ENV:'production'},
 }),/PERSONAL_GOAL_PREVIEW_DURABILITY_REQUIRED/);
 await assert.rejects(readFreshPersonalGoalState({
  session:{user_id:user,config:{url:'https://other.supabase.co'}},
  conversationId:conversation,env,
 }),/PERSONAL_GOAL_ISOLATED_PROJECT_MISMATCH/);
 await assert.rejects(readFreshPersonalGoalState({
  session:{user_id:'attacker',config:{url}},conversationId:conversation,env,
 }),/PERSONAL_GOAL_AUTHENTICATED_SCOPE_INVALID/);
});
test('missing user-authored goal in genuine empty Continuity readback cannot prepare external execution',async()=>{
 let readCount=0;
 const latest=await readFreshPersonalGoalState({
  session:{user_id:user,config:{url}},conversationId:conversation,env,
  createPersistence:()=>({reconstruct:async()=>{readCount++;return []}}),
 });
 assert.equal(readCount,1);
 assert.equal(latest.state.active_goal_id,null);
 assert.equal(bindWorkToAuthenticatedGoal({
  workItem,authoritativeState:latest.state,serverVerifiedPrincipalId:user,
 }).status,'BLOCKED');
 assert.equal(latest.action_authorized_by_readback,false);
});
test('signed candidate goal/work proof is non-executing and recheckable',()=>{
 const binding=bindWorkToAuthenticatedGoal({
  workItem,authoritativeState:fakeState(),serverVerifiedPrincipalId:user,
 });
 assert.equal(binding.status,'BOUND_FOR_FRESHNESS_CHECK');
 const proof=issuePersonalWorkGroundingProof({
  binding,conversationId:conversation,principalId:user,env,now:1000000,
 });
 const valid=verifyPersonalWorkGroundingProof({
  proof,conversationId:conversation,principalId:user,env,now:1001000,
 });
 assert.equal(valid.status,'PROOF_VALID_FOR_FRESHNESS_ONLY');
 assert.equal(valid.action_authorized,false);
 assert.equal(proof.grants_external_execution,false);
});
test('changing proof contents, identity, conversation, or time fails closed',()=>{
 const binding=bindWorkToAuthenticatedGoal({
  workItem,authoritativeState:fakeState(),serverVerifiedPrincipalId:user,
 });
 const proof=issuePersonalWorkGroundingProof({
  binding,conversationId:conversation,principalId:user,env,now:1000000,
 });
 assert.equal(verifyPersonalWorkGroundingProof({
  proof:{...proof,binding:{...binding,goal_id:'different'}},
  conversationId:conversation,principalId:user,env,now:1001000,
 }).reason,'GOAL_BINDING_PROOF_INVALID');
 assert.equal(verifyPersonalWorkGroundingProof({
  proof,conversationId:conversation,principalId:randomUUID(),env,now:1001000,
 }).reason,'GOAL_BINDING_PROOF_SCOPE_MISMATCH');
 assert.equal(verifyPersonalWorkGroundingProof({
  proof,conversationId:randomUUID(),principalId:user,env,now:1001000,
 }).reason,'GOAL_BINDING_PROOF_SCOPE_MISMATCH');
 assert.equal(verifyPersonalWorkGroundingProof({
  proof,conversationId:conversation,principalId:user,env,now:1300000,
 }).reason,'GOAL_BINDING_PROOF_EXPIRED');
});
test('API rejects missing origin before reading session or database',async()=>{
 const {r,result}=mockRes();
 await groundingApi(request({intent:'PREPARE',conversation_id:conversation,work_item:workItem},
  {origin:null}),r);
 assert.equal(result().status,403);
 assert.equal(result().payload.external_action_performed,false);
});
test('API never trusts caller-supplied authorization/connector bridges',async()=>{
 const {r,result}=mockRes();
 await groundingApi(request({intent:'PREPARE',conversation_id:conversation,
  work_item:workItem,authorization:{authorized:true}}),r);
 assert.equal(result().payload.error,'PERSONAL_GROUNDING_CLIENT_AUTHORITY_REJECTED');
 assert.equal(result().payload.external_action_performed,false);
});
test('API blocks structural goal mutation before any session or provider access',async()=>{
 const {r,result}=mockRes();
 await groundingApi(request({intent:'PREPARE',conversation_id:conversation,
  work_item:{...workItem,goal_mutations:[{operation:'SET_ACTIVE'}]}}),r);
 assert.equal(result().payload.status,'BLOCKED');
 assert.equal(result().payload.external_action_performed,false);
});
test('API cannot silently identify generic signed cookie as a Supabase authenticated user',async()=>{
 const {r,result}=mockRes();
 await groundingApi(request({intent:'PREPARE',conversation_id:conversation,
  work_item:workItem},{cookie:'reality_principal=forged-session'}),r);
 assert.equal(result().status,401);
 assert.equal(result().payload.error,'CHAT_SIGN_IN_REQUIRED');
});
