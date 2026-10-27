// Server-only adapter to DB-ATOMIC single-use execution reservations.
// Uses the same isolated Supabase and per-user/conversation goal epoch
// already enforced by authenticated private chat. Never falls back to another
// database or trusts a client-provided owner, epoch or reservation state.
import { resolveReliabilityBenchmarkDb }
 from './reality-reliability-db-boundary-v0.1.js';
import { validUuid } from './reality-private-chat-store-v0.1.js';

export const SINGLE_USE_EXECUTION_RESERVATION_VERSION='reality-single-use-execution-reservation-v0.1';
function scope({session,conversationId,env}){
 if(!validUuid(session?.user_id)||!validUuid(conversationId)||
    env.VERCEL_ENV!=='preview'||
    env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true')
  throw Error('EXECUTION_RESERVATION_AUTHENTICATED_PREVIEW_REQUIRED');
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||
    db.url!==session?.config?.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  throw Error('EXECUTION_RESERVATION_ISOLATED_DB_SCOPE_INVALID');
 return db;
}
async function rpc(db,name,payload,{fetchImpl=fetch}={}){
 const response=await fetchImpl(db.url+'/rest/v1/rpc/'+name,{
  method:'POST',
  headers:{apikey:db.secretKey,
    authorization:'Bearer '+db.secretKey,
    accept:'application/json','content-type':'application/json'},
  body:JSON.stringify(payload),
 });
 const data=await response.json().catch(()=>null);
 if(!response.ok){
  // Do not expose or log provider SQL or secrets. Return a stable code.
  const reason=String(data?.message||'');
  const known=[
   'EXECUTION_RESERVATION_INPUT_INVALID',
   'EXECUTION_EPOCH_NOT_FOUND',
   'EXECUTION_GOAL_REVISION_STALE',
   'EXECUTION_NEWER_USER_MESSAGE_REQUIRES_RECONCILIATION',
   'EXECUTION_ALREADY_RESERVED_NO_AUTOMATIC_RETRY',
   'EXECUTION_DISPATCH_INPUT_INVALID',
   'EXECUTION_RESERVATION_NOT_FOUND',
   'EXECUTION_RESERVATION_ALREADY_CONSUMED',
   'EXECUTION_DISPATCH_GROUNDING_CHANGED',
   'EXECUTION_SETTLEMENT_INPUT_INVALID',
   'EXECUTION_RESERVATION_CANNOT_REARM_OR_RESET',
  ];
  const code=known.find(x=>reason.includes(x))||
    'EXECUTION_RESERVATION_DATABASE_UNAVAILABLE';
  throw Object.assign(Error(code),{status:503});
 }
 return data;
}
export function createSingleUseExecutionReservationStore({
 session,conversationId,env=process.env,fetchImpl=fetch,
}={}){
 const db=scope({session,conversationId,env});
 const principal=session.user_id;
 const ids={p_user_id:principal,p_conversation_id:conversationId};
 return Object.freeze({
  version:SINGLE_USE_EXECUTION_RESERVATION_VERSION,
  async readEpoch(){
   const result=await rpc(db,'reality_read_execution_epoch',ids,{fetchImpl});
   if(!Array.isArray(result)||result.length!==1)
    throw Error('EXECUTION_EPOCH_READBACK_REQUIRED');
   const row=result[0];
   if(!Number.isSafeInteger(row.goal_revision)||row.goal_revision<1||
      !validUuid(row.goal_transition_event_id)||
      !Number.isSafeInteger(row.user_message_revision)||
      row.user_message_revision<1||
      !validUuid(row.latest_user_request_id))
    throw Error('EXECUTION_EPOCH_INVALID');
   return Object.freeze({...row});
  },
  async claim({
   policyId,workFingerprint,goalId,expectedGoalRevision,
   expectedGoalEventId,expectedUserMessageRevision,
   expectedLatestUserRequestId,
  }={}){
   if(typeof policyId!=='string'||!policyId||
      typeof workFingerprint!=='string'||!/^sha256:[a-f0-9]{64}$/.test(workFingerprint)||
      typeof goalId!=='string'||!goalId||
      !Number.isSafeInteger(expectedGoalRevision)||expectedGoalRevision<1||
      !validUuid(expectedGoalEventId)||
      !Number.isSafeInteger(expectedUserMessageRevision)||expectedUserMessageRevision<1||
      !validUuid(expectedLatestUserRequestId))
    throw Error('EXECUTION_RESERVATION_INPUT_INVALID');
   const result=await rpc(db,'reality_claim_execution_once',{
    ...ids,
    p_action_policy_id:policyId,p_work_fingerprint:workFingerprint,
    p_goal_id:goalId,p_expected_goal_revision:expectedGoalRevision,
    p_expected_goal_event_id:expectedGoalEventId,
    p_expected_user_message_revision:expectedUserMessageRevision,
    p_expected_latest_user_request_id:expectedLatestUserRequestId,
   },{fetchImpl});
   if(!validUuid(result))
    throw Error('EXECUTION_RESERVATION_RECEIPT_INVALID');
   return Object.freeze({reservation_id:result,principal_id:principal,
    conversation_id:conversationId,policy_id:policyId,
    work_fingerprint:workFingerprint,
    status:'RESERVED_NOT_DISPATCHED',external_action_performed:false});
  },
  async begin({reservationId}={}){
   if(!validUuid(reservationId))throw Error('EXECUTION_RESERVATION_ID_REQUIRED');
   const result=await rpc(db,'reality_begin_reserved_execution',
    {...ids,p_reservation_id:reservationId},{fetchImpl});
   if(result!==true)throw Error('EXECUTION_DISPATCH_CLAIM_UNCONFIRMED');
   return Object.freeze({status:'DISPATCHING',reservation_id:reservationId,
    single_use_claim_consumed:true});
  },
  async settle({reservationId,outcome,verificationReceiptRef}={}){
   if(!validUuid(reservationId)||
      !['VERIFIED','UNRESOLVED','UNCERTAIN'].includes(outcome)||
      typeof verificationReceiptRef!=='string'||!verificationReceiptRef||
      verificationReceiptRef.length>240)
    throw Error('EXECUTION_SETTLEMENT_INPUT_INVALID');
   const result=await rpc(db,'reality_settle_execution_reservation',{
    ...ids,p_reservation_id:reservationId,p_outcome:outcome,
    p_verification_receipt_ref:verificationReceiptRef,
   },{fetchImpl});
   if(result!==true)throw Error('EXECUTION_SETTLEMENT_NOT_CONFIRMED');
   return Object.freeze({status:outcome,reservation_id:reservationId,
    verification_receipt_ref:verificationReceiptRef});
  },
 });
}
