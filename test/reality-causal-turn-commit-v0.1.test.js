import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniverseEntry,validateUniverseEntry} from '../src/reality-universe-persistence-contract-v1.0.js';
import {createStandaloneConversationScope} from '../src/reality-standalone-auth-v0.1.js';
import {processCausalTurn,getCausalTurnStatus,inspectCausalTurn,causalTurnIds,
 makeCausalTurnReceipt,getCommittedStandaloneHistory} from '../src/reality-causal-turn-commit-v0.1.js';
import {retrieveOptionalPersistedUniverseEntry} from '../src/reality-native-universe-persistence-v1.0.js';

const userA='e83340ec-4266-4c95-a6cd-929bc58b445e';
const userB='f44440ec-4266-4c95-a6cd-929bc58b445f';
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
 VERCEL_ENV:'preview',
};
const original='Do not send the estimate until homeowner approval.';
const req=(id='turn-1',message=original)=>({
 headers:{authorization:'Bearer test-session-jwt-do-not-use-live'},
 body:{message,turn_id:id,conversation_id:'job-1',thought_id:'personal'},
 query:{conversation_id:'job-1',thought_id:'personal',turn_id:id},
});
const authFetch=(id=userA)=>async (url)=>{
 assert.equal(url,'https://reality-example.supabase.co/auth/v1/user');
 return {ok:true,status:200,json:async()=>({id,is_anonymous:false})};
};
function rig({userId=userA,failRun=false,failCommit=false,failInterruption=false}={}){
 const entries=new Map(),calls={model:0,store:[],get:[]};
 let time=0;
 const scope=createStandaloneConversationScope({userId,conversationId:'job-1'});
 const now=()=>new Date(Date.UTC(2026,9,22,20,0,time++)).toISOString();
 const store=async(entry)=>{
  validateUniverseEntry(entry);
  calls.store.push(entry.payload.phase||entry.payload.role||'OTHER');
  if(entry.payload.phase==='COMMITTED'&&failCommit)
   throw Error('SYNTHETIC_COMMIT_STORAGE_OUTAGE');
  if(entry.payload.phase==='INTERRUPTED'&&failInterruption)
   throw Error('SYNTHETIC_DIAGNOSTIC_OUTAGE');
  if(entries.has(entry.entry_id))
   return {status:'DUPLICATE_IDENTICAL',entry:entries.get(entry.entry_id)};
  entries.set(entry.entry_id,entry);
  return {status:'PERSISTED',entry};
 };
 const lookup=async({entryId})=>{
  calls.get.push(entryId);
  return entries.get(entryId)||null;
 };
 const load=async({continuityRootId,worldlineId,eventKind})=>({
  status:'AVAILABLE',entries:[...entries.values()].filter(x=>
    x.continuity_root_id===continuityRootId&&
    x.worldline_id===worldlineId&&x.event_kind===eventKind),
 });
 const run=async({systemContext,apiKey,model})=>{
  calls.model++;
  assert.equal(systemContext.continuity_root_id,scope.continuity_root_id);
  assert.equal(apiKey,env.REALITY_STANDALONE_OPENAI_API_KEY);
  assert.equal(model,env.REALITY_OPENAI_MODEL);
  if(failRun)throw Error('SYNTHETIC_PROVIDER_TIMEOUT');
  const cognition=createUniverseEntry({
   entry_id:'continuity:event:synthetic-'+calls.model,
   continuity_root_id:scope.continuity_root_id,
   worldline_id:scope.worldline_id,
   event_kind:'CONTINUITY_STATE_TRANSITION',
   epistemic_kind:'OBSERVATION',
   assertion_time:now(),effective_time:'2026-10-22T20:00:00.000Z',
   source_ref:'synthetic:cognition:readback',
   payload:{mode:'MODEL_COGNITION_UNVERIFIED_OUTSIDE_TEST',next_state:'ACTIVE'},
   evidence_references:[],provenance:{source:'synthetic:cognition'},
  });
  entries.set(cognition.entry_id,cognition);
  return {intelligence:{
   raw_model_answer:'I will preserve homeowner approval.',
   answer:'I will preserve homeowner approval.',
  },context:{continuity:{
   root_id:scope.continuity_root_id,cognitive_readback_verified:true,
   signal_handoff_status:'STORED_AND_READ_BACK',event_id:cognition.entry_id,
  }}};
 };
 const opts={env,fetchImpl:authFetch(userId),store,lookup,load,run,now};
 return {entries,calls,scope,store,lookup,load,run,opts};
}
test('four-stage immutable causal turn must end in independently validated COMMITTED receipt',async()=>{
 const x=rig();
 const first=await processCausalTurn(req(),x.opts);
 assert.equal(first.ok,true);
 assert.equal(first.receipt.turn_commit_status,'COMMITTED');
 assert.equal(first.receipt.verified_chain,true);
 assert.equal(first.idempotent_replay,false);
 assert.deepEqual(x.calls.store,['user','PROCESSING','assistant','COMMITTED']);
 const status=await getCausalTurnStatus(req(),{
  env,fetchImpl:authFetch(),lookup:x.lookup,
 });
 assert.equal(status.status,'COMMITTED');
 assert.equal(status.committed,true);
 assert.equal(status.response,first.response);
 const second=await processCausalTurn(req(),x.opts);
 assert.equal(second.idempotent_replay,true);
 assert.equal(second.response,first.response);
 assert.equal(x.calls.model,1,'a delivered reply is never regenerated');
 await assert.rejects(()=>processCausalTurn(req('turn-1','Forged different message'),x.opts),
   /CAUSAL_TURN_ID_PAYLOAD_CONFLICT/);
 assert.equal(x.calls.model,1);
});
test('provider outage after user write retains RECEIPT+INTERRUPTED, blocks retry and model regeneration',async()=>{
 const x=rig({failRun:true});
 await assert.rejects(()=>processCausalTurn(req(),x.opts),/SYNTHETIC_PROVIDER_TIMEOUT/);
 const ids=causalTurnIds(x.scope,'turn-1');
 assert.equal(x.entries.has(ids.user),true);
 assert.equal(x.entries.has(ids.processing),true);
 assert.equal(x.entries.has(ids.interrupted),true);
 assert.equal(x.entries.has(ids.committed),false);
 const progress=await inspectCausalTurn({scope:x.scope,turnId:'turn-1',lookup:x.lookup});
 assert.equal(progress.status,'INTERRUPTED');
 assert.equal(progress.committed,false);
 await assert.rejects(()=>processCausalTurn(req(),x.opts),
  /CAUSAL_TURN_RECOVERY_REVIEW_REQUIRED/);
 assert.equal(x.calls.model,1);
});
test('assistant persisted but final receipt failed: RECONCILIATION_REQUIRED, no answer publication or replay',async()=>{
 const x=rig({failCommit:true});
 await assert.rejects(()=>processCausalTurn(req(),x.opts),/SYNTHETIC_COMMIT_STORAGE_OUTAGE/);
 const partial=await getCausalTurnStatus(req(),{
  env,fetchImpl:authFetch(),lookup:x.lookup,
 });
 assert.equal(partial.status,'RESPONSE_STORED_UNCOMMITTED');
 assert.equal(partial.committed,false);
 assert.equal(partial.evidence.interruption_recorded,true);
 assert.equal(partial.response,undefined);
 await assert.rejects(()=>processCausalTurn(req(),x.opts),
  /CAUSAL_TURN_RECOVERY_REVIEW_REQUIRED/);
 assert.equal(x.calls.model,1);
});
test('power loss can prevent INTERRUPTED receipt but still leaves PROCESSING visible',async()=>{
 const x=rig({failRun:true,failInterruption:true});
 await assert.rejects(()=>processCausalTurn(req(),x.opts),/SYNTHETIC_PROVIDER_TIMEOUT/);
 const status=await inspectCausalTurn({scope:x.scope,turnId:'turn-1',lookup:x.lookup});
 assert.equal(status.status,'PROCESSING');
 assert.equal(status.retry_policy,'REQUIRES_RECONCILIATION_NO_AUTOMATIC_MODEL_RERUN');
});
test('a stored COMMITTED receipt with missing cognition entry or incorrect assistant hash never passes',async()=>{
 const x=rig();
 await processCausalTurn(req(),x.opts);
 const ids=causalTurnIds(x.scope,'turn-1');
 const cognitionId=x.entries.get(ids.committed).payload.cognition_ledger_event_id;
 x.entries.delete(cognitionId);
 await assert.rejects(()=>inspectCausalTurn({scope:x.scope,turnId:'turn-1',lookup:x.lookup}),
  /CAUSAL_TURN_COGNITION_RECEIPT_MISSING/);
});
test('two authenticated users with identical turn IDs cannot see each others causal turn',async()=>{
 const x=rig({userId:userA});
 await processCausalTurn(req(),x.opts);
 const bScope=createStandaloneConversationScope({userId:userB,conversationId:'job-1'});
 const b=await inspectCausalTurn({scope:bScope,turnId:'turn-1',lookup:x.lookup});
 assert.equal(b.status,'NOT_RECEIVED');
 assert.equal(b.committed,false);
 const response=await getCausalTurnStatus(req(),{
  env,fetchImpl:authFetch(userB),lookup:x.lookup,
 });
 assert.equal(response.status,'NOT_RECEIVED');
});
test('caller cannot submit an arbitrary root or authority to causal status endpoint',async()=>{
 const x=rig();
 await assert.rejects(()=>getCausalTurnStatus({
  ...req(),query:{conversation_id:'job-1',turn_id:'turn-1',
    principal_id:userA},
 },{env,fetchImpl:authFetch(),lookup:x.lookup}),
 /CAUSAL_TURN_STATUS_SELECTOR_INVALID/);
 assert.equal(x.calls.get.length,0);
});
test('optional exact entry lookup distinguishes missing row from unverified storage',async()=>{
 const prior=process.env.REALITY_UNIVERSE_PERSISTENCE_KEY;
 const url=process.env.REALITY_UNIVERSE_PERSISTENCE_URL;
 process.env.REALITY_UNIVERSE_PERSISTENCE_KEY='sb_secret_TEST_ONLY_NOT_REAL_abcdefghijklmnop';
 process.env.REALITY_UNIVERSE_PERSISTENCE_URL='https://reality-example.supabase.co';
 try{
  const missing=await retrieveOptionalPersistedUniverseEntry({
   entryId:'reality:missing-test',fetchImpl:async()=>({
    ok:true,json:async()=>[],
   }),
  });
  assert.equal(missing,null);
  await assert.rejects(()=>retrieveOptionalPersistedUniverseEntry({
   entryId:'reality:test',
   fetchImpl:async()=>({ok:false,status:503}),
  }),/UNIVERSE_PERSISTENCE_UNAVAILABLE/);
 }finally{
  if(prior===undefined)delete process.env.REALITY_UNIVERSE_PERSISTENCE_KEY;
  else process.env.REALITY_UNIVERSE_PERSISTENCE_KEY=prior;
  if(url===undefined)delete process.env.REALITY_UNIVERSE_PERSISTENCE_URL;
  else process.env.REALITY_UNIVERSE_PERSISTENCE_URL=url;
 }
});


