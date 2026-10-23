import test from 'node:test';
import assert from 'node:assert/strict';
import {planIncompleteTurnAbandonment}
 from '../src/reality-incomplete-turn-abandonment-plan-v0.1.js';
const id='previous-turn';
const eligible=()=>({
 turn_id:id,status:'INTERRUPTED',committed:false,
 evidence:{interruption_recorded:true,assistant_message_entry_id:null,
  processing_receipt_entry_id:'signed-processing'},
});
const fence=()=>({
 status:'BUSY',active_turn_id:id,sequence_num:1,
 last_committed_entry_id:null,last_committed_entry_hash:null,
});
test('the actual newer Preview failure is proposed for REVIEW only; never authorized',()=>{
 const x=planIncompleteTurnAbandonment({turn:eligible(),fence:fence(),turnId:id});
 assert.equal(x.status,'REVIEW_ELIGIBLE_NOT_AUTHORIZED');
 assert.equal(x.next_committed_sequence_after_abandonment,0);
 assert.equal(x.permitted_to_execute,false);
 assert.equal(x.authorization_granted,false);
 assert.equal(x.provider_call_outcome,'UNKNOWN_MAY_HAVE_BEEN_BILLED');
 assert.ok(x.required_evidence.includes('ATOMIC_APPEND_ABANDONMENT_RECEIPT_AND_CLEAR_FENCE'));
});
test('the older USER-only interruption is not eligible for automated abandonment',()=>{
 const x=planIncompleteTurnAbandonment({turn:{...eligible(),status:'RECEIVED',
  evidence:{interruption_recorded:false}},fence:fence(),turnId:id});
 assert.equal(x.status,'NOT_ELIGIBLE');
 assert.equal(x.reason,'DURABLE_INTERRUPTION_RECEIPT_REQUIRED');
});
test('a model response stored without COMMITTED is never silently discarded',()=>{
 const x=planIncompleteTurnAbandonment({turn:{...eligible(),
  status:'RESPONSE_STORED_UNCOMMITTED',evidence:{assistant_message_entry_id:'a',
   interruption_recorded:true}},fence:fence(),turnId:id});
 assert.equal(x.status,'NOT_ELIGIBLE');
 assert.equal(x.permitted_to_execute,false);
});
test('any wrong active turn, idle fence or forged sequence is rejected',()=>{
 for(const f of [{...fence(),active_turn_id:'not-the-turn'},
  {...fence(),status:'IDLE'}, {...fence(),sequence_num:0}]){
  assert.equal(planIncompleteTurnAbandonment({turn:eligible(),fence:f,turnId:id}).permitted_to_execute,false);
  assert.equal(planIncompleteTurnAbandonment({turn:eligible(),fence:f,turnId:id}).status,'NOT_ELIGIBLE');
 }
});
test('subsequent abandoned claim resets to previously committed index for an unbroken chain',()=>{
 const f={...fence(),sequence_num:7,last_committed_entry_id:'committed-6',
  last_committed_entry_hash:'a'.repeat(64)};
 const x=planIncompleteTurnAbandonment({turn:eligible(),fence:f,turnId:id});
 assert.equal(x.status,'REVIEW_ELIGIBLE_NOT_AUTHORIZED');
 assert.equal(x.next_committed_sequence_after_abandonment,6);
});
test('no predecessor hash or mismatched genesis evidence => fail closed',()=>{
 const cases=[{...fence(),sequence_num:2,last_committed_entry_id:'a'},
  {...fence(),last_committed_entry_id:'corrupt-predecessor'}];
 for(const f of cases)
  assert.equal(planIncompleteTurnAbandonment({turn:eligible(),fence:f,turnId:id}).status,'NOT_ELIGIBLE');
});
test('production or external-action contexts categorically excluded from preview-only plan',()=>{
 assert.equal(planIncompleteTurnAbandonment({turn:eligible(),fence:fence(),turnId:id,
  previewOnly:false}).reason,'PRODUCTION_OR_EXTERNAL_ACTION_WORKFLOW_NOT_SUPPORTED');
});
