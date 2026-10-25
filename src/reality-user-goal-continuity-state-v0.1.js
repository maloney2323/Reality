// Source-linked user-goal CONTINUITY projection. Not a second truth database,
// intent classifier, authority gateway, or keyword-based detector.
// The existing Continuity spine owns durable events. Only authenticated user
// utterances can create goal evidence; previous assistant answers never do.
// Statuses remain unresolved until a meaning-aware, source-bound lifecycle
// reconciliation proves a specific user-authorized transition.
import {createHash} from 'node:crypto';
export const USER_GOAL_CONTINUITY_STATE_VERSION='reality-user-goal-continuity-state-v0.1';
const hash=x=>'goal:'+createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0,32);
const has=x=>typeof x==='string'&&x.trim().length>0;
const deepFreeze=x=>{
 if(x&&typeof x==='object'){for(const v of Object.values(x))deepFreeze(v);Object.freeze(x);}
 return x;
};
function accept(r,root,world){
 return r?.version===USER_GOAL_CONTINUITY_STATE_VERSION &&
  r.continuity_root_id===root&&r.world_id===(world||null)&&
  Array.isArray(r.user_goal_evidence)&&r.user_goal_evidence.length<=24&&
  r.user_goal_evidence.every(x=>has(x.source_ref)&&has(x.text)&&has(x.goal_evidence_id)&&
   x.source_role==='USER_CHANNEL_UTTERANCE'&&
   x.lifecycle_status==='REQUIRES_SEMANTIC_RECONCILIATION');
}
export function buildUserGoalContinuityState({
 continuityRootId,worldId=null,verifiedConversationTurns=null,
 currentUserMessage,currentUserSourceRef,priorState=null,
 conversationHistoryMayBeIncomplete=false,
}={}){
 if(!has(continuityRootId)||!has(currentUserMessage)||!has(currentUserSourceRef))
  throw Error('USER_GOAL_CONTINUITY_SOURCE_REQUIRED');
 if(verifiedConversationTurns!==null&&(
  !Array.isArray(verifiedConversationTurns)||verifiedConversationTurns.length>240||
  verifiedConversationTurns.some(x=>!['user','assistant'].includes(x?.role)||
   !has(x.text)||!has(x.source_ref))))
  throw Error('USER_GOAL_CONTINUITY_UNTRUSTED_HISTORY');
 // An invalid, unrelated or cross-world snapshot is never reused.
 if(priorState!==null&&!accept(priorState,continuityRootId,worldId))
  throw Error('USER_GOAL_CONTINUITY_PRIOR_STATE_INVALID');
 const authorized=verifiedConversationTurns!==null;
 const before=priorState?.user_goal_evidence||[];
 const records=new Map();
 for(const x of before)records.set(x.source_ref,{...x});
 // No client-provided semantic labels. All user turns, regardless of topic,
 // are kept as interpretations to reconcile, not automatically new goals.
 if(authorized){
  for(const turn of verifiedConversationTurns){
   if(turn.role!=='user')continue;
   if(!records.has(turn.source_ref)){
    records.set(turn.source_ref,{
     goal_evidence_id:hash([continuityRootId,worldId,turn.source_ref]),
     source_ref:turn.source_ref,text:turn.text.slice(0,700),
     source_role:'USER_CHANNEL_UTTERANCE',
     lifecycle_status:'REQUIRES_SEMANTIC_RECONCILIATION',
     asserts_external_truth:false,
     grants_execution_authority:false,
    });
   }
  }
 }
 const candidate={
  goal_evidence_id:hash([continuityRootId,worldId,currentUserSourceRef]),
  source_ref:currentUserSourceRef,text:currentUserMessage.slice(0,700),
  // Current input originates from current authenticated channel for the
  // server pathway; without trusted prior history, mark reduced coverage.
  source_role:'USER_CHANNEL_UTTERANCE',
  lifecycle_status:'REQUIRES_SEMANTIC_RECONCILIATION',
  asserts_external_truth:false,
  grants_execution_authority:false,
 };
 records.set(candidate.source_ref,candidate);
 const all=[...records.values()];
 // Keep the original user objective candidate and the last 23 user turns.
 // Prior Continuity snapshots carry the original even after chat retrieval
 // truncates; no assistant-origin text can replace that anchor.
 const original=priorState?.original_user_goal_evidence_id?
  all.find(x=>x.goal_evidence_id===priorState.original_user_goal_evidence_id):
  all[0];
 if(!original)throw Error('USER_GOAL_CONTINUITY_EMPTY_SOURCE');
 const max=24;
 const tail=all.filter(x=>x.goal_evidence_id!==original.goal_evidence_id).slice(-(max-1));
 const retained=[original,...tail];
 return deepFreeze({
  version:USER_GOAL_CONTINUITY_STATE_VERSION,
  continuity_root_id:continuityRootId,world_id:worldId||null,
  original_user_goal_evidence_id:original.goal_evidence_id,
  original_user_goal_source_ref:original.source_ref,
  original_user_goal_candidate:original.text,
  current_user_evidence_id:candidate.goal_evidence_id,
  user_goal_evidence:retained,
  user_turn_evidence_seen_lower_bound:Math.max(all.length,priorState?.user_turn_evidence_seen_lower_bound||0),
  source_history_truncated:Boolean(conversationHistoryMayBeIncomplete)||
   Boolean(priorState?.source_history_truncated)||!authorized,
  goal_evidence_records_omitted_at_least:Math.max(0,all.length-retained.length,
   priorState?.goal_evidence_records_omitted_at_least||0),
  // Crucial: neither the intake classifier nor model suggestions get to
  // change these lifecycle states by silently inferring user approval.
  active_goals:[],
  temporarily_suspended_goals:[],
  completed_goals:[],
  superseded_goals:[],
  unresolved_user_goal_transitions:retained.map(x=>x.goal_evidence_id),
  lifecycle_reconciliation_status:'USER_INTENT_TRANSITIONS_NOT_SEMANTICALLY_RECONCILED',
  active_goal_claimed_verified:false,
  assistant_suggestions_can_change_goal:false,
  external_actions_authorized:false,
  independently_verified_goal_alignment:false,
 });
}
export function recoverPriorUserGoalState({
 continuityHistory,continuityRootId,worldId=null,
}={}){
 if(!Array.isArray(continuityHistory))throw Error('USER_GOAL_HISTORY_REQUIRED');
 // Append-only verified Continuity history, not text supplied in the
 // current request. Find newest canonical frame with same root and world.
 for(let i=continuityHistory.length-1;i>=0;i--){
  const event=continuityHistory[i];
  const frame=event?.payload?.frame;
  if(event?.payload?.event_type!=='CANONICAL_EPISTEMIC_FRAME')continue;
  if(!frame||frame.continuity_root_id!==continuityRootId||
    frame.world_id!==(worldId||null))continue;
  const state=frame.user_goal_continuity_state;
  if(!state)continue;
  if(!accept(state,continuityRootId,worldId))
   throw Error('USER_GOAL_DURABLE_STATE_INVALID');
  return state;
 }
 return null;
}


