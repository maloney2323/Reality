import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectEpistemicClaimRelations} from '../src/reality-epistemic-claim-relations-v0.1.js';
import {inspectConversationDrift} from '../src/reality-conversation-drift-integrity-v0.1.js';
import {reviewRealityAnswer} from '../src/reality-semantic-review-v0.1.js';
const prior=[{role:'user',source_ref:'previous:workers-comp',
 text:"Workers' compensation EDI analyst says 'payer acknowledged the file', contractor says 'homeowner approved' and engineering says 'CI green'. None has authenticated payer or homeowner evidence."}];
const inspect=(answer,message='What is actually verified?')=>inspectEpistemicClaimRelations({
 modelAnswer:answer,currentUserMessage:message,priorTurns:prior,
 continuityRootId:'test:continuity',modelResponseId:'model:1',
 currentUserSourceRef:'current:1',
});
test('real live miss #15: verified assertions contradicted by unverified conclusion',()=>{
 const answer='The only facts that are verified in this scenario are these two, stated as assertions but without independent authentication:\n\n- An analyst says the payer acknowledged the file (hearsay).\n- Contractor says homeowner approved (unverified).\n- Engineering says CI green (unverified).\n\nTherefore, no fact in this set is actually verified with independent source documentation.';
 const r=inspect(answer);
 const f=r.findings.find(x=>x.classification==='EPISTEMIC_STATUS_SELF_CONTRADICTION');
 assert.ok(f,JSON.stringify(r));
 assert.equal(f.relation.left_status,'VERIFIED');
 assert.equal(f.relation.right_status,'NOT_VERIFIED');
 assert.ok(f.claim_spans.length===2);
 assert.ok(f.source_receipt_refs.includes('model-response:model:1'));
 assert.equal(f.independently_adjudicated,false);
});
test('real live miss #16: EDI acknowledgment falsely treated as payment or financing',()=>{
 const answer='Payer acknowledgment (payment or financing confirmation) remains UNKNOWN.';
 const r=inspect(answer);
 assert.equal(r.findings.length,1,JSON.stringify(r));
 assert.equal(r.findings[0].classification,'EVENT_TYPE_COLLAPSE');
 assert.deepEqual(r.findings[0].relation,{
  source_event_type:'EDI_FILE_ACKNOWLEDGMENT',inferred_outcome_type:'PAYMENT_OR_FINANCING',
  claim_relation:'UNSUPPORTED_EQUIVALENCE',source_is_not_outcome:true,
 });
 assert.ok(r.findings[0].source_receipt_refs.includes('previous:workers-comp'));
});
test('same typed EDI boundary applies to generic unknowns and claimed successes',()=>{
 assert.ok(inspect('The payer acknowledgment means payment has been confirmed.').findings.some(
  f=>f.classification==='EVENT_TYPE_COLLAPSE'));
 assert.ok(inspect('The file acknowledgment confirms claim adjudication.').findings.some(
  f=>f.classification==='EVENT_TYPE_COLLAPSE'));
});
test('CI success cannot be silently equated with deployment',()=>{
 const r=inspect('CI green means the product is deployed.');
 assert.ok(r.findings.some(f=>f.relation?.source_event_type==='CI_PASS'));
});
test('correct event separation is not flagged',()=>{
 for(const answer of [
  'An EDI payer acknowledgment does not establish payment or financing confirmation.',
  'A payer acknowledgment and payment are different events requiring independent sources.',
  'Payer acknowledgment remains UNKNOWN. Payment confirmation remains UNKNOWN.',
  'CI green does not mean deployed.',
  'No homeowner approval has been verified; payer acknowledgment is only a reported claim.',
  'There are no verified payer, contractor, or engineering facts in these three reported claims.',
  'Someone said the facts are verified, but none is actually independently verified.',
  'The verified GitHub CI status is success; the payer acknowledgment is unverified.',
 ]){
  assert.deepEqual(inspect(answer).findings,[],answer);
 }
});
test('reported or quoted unverifiable words are not promoted into model assertions',()=>{
 assert.deepEqual(inspect('A manager says "the only facts that are verified" but no fact has been verified.').findings,[]);
});
test('integrated Continuity detection returns relation findings as candidates',()=>{
 const answer='Payer acknowledgment (payment or financing confirmation) remains UNKNOWN.';
 const out=inspectConversationDrift({
  priorTurns:prior,currentUserMessage:'List payer status and the verified records.',
  modelAnswer:answer,continuityRootId:'test:continuity',modelResponseId:'model:2',
  currentUserSourceRef:'current:2',historySource:'AUTHENTICATED_CONVERSATION_MESSAGES',
 });
 assert.ok(out.findings.some(f=>f.classification==='EVENT_TYPE_COLLAPSE'));
 assert.equal(out.coverage.relation_candidate_count,1);
 assert.equal(out.coverage.general_semantic_drift_assessed,false);
});

test('semantic reviewer receives relation candidates from the existing Continuity detector, not as ground truth',async()=>{
 const answer='Payer acknowledgment (payment or financing confirmation) remains UNKNOWN.';
 const structural=inspect(answer).findings;
 let supplied=null;
 const reviewed=await reviewRealityAnswer({
  currentUserMessage:'Separate EDI acknowledgment from financial effects.',
  modelAnswer:answer,structuralFindings:structural,worldId:'benchmark:world',
  sourceSnapshot:null,priorTurns:prior,apiKey:'offline-fixture',model:'fixture',
  fetchImpl:async(url,opts)=>{
    assert.equal(url,'https://api.openai.com/v1/responses');
    const request=JSON.parse(opts.body);
    supplied=JSON.parse(request.input[1].content[0].text);
    return new Response(JSON.stringify({id:'review:fixture',
     output_text:JSON.stringify({addresses_current_request:true,issues:[],claims:[],actions:[]})}),{status:200});
  },
 });
 assert.equal(supplied.structural_claim_relation_candidates.length,1);
 assert.equal(supplied.structural_claim_relation_candidates[0].classification,'EVENT_TYPE_COLLAPSE');
 assert.equal(supplied.verified_source_fact_records.length,0);
 assert.equal(reviewed.review.independent_semantic_adjudication,false);
 assert.equal(reviewed.review.issues.length,0);
});
