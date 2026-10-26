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
 const current=state?.user_goal_evidence?.find(x=>
  x.goal_evidence_id===state.current_user_evidence_id);
 const review=semanticReview?.goal_trajectory_review||null;
 const reviewerStatus=review?.status==='REVIEWED_GOAL_TRAJECTORY_CANDIDATE';
 const anchoredSource=reviewerStatus&&
  state?.user_goal_evidence?.some(x=>x.source_ref===review.goal_source_ref);
 const exactQuote=String(review?.answer_quote||'');
 const anchoredQuote=valid(exactQuote)&&modelAnswer.includes(exactQuote);
 const userAuthorizedPivotReview=['USER_AUTHORIZED_PIVOT','USER_AUTHORIZED_DETOUR']
  .includes(review?.user_direction);
 const assistantShiftCandidate=Boolean(
  reviewerStatus&&anchoredSource&&anchoredQuote&&
  review.answer_alignment==='ASSISTANT_DRIFTED_OFF_OBJECTIVE'&&
  !userAuthorizedPivotReview);
 const goalId=working?.goal_evidence_id||original?.goal_evidence_id||null;
 const transition=assistantShiftCandidate&&goalId?
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
  authorization_state:'UNAUTHORIZED',
 }:null;
 const proposed={
  version:GOAL_GOVERNANCE_CONTRACT_VERSION,
  proposal_id:digest([canonicalFrame.frame_hash,modelResponseId||null,modelAnswer]),
  target_turn_id:canonicalFrame.current_user_packet_id,
  canonical_frame_hash:canonicalFrame.frame_hash,
  proposed_response_text:modelAnswer.slice(0,5200),
  intended_state_mutations:{
   resource_mutations:[],
   goal_mutations:proposedMutation?[proposedMutation]:[],
  },
  direction_evaluation:{
   aligns_with_active_objective:reviewerStatus?
    review.answer_alignment==='ON_USER_DIRECTED_OBJECTIVE':null,
   introduces_new_unauthorized_objective:assistantShiftCandidate,
   drops_existing_obligation:null, // Not inferable from goal reviewer alone.
   reviewer_is_ground_truth:false,
  },
 };
 const releaseContainsFlaggedQuote=assistantShiftCandidate&&
  finalAnswer.includes(exactQuote);
 const disposition=assistantShiftCandidate?
  (releaseContainsFlaggedQuote?'GOAL_SHIFT_CANDIDATE_IN_RELEASE':
   'FLAGGED_PHRASE_ABSENT_FROM_RELEASE'):
  reviewerStatus?'NO_UNAUTHORIZED_GOAL_SHIFT_IDENTIFIED_BY_REVIEWER':
   'GOAL_SHIFT_NOT_ASSESSED';
 const base={
  version:GOAL_GOVERNANCE_CONTRACT_VERSION,
  source_frame_hash:canonicalFrame.frame_hash,
  continuity_root_id:canonicalFrame.continuity_root_id,
  world_id:canonicalFrame.world_id,
  working_goal:{
   goal_id:goalId,
   user_source_ref:working?.source_ref||original?.source_ref||null,
   status:'PROVISIONAL_UNLESS_INDEPENDENTLY_RECONCILED',
   original_user_goal_evidence_id:original?.goal_evidence_id||null,
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
 const resourceChanges=contract.assistant_proposal?.intended_state_mutations?.resource_mutations;
 const goalChanges=contract.assistant_proposal?.intended_state_mutations?.goal_mutations;
 required(Array.isArray(resourceChanges)&&resourceChanges.length===0,
  'GOAL_GOVERNANCE_UNAUTHORIZED_RESOURCE_MUTATION');
 required(Array.isArray(goalChanges)&&goalChanges.length<=20,
  'GOAL_GOVERNANCE_UNTRUSTED_GOAL_MUTATIONS');
 // Do not validate just the first candidate: every goal mutation must match
 // the immutable current goal and remain an untrusted assistant proposal.
 for(const mutation of goalChanges){
  required(mutation?.type==='SHIFT_OBJECTIVE'&&
   mutation.target_goal_id===contract.working_goal?.goal_id&&
   mutation.authorization_state==='UNAUTHORIZED'&&
   typeof mutation.proposal_quote==='string'&&mutation.proposal_quote.length>0,
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
