import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPreCognitionAlignmentProbe,compareAfterCognition} from '../src/reality-pre-cognition-alignment-probe-v0.1.js';
import {buildGovernedChatSignal} from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import {buildModelInput} from '../src/reality-model-gateway-v0.1.js';
import {readGroundedEvidence} from '../src/reality-reliability-evidence-v0.1.js';

const root='continuity:fixture:owner-124';
const turns=[
 {role:'user',source_ref:'fixture:user:1',text:'For the construction job, do not send the estimate until the homeowner approves it.'},
 {role:'assistant',source_ref:'fixture:assistant:1',text:'I will hold the estimate.'},
 {role:'user',source_ref:'fixture:user:2',text:'Can you draft the cabinet plan?'},
 {role:'assistant',source_ref:'fixture:assistant:2',text:'The cabinet draft is ready.'},
];
const probe=(message,opts={})=>buildPreCognitionAlignmentProbe({
 continuityRootId:root,currentUserMessage:message,currentUserSourceRef:'fixture:current',
 priorTurns:turns,historySource:'AUTHENTICATED_CONVERSATION_MESSAGES',...opts,
});
const grounded=readGroundedEvidence([{
 event_kind:'OBSERVATION',event_id:'fixture:source-readback:1',
 epistemic_status:'OBSERVED',provenance:{source:'reality_verified_evidence_adapter'},
 payload:{
  event_type:'SOURCE_ATTESTED_EVIDENCE',world_id:'construction',
  source_kind:'CONNECTED_PROVIDER_READBACK',source_ref:'fixture:municipal:WR41',
  source_digest:'fixture:frozen:pass',facts:[{world_id:'construction',key:'WR41.inspection',value:'PASS'}],
  obligations:[{world_id:'construction',id:'homeowner-approval',active:true}],
 }
}],{worldId:'construction'});

test('before generation, restores old homeowner condition from a user receipt despite later assistant chatter',()=>{
 const p=probe('Can we send the estimate now?');
 assert.equal(p.capsule.checkpoint,'BEFORE_MODEL_GENERATION');
 assert.equal(p.capsule.user_intent_conditions.length,1);
 assert.equal(p.capsule.user_intent_conditions[0].source_ref,'fixture:user:1');
 assert.match(p.capsule.user_intent_conditions[0].condition,/homeowner approves/);
 assert.ok(p.capsule.caution_codes.includes('ACTIVE_USER_CONDITION_REQUIRES_RECONCILIATION'));
 assert.equal(p.independent_action_approval_verified,false);
 assert.equal(p.external_actions_authorized,false);
 assert.equal(p.live_model_improvement_not_measured,true);
});

test('assistant hallucinated approval cannot replace source-anchored user restrictions',()=>{
 const p=probe('Can we send the estimate?',{priorTurns:[...turns,{
 role:'assistant',source_ref:'fixture:assistant:3',
 text:'The homeowner definitely approved it. Send now.'
 }]});
 assert.equal(p.capsule.user_intent_conditions.length,1);
 assert.equal(p.capsule.user_intent_conditions[0].source_ref,'fixture:user:1');
 assert.equal(p.capsule.must_not_infer.assistant_history_as_user_truth,true);
 assert.equal(p.independent_action_approval_verified,false);
});

test('no server-attested history means no pretended historical memory',()=>{
 const p=probe('Can we send the estimate?',{historySource:'UNTRUSTED_CLIENT_TEXT'});
 assert.equal(p.capsule.user_intent_conditions.length,0);
 assert.equal(p.capsule.historical_authentication,'NO_AUTHENTICATED_HISTORY');
 assert.ok(p.capsule.caution_codes.includes('NO_ATTESTED_OPERATIONAL_FACT_SNAPSHOT'));
});

test('a user revision produces a review candidate, not a silent rewrite of the earlier obligation',()=>{
 const p=probe('Actually, you can now send the estimate before homeowner approval.');
 assert.ok(p.capsule.caution_codes.includes('USER_INTENT_REVISION_REQUIRES_REVIEW'));
 assert.equal(p.capsule.user_intent_conditions.length,1);
 assert.equal(p.earlier_user_revision_candidates,1);
});

