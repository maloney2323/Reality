// Recovery Review v1 — read-only owner-authenticated evidence classification.
// This module NEVER clears sequence fences, re-runs a model, writes to Universe,
// changes authority, or asserts that a provider call did or did not occur.
import {
  requireStandaloneReady,verifyStandaloneUser,createStandaloneConversationScope
} from './reality-standalone-auth-v0.1.js';
import {inspectCausalTurn} from './reality-causal-turn-commit-v0.1.js';
import {inspectConversationSlot} from './reality-conversation-sequencer-v0.1.js';

const fail=(code,status=400)=>{const error=new Error(code);error.status=status;return error;};
export const TURN_RECOVERY_REVIEW_VERSION='reality-turn-recovery-review-v1.0';

export function classifyTurnRecovery({turn,fence,turnId}={}){
 if(!turn||typeof turn!=='object'||!fence||typeof fence!=='object'||
  !/^[A-Za-z0-9:_-]{1,96}$/.test(turnId||'')||
  turn.turn_id!==turnId)throw fail('RECOVERY_INVALID_EVIDENCE',503);
 if(!['NO_FENCE','BUSY','IDLE'].includes(fence.status))
  throw fail('RECOVERY_FENCE_UNKNOWN',503);
 if(fence.status==='BUSY'&&fence.active_turn_id!==turnId)
  return Object.freeze({
   status:'CONFLICT_REVIEW_REQUIRED',
   next_action:'INSPECT_OTHER_ACTIVE_TURN',
   allowed_to_release_fence:false,allowed_to_retry_model:false,
  });
 if(turn.committed===true){
  if(turn.status!=='COMMITTED'||turn.receipt?.verified_chain!==true)
   throw fail('RECOVERY_COMMIT_VERIFICATION_REQUIRED',503);
  return Object.freeze({
   status:fence.status==='BUSY'?'EXISTING_COMMIT_ELIGIBLE_FOR_VERIFIED_RECONCILIATION':
      'EXISTING_COMMIT_NEEDS_SEQUENCE_READBACK',
   next_action:'VERIFY_EXACT_COMMITTED_RECEIPT_AND_SEQUENCE',
   allowed_to_release_fence:false,allowed_to_retry_model:false,
  });
 }
 if(turn.status==='NOT_RECEIVED'){
  if(fence.status==='BUSY')
   return Object.freeze({
    status:'INCONSISTENT_LEDGER_AND_FENCE',
    next_action:'FORENSIC_REVIEW',
    allowed_to_release_fence:false,allowed_to_retry_model:false,
   });
  return Object.freeze({
   status:'NO_DURABLE_TURN_EVIDENCE',
   next_action:'NEW_TURN_MAY_BE_ALLOWED_AFTER_FINAL_OWNER_SCOPE_CHECK',
   allowed_to_release_fence:false,allowed_to_retry_model:false,
  });
 }
 if(!['RECEIVED','PROCESSING','INTERRUPTED','RESPONSE_STORED_UNCOMMITTED']
   .includes(turn.status))
  throw fail('RECOVERY_TURN_STATUS_UNKNOWN',503);
 return Object.freeze({
  status:turn.status==='RESPONSE_STORED_UNCOMMITTED'
   ?'UNCOMMITTED_RESPONSE_REVIEW_REQUIRED':'INCOMPLETE_TURN_REVIEW_REQUIRED',
  next_action:'REVIEW_EVIDENCE_AND_AUTHORIZE_SEPARATE_ABANDONMENT_WORKFLOW',
  allowed_to_release_fence:false,allowed_to_retry_model:false,
 });
}

export async function reviewOwnerTurn(req,{
 env=process.env,fetchImpl=fetch,verify=verifyStandaloneUser,
 inspect=inspectCausalTurn,inspectFence=inspectConversationSlot,
}={}){
 requireStandaloneReady(env);
 const q=req?.query||{};
 if(!q||typeof q!=='object'||Array.isArray(q)||
  Object.keys(q).some(k=>!['conversation_id','thought_id','turn_id'].includes(k))||
  typeof q.conversation_id!=='string'||typeof q.turn_id!=='string')
  throw fail('RECOVERY_REVIEW_SELECTOR_INVALID',400);
 const principal=await verify(req,{env,fetchImpl});
 const scope=createStandaloneConversationScope({
  userId:principal.user_id,conversationId:q.conversation_id,
  thoughtId:q.thought_id??'personal',
 });
 const turn=await inspect({scope,turnId:q.turn_id,fetchImpl});
 const fence=env.REALITY_CAUSAL_SEQUENCE_ENABLED==='true'
  ?await inspectFence({scope,env,fetchImpl})
  :{status:'NO_FENCE'};
 const decision=classifyTurnRecovery({turn,fence,turnId:q.turn_id});
 return Object.freeze({
  ok:true,version:TURN_RECOVERY_REVIEW_VERSION,
  review:decision,turn_status:turn.status,fence_status:fence.status,
  phase_evidence:Object.freeze({
   user_message_saved:turn.status!=='NOT_RECEIVED',
   processing_receipt_saved:Boolean(turn.evidence?.processing_receipt_entry_id),
   interruption_receipt_saved:Boolean(turn.evidence?.interruption_recorded),
   assistant_message_saved:Boolean(turn.evidence?.assistant_message_entry_id)||
     turn.committed===true,
   committed_result_verified:turn.committed===true,
  }),
  model_call_outcome:'NOT_ESTABLISHED_BY_THIS_REVIEW',
  external_action_outcome:'NOT_ESTABLISHED_BY_THIS_REVIEW',
  no_model_call_performed_by_review:true,
  no_database_mutation_performed_by_review:true,
  review_is_a_durable_receipt:false,
 });
}
