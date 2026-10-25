import test from 'node:test';
import assert from 'node:assert/strict';
import {CASEPACK_HASH,CONVERSATION_CASEPACK,FIXTURE_RECORDS,ts}
 from '../benchmarks/reality-pre-cognition-alignment-12turn-v0.1.mjs';
import {buildInvariantFrame,assessInvariantTransition,compareInvariantFrames}
 from '../src/reality-alignment-invariant-contract-v0.1.js';

const build=n=>buildInvariantFrame({
 records:FIXTURE_RECORDS,asOf:ts(n),worldId:'fictional:construction',
 continuityRootId:'fictional:12turn-test',activeObjective:'Safely finish construction work',
});
test('casepack fixed at twelve authored chronological turns with source evidence',()=>{
 assert.equal(CONVERSATION_CASEPACK.length,12);
 assert.ok(CASEPACK_HASH.startsWith('sha256:'));
 assert.equal(CONVERSATION_CASEPACK[0].turn,1);
 assert.equal(CONVERSATION_CASEPACK.at(-1).turn,12);
 assert.deepEqual(new Set(CONVERSATION_CASEPACK.map(x=>x.turn)).size,12);
});
test('before turn eleven homeowner approval remains unverified despite office and subcontractor claims',()=>{
 for(const turn of [1,2,5,7,8,10]){
  const frame=build(turn);
  assert.equal(frame.time_scoped_state.homeowner_scope_approval.value,'NOT_VERIFIED');
  assert.ok(frame.prohibited_transitions.includes('SEND_ESTIMATE'));
  const attempted=assessInvariantTransition(frame,{
   action:'SEND_ESTIMATE',worldId:frame.world_id,
   expectedFrameHash:frame.frame_hash,
  });
  assert.equal(attempted.allowed,false);
  assert.equal(attempted.reason,'GROUNDING_PRECONDITION_NOT_MET');
 }
});
test('turn eleven source approval changes precondition, but does not grant send execution authority',()=>{
 const f=build(11);
 assert.equal(f.time_scoped_state.homeowner_scope_approval.value,'VERIFIED');
 assert.equal(f.prohibited_transitions.includes('SEND_ESTIMATE'),false);
 const attempted=assessInvariantTransition(f,{action:'SEND_ESTIMATE',
  worldId:f.world_id,expectedFrameHash:f.frame_hash});
 assert.equal(attempted.allowed,false);
 assert.equal(attempted.reason,'EXPLICIT_EXECUTION_AUTHORITY_NOT_VERIFIED');
});
test('bitemporal late record does not leak into past turn ten/eleven, changes valid state on turn twelve',()=>{
 const at9=build(9),at10=build(10),at11=build(11),at12=build(12);
 for(const x of [at9,at10,at11])
  assert.equal(x.time_scoped_state.inspection_wr41.value,'PASS');
 assert.equal(at12.time_scoped_state.inspection_wr41.value,'HOLD');
 assert.equal(at12.time_scoped_state.inspection_wr41.system_time,ts(12));
 assert.equal(at12.time_scoped_state.inspection_wr41.valid_from,ts(10));
 const diff=compareInvariantFrames(at11,at12);
 assert.ok(diff.changes.some(x=>x.key==='inspection_wr41' &&
  x.before.value==='PASS'&&x.after.value==='HOLD'));
 assert.notEqual(diff.before_hash,diff.after_hash);
});
test('wrong world, stale hash, unknown action and missing exact scoped approval cannot bypass a gate',()=>{
 const frame=build(11);
 for(const x of [
  {action:'SEND_ESTIMATE',worldId:'other:world',expectedFrameHash:frame.frame_hash},
  {action:'SEND_ESTIMATE',worldId:frame.world_id,expectedFrameHash:'sha256:stale'},
  {action:'DELETE_CUSTOMER_DB',worldId:frame.world_id,expectedFrameHash:frame.frame_hash},
  {action:'SEND_ESTIMATE',worldId:frame.world_id,expectedFrameHash:frame.frame_hash,
   authorization:{authorized:true,action:'SEND_ESTIMATE',
   world_id:frame.world_id,frame_hash:'sha256:wrong',
   authorization_receipt_id:'forged:scope'}},
 ])assert.equal(assessInvariantTransition(frame,x).allowed,false);
});
test('matching synthetic authorization is preflight eligible, never implies real action executed',()=>{
 const frame=build(11);
 const res=assessInvariantTransition(frame,{
  action:'SEND_ESTIMATE',worldId:frame.world_id,expectedFrameHash:frame.frame_hash,
  authorization:{authorized:true,action:'SEND_ESTIMATE',
   world_id:frame.world_id,frame_hash:frame.frame_hash,
   authorization_receipt_id:'fixture:exact-human-permission'},
 });
 assert.equal(res.allowed,true);
 assert.equal(res.execution_performed,false);
 assert.equal(res.reason,'SANDBOX_PREFLIGHT_ELIGIBLE_ONLY');
});
test('content hash is deterministic, scope and source mismatches fail closed',()=>{
 assert.equal(build(9).frame_hash,build(9).frame_hash);
 assert.notEqual(build(9).frame_hash,build(10).frame_hash);
 assert.throws(()=>buildInvariantFrame({asOf:ts(4),worldId:'w',
  records:[{key:'inspection_wr41',world_id:'x',
   value:'PASS',source_receipt_id:'fixture:wrong-world',
   valid_from:ts(1),system_time:ts(1)}],
  activeObjective:'a'}),/INVARIANT_UNTRUSTED_OR_MALFORMED_SOURCE/);
});
test('unknown and conflicting records do not unlock a prohibited action',()=>{
 const records=FIXTURE_RECORDS.filter(x=>x.key!=='homeowner_scope_approval');
 const f=buildInvariantFrame({records,asOf:ts(11),
  worldId:'fictional:construction',activeObjective:'Safe workflow'});
 assert.equal(f.time_scoped_state.homeowner_scope_approval.state,'UNKNOWN');
 assert.ok(f.prohibited_transitions.includes('SEND_ESTIMATE'));
});

test('delta handles a previously unknown fact that first appears on turn five',()=>{
 const turn4=build(4),turn5=build(5);
 assert.equal(turn4.time_scoped_state.office_estimate_review,undefined);
 assert.equal(turn5.time_scoped_state.office_estimate_review.value,'COMPLETE');
 const diff=compareInvariantFrames(turn4,turn5);
 const item=diff.changes.find(x=>x.key==='office_estimate_review');
 assert.ok(item);
 assert.equal(item.before.state,'UNKNOWN');
 assert.equal(item.after.value,'COMPLETE');
});
