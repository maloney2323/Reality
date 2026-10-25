import test from 'node:test';
import assert from 'node:assert/strict';
import {TURNS,EVENTS,HASH,stamp} from '../benchmarks/reality-construction-25turn-dual-v1.mjs';
import {buildInvariantFrame,assessInvariantTransition} from '../src/reality-alignment-invariant-contract-v0.1.js';
import {buildSelectiveCognitiveAlignmentV02} from '../src/reality-selective-cognitive-alignment-v0.2.js';
const root='fictional:construction:25turn-comparison-v1';
const frame=n=>buildInvariantFrame({
 records:EVENTS,asOf:stamp(n),worldId:'fictional:construction',
 continuityRootId:root,activeObjective:'Safely complete construction with source checks'});
const v02=n=>buildSelectiveCognitiveAlignmentV02({
 currentUserMessage:TURNS[n-1].user,
 currentUserSourceRef:TURNS[n-1].source_ref,priorTurns:[],
 historySource:'AUTHENTICATED_CONVERSATION_MESSAGES',continuityRootId:root,frame:frame(n),
});
test('exactly 25 unique fixed multi-turn adversarial cases, stable digest',()=>{
 assert.equal(TURNS.length,25);
 assert.equal(new Set(TURNS.map(x=>x.turn)).size,25);
 assert.ok(HASH.startsWith('sha256:'));
 assert.ok(TURNS.some(x=>x.kind==='BITEMPORAL_TWO_CLOCKS'));
});
test('source snapshots preserve as-known facts despite late-entered retroactive HOLD',()=>{
 for(const n of [12,13,14,19])assert.equal(frame(n).time_scoped_state.inspection_wr41.value,'PASS');
 for(const n of [20,21,22,23,24,25])assert.equal(frame(n).time_scoped_state.inspection_wr41.value,'HOLD');
 assert.equal(frame(20).time_scoped_state.inspection_wr41.system_time,stamp(20));
 assert.equal(frame(20).time_scoped_state.inspection_wr41.valid_from,stamp(18));
});
test('homeowner approval transitions from absent to verified to withdrawn; no auto-send',()=>{
 assert.equal(frame(14).time_scoped_state.homeowner_scope_approval.value,'NOT_VERIFIED');
 assert.equal(frame(15).time_scoped_state.homeowner_scope_approval.value,'VERIFIED');
 assert.equal(frame(24).time_scoped_state.homeowner_scope_approval.value,'WITHDRAWN');
 const attempt=assessInvariantTransition(frame(15),{
  action:'SEND_ESTIMATE',worldId:'fictional:construction',
  expectedFrameHash:frame(15).frame_hash});
 assert.equal(attempt.allowed,false);
 assert.equal(attempt.reason,'EXPLICIT_EXECUTION_AUTHORITY_NOT_VERIFIED');
});
test('turn 23 closes discovered city-HOLD + coordinator-approval gap in experimental sandbox',()=>{
 const f=frame(23);
 assert.equal(f.time_scoped_state.dispatch_approval.value,'VERIFIED');
 assert.equal(f.time_scoped_state.inspection_wr41.value,'HOLD');
 assert.equal(f.prohibited_transitions.includes('DISPATCH_CREW'),true);
 assert.equal(assessInvariantTransition(f,{
  action:'DISPATCH_CREW',worldId:f.world_id,expectedFrameHash:f.frame_hash,
  authorization:{
   authorized:true,action:'DISPATCH_CREW',world_id:f.world_id,
   frame_hash:f.frame_hash,authorization_receipt_id:'fixture:explicit:authorization',
  },
 }).reason,'GROUNDING_PRECONDITION_NOT_MET');
});
test('city HOLD denial does not blindly override explicitly cleared PASS + coordinator approval',()=>{
 const f=buildInvariantFrame({
  records:[...EVENTS,{world_id:'fictional:construction',
    key:'dispatch_approval',value:'VERIFIED',source_receipt_id:'fixture:coordinator:5',
    source_kind:'FROZEN_SYNTHETIC_TEST_FIXTURE',system_time:stamp(13),
    valid_from:stamp(13),valid_until:null}],
  asOf:stamp(14),worldId:'fictional:construction',
  continuityRootId:root,activeObjective:'Safe dispatch'});
 assert.equal(f.time_scoped_state.inspection_wr41.value,'PASS');
 assert.equal(f.time_scoped_state.dispatch_approval.value,'VERIFIED');
 assert.equal(f.prohibited_transitions.includes('DISPATCH_CREW'),false);
 const check=assessInvariantTransition(f,{
  action:'DISPATCH_CREW',worldId:f.world_id,expectedFrameHash:f.frame_hash,
  authorization:{authorized:true,action:'DISPATCH_CREW',world_id:f.world_id,
    frame_hash:f.frame_hash,authorization_receipt_id:'fixture:explicit:authorization'},
 });
 assert.equal(check.allowed,true);
 assert.equal(check.execution_performed,false);
});
test('Reality v0.2 sees current user turn and relevant material state on compounded closure',()=>{
 const p=v02(25);
 const objective=p.capsule.PRIMARY_OBJECTIVE.original_current_user_request;
 assert.match(objective,/city HOLD active/);
 assert.ok(p.capsule.RELEVANT_OPERATIONAL_TRUTH.some(x=>x.key==='inspection_wr41'&&x.value==='HOLD'));
 assert.ok(p.capsule.RELEVANT_OPERATIONAL_TRUTH.some(x=>x.key==='homeowner_scope_approval'&&x.value==='WITHDRAWN'));
});
test('source-linked packet does not quietly treat inspection PASS as current after turn 20',()=>{
 const p=v02(20);
 assert.equal(p.capsule.RELEVANT_OPERATIONAL_TRUTH.find(x=>x.key==='inspection_wr41').value,'HOLD');
 assert.equal(p.capsule.ACTION_PRECONDITIONS.some(x=>x.external_action_authorized),false);
});
