// Typed goal governance IN THE EXISTING Reality Continuity / Integrity runtime.
// Pure, deterministic projection from user-source-bound frame and an UNTRUSTED
// semantic review of the model answer. Not a new database or second LLM judge.
// A model or judge may suggest a change, NEVER authorize a state mutation.
import {createHash} from 'node:crypto';
export const GOAL_GOVERNANCE_CONTRACT_VERSION='reality-goal-governance-contract-v0.1';
const valid=x=>typeof x==='string'&&x.trim().length>0;
const digest=x=>'sha256:'+createHash('sha256').update(JSON.stringify(x)).digest('hex');
const freeze=x=>{if(x&&typeof x==='object'){for(const y of Object.values(x))freeze(y);Object.freeze(x)}return x};
const required=(x,msg)=>{if(!x)throw Error(msg)};
/**
 * "Verified user said X" != "X was semantically an authorization".
 * Authorized business-goal transitions need an independently attested,
 * source-linked USER directive plus its particular goal/mutation scope.
 * Reviewers and assistant self-reports are never valid attestors.
 */
export function createGoalTransitionContract({
 goalId,scopeRootId,worldId=null,
 fromStatus='UNRESOLVED',toStatus='ACTIVE',
 proposedBy='ASSISTANT_PROPOSAL',userSourceRef=null,
 semanticAuthorizationEvidence=null,sourceFrameHash,
 contextLifecycle='UNRESOLVED',durationLimitMinutes=null,
 observedAt,
}={}){
 required(valid(goalId)&&valid(scopeRootId)&&valid(sourceFrameHash),
  'GOAL_TRANSITION_SCOPE_AND_FRAME_REQUIRED');
 required(Number.isFinite(Date.parse(observedAt)),'GOAL_TRANSITION_TIME_REQUIRED');
 required(['ACTIVE','PAUSED','COMPLETED','ABANDONED','UNRESOLVED'].includes(fromStatus)&&
  ['ACTIVE','PAUSED','COMPLETED','ABANDONED','UNRESOLVED'].includes(toStatus),
  'GOAL_TRANSITION_STATE_INVALID');
 required(['USER','ASSISTANT_PROPOSAL'].includes(proposedBy),
  'GOAL_TRANSITION_SOURCE_INVALID');
 required(['PERMANENT','TEMPORARY_DETOUR','UNRESOLVED'].includes(contextLifecycle),
  'GOAL_TRANSITION_LIFECYCLE_INVALID');
 required(durationLimitMinutes===null||
  (Number.isInteger(durationLimitMinutes)&&durationLimitMinutes>0),
  'GOAL_TRANSITION_DURATION_INVALID');
 // This module has no authenticated authorization verifier. A passed-in
 // issuer string or boolean is forgeable. NEVER grant goal transitions here,
 // even when user-source identity is known. A future verified adapter must
 // implement separate receipt-bound and anti-replay authorization.
 const independentlyAuthorized=false;
 const base={
  version:GOAL_GOVERNANCE_CONTRACT_VERSION,
  goal_id:goalId,scope_root_id:scopeRootId,world_id:worldId,
  from_status:fromStatus,to_status:toStatus,
  proposed_by:proposedBy,authorized_by:proposedBy,
  user_source_ref:valid(userSourceRef)?userSourceRef:null,
  source_frame_hash:sourceFrameHash,
  authorization_state:independentlyAuthorized?'GRANTED':
   proposedBy==='ASSISTANT_PROPOSAL'?'UNAUTHORIZED':'PROVISIONAL',
  context_lifecycle:contextLifecycle,duration_limit_minutes:durationLimitMinutes,
  recorded_at:new Date(observedAt).toISOString(),
  external_execution_authorized:false,
  independently_verified_user_intent:independentlyAuthorized,
  // Even a GRANTED *goal change* does not grant connector execution.
  connector_action_authority:false,
 };
 return freeze({...base,transition_id:digest(base)});
}
export function buildAssistantGoalGovernance({
 canonicalFrame,modelAnswer,finalAnswer=modelAnswer,modelResponseId=null,
 semanticReview=null,observedAt,
}={}){
 required(canonicalFrame?.frame_hash&&valid(canonicalFrame.continuity_root_id),
  'GOAL_GOVERNANCE_CANONICAL_FRAME_REQUIRED');
 required(typeof modelAnswer==='string'&&valid(modelAnswer),
  'GOAL_GOVERNANCE_MODEL_PROPOSAL_REQUIRED');
 required(typeof finalAnswer==='string','GOAL_GOVERNANCE_RELEASE_REQUIRED');
 const state=canonicalFrame.user_goal_continuity_state;
 const lifecycle=canonicalFrame.user_goal_lifecycle_projection;
 const original=state?.user_goal_evidence?.find(x=>
  x.goal_evidence_id===state.original_user_goal_evidence_id);
 const working=lifecycle?.working_goal||null;
 const controlling=canonicalFrame.controlling_user_goal_state_contract||null;
 const confirmed=canonicalFrame.authoritative_user_goals?.active_goal||null;
 const goalGraph=canonicalFrame.authoritative_goal_relationship_graph||null;
 if(goalGraph&&(
    goalGraph.active_goal_id!==(confirmed?.goal_id||null)||
    goalGraph.scope_root_id!==canonicalFrame.continuity_root_id||
    goalGraph.world_id!==canonicalFrame.world_id||
    goalGraph.assistant_proposal_may_mutate_graph!==false||
    goalGraph.action_execution_authorized!==false))
   throw Error('GOAL_GOVERNANCE_AUTHENTICATED_GOAL_GRAPH_MISMATCH');
 const noActiveGoal=Boolean(canonicalFrame.authoritative_user_goals?.transition_count>0&&
   canonicalFrame.authoritative_user_goals?.active_goal_id===null);
 // A user PAUSE/ABANDON command is also authoritative. In particular a
 // reviewer-created provisional focus can never take over on a NULL active goal.
 if(noActiveGoal&&(!controlling||
    controlling.goal_state_kind!=='EXPLICIT_NO_ACTIVE_USER_GOAL_BOUNDARY'||
    controlling.no_active_goal_explicitly_recorded!==true||
    controlling.represents_user_goal!==false||
    controlling.source_user_authorization_verified!==true||
    controlling.permits_external_execution!==false))
  throw Error('GOAL_GOVERNANCE_EXPLICIT_NO_ACTIVE_GOAL_OVERRIDDEN');
 // An authenticated user-owned goal must be the SAME governing goal for
 // cognition, comparison, and post-generation integrity. Never fall back to
 // a reviewer-derived working goal after a confirmed command exists.
 if(confirmed&&(!controlling||
    controlling.goal_id!==confirmed.goal_id||
    controlling.provenance?.origin_turn_id!==confirmed.source_user_message_ref||
    controlling.provenance?.evidence_payload_ref!==confirmed.last_transition_receipt_id||
    controlling.source_user_authorization_verified!==true||
    controlling.permits_external_execution!==false))
  throw Error('GOAL_GOVERNANCE_CONTROLLING_USER_GOAL_MISMATCH');
 if(controlling&&(!valid(controlling.goal_id)||
    controlling.world_id!==canonicalFrame.world_id||
    controlling.permits_external_execution!==false))
  throw Error('GOAL_GOVERNANCE_CONTROLLING_STATE_INVALID');
 const current=state?.user_goal_evidence?.find(x=>
  x.goal_evidence_id===state.current_user_evidence_id);
 const review=semanticReview?.goal_trajectory_review||null;
 const reviewerStatus=review?.status==='REVIEWED_GOAL_TRAJECTORY_CANDIDATE';
 const anchoredSource=reviewerStatus&&Boolean(
  state?.user_goal_evidence?.some(x=>x.source_ref===review.goal_source_ref)||
  (confirmed&&review.goal_source_ref===confirmed.source_user_message_ref));
 const exactQuote=String(review?.answer_quote||'');
 const anchoredQuote=valid(exactQuote)&&modelAnswer.includes(exactQuote);
 // Authorizing a new USER direction does NOT authorize the assistant
 // to introduce an additional, unrelated direction. Review alignment against
 // the ACTUAL user-authorized pivot/detour, not just the original goal.
 // A legitimate pivot itself produces no finding when the answer stays on it.
 const assistantShiftCandidate=Boolean(
  reviewerStatus&&anchoredSource&&anchoredQuote&&
  review.answer_alignment==='ASSISTANT_DRIFTED_OFF_OBJECTIVE');
 const goalId=controlling?.goal_id||working?.goal_evidence_id||original?.goal_evidence_id||null;
 // Enforce the SAME existing reviewer-extracted future-work and strategy
 // candidates, in addition to the immediate objective shift. No new judge.
 const validUserSources=new Set([
  ...(state?.user_goal_evidence||[]).map(x=>x.source_ref),
  confirmed?.source_user_message_ref,
 ].filter(valid));
 const futureProposals=(semanticReview?.future_goal_proposals||[])
  .filter(x=>x&&
   ['SHIFT_OBJECTIVE','SCHEDULE_FUTURE_WORK'].includes(x.kind)&&
   x.authorization_state==='ASSISTANT_PROPOSAL_ONLY'&&
   x.goal_mutation_requested===true&&
   ['ASSISTANT_DIRECTED_OBJECTIVE_SHIFT',
    'ASSISTANT_DIRECTED_FUTURE_COMMITMENT'].includes(x.direction_effect)&&
   valid(x.quote)&&modelAnswer.includes(x.quote)&&
   valid(x.target_goal_source_ref)&&validUserSources.has(x.target_goal_source_ref)&&
   valid(x.reason))
  .slice(0,8).map(x=>({
   type:x.kind,target_goal_id:goalId,
   target_user_goal_source_ref:x.target_goal_source_ref,
   rationale:String(x.reason).slice(0,350),
   proposal_quote:String(x.quote).slice(0,350),
   authorized_by:'ASSISTANT_PROPOSAL',
   authorization_state:'UNAUTHORIZED',
  }));
 const permittedAdvice=(semanticReview?.future_goal_proposals||[])
  .filter(x=>x&&['OPTIONAL_SUGGESTION_ONLY','USER_REQUESTED_PROPOSAL'].includes(
    x.direction_effect)&&x.authorization_state==='NO_USER_GOAL_MUTATION'&&
    x.goal_mutation_requested===false&&valid(x.quote)&&modelAnswer.includes(x.quote)&&
    valid(x.target_goal_source_ref)&&validUserSources.has(x.target_goal_source_ref))
  .slice(0,8).map(x=>({
   quote:String(x.quote).slice(0,350),
   user_goal_source_ref:x.target_goal_source_ref,
   direction_effect:x.direction_effect,
   user_goal_transition_authorized:false,
   external_action_authorized:false,
  }));
 const anyAssistantGoalChange=assistantShiftCandidate||futureProposals.length>0;
 const transition=anyAssistantGoalChange&&goalId?
  createGoalTransitionContract({
   goalId,scopeRootId:canonicalFrame.continuity_root_id,
   worldId:canonicalFrame.world_id,
   fromStatus:'UNRESOLVED',toStatus:'UNRESOLVED',
   proposedBy:'ASSISTANT_PROPOSAL',
   sourceFrameHash:canonicalFrame.frame_hash,
   contextLifecycle:'UNRESOLVED',observedAt,
  }):null;
 const proposedMutation=assistantShiftCandidate&&goalId?{
  type:'SHIFT_OBJECTIVE',target_goal_id:goalId,
  rationale:String(review.reason||'').slice(0,350),
  proposal_quote:exactQuote.slice(0,350),
  authorized_by:'ASSISTANT_PROPOSAL',
  authorization_state:'UNAUTHORIZED',
 }:null;
 const proposed={
  version:GOAL_GOVERNANCE_CONTRACT_VERSION,
  proposal_id:digest([canonicalFrame.frame_hash,modelResponseId||null,modelAnswer]),
  target_turn_id:canonicalFrame.current_user_packet_id,
  canonical_frame_hash:canonicalFrame.frame_hash,
  user_goal_relationship_graph:{
    authority:goalGraph?.authority_origin||'NO_AUTHENTICATED_GOAL_GRAPH',
    active_goal_id:goalGraph?.active_goal_id||null,
    source_verified_active_parent_goal_ids:goalGraph?.active_ancestor_goal_ids||[],
    paused_or_dormant_goal_ids:(goalGraph?.paused_or_dormant_goals||[]).map(x=>x.goal_id),
    client_may_mutate_graph:false,semantic_model_may_authorize_mutation:false,
  },
  proposed_response_text:modelAnswer.slice(0,5200),
  optional_advice_not_goal_mutations:permittedAdvice,
  intended_state_mutations:{
   resource_mutations:[],
   goal_mutations:[...(proposedMutation?[proposedMutation]:[]),...futureProposals],
  },
  direction_evaluation:{
   aligns_with_active_objective:reviewerStatus?
    review.answer_alignment==='ON_USER_DIRECTED_OBJECTIVE':null,
   introduces_new_unauthorized_objective:anyAssistantGoalChange,
   source_anchored_future_proposal_count:futureProposals.length,
   drops_existing_obligation:null, // Not inferable from goal reviewer alone.
   reviewer_is_ground_truth:false,
  },
 };
 const blockedQuotes=[...new Set([
  ...(proposedMutation?[proposedMutation.proposal_quote]:[]),
  ...futureProposals.map(x=>x.proposal_quote),
 ])];
 const persistedBlockedQuotes=blockedQuotes.filter(x=>finalAnswer.includes(x));
 const disposition=anyAssistantGoalChange?
  (persistedBlockedQuotes.length?'ASSISTANT_GOAL_PROPOSAL_QUOTE_REMAINS_IN_RELEASE':
   'ASSISTANT_GOAL_PROPOSAL_QUOTES_REMOVED_FROM_RELEASE'):
  reviewerStatus?'NO_UNAUTHORIZED_GOAL_SHIFT_IDENTIFIED_BY_REVIEWER':
   'GOAL_SHIFT_NOT_ASSESSED';
 const base={
  version:GOAL_GOVERNANCE_CONTRACT_VERSION,
  source_frame_hash:canonicalFrame.frame_hash,
  continuity_root_id:canonicalFrame.continuity_root_id,
  world_id:canonicalFrame.world_id,
  working_goal:{
   goal_id:goalId,
   user_source_ref:controlling?.provenance?.origin_turn_id||
     working?.source_ref||original?.source_ref||null,
   status:confirmed?'AUTHENTICATED_USER_CONFIRMED_ACTIVE_GOAL':
     noActiveGoal?'AUTHENTICATED_USER_CONFIRMED_NO_ACTIVE_GOAL':
     'PROVISIONAL_UNLESS_INDEPENDENTLY_RECONCILED',
   no_active_goal_explicitly_recorded:noActiveGoal,
   original_user_goal_evidence_id:original?.goal_evidence_id||null,
   authoritative_goal_transition_receipt_id:confirmed?.last_transition_receipt_id||null,
  },
  current_user_goal_source_ref:current?.source_ref||null,
  assistant_proposal:proposed,
  goal_transition_proposal:transition,
  authorization_state:transition?.authorization_state||'NO_MUTATION_AUTHORITY_REQUESTED',
  state_mutation_allowed:false, // Invariants cannot be revised by an LLM review.
  external_execution_authorized:false,
  verification_disposition:disposition,
  goal_alignment_independently_verified:false,
  zero_alert_means_zero_drift:false,
  reviewer_coverage_status:reviewerStatus?'SOURCE_LINKED_REVIEW_CANDIDATE':
   'SEMANTIC_GOAL_REVIEW_MISSING',
 };
 return freeze({...base,contract_hash:digest(base)});
}
export function verifyGoalGovernanceBeforeStateMutation({contract,canonicalFrame}={}){
 required(contract?.version===GOAL_GOVERNANCE_CONTRACT_VERSION&&
  contract.contract_hash&&canonicalFrame?.frame_hash===contract.source_frame_hash&&
  canonicalFrame?.continuity_root_id===contract.continuity_root_id&&
  canonicalFrame?.world_id===contract.world_id,
  'GOAL_GOVERNANCE_FRAME_SCOPE_MISMATCH');
 const {contract_hash,...unsigned}=contract;
 required(digest(unsigned)===contract_hash,'GOAL_GOVERNANCE_CONTRACT_HASH_MISMATCH');
 required(contract.assistant_proposal?.canonical_frame_hash===canonicalFrame.frame_hash,
  'GOAL_GOVERNANCE_PROPOSAL_FRAME_MISMATCH');
 const projection=contract.assistant_proposal?.user_goal_relationship_graph;
 const actualGraph=canonicalFrame.authoritative_goal_relationship_graph;
 required(Boolean(projection)&&
  projection.active_goal_id===(actualGraph?.active_goal_id||null)&&
  JSON.stringify(projection.source_verified_active_parent_goal_ids)===
   JSON.stringify(actualGraph?.active_ancestor_goal_ids||[])&&
  JSON.stringify(projection.paused_or_dormant_goal_ids)===
   JSON.stringify((actualGraph?.paused_or_dormant_goals||[]).map(x=>x.goal_id))&&
  projection.client_may_mutate_graph===false&&
  projection.semantic_model_may_authorize_mutation===false,
  'GOAL_GOVERNANCE_ASSISTANT_GRAPH_MUTATION_OR_SCOPE_MISMATCH');
 const resourceChanges=contract.assistant_proposal?.intended_state_mutations?.resource_mutations;
 const goalChanges=contract.assistant_proposal?.intended_state_mutations?.goal_mutations;
 required(Array.isArray(resourceChanges)&&resourceChanges.length===0,
  'GOAL_GOVERNANCE_UNAUTHORIZED_RESOURCE_MUTATION');
 required(Array.isArray(goalChanges)&&goalChanges.length<=20,
  'GOAL_GOVERNANCE_UNTRUSTED_GOAL_MUTATIONS');
 // Do not validate just the first candidate: every goal mutation must match
 // the immutable current goal and remain an untrusted assistant proposal.
 for(const mutation of goalChanges){
  required(['SHIFT_OBJECTIVE','SCHEDULE_FUTURE_WORK'].includes(mutation?.type)&&
   mutation.target_goal_id===contract.working_goal?.goal_id&&
   mutation.authorized_by==='ASSISTANT_PROPOSAL'&&
   mutation.authorization_state==='UNAUTHORIZED'&&
   typeof mutation.proposal_quote==='string'&&mutation.proposal_quote.length>0&&
   (!mutation.target_user_goal_source_ref||
     canonicalFrame.user_goal_continuity_state?.user_goal_evidence?.some(x=>
      x.source_ref===mutation.target_user_goal_source_ref)||
     canonicalFrame.authoritative_user_goals?.active_goal?.source_user_message_ref===
      mutation.target_user_goal_source_ref),
   'GOAL_GOVERNANCE_UNAUTHORIZED_GOAL_MUTATION');
 }
 required(contract.assistant_proposal.direction_evaluation?.introduces_new_unauthorized_objective===
  (goalChanges.length>0),'GOAL_GOVERNANCE_UNTRUSTED_DIRECTION_EVALUATION');
 // A model proposal NEVER advances, pauses, abandons, or supersedes goals.
 // This governs **state mutation and execution**, not ordinary discussion.
 if(contract.state_mutation_allowed!==false||
   contract.external_execution_authorized!==false||
   contract.goal_transition_proposal?.authorization_state==='GRANTED')
  throw Error('GOAL_GOVERNANCE_UNAUTHORIZED_PROMOTION');
 return freeze({
  status:contract.goal_transition_proposal?
   'ASSISTANT_GOAL_MUTATION_BLOCKED':
   'NO_GOAL_MUTATION_PROPOSAL',
  state_mutation_executed:false,
  execution_authorized:false,
  provenance_verification:'BOUND_TO_CANONICAL_FRAME_NOT_INDEPENDENT_INTENT_PROOF',
  source_frame_hash:canonicalFrame.frame_hash,
  contract_hash:contract.contract_hash,
 });
}


