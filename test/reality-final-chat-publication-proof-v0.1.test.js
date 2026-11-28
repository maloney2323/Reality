import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {assertFinalChatPublicationProof as check,compileFinalOutputClaimAssessment,hashOutputClaimAssessment,summarizeOutputClaimAssessment}
 from '../src/reality-final-chat-publication-proof-v0.1.js';
const digest=x=>'sha256:'+createHash('sha256').update(JSON.stringify(x)).digest('hex');
const answer='The user goal remains drafting the contractor pilot summary.  ';
function mock({text=answer,allow=true}={}){
 const result={canonical_epistemic_state:{
  status:'PERSISTED_AND_READBACK_VERIFIED',frame_hash:'sha256:frame',
  source_receipt_id:'source-canonical-1'},readback_verified:true,
  goal_authority_contracts:{authorized_user_goal_state:{transition_count:2}},
  final_direction_release:{
   source_receipt_id:'source-final-review-2',final_answer_hash:digest(text),
   release_allowed:allow,status:allow?'NO_KNOWN_UNAUTHORIZED_DIRECTION_IN_RELEASE':'BLOCKED_OFF_GOAL_TEXT',
   known_off_goal_text_withheld:!allow,
   output_claim_assessment:{schema:'reality-final-output-claim-assessment-v0.1',
    readback_verified:true,ledger_receipt_id:'source-final-review-2',released_answer_hash:digest(text),
    candidate_answer_hash:digest(allow?text:'off-goal candidate'),assessment_hash:digest('assessment'),
    disposition:allow?'CANDIDATE_RELEASED_COVERAGE_LIMITED':'DIRECTION_CANDIDATE_WITHHELD',
    unsupported_assertion_detected:false,extraction_completeness_verified:false,
    semantic_accuracy_independently_verified:false,external_execution_authorized:false}},
 };
 seal(result);return result;
}
function seal(r){const a=r.final_direction_release.output_claim_assessment;const {assessment_hash,ledger_receipt_id,readback_verified,...payload}=a;a.assessment_hash=hashOutputClaimAssessment(payload);}
test('exact checked answer, durable source receipts and atomic publication are jointly required',()=>{
 const r=check({answer,reliability:mock(),atomicGoalPublicationEnabled:true});
 assert.equal(r.final_answer_hash,digest(answer));
 assert.equal(r.current_authorized_goal_revision,2);
 assert.equal(r.external_execution_authorized,false);
 assert.equal(r.semantic_accuracy_independently_verified,false);
});
test('even whitespace mutation after goal verifier cannot publish under the prior hash',()=>{
 assert.throws(()=>check({answer:answer.trim(),reliability:mock(),
  atomicGoalPublicationEnabled:true}),/CHAT_FINAL_ANSWER_CHANGED_AFTER_DIRECTION_VERIFICATION/);
});
test('no atomic goal revision gate is a hard error, never legacy direct insert',()=>{
 assert.throws(()=>check({answer,reliability:mock(),atomicGoalPublicationEnabled:false}),
  /CHAT_ATOMIC_GOAL_PUBLICATION_REQUIRED/);
});
test('candidate with a known off-goal quote cannot publish unless withheld',()=>{
 const bad=mock({allow:false});
 bad.final_direction_release.known_off_goal_text_withheld=false;
 assert.throws(()=>check({answer,reliability:bad,atomicGoalPublicationEnabled:true}),
  /CHAT_KNOWN_OFF_GOAL_ANSWER_NOT_WITHHELD/);
 assert.equal(check({answer,reliability:mock({allow:false}),atomicGoalPublicationEnabled:true})
  .final_answer_hash,digest(answer));
});
test('missing authoritative goal snapshot or final receipt cannot be passed off as verified',()=>{
 const noGoal=mock(); delete noGoal.goal_authority_contracts;
 assert.throws(()=>check({answer,reliability:noGoal,atomicGoalPublicationEnabled:true}),
  /CHAT_GOAL_AUTHORITY_SNAPSHOT_MISSING/);
 const noFinal=mock(); delete noFinal.final_direction_release;
 assert.throws(()=>check({answer,reliability:noFinal,atomicGoalPublicationEnabled:true}),
  /CHAT_FINAL_DIRECTION_RECEIPT_REQUIRED/);
 const noFrame=mock();noFrame.readback_verified=false;
 assert.throws(()=>check({answer,reliability:noFrame,atomicGoalPublicationEnabled:true}),
  /CHAT_CANONICAL_SOURCE_FRAME_NOT_VERIFIED/);
});

