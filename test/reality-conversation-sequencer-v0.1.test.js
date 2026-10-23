import test from 'node:test';
import assert from 'node:assert/strict';
import {createStandaloneConversationScope} from '../src/reality-standalone-auth-v0.1.js';
import {processCausalTurn,getCausalTurnStatus,getCommittedStandaloneHistory,inspectCausalTurn,reconcileCausalTurn} from '../src/reality-causal-turn-commit-v0.1.js';
import {claimConversationSlot,finishConversationSlot,inspectConversationSlot,reconcileCommittedConversationSlot}
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
function rig({failFirst=false,blockFirst=false,failFinish=false}={}){
 const entries=new Map();
 const counts={models:0,writes:[],claims:0,finishes:0,reconciles:0};
 const queue={active:null,sequence:0,lastCommitId:null,lastCommitHash:null};
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
    sequence_num:queue.sequence,token:'fixture-claim-'+queue.sequence,
    prior_commit_entry_id:queue.lastCommitId,
    prior_commit_hash:queue.lastCommitHash};
  },
  finish:async ({claim,committed})=>{
   assert.equal(queue.active,claim.turn_id);
   assert.equal(committed.receipt.verified_chain,true);
   if(failFinish)throw Error('SYNTHETIC_FINISH_RPC_RESPONSE_LOST');
   counts.finishes++;
   queue.lastCommitId=committed.receipt.commit_entry_id;
   queue.lastCommitHash=committed.receipt.commit_entry_hash;
   queue.active=null;
   return {status:'FINISHED',sequence_num:claim.sequence_num};
  },
  inspect:async()=>({status:queue.active?'BUSY':'IDLE',
    active_turn_id:queue.active,sequence_num:queue.sequence,
    last_committed_entry_id:queue.lastCommitId,
    last_committed_entry_hash:queue.lastCommitHash}),
  reconcile:async({turnId,verified})=>{
    counts.reconciles++;
    if(!verified.committed||verified.turn_id!==turnId||
       queue.active!==turnId)throw Error('RECONCILE_NOT_VERIFIED');
    queue.lastCommitId=verified.receipt.commit_entry_id;
    queue.lastCommitHash=verified.receipt.commit_entry_hash;
    queue.active=null;
    return {status:'RECOVERED',sequence_num:queue.sequence,
      commit_entry_id:queue.lastCommitId,commit_entry_hash:queue.lastCommitHash,
      verified_fence_readback:true};
  },
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
 const secondCommit=x.entries.get(next.receipt.commit_entry_id);
 assert.equal(secondCommit.payload.sequence_num,2);
 assert.equal(secondCommit.payload.prior_commit_entry_id,done.receipt.commit_entry_id);
 assert.equal(secondCommit.payload.prior_commit_hash,done.receipt.commit_entry_hash);
 assert.equal(x.counts.models,2);
 const replay=await processCausalTurn(req('revision-1','Cabinets are still undecided.'),x.opts);
 assert.equal(replay.idempotent_replay,true);
 assert.equal(x.counts.models,2);
 // Changing or losing a predecessor must invalidate the apparently
 // successful child commit rather than silently breaking the causal chain.
 x.entries.delete(done.receipt.commit_entry_id);
 await assert.rejects(()=>inspectCausalTurn({
  scope,turnId:'revision-2',lookup:x.opts.lookup,
 }),/CAUSAL_SEQUENCE_PREDECESSOR_MISSING/);
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


test('status and history do not publish a committed assistant reply while DB fence is unresolved',async()=>{
 const x=rig();
 const turn=await processCausalTurn(req('turn-1','Estimate still needs approval.'),x.opts);
 assert.equal(turn.receipt.turn_commit_status,'COMMITTED');
 // Simulate crash after storing COMMITTED but before DB fence is released.
 x.queue.active='turn-1';
 const dbFetch=async (url)=>{
  if(url.endsWith('/auth/v1/user'))
   return {ok:true,json:async()=>({id:user,is_anonymous:false})};
  if(url.includes('/rest/v1/reality_conversation_turn_fences?'))
   return {ok:true,json:async()=>[{
    root_id:scope.continuity_root_id,worldline_id:scope.worldline_id,owner_user_id:user,
    sequence_num:1,active_turn_id:'turn-1',
    last_committed_entry_id:null,last_committed_entry_hash:null,
   }]};
  throw Error('UNKNOWN_TEST_FETCH');
 };
 const status=await getCausalTurnStatus({
  headers:req('turn-1').headers,
  query:{conversation_id:'parallel-kitchen',thought_id:'personal',turn_id:'turn-1'},
 },{env,fetchImpl:dbFetch,lookup:x.opts.lookup});
 assert.equal(status.status,'SEQUENCE_FENCE_UNRESOLVED');
 assert.equal(status.committed,false);
 assert.equal(status.response,undefined);
 const history=await getCommittedStandaloneHistory({
  headers:req('turn-1').headers,
  query:{conversation_id:'parallel-kitchen',thought_id:'personal'},
 },{env,fetchImpl:dbFetch,lookup:x.opts.lookup,load:x.opts.load});
 assert.deepEqual(history.messages.map(m=>m.role),['user']);
 assert.deepEqual(history.unresolved_turns.map(x=>x.status),['SEQUENCE_FENCE_UNRESOLVED']);
});


