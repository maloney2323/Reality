import test from 'node:test';
import assert from 'node:assert/strict';
import {buildGovernedChatSignal} from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import {buildCognitionContinuityHandoff} from '../src/reality-cognition-continuity-handoff-v0.1.js';
import {reviewRealityAnswer} from '../src/reality-semantic-review-v0.1.js';
import {runLiveIntelligenceOrchestration} from '../src/reality-live-intelligence-orchestration-v0.1.js';
const t='2026-10-25T13:00:00.000Z';
const now='Pull together the entire day and describe whether the file was received.';
const observation="Another interruption: our workers' comp EDI contact says a payer acknowledged receiving a file; billing says 'great, invoice paid'. The payer report has no payment details. Also, engineering says a new CI run succeeded. What can the three groups actually claim?";
const src=(role,text,n)=>({role,text,source_ref:'authenticated:turn-'+n});
const signal=buildGovernedChatSignal({message:now,observedAt:t});
const original='Payer has acknowledged receipt of the workers comp EDI file.';
function scope(history,msg=now){
 return buildCognitionContinuityHandoff({
  governedSignal:buildGovernedChatSignal({message:msg,observedAt:t}),
  latestMessage:msg,verifiedConversationTurns:history,
 });
}
test('original missed payer report keeps typed hearsay, source provenance, and NOT verified fact',()=>{
 const hist=[
  src('user',observation,9),
  src('assistant','That is a report from the contact, not direct payer evidence.',9.5),
  src('user','Now can we review the kitchen estimate?',10),
  src('assistant','We can prepare the internal draft.',10.5),
 ];
 const handoff=scope(hist);
 assert.equal(handoff.history_source,'TRUSTED_SERVER_CONVERSATION_ADAPTER');
 const reports=handoff.conversation_evidence.candidates;
 const payer=reports.find(c=>/payer acknowledged receiving/i.test(c.exact_user_text));
 assert.ok(payer,JSON.stringify(reports));
 assert.equal(payer.source_ref,'authenticated:turn-9');
 assert.equal(payer.epistemic_status,'USER_REPORTED_OR_UNCERTAIN_NOT_PROVIDER_ATTESTED');
 assert.ok(payer.epistemic_modalities.includes('HEARSAY'));
 assert.equal(payer.external_claim_verified,false);
 assert.equal(reports.some(c=>/direct payer evidence/i.test(c.exact_user_text)),false);
});
test('clean direct user instruction is not incorrectly treated as hearsay',()=>{
 const handoff=scope([src('user','Please draft a meeting agenda.',1)]);
 assert.equal(handoff.conversation_evidence.candidates.length,0);
 assert.equal(handoff.conversation_evidence.external_truth_established,false);
});
test('unrelated vendor hearsay is preserved in fresh case without payer or domain-specific rules',()=>{
 const history=[
  src('user','A supplier says replacement motors shipped yesterday, but we have no carrier scan.',1),
  ...Array.from({length:40},(_,i)=>src(i%2?'assistant':'user',
    i%2?'I can make a checklist.':'Inventory review '+i+'.',i+2)),
 ];
 const handoff=scope(history,'What is our shipment status?');
 assert.ok(handoff.conversation_evidence.candidates.some(c=>
  c.source_ref==='authenticated:turn-1' && /motors shipped/i.test(c.exact_user_text)));
 assert.equal(handoff.conversation_evidence.candidates[0].external_claim_verified,false);
});
test('semantic reviewer receives source-linked reports without treating prior assistant text as proof',async()=>{
 let sent=null;
 const fake=async(url,options)=>{
  assert.match(url,/api.openai.com\/v1\/responses/);
  const request=JSON.parse(options.body);sent=JSON.parse(request.input[1].content[0].text);
  const quote='Payer has acknowledged receipt';
  return new Response(JSON.stringify({id:'review:fixture',output_text:JSON.stringify({
    addresses_current_request:true,
    issues:[{kind:'UNSUPPORTED_FACT',quote,
      reason:'Only a contact report exists; no authenticated payer acknowledgement receipt.'}],
    claims:[],actions:[],
  })}),{status:200});
 };
 const hist=[src('user',observation,9)];
 const handoff=scope(hist);
 const answer='Payer has acknowledged receipt of the file.';
 const review=await reviewRealityAnswer({
  currentUserMessage:now,modelAnswer:answer,priorTurns:hist,
  conversationEvidence:handoff.conversation_evidence,model:'fixture',
  apiKey:'fixture-not-real',fetchImpl:fake,
 });
 assert.ok(sent.conversation_evidence.candidates.some(c=>c.source_ref==='authenticated:turn-9'));
 assert.equal(review.review.issues[0].kind,'UNSUPPORTED_FACT');
 assert.equal(review.review.typed_report_candidates_reviewed,handoff.conversation_evidence.candidates.length);
 assert.equal(review.review.independent_semantic_adjudication,false);
});
test('actual cognition model gateway receives provenance projection from authenticated history',async()=>{
 const history=[src('user',observation,9),src('assistant','This is unverified.',9.5)];
 let input;
 const fetchImpl=async(_url,opts)=>{
  input=JSON.parse(opts.body);
  return new Response(JSON.stringify({
   id:'fixture:cognition',status:'completed',output_text:'The EDI contact reported receipt, but no payer receipt is verified.',
  }),{status:200});
 };
 const result=await runLiveIntelligenceOrchestration({
  message:now,model:'offline-model',apiKey:'not-secret',
  verifiedConversationTurns:history,fetchImpl,
 });
 const context=JSON.parse(input.input[1].content[0].text).system_context;
 assert.ok(context.conversation_continuity.conversation_evidence.candidates.some(x=>
  x.source_ref==='authenticated:turn-9'&&x.epistemic_modalities.includes('HEARSAY')));
 assert.equal(result.execution.status,'NOT_EXECUTED');
});
