import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniverseEntry} from '../src/reality-universe-persistence-contract-v1.0.js';
import {createStandaloneConversationScope} from '../src/reality-standalone-auth-v0.1.js';
import {causalTurnIds} from '../src/reality-causal-turn-commit-v0.1.js';
import {abandonmentEntryId,inspectAbandonedTurn}
 from '../src/reality-abandoned-turn-readback-v1.js';
const user='e83340ec-4266-4c95-a6cd-929bc58b445e';
const scope=createStandaloneConversationScope({userId:user,conversationId:'original-conversation'});
const tid='abandoned-turn',ids=causalTurnIds(scope,tid),t='2026-10-23T13:00:00.000Z';
function make(entry_id,event_kind,payload,evidence_references=[]){
 return createUniverseEntry({entry_id,continuity_root_id:scope.continuity_root_id,
  worldline_id:scope.worldline_id,event_kind,epistemic_kind:'OBSERVATION',
  assertion_time:t,effective_time:t,source_ref:'synthetic',
  payload,evidence_references,provenance:{source:'synthetic',authenticated_user_id:user}});
}
function fixture(){
 const u=make(ids.user,'AUTHENTICATED_CONVERSATION_MESSAGE',
  {role:'user',turn_id:tid,principal_id:user,text:'Approval required'});
 const p=make(ids.processing,'REALITY_CAUSAL_TURN_RECEIPT',{phase:'PROCESSING',turn_id:tid});
 const i=make(ids.interrupted,'REALITY_CAUSAL_TURN_RECEIPT',{phase:'INTERRUPTED',turn_id:tid});
 const a=make(abandonmentEntryId(scope,tid,'approval'),'REALITY_TURN_ABANDONMENT_APPROVAL',
  {owner_user_id:user,turn_id:tid,approval_intent:'EXPLICIT_OWNER_ABANDON_INCOMPLETE',
   acknowledges_uncertain_model_execution:true,acknowledges_possible_model_billing:true,
   user_message_hash:u.ledger_entry_hash,interruption_receipt_hash:i.ledger_entry_hash});
 const r=make(abandonmentEntryId(scope,tid,'resolution'),'REALITY_TURN_RESOLUTION_RECEIPT',
  {owner_user_id:user,turn_id:tid,resolution_status:'ABANDONED',
   model_call_outcome:'UNKNOWN',external_action_outcome:'NOT_ESTABLISHED',
   approval_receipt_id:a.entry_id,approval_receipt_hash:a.ledger_entry_hash,
   user_message_hash:u.ledger_entry_hash,
   processing_receipt_hash:p.ledger_entry_hash,
   interruption_receipt_hash:i.ledger_entry_hash},
  [u.entry_id,p.entry_id,i.entry_id,a.entry_id]);
 const rows=new Map([u,p,i,a,r].map(x=>[x.entry_id,x]));
 return {rows,lookup:async({entryId})=>rows.get(entryId)||null};
}
const turn={status:'INTERRUPTED',committed:false,turn_id:tid};
test('exact signed abandonment chain classifies the original turn as archived, not completed',async()=>{
 const f=fixture();
 const x=await inspectAbandonedTurn({scope,turnId:tid,turn,lookup:f.lookup});
 assert.equal(x.status,'ABANDONED_AFTER_OWNER_REVIEW');
 assert.equal(x.committed,false);
 assert.equal(x.publishable_assistant_result,false);
 assert.equal(x.model_outcome,'UNKNOWN');
});
test('no signed resolution receipt keeps the turn interrupted',async()=>{
 const f=fixture();f.rows.delete(abandonmentEntryId(scope,tid,'resolution'));
 assert.equal(await inspectAbandonedTurn({scope,turnId:tid,turn,lookup:f.lookup}),null);
});
test('mismatched owner, changed receipt payload, missing original and COMMITTED turn fail closed',async()=>{
 const f=fixture();
 const original=f.rows.get(abandonmentEntryId(scope,tid,'resolution'));
 const other=createStandaloneConversationScope({
  userId:'f44440ec-4266-4c95-a6cd-929bc58b445f',conversationId:'original-conversation'});
 assert.equal(await inspectAbandonedTurn({scope:other,turnId:tid,turn,lookup:f.lookup}),null);
 f.rows.set(original.entry_id,{...original,payload:{...original.payload,model_call_outcome:'VERIFIED'}});
 await assert.rejects(inspectAbandonedTurn({scope,turnId:tid,turn,lookup:f.lookup}),/UNIVERSE_LEDGER_HASH_MISMATCH/);
 f.rows.set(original.entry_id,original);
 f.rows.delete(ids.user);
 await assert.rejects(inspectAbandonedTurn({scope,turnId:tid,turn,lookup:f.lookup}),/ABANDONMENT_EVIDENCE_MISSING/);
 f.rows.set(ids.user,fixture().rows.get(ids.user));
 await assert.rejects(inspectAbandonedTurn({scope,turnId:tid,
  turn:{status:'COMMITTED',committed:true,turn_id:tid},lookup:f.lookup}),
 /ABANDONMENT_STORED_STATE_INVALID/);
});
