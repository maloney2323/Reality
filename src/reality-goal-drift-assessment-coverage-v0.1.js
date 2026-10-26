// Reality's existing conversational-drift receipt coverage contract.
// A count of zero detected candidates NEVER asserts a zero true drift rate.
// Model reviewers, semantic trajectory checks, and lexical rule checks are
// diagnostics; independent correctness remains unknown until separate grading.
export const GOAL_DRIFT_COVERAGE_VERSION='reality-goal-drift-coverage-v0.1';
const VALID_GOAL_STATUS='REVIEWED_GOAL_TRAJECTORY_CANDIDATE';
const validRef=x=>typeof x==='string'&&x.trim().length>0;
export function assessGoalDriftCoverage({
 semanticReview=null,semanticReviewStatus='NOT_ATTEMPTED',
 userGoalTrajectory=null,authoritativeGoalGraph=null,historyMayBeIncomplete=false,
 trustedConversationHistory=false,findings=[],
}={}){
 if(!Array.isArray(findings))throw Error('GOAL_DRIFT_COVERAGE_FINDINGS_INVALID');
 const goal=semanticReview?.goal_trajectory_review||null;
 const validGoal=goal?.status===VALID_GOAL_STATUS &&
   validRef(goal.goal_source_ref)&&validRef(goal.reason)&&
   ['ON_USER_DIRECTED_OBJECTIVE','ASSISTANT_DRIFTED_OFF_OBJECTIVE',
     'INSUFFICIENT_EVIDENCE'].includes(goal.answer_alignment);
 const reviewerStatus=semanticReview?.status||semanticReviewStatus||'NOT_ATTEMPTED';
 const reviewCompleted=validGoal&&
   ['REVIEWED_CANDIDATES_NOT_TRUTH','REVIEWED_PARTIAL_COVERAGE'].includes(reviewerStatus);
 const goalGraphHasUnresolvedAncestry=Boolean(
   authoritativeGoalGraph?.incomplete_parent_relations?.length);
 const missingEvidence=goalGraphHasUnresolvedAncestry||
   !trustedConversationHistory||Boolean(historyMayBeIncomplete)||
   Boolean(userGoalTrajectory?.older_user_directions_omitted)||
   Boolean(userGoalTrajectory?.older_assistant_behavior_omitted);
 const semanticCandidate=validGoal&&goal.answer_alignment==='ASSISTANT_DRIFTED_OFF_OBJECTIVE';
 const goalAmbiguous=validGoal&&goal.answer_alignment==='INSUFFICIENT_EVIDENCE';
 const anyCandidate=findings.length>0||semanticCandidate;
 const fullReviewerClaims=reviewerStatus==='REVIEWED_CANDIDATES_NOT_TRUTH';
 let assessmentStatus;
 if(anyCandidate)assessmentStatus='DRIFT_CANDIDATES_REQUIRE_ADJUDICATION';
 else if(!reviewCompleted)assessmentStatus='NOT_SEMANTICALLY_ASSESSED';
 else if(goalAmbiguous)assessmentStatus='GOAL_ALIGNMENT_UNRESOLVED';
 else if(missingEvidence||!fullReviewerClaims)
   assessmentStatus='LIMITED_REVIEW_NO_CANDIDATES';
 else assessmentStatus='REVIEWED_NO_CANDIDATES_NOT_VALIDATED';
 const reasons=[];
 if(!reviewCompleted)reasons.push('SEMANTIC_GOAL_REVIEW_MISSING_OR_INVALID');
 if(!trustedConversationHistory)reasons.push('NO_TRUSTED_PRIOR_CONVERSATION');
 if(historyMayBeIncomplete)reasons.push('CONVERSATION_HISTORY_MAY_BE_TRUNCATED');
 if(userGoalTrajectory?.older_user_directions_omitted)
   reasons.push('OLDER_USER_DIRECTIONS_OMITTED');
 if(userGoalTrajectory?.older_assistant_behavior_omitted)
   reasons.push('OLDER_ASSISTANT_RESPONSES_OMITTED');
 if(goalGraphHasUnresolvedAncestry)
   reasons.push('AUTHORITATIVE_PARENT_GOAL_RELATION_INCOMPLETE');
 if(!fullReviewerClaims)reasons.push('SEMANTIC_REVIEW_PARTIAL_OR_NOT_COMPLETED');
 if(goalAmbiguous)reasons.push('GOAL_DIRECTION_AMBIGUOUS');
 if(anyCandidate)reasons.push('SOURCE_LINKED_CANDIDATE_REQUIRES_INDEPENDENT_GRADING');
 const candidateCount=findings.length;
 const result={
  version:GOAL_DRIFT_COVERAGE_VERSION,
  status:assessmentStatus,
  reviewer_status:reviewerStatus,
  reviewed_goal_trajectory:Boolean(reviewCompleted),
  reviewer_goal_alignment:validGoal?goal.answer_alignment:'NOT_ASSESSED',
  user_direction:validGoal?goal.user_direction:'NOT_ASSESSED',
  goal_source_ref:validGoal?goal.goal_source_ref:null,
  extracted_drift_candidate_count:candidateCount,
  candidate_count_zero_means_drift_free:false,
  independent_drift_accuracy_adjudicated:false,
  independently_verified_drift_rate:null,
  model_semantic_false_negative_possible:true,
  historical_coverage_complete:reviewCompleted&&!missingEvidence&&fullReviewerClaims,
  trusted_user_history:trustedConversationHistory,
  coverage_limitations:reasons,
 };
 return Object.freeze(result);
}
