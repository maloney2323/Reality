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
 const source=continuityHistory.filter(e=>{
  const p=e?.payload;
  const state=p?.goal_state_contract,proposal=p?.assistant_proposal;
  return p?.event_type==='ASSISTANT_GOAL_PROPOSAL_AND_AUTHORITY_DECISION'&&
    state?.world_id===(worldId||null)&&
    state?.goal_id===goalState.goal_id&&
    nonempty(proposal?.proposal_id)&&
    proposal.target_goal_id===goalState.goal_id&&
    p?.verifier_decision?.proposal_id===proposal.proposal_id&&
    p?.verifier_decision?.goal_id===goalState.goal_id&&
    p?.verifier_decision?.external_actions_authorized===false&&
    p?.verifier_decision?.authorized_goal_mutations===0;
 }).slice(-MAX_EVENTS);
 const entries=source.map(e=>{
  const p=e.payload,mutations=p.assistant_proposal.intended_state_mutations?.goal_mutations||[];
  const blocked=mutations.some(x=>
   ['SHIFT_OBJECTIVE','SCHEDULE_FUTURE_WORK'].includes(x.type)&&
    x.authorized_by==='ASSISTANT_PROPOSAL'&&x.authorization_state==='UNAUTHORIZED');
  const classified=p.verifier_decision.status==='UNAUTHORIZED_ASSISTANT_GOAL_SHIFT_BLOCKED'||
    p.verifier_decision.status==='UNVERIFIED_ASSISTANT_COMPLETION_BLOCKED';
  const status=blocked&&classified?'BLOCKED_ASSISTANT_REDIRECTION_CANDIDATE':
    p.verifier_decision.status==='NOT_SEMANTICALLY_ASSESSED'?
      'SEMANTIC_REVIEW_UNASSESSED':'NO_BLOCKED_DIRECTION_CHANGE_RECORDED';
  return {
   source_receipt_id:e.event_id,
   proposal_id:p.assistant_proposal.proposal_id,
   current_user_packet_id:p.assistant_proposal.target_turn_id,
   status,reviewer_only_not_independent_truth:true,
  };
 });
 let consecutive=0,reviewGap=false;
 for(let i=entries.length-1;i>=0;i--){
  if(entries[i].status==='BLOCKED_ASSISTANT_REDIRECTION_CANDIDATE')consecutive++;
  else {if(entries[i].status==='SEMANTIC_REVIEW_UNASSESSED')reviewGap=true;break;}
 }
 return freeze({
  version:ASSISTANT_TRAJECTORY_BOUNDARY_VERSION,
  goal_id:goalState.goal_id,
  source_goal_ref:goalState.provenance.origin_turn_id,
  world_id:worldId||null,continuity_root_id:continuityRootId,
  historical_proposals_count:entries.length,
  recent_proposal_receipts:entries,
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
