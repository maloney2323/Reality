import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectConversationDrift,createIntegritySpine,advanceIntegritySpine}
 from '../src/reality-continuous-integrity-spine-v0.1.js';

const root='construction:company:1';
const prior=[{role:'user',source_ref:'history:user:turn1',
 text:'Do not send the estimate until the customer approves it.'},
 {role:'assistant',source_ref:'history:assistant:turn1',
 text:"Understood. I'll prepare a draft and wait for customer approval."}];
const run=(message,answer,{turns=prior,source='AUTHENTICATED_CONVERSATION_MESSAGES',id='resp:two'}={})=>
 inspectConversationDrift({
  priorTurns:turns,currentUserMessage:message,modelAnswer:answer,
  continuityRootId:root,modelResponseId:id,currentUserSourceRef:'signal:current',
  historySource:source,
 });
test('turn 1 preserves explicit customer condition without hallucination claim',()=>{
 const a=run('Do not send the estimate until the customer approves it.',
  'I will prepare the draft and wait.',{turns:[],id:'resp:one'});
 assert.equal(a.anchor_count,1);
 assert.equal(a.findings.length,0);
 assert.equal(a.status,'LIMITED_CONVERSATION_CHECK_NO_FLAG');
 assert.equal(a.semantic_recall,null);
});
test('subtle drift appears on turn 2, BEFORE the model executes anything',()=>{
 const x=run('Can you prepare the draft?', "We'll send the estimate when it is ready.");
 assert.equal(x.status,'EARLY_CONVERSATION_DRIFT_RISK');
 assert.equal(x.findings.length,1);
 assert.equal(x.findings[0].classification,'CONVERSATIONAL_PRECONDITION_DRIFT');
 assert.equal(x.findings[0].origin_stage,'COGNITION');
 assert.equal(x.findings[0].source_receipt_refs[0],'history:user:turn1');
 assert.equal(x.findings[0].verified_hallucination,false);
 assert.equal(x.action_authorized,false);
});
test('turn 3 escalation preserves original turn 1 origin, even if the model rephrases twice',()=>{
 const turns=[...prior,{role:'user',source_ref:'history:user:turn2',
  text:'Just prepare the draft for me.'},
 {role:'assistant',source_ref:'history:assistant:turn2',
  text:"We'll send the estimate when it's ready."}];
 const x=run('How is the draft going?', "I'll send the estimate now.",{turns,id:'resp:three'});
 assert.equal(x.findings.length,1);
 assert.equal(x.findings[0].source_receipt_refs[0],'history:user:turn1');
 assert.equal(x.findings[0].classification,'CONVERSATIONAL_PRECONDITION_DRIFT');
});
test('restated original precondition is not flagged',()=>{
 const x=run('Is it ready?', "We'll send the estimate once the customer approves it.");
 assert.equal(x.findings.length,0);
});
test('prepare-only, negated action, hypothetical and topic mentions are not false positives',()=>{
 for(const answer of [
  "I'll prepare the estimate draft.",
  "We won't send the estimate.",
  "We could send the estimate after approval.",
  'The estimate is a document.',
  'What if we send the estimate?',
 ]){
  const x=run('What is next?',answer);
  assert.equal(x.findings.length,0,answer);
 }
});
test('explicit user revision is treated as revision candidate, not silent model drift',()=>{
 const x=run('Actually, you can now send the estimate before customer approval.',
  "I'll prepare the updated plan.");
 assert.equal(x.findings[0].classification,'CONVERSATIONAL_REVISION_REQUIRES_REVIEW');
 assert.equal(x.revision_candidates[0].status,'REVISION_PROPOSED_NOT_ADJUDICATED');
 assert.equal(x.authoritative_state_mutated,false);
});
test('prior assistant messages cannot authorize silent condition removal',()=>{
 const turns=[{role:'assistant',source_ref:'model:pretend-user',
  text:'Do not send the estimate until the customer approves it.'}];
 const x=run('Can you check the draft?', "I'll send the estimate now.",{turns});
 assert.equal(x.anchor_count,0);
 assert.equal(x.findings.length,0);
});
test('without authenticated prior source no history-based drift is claimed',()=>{
 const x=run('How is the draft?', "I'll send the estimate now.",
  {source:'UNTRUSTED_CLIENT_TEXT'});
 assert.equal(x.anchor_count,0);
 assert.equal(x.history_scope,'CURRENT_USER_TURN_ONLY');
 assert.equal(x.status,'NO_EXTRACTABLE_CONVERSATION_ANCHOR');
});
test('same-turn drift and unknown root are distinguishable',()=>{
 const x=run('Do not order materials until the owner signs the quote.',
  "I'll order materials now.",{turns:[]});
 assert.equal(x.findings[0].classification,'CONVERSATIONAL_PRECONDITION_DRIFT');
 const absent=inspectConversationDrift({currentUserMessage:'Do not order materials until signed.',
   modelAnswer:"I'll order materials now."});
 assert.equal(absent.status,'NO_CONTINUITY_ROOT');
 assert.equal(absent.semantic_recall,null);
});
test('conversation finding uses existing Spine checkpoint, is carried unresolved, cannot grant authority',()=>{
 const finding=run('Check it.',"We'll send the estimate when it is ready.").findings[0];
 let trace=createIntegritySpine({continuityRootId:root,runId:'turn2',
   ledgerAnchorRef:'ledger:verified',openedAt:'2026-10-22T12:00:00Z'});
 for(const stage of ['SIGNAL_CLEANER','UNIVERSE','CONTINUITY','COGNITION','VERIFIER']){
  trace=advanceIntegritySpine({trace,stage,
    sourceReceiptRefs:['receipt:'+stage],
    observedModelFindings:stage==='COGNITION'?[finding]:[]});
 }
 assert.equal(trace.checkpoints[3].newly_observed_issues[0].classification,
   'CONVERSATIONAL_PRECONDITION_DRIFT');
 assert.equal(trace.checkpoints[4].unresolved_issues[0].origin_stage,'COGNITION');
 assert.equal(trace.checkpoints[4].publication_eligible_from_this_check,false);
 assert.equal(trace.execution_authorized,false);
});
