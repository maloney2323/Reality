// Audited incomplete-turn resolution v0.1 — pure, REVIEW-ONLY eligibility.
// NO MODEL CALLS, SQL WRITES, RECEIPT APPENDS, OR LOCK RELEASES.
// A proposal is NOT authorization to perform the action.
export const ABANDONMENT_PLAN_VERSION='reality-incomplete-turn-abandonment-plan-v0.1';
const disallow=(reason)=>Object.freeze({
 status:'NOT_ELIGIBLE',reason,
 permitted_to_execute:false,authorization_granted:false,
});
export function planIncompleteTurnAbandonment({turn,fence,turnId,previewOnly=true}={}){
 if(!previewOnly)return disallow('PRODUCTION_OR_EXTERNAL_ACTION_WORKFLOW_NOT_SUPPORTED');
 if(!turn||turn.turn_id!==turnId||turn.committed!==false)
  return disallow('TURN_EVIDENCE_NOT_VERIFIED_INCOMPLETE');
 if(turn.status==='RESPONSE_STORED_UNCOMMITTED')
  return disallow('ASSISTANT_EVIDENCE_REQUIRES_SPECIAL_RECONCILIATION');
 if(turn.status!=='INTERRUPTED'||turn.evidence?.interruption_recorded!==true)
  return disallow('DURABLE_INTERRUPTION_RECEIPT_REQUIRED');
 if(Boolean(turn.evidence?.assistant_message_entry_id))
  return disallow('ASSISTANT_EVIDENCE_REQUIRES_SPECIAL_RECONCILIATION');
 if(!fence||fence.status!=='BUSY'||fence.active_turn_id!==turnId)
  return disallow('EXACT_ACTIVE_TURN_FENCE_REQUIRED');
 if(!Number.isSafeInteger(fence.sequence_num)||fence.sequence_num<1)
  return disallow('SEQUENCE_NUMBER_INVALID');
 // An uncommitted claim advanced sequence_num even though no COMMITTED
 // receipt exists. Reset to the preceding committed sequence transactionally.
 const prior=fence.sequence_num-1;
 if(prior===0){
  if(fence.last_committed_entry_id!=null||fence.last_committed_entry_hash!=null)
   return disallow('GENESIS_PREDECESSOR_CONFLICT');
 }else if(typeof fence.last_committed_entry_id!=='string'||
          !/^[a-f0-9]{64}$/.test(fence.last_committed_entry_hash||'')){
  return disallow('PRIOR_COMMIT_EVIDENCE_REQUIRED');
 }
 return Object.freeze({
  version:ABANDONMENT_PLAN_VERSION,
  status:'REVIEW_ELIGIBLE_NOT_AUTHORIZED',
  original_turn_status:turn.status,
  blocked_turn_id:turnId,
  sequence_claimed:fence.sequence_num,
  next_committed_sequence_after_abandonment:prior,
  required_evidence:Object.freeze([
   'OWNER_AUTHENTICATED_TO_CONVERSATION_ROOT',
   'OWNER_EXPLICITLY_ACKNOWLEDGES_UNCERTAIN_MODEL_EXECUTION',
   'INDEPENDENT_IMMUTABLE_USER_AND_INTERRUPTION_RECEIPTS',
   'NO_ASSISTANT_OR_COMMITTED_RESULT_FOUND_AT_ATOMIC_LOCK_CHECK',
   'STANDALONE_PREVIEW_HAS_NO_EXTERNAL_EXECUTION_PATH',
   'ATOMIC_APPEND_ABANDONMENT_RECEIPT_AND_CLEAR_FENCE',
   'POST_TRANSACTION_READBACK_CONFIRMS_FENCE_AND_HASH',
  ]),
  provider_call_outcome:'UNKNOWN_MAY_HAVE_BEEN_BILLED',
  external_execution_outcome:'NOT_INDEPENDENTLY_ESTABLISHED',
  permitted_to_execute:false,
  authorization_granted:false,
  proposal_only:true,
 });
}
