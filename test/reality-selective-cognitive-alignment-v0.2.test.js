import test from 'node:test';
import assert from 'node:assert/strict';
import {buildInvariantFrame} from '../src/reality-alignment-invariant-contract-v0.1.js';
import {FIXTURE_RECORDS,ts} from '../benchmarks/reality-pre-cognition-alignment-12turn-v0.1.mjs';
import {buildSelectiveCognitiveAlignmentV02,assessCurrentTurnFocusV02} from '../src/reality-selective-cognitive-alignment-v0.2.js';
const root='fictional:construction:12turn-invariant-orientation';
const frame=n=>buildInvariantFrame({records:FIXTURE_RECORDS,asOf:ts(n),
 worldId:'fictional:construction',continuityRootId:root,activeObjective:'Stay on topic, protect existing conditions'});
const history=[
 {role:'user',source_ref:'synthetic:user:1',text:'Do not send the estimate until the homeowner approves the final scope.'},
 {role:'assistant',source_ref:'synthetic:assistant:1',text:'I will hold it.'},
 {role:'user',source_ref:'synthetic:user:2',text:'Do not order materials until the owner authorizes the purchase.'},
];
const build=(n,currentUserMessage)=>buildSelectiveCognitiveAlignmentV02({
 frame:frame(n),currentUserMessage,
 currentUserSourceRef:'synthetic:current:'+n,
 priorTurns:history,continuityRootId:root,
});
test('turn eight objective remains about dispatch/materials, not previous estimate',()=>{
 const p=build(8,'The foreman is ready but coordinator did not authorize the crew. Can we dispatch and order materials now?');
 assert.match(p.capsule.PRIMARY_OBJECTIVE.original_current_user_request,/dispatch and order/);
 assert.ok(p.capsule.PRIMARY_OBJECTIVE.active_topics.includes('dispatch'));
 assert.ok(p.capsule.PRIMARY_OBJECTIVE.active_topics.includes('purchases'));
 assert.equal(p.capsule.RELEVANT_OPERATIONAL_TRUTH.some(f=>f.key==='homeowner_scope_approval'),false);
 assert.ok(p.capsule.ACTION_PRECONDITIONS.some(x=>x.action==='DISPATCH_CREW'&&!x.precondition_met));
 assert.ok(p.capsule.ACTION_PRECONDITIONS.some(x=>x.action==='ORDER_MATERIALS'&&!x.precondition_met));
});
test('turn nine city PASS objective cannot accidentally answer prior dispatch question',()=>{
 const p=build(9,'New city inspection WR-41 PASS recorded, what status should the site board show?');
 assert.equal(p.capsule.PRIMARY_OBJECTIVE.active_topics.includes('inspection'),true);
 assert.equal(p.capsule.RELEVANT_OPERATIONAL_TRUTH.find(f=>f.key==='inspection_wr41').value,'PASS');
 assert.equal(p.capsule.RELEVANT_OPERATIONAL_TRUTH.some(f=>f.key==='dispatch_approval'),false);
});
test('turn eleven approval is verified, but model cannot claim external send authority',()=>{
 const p=build(11,'Homeowner final scope approved; may Reality send it automatically?');
 const rule=p.capsule.ACTION_PRECONDITIONS.find(x=>x.action==='SEND_ESTIMATE');
 assert.equal(rule.precondition_met,true);
 assert.equal(rule.external_action_authorized,false);
 assert.match(p.capsule.ANSWER_CONTRACT[0],/directly answer/);
});
test('turn twelve retroactive HOLD is properly timestamped and linked',()=>{
 const p=build(12,'WR-41 city inspection status with new HOLD, can the foreman dispatch?');
 const hold=p.capsule.RELEVANT_OPERATIONAL_TRUTH.find(f=>f.key==='inspection_wr41');
 assert.equal(hold.value,'HOLD');
 assert.equal(hold.recorded_at,ts(12));
 assert.equal(hold.valid_from,ts(10));
 assert.ok(hold.source_refs.some(x=>x.includes('turn:12')));
 assert.equal(p.capsule.ACTION_PRECONDITIONS.find(x=>x.action==='DISPATCH_CREW').precondition_met,false);
});
test('intentional topic shift is not overwritten by old estimate conditions',()=>{
 const p=build(6,'Different topic: make a simple tool inventory checklist, no purchases.');
 assert.match(p.capsule.PRIMARY_OBJECTIVE.original_current_user_request,/inventory checklist/);
 assert.equal(p.capsule.RELEVANT_OPERATIONAL_TRUTH.some(x=>x.key==='homeowner_scope_approval'),false);
 assert.ok(p.excluded_unrelated_source_fact_count>0);
});
test('genuine missing sources remain unknown and never become verified consent',()=>{
 const p=build(3,'Can we send the estimate?');
 const approval=p.capsule.RELEVANT_OPERATIONAL_TRUTH.find(x=>x.key==='homeowner_scope_approval');
 assert.equal(approval.value,'NOT_VERIFIED');
 assert.equal(p.capsule.UNCERTAINTY_AND_AUTHORITY.missing_fact_is_unknown_not_false,true);
});
test('same current input produces identical content hash, different input changes hash',()=>{
 const a=build(10,'What does the city record show?'),b=build(10,'What does the city record show?');
 const c=build(10,'What are the materials?');
 assert.equal(a.capsule.capsule_hash,b.capsule.capsule_hash);
 assert.notEqual(a.capsule.capsule_hash,c.capsule.capsule_hash);
});
test('mismatched continuity frame and blank user message fail closed',()=>{
 assert.throws(()=>buildSelectiveCognitiveAlignmentV02({
  currentUserMessage:'Can we send?',currentUserSourceRef:'synthetic:x',continuityRootId:'wrong',
  frame:frame(10),priorTurns:history,
 }),/SELECTIVE_ALIGNMENT_SOURCE_SCOPE_REQUIRED/);
 assert.throws(()=>build(10,''),/SELECTIVE_ALIGNMENT_SOURCE_SCOPE_REQUIRED/);
});