test('a clean direction detector alone cannot pass exact output publication',()=>{
 const bad=mock();delete bad.final_direction_release.output_claim_assessment;
 assert.throws(()=>check({answer,reliability:bad,atomicGoalPublicationEnabled:true}),/CHAT_FINAL_OUTPUT_CLAIM_RECEIPT_REQUIRED/);
});
test('unsupported exact extracted claim is not source truth and cannot pass as released',()=>{
 const text='The supplier confirmed a refund.';
 const snapshot={world_id:'fixture',facts:[],obligations:[],authorities:[],receipts:[],source_receipt_ids:[]};
 const candidate={world_id:'fixture',claims:[{key:'refund',value:'confirmed',evidence_refs:[],original_quote:text}],actions:[],carried_obligation_ids:[]};
 const a=compileFinalOutputClaimAssessment({answer:text,candidate,snapshot});
 assert.equal(a.unsupported_assertion_detected,true);
 assert.equal(a.claim_rows[0].verification_status,'UNSUPPORTED_OR_CONTRADICTED');
 const bad=mock({text});bad.final_direction_release.output_claim_assessment.unsupported_assertion_detected=true;seal(bad);
 assert.throws(()=>check({answer:text,reliability:bad,atomicGoalPublicationEnabled:true}),/CHAT_UNSUPPORTED_OUTPUT_NOT_WITHHELD/);
});
test('matched claims carry exact source reference but never prove extraction completeness',()=>{
 const text='The shift is RUNNING.';
 const snapshot={world_id:'fixture',facts:[{world_id:'fixture',key:'shift_status',value:'RUNNING',evidence_ref:'receipt:shift'}],obligations:[],authorities:[],receipts:[],source_receipt_ids:['receipt:shift']};
 const candidate={world_id:'fixture',claims:[{key:'shift_status',value:'RUNNING',evidence_refs:['receipt:shift'],original_quote:text}],actions:[],carried_obligation_ids:[]};
 const a=compileFinalOutputClaimAssessment({answer:text,candidate,snapshot});
 assert.equal(a.claim_rows[0].verification_status,'SOURCE_MATCHED_TYPED_ASSERTION_ONLY');
 assert.equal(a.unsupported_assertion_detected,false);
 assert.equal(a.extraction_completeness_verified,false);
});

test('stored assessment cannot be altered while keeping the original digest',()=>{
 const bad=mock();bad.final_direction_release.output_claim_assessment.unsupported_assertion_detected=true;
 assert.throws(()=>check({answer,reliability:bad,atomicGoalPublicationEnabled:true}),/CHAT_OUTPUT_CLAIM_ASSESSMENT_DIGEST_MISMATCH/);
});
test('quarantined operational assertion stays in audit, never in client diagnostics',()=>{
 const marker='private withheld candidate 41234';
 const view=summarizeOutputClaimAssessment({schema:'reality-final-output-claim-assessment-v0.1',
  status:'UNSUPPORTED_ASSERTIONS_REQUIRE_WITHHOLDING',unsupported_assertion_detected:true,
  claim_rows:[{quote:marker,value:marker}],review_concerns:[{quote:marker}],unassessed_claims:[{quote:marker}]});
 assert.equal(view.unsupported_assertion_detected,true);
 assert.equal(view.extracted_claim_count,1);
 assert.equal(JSON.stringify(view).includes(marker),false);
});
