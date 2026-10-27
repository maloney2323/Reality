import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {assertFinalChatPublicationProof as check}
 from '../src/reality-final-chat-publication-proof-v0.1.js';
const digest=x=>'sha256:'+createHash('sha256').update(JSON.stringify(x)).digest('hex');
const answer='The user goal remains drafting the contractor pilot summary.  ';
function mock({text=answer,allow=true}={}){
 return {canonical_epistemic_state:{
  status:'PERSISTED_AND_READBACK_VERIFIED',frame_hash:'sha256:frame',
  source_receipt_id:'source-canonical-1'},readback_verified:true,
  goal_authority_contracts:{authorized_user_goal_state:{transition_count:2}},
  final_direction_release:{
   source_receipt_id:'source-final-review-2',final_answer_hash:digest(text),
   release_allowed:allow,status:allow?'NO_KNOWN_UNAUTHORIZED_DIRECTION_IN_RELEASE':'BLOCKED_OFF_GOAL_TEXT',
   known_off_goal_text_withheld:!allow},
 };
}
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
