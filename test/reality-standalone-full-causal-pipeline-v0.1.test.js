// Zero-cost integration: actual Signal Cleaner, Universe, Continuity, Verifier,
// model gateway and Causal Turn Commit. Only HTTP providers and atomic SQL are
// deterministic in-memory fakes; this is NOT a real LLM benchmark.
import test from 'node:test';
import assert from 'node:assert/strict';
import {processCausalTurn,inspectCausalTurn,causalTurnIds} from '../src/reality-causal-turn-commit-v0.1.js';
import {createStandaloneConversationScope} from '../src/reality-standalone-auth-v0.1.js';
import {validateUniverseEntry} from '../src/reality-universe-persistence-contract-v1.0.js';
import {restoreCanonicalUniverseRow} from '../src/reality-native-universe-persistence-v1.0.js';

const user='d7402530-9fd3-44de-b799-1900e619b7f3';
const base='https://reality-example.supabase.co';
const env={
 VERCEL_ENV:'preview',SUPABASE_URL:base,
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_fake_public_key',
 REALITY_STANDALONE_EXPECTED_PROJECT_REF:'reality-example',
 REALITY_UNIVERSE_PERSISTENCE_URL:base,
 REALITY_UNIVERSE_PERSISTENCE_KEY:'sb_secret_TEST_NOT_A_REAL_SECRET_123456789',
 REALITY_STANDALONE_OPENAI_API_KEY:'sk-TEST_NOT_A_REAL_PROVIDER_KEY_123456789',
 REALITY_OPENAI_MODEL:'gpt-4.1-mini',
 REALITY_STANDALONE_CHAT_ENABLED:'true',
 REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CAUSAL_SEQUENCE_ENABLED:'true',
};
const makeReq=(n,message)=>({
 headers:{authorization:'Bearer test-only-jwt-not-a-real-session-token'},
 body:{conversation_id:'full-pipeline-contract',thought_id:'personal',
  turn_id:'turn-'+n,message},
});
test('whole authenticated 2-turn pipeline commits and independently reads each receipt, without duplicate generation',async()=>{
 const prev={};
 for(const key of ['REALITY_UNIVERSE_PERSISTENCE_ENABLED','REALITY_UNIVERSE_PERSISTENCE_URL',
  'REALITY_UNIVERSE_PERSISTENCE_KEY']){prev[key]=process.env[key];process.env[key]=env[key]}
 const records=new Map(),calls={model:0,claim:0,finish:0},root=createStandaloneConversationScope({
  userId:user,conversationId:'full-pipeline-contract'});
 let active=null,seq=0,last=null,millisecond=0;
 const now=()=>new Date(Date.parse('2026-10-23T06:00:00.000Z')+(millisecond++)*100).toISOString();
 const fetchImpl=async(url,opts={})=>{
  const u=new URL(url);
  if(u.origin===base && u.pathname==='/auth/v1/user')
   return {ok:true,status:200,json:async()=>({id:user,is_anonymous:false})};
  if(u.hostname==='api.openai.com'){
   calls.model++;
   const answer=calls.model===1
    ?'The $12,500 estimate stays a draft until the homeowner approves the final scope. No message has been sent.'
    :'The original homeowner approval requirement is still binding. No send was authorized.';
   return {ok:true,status:200,json:async()=>({
    id:'synthetic-'+calls.model,status:'completed',output_text:answer,
   })};
  }
  if(u.origin!==base||u.pathname!=='/rest/v1/reality_universe_entries')
   throw Error('UNEXPECTED_NETWORK_DESTINATION:'+u.origin+u.pathname);
  if(opts.method==='POST'){
   const e=JSON.parse(opts.body);
   validateUniverseEntry(e);
   if(records.has(e.entry_id))return {ok:false,status:409,json:async()=>({code:'23505'})};
   records.set(e.entry_id,e);
   return {ok:true,status:201,json:async()=>[e]};
  }
  if((opts.method||'GET')!=='GET')throw Error('NETWORK_METHOD_NOT_ALLOWED');
  let rows=[...records.values()];
  const q=u.searchParams;
  for(const key of ['entry_id','continuity_root_id','worldline_id','event_kind']){
   const f=q.get(key);
   if(f?.startsWith('eq.'))rows=rows.filter(r=>r[key]===f.slice(3));
  }
  const time=q.get('assertion_time');
  if(time?.startsWith('lte.'))rows=rows.filter(r=>Date.parse(r.assertion_time)<=Date.parse(time.slice(4)));
  const order=q.get('order')||'';
  rows.sort((a,b)=>order.startsWith('assertion_time.asc')
   ?a.assertion_time.localeCompare(b.assertion_time)||a.entry_id.localeCompare(b.entry_id)
   :b.assertion_time.localeCompare(a.assertion_time)||a.entry_id.localeCompare(b.entry_id));
  const offset=Number(q.get('offset')||0),limit=Number(q.get('limit')||1000);
  // Emulate Supabase metadata and JSONB object reordering without changing evidence.
  return {ok:true,status:200,json:async()=>rows.slice(offset,offset+limit).map(r=>
   ({...r,created_at:'2026-10-23T06:00:00Z'}))};
 };
 const sequence={
  claim:async({scope,turnId})=>{
   assert.equal(scope.continuity_root_id,root.continuity_root_id);
   assert.equal(active,null);calls.claim++;active=turnId;
   const previous=last;
   return {status:'CLAIMED',root:scope.continuity_root_id,turn_id:turnId,
    sequence_num:seq+1,token:'synthetic-claim-token',prior_commit_entry_id:previous?.id||null,
    prior_commit_hash:previous?.hash||null};
  },
  finish:async({scope,claim,committed})=>{
   assert.equal(scope.continuity_root_id,root.continuity_root_id);
   assert.equal(active,claim.turn_id);
   assert.equal(committed.committed,true);
   calls.finish++;
   seq=claim.sequence_num;active=null;
   last={id:committed.receipt.commit_entry_id,hash:committed.receipt.commit_entry_hash};
   return {status:'FINISHED',sequence_num:seq,commit_entry_id:last.id};
  },
  inspect:async()=>({status:active?'BUSY':'IDLE',active_turn_id:active,
   sequence_num:seq,last_committed_entry_id:last?.id||null,
   last_committed_entry_hash:last?.hash||null}),
 };
 const lookup=async({entryId})=>{
  const original=records.get(entryId);
  return original?restoreCanonicalUniverseRow(original):null;
 };
 try{
  const inputs=[
   'The $12,500 kitchen estimate is not approved. Do not send it before homeowner approval.',
   'Does the previous homeowner approval requirement still apply?',
  ];
  for(let i=0;i<inputs.length;i++){
   const req=makeReq(i+1,inputs[i]);
   const result=await processCausalTurn(req,{env,fetchImpl,sequence,now});
   assert.equal(result.ok,true);
   assert.equal(result.receipt.turn_commit_status,'COMMITTED');
   assert.equal(result.receipt.verified_chain,true);
   assert.equal(result.receipt.sequence_status,'FINISHED');
   assert.equal(result.external_action_executed,false);
   const ids=causalTurnIds(root,req.body.turn_id);
   for(const field of ['user','processing','assistant','committed']){
    assert.ok(records.has(ids[field]),'missing '+field+' receipt');
    validateUniverseEntry(records.get(ids[field]));
   }
   assert.equal((await inspectCausalTurn({scope:root,turnId:req.body.turn_id,lookup})).committed,true);
   const repeat=await processCausalTurn(req,{env,fetchImpl,sequence,now});
   assert.equal(repeat.idempotent_replay,true);
   assert.equal(repeat.response,result.response);
   assert.equal(calls.model,i+1);
  }
  assert.equal(calls.claim,2);
  assert.equal(calls.finish,2);
  assert.equal(seq,2);
  assert.equal(active,null);
  assert.equal(calls.model,2);
  assert.equal([...records.values()].filter(e=>e.event_kind==='REALITY_CAUSAL_TURN_RECEIPT'
   &&e.payload.phase==='COMMITTED').length,2);
  assert.equal([...records.values()].filter(e=>e.event_kind==='AUTHENTICATED_CONVERSATION_MESSAGE'
   &&e.payload.role==='assistant').length,2);
 }finally{
  for(const [key,val] of Object.entries(prev)){
   if(val===undefined)delete process.env[key];else process.env[key]=val;
  }
 }
});