// Replay ONLY prior source-linked reviewer *interpretations* from the existing
// Continuity verification ledger. These are useful provisional working goals,
// not authorized business actions or a claim that user intent is infallibly
// understood. Current user input remains a newer directive and may change it.
export function projectProvisionalGoalLifecycle({
 continuityHistory,continuityRootId,worldId=null,goalState,
}={}){
 if(!Array.isArray(continuityHistory)||
    !accept(goalState,continuityRootId,worldId))
  throw Error('USER_GOAL_LIFECYCLE_SOURCE_REQUIRED');
 const frames=new Map(continuityHistory.filter(e=>
  e?.payload?.event_type==='CANONICAL_EPISTEMIC_FRAME'&&
  e.payload.frame?.continuity_root_id===continuityRootId&&
  e.payload.frame?.world_id===(worldId||null))
  .map(e=>[e.event_id,e.payload.frame]));
 const first=goalState.user_goal_evidence.find(x=>
  x.goal_evidence_id===goalState.original_user_goal_evidence_id);
 if(!first)throw Error('USER_GOAL_LIFECYCLE_ORIGINAL_SOURCE_NOT_PRESENT');
 let active=first,paused=[],applied=0,ambiguous=0;
 // Typed, provisional relationships. They are linked to source receipts;
 // they do not assert that a model's intent reading is user-approved truth.
 const goalParentCandidates=new Map();
 const transitions=[],assistantAlignmentHistory=[];
 let possibleConsecutiveOffGoalReviews=0;
 for(const e of continuityHistory){
  if(e?.payload?.event_type!=='MODEL_OUTPUT_ASSESSMENT')continue;
  const review=e.payload.semantic_review?.goal_trajectory_review;
  const origin=e.payload.canonical_epistemic_frame;
  if(!origin?.source_receipt_id||!review||
     review.status!=='REVIEWED_GOAL_TRAJECTORY_CANDIDATE')continue;
  const frame=frames.get(origin.source_receipt_id);
  if(!frame||frame.frame_hash!==origin.frame_hash)continue;
  const state=frame.user_goal_continuity_state;
  if(!state||!accept(state,continuityRootId,worldId))continue;
  const directUser=state.user_goal_evidence.find(x=>
   x.goal_evidence_id===state.current_user_evidence_id);
  const sourceAnchored=state.user_goal_evidence.some(x=>
   x.source_ref===review.goal_source_ref);
  if(!directUser||!sourceAnchored)continue;
  const answerAlignment=review.answer_alignment;
  if(['ON_USER_DIRECTED_OBJECTIVE','ASSISTANT_DRIFTED_OFF_OBJECTIVE',
      'INSUFFICIENT_EVIDENCE'].includes(answerAlignment)){
   assistantAlignmentHistory.push({
    verification_receipt_id:e.event_id,
    user_goal_source_ref:review.goal_source_ref,
    answer_alignment_candidate:answerAlignment,
    reviewer_not_independent_truth:true,
   });
   if(answerAlignment==='ASSISTANT_DRIFTED_OFF_OBJECTIVE')
    possibleConsecutiveOffGoalReviews++;
   else possibleConsecutiveOffGoalReviews=0;
  }
  const direction=review.user_direction;
  const validDirections=['CONTINUING_USER_OBJECTIVE','USER_AUTHORIZED_DETOUR',
    'USER_AUTHORIZED_PIVOT','USER_RETURNED_TO_OBJECTIVE','UNCLEAR'];
  if(!validDirections.includes(direction))continue;
  const priorActive=active;
  let transitionUnresolved=false;
  let relation='UNCHANGED';
  let parentCandidate=null;
  let targetCandidate=null;
  const record={
   verification_receipt_id:e.event_id,
   source_frame_receipt_id:origin.source_receipt_id,
   source_user_goal_ref:directUser.source_ref,
   proposed_interpretation:direction,
   reviewer_only_not_user_approval:true,
   independent_semantic_confirmation:false,
  };
  if(direction==='USER_AUTHORIZED_DETOUR'||
     direction==='USER_AUTHORIZED_PIVOT'){
   // The semantic reviewer may propose a transition, but the evidence it
   // interprets MUST be the current user utterance, not any old user turn or
   // an assistant suggestion. Otherwise the previous focus is unchanged.
   if(review.goal_source_ref!==directUser.source_ref){
    ambiguous++;
    transitionUnresolved=true;
    relation='GOAL_RELATION_NOT_ANCHORED_TO_CURRENT_USER';
   }else if(active.goal_evidence_id!==directUser.goal_evidence_id){
    // De-duplicate suspended goals and preserve parent relationship for an
    // explicitly temporary detour. A pivot is NOT permanent abandonment.
    paused=paused.filter(x=>x.goal_evidence_id!==active.goal_evidence_id);
    paused.push(active);
    if(direction==='USER_AUTHORIZED_DETOUR'){
     parentCandidate=active.goal_evidence_id;
     goalParentCandidates.set(directUser.goal_evidence_id,parentCandidate);
     relation='TEMPORARY_CHILD_OBJECTIVE_CANDIDATE';
    }else{
     relation='ALTERNATE_ROOT_OBJECTIVE_CANDIDATE';
    }
    active=directUser;
    applied++;
   }else{
    relation='REPEATED_CURRENT_GOAL_NO_CHANGE';
   }
  }else if(direction==='USER_RETURNED_TO_OBJECTIVE'){
   // Never pop a random "last detour". Return only to a goal explicitly
   // identified by the review's USER source reference. If the reviewer
   // anchors merely the CURRENT user request, the target is unresolved.
   const candidates=[first,...paused];
   const target=candidates.find(x=>x.source_ref===review.goal_source_ref &&
     x.goal_evidence_id!==directUser.goal_evidence_id);
   if(target){
    targetCandidate=target.goal_evidence_id;
    active=target;
    paused=paused.filter(x=>x.goal_evidence_id!==target.goal_evidence_id);
    // Explicitly unwinds to the identified previous user goal. Nested or
    // independent paused tasks remain provisional, never marked complete.
    applied++;
    relation='RETURN_TO_SOURCE_LINKED_EARLIER_GOAL_CANDIDATE';
   }else{
    ambiguous++;
    transitionUnresolved=true;
    relation='RETURN_TARGET_NOT_SOURCE_RESOLVED';
   }
  }else if(direction==='UNCLEAR'){
   ambiguous++;
   transitionUnresolved=true;
   relation='SEMANTIC_RELATION_UNRESOLVED';
  }else{
   relation='CONTINUING_GOAL_NO_MUTATION';
  }
  if(priorActive!==active||direction==='UNCLEAR'||transitionUnresolved){
   transitions.push({...record,relation,
    from_goal_evidence_id:priorActive?.goal_evidence_id||null,
    to_goal_evidence_id:active?.goal_evidence_id||null,
    parent_goal_evidence_id:parentCandidate,
    resumed_goal_evidence_id:targetCandidate,
    status:transitionUnresolved?'UNRESOLVED_SOURCE_LINKAGE':
      'PROVISIONAL_REVIEWER_TRANSITION_NOT_USER_AUTHORIZATION'});
  }
 }
 return deepFreeze({
  version:USER_GOAL_CONTINUITY_STATE_VERSION,
  status:'PROVISIONAL_SEMANTIC_USER_GOAL_RECONCILIATION',
  working_goal:{
   goal_evidence_id:active.goal_evidence_id,
   source_ref:active.source_ref,text:active.text,
   interpretive_status:'PROVISIONAL_ACTIVE_GOAL_NOT_USER_CONFIRMED',
  },
  preserved_original_goal:{
   goal_evidence_id:first.goal_evidence_id,source_ref:first.source_ref,
   text:first.text,
   interpretation:'ORIGINAL_GOAL_CANDIDATE_NOT_PERMANENTLY_REVOKED',
  },
  paused_goal_candidates:paused.slice(-8).map(x=>({
   goal_evidence_id:x.goal_evidence_id,
   source_ref:x.source_ref,text:x.text,
   status:'PROVISIONAL_PAUSED_NOT_PERMANENTLY_SUPERSEDED',
  })),
  // Source-linked parent-child relationships are meaningful *candidates*,
  // not inferred permanent lifecycle transitions.
  goal_relationship_candidates:[...goalParentCandidates].slice(-12)
   .map(([child_goal_id,parent_goal_id])=>({
    child_goal_id,parent_goal_id,
    relationship:'TEMPORARY_SUBGOAL_CANDIDATE',
    independently_verified:false,source_authority_granted:false,
   })),
  recent_transition_receipts:transitions.slice(-12),
  assistant_goal_alignment_history:assistantAlignmentHistory.slice(-16),
  possible_consecutive_off_goal_reviews:possibleConsecutiveOffGoalReviews,
  trajectory_signal:possibleConsecutiveOffGoalReviews>=2?
    'REPEATED_ASSISTANT_GOAL_DRIFT_CANDIDATES_NOT_VERIFIED':
    'NO_REPEATED_DRIFT_CANDIDATE_NOT_A_CLEAR_PASS',
  verified_zero_goal_drift:false,
  applied_provisional_transitions:applied,
  unresolved_semantic_transitions:ambiguous,
  current_user_message_may_change_working_goal:true,
  permanent_goal_supersession_proven:false,
  user_intent_semantically_verified:false,
  action_execution_authorized:false,
  zero_drift_established:false,
 });
}
