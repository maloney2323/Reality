import test from 'node:test';
import assert from 'node:assert/strict';
import {adjudicateSourceReview} from '../src/reality-source-review-adjudication-v0.1.js';

const snapshot={
 world_id:'business:reality',facts:[
  {world_id:'business:reality',key:'latest_ci_conclusion',
   value:'SUCCESS',evidence_ref:'github:actions:verified-success'},
 ],
};
const candidate=claims=>({
 world_id:'business:reality',
 claims:claims.map(c=>({key:'latest_ci_conclusion',value:c.value,
   original_quote:c.quote,evidence_refs:c.refs})),
});
const review=(quote)=>({issues:[{kind:'UNSUPPORTED_FACT',quote,reason:'reviewer suspicion'}]});
test('source attested EXACT SUCCESS and matching quote suppresses reviewer-only false positive',()=>{
 const answer='GitHub latest CI conclusion: SUCCESS.';
 const a=adjudicateSourceReview({answer,review:review('SUCCESS'),
  candidate:candidate([{value:'SUCCESS',quote:'SUCCESS',refs:['github:actions:verified-success']}]),
  sourceSnapshot:snapshot});
 assert.equal(a.source_supported_count,1);
 assert.equal(a.unresolved_count,0);
 assert.equal(a.source_supported_issue_quotes[0].source_receipt,'github:actions:verified-success');
 assert.equal(a.independently_proven_model_semantic_correctness,false);
});
test('reviewer issue beyond source-backed CI status remains unresolved, not incorrectly suppressed',()=>{
 const a=adjudicateSourceReview({
  answer:'The CI is SUCCESS. This eliminates customer hallucinations.',
  review:review('This eliminates customer hallucinations'),
  candidate:candidate([{value:'SUCCESS',quote:'SUCCESS',refs:['github:actions:verified-success']}]),
  sourceSnapshot:snapshot});
 assert.equal(a.source_supported_count,0);
 assert.equal(a.unresolved_count,1);
});
test('no attested ref means no deterministic adjudication even with same value',()=>{
 const a=adjudicateSourceReview({
  answer:'SUCCESS',review:review('SUCCESS'),
  candidate:candidate([{value:'SUCCESS',quote:'SUCCESS',refs:[]}]),
  sourceSnapshot:snapshot});
 assert.equal(a.unresolved_count,1);
});
test('historical FAILED is not promoted to current SUCCESS',()=>{
 const a=adjudicateSourceReview({
  answer:'FAILED',review:review('FAILED'),
  candidate:candidate([{value:'FAILED',quote:'FAILED',refs:['github:actions:verified-success']}]),
  sourceSnapshot:snapshot});
 assert.equal(a.unresolved_count,1);
});
test('negative and conditional statements are not misclassified as supported affirmative truth',()=>{
 for(const answer of ['not SUCCESS','if SUCCESS']){
  const a=adjudicateSourceReview({answer,review:review(answer),
   candidate:candidate([{value:'SUCCESS',quote:answer,refs:['github:actions:verified-success']}]),
   sourceSnapshot:snapshot});
  assert.equal(a.unresolved_count,1);
 }
});
test('repeated ambiguous quotes and different world cannot suppress reviewer findings',()=>{
 const answer='SUCCESS was recorded, but SUCCESS might be outdated.';
 const claim=candidate([{value:'SUCCESS',quote:'SUCCESS',refs:['github:actions:verified-success']}]);
 assert.equal(adjudicateSourceReview({answer,review:review('SUCCESS'),
  candidate:claim,sourceSnapshot:snapshot}).unresolved_count,1);
 assert.equal(adjudicateSourceReview({answer:'SUCCESS',review:review('SUCCESS'),
  candidate:{...claim,world_id:'other:world'},sourceSnapshot:snapshot}).unresolved_count,1);
});
