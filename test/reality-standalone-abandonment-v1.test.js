import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniverseEntry,validateUniverseEntry}
 from '../src/reality-universe-persistence-contract-v1.0.js';
import {createStandaloneConversationScope}
 from '../src/reality-standalone-auth-v0.1.js';
import {causalTurnIds} from '../src/reality-causal-turn-commit-v0.1.js';
import {prepareOwnerAbandonment,confirmOwnerAbandonment,
 ACKNOWLEDGMENT_TEXT} from '../src/reality-standalone-abandonment-v1.js';
const user='e83340ec-4266-4c95-a6cd-929bc58b445e';
const cid='contract-case',tid='held';
const scope=createStandaloneConversationScope({userId:user,conversationId:cid});
const ids=causalTurnIds(scope,tid);
const when='2026-10-23T13:00:00.000Z',clock=Date.parse(when);
const env={VERCEL_ENV:'preview',
 SUPABASE_URL:'https://hvkfreoagbrphwghjajw.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_SYNTHETIC',
 REALITY_STANDALONE_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw',
 REALITY_UNIVERSE_PERSISTENCE_URL:'https://hvkfreoagbrphwghjajw.supabase.co',
 REALITY_UNIVERSE_PERSISTENCE_KEY:'sb_'+'secret_'+ 'FAKE'.repeat(8),
 REALITY_TURN_ABANDONMENT_ENABLED:'true',
 REALITY_ABANDONMENT_REVIEW_SECRET:'FAKE_ONLY_CONFIRMATION_HMAC_SECRET'.repeat(2)};
function record(id,kind,payload){
 return createUniverseEntry({
  entry_id:id,continuity_root_id:scope.continuity_root_id,
  worldline_id:scope.worldline_id,event_kind:kind,epistemic_kind:'OBSERVATION',
  assertion_time:when,effective_time:when,source_ref:'synthetic:test',
  payload,evidence_references:[],provenance:{source:'SYNTHETIC_TEST'}});
}
const userEntry=record(ids.user,'AUTHENTICATED_CONVERSATION_MESSAGE',
 {role:'user',turn_id:tid,principal_id:user,text:'Approval required before sending'});
const processing=record(ids.processing,'REALITY_CAUSAL_TURN_RECEIPT',
 {phase:'PROCESSING',turn_id:tid,authenticated_user_id:user,
 user_message_hash:userEntry.ledger_entry_hash});
const interrupted=record(ids.interrupted,'REALITY_CAUSAL_TURN_RECEIPT',
 {phase:'INTERRUPTED',turn_id:tid,authenticated_user_id:user});
const status={status:'INTERRUPTED',turn_id:tid,committed:false,
 evidence:{interruption_recorded:true,processing_receipt_entry_id:ids.processing,
 assistant_message_entry_id:null}};
const busy={status:'BUSY',active_turn_id:tid,sequence_num:1,
 last_committed_entry_id:null,last_committed_entry_hash:null};
function fixture(){
 const saved=new Map([[ids.user,userEntry],[ids.processing,processing],[ids.interrupted,interrupted]]);
 let f={...busy};let rpcCount=0;
 return {verify:async()=>({user_id:user}),inspect:async()=>status,
  inspectFence:async()=>f,
  loadClaim:async()=>({root_id:scope.continuity_root_id,worldline_id:scope.worldline_id,
   owner_user_id:user,active_turn_id:tid,active_claim_token:'6617c2a8-5ed7-40ff-bde7-6c0d13726844',
   sequence_num:1,last_committed_entry_id:null,last_committed_entry_hash:null}),
  lookup:async({entryId})=>saved.get(entryId)||null,
  invoke:async({approval,resolution})=>{
   rpcCount++;
   validateUniverseEntry(approval);validateUniverseEntry(resolution);
   assert.equal(resolution.payload.resolution_status,'ABANDONED');
   assert.equal(resolution.payload.user_message_hash,userEntry.ledger_entry_hash);
   assert.equal(resolution.payload.interruption_receipt_hash,interrupted.ledger_entry_hash);
   saved.set(approval.entry_id,approval);saved.set(resolution.entry_id,resolution);
   f={...f,status:'IDLE',active_turn_id:null,sequence_num:0};
   return {status:'ABANDONED',receipt_id:resolution.entry_id,
    receipt_hash:resolution.ledger_entry_hash};
  },get rpcCount(){return rpcCount;},stale:()=>{f={...f,sequence_num:2}}};
}
const sessionA='Bearer SYNTHETIC_SESSION_TOKEN_FOR_TEST_OWNER_1234567890';
const sessionB='Bearer DIFFERENT_SYNTHETIC_SESSION_TOKEN_SAME_OWNER_12345';
const getReq={method:'GET',headers:{authorization:sessionA},
 query:{conversation_id:cid,turn_id:tid}};
