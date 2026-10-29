import test from 'node:test';
import assert from 'node:assert/strict';
import {buildGovernedChatSignal} from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import {buildCognitionContinuityHandoff} from '../src/reality-cognition-continuity-handoff-v0.1.js';
import {reviewRealityAnswer} from '../src/reality-semantic-review-v0.1.js';
const when='2026-10-25T13:01:00Z';
function context(){
 const message='Summarize our status.';
 const turns=[
  {role:'user',text:'The payer contact says a claim file was received; no official payer receipt is available.',source_ref:'turn:9:user'},
  {role:'assistant',text:'This is a report only.',source_ref:'turn:9:assistant'},
  {role:'user',text:'Warehouse says the shipment was delivered, but tracking is pending.',source_ref:'turn:10:user'},
 ];
 const governedSignal=buildGovernedChatSignal({message,observedAt:when});
 const continuity=buildCognitionContinuityHandoff({
   governedSignal,verifiedConversationTurns:turns,latestMessage:message,
 });
 assert.ok(continuity.conversation_evidence.candidates.length>=2);
 return {message,turns,evidence:continuity.conversation_evidence};
}
async function judge(answer,assessments,{omitChecks=false}={}){
 const {message,turns,evidence}=context();
 let sent;
 const fetchImpl=async(_url,opts)=>{
  sent=JSON.parse(opts.body);
  return new Response(JSON.stringify({id:'real-contract-simulated-review',
   output_text:JSON.stringify({
    addresses_current_request:true,issues:[],claims:[],actions:[],
    ...(omitChecks?{}:{provenance_checks:assessments(evidence.candidates)}),
   }),
  }),{status:200});
 };
 const r=await reviewRealityAnswer({
  currentUserMessage:message,modelAnswer:answer,
  priorTurns:turns,conversationEvidence:evidence,
  model:'fixture',apiKey:'offline-fixture',fetchImpl,
 });
 return {r,evidence,sent};
}
const rows=(candidates,relation,quote='')=>candidates.map(c=>({
 source_ref:c.source_ref,clause_id:c.clause_id,
 relation:relation(c),answer_quote:quote,verified_source_ref:'',
 reason:'Reconciliation candidate, not external truth.',
}));
test('explicit asserted-fact relation surfaces source-supported reviewer concern, even if reviewer issues array empty',async()=>{
 const answer='The payer received the claim file.';
 const {r,evidence,sent}=await judge(answer,candidates=>rows(candidates,
  c=>/payer contact/i.test(c.exact_user_text)?'ASSERTED_AS_FACT':'NOT_MENTIONED','')
  .map(row=>row.relation==='ASSERTED_AS_FACT'?{...row,answer_quote:'The payer received the claim file.'}:row));
 assert.equal(r.review.provenance_claims_assessed,evidence.candidates.length);
 assert.equal(r.review.provenance_review_status,'EXPLICIT_TYPED_CLAIMS_CHECKED');
 assert.equal(r.review.issues.some(x=>x.kind==='UNSUPPORTED_FACT'&&
  x.quote==='The payer received the claim file.'),true);
 assert.ok(sent.text.format.schema.required.includes('provenance_checks'));
 assert.equal(r.review.independent_semantic_adjudication,false);
});
test('properly attributed user report is not flagged as factual escalation',async()=>{
 const answer='A payer contact reported receiving the file, but there is no verified payer receipt.';
 const {r}=await judge(answer,candidates=>rows(candidates,
  c=>/payer contact/i.test(c.exact_user_text)?'REPORTED_WITH_UNCERTAINTY':'NOT_MENTIONED')
  .map(row=>row.relation==='REPORTED_WITH_UNCERTAINTY'?
   {...row,answer_quote:'A payer contact reported receiving the file'}:row));
 assert.equal(r.review.issues.length,0);
 assert.equal(r.review.provenance_review_status,'EXPLICIT_TYPED_CLAIMS_CHECKED');
});
test('empty reviewer comparisons do not silently score a clean review when candidate source claims exist',async()=>{
 const {r,evidence}=await judge('No external completion is established.',()=>[],{omitChecks:true});
 assert.equal(r.review.provenance_review_status,'INCOMPLETE_TYPED_CLAIM_COVERAGE');
 assert.equal(r.review.provenance_claims_expected,evidence.candidates.length);
 assert.equal(r.review.provenance_claims_assessed,0);
 assert.ok(r.review.unassessed_claims.some(x=>x.reason==='REPORTED_CLAIM_NOT_ASSESSED_BY_REVIEWER'));
});
test('unanchored quote and invented source receipt do not verify or authorize an event',async()=>{
 const answer='The payer received the claim file.';
 const {r}=await judge(answer,candidates=>rows(candidates,
  c=>/payer contact/i.test(c.exact_user_text)?'INDEPENDENT_SOURCE_CITED':'NOT_MENTIONED')
  .map(row=>row.relation==='INDEPENDENT_SOURCE_CITED'?
   {...row,answer_quote:'The payer received the claim file.',verified_source_ref:'invented-receipt'}:row));
 assert.equal(r.review.issues.some(x=>x.kind==='UNSUPPORTED_FACT'),true);
 assert.ok(r.review.unassessed_claims.some(x=>x.reason==='CLAIMED_VERIFIED_SOURCE_REF_NOT_FOUND'));
 assert.equal(r.review.external_action_authorized,false);
});

