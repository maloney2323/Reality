import test from 'node:test';
import assert from 'node:assert/strict';
import {createStandaloneConversationScope} from '../src/reality-standalone-auth-v0.1.js';
import {processStandaloneChat} from '../src/reality-standalone-chat-v0.1.js';
import {validateUniverseEntry} from '../src/reality-universe-persistence-contract-v1.0.js';
import {loadStandaloneObligations,standaloneObligationScope,
 captureStandaloneObligations} from '../src/reality-standalone-obligations-v0.1.js';

const user='e83340ec-4266-4c95-a6cd-929bc58b445e';
const scope=createStandaloneConversationScope({userId:user,conversationId:'construction-contract'});
const config={
 SUPABASE_URL:'https://reality-example.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_public_key',
 REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_STANDALONE_CHAT_ENABLED:'true',
 REALITY_STANDALONE_OBLIGATION_OBSERVATION_ENABLED:'true',
 REALITY_STANDALONE_EXPECTED_PROJECT_REF:'reality-example',
 REALITY_UNIVERSE_PERSISTENCE_URL:'https://reality-example.supabase.co',
 REALITY_UNIVERSE_PERSISTENCE_KEY:'sb_secret_TEST_ONLY_NOT_REAL_abcdefgh123456789',
 REALITY_STANDALONE_OPENAI_API_KEY:'sk-TEST_ONLY_NOT_REAL_abcdefgh123456789',
 REALITY_OPENAI_MODEL:'gpt-4.1-mini',VERCEL_ENV:'preview',
};
const mockAuth=async()=>({ok:true,status:200,json:async()=>({id:user,is_anonymous:false})});
const req=(message,turn)=>({
 method:'POST',headers:{authorization:'Bearer signed-session-test-token-abc123'},
 body:{message,conversation_id:'construction-contract',turn_id:turn},
});
function fakeLedger(){
 const records=new Map(),calls=[];
 const store=async entry=>{
  validateUniverseEntry(entry);
  if(records.has(entry.entry_id))throw Error('TEST_DUPLICATE_WRITE');
  records.set(entry.entry_id,entry);
  calls.push({kind:'write',event_kind:entry.event_kind});
  return {status:'PERSISTED',entry};
 };
 const lookup=async({entryId})=>records.get(entryId)||null;
 const load=async({continuityRootId,eventKind})=>{
  assert.equal(continuityRootId,scope.continuity_root_id);
  calls.push({kind:'read',event_kind:eventKind||'ALL'});
  return {status:'AVAILABLE',entries:[...records.values()]
   .filter(x=>x.continuity_root_id===continuityRootId&&
    (!eventKind||x.event_kind===eventKind))};
 };
 return {records,calls,store,lookup,load};
}
test('authenticated live-path mock stores and reads original user rule separately from short chat history',async()=>{
 const ledger=fakeLedger();
 const run=async input=>({
  intelligence:{response_id:'model:mock-a',
   raw_model_answer:"I'll prepare a draft and wait for approval.",
   answer:"I'll prepare a draft and wait for approval."},
  context:{continuity:{root_id:scope.continuity_root_id,
   cognitive_readback_verified:true,signal_handoff_status:'STORED_AND_READ_BACK',
   event_id:'verified-cognition:test'}},
 });
 const first=await processStandaloneChat(
  req('For the construction job, do not send an estimate until the homeowner approves it.','turn-001'),
  {env:config,fetchImpl:mockAuth,load:ledger.load,store:ledger.store,
   obligationLookup:ledger.lookup,run,now:()=> '2026-10-23T16:38:57.704Z'});
 assert.equal(first.receipt.observed_obligations.captured_from_this_turn,1);
 assert.equal(first.receipt.observed_obligations.observed_conditions_scoped,1);
 assert.equal(first.receipt.observed_obligations.proposal_assessment_status,'LIMITED_CHECK_NO_CONFLICT');
 const persisted=[...ledger.records.values()].find(r=>r.event_kind==='USER_STATED_CONDITION_OBSERVATION');
 assert.ok(persisted);
 assert.equal(persisted.payload.condition_text,'the homeowner approves it');
 assert.equal(persisted.provenance.owner_user_id,user);
 assert.equal(persisted.continuity_root_id,scope.continuity_root_id);
 assert.ok(ledger.calls.some(x=>x.event_kind==='USER_STATED_CONDITION_OBSERVATION'&&x.kind==='write'));

 const second=await processStandaloneChat(req('Is the estimate ready to send?','turn-002'),{
  env:config,fetchImpl:mockAuth,load:ledger.load,store:ledger.store,
  obligationLookup:ledger.lookup,
  run:async input=>{
   assert.equal(input.systemContext.verified_user_condition_observations.length,1);
   assert.equal(input.systemContext.verified_user_condition_observations[0].condition_text,
    'the homeowner approves it');
   return {
    intelligence:{response_id:'model:mock-b',raw_model_answer:"I'll send the estimate now.",
     answer:"I'll send the estimate now."},
    context:{continuity:{root_id:scope.continuity_root_id,
     cognitive_readback_verified:true,signal_handoff_status:'STORED_AND_READ_BACK',
     event_id:'verified-cognition:test2'}},
   };
  },
  now:()=> '2026-10-23T16:38:59.000Z',
 });
 assert.equal(second.receipt.observed_obligations.captured_from_this_turn,0);
 assert.equal(second.receipt.observed_obligations.proposal_assessment_status,'PROPOSAL_CONFLICT_CANDIDATE');
 assert.equal(second.receipt.observed_obligations.candidate_findings.length,1);
 assert.equal(second.receipt.observed_obligations.action_executed,false);
 assert.equal(second.receipt.observed_obligations.underlying_drift_rate,null);
});
test('missing verified cognition handoff prevents an observation being saved',async()=>{
 const l=fakeLedger();
 await assert.rejects(()=>processStandaloneChat(req('Do not send the estimate until approval.','turn-3'),{
  env:config,fetchImpl:mockAuth,load:l.load,store:l.store,obligationLookup:l.lookup,
  run:async()=>({intelligence:{raw_model_answer:'Ok',answer:'Ok'},
   context:{continuity:{root_id:scope.continuity_root_id,
    cognitive_readback_verified:false,signal_handoff_status:'NOT_VERIFIED'}}}),
 }),/STANDALONE_COGNITION_NOT_DURABLY_CONFIRMED/);
 assert.equal([...l.records.values()].some(x=>x.event_kind==='USER_STATED_CONDITION_OBSERVATION'),false);
});
test('a false write acknowledgement or missing independent readback prevents fake success',async()=>{
 const l=fakeLedger();
 const userEntry=[...l.records.values()][0];
 await assert.rejects(()=>captureStandaloneObligations({scope,userEntry,
  signalHandoffVerified:false,store:l.store,lookup:l.lookup}),
 /OBLIGATION_SIGNAL_HANDOFF_NOT_VERIFIED/);
});
test('read-only load fails closed on missing persistence, and projects zero when empty',async()=>{
 const empty=await loadStandaloneObligations({scope,load:async()=>({status:'AVAILABLE',entries:[]})});
 assert.equal(empty.view.observed_conditions.length,0);
 assert.equal(empty.view.complete_history_verified,false);
 await assert.rejects(()=>loadStandaloneObligations({scope,load:async()=>({status:'UNKNOWN'})}),
 /OBLIGATION_PREVIEW_LEDGER_UNAVAILABLE/);
});
test('unsafe caller scope is rejected instead of granting model or browser authority',()=>{
 assert.throws(()=>standaloneObligationScope({
  ...scope,identity_basis:'USER_CLAIMED'}),/OBLIGATION_PREVIEW_TRUSTED_SCOPE_REQUIRED/);
});
