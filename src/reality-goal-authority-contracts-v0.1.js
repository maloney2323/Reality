// Reality foundational goal/authority boundary.
// Typed, source-linked projections of the EXISTING Continuity state.
// A model review is a candidate observation, never a grant of USER authority.
import {createHash} from 'node:crypto';
export const GOAL_AUTHORITY_CONTRACT_VERSION='reality-goal-authority-contracts-v0.1';
const id=(tag,parts)=>tag+':'+createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0,32);
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const bounded=(x,n=450)=>String(x||'').slice(0,n);

/**
 * GoalState: this is a source-linked working projection, not an independently
 * authenticated approval. Unknown lifecycle status stays UNRESOLVED.
 */
export function projectGoalStateContract({lifecycle,goalEvidence,worldId=null}={}){
 const goal=lifecycle?.working_goal;
 if(!nonempty(goal?.goal_evidence_id)||!nonempty(goal.source_ref)||
    !nonempty(goal.text)||goalEvidence?.world_id!==(worldId||null)||
    !Array.isArray(goalEvidence?.user_goal_evidence))
  throw Error('GOAL_STATE_SOURCE_LINKAGE_REQUIRED');
 const current=goalEvidence.user_goal_evidence.find(x=>x.goal_evidence_id===goal.goal_evidence_id);
 if(current&&current.source_ref!==goal.source_ref)
  throw Error('GOAL_STATE_USER_EVIDENCE_MISMATCH');
 // An earlier SOURCE-LINKED user goal can survive in canonical Continuity
 // even after its original utterance falls outside the bounded user cache.
 // This is disclosed; it never becomes an authorization grant.
 return freeze({
  version:GOAL_AUTHORITY_CONTRACT_VERSION,
  goal_id:goal.goal_evidence_id,
  // Parent relation comes only from a source-bound user detour candidate.
  // It remains provisional, never granted task/execution authority.
  parent_id:(lifecycle.goal_relationship_candidates||[]).find(x=>
    x.child_goal_id===goal.goal_evidence_id&&
    x.relationship==='TEMPORARY_SUBGOAL_CANDIDATE')?.parent_goal_id||null,
  parent_relationship_status:'PROVISIONAL_NOT_INDEPENDENTLY_VERIFIED',
  description:bounded(goal.text,700),scope_boundaries:[],
  // A reviewer proposal cannot independently prove ACTIVE/PAUSED/COMPLETED.
  status:'UNRESOLVED',working_status:'PROVISIONAL_ACTIVE_CANDIDATE',
  // Talking about finishing a goal and reporting success are distinct from
  // independently confirmed completion of real business work.
  conversation_exit_not_completion:true,
  user_reported_outcome_unverified:(lifecycle.user_reported_business_completion_candidates||[])
    .some(x=>x.target_goal_evidence_id===goal.goal_evidence_id),
  business_completion_verified:false,
  business_completion_source_receipt_id:null,
  user_stop_request_requires_reconciliation:true,
  world_id:worldId||null,
  provenance:{origin_turn_id:goal.source_ref,evidence_payload_ref:goal.goal_evidence_id,
    source_kind:'USER_CHANNEL_UTTERANCE',
    source_in_current_bounded_goal_cache:Boolean(current),
    lineage:'CANONICAL_CONTINUITY_VERIFICATION_REPLAY'},
  uncertainty_profile:{
   ambiguities:['Goal identity and lifecycle state are not independently reconciled'],
   user_corrections_count:null,
  },
  source_user_authorization_verified:false,
  permits_external_execution:false,
 });
}
/**
 * GoalTransition is always PROVISIONAL unless a separately verified user
 * authority contract exists. Assistant proposals are NEVER authorized.
 */
export function projectGoalTransitionContract({
 currentTurnId,goalState,userDirection='UNCLEAR',sourceUserTurnId=null,
 reviewerEvidenceId=null,
}={}){
 if(!nonempty(currentTurnId)||!nonempty(goalState?.goal_id)||
    !['CONTINUING_USER_OBJECTIVE','USER_AUTHORIZED_PIVOT','USER_AUTHORIZED_DETOUR',
      'USER_RETURNED_TO_OBJECTIVE','UNCLEAR'].includes(userDirection))
  throw Error('GOAL_TRANSITION_EVIDENCE_REQUIRED');
 return freeze({
  version:GOAL_AUTHORITY_CONTRACT_VERSION,
  transition_id:id('goal-transition',[currentTurnId,goalState.goal_id,reviewerEvidenceId]),
  goal_id:goalState.goal_id,from_status:'UNRESOLVED',to_status:'UNRESOLVED',
  authorized_by:'USER_STATEMENT_CANDIDATE',
  authorization_state:'PROVISIONAL',
  context_lifecycle:userDirection==='USER_AUTHORIZED_DETOUR'?'TEMPORARY_DETOUR':
    userDirection==='USER_AUTHORIZED_PIVOT'?'UNRESOLVED':'UNRESOLVED',
  user_direction_interpretation:userDirection,
  duration_limit_minutes:null,turn_id:currentTurnId,
  source_user_turn_id:sourceUserTurnId,
  semantic_review_receipt_id:reviewerEvidenceId,
  grants_goal_mutation:false,grants_external_execution:false,
 });
}
/**
 * AssistantProposal MUST be extracted from the actual first model answer and
 * its source-anchored existing semantic review. There is no text keyword list
 * and no second LLM call. When review is absent we mark UNKNOWN, not aligned.
 */