test('reviewer claiming reported uncertainty without words in answer is challenged by original Signal Cleaner',async()=>{
 const answer='The payer received the claim file.';
 const {r}=await judge(answer,candidates=>rows(candidates,
  c=>/payer contact/i.test(c.exact_user_text)?'REPORTED_WITH_UNCERTAINTY':'NOT_MENTIONED')
  .map(row=>row.relation==='REPORTED_WITH_UNCERTAINTY'?
   {...row,answer_quote:'The payer received the claim file.'}:row));
 assert.equal(r.review.issues.some(x=>x.kind==='UNSUPPORTED_FACT'&&
   /payer received/.test(x.quote)),true);
 assert.equal(r.review.provenance_checks.some(x=>
   x.reviewer_relation_conflicts_with_answer_quote===true),true);
 assert.equal(r.review.independent_semantic_adjudication,false);
});
test('answer visibly attributes claim as a report, preventing false provenance alarm',async()=>{
 const answer='According to the payer contact, the claim file was received, but payment is not verified.';
 const {r}=await judge(answer,candidates=>rows(candidates,
  c=>/payer contact/i.test(c.exact_user_text)?'REPORTED_WITH_UNCERTAINTY':'NOT_MENTIONED')
  .map(row=>row.relation==='REPORTED_WITH_UNCERTAINTY'?
    {...row,answer_quote:'According to the payer contact, the claim file was received'}:row));
 assert.equal(r.review.issues.length,0);
 assert.equal(r.review.provenance_checks.some(x=>x.reviewer_relation_conflicts_with_answer_quote),false);
});

test('internal hold recommendation is not mislabeled as unsupported outside-world fact',async()=>{
 const {message,turns,evidence}=context();
 const quote='- Hold all purchases until actual approval is confirmed.';
 const fetchImpl=async()=>new Response(JSON.stringify({id:'review-issue-false-positive-fixture',
   output_text:JSON.stringify({
    addresses_current_request:true,
    issues:[{kind:'UNSUPPORTED_FACT',quote,reason:'No provider evidence that purchases were held.'}],
    claims:[],actions:[],
    provenance_checks:rows(evidence.candidates,()=> 'NOT_MENTIONED'),
   }),
 }),{status:200});
 const r=await reviewRealityAnswer({currentUserMessage:message,
  modelAnswer:quote,conversationEvidence:evidence,priorTurns:turns,
  model:'fixture',apiKey:'fixture',fetchImpl});
 assert.equal(r.review.issues.length,0);
 assert.ok(r.review.unassessed_claims.some(x=>x.reason==='PROSPECTIVE_INSTRUCTION_NOT_EXTERNAL_FACT'));
});