/**
 * Final-answer release gate: a blocked assistant-origin direction must not
 * survive in published *text*, even though it cannot mutate the goal ledger.
 * Reuse the SAME goal governance contract and reviewer already in Reality.
 * This proves an observed, source-anchored candidate was contained; NOT that
 * the probabilistic semantic reviewer detected every instance of drift.
 */
export function adjudicateFinalAssistantGoalRelease({
 canonicalFrame,originalAnswer,finalAnswer,
 originalReview=null,postRevisionReview=null,
 postRevisionReviewedAnswer=null,observedAt,
}={}){
 required(canonicalFrame?.frame_hash&&valid(originalAnswer)&&
  typeof finalAnswer==='string'&&valid(finalAnswer)&&
  Number.isFinite(Date.parse(observedAt)),
  'FINAL_GOAL_RELEASE_EVIDENCE_REQUIRED');
 const originalContract=buildAssistantGoalGovernance({
  canonicalFrame,modelAnswer:originalAnswer,finalAnswer,
  semanticReview:originalReview,observedAt,
 });
 verifyGoalGovernanceBeforeStateMutation({
  contract:originalContract,canonicalFrame,
 });
 const originalMutations=originalContract.assistant_proposal.intended_state_mutations.goal_mutations;
 const originalWrongTaskQuotes=(originalReview?.issues||[])
  .filter(x=>x.kind==='WRONG_TASK'&&valid(x.quote)&&originalAnswer.includes(x.quote))
  .map(x=>x.quote);
 const originalBlockedQuotes=[...new Set([
  ...originalMutations.map(x=>x.proposal_quote),
  ...originalWrongTaskQuotes,
 ])].filter(valid);
 const stillPresent=originalBlockedQuotes.filter(x=>finalAnswer.includes(x));
 const textChanged=finalAnswer!==originalAnswer;
 // A post-revision review is admissible ONLY for the exact actual final
 // text it reviewed; no "good" review for a different answer can clear it.
 const revisionReviewBound=textChanged&&postRevisionReview &&
  postRevisionReviewedAnswer===finalAnswer &&
  postRevisionReview.goal_trajectory_review?.status==='REVIEWED_GOAL_TRAJECTORY_CANDIDATE';
 const lastReview=textChanged?
  (revisionReviewBound?postRevisionReview:null):originalReview;
 const lastContract=buildAssistantGoalGovernance({
  canonicalFrame,modelAnswer:finalAnswer,finalAnswer,
  semanticReview:lastReview,observedAt,
 });
 verifyGoalGovernanceBeforeStateMutation({
  contract:lastContract,canonicalFrame,
 });
 const finalMutations=lastContract.assistant_proposal.intended_state_mutations.goal_mutations;
 const lastWrongTaskQuotes=(lastReview?.issues||[])
  .filter(x=>x.kind==='WRONG_TASK'&&valid(x.quote)&&finalAnswer.includes(x.quote))
  .map(x=>x.quote);
 const finalReviewOffGoal=lastReview?.goal_trajectory_review?.status===
   'REVIEWED_GOAL_TRAJECTORY_CANDIDATE'&&
  lastReview.goal_trajectory_review.answer_alignment==='ASSISTANT_DRIFTED_OFF_OBJECTIVE';
 const finalHasDirectionRisk=finalMutations.length>0||
  lastWrongTaskQuotes.length>0||finalReviewOffGoal;
 const finalGoalReview=lastReview?.goal_trajectory_review;
 const finalGoalAssessed=finalGoalReview?.status===
    'REVIEWED_GOAL_TRAJECTORY_CANDIDATE'&&
   ['ON_USER_DIRECTED_OBJECTIVE','ASSISTANT_DRIFTED_OFF_OBJECTIVE',
    'INSUFFICIENT_EVIDENCE'].includes(finalGoalReview.answer_alignment);
 const finalGoalSourceAnchored=finalGoalAssessed&&
   valid(finalGoalReview.goal_source_ref)&&
   Boolean(canonicalFrame.user_goal_continuity_state?.user_goal_evidence?.some(x=>
    x.source_ref===finalGoalReview.goal_source_ref)||
    canonicalFrame.authoritative_user_goals?.active_goal?.source_user_message_ref===
     finalGoalReview.goal_source_ref||
    canonicalFrame.user_goal_lifecycle_projection?.working_goal?.source_ref===
     finalGoalReview.goal_source_ref||
    canonicalFrame.user_goal_lifecycle_projection?.preserved_original_goal?.source_ref===
     finalGoalReview.goal_source_ref||
    (canonicalFrame.user_goal_lifecycle_projection?.paused_goal_candidates||[])
      .some(x=>x.source_ref===finalGoalReview.goal_source_ref)||
    (canonicalFrame.user_goal_lifecycle_projection?.dormant_goal_candidates||[])
      .some(x=>x.source_ref===finalGoalReview.goal_source_ref));
 const originalRisk=originalBlockedQuotes.length>0;
 // Detection and adjudication are separate: the absence of a review is
 // a COVERAGE GAP, not affirmative proof of an unauthorized objective. Do
 // not destroy a useful answer just because the reviewer did not run.
 // However a KNOWN blocked goal quote or a failed correction NEVER releases.
 const verdict=stillPresent.length?
   'BLOCKED_ORIGINAL_OFF_GOAL_TEXT_SURVIVED':
   finalHasDirectionRisk?
   'BLOCKED_NEW_OR_UNRESOLVED_FINAL_DIRECTION':
   originalRisk&&(!textChanged||!revisionReviewBound)?
   'BLOCKED_GOAL_REVISION_NOT_REVIEWED':
   originalRisk&&(lastReview?.addresses_current_request!==true||
     lastReview?.issues?.length>0||
     lastReview?.unassessed_claims?.length>0||
     !finalGoalAssessed||!finalGoalSourceAnchored||
     finalGoalReview.answer_alignment!=='ON_USER_DIRECTED_OBJECTIVE')?
   'BLOCKED_GOAL_REVISION_NOT_CLEARED':
   // A review explicitly concluding the answer misses the CURRENT task
   // must not be promoted into the next turn's goal trajectory.
   lastReview?.addresses_current_request===false?
   'BLOCKED_FINAL_ANSWER_MISSED_CURRENT_OBJECTIVE':
   !finalGoalAssessed||!finalGoalSourceAnchored?
   'UNASSESSED_DIRECTION_NO_DETECTED_MUTATION_NOT_CERTIFIED':
   finalGoalReview.answer_alignment==='INSUFFICIENT_EVIDENCE'?
   'UNRESOLVED_DIRECTION_NO_DETECTED_MUTATION_NOT_CERTIFIED':
   textChanged&&!revisionReviewBound?
   'CHANGED_FINAL_TEXT_WITHOUT_EXACT_GOAL_REVIEW_NOT_CERTIFIED':
   'NO_KNOWN_UNAUTHORIZED_DIRECTION_IN_RELEASE';
 const accepted=!verdict.startsWith('BLOCKED_');
 const contract={
  version:GOAL_GOVERNANCE_CONTRACT_VERSION,
  gate_kind:'FINAL_ASSISTANT_DIRECTION_PUBLICATION',
  canonical_frame_hash:canonicalFrame.frame_hash,
  continuity_root_id:canonicalFrame.continuity_root_id,
  world_id:canonicalFrame.world_id,
  controlling_user_goal_source_ref:canonicalFrame.controlling_user_goal_state_contract?.provenance?.origin_turn_id||null,
  current_user_packet_id:canonicalFrame.current_user_packet_id,
  original_answer_hash:digest(originalAnswer),
  candidate_final_answer_hash:digest(finalAnswer),
  original_governance_contract_hash:originalContract.contract_hash,
  final_governance_contract_hash:lastContract.contract_hash,
  original_blocked_quotes:originalBlockedQuotes.map(x=>x.slice(0,350)),
  original_blocked_quotes_still_in_release:stillPresent.map(x=>x.slice(0,350)),
  final_goal_mutation_count:finalMutations.length,
  final_user_goal_source_anchored:Boolean(finalGoalSourceAnchored),
  final_goal_semantic_assessment_completed:Boolean(finalGoalAssessed),
  final_wrong_task_quotes:lastWrongTaskQuotes.map(x=>x.slice(0,350)),
  changed_after_initial_review:textChanged,
  second_semantic_review_bound_to_exact_final_text:Boolean(revisionReviewBound),
  final_goal_review_assessment:lastReview?.goal_trajectory_review?.answer_alignment||'NOT_ASSESSED',
  final_semantic_coverage:lastReview?.status||'NOT_ASSESSED',
  status:verdict,
  candidate_answer_release_allowed:accepted,
  final_goal_direction_assessment_complete:finalGoalAssessed&&finalGoalSourceAnchored&&
   (!textChanged||Boolean(revisionReviewBound)),
  claim_all_drift_was_detected:false,
  semantic_reviewer_independently_correct:false,
  user_goal_mutated:false,
  external_execution_authorized:false,
 };
 return freeze({...contract,decision_hash:digest(contract)});
}
export function withheldAssistantDirectionAnswer({canonicalFrame}={}){
 required(canonicalFrame?.frame_hash&&valid(canonicalFrame.current_user_packet_id),
  'GOAL_PUBLICATION_FALLBACK_FRAME_REQUIRED');
 const goal=canonicalFrame.controlling_user_goal_state_contract;
 const current=canonicalFrame.user_goal_continuity_state?.user_goal_evidence
  ?.find(x=>x.goal_evidence_id===
    canonicalFrame.user_goal_continuity_state?.current_user_evidence_id);
 // Built entirely from source-bound *user* evidence; never quote rejected
 // assistant suggestions or echo unsafe machine instructions.
 const sourceText=valid(current?.text)?current.text:
   valid(goal?.description)?goal.description:null;
 return [
  'Reality withheld an answer because it could not clear an assistant-origin change of direction.',
  sourceText?'Your user-stated direction remains: "'+sourceText.slice(0,240)+'".':
   'The current user direction could not be independently resolved.',
  'The assistant has not changed your objective or performed an external action.',
  'Please confirm how you want to proceed if the direction is different.',
 ].join(' ');
}
