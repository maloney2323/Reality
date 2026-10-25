import test from 'node:test';
import assert from 'node:assert/strict';
import {assessGoalDriftCoverage} from '../src/reality-goal-drift-assessment-coverage-v0.1.js';
const trajectory={
 original_user_goal_candidate:{source_ref:'auth:user:1',text:'Get the first paying construction pilot.'},
 current_user_direction:{source_ref:'auth:user:now',text:'Return to the paying pilot.'},
 recent_user_directions:[],recent_assistant_behavior:[],
 older_user_directions_omitted:false,older_assistant_behavior_omitted:false,
};
function review(overrides={}){
 return {status:'REVIEWED_CANDIDATES_NOT_TRUTH',goal_trajectory_review:{
  status:'REVIEWED_GOAL_TRAJECTORY_CANDIDATE',
  goal_source_ref:'auth:user:now',
  answer_alignment:'ON_USER_DIRECTED_OBJECTIVE',
  user_direction:'USER_RETURNED_TO_OBJECTIVE',
  reason:'Answer aligns with current user objective.',
 },...overrides};
}
const assess=(arg={})=>assessGoalDriftCoverage({
 userGoalTrajectory:trajectory,trustedConversationHistory:true,
 semanticReview:review(),findings:[],...arg,
});
test('missing reviewer with zero lexical hits cannot certify drift-free conversation',()=>{
 const r=assess({semanticReview:null,semanticReviewStatus:'UNASSESSED:PAID_MODEL_SEGMENT_BUDGET_CAP'});
 assert.equal(r.status,'NOT_SEMANTICALLY_ASSESSED');
 assert.equal(r.extracted_drift_candidate_count,0);
 assert.equal(r.independently_verified_drift_rate,null);
 assert.equal(r.candidate_count_zero_means_drift_free,false);
 assert.equal(r.reviewed_goal_trajectory,false);
 assert.ok(r.coverage_limitations.includes('SEMANTIC_GOAL_REVIEW_MISSING_OR_INVALID'));
});
test('successful reviewer with zero candidates is still unverified, not zero drift',()=>{
 const r=assess();
 assert.equal(r.status,'REVIEWED_NO_CANDIDATES_NOT_VALIDATED');
 assert.equal(r.independent_drift_accuracy_adjudicated,false);
 assert.equal(r.model_semantic_false_negative_possible,true);
 assert.equal(r.independently_verified_drift_rate,null);
});
test('partial semantic review with zero hits explicitly limits coverage',()=>{
 const r=assess({semanticReview:review({status:'REVIEWED_PARTIAL_COVERAGE'})});
 assert.equal(r.status,'LIMITED_REVIEW_NO_CANDIDATES');
 assert.equal(r.historical_coverage_complete,false);
 assert.ok(r.coverage_limitations.includes('SEMANTIC_REVIEW_PARTIAL_OR_NOT_COMPLETED'));
});
test('one truncated or omitted history range prevents a clean coverage status',()=>{
 const a=assess({historyMayBeIncomplete:true});
 assert.equal(a.status,'LIMITED_REVIEW_NO_CANDIDATES');
 assert.ok(a.coverage_limitations.includes('CONVERSATION_HISTORY_MAY_BE_TRUNCATED'));
 const b=assess({userGoalTrajectory:{...trajectory,older_assistant_behavior_omitted:true}});
 assert.equal(b.status,'LIMITED_REVIEW_NO_CANDIDATES');
 assert.ok(b.coverage_limitations.includes('OLDER_ASSISTANT_RESPONSES_OMITTED'));
});
test('assistant-led off-goal reviewer outcome becomes candidate, never verified drift percentage',()=>{
 const r=assess({semanticReview:review({goal_trajectory_review:{
  ...review().goal_trajectory_review,
  answer_alignment:'ASSISTANT_DRIFTED_OFF_OBJECTIVE',
 }}) ,findings:[{classification:'CONVERSATION_TOPIC_DRIFT_CANDIDATE'}]});
 assert.equal(r.status,'DRIFT_CANDIDATES_REQUIRE_ADJUDICATION');
 assert.equal(r.extracted_drift_candidate_count,1);
 assert.equal(r.independently_verified_drift_rate,null);
});
test('user-authorized temporary detour is not an automatic goal-drift alert',()=>{
 const r=assess({semanticReview:review({goal_trajectory_review:{
  ...review().goal_trajectory_review,
  user_direction:'USER_AUTHORIZED_DETOUR',
 }})});
 assert.equal(r.status,'REVIEWED_NO_CANDIDATES_NOT_VALIDATED');
 assert.equal(r.user_direction,'USER_AUTHORIZED_DETOUR');
});
test('reviewer saying insufficient evidence is visible as unresolved',()=>{
 const r=assess({semanticReview:review({goal_trajectory_review:{
  ...review().goal_trajectory_review,
  answer_alignment:'INSUFFICIENT_EVIDENCE',
 }})});
 assert.equal(r.status,'GOAL_ALIGNMENT_UNRESOLVED');
});
test('invalid or fabricated source-linked goal assessment is not accepted',()=>{
 const r=assess({semanticReview:review({goal_trajectory_review:{
  status:'INVALID_OR_UNANCHORED_GOAL_ASSESSMENT',
  answer_alignment:'ON_USER_DIRECTED_OBJECTIVE',goal_source_ref:'assistant:forgery',
 }})});
 assert.equal(r.status,'NOT_SEMANTICALLY_ASSESSED');
});