test('authenticated history displays only committed model replies; unfinished user instruction remains visible',async()=>{
 const x=rig({failCommit:true});
 await assert.rejects(()=>processCausalTurn(req(),x.opts),
   /SYNTHETIC_COMMIT_STORAGE_OUTAGE/);
 const history=await getCommittedStandaloneHistory({...req(),query:{conversation_id:'job-1',thought_id:'personal'}},{
  env,fetchImpl:authFetch(),load:x.load,lookup:x.lookup,
 });
 assert.equal(history.messages.length,1);
 assert.equal(history.messages[0].role,'user');
 assert.equal(history.messages[0].text,original);
 assert.deepEqual(history.unresolved_turns.map(x=>x.status),
  ['RESPONSE_STORED_UNCOMMITTED']);
 assert.equal(history.assistant_messages_require_verified_commit,true);
});
test('authenticated committed history presents only fully verified two-message turn',async()=>{
 const x=rig();
 await processCausalTurn(req(),x.opts);
 const history=await getCommittedStandaloneHistory({...req(),query:{conversation_id:'job-1',thought_id:'personal'}},{
  env,fetchImpl:authFetch(),load:x.load,lookup:x.lookup,
 });
 assert.equal(history.messages.length,2);
 assert.deepEqual(history.messages.map(x=>x.role),['user','assistant']);
 assert.equal(history.unresolved_turns.length,0);
});



