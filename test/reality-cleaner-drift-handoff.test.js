import test from 'node:test';
import assert from 'node:assert/strict';
import {buildGovernedChatSignal} from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import {buildCleanerConversationContext} from '../src/reality-cleaner-conversation-context-v0.1.js';
import {inspectConversationDrift} from '../src/reality-conversation-drift-integrity-v0.1.js';
const stamp='2026-10-25T14:00:00Z';
function inspect(message,answer,priorTurns=[]){
 const signal=buildGovernedChatSignal({message,observedAt:stamp});
 const context=buildCleanerConversationContext({governedSignal:signal,priorTurns,authenticatedHistory:true});
 const result=inspectConversationDrift({cleanerConversationContext:context,priorTurns,
  historySource:'AUTHENTICATED_CONVERSATION_MESSAGES',currentUserMessage:message,
  currentUserSourceRef:signal.packet.packet_id,modelAnswer:answer,continuityRootId:'test'});
 return {context,result};
}
const conditional='If the homeowner sends a verified approval tied to the correct estimate revision, prepare the send package, but do not send it.';
test('Cleaner dependency detects a dropped condition previously invisible to raw patterns',()=>{
 const {result}=inspect(conditional,'I will prepare the send package now.');
 assert.equal(result.anchor_count,1);
 assert.ok(result.findings.some(f=>f.classification==='CONVERSATIONAL_PRECONDITION_DRIFT'));
 assert.equal(result.coverage.interpretation_source,'SIGNAL_CLEANER_TYPED_INTAKE');
 assert.ok(result.anchors[0].condition_clause_id);
});
test('retained condition and prohibition do not produce a dropped-condition flag',()=>{
 const {result}=inspect(conditional,'I will prepare the send package only if the homeowner sends verified approval for the correct estimate revision. I will not send it.');
 assert.equal(result.findings.length,0);
});
test('earlier authenticated condition survives beyond semantic reviewer last-eight raw requests',()=>{
 const prior=[{role:'user',text:conditional,source_ref:'saved:condition'},
  ...Array.from({length:10},(_,i)=>({role:'user',text:'Discuss unrelated inventory item '+i,source_ref:'saved:'+i}))];
 const {context,result}=inspect('What is next?', 'I will prepare the send package now.',prior);
 assert.equal(context.history.length,11);
 assert.equal(result.anchors[0].source_ref,'saved:condition');
 assert.ok(result.findings.some(f=>f.classification==='CONVERSATIONAL_PRECONDITION_DRIFT'));
});
test('quoted conditional instructions do not become direct user anchors',()=>{
 const {result}=inspect('Vendor says: "If approval arrives, prepare the send package."','I will prepare the send package now.');
 assert.equal(result.anchor_count,0);
});
test('legacy direct prohibition still works through typed intake',()=>{
 const {result}=inspect('Do not send the estimate until the homeowner approves.','I will send the estimate now.');
 assert.equal(result.anchor_count,1);
 assert.ok(result.findings.some(f=>f.classification==='CONVERSATIONAL_PRECONDITION_DRIFT'));
});
test('scope and negation remain exact source-linked candidates, not authority',()=>{
 const message="We are NOT cancelling the construction project; we're cancelling ONLY the draft announcement.";
 const {context}=inspect(message,'The cancellation is on hold.');
 assert.equal(context.current.clauses.length,2);
 assert.ok(context.current.clauses[0].epistemic_modalities.includes('NEGATED'));
 assert.match(context.current.clauses[1].exact_source_text,/ONLY the draft/);
 assert.equal(context.execution_authorized,false);
 assert.equal(context.external_truth_established,false);
});
test('unauthenticated history is excluded and altered typed projection is rejected',()=>{
 const signal=buildGovernedChatSignal({message:'Prepare an internal note.',observedAt:stamp});
 const c=buildCleanerConversationContext({governedSignal:signal,priorTurns:[{role:'user',text:conditional,source_ref:'fake'}]});
 assert.equal(c.history.length,0);
 const altered=structuredClone(signal);altered.typed_epistemic_intake.clauses[0].kind='PROHIBITION_CANDIDATE';
 assert.throws(()=>buildCleanerConversationContext({governedSignal:altered}),/DIGEST_MISMATCH/);
});