const approvals=(challenge)=>({method:'POST',headers:{authorization:sessionA},body:{
 conversation_id:cid,turn_id:tid,challenge,
 typed_acknowledgment:ACKNOWLEDGMENT_TEXT,
 confirmed_uncertain_execution:true,confirmed_possible_billing:true}});
test('disabled by default: no authorization or database lookup',async()=>{
 let checked=0;
 await assert.rejects(prepareOwnerAbandonment(getReq,{
  env:{...env,REALITY_TURN_ABANDONMENT_ENABLED:'false'},
  verify:async()=>{checked++}}),/ABANDONMENT_DISABLED/);
 assert.equal(checked,0);
});
test('fresh review challenge, double acknowledgment, immutable evidence, post-RPC readback',async()=>{
 const f=fixture();
 const review=await prepareOwnerAbandonment(getReq,{env,...f,now:()=>clock});
 assert.equal(review.status,'OWNER_APPROVAL_REQUIRED');
 const req=approvals(review.challenge);
 await assert.rejects(confirmOwnerAbandonment({method:'POST',body:{
  ...req.body,confirmed_possible_billing:false}},{env,...f,now:()=>clock+1}),
 /ABANDONMENT_EXPLICIT_CONFIRMATION_REQUIRED/);
 assert.equal(f.rpcCount,0);
 const result=await confirmOwnerAbandonment(req,{env,...f,now:()=>clock+1});
 assert.equal(result.status,'ABANDONED_AFTER_OWNER_REVIEW');
 assert.equal(result.independently_verified_receipt,true);
 assert.equal(result.independently_verified_fence,true);
 assert.equal(result.model_retried,false);
 assert.equal(f.rpcCount,1);
});
test('expired and altered signed challenge deny all mutations',async()=>{
 const f=fixture();
 const review=await prepareOwnerAbandonment(getReq,{env,...f,now:()=>clock});
 await assert.rejects(confirmOwnerAbandonment(approvals(review.challenge),{
  env,...f,now:()=>clock+300001}),/ABANDONMENT_CHALLENGE_EXPIRED_OR_STALE/);
 const forged=review.challenge.slice(0,-2)+'XX';
 await assert.rejects(confirmOwnerAbandonment(approvals(forged),{
  env,...f,now:()=>clock+1}),/ABANDONMENT_CHALLENGE_INVALID/);
 assert.equal(f.rpcCount,0);
});
test('race: owner review expires when claimed sequence changes',async()=>{
 const f=fixture();
 const challenge=(await prepareOwnerAbandonment(getReq,{env,...f,now:()=>clock})).challenge;
 f.stale();
 await assert.rejects(confirmOwnerAbandonment(approvals(challenge),{
  env,...f,now:()=>clock+1}),/ABANDONMENT_NOT_ELIGIBLE_PRIOR_COMMIT_EVIDENCE_REQUIRED/);
 assert.equal(f.rpcCount,0);
});
test('review challenge cannot cross bearer sessions for the same owner',async()=>{
 const f=fixture();
 const challenge=(await prepareOwnerAbandonment(getReq,{env,...f,now:()=>clock})).challenge;
 const other=approvals(challenge);
 other.headers.authorization=sessionB;
 await assert.rejects(confirmOwnerAbandonment(other,{
  env,...f,now:()=>clock+1}),/ABANDONMENT_CHALLENGE_EXPIRED_OR_STALE/);
 assert.equal(f.rpcCount,0);
});
test('replacement claim with same turn and sequence cannot reuse original challenge',async()=>{
 const f=fixture();
 const challenge=(await prepareOwnerAbandonment(getReq,{env,...f,now:()=>clock})).challenge;
 await assert.rejects(confirmOwnerAbandonment(approvals(challenge),{
  env,...f,now:()=>clock+1,
  loadClaim:async()=>({
   ...await f.loadClaim(),active_claim_token:'95e5fd0b-05b8-4725-b599-10f49bc4d781'
  })
 }),/ABANDONMENT_CHALLENGE_EXPIRED_OR_STALE/);
 assert.equal(f.rpcCount,0);
});
test('older USER-only turn, foreign identity fields and production rejected',async()=>{
 const f=fixture();
 await assert.rejects(prepareOwnerAbandonment(getReq,{
  env,...f,inspect:async()=>({...status,status:'RECEIVED',
   evidence:{interruption_recorded:false}})}),/ABANDONMENT_NOT_ELIGIBLE/);
 await assert.rejects(prepareOwnerAbandonment({method:'GET',query:{
  ...getReq.query,owner_user_id:'foreign'}},{env,...f}),/ABANDONMENT_SELECTOR_INVALID/);
 await assert.rejects(prepareOwnerAbandonment(getReq,{
  env:{...env,VERCEL_ENV:'production'},...f}),
 /STANDALONE_PRODUCTION_RELEASE_NOT_AUTHORIZED/);
 assert.equal(f.rpcCount,0);
});
