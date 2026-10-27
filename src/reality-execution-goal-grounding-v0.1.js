// Reality foundational execution grounding contract (EXPERIMENTAL).
// A READ-ONLY comparison over the EXISTING source-attested Continuity goal
// projection. Does not create goals, mint approval, infer meaning, or execute.
// All authoritativeState objects MUST originate from a fresh server-side
// projectAuthoritativeUserGoals() over verified scoped Continuity readback.
// Client/model-provided JSON is NEVER such a readback.
import { fingerprintApprovedWorkItem } from './reality-authority-v1.0.js';

export const EXECUTION_GOAL_GROUNDING_VERSION='reality-execution-goal-grounding-v0.1';
const ok=x=>typeof x==='string'&&x.trim().length>0;
const ACTIVE_SOURCE='AUTHENTICATED_RLS_USER_GOAL_COMMAND_AND_LEDGER_READBACK';
const blocked=(reason)=>Object.freeze({
  version:EXECUTION_GOAL_GROUNDING_VERSION,status:'BLOCKED',
  reason,grants_goal_mutation:false,grants_external_execution:false,
});
function validateSourceState(state){
 if(!state||typeof state!=='object'||
    !ok(state.principal_id)||!ok(state.continuity_root_id)||
    state.authority_source!==ACTIVE_SOURCE||
    state.assistant_can_mutate_goals!==false||
    state.semantic_reviewer_can_mutate_goals!==false||
    state.external_execution_authorized!==false||
    !Number.isSafeInteger(state.transition_count)||state.transition_count<1||
    !Array.isArray(state.recent_transition_receipts))return false;
 const goal=state.active_goal;
 return Boolean(ok(state.active_goal_id)&&goal?.goal_id===state.active_goal_id&&
  goal?.status==='ACTIVE'&&goal.user_confirmed===true&&
  goal.external_execution_authorized===false&&
  ok(goal.source_user_message_ref)&&
  ok(goal.last_transition_receipt_id)&&
  state.recent_transition_receipts.some(r=>
    r.event_id===goal.last_transition_receipt_id&&
    r.confirmed_by_user===true&&r.principal_id===state.principal_id));
}
function fingerprint(workItem){
 try{return fingerprintApprovedWorkItem(workItem)}
 catch{return null}
}
export function bindWorkToAuthenticatedGoal({
 workItem,authoritativeState,serverVerifiedPrincipalId,
}={}){
 // The caller MUST be a trusted server adapter; this function does not
 // authenticate a session or authenticate the state passed to it.
 if(!ok(serverVerifiedPrincipalId)||!validateSourceState(authoritativeState)||
    authoritativeState.principal_id!==serverVerifiedPrincipalId)
   return blocked('GOAL_GROUNDING_AUTHENTICATED_SOURCE_REQUIRED');
 const workFingerprint=fingerprint(workItem);
 if(!workFingerprint)return blocked('GOAL_GROUNDING_WORK_ITEM_INVALID');
 const g=authoritativeState.active_goal;
 return Object.freeze({
  version:EXECUTION_GOAL_GROUNDING_VERSION,
  status:'BOUND_FOR_FRESHNESS_CHECK',
  work_item_fingerprint:workFingerprint,
  principal_id:serverVerifiedPrincipalId,
  continuity_root_id:authoritativeState.continuity_root_id,
  world_id:authoritativeState.world_id??null,
  goal_id:g.goal_id,
  goal_source_user_message_ref:g.source_user_message_ref,
  goal_transition_receipt_id:g.last_transition_receipt_id,
  goal_revision:authoritativeState.transition_count,
  goal_status_at_binding:'ACTIVE',
  grants_goal_mutation:false,
  grants_external_execution:false,
 });
}
export function compareFreshAuthenticatedGoalForWork({
 workItem,binding,latestAuthoritativeState,serverVerifiedPrincipalId,
 approvedActionPrincipalId,
}={}){
 // This is an admission CHECK, never a source of action authorization.
 // Caller must independently authenticate fresh server-side readback and
 // require exact-work persisted approval. A malicious callback/JSON cannot
 // substitute for database-backed authenticated projection.
 if(binding?.version!==EXECUTION_GOAL_GROUNDING_VERSION||
    binding.status!=='BOUND_FOR_FRESHNESS_CHECK'||
    binding.grants_goal_mutation!==false||
    binding.grants_external_execution!==false)
   return blocked('GOAL_GROUNDING_BINDING_MISSING');
 if(!ok(serverVerifiedPrincipalId)||!ok(approvedActionPrincipalId)||
    serverVerifiedPrincipalId!==approvedActionPrincipalId||
    binding.principal_id!==serverVerifiedPrincipalId)
   return blocked('GOAL_GROUNDING_PRINCIPAL_MISMATCH');
 const exact=fingerprint(workItem);
 if(!exact||binding.work_item_fingerprint!==exact)
   return blocked('GOAL_GROUNDING_WORK_ITEM_CHANGED');
 if(!latestAuthoritativeState||
    latestAuthoritativeState.principal_id!==serverVerifiedPrincipalId||
    latestAuthoritativeState.continuity_root_id!==binding.continuity_root_id||
    (latestAuthoritativeState.world_id??null)!==binding.world_id)
   return blocked('GOAL_GROUNDING_SCOPE_MISMATCH_OR_READBACK_MISSING');
 if(!validateSourceState(latestAuthoritativeState))
   return blocked('GOAL_GROUNDING_NO_VERIFIED_ACTIVE_GOAL');
 const latest=latestAuthoritativeState.active_goal;
 if(latest.goal_id!==binding.goal_id||
    latest.source_user_message_ref!==binding.goal_source_user_message_ref)
   return blocked('GOAL_GROUNDING_CONTROLLING_OBJECTIVE_CHANGED');
 if(latestAuthoritativeState.transition_count!==binding.goal_revision||
    latest.last_transition_receipt_id!==binding.goal_transition_receipt_id)
   return blocked('GOAL_GROUNDING_GOAL_REVISION_STALE');
 return Object.freeze({
  version:EXECUTION_GOAL_GROUNDING_VERSION,
  status:'FRESH_GOAL_BINDING_MATCHED',
  reason:null,goal_id:latest.goal_id,
  principal_id:serverVerifiedPrincipalId,
  goal_revision:latestAuthoritativeState.transition_count,
  goal_transition_receipt_id:latest.last_transition_receipt_id,
  work_item_fingerprint:exact,
  // STILL NOT action approval or proof the proposed work was semantically right.
  grants_goal_mutation:false,grants_external_execution:false,
  semantic_alignment_independently_verified:false,
  action_authority_separately_required:true,
 });
}
