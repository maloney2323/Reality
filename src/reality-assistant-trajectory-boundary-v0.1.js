// A Continuity-native observation of assistant-origin goal proposals.
// This is not a new memory store or another LLM classifier.
// A streak requires same-goal, source-linked, *blocked* proposal receipts;
// incidental topic vocabulary and user-authorized detours never increment it.
export const ASSISTANT_TRAJECTORY_BOUNDARY_VERSION='reality-assistant-trajectory-boundary-v0.1';
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const MAX_EVENTS=16;
const STOP_THRESHOLD=3;

export function projectAssistantTrajectoryBoundary({
 continuityHistory=[],goalState,continuityRootId,worldId=null,
}={}){
 if(!Array.isArray(continuityHistory)||!nonempty(continuityRootId)||
    !nonempty(goalState?.goal_id)||goalState.world_id!==(worldId||null))
  throw Error('ASSISTANT_TRAJECTORY_SCOPE_REQUIRED');
 // Do not pre-filter other goals: a legitimate user-owned switch MUST
 // interrupt the same-goal consecutive assistant redirection streak.
 const source=continuityHistory.filter(e=>
   e?.payload?.event_type==='ASSISTANT_GOAL_PROPOSAL_AND_AUTHORITY_DECISION'&&
   typeof e.event_id==='string'&&
   e.event_id.startsWith('goal-proposal:'+continuityRootId+':')&&
   e.payload.goal_state_contract?.world_id===(worldId||null)
 ).slice(-MAX_EVENTS);
 const entries=source.map(e=>{
  const p=e.payload,state=p.goal_state_contract,proposal=p.assistant_proposal;
  const sameGoal=state?.goal_id===goalState.goal_id;
  const validLineage=nonempty(proposal?.proposal_id)&&
    proposal.target_goal_id===state?.goal_id&&
    p.verifier_decision?.proposal_id===proposal.proposal_id&&
    p.verifier_decision?.goal_id===state?.goal_id&&
    p.verifier_decision?.external_actions_authorized===false&&
    p.verifier_decision?.authorized_goal_mutations===0;
  if(!sameGoal||!validLineage)return {
    source_receipt_id:e.event_id,
    proposal_id:proposal?.proposal_id||null,
    status:!sameGoal?'DIFFERENT_USER_GOAL_INTERRUPTED_STREAK':
      'UNVERIFIED_PROPOSAL_SOURCE_INTERRUPTED_STREAK',
    reviewer_only_not_independent_truth:true,
  };
  const mutations=proposal.intended_state_mutations?.goal_mutations||[];
  const blocked=mutations.some(x=>
   ['SHIFT_OBJECTIVE','SCHEDULE_FUTURE_WORK'].includes(x.type)&&
    x.authorized_by==='ASSISTANT_PROPOSAL'&&x.authorization_state==='UNAUTHORIZED');
  const classified=p.verifier_decision.status==='UNAUTHORIZED_ASSISTANT_GOAL_SHIFT_BLOCKED'||
    p.verifier_decision.status==='UNVERIFIED_ASSISTANT_COMPLETION_BLOCKED';
  const semanticOffGoal=proposal.direction_evaluation?.status==='REVIEWER_CANDIDATE_NOT_INDEPENDENTLY_VERIFIED'&&
    proposal.direction_evaluation?.aligns_with_active_objective===false;
  const status=blocked&&classified?'BLOCKED_ASSISTANT_REDIRECTION_CANDIDATE':
    p.verifier_decision.status==='NOT_SEMANTICALLY_ASSESSED'?
      'SEMANTIC_REVIEW_UNASSESSED':semanticOffGoal?
        'SEMANTIC_ASSISTANT_WORK_DIRECTION_SHIFT_CANDIDATE':
        'NO_BLOCKED_DIRECTION_CHANGE_RECORDED';
  return {
   source_receipt_id:e.event_id,
   proposal_id:p.assistant_proposal.proposal_id,
   current_user_packet_id:p.assistant_proposal.target_turn_id,
   status,reviewer_only_not_independent_truth:true,
   recommendation_evidence:{
     original_model_response_id:proposal.model_response_id||null,
     source_goal_id:proposal.target_goal_id,
     first_pass_work_excerpt:String(proposal.proposed_response_excerpt||'').slice(0,700),
     reviewer_goal_source_ref:proposal.direction_evaluation?.reviewer_goal_source_ref||null,
     reviewer_goal_alignment:proposal.direction_evaluation?.aligns_with_active_objective,
     semantic_shift_candidate:semanticOffGoal||blocked,
     user_approved_new_goal:false,
     independently_verified_semantics:false,
   },
  };
 });
 const recommendations=entries.filter(x=>x.recommendation_evidence)
  .slice(-8).map(x=>({
    source_receipt_id:x.source_receipt_id,
    ...x.recommendation_evidence,
    assessment_status:x.status,
  }));
 let consecutive=0,reviewGap=false;
 for(let i=entries.length-1;i>=0;i--){
  if(['BLOCKED_ASSISTANT_REDIRECTION_CANDIDATE',
    'SEMANTIC_ASSISTANT_WORK_DIRECTION_SHIFT_CANDIDATE'].includes(entries[i].status))consecutive++;
  else {if(entries[i].status==='SEMANTIC_REVIEW_UNASSESSED')reviewGap=true;break;}
 }
 return freeze({
  version:ASSISTANT_TRAJECTORY_BOUNDARY_VERSION,
  goal_id:goalState.goal_id,
  source_goal_ref:goalState.provenance.origin_turn_id,
  world_id:worldId||null,continuity_root_id:continuityRootId,
  historical_proposals_count:entries.length,
  recent_proposal_receipts:entries,
  recent_work_direction_evidence:recommendations,
  recommendation_trajectory_assessment:
    recommendations.some(x=>x.semantic_shift_candidate)?
      'SOURCE_LINKED_ASSISTANT_DIRECTION_SHIFT_CANDIDATES':
      recommendations.length?
      'WORK_DIRECTION_EVIDENCE_AVAILABLE_NO_VERIFIED_DRIFT_RESULT':
      'INSUFFICIENT_ASSISTANT_RECOMMENDATION_HISTORY',
  off_goal_streak_counter:consecutive,
  direction_reanchor_recommended:consecutive>=STOP_THRESHOLD-1,
  historical_direction_fault:consecutive>=STOP_THRESHOLD,
  next_unauthorized_proposal_would_trip:consecutive>=STOP_THRESHOLD-1,
  threshold:STOP_THRESHOLD,
  review_gap_at_streak_boundary:reviewGap,
  independent_semantic_accuracy_verified:false,
  explicit_user_goal_changed:false,
  execution_authorized:false,
  no_candidates_does_not_prove_no_drift:true,
 });
}

