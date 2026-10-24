import test from 'node:test';
import assert from 'node:assert/strict';
import {
 inspectConversationDrift,trackConversationalDriftAccumulation,
} from '../src/reality-conversation-drift-integrity-v0.1.js';
import {buildConversationTrustPulse} from '../src/reality-conversation-trust-pulse-v0.1.js';
const root='continuity:construction',original={
 role:'user',text:'Do not send the estimate until the homeowner approves it.',
 source_ref:'base44:PersonalMessage:user-1',
};
const prior=[original,{
 role:'assistant',text:'I will prepare a draft and wait for homeowner approval.',
 source_ref:'base44:PersonalMessage:assistant-1',
}];
const inspect=(user,model,turns=prior,historySource='AUTHENTICATED_CONVERSATION_MESSAGES')=>
 inspectConversationDrift({priorTurns:turns,currentUserMessage:user,modelAnswer:model,
   continuityRootId:root,modelResponseId:'model:current',
   currentUserSourceRef:'packet:current',historySource});

test('turn 1: captures explicit user precondition, no invented clean semantic score',()=>{
 const p=inspect('Do not send the estimate until the homeowner approves it.',
  'I will prepare the estimate draft and wait.',[]);
 assert.equal(p.anchor_count,1);
 assert.equal(p.findings.length,0);
 assert.equal(p.semantic_recall,null);
 assert.equal(p.unknown_semantic_claims_possible,true);
});

test('small turn 2 shift from homeowner approval to ready triggers early warning',()=>{
 const p=inspect('Can you prepare the draft?', "We'll send the estimate when it is ready.");
 assert.equal(p.findings.some(f=>f.classification==='CONVERSATIONAL_PRECONDITION_DRIFT'),true);
 const f=p.findings.find(f=>f.classification==='CONVERSATIONAL_PRECONDITION_DRIFT');
 assert.equal(f.source_receipt_refs[0],original.source_ref);
 assert.equal(f.verified_hallucination,false);
 assert.equal(p.action_authorized,false);
});

test('turn 3 repeated erosion carries origin turn and escalates, never verifies repair',()=>{
 const p=inspect('Is our draft ready?', "We'll send the estimate when it is ready.");
 const oldAssessment=trackConversationalDriftAccumulation({assessment:p,turn:2,priorReceipts:[]});
 const earlier={event_kind:'VERIFICATION',payload:{
   event_type:'MODEL_OUTPUT_ASSESSMENT',turn:2,
   conversational_drift:{findings:oldAssessment.findings},
 }};
 const next=trackConversationalDriftAccumulation({assessment:p,turn:3,priorReceipts:[earlier]});
 const f=next.findings.find(x=>x.classification==='CONVERSATIONAL_PRECONDITION_DRIFT');
 assert.equal(f.recurrence_count,2);
 assert.equal(f.first_detected_turn,2);
 assert.equal(f.escalation,'RECURRING_CANDIDATE');
 assert.equal(f.repair_verified_turn,null);
});

test('no false flag for condition retained, draft-only, explicit negative, hypothetical',()=>{
 const responses=[
  "I'll prepare the estimate draft.",
  "We won't send the estimate.",
  "We'll send the estimate only after homeowner approval.",
  "What if we send the estimate?",
 ];
 for(const a of responses){
  const p=inspect('How should we proceed?',a);
  assert.equal(p.findings.some(f=>f.classification==='CONVERSATIONAL_PRECONDITION_DRIFT'),false,a);
 }
});

test('explicit user revision remains a review candidate, not an AI mistake',()=>{
 const p=inspect('Actually, you can now send the estimate before homeowner approval.',
  "I'll prepare the updated plan.");
 assert.equal(p.findings.some(f=>f.classification==='CONVERSATIONAL_REVISION_REQUIRES_REVIEW'),true);
 assert.equal(p.authoritative_state_mutated,false);
});

