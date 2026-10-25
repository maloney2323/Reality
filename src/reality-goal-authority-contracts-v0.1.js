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
  goal_id:goal.goal_evidence_id,parent_id:null,
  description:bounded(goal.text,700),scope_boundaries:[],
  // A reviewer proposal cannot independently prove ACTIVE/PAUSED/COMPLETED.
  status:'UNRESOLVED',working_status:'PROVISIONAL_ACTIVE_CANDIDATE',
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
 reviewerResponseId=null,
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
 return freeze({
  version:GOAL_AUTHORITY_CONTRACT_VERSION,
  proposal_id:id('assistant-goal-proposal',[currentTurnId,modelResponseId,goalState.goal_id]),
  target_turn_id:currentTurnId,model_response_id:modelResponseId||null,
  proposed_response_excerpt:bounded(firstAnswer,1500),
  target_goal_id:goalState.goal_id,
  intended_state_mutations:{
   resource_mutations:[],
   goal_mutations:detectedShift?[{
    type:'SHIFT_OBJECTIVE',target_goal_id:goalState.goal_id,
    proposed_change_quote:bounded(review.answer_quote,350),
    rationale:bounded(review.reason,350),
    authorized_by:'ASSISTANT_PROPOSAL',
    authorization_state:'UNAUTHORIZED',
   }]:[],
  },
  direction_evaluation:{
   status:assessed?'REVIEWER_CANDIDATE_NOT_INDEPENDENTLY_VERIFIED':'NOT_SEMANTICALLY_ASSESSED',
   aligns_with_active_objective:assessed?
    review.answer_alignment==='ON_USER_DIRECTED_OBJECTIVE':null,
   introduces_new_unauthorized_objective:detectedShift,
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
 const candidate=shift.find(x=>x.type==='SHIFT_OBJECTIVE');
 if(candidate&&(candidate.authorized_by!=='ASSISTANT_PROPOSAL'||
    candidate.authorization_state!=='UNAUTHORIZED'))
  throw Error('GOAL_BOUNDARY_ASSISTANT_ESCALATION_REJECTED');
 const blocked=Boolean(candidate);
 return freeze({
  version:GOAL_AUTHORITY_CONTRACT_VERSION,
  proposal_id:proposal.proposal_id,
  goal_id:goalState.goal_id,
  status:blocked?'UNAUTHORIZED_ASSISTANT_GOAL_SHIFT_BLOCKED':
    proposal.direction_evaluation.status==='NOT_SEMANTICALLY_ASSESSED'?
      'NOT_SEMANTICALLY_ASSESSED':'NO_ASSISTANT_GOAL_MUTATION_ESTABLISHED',
  authorized_goal_mutations:0,external_actions_authorized:false,
  original_goal_preserved:true,
  flagged_quote:candidate?.proposed_change_quote||null,
  source_goal_ref:goalState.provenance.origin_turn_id,
  independent_semantic_correctness_verified:false,
  verified_drift_rate:null,
 });
}
export function pendingGoalAuthorizationResponse({goalState}={}){
 if(!nonempty(goalState?.description)||!nonempty(goalState?.provenance?.origin_turn_id))
  throw Error('GOAL_CLARIFICATION_SOURCE_REQUIRED');
 return 'Reality flagged a possible change of direction in its draft and withheld that proposal. '+
  'An earlier user message currently tracked as a possible working objective was: "'+
  bounded(goalState.description,260)+'". No assistant suggestion has changed your goal. '+
  'Would you like to pursue a different objective, or continue with your current request?';
}