/**
 * The reviewer already sees the same goal graph; ambiguity is an INTERPRETATION
 * of the current USER utterance, not a phrase regex or an authority grant.
 * Only existing same-world goal IDs and user sources appear in choices.
 */
export function resolveAmbiguousGoalReturn({
 goalLifecycle,goalReview,currentUserMessage,
}={}){
 const status=goalReview?.return_intent==='AMBIGUOUS_RETURN_TARGET';
 const quote=String(goalReview?.return_request_quote||'');
 const quoteAnchored=nonempty(quote)&&
   typeof currentUserMessage==='string'&&currentUserMessage.includes(quote);
 const working=goalLifecycle?.working_goal;
 const distinct=new Map();
 for(const x of [
  goalLifecycle?.preserved_original_goal,
  ...(goalLifecycle?.paused_goal_candidates||[]),
  ...(goalLifecycle?.dormant_goal_candidates||[]),
 ]){
  if(!nonempty(x?.goal_evidence_id)||!nonempty(x?.source_ref)||!nonempty(x?.text)||
     x.goal_evidence_id===working?.goal_evidence_id)continue;
  distinct.set(x.goal_evidence_id,{
   goal_id:x.goal_evidence_id,source_ref:x.source_ref,
   title:x.text.slice(0,160),
   source:'USER_GOAL_CONTINUITY',
  });
 }
 const candidates=[...distinct.values()].slice(0,8);
 const needsChoice=Boolean(status&&quoteAnchored&&candidates.length>1);
 return freeze({
  version:ASSISTANT_TRAJECTORY_BOUNDARY_VERSION,
  status:needsChoice?'AMBIGUOUS_GOAL_RETURN_NEEDS_USER_CHOICE':
    status&&!quoteAnchored?'UNANCHORED_REVIEWER_RETURN_CANDIDATE':
    status?'RETURN_TARGET_NOT_MULTIPLE_IN_CURRENT_PROJECTION':
    'NO_AMBIGUOUS_RETURN_CANDIDATE',
  return_intent_reviewed:goalReview?.return_intent||'NOT_ASSESSED',
  current_user_source_quote:quoteAnchored?quote:null,
  ambiguous_targets:needsChoice?candidates:[],
  user_selection_required:needsChoice,
  independently_verified_intent:false,
  goal_transition_authorized:false,
  external_execution_authorized:false,
 });
}
export function ambiguousGoalReturnQuestion({ambiguity}={}){
 if(ambiguity?.status!=='AMBIGUOUS_GOAL_RETURN_NEEDS_USER_CHOICE'||
    !Array.isArray(ambiguity.ambiguous_targets)||ambiguity.ambiguous_targets.length<2)
  throw Error('AMBIGUOUS_GOAL_RETURN_CHOICE_REQUIRED');
 return 'Which earlier objective did you want to return to? '+
  ambiguity.ambiguous_targets.map((x,i)=>
   (i+1)+'. "'+x.title+'" (user source '+x.source_ref+')').join('  ')+
  '. I will not change the working goal until you clarify.';
}
