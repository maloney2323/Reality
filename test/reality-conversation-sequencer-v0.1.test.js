import test from 'node:test';
import assert from 'node:assert/strict';
import {createStandaloneConversationScope} from '../src/reality-standalone-auth-v0.1.js';
import {processCausalTurn} from '../src/reality-causal-turn-commit-v0.1.js';
import {claimConversationSlot,finishConversationSlot,inspectConversationSlot}
 from '../src/reality-conversation-sequencer-v0.1.js';
import {createUniverseEntry} from '../src/reality-universe-persistence-contract-v1.0.js';

const user='e83340ec-4266-4c95-a6cd-929bc58b445e';
const scope=createStandaloneConversationScope({userId:user,conversationId:'parallel-kitchen'});
const env={
 SUPABASE_URL:'https://reality-example.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',
 REALITY_STANDALONE_EXPECTED_PROJECT_REF:'reality-example',
 REALITY_UNIVERSE_PERSISTENCE_URL:'https://reality-example.supabase.co',
 REALITY_UNIVERSE_PERSISTENCE_KEY:'sb_secret_TEST_ONLY_NOT_REAL_abcdefghijklmnop',
 REALITY_STANDALONE_OPENAI_API_KEY:'sk-TEST_ONLY_NOT_REAL_abcdefghijklmnop',
 REALITY_OPENAI_MODEL:'gpt-4.1-mini',
 REALITY_STANDALONE_CHAT_ENABLED:'true',
 REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CAUSAL_SEQUENCE_ENABLED:'true',
 VERCEL_ENV:'preview',
};
const req=(turnId,message)=>({
 headers:{authorization:'Bearer mock-verified-session-token'},
 body:{conversation_id:'parallel-kitchen',thought_id:'personal',turn_id:turnId,message},
});
function rig({failFirst=false,blockFirst=false}={}){
 const entries=new Map();
 const counts={models:0,writes:[],claims:0,finishes:0};
 const queue={active:null,sequence:0};
 let release;const barrier=new Promise(resolve=>release=resolve);
 let signal;const started=new Promise(resolve=>signal=resolve);
 const fetchImpl=async url=>{
  assert.equal(url,env.SUPABASE_URL+'/auth/v1/user');
  return {ok:true,status:200,json:async()=>({id:user,is_anonymous:false})};
 };
 const store=async entry=>{
  if(entries.has(entry.entry_id))return {status:'DUPLICATE_IDENTICAL',entry:entries.get(entry.entry_id)};
  entries.set(entry.entry_id,entry);
  counts.writes.push(entry.payload.role||entry.payload.phase);
  return {status:'PERSISTED',entry};
 };
 const lookup=async({entryId})=>entries.get(entryId)||null;
 const load=async({continuityRootId,worldlineId,eventKind})=>({
  status:'AVAILABLE',entries:[...entries.values()].filter(e=>
   e.continuity_root_id===continuityRootId&&e.worldline_id===worldlineId&&e.event_kind===eventKind),
 });
 const sequence={
  claim:async ({scope:s,turnId})=>{
   assert.equal(s.continuity_root_id,scope.continuity_root_id);
   counts.claims++;
   if(queue.active){const e=new Error('SEQUENCE_PRIOR_TURN_UNRESOLVED');e.status=409;throw e}
   queue.sequence++;
   queue.active=turnId;
   return {status:'CLAIMED',turn_id:turnId,root:s.continuity_root_id,
    sequence_num:queue.sequence,token:'fixture-claim-'+queue.sequence};
  },
  finish:async ({claim,committed})=>{
   assert.equal(queue.active,claim.turn_id);
   assert.equal(committed.receipt.verified_chain,true);
   counts.finishes++;
   queue.active=null;
   return {status:'FINISHED',sequence_num:claim.sequence_num};
  },
  inspect:async()=>({status:queue.active?'BUSY':'IDLE',
    active_turn_id:queue.active,sequence_num:queue.sequence}),
 };
 let counter=0;
 const now=()=>{
  counter++;
  return new Date(Date.UTC(2026,9,22,20,counter,0)).toISOString();
 };
 const run=async ({systemContext})=>{
  counts.models++;
  const number=counts.models;
  assert.equal(systemContext.continuity_root_id,scope.continuity_root_id);
  if(number===1){signal();if(blockFirst)await barrier;}
  if(failFirst&&number===1)throw Error('SYNTHETIC_FIRST_MODEL_TIMEOUT');
  const receipt=createUniverseEntry({
   entry_id:'cognition:synthetic:'+number,
   continuity_root_id:scope.continuity_root_id,
   worldline_id:scope.worldline_id,event_kind:'CONTINUITY_STATE_TRANSITION',
   epistemic_kind:'OBSERVATION',assertion_time:now(),effective_time:now(),
   source_ref:'synthetic',payload:{phase:'OBSERVED'},
   evidence_references:[],provenance:{source:'synthetic'},
  });
  entries.set(receipt.entry_id,receipt);
  return {intelligence:{raw_model_answer:'Preserved approval condition.',answer:'Preserved approval condition.'},
   context:{continuity:{root_id:scope.continuity_root_id,
    cognitive_readback_verified:true,signal_handoff_status:'STORED_AND_READ_BACK',
    event_id:receipt.entry_id}}};
 };
 return {opts:{env,fetchImpl,lookup,store,load,run,now,sequence},
  entries,counts,queue,started,release};
}
test('two DISTINCT simultaneous turn IDs: second cannot write or call model until first commits',async()=>{
 const x=rig({blockFirst:true});
 const first=processCausalTurn(req('revision-1','Cabinets are still undecided.'),x.opts);
 await x.started;
 const other=await Promise.allSettled([
  processCausalTurn(req('revision-2','Homeowner approved reviewing only.'),x.opts),
 ]);
 assert.equal(other[0].status,'rejected');
 assert.match(other[0].reason.message,/SEQUENCE_PRIOR_TURN_UNRESOLVED/);
 assert.equal(x.counts.models,1);
 assert.deepEqual(x.counts.writes,['user','PROCESSING']);
 x.release();
 const done=await first;
 assert.equal(done.receipt.sequence_num,1);
 assert.equal(done.receipt.sequence_status,'FINISHED');
 assert.equal(x.counts.finishes,1);
 const next=await processCausalTurn(req('revision-2','Homeowner approved reviewing only.'),x.opts);
 assert.equal(next.receipt.sequence_num,2);
 assert.equal(x.counts.models,2);
 const replay=await processCausalTurn(req('revision-1','Cabinets are still undecided.'),x.opts);
 assert.equal(replay.idempotent_replay,true);
 assert.equal(x.counts.models,2);
});
test('interrupted first turn holds the fence and blocks unrelated next turn (no auto-release)',async()=>{
 const x=rig({failFirst:true});
 await assert.rejects(
  ()=>processCausalTurn(req('revision-1','Do not send estimate.'),x.opts),
  /SYNTHETIC_FIRST_MODEL_TIMEOUT/,
 );
 assert.equal(x.queue.active,'revision-1');
 await assert.rejects(
  ()=>processCausalTurn(req('revision-2','Now send the estimate.'),x.opts),
  /SEQUENCE_PRIOR_TURN_UNRESOLVED/,
 );
 assert.equal(x.counts.models,1);
 assert.equal(x.counts.claims,2);
 assert.equal(x.counts.finishes,0);
});
test('Supabase claim RPC sends secret only to pinned benchmark and rejects active slot',async()=>{
 const expectedToken='3e105779-3033-446e-b299-ac0c96624440';
 let calls=0;
 const fetchImpl=async (url,opt)=>{
  assert.equal(url,env.SUPABASE_URL+'/rest/v1/rpc/reality_claim_conversation_turn');
  assert.equal(opt.headers.apikey,env.REALITY_UNIVERSE_PERSISTENCE_KEY);
  assert.equal(Object.hasOwn(opt.headers,'Authorization'),false);
  const body=JSON.parse(opt.body);
  assert.equal(body.p_root_id,scope.continuity_root_id);
  assert.equal(body.p_owner_user_id,user);
  calls++;
  return {ok:true,json:async()=>calls===1?
   {status:'CLAIMED',sequence_num:1,claim_token:expectedToken}:
   {status:'BUSY',sequence_num:1,active_turn_id:'first'}};
 };
 const claimed=await claimConversationSlot({scope,turnId:'first',env,fetchImpl,newToken:()=>expectedToken});
 assert.equal(claimed.sequence_num,1);
 await assert.rejects(()=>claimConversationSlot({scope,turnId:'second',env,fetchImpl,newToken:()=>expectedToken}),
  /SEQUENCE_PRIOR_TURN_UNRESOLVED/);
 assert.equal(calls,2);
});
test('finalize RPC refuses non-verified commit and validates authoritative SQL receipt',async()=>{
 const claim={status:'CLAIMED',turn_id:'turn-1',root:scope.continuity_root_id,
  sequence_num:4,token:'3e105779-3033-446e-b299-ac0c96624440'};
 let called=false;
 const fetchImpl=async (url,opt)=>{
  called=true;
  assert.equal(url,env.SUPABASE_URL+'/rest/v1/rpc/reality_finish_conversation_turn');
  assert.equal(JSON.parse(opt.body).p_commit_hash,'a'.repeat(64));
  return {ok:true,json:async()=>({status:'FINISHED',sequence_num:4,
   commit_entry_id:'commit:1',commit_hash:'a'.repeat(64)})};
 };
 await assert.rejects(()=>finishConversationSlot({scope,claim,
  committed:{receipt:{verified_chain:false}},env,fetchImpl,
 }),/SEQUENCE_FINISH_EVIDENCE_REQUIRED/);
 assert.equal(called,false);
 const done=await finishConversationSlot({scope,claim,committed:{
  receipt:{verified_chain:true,commit_entry_id:'commit:1',commit_entry_hash:'a'.repeat(64)},
 },env,fetchImpl});
 assert.equal(done.status,'FINISHED');
});
test('fence readback enforces principal and verified environment, fail-closed when database unavailable',async()=>{
 const ownerFetch=async()=>({ok:true,json:async()=>[{
  root_id:scope.continuity_root_id,owner_user_id:user,
  worldline_id:'reality:primary',sequence_num:1,active_turn_id:null,
  last_committed_entry_id:'commit:1',last_committed_entry_hash:'a'.repeat(64),
 }]});
 const r=await inspectConversationSlot({scope,env,fetchImpl:ownerFetch});
 assert.equal(r.status,'IDLE');
 await assert.rejects(()=>inspectConversationSlot({scope,env,fetchImpl:async()=>({
  ok:true,json:async()=>[{
   root_id:scope.continuity_root_id,owner_user_id:'00000000-0000-0000-0000-000000000000',
   worldline_id:'reality:primary',sequence_num:1,active_turn_id:null,
  }],
 })}),/SEQUENCE_FENCE_SCOPE_MISMATCH/);
 await assert.rejects(()=>claimConversationSlot({scope,turnId:'one',
  env:{...env,REALITY_UNIVERSE_PERSISTENCE_URL:'https://unrelated.supabase.co'},
  fetchImpl:async()=>{throw Error('SHOULD_NOT_FETCH')},
 }),/SEQUENCE_DATABASE_PROJECT_MISMATCH/);
});