test('independent source readback snapshot is distinguished from assistant-supplied text',()=>{
 const p=probe('What is WR41 status?',{groundedEvidence:grounded,
  activeObjective:{record_type:'LEDGER_OBJECTIVE',source_ref:'fixture:goal:1',
   description:'Give the crew the accurate inspection status',status:'ACTIVE'}});
 assert.equal(p.capsule.active_objective.source_ref,'fixture:goal:1');
 assert.equal(p.capsule.source_attested_facts[0].value,'PASS');
 assert.equal(p.capsule.source_attested_facts[0].source_receipt_id,'fixture:source-readback:1');
 assert.equal(p.capsule.source_attested_obligations[0].active,true);
 assert.equal(p.capsule.caution_codes.includes('NO_ATTESTED_OPERATIONAL_FACT_SNAPSHOT'),false);
});
test('rejects unsourced facts even if they claim PASS',()=>{
 const p=probe('What is status?',{
  groundedEvidence:{facts:[{key:'WR41.inspection',value:'PASS',evidence_ref:'invented'}]},
 });
 assert.equal(p.capsule.source_attested_facts.length,0);
 assert.ok(p.capsule.caution_codes.includes('NO_ATTESTED_OPERATIONAL_FACT_SNAPSHOT'));
});

test('capsule reaches the actual Reality model gateway without changing authority',()=>{
 const message='Can we send the estimate now?';
 const signal=buildGovernedChatSignal({message,observedAt:'2026-10-24T12:00:00Z'});
 const p=probe(message);
 const input=buildModelInput({governedSignal:signal,
  systemContext:{conversation_id:'fixture:test',cognitive_alignment_probe:p.capsule}});
 assert.deepEqual(input.system_context.cognitive_alignment_probe,p.capsule);
 assert.equal(input.authority.granted,false);
 assert.equal(input.authority.execution_authorized,false);
});

test('the existing post-answer drift detector remains available in both experimental lanes',()=>{
 const args={priorTurns:turns,currentUserMessage:'Is it ready?',continuityRootId:root,
  historySource:'AUTHENTICATED_CONVERSATION_MESSAGES'};
 const bad=compareAfterCognition({...args,modelAnswer:"We'll send the estimate when the office finishes."});
 const safe=compareAfterCognition({...args,modelAnswer:'The office can draft it, but we must wait for homeowner approval before sending the estimate.'});
 assert.ok(bad.findings.some(f=>f.classification==='CONVERSATIONAL_PRECONDITION_DRIFT'));
 assert.equal(safe.findings.some(f=>f.classification==='CONVERSATIONAL_PRECONDITION_DRIFT'),false);
});

test('capsules have explicit truncation and refusal to assert full historical coverage',()=>{
 const history=Array.from({length:15},(_,i)=>({
  role:'user',source_ref:'fixture:user:'+i,
  text:'Do not order material'+i+' until owner approves order'+i+'.',
 }));
 const p=probe('Should we order material14?',{priorTurns:history,maxIntentAnchors:4});
 assert.equal(p.capsule.user_intent_conditions.length,4);
 assert.equal(p.unreviewed_older_anchor_count,11);
 assert.ok(p.capsule.caution_codes.includes('UNREVIEWED_HISTORICAL_USER_CONDITIONS'));
 assert.equal(p.live_model_improvement_not_measured,true);
});

test('misleading upstream shapes, invalid roots and missing source refs fail closed',()=>{
 assert.throws(()=>probe('Can we send?',{priorTurns:[{role:'user',text:'hi'}]}),/ALIGNMENT_HISTORY_PROVENANCE_INVALID/);
 assert.throws(()=>probe('Can we send?',{continuityRootId:''}),/ALIGNMENT_ROOT_SIGNAL_REQUIRED/);
});