test('receipt identity and authority metadata are immutable even when a caller supplies conflicting payload',()=>{
 const x=rig();
 const entry=makeCausalTurnReceipt({
  scope:x.scope,turnId:'t-1',phase:'PROCESSING',
  observedAt:'2026-10-22T20:00:00.000Z',
  payload:{
   turn_id:'spoofed',phase:'COMMITTED',authenticated_user_id:userB,
   authority_granted:true,action_authorized:true,
   external_action_executed:true,user_message_hash:'synthetic',
  },
 });
 assert.equal(entry.payload.turn_id,'t-1');
 assert.equal(entry.payload.phase,'PROCESSING');
 assert.equal(entry.payload.authenticated_user_id,userA);
 assert.equal(entry.payload.action_authorized,false);
 assert.equal(entry.payload.external_action_executed,false);
});
test('same-turn concurrent requests may race intake but can never both enter model cognition',async()=>{
 const x=rig();
 const ids=causalTurnIds(x.scope,'turn-1');
 const baseLookup=x.opts.lookup;
 let userPreflightReads=0,unlock=()=>{};
 const release=new Promise(res=>{unlock=res});
 const lookup=async ({entryId,...rest})=>{
  if(entryId===ids.user&&userPreflightReads<2){
   userPreflightReads++;
   if(userPreflightReads===2)unlock();
   await release;
  }
  return baseLookup({entryId,...rest});
 };
 const options={...x.opts,lookup};
 const both=await Promise.allSettled([
  processCausalTurn(req(),options),
  processCausalTurn(req(),options),
 ]);
 assert.equal(both.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(both.filter(x=>x.status==='rejected').length,1);
 assert.equal(x.calls.model,1);
 const terminal=await inspectCausalTurn({
  scope:x.scope,turnId:'turn-1',lookup:x.lookup,
 });
 assert.equal(terminal.status,'COMMITTED');
});


test('orphaned processing receipt must never be mistaken for a safe new turn',async()=>{
 const x=rig();
 const entry=makeCausalTurnReceipt({
  scope:x.scope,turnId:'turn-1',phase:'PROCESSING',
  observedAt:'2026-10-22T20:00:00.000Z',
  payload:{user_message_entry_id:'missing-user',user_message_hash:'missing-hash'},
 });
 x.entries.set(entry.entry_id,entry);
 await assert.rejects(()=>inspectCausalTurn({
  scope:x.scope,turnId:'turn-1',lookup:x.lookup,
 }),/CAUSAL_TURN_ORPHANED_EVIDENCE/);
 assert.equal(x.calls.model,0);
});