test('untrusted client-provided history cannot establish authoritative past instructions',()=>{
 const p=inspect('Is it ready?', "I'll send the estimate now.",prior,'UNTRUSTED_CLIENT_TEXT');
 assert.equal(p.anchor_count,0);
 assert.equal(p.findings.length,0);
 assert.equal(p.history_scope,'CURRENT_USER_TURN_ONLY');
});

test('topic change with stale assistant replay is separately flagged',()=>{
 const history=[
  {role:'user',source_ref:'user:prior',text:'What is the exact homeowner approval restriction for the estimate?'},
  {role:'assistant',source_ref:'assistant:prior',text:'Do not send the construction job estimate until the homeowner explicitly approves the final scope.'},
 ];
 const p=inspect('Draft an inventory checklist for next week covering supplies and tools.',
   history[1].text,history);
 assert.ok(p.findings.some(f=>f.classification==='STALE_RESPONSE_REPLAY'));
 const follow=inspect(history[0].text,history[1].text,history);
 assert.equal(follow.findings.some(f=>f.classification==='STALE_RESPONSE_REPLAY'),false);
});

test('conversation alert appears even without structured factual ground truth',()=>{
 const assessment=trackConversationalDriftAccumulation({
   assessment:inspect('How is the draft?', "We'll send the estimate when ready."),turn:2,priorReceipts:[],
 });
 const hist=[
  {event_kind:'RAW_SIGNAL',event_id:'raw:1'},
  {event_kind:'RAW_SIGNAL',event_id:'raw:2'},
  {event_kind:'VERIFICATION',event_id:'v:1',payload:{
   cycle_version:'reality-continuous-reliability-v0.1',
   event_type:'MODEL_OUTPUT_ASSESSMENT',turn:1,drift:[],hallucination_suspected:[],
  }},
  {event_kind:'VERIFICATION',event_id:'v:2',payload:{
   cycle_version:'reality-continuous-reliability-v0.1',
   event_type:'MODEL_OUTPUT_ASSESSMENT',turn:2,evaluation_status:'NOT_EVALUATED',
   drift:[],hallucination_suspected:[],
   conversational_drift:{assessment_scope:assessment.assessment_scope,
     history_scope:assessment.history_scope,findings:assessment.findings},
  }},
 ];
 const p=buildConversationTrustPulse({history:hist,turn:2});
 assert.equal(p.status,'CONVERSATIONAL_DRIFT_RISK');
 assert.equal(p.conversational_drift_count,1);
 assert.equal(p.conversational_drift_findings[0].first_detected_turn,2);
 assert.equal(p.whole_response_verified,false);
 assert.equal(p.drift_free_claim_allowed,false);
});

test('10-turn review retains low-severity conversational warnings and unknown scores',()=>{
 const history=[
  ...Array.from({length:10},(_,i)=>({event_kind:'RAW_SIGNAL',event_id:'raw:'+i})),
  ...Array.from({length:10},(_,i)=>({event_kind:'VERIFICATION',event_id:'receipt:'+i,payload:{
   cycle_version:'reality-continuous-reliability-v0.1',
   event_type:'MODEL_OUTPUT_ASSESSMENT',turn:i+1,
   evaluation_status:'NOT_EVALUATED',drift:[],hallucination_suspected:[],
   conversational_drift:{
    history_scope:'AUTHENTICATED_PRIOR_TURNS_PLUS_CURRENT',
    findings:i===4?[{classification:'STALE_RESPONSE_REPLAY',recurrence_count:1,
      source_receipt_refs:['user:1']}]:[],
   }
  }}))
 ];
 const p=buildConversationTrustPulse({history,turn:10});
 assert.equal(p.digest.turns_with_conversational_risks,1);
 assert.equal(p.digest.conversational_risk_observations,1);
 assert.equal(p.digest.unresolved_conversational_incident_anchors,1);
 assert.equal(p.digest.authenticated_historical_alignment_checks,10);
 assert.equal(p.digest.drift_rate_pct,null);
 assert.equal(p.digest.all_clear,false);
});
