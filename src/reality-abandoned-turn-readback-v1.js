// Read-only, hash-verified interpretation of an owner-authorized ABANDONED
// turn. Never equates abandonment with an assistant reply or COMMITTED result.
// This module does not import the causal-turn engine, avoiding circular deps.
import {createHash} from 'node:crypto';
import {validateUniverseEntry} from './reality-universe-persistence-contract-v1.0.js';
const fail=code=>{throw Error(code)};
export function abandonmentEntryId(scope,turnId,kind){
 if(!scope?.continuity_root_id||!/^[A-Za-z0-9:_-]{1,96}$/.test(turnId||'')||
  !['approval','resolution'].includes(kind))fail('ABANDONMENT_ID_INVALID');
 return 'reality-abandonment:'+createHash('sha256').update(
  JSON.stringify([scope.continuity_root_id,turnId,kind])).digest('hex');
}
export async function inspectAbandonedTurn({scope,turnId,turn,lookup,fetchImpl=fetch}={}){
 if(typeof lookup!=='function')fail('ABANDONMENT_LOOKUP_REQUIRED');
 const receipt=await lookup({entryId:abandonmentEntryId(scope,turnId,'resolution'),fetchImpl});
 if(!receipt)return null;
 const valid=(entry,kind)=>{
  if(!entry)fail('ABANDONMENT_EVIDENCE_MISSING');
  validateUniverseEntry(entry);
  if(entry.continuity_root_id!==scope.continuity_root_id||
     entry.worldline_id!==scope.worldline_id||
     entry.event_kind!==kind)fail('ABANDONMENT_EVIDENCE_SCOPE_INVALID');
 };
 valid(receipt,'REALITY_TURN_RESOLUTION_RECEIPT');
 if(turn?.committed||turn?.status!=='INTERRUPTED'||
  receipt.payload?.resolution_status!=='ABANDONED'||
  receipt.payload?.owner_user_id!==scope.authenticated_user_id||
  receipt.payload?.turn_id!==turnId||
  receipt.payload?.model_call_outcome!=='UNKNOWN'||
  receipt.payload?.external_action_outcome!=='NOT_ESTABLISHED')
  fail('ABANDONMENT_STORED_STATE_INVALID');
 const approval=await lookup({
  entryId:abandonmentEntryId(scope,turnId,'approval'),fetchImpl});
 valid(approval,'REALITY_TURN_ABANDONMENT_APPROVAL');
 if(approval.entry_id!==receipt.payload.approval_receipt_id||
   approval.ledger_entry_hash!==receipt.payload.approval_receipt_hash||
   approval.payload?.owner_user_id!==scope.authenticated_user_id||
   approval.payload?.turn_id!==turnId||
   approval.payload?.approval_intent!=='EXPLICIT_OWNER_ABANDON_INCOMPLETE'||
   approval.payload?.acknowledges_uncertain_model_execution!==true||
   approval.payload?.acknowledges_possible_model_billing!==true)
  fail('ABANDONMENT_APPROVAL_CHAIN_INVALID');
 const refs=receipt.evidence_references;
 if(!Array.isArray(refs)||refs.length!==4||
  refs[3]!==approval.entry_id)fail('ABANDONMENT_LINEAGE_INVALID');
 const [u,p,i]=await Promise.all(refs.slice(0,3).map(entryId=>
  lookup({entryId,fetchImpl})));
 valid(u,'AUTHENTICATED_CONVERSATION_MESSAGE');
 valid(p,'REALITY_CAUSAL_TURN_RECEIPT');
 valid(i,'REALITY_CAUSAL_TURN_RECEIPT');
 if(u.payload?.role!=='user'||u.payload?.turn_id!==turnId||
    u.payload?.principal_id!==scope.authenticated_user_id||
    p.payload?.phase!=='PROCESSING'||p.payload?.turn_id!==turnId||
    i.payload?.phase!=='INTERRUPTED'||i.payload?.turn_id!==turnId||
    receipt.payload?.user_message_hash!==u.ledger_entry_hash||
    receipt.payload?.processing_receipt_hash!==p.ledger_entry_hash||
    receipt.payload?.interruption_receipt_hash!==i.ledger_entry_hash||
    approval.payload?.user_message_hash!==u.ledger_entry_hash||
    approval.payload?.interruption_receipt_hash!==i.ledger_entry_hash)
  fail('ABANDONMENT_SOURCE_HASH_OR_TURN_MISMATCH');
 return Object.freeze({
  status:'ABANDONED_AFTER_OWNER_REVIEW',
  receipt_id:receipt.entry_id,receipt_hash:receipt.ledger_entry_hash,
  verified_chain:true,committed:false,model_outcome:'UNKNOWN',
  publishable_assistant_result:false,
 });
}
