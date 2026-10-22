import test from 'node:test';
import assert from 'node:assert/strict';
import {replayConversationTrajectory, inspectTrajectoryRecovery,
  createIntegritySpine,advanceIntegritySpine}
 from '../src/reality-continuous-integrity-spine-v0.1.js';

const root='construction:owner:retro',at='2026-10-22T18:00:00Z';
const turns=[
 {role:'user',source_ref:'chat:user:turn1',
  text:'Do not send the estimate until the customer approves it.'},
 {role:'assistant',source_ref:'chat:assistant:turn1',
  text:"I'll prepare the estimate draft and wait."},
 {role:'user',source_ref:'chat:user:turn2',
  text:'How is the draft progressing?'},
 {role:'assistant',source_ref:'chat:assistant:turn2',
  text:"We'll send the estimate when it is ready."},
];
const replay=(items=turns,priorDetectionReceipts=[])=>replayConversationTrajectory({
  priorTurns:items,
  historySource:'AUTHENTICATED_CONVERSATION_MESSAGES',
  continuityRootId:root,
  priorDetectionReceipts,
});
test('Turn 3 finds quiet mistake from Turn 2 using original Turn 1 instruction',()=>{
 const r=replay();
 assert.equal(r.status,'RETROSPECTIVE_DRIFT_CANDIDATES');
 assert.equal(r.historical_assistant_turns_checked,2);
 assert.equal(r.findings.length,1);
 const x=r.findings[0];
 assert.equal(x.apparent_origin_turn,2);
 assert.equal(x.retrospective_detection_turn,3);
 assert.equal(x.original_user_turn_ref,'chat:user:turn1');
 assert.equal(x.origin_turn_ref,'chat:assistant:turn2');
 assert.equal(x.classification,'CONVERSATIONAL_RETROSPECTIVE_DRIFT');
 assert.equal(x.previously_recorded_detection,false);
 assert.equal(x.prior_detection_completeness,'NOT_PROVEN');
 assert.equal(r.detector_recall,null);
});
test('Turn 3 model re-anchors to original intent but is not called independently verified',()=>{
 const x=inspectTrajectoryRecovery({
  replay:replay(),modelAnswer:"We'll send the estimate after the customer approves it.",
 });
 assert.equal(x.assessments[0].assessment,'MODEL_RESTATED_USER_CONDITION_UNVERIFIED');
 assert.equal(x.assessments[0].independently_verified,false);
 assert.equal(x.canonical_continuity_state_changed,false);
});
test('Turn 3 continues toward an unapproved action',()=>{
 const x=inspectTrajectoryRecovery({
  replay:replay(),modelAnswer:"I'll send the estimate now.",
 });
 assert.equal(x.assessments[0].assessment,'DRIFT_RISK_CONTINUES');
});
test('Turn 3 changes topic; no imaginary correction or verified recovery',()=>{
 const x=inspectTrajectoryRecovery({
  replay:replay(),modelAnswer:'The weather looks clear tomorrow.',
 });
 assert.equal(x.assessments[0].assessment,'RECOVERY_NOT_DEMONSTRATED');
});
test('later user approval does not rewrite the historical meaning of Turn 2',()=>{
 const later=[...turns,
 {role:'user',source_ref:'chat:user:turn3',
  text:'Actually you can send the estimate now, I approve.'},
 {role:'assistant',source_ref:'chat:assistant:turn3',
  text:'Thanks, I will send the estimate now.'},
 ];
 const x=replay(later);
 assert.equal(x.findings[0].apparent_origin_turn,2);
 assert.equal(x.findings[0].original_user_turn_ref,'chat:user:turn1');
 assert.equal(x.findings[0].origin_turn_ref,'chat:assistant:turn2');
});
test('historical assistant cannot pretend to be the person who approved work',()=>{
 const fake=[{role:'assistant',source_ref:'assistant:unauthorized',
   text:'Do not order materials until owner signs the quote.'},
 {role:'assistant',source_ref:'assistant:later',
   text:"I'll order materials now."}];
 assert.equal(replay(fake).findings.length,0);
});
test('correct historical statement produces no drift finding',()=>{
 const safe=[turns[0],turns[1],turns[2],
  {...turns[3],text:"We'll send the estimate only after customer approves it."}];
 assert.equal(replay(safe).findings.length,0);
});
test('known previously captured diagnostic is not counted as a newly discovered problem',()=>{
 const x=replay().findings[0];
 const prior=[{classification:'CONVERSATIONAL_PRECONDITION_DRIFT',
  original_user_text:x.original_user_text,
  observed_model_text:x.observed_model_text}];
 const r=replay(turns,prior);
 assert.equal(r.findings[0].previously_recorded_detection,true);
 assert.equal(r.status,'PRIOR_DRIFT_CANDIDATES_RECONFIRMED');
});
test('cross-run unauthenticated history does not support historical detection',()=>{
 const x=replayConversationTrajectory({priorTurns:turns,
  historySource:'UNTRUSTED_CLIENT_TEXT',continuityRootId:root});
 assert.equal(x.status,'NO_AUTHENTICATED_TRAJECTORY');
 assert.equal(x.findings.length,0);
});
test('late finding flows through existing Cognition Integrity Spine, not a separate authority engine',()=>{
 const finding=replay().findings[0];
 let trace=createIntegritySpine({continuityRootId:root,
  runId:'response:turn3',ledgerAnchorRef:'ledger:source',
  openedAt:at});
 for(const stage of ['SIGNAL_CLEANER','UNIVERSE','CONTINUITY','COGNITION','VERIFIER']){
  trace=advanceIntegritySpine({trace,stage,
   sourceReceiptRefs:['ref:'+stage],
   observedModelFindings:stage==='COGNITION'?[finding]:[]});
 }
 assert.equal(trace.checkpoints[3].newly_observed_issues[0].classification,
  'CONVERSATIONAL_RETROSPECTIVE_DRIFT');
 assert.equal(trace.checkpoints[4].unresolved_issues[0].origin_stage,'COGNITION');
 assert.equal(trace.execution_authorized,false);
});