test('lost finish acknowledgment: reconcile durable COMMITTED exactly once, with no second model call',async()=>{
 const x=rig({failFinish:true});
 await assert.rejects(
  ()=>processCausalTurn(req('recovery-1','Do not send estimate yet.'),x.opts),
  /SYNTHETIC_FINISH_RPC_RESPONSE_LOST/,
 );
 const ledger=await inspectCausalTurn({
  scope,turnId:'recovery-1',lookup:x.opts.lookup,
 });
 assert.equal(ledger.status,'COMMITTED');
 assert.equal(x.queue.active,'recovery-1');
 const r=await reconcileCausalTurn({
  headers:req('recovery-1').headers,
  body:{conversation_id:'parallel-kitchen',thought_id:'personal',turn_id:'recovery-1'},
 },{
  env,fetchImpl:x.opts.fetchImpl,lookup:x.opts.lookup,sequence:x.opts.sequence,
 });
 assert.equal(r.recovered,true);
 assert.equal(r.status,'RECOVERED');
 assert.equal(r.receipt.verified_chain,true);
 assert.equal(r.model_called,false);
 assert.equal(x.counts.models,1);
 assert.equal(x.counts.reconciles,1);
 assert.equal(x.queue.active,null);
 // Second manual request is an idempotent observation, not a new model call.
 const recheck=await reconcileCausalTurn({
  headers:req('recovery-1').headers,
  body:{conversation_id:'parallel-kitchen',thought_id:'personal',turn_id:'recovery-1'},
 },{
  env,fetchImpl:x.opts.fetchImpl,lookup:x.opts.lookup,
  sequence:{...x.opts.sequence,reconcile:async({verified})=>{
   assert.equal(verified.committed,true);
   return {status:'ALREADY_FINISHED',sequence_num:x.queue.sequence,
    commit_entry_id:x.queue.lastCommitId,commit_entry_hash:x.queue.lastCommitHash,
    verified_fence_readback:true};
  }},
 });
 assert.equal(recheck.status,'ALREADY_FINISHED');
 assert.equal(x.counts.models,1);
});
test('unfinished cognition requires review and cannot unlock slot or generate again',async()=>{
 const x=rig({failFirst:true});
 await assert.rejects(
  ()=>processCausalTurn(req('pending-1','Approval is unresolved.'),x.opts),
  /SYNTHETIC_FIRST_MODEL_TIMEOUT/,
 );
 const assessment=await reconcileCausalTurn({
  headers:req('pending-1').headers,
  body:{conversation_id:'parallel-kitchen',turn_id:'pending-1'},
 },{
  env,fetchImpl:x.opts.fetchImpl,lookup:x.opts.lookup,sequence:x.opts.sequence,
 });
 assert.equal(assessment.status,'REVIEW_REQUIRED');
 assert.equal(assessment.recovered,false);
 assert.equal(assessment.underlying_turn_status,'INTERRUPTED');
 assert.equal(x.queue.active,'pending-1');
 assert.equal(x.counts.reconciles,0);
 assert.equal(x.counts.models,1);
});
test('reconciliation rejects client-supplied source, authority and commit hash',async()=>{
 const x=rig();
 for(const intrusion of [
  {principal_id:user},{commit_hash:'a'.repeat(64)},{action_authorized:true},
  {continuity_root_id:scope.continuity_root_id},{model_output:'fake success'},
 ]){
  await assert.rejects(()=>reconcileCausalTurn({
    headers:req('none').headers,
    body:{conversation_id:'parallel-kitchen',turn_id:'none',...intrusion},
  },{
   env,fetchImpl:x.opts.fetchImpl,lookup:x.opts.lookup,sequence:x.opts.sequence,
  }),/CAUSAL_RECONCILIATION_SELECTOR_INVALID/);
 }
 assert.equal(x.counts.reconciles,0);
 assert.equal(x.counts.models,0);
});
test('reconciliation remains disabled without explicit preview sequencing flag',async()=>{
 const x=rig();
 await assert.rejects(()=>reconcileCausalTurn({
  headers:req('none').headers,body:{conversation_id:'parallel-kitchen',turn_id:'none'},
 },{
  env:{...env,REALITY_CAUSAL_SEQUENCE_ENABLED:'false'},
  fetchImpl:x.opts.fetchImpl,lookup:x.opts.lookup,sequence:x.opts.sequence,
 }),/CAUSAL_RECONCILIATION_NOT_ENABLED/);
 assert.equal(x.counts.models,0);
});
test('reconciliation never touches another active turn or prior historical commit',async()=>{
 const x=rig();
 await processCausalTurn(req('one','Cabinets undecided.'),x.opts);
 await processCausalTurn(req('two','Approval is still required.'),x.opts);
 await assert.rejects(()=>reconcileCausalTurn({
  headers:req('one').headers,
  body:{conversation_id:'parallel-kitchen',turn_id:'one'},
 },{
  env,fetchImpl:x.opts.fetchImpl,lookup:x.opts.lookup,sequence:x.opts.sequence,
 }),/CAUSAL_RECONCILIATION_NOT_CURRENT_COMMIT/);
 assert.equal(x.counts.models,2);
 assert.equal(x.counts.reconciles,0);
});
test('reconciliation RPC uses only sandbox secret and checks durable fence readback',async()=>{
 const e=env,token='a'.repeat(64),commitId='reality:turn:fixture';
 const verified={committed:true,turn_id:'fixed',receipt:{
  verified_chain:true,commit_entry_id:commitId,commit_entry_hash:token}};
 let requestCount=0;
 const fetchImpl=async (url,opt)=>{
  requestCount++;
  assert.equal(opt.headers.apikey,e.REALITY_UNIVERSE_PERSISTENCE_KEY);
  assert.equal(Object.hasOwn(opt.headers,'Authorization'),false);
  if(url.endsWith('/rest/v1/rpc/reality_reconcile_committed_conversation_turn')){
   const body=JSON.parse(opt.body);
   assert.equal(body.p_root_id,scope.continuity_root_id);
   assert.equal(body.p_commit_entry_id,commitId);
   return {ok:true,json:async()=>({status:'RECOVERED',
    sequence_num:1,commit_entry_id:commitId,commit_hash:token})};
  }
  assert.match(url,/\/rest\/v1\/reality_conversation_turn_fences\?/);
  return {ok:true,json:async()=>[{
   root_id:scope.continuity_root_id,worldline_id:scope.worldline_id,
   owner_user_id:user,active_turn_id:null,
   sequence_num:1,last_committed_entry_id:commitId,
   last_committed_entry_hash:token,
  }]};
 };
 const good=await reconcileCommittedConversationSlot({
  scope,turnId:'fixed',verified,env:e,fetchImpl,
 });
 assert.equal(good.verified_fence_readback,true);
 assert.equal(good.model_called,false);
 assert.equal(requestCount,2);
 await assert.rejects(()=>reconcileCommittedConversationSlot({
  scope,turnId:'fixed',verified:{...verified,committed:false},env:e,
  fetchImpl:async()=>{throw Error('SHOULD_NOT_CALL')},
 }),/SEQUENCE_RECONCILE_UNVERIFIED_COMMIT/);
});
test('unconfirmed reconciliation fence readback does not claim recovered success',async()=>{
 const hash='b'.repeat(64),entry='committed:fixture';
 const verified={committed:true,turn_id:'fixed',receipt:{
  verified_chain:true,commit_entry_id:entry,commit_entry_hash:hash,
 }};
 const fetchImpl=async (url)=>{
  if(url.endsWith('/rest/v1/rpc/reality_reconcile_committed_conversation_turn'))
   return {ok:true,json:async()=>({status:'RECOVERED',
    sequence_num:2,commit_entry_id:entry,commit_hash:hash})};
  return {ok:true,json:async()=>[{root_id:scope.continuity_root_id,
   owner_user_id:user,worldline_id:scope.worldline_id,
   active_turn_id:'fixed',sequence_num:2,
   last_committed_entry_id:null,last_committed_entry_hash:null}]};
 };
 await assert.rejects(()=>reconcileCommittedConversationSlot({
  scope,turnId:'fixed',verified,env,fetchImpl,
 }),/SEQUENCE_RECONCILE_FENCE_READBACK_MISMATCH/);
});