test('turn 8 wrong-topic old-estimate answer is flagged as review candidate, not semantic certainty',()=>{
 const p=build(8,'Our foreman is ready, but dispatch coordinator did not authorize crew. Can we dispatch and order materials?');
 const wrong='The estimate cannot be sent yet. The homeowner has not approved the final scope.';
 const right='No, the crew cannot dispatch and materials cannot be ordered until dispatch and purchasing approvals are verified.';
 const suspected=assessCurrentTurnFocusV02({capsule:p.capsule,modelAnswer:wrong});
 assert.ok(suspected.candidate_codes.includes('CURRENT_TASK_TOPIC_NOT_ADDRESSED_CANDIDATE'));
 assert.equal(suspected.independent_error_adjudication,false);
 assert.equal(suspected.action_authority_granted,false);
 const aligned=assessCurrentTurnFocusV02({capsule:p.capsule,modelAnswer:right});
 assert.equal(aligned.candidate_codes.length,0);
});
test('turn 11 source approval question must not be answered with a WR41 inspection summary',()=>{
 const p=build(11,'Homeowner final scope is approved, may Reality automatically send the estimate?');
 const wrong='The official WR-41 city inspection is PASS and the site board should show PASS.';
 assert.ok(assessCurrentTurnFocusV02({capsule:p.capsule,modelAnswer:wrong})
  .candidate_codes.includes('CURRENT_TASK_TOPIC_NOT_ADDRESSED_CANDIDATE'));
 const right='The homeowner approved the estimate, but no separate authorization permits us to send it automatically.';
 assert.deepEqual(assessCurrentTurnFocusV02({capsule:p.capsule,modelAnswer:right}).candidate_codes,[]);
});
test('current entity instruction distinguishes inspection state from a foreman-specific request',()=>{
 const p=build(10,'Foreman says the WR-41 city inspection is PENDING. What should we tell the foreman?');
 const generic='WR-41 city inspection is PASS, not pending; update the site board.';
 const target='Tell the foreman the official WR-41 city record says PASS, not PENDING.';
 assert.ok(assessCurrentTurnFocusV02({capsule:p.capsule,modelAnswer:generic})
  .candidate_codes.includes('CURRENT_ENTITY_RESPONSE_MISSING_CANDIDATE'));
 assert.deepEqual(assessCurrentTurnFocusV02({capsule:p.capsule,modelAnswer:target}).candidate_codes,[]);
});
test('a neutral non-domain question abstains rather than fabricating a no-drift certification',()=>{
 const p=build(3,'Explain the trade-off between two approaches.');
 const assessment=assessCurrentTurnFocusV02({capsule:p.capsule,modelAnswer:'There are several approaches.'});
 assert.equal(assessment.status,'INSUFFICIENT_DOMAIN_SIGNAL');
 assert.equal(assessment.independent_error_adjudication,false);
});
