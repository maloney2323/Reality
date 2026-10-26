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
      no_external_execution_grant:true,
    }]:[]),
    ...futureMutationCandidates,
    ...(claimedCompletion?[{
      type:'CLAIM_BUSINESS_COMPLETION',target_goal_id:goalState.goal_id,
      claimed_user_goal_source_ref:lifecycle.target_goal_source_ref,
      proposed_change_quote:bounded(lifecycle.source_quote,350),
      rationale:bounded(lifecycle.reason,350),
      authorized_by:'ASSISTANT_PROPOSAL',
      authorization_state:'UNAUTHORIZED',
      no_external_execution_grant:true,
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
    proposal.goal_mutation_authorized!==false||
    proposal.action_execution_authorized!==false)
  throw Error('GOAL_BOUNDARY_INVALID_OR_MISMATCHED_PROPOSAL');
 const mutations=proposal.intended_state_mutations?.goal_mutations;
 const resourceMutations=proposal.intended_state_mutations?.resource_mutations;
 if(!Array.isArray(mutations)||mutations.length>20||
    !Array.isArray(resourceMutations)||resourceMutations.length!==0)
  throw Error('GOAL_BOUNDARY_UNTRUSTED_MUTATIONS');
 const allowed=new Set(['SHIFT_OBJECTIVE','SCHEDULE_FUTURE_WORK','CLAIM_BUSINESS_COMPLETION']);
 // Evaluate the *entire* proposal atomically. An attacker must not be able
 // to tuck an approved-looking second mutation behind a correctly blocked
 // first entry. Every modeled change is unauthorized until independent
 // USER-sourced intent and separately scoped action grants are verified.
 for(const change of mutations){
  if(!change||!allowed.has(change.type)||
     change.target_goal_id!==goalState.goal_id||
     change.authorized_by!=='ASSISTANT_PROPOSAL'||
     change.authorization_state!=='UNAUTHORIZED'||
     !nonempty(change.proposed_change_quote)||
     change.no_external_execution_grant!==true||
     change.type==='CLAIM_BUSINESS_COMPLETION'&&
       change.independent_outcome_receipt!==null)
   throw Error('GOAL_BOUNDARY_ASSISTANT_MUTATION_ESCALATION_REJECTED');
 }
 const completion=mutations.find(x=>x.type==='CLAIM_BUSINESS_COMPLETION');
 const schedule=mutations.find(x=>x.type==='SCHEDULE_FUTURE_WORK');
 const shift=mutations.find(x=>x.type==='SHIFT_OBJECTIVE');
 const first=completion||schedule||shift||null;
 const blockedQuotes=[...new Set(mutations.map(x=>bounded(x.proposed_change_quote,350)))];
 return freeze({
  version:GOAL_AUTHORITY_CONTRACT_VERSION,
  proposal_id:proposal.proposal_id,
  goal_id:goalState.goal_id,
  status:completion?'UNVERIFIED_ASSISTANT_COMPLETION_BLOCKED':
    schedule?'UNAUTHORIZED_ASSISTANT_FUTURE_WORK_BLOCKED':
    shift?'UNAUTHORIZED_ASSISTANT_GOAL_SHIFT_BLOCKED':
    proposal.direction_evaluation.status==='NOT_SEMANTICALLY_ASSESSED'?
      'NOT_SEMANTICALLY_ASSESSED':'NO_ASSISTANT_GOAL_MUTATION_ESTABLISHED',
  authorized_goal_mutations:0,external_actions_authorized:false,
  original_goal_preserved:true,
  flagged_quote:first?.proposed_change_quote||null,
  blocked_quotes:blockedQuotes,
  blocked_mutation_count:mutations.length,
  blocked_mutation_types:[...new Set(mutations.map(x=>x.type))],
  prevented_unverified_goal_completion:Boolean(completion),
  source_goal_ref:goalState.provenance.origin_turn_id,
  independent_semantic_correctness_verified:false,
  verified_drift_rate:null,
 });
}
/**
 * A second model review cannot "clear" an off-goal rewrite merely by
 * omitting the first issue. It must affirm that the actual revised text
 * serves the current or source-linked user-owned objective.
 *
 * This is a deterministic *admission contract* for the review evidence,
 * not proof the reviewer's semantic judgment was correct. No new judge,
 * no new database and no execution authorization are introduced.
 */
export function adjudicateRevisedGoalAlignment({
  goalState,revisionText,revisionReview=null,
  currentUserSourceRef,knownUserGoalSourceRefs=[],
}={}){
 if(!nonempty(goalState?.goal_id)||!nonempty(goalState?.provenance?.origin_turn_id)||
    typeof revisionText!=='string'||!nonempty(currentUserSourceRef)||
    !Array.isArray(knownUserGoalSourceRefs))
  throw Error('REVISED_GOAL_ALIGNMENT_SCOPE_REQUIRED');
 const review=revisionReview?.goal_trajectory_review;
 const refs=new Set([goalState.provenance.origin_turn_id,currentUserSourceRef,
   ...knownUserGoalSourceRefs].filter(nonempty));
 const sourceValid=nonempty(review?.goal_source_ref)&&refs.has(review.goal_source_ref);
 const reviewed=review?.status==='REVIEWED_GOAL_TRAJECTORY_CANDIDATE';
 const explicitlyAligned=review?.answer_alignment==='ON_USER_DIRECTED_OBJECTIVE';
 const directionKnown=['CONTINUING_USER_OBJECTIVE','USER_AUTHORIZED_DETOUR',
   'USER_AUTHORIZED_PIVOT','USER_RETURNED_TO_OBJECTIVE']
   .includes(review?.user_direction);
 const quoteAbsent=!nonempty(review?.answer_quote);
 const unresolvedChanges=(revisionReview?.future_goal_proposals||[])
   .filter(x=>['SHIFT_OBJECTIVE','SCHEDULE_FUTURE_WORK'].includes(x.kind)&&
     nonempty(x.quote)&&revisionText.includes(x.quote));
 const blockedGoalIssues=(revisionReview?.issues||[])
   .filter(x=>['WRONG_TASK','FORGOTTEN_OBLIGATION'].includes(x.kind));
 const cleared=Boolean(reviewed&&sourceValid&&explicitlyAligned&&
   directionKnown&&quoteAbsent&&!unresolvedChanges.length&&!blockedGoalIssues.length);
 return freeze({
   version:GOAL_AUTHORITY_CONTRACT_VERSION,
   status:cleared?'REVIEWER_GOAL_ALIGNMENT_CANDIDATE_CLEARED_NOT_VERIFIED':
      !reviewed?'POST_REPAIR_GOAL_REVIEW_MISSING':
      !sourceValid?'POST_REPAIR_USER_GOAL_SOURCE_UNANCHORED':
      !explicitlyAligned||!directionKnown||!quoteAbsent?
        'POST_REPAIR_GOAL_ALIGNMENT_UNRESOLVED':
        'POST_REPAIR_ASSISTANT_GOAL_PROPOSAL_REMAINS',
   goal_id:goalState.goal_id,
   controlling_user_goal_source_ref:goalState.provenance.origin_turn_id,
   reviewed_goal_source_ref:sourceValid?review.goal_source_ref:null,
   reviewer_alignment_status:review?.answer_alignment||'NOT_ASSESSED',
   unresolved_goal_proposals:unresolvedChanges.length,
   unresolved_goal_issue_count:blockedGoalIssues.length,
   original_user_goal_changed:false,
   state_mutation_authorized:false,
   external_action_authorized:false,
   independently_verified_correction:false,
   can_admit_revised_answer_as_candidate:cleared,
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
 if(goalState.no_active_goal_explicitly_recorded===true&&
    goalState.goal_state_kind==='EXPLICIT_NO_ACTIVE_USER_GOAL_BOUNDARY')
  return 'Reality withheld an assistant-origin suggestion to change the ongoing objective. '+
    'You have explicitly left no ongoing goal pinned. Your current request can be '+
    'handled without reviving a previous goal; any newly pinned objective must '+
    'come from your explicit user direction. No external action was taken.';
 return 'Reality flagged a possible change of direction in its draft and withheld that proposal. '+
  'An earlier user message currently tracked as a possible working objective was: "'+
  bounded(goalState.description,260)+'". No assistant suggestion has changed your goal. '+
  'Would you like to pursue a different objective, or continue with your current request?';
}


/**
 * Explicit authenticated PAUSE/ABANDON/REPORT_COMPLETE is not an invitation
 * to resurrect a reviewer-derived historical objective. This is a boundary
 * SENTINEL, not a real GoalState and NOT an assistant-created user goal.
 *
 * A new ordinary user request still governs the immediate answer; a new
 * pinned ongoing objective requires the existing authenticated user command.
 */
export function projectExplicitNoActiveGoalBoundary({
 authoritativeUserGoals,continuityRootId,worldId=null,
}={}){
 if(authoritativeUserGoals?.version!=='reality-authoritative-user-goal-ledger-v0.1'||
    !nonempty(continuityRootId)||
    authoritativeUserGoals.continuity_root_id!==continuityRootId||
    authoritativeUserGoals.world_id!==(worldId||null)||
    !Number.isInteger(authoritativeUserGoals.transition_count)||
    authoritativeUserGoals.transition_count<1||
    authoritativeUserGoals.active_goal_id!==null||
    authoritativeUserGoals.active_goal!==null||
    authoritativeUserGoals.assistant_can_mutate_goals!==false||
    authoritativeUserGoals.semantic_reviewer_can_mutate_goals!==false||
    authoritativeUserGoals.external_execution_authorized!==false)
   throw Error('NO_ACTIVE_GOAL_AUTHENTICATED_STATE_REQUIRED');
 const prior=authoritativeUserGoals.recent_transition_receipts;
 const last=Array.isArray(prior)?prior.at(-1):null;
 if(!['PAUSE','ABANDON','REPORT_COMPLETE'].includes(last?.operation)||
    !nonempty(last.event_id)||!nonempty(last.source_ref)||
    !nonempty(last.goal_id)||last.confirmed_by_user!==true||
    last.principal_id!==authoritativeUserGoals.principal_id)
   throw Error('NO_ACTIVE_GOAL_USER_TRANSITION_RECEIPT_REQUIRED');
 return freeze({
   version:GOAL_AUTHORITY_CONTRACT_VERSION,
   goal_id:id('no-active-user-goal-boundary',[
      continuityRootId,worldId,authoritativeUserGoals.principal_id,
      last.event_id]),
   // This is a contract for a NEGATIVE active-goal state, not a new goal.
   goal_state_kind:'EXPLICIT_NO_ACTIVE_USER_GOAL_BOUNDARY',
   represents_user_goal:false,
   no_active_goal_explicitly_recorded:true,
   parent_id:null,
   description:'No active pinned user objective. Follow the current user request; earlier goals are recoverable history, not current instructions.',
   scope_boundaries:[
     'DO_NOT_REACTIVATE_AN_EARLIER_OBJECTIVE_WITHOUT_USER_DIRECTION',
     'ASSISTANT_PROPOSALS_CANNOT_CREATE_USER_GOAL_AUTHORITY',
   ],
   status:last.operation==='PAUSE'?'PAUSED':
     last.operation==='ABANDON'?'ABANDONED':'UNRESOLVED',
   working_status:'AUTHENTICATED_NO_ACTIVE_GOAL',
   world_id:worldId||null,
   provenance:{
     origin_turn_id:last.source_ref,
     evidence_payload_ref:last.event_id,
     source_kind:'AUTHENTICATED_USER_GOAL_LEDGER_NO_ACTIVE_GOAL',
     lineage:'SOURCE_LINKED_CONTINUITY_READBACK',
   },
   authority_transition_operation:last.operation,
   paused_or_closed_goal_id:last.goal_id,
   source_user_authorization_verified:true,
   business_completion_independently_verified:false,
   permits_external_execution:false,
   uncertainty_profile:{
     ambiguities:['No active pinned goal; current user direction is authoritative for conversational focus.'],
     user_corrections_count:null,
   },
 });
}
