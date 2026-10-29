// Exact-answer publication contract at authenticated private-chat boundary.
// This is a final cross-check of the EXISTING Continuity/Integrity decision,
// not an extra reviewer, detached guardrail, or parallel truth database.
// An assistant-generated string must never be published under a receipt
// that attested DIFFERENT bytes or a different user-goal revision.
import {createHash} from 'node:crypto';
const hash=text=>'sha256:'+createHash('sha256')
 .update(JSON.stringify(text)).digest('hex');
function require(condition,code){if(!condition)throw new Error(code)}
export function assertFinalChatPublicationProof({
 answer,reliability,atomicGoalPublicationEnabled=false,
}={}){
 require(atomicGoalPublicationEnabled===true,
  'CHAT_ATOMIC_GOAL_PUBLICATION_REQUIRED');
 require(typeof answer==='string'&&answer.trim().length>0,
  'CHAT_FINAL_ANSWER_REQUIRED');
 require(reliability?.canonical_epistemic_state?.status===
  'PERSISTED_AND_READBACK_VERIFIED'&&
  typeof reliability.canonical_epistemic_state.frame_hash==='string'&&
  Boolean(reliability.canonical_epistemic_state.source_receipt_id)&&
  reliability.readback_verified===true,
  'CHAT_CANONICAL_SOURCE_FRAME_NOT_VERIFIED');
 const gate=reliability?.final_direction_release;
 require(gate&&typeof gate.status==='string'&&
  typeof gate.source_receipt_id==='string'&&gate.source_receipt_id.length>0&&
  typeof gate.release_allowed==='boolean'&&
  typeof gate.final_answer_hash==='string',
  'CHAT_FINAL_DIRECTION_RECEIPT_REQUIRED');
 require(gate.final_answer_hash===hash(answer),
  'CHAT_FINAL_ANSWER_CHANGED_AFTER_DIRECTION_VERIFICATION');
 if(gate.release_allowed===false){
  require(gate.known_off_goal_text_withheld===true,
    'CHAT_KNOWN_OFF_GOAL_ANSWER_NOT_WITHHELD');
 }
 const authority=reliability?.goal_authority_contracts?.authorized_user_goal_state;
 require(authority&&Number.isSafeInteger(authority.transition_count)&&
   authority.transition_count>=0,
   'CHAT_GOAL_AUTHORITY_SNAPSHOT_MISSING');
 return Object.freeze({
  status:'BOUND_TO_ORIGINAL_CANONICAL_FRAME_AND_FINAL_DIRECTION_RECEIPT',
  final_answer_hash:gate.final_answer_hash,
  final_direction_receipt_id:gate.source_receipt_id,
  canonical_frame_hash:reliability.canonical_epistemic_state.frame_hash,
  canonical_frame_receipt_id:reliability.canonical_epistemic_state.source_receipt_id,
  current_authorized_goal_revision:authority.transition_count,
  external_execution_authorized:false,
  semantic_accuracy_independently_verified:false,
 });
}