export function projectAssistantGoalProposal({
 firstAnswer,modelResponseId,currentTurnId,goalState,semanticReview=null,
 reviewerResponseId=null,knownUserGoalSources=[],
}={}){
 if(!nonempty(firstAnswer)||!nonempty(currentTurnId)||!nonempty(goalState?.goal_id))
  throw Error('ASSISTANT_GOAL_PROPOSAL_SOURCE_REQUIRED');
 const review=semanticReview?.goal_trajectory_review;
 const assessed=review?.status==='REVIEWED_GOAL_TRAJECTORY_CANDIDATE'&&
  ['ON_USER_DIRECTED_OBJECTIVE','ASSISTANT_DRIFTED_OFF_OBJECTIVE',
   'INSUFFICIENT_EVIDENCE'].includes(review.answer_alignment);
 const quoted=assessed&&nonempty(review.answer_quote)&&
  firstAnswer.includes(review.answer_quote);
 const detectedShift=Boolean(assessed&&quoted&&
  review.answer_alignment==='ASSISTANT_DRIFTED_OFF_OBJECTIVE');
 const lifecycle=semanticReview?.goal_lifecycle_review;
 const sourceSet=new Set([goalState.provenance.origin_turn_id,
  ...(Array.isArray(knownUserGoalSources)?knownUserGoalSources:[])].filter(nonempty));
 const futureMutationCandidates=(semanticReview?.future_goal_proposals||[])
  .filter(x=>['SHIFT_OBJECTIVE','SCHEDULE_FUTURE_WORK'].includes(x.kind)&&
    nonempty(x.quote)&&firstAnswer.includes(x.quote)&&
    sourceSet.has(x.target_goal_source_ref)&&
    x.authorization_state==='ASSISTANT_PROPOSAL_ONLY')
  .slice(0,8).map(x=>({
    type:x.kind,target_goal_id:goalState.goal_id,
    prior_user_goal_source_ref:x.target_goal_source_ref,
    proposed_change_quote:bounded(x.quote,350),
    rationale:bounded(x.reason,350),
    authorized_by:'ASSISTANT_PROPOSAL',authorization_state:'UNAUTHORIZED',
    no_external_execution_grant:true,
  }));
 const claimedCompletion=Boolean(lifecycle?.status==='SOURCE_LINKED_REVIEWER_CANDIDATE'&&
  lifecycle.relation==='ASSISTANT_PROPOSED_COMPLETION'&&
  lifecycle.speaker==='ASSISTANT'&&nonempty(lifecycle.source_quote)&&
  firstAnswer.includes(lifecycle.source_quote));
 return freeze({
  version:GOAL_AUTHORITY_CONTRACT_VERSION,
  proposal_id:id('assistant-goal-proposal',[currentTurnId,modelResponseId,goalState.goal_id]),
  target_turn_id:currentTurnId,model_response_id:modelResponseId||null,
  proposed_response_excerpt:bounded(firstAnswer,1500),
  target_goal_id:goalState.goal_id,
  intended_state_mutations:{
   resource_mutations:[],
   goal_mutations:[
    ...(detectedShift?[{
      type:'SHIFT_OBJECTIVE',target_goal_id:goalState.goal_id,
      proposed_change_quote:bounded(review.answer_quote,350),
      rationale:bounded(review.reason,350),
      authorized_by:'ASSISTANT_PROPOSAL',authorization_state:'UNAUTHORIZED',
    }]:[]),
    ...futureMutationCandidates,
    ...(claimedCompletion?[{
      type:'CLAIM_BUSINESS_COMPLETION',target_goal_id:goalState.goal_id,
      claimed_user_goal_source_ref:lifecycle.target_goal_source_ref,
      proposed_change_quote:bounded(lifecycle.source_quote,350),
      rationale:bounded(lifecycle.reason,350),
      authorized_by:'ASSISTANT_PROPOSAL',
      authorization_state:'UNAUTHORIZED',
      independent_outcome_receipt:null,
    }]:[]),
   ],
  },
  direction_evaluation:{
   status:assessed?'REVIEWER_CANDIDATE_NOT_INDEPENDENTLY_VERIFIED':'NOT_SEMANTICALLY_ASSESSED',
   aligns_with_active_objective:assessed?
    review.answer_alignment==='ON_USER_DIRECTED_OBJECTIVE':null,
   introduces_new_unauthorized_objective:detectedShift||
     futureMutationCandidates.length>0,
   source_anchored_future_proposal_count:futureMutationCandidates.length,
   claims_unverified_business_completion:claimedCompletion,
   drops_existing_obligation:null,
   reviewer_goal_source_ref:assessed?review.goal_source_ref:null,
   reviewer_response_id:reviewerResponseId,
  },
  goal_mutation_authorized:false,
  action_execution_authorized:false,
 });
}
export function enforceGoalTransitionBoundary({proposal,goalState}={}){
 if(proposal?.version!==GOAL_AUTHORITY_CONTRACT_VERSION||
    !nonempty(goalState?.goal_id)||
    proposal.target_goal_id!==goalState.goal_id||
    proposal.goal_mutation_authorized!==false)
  throw Error('GOAL_BOUNDARY_INVALID_OR_MISMATCHED_PROPOSAL');
 const shift=proposal.intended_state_mutations.goal_mutations;
 if(!Array.isArray(shift))throw Error('GOAL_BOUNDARY_UNTRUSTED_MUTATIONS');
 const candidate=shift.find(x=>['SHIFT_OBJECTIVE','SCHEDULE_FUTURE_WORK'].includes(x.type));
 if(candidate&&(candidate.authorized_by!=='ASSISTANT_PROPOSAL'||
    candidate.authorization_state!=='UNAUTHORIZED'))
  throw Error('GOAL_BOUNDARY_ASSISTANT_ESCALATION_REJECTED');
 const completion=shift.find(x=>x.type==='CLAIM_BUSINESS_COMPLETION');
 if(completion&&(completion.authorized_by!=='ASSISTANT_PROPOSAL'||
    completion.authorization_state!=='UNAUTHORIZED'||
    completion.independent_outcome_receipt!==null))
   throw Error('GOAL_BOUNDARY_COMPLETION_AUTHORITY_ESCALATION_REJECTED');
 const blocked=Boolean(candidate||completion);
 return freeze({
  version:GOAL_AUTHORITY_CONTRACT_VERSION,
  proposal_id:proposal.proposal_id,
  goal_id:goalState.goal_id,
  status:completion?'UNVERIFIED_ASSISTANT_COMPLETION_BLOCKED':
    candidate?.type==='SCHEDULE_FUTURE_WORK'?
      'UNAUTHORIZED_ASSISTANT_FUTURE_WORK_BLOCKED':
    candidate?'UNAUTHORIZED_ASSISTANT_GOAL_SHIFT_BLOCKED':
    proposal.direction_evaluation.status==='NOT_SEMANTICALLY_ASSESSED'?
      'NOT_SEMANTICALLY_ASSESSED':'NO_ASSISTANT_GOAL_MUTATION_ESTABLISHED',
  authorized_goal_mutations:0,external_actions_authorized:false,
  original_goal_preserved:true,
  flagged_quote:candidate?.proposed_change_quote||
    completion?.proposed_change_quote||null,
  prevented_unverified_goal_completion:Boolean(completion),
  source_goal_ref:goalState.provenance.origin_turn_id,
  independent_semantic_correctness_verified:false,
  verified_drift_rate:null,
 });
}
export function pendingGoalCompletionEvidenceResponse({goalState,decision}={}){
 if(!nonempty(goalState?.description)||!nonempty(decision?.flagged_quote)||
    decision?.status!=='UNVERIFIED_ASSISTANT_COMPLETION_BLOCKED')
  throw Error('GOAL_COMPLETION_EVIDENCE_REQUIRED');
 return 'Reality withheld an unverified statement of business completion: "'+
  bounded(decision.flagged_quote,240)+'". The work is not marked completed. '+
  'The recorded goal remains: "'+bounded(goalState.description,220)+'". '+
  'A user report or the end of a conversation does not independently verify a '+
  'customer-facing outcome. Confirm completion against a matching external '+
  'outcome receipt before updating the business status.';
}
export function pendingGoalAuthorizationResponse({goalState}={}){
 if(!nonempty(goalState?.description)||!nonempty(goalState?.provenance?.origin_turn_id))
  throw Error('GOAL_CLARIFICATION_SOURCE_REQUIRED');
 return 'Reality flagged a possible change of direction in its draft and withheld that proposal. '+
  'An earlier user message currently tracked as a possible working objective was: "'+
  bounded(goalState.description,260)+'". No assistant suggestion has changed your goal. '+
  'Would you like to pursue a different objective, or continue with your current request?';
}
