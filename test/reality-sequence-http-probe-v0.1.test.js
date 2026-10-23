import test from 'node:test';
import assert from 'node:assert/strict';
import {probeConversationSequenceHTTP} from '../src/reality-conversation-sequencer-v0.1.js';
const ref='reality-preview-project';
const env={
 VERCEL_ENV:'preview',
 REALITY_STANDALONE_EXPECTED_PROJECT_REF:ref,
 SUPABASE_URL:'https://'+ref+'.supabase.co',
 REALITY_UNIVERSE_PERSISTENCE_URL:'https://'+ref+'.supabase.co',
 REALITY_UNIVERSE_PERSISTENCE_KEY:'sb_secret_TEST_ONLY_NOT_REAL_abcd1234_abcd1234',
};
const origin=env.SUPABASE_URL;
function fixture({wrongFunction=false,deny=false}={}){
 const requests=[];
 const fetchImpl=async(url,options)=>{
  requests.push({url,options});
  assert.equal(options.headers.apikey,env.REALITY_UNIVERSE_PERSISTENCE_KEY);
  assert.equal(Object.hasOwn(options.headers,'Authorization'),false);
  if(url.startsWith(origin+'/rest/v1/reality_conversation_turn_fences?')){
   assert.equal(options.method,'GET');
   assert.match(url,/limit=0/);
   return {ok:!deny,status:deny?403:200,json:async()=>[]};
  }
  assert.equal(options.method,'POST');
  const payload=JSON.parse(options.body);
  if(url.endsWith('/reality_claim_conversation_turn')){
   assert.equal(payload.p_root_id,'x');
   assert.equal(payload.p_owner_user_id,'00000000-0000-0000-0000-000000000000');
   return {ok:false,status:400,json:async()=>({
    message:wrongFunction?'FUNCTION_NOT_FOUND':'REALITY_SEQUENCE_INPUT_INVALID'})};
  }
  if(url.endsWith('/reality_reconcile_committed_conversation_turn')){
   assert.equal(payload.p_turn_id,'');
   assert.equal(payload.p_commit_hash,'');
   return {ok:false,status:400,json:async()=>({
    message:'REALITY_RECONCILIATION_INPUT_INVALID'})};
  }
  throw Error('unexpected SQL request');
 };
 return {fetchImpl,requests};
}
test('real API verifier probes only read-only fence and invalid-input RPCs',async()=>{
 const f=fixture();
 const result=await probeConversationSequenceHTTP({env,fetchImpl:f.fetchImpl});
 assert.equal(result.ok,true);
 assert.equal(result.status,'REAL_HTTP_API_EXECUTION_VERIFIED');
 assert.equal(result.sequencing_enabled,false);
 assert.equal(result.customer_session_verified,false);
 assert.equal(result.no_write_inputs,true);
 assert.equal(f.requests.length,3);
 assert.deepEqual(f.requests.map(x=>x.options.method),['GET','POST','POST']);
});
test('provider denial, missing RPC and wrong project fail closed without enabling sequencing',async()=>{
 for(const bad of [{wrongFunction:true},{deny:true}]){
  const f=fixture(bad);
  await assert.rejects(()=>probeConversationSequenceHTTP({env,fetchImpl:f.fetchImpl}),
   /SEQUENCE_PROBE_.*(?:WRONG_RESPONSE|DENIED)/);
 }
 const f=fixture();
 await assert.rejects(()=>probeConversationSequenceHTTP({
  env:{...env,SUPABASE_URL:'https://other.supabase.co'},fetchImpl:f.fetchImpl,
 }),/SEQUENCE_DATABASE_PROJECT_MISMATCH/);
 await assert.rejects(()=>probeConversationSequenceHTTP({
  env:{...env,VERCEL_ENV:'production'},fetchImpl:f.fetchImpl,
 }),/SEQUENCE_PROBE_PREVIEW_ONLY/);
 assert.equal(f.requests.length,0);
});
