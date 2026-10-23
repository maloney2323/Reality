import test from 'node:test';
import assert from 'node:assert/strict';
import {createStandaloneConversationScope} from '../src/reality-standalone-auth-v0.1.js';
import {observeUserConditions} from '../src/reality-obligation-observation-v0.1.js';
import {getAuthenticatedStandaloneObligations} from '../src/reality-standalone-obligations-v0.1.js';

const owner='e83340ec-4266-4c95-a6cd-929bc58b445e';
const env={
 SUPABASE_URL:'https://reality-example.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_public_key',
 REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',REALITY_STANDALONE_CHAT_ENABLED:'true',
 REALITY_STANDALONE_OBLIGATION_OBSERVATION_ENABLED:'true',
 REALITY_STANDALONE_EXPECTED_PROJECT_REF:'reality-example',
 REALITY_UNIVERSE_PERSISTENCE_URL:'https://reality-example.supabase.co',
 REALITY_UNIVERSE_PERSISTENCE_KEY:'sb_secret_TEST_ONLY_NOT_REAL_abcdefgh123456789',
 REALITY_STANDALONE_OPENAI_API_KEY:'sk-TEST_ONLY_NOT_REAL_abcdefgh123456789',
 REALITY_OPENAI_MODEL:'gpt-4.1-mini',VERCEL_ENV:'preview',
};
const request=(changes={})=>({
 method:'GET',headers:{authorization:'Bearer signed-session-test-token'},
 query:{conversation_id:'construction-job-1',thought_id:'personal'},...changes,
});
const fetchFor=(userId=owner)=>async()=>({ok:true,status:200,json:async()=>({id:userId,is_anonymous:false})});
const s=createStandaloneConversationScope({userId:owner,conversationId:'construction-job-1'});
const source=observeUserConditions({
 trustedScope:{owner_user_id:owner,continuity_root_id:s.continuity_root_id,
  worldline_id:s.worldline_id,work_item_id:'conversation:'+s.client_conversation_selector},
 userSignal:{entry_id:'real-message-evidence:01',turn_id:'turn1',
  text:'For the construction job, do not send the estimate until the homeowner approves it.'},
 observedAt:'2026-10-23T16:40:00Z',
});
test('read-only GET derives authenticated scope, not caller identity, and returns immutable condition receipt',async()=>{
 let reads=0;
 const res=await getAuthenticatedStandaloneObligations(request(),{
  env,fetchImpl:fetchFor(),load:async q=>{
   reads++;
   assert.equal(q.continuityRootId,s.continuity_root_id);
   assert.equal(q.eventKind,'USER_STATED_CONDITION_OBSERVATION');
   return {status:'AVAILABLE',entries:source};
  },
 });
 assert.equal(reads,1);
 assert.equal(res.scoped_observation_count,1);
 assert.equal(res.observed_conditions[0].condition_text,'the homeowner approves it');
 assert.equal(res.full_history_verified,false);
 assert.equal(res.model_hallucination_percentage,null);
 assert.equal(res.external_action_executed,false);
});
test('different verified user with identical selector never sees another owner receipt',async()=>{
 const different=await getAuthenticatedStandaloneObligations(request(),{
  env,fetchImpl:fetchFor('f44440ec-4266-4c95-a6cd-929bc58b445f'),
  load:async()=>({status:'AVAILABLE',entries:source}),
 });
 assert.equal(different.scoped_observation_count,0);
});
test('unsafe identity selectors do not make a database request',async()=>{
 let called=false;
 await assert.rejects(()=>getAuthenticatedStandaloneObligations(request({
  query:{conversation_id:'construction-job-1',claimed_owner_user_id:owner},
 }),{env,fetchImpl:fetchFor(),load:async()=>{called=true}}),/STANDALONE_OBLIGATION_SELECTOR_INVALID/);
 assert.equal(called,false);
});
test('missing session fails before persistence read',async()=>{
 let called=false;
 await assert.rejects(()=>getAuthenticatedStandaloneObligations(request(),{
  env,fetchImpl:async()=>({ok:false,status:401,json:async()=>({})}),
  load:async()=>{called=true},
 }),/AUTHENTICATED_SESSION_INVALID/);
 assert.equal(called,false);
});
test('production, disabled flag and unsupported server setup do not open evidence',async()=>{
 for(const e of [{...env,VERCEL_ENV:'production'},{
  ...env,REALITY_STANDALONE_OBLIGATION_OBSERVATION_ENABLED:'false',
 }]){
  let called=false;
  await assert.rejects(()=>getAuthenticatedStandaloneObligations(request(),{
   env:e,fetchImpl:async()=>{called=true},load:async()=>{called=true}
  }));
  assert.equal(called,false);
 }
});
