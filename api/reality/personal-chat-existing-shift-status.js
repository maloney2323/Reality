// Reality Chat's always-visible, authenticated owner status for the most
// recent exact saved continuation of an already authorized shift.
// Read-only: never wakes a worker, starts a shift or installs code.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {shiftDatabase,shiftRpc}
 from '../../src/reality-governed-shift-boundary-v1.js';

const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const SRC=/^supabase:reality_chat_messages:[0-9a-f-]{36}$/i;
export const maxDuration=25;
const fail=(res,code,status=503)=>res.status(status).json({
 ok:false,error:code,installation_authorized:false,
 original_job_completed:false,production_changed:false
});
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  if(req.method!=='GET'||Object.keys(req.query||{}).length)
   return fail(res,'CHAT_SHIFT_STATUS_GET_ONLY',405);
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session||!UUID.test(session.user_id||''))
   return fail(res,'CHAT_SHIFT_STATUS_SIGN_IN_REQUIRED',401);
  const db=shiftDatabase(process.env);
  if(db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
     db.url!==session.config?.url)
   return fail(res,'CHAT_SHIFT_STATUS_OWNER_PROJECT_MISMATCH',403);
  const r=await shiftRpc(db,'reality_read_owner_latest_signed_chat_shift_receipt_v1',
   {p_owner_id:session.user_id});
  if(r?.status==='NO_OWNER_ACTIVE_SIGNED_SHIFT_CHAT_WAKE'&&
     r.installation_authorized===false&&
     r.production_changed===false&&r.original_job_completed===false&&
     r.new_shift_started===false)
   return res.status(200).json({ok:true,status:r.status,
    wake_enqueued:false,installation_authorized:false,
    original_job_completed:false,production_changed:false});
  if(r?.status!=='OWNER_LATEST_SIGNED_SHIFT_CHAT_WAKE_VERIFIED'||
     r.owner_id!==session.user_id||
     !UUID.test(r.conversation_id||'')||!UUID.test(r.request_id||'')||
     !UUID.test(r.shift_id||'')||!SRC.test(r.source_ref||'')||
     !Number.isSafeInteger(r.network_request_id)||r.network_request_id<1||
     !['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK'].includes(r.shift_status)||
     r.wake_enqueued!==true||
     r.worker_execution_verified_for_this_request!==false||
     r.new_shift_started!==false||
     r.installation_authorized!==false||
     r.original_job_completed!==false||r.production_changed!==false)
   return fail(res,'CHAT_SHIFT_STATUS_DURABLE_RECEIPT_UNVERIFIED');
  return res.status(200).json({
   ok:true,status:r.status,source_ref:r.source_ref,
   shift_id:r.shift_id,conversation_id:r.conversation_id,
   request_id:r.request_id,network_request_id:r.network_request_id,
   queued_at:r.queued_at,shift_status:r.shift_status,
   last_worker_safe_result:r.last_worker_safe_result||null,
   last_worker_completed_at:r.last_worker_completed_at||null,
   wake_count:Number.isSafeInteger(r.wake_count)?r.wake_count:null,
   wake_enqueued:true,worker_execution_verified_for_this_request:false,
   new_shift_started:false,installation_authorized:false,
   original_job_completed:false,production_changed:false
  });
 }catch{return fail(res,'CHAT_SHIFT_STATUS_READBACK_UNAVAILABLE');}
}
