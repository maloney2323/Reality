import test from 'node:test';
import assert from 'node:assert/strict';
import {extractUserIntentAnchors} from '../src/reality-continuous-integrity-spine-v0.1.js';
import {observeUserConditions,projectUserConditions,assessProposalAgainstObservedConditions}
 from '../src/reality-obligation-observation-v0.1.js';
import {validateUniverseEntry,assertAppendOnly} from '../src/reality-universe-persistence-contract-v1.0.js';

const scope={owner_user_id:'signed-in-owner',continuity_root_id:'continuity:owner-construction',
 worldline_id:'reality:personal',work_item_id:'job:estimate:12'};
const input={
 trustedScope:scope,userSignal:{entry_id:'reality:auth-message:turn-one',
  turn_id:'turn:1',
  text:'For the construction job, do not send an estimate until the homeowner approves it.'},
 observedAt:'2026-10-23T16:38:57.704Z',
};
const get=(p={})=>observeUserConditions({...input,...p});
test('actual real pilot wording yields a typed condition despite introductory work context',()=>{
 const x=extractUserIntentAnchors(input.userSignal.text,input.userSignal.entry_id,0);
 assert.equal(x.length,1);
 assert.equal(x[0].action_text,'send an estimate');
 assert.equal(x[0].condition_text,'the homeowner approves it');
 assert.equal(x[0].original_user_text,input.userSignal.text);
 const rows=get();
 assert.equal(rows.length,1);
 assert.equal(rows[0].payload.condition_text,'the homeowner approves it');
 assert.equal(rows[0].payload.approval_status,'UNKNOWN_NOT_EVALUATED');
 assert.equal(validateUniverseEntry(rows[0]).valid,true);
});
test('simple user preconditions continue to extract with no context prefix',()=>{
 const msgs=[
  'Do not send the estimate until homeowner approval.',
  'Do not order materials until the owner signs the quote.',
  'Never publish the announcement unless the manager signs off.',
 ];
 for(const msg of msgs){
  const x=get({userSignal:{...input.userSignal,text:msg}});
  assert.equal(x.length,1,msg);
 }
});
test('related non-instructions and quotations are not automatically operational obligations',()=>{
 for(const msg of [
  'What a nice day for planning the kitchen.',
  '> Do not send the estimate until the owner approves it.',
  '"Do not send the estimate until the owner approves it."',
  'For the construction job, perhaps we should send the estimate.',
 ]){
  assert.equal(get({userSignal:{...input.userSignal,text:msg}}).length,0,msg);
 }
});
test('negative action proposal produces a candidate finding, not an action or proven hallucination',()=>{
 const rows=get();
 const a=assessProposalAgainstObservedConditions({
  trustedScope:scope,entries:rows,modelAnswer:"I'll send the estimate now.",modelResponseId:'mock:turn3'});
 assert.equal(a.status,'PROPOSAL_CONFLICT_CANDIDATE');
 assert.equal(a.candidate_findings.length,1);
 assert.equal(a.candidate_findings[0].classification,'CONVERSATIONAL_PRECONDITION_DRIFT');
 assert.equal(a.candidate_findings[0].verified_hallucination,false);
 assert.equal(a.action_authorized,false);
 assert.equal(a.action_executed,false);
 assert.equal(a.underlying_drift_rate,null);
 assert.equal(a.residual_drift_rate,null);
});
test('compliant reply or mere draft creation never gets a false conflict',()=>{
 const rows=get();
 for(const answer of [
  "I'll prepare a draft, and won't send the estimate until the homeowner approves it.",
  "I'll prepare the estimate for review.",
  "We can send the estimate once the homeowner approves it.",
  "What if we send the estimate?",
 ]){
  const a=assessProposalAgainstObservedConditions({
   trustedScope:scope,entries:rows,modelAnswer:answer,modelResponseId:'mock:ok'});
  assert.equal(a.status,'LIMITED_CHECK_NO_CONFLICT',answer);
  assert.equal(a.candidate_findings.length,0,answer);
 }
});
test('100-turn and 678-turn cold reconstruction keep the original user condition',()=>{
 const original=get(),otherTurns=Array.from({length:677},(_,i)=>({role:'assistant',
  text:'Different topic '+i}));
 // No dependence on the newest 80 messages: the original condition is its own
 // explicit Universe record. Retrieval beyond 80 turns needs live wiring.
 assert.equal(otherTurns.length,677);
 const view=projectUserConditions({trustedScope:scope,entries:original});
 assert.equal(view.observed_conditions.length,1);
 assert.equal(view.observed_conditions[0].original_user_text,input.userSignal.text);
 assert.equal(view.complete_history_verified,false);
 const x=assessProposalAgainstObservedConditions({trustedScope:scope,entries:original,
  modelAnswer:"We'll send the estimate now.",modelResponseId:'model:turn678'});
 assert.equal(x.status,'PROPOSAL_CONFLICT_CANDIDATE');
});
test('cross-owner, cross-root and different job cannot leak another business instruction',()=>{
 const foreign=get({trustedScope:{...scope,owner_user_id:'other-owner',continuity_root_id:'other-root'}});
 const otherJob=get({trustedScope:{...scope,work_item_id:'job:estimate:another'}});
 const r=projectUserConditions({trustedScope:scope,entries:[...foreign,...otherJob]});
 assert.equal(r.observed_conditions.length,0);
 assert.equal(r.action_authorized,false);
});
test('same signal is idempotent; modified condition with same source entry conflicts',()=>{
 const a=get()[0],b=get()[0];
 assert.equal(a.ledger_entry_hash,b.ledger_entry_hash);
 assert.equal(a.entry_id,b.entry_id);
 assert.equal(assertAppendOnly([a],b).allowed,false);
 const changed=get({userSignal:{...input.userSignal,text:'For the construction job, do not send an estimate until the owner signs the document.'}})[0];
 assert.notEqual(a.entry_id,changed.entry_id); // Different rule, same source ID is suspect; cannot overwrite first.
 assert.equal(assertAppendOnly([a],changed).allowed,true);
});
test('tampering an existing source-condition receipt cannot pass its ledger validation',()=>{
 const good=get()[0];
 const forged={...good,payload:{...good.payload,condition_text:'No approval needed'}};
 assert.throws(()=>projectUserConditions({trustedScope:scope,entries:[forged]}),/UNIVERSE_LEDGER_HASH_MISMATCH/);
});
test('unauthenticated identity fields and missing raw user reference fail closed',()=>{
 assert.throws(()=>get({trustedScope:{...scope,owner_user_id:null}}),/OBLIGATION_TRUSTED_PRINCIPAL_REQUIRED/);
 assert.throws(()=>get({trustedScope:{...scope,continuity_root_id:null}}),/OBLIGATION_TRUSTED_ROOT_REQUIRED/);
 assert.throws(()=>get({userSignal:{...input.userSignal,entry_id:null}}),/OBLIGATION_USER_ENTRY_REQUIRED/);
 assert.throws(()=>get({observedAt:'not a date'}),/OBLIGATION_OBSERVED_TIME_INVALID/);
});
test('source transcript claims do not become independently verified business facts',()=>{
 const r=get()[0];
 assert.equal(r.payload.fulfillment_status,'UNKNOWN_NOT_EVALUATED');
 assert.equal(r.payload.origin_status,'OBSERVED_INSTRUCTION_UNADJUDICATED');
 assert.equal(r.payload.status_transition_authorized,false);
 assert.equal(r.payload.action_authorized,false);
 assert.equal(r.payload.action_executed,false);
 assert.equal(r.payload.drift_percentage,null);
});
test('read-only projection refuses malformed scoped receipt fields and enforces bounds',()=>{
 const original=get()[0];
 const weird={...original,payload:{...original.payload,action_authorized:true}};
 // Invalid hash comes first; a forged observed authorization never survives.
 assert.throws(()=>projectUserConditions({trustedScope:scope,entries:[weird]}),/UNIVERSE_LEDGER_HASH_MISMATCH/);
 assert.throws(()=>projectUserConditions({trustedScope:scope,entries:[],limit:0}),/OBLIGATION_PROJECTION_BOUNDS_INVALID/);
 assert.throws(()=>projectUserConditions({trustedScope:scope,entries:Array.from({length:1001},()=>original)}),
  /OBLIGATION_PROJECTION_BOUNDS_INVALID/);
});
