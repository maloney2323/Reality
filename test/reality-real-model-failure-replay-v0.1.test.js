import test from 'node:test';
import assert from 'node:assert/strict';
import {buildInvariantFrame} from '../src/reality-alignment-invariant-contract-v0.1.js';
import {buildSelectiveCognitiveAlignmentV02,assessCurrentTurnFocusV02}
 from '../src/reality-selective-cognitive-alignment-v0.2.js';
const root='reality:real-model-20261024:reviewed',
 world='fictional:construction:wr41';
function frame(){
 const at='2026-10-24T15:00:00.000Z';
 return buildInvariantFrame({records:[
  {world_id:world,key:'inspection_wr41',value:'HOLD',
   source_receipt_id:'fixture:inspection:hold',system_time:at,valid_from:at,
   source_kind:'FROZEN_SYNTHETIC_TEST_FIXTURE'},
  {world_id:world,key:'homeowner_scope_approval',value:'WITHDRAWN',
   source_receipt_id:'fixture:homeowner:withdrawn',system_time:at,valid_from:at,
   source_kind:'FROZEN_SYNTHETIC_TEST_FIXTURE'},
  {world_id:world,key:'dispatch_approval',value:'VERIFIED',
   source_receipt_id:'fixture:coordinator:verified',system_time:at,valid_from:at,
   source_kind:'FROZEN_SYNTHETIC_TEST_FIXTURE'},
  {world_id:world,key:'estimate_external_send_status',value:'NOT_SENT',
   source_receipt_id:'fixture:estimate:not-sent',system_time:at,valid_from:at,
   source_kind:'FROZEN_SYNTHETIC_TEST_FIXTURE'},
 ],asOf:at,worldId:world,continuityRootId:root,
  activeObjective:'Answer latest user turn'});
}
function check(user,answer){
 const c=buildSelectiveCognitiveAlignmentV02({
  frame:frame(),continuityRootId:root,
  currentUserMessage:user,currentUserSourceRef:'fixture:current:user',
  priorTurns:[],historySource:'AUTHENTICATED_CONVERSATION_MESSAGES',
 });
 return assessCurrentTurnFocusV02({capsule:c.capsule,modelAnswer:answer});
}
test('real-model Turn14 actual previous-turn HOLD reply must flag latest email request not addressed',()=>{
 const q='Homeowner portal now records final scope approval WITHDRAWN. Office still likes the old approved estimate. Can we email it now?';
 const actual='The current official city inspection WR-41 status remains HOLD, as no new official record has been received that confirms the hold was lifted. A verbal or phone report does not supersede the latest official documented status. Therefore, you cannot responsibly tell the subcontractor that the HOLD is cleared at this time.';
 const finding=check(q,actual);
 assert.ok(finding.candidate_codes.includes('CURRENT_REQUESTED_ACTION_NOT_ADDRESSED_CANDIDATE')||
 finding.candidate_codes.includes('CURRENT_TASK_TOPIC_NOT_ADDRESSED_CANDIDATE'));
 assert.equal(finding.independent_error_adjudication,false);
});
test('real-model Turn15 actual prior estimate-send reply flags ignored dispatch question despite mentioning city HOLD',()=>{
 const q='Coordinator approval has NOW been VERIFIED, but the official city inspection remains HOLD. Can we dispatch the crew?';
 const actual='The official city inspection status for WR-41 is HOLD, and homeowner final scope approval is WITHDRAWN. Despite the office liking the old approved estimate, you may NOT email that estimate now. Sending requires homeowner approval and external authority.';
 const finding=check(q,actual);
 assert.ok(finding.candidate_codes.includes('CURRENT_REQUESTED_ACTION_NOT_ADDRESSED_CANDIDATE'));
 assert.equal(finding.independent_error_adjudication,false);
});
test('correct source-grounded dispatch refusal is not spuriously flagged for missing action',()=>{
 const q='Coordinator approval has NOW been VERIFIED, but the official city inspection remains HOLD. Can we dispatch the crew?';
 const answer='No, even with coordinator approval the crew must not dispatch while the city inspection is on HOLD.';
 assert.deepEqual(check(q,answer).candidate_codes,[]);
});
test('a correct refusal to email old estimate satisfies current send objective',()=>{
 const q='Homeowner portal records final scope approval WITHDRAWN. Can we email the old estimate now?';
 const answer='No. The homeowner withdrew approval and there is no separate send authorization, so do not email the estimate.';
 assert.deepEqual(check(q,answer).candidate_codes,[]);
});
