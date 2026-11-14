// Owner-authenticated saved Chat request -> existing governed job controllers.
// No model recommendation grants execution. New capability adapters may be
// registered without hardcoded issue numbers, branches, or worker identities.
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {readOwnerGovernedBuild,queueOwnerGovernedBuild}
 from './reality-governed-build-chat-connection-v1.0.js';

const workId=x=>/^work:[a-f0-9]{32}$/.test(String(x||''));
const fail=(code,status=409)=>{throw Object.assign(new Error(code),{status})};
export async function inspectSavedChatWork({
 session,conversationId,requestId,messages,
 readBuild=readOwnerGovernedBuild
}={}){
 if(!validUuid(session?.user_id)||!validUuid(conversationId)||!validUuid(requestId)||
    !Array.isArray(messages))fail('CHAT_WORK_OWNER_SOURCE_UNVERIFIED',401);
 const verified=messages.filter(x=>x.request_id===requestId&&x.role==='user'&&
  /^supabase:reality_chat_messages:[a-f0-9-]{36}$/i.test(x.source_ref||''));
 if(verified.length!==1)fail('CHAT_WORK_SIGNED_USER_TURN_REQUIRED',403);
 // Only a matching original conversation and owner-current verified job may
 // enter the existing build executor. A Chat model cannot invent eligibility.
 let eligible=null;
 try{eligible=await readBuild({session})}catch(e){
  return Object.freeze({status:'CHAT_WORK_EXECUTOR_READBACK_UNAVAILABLE',
   request_id:requestId,source_ref:verified[0].source_ref,
   execution_started:false,installation_authorized:false,production_changed:false});
 }
 const sameConversation=eligible?.original_conversation_id===conversationId;
 const existing=sameConversation&&eligible?.queued===true&&
  workId(eligible.original_work_id);
 if(existing)return Object.freeze({
  status:'ORIGINAL_JOB_ALREADY_QUEUED',
  original_work_id:eligible.original_work_id,
  request_id:requestId,source_ref:verified[0].source_ref,
  execution_started:false,installation_authorized:false,production_changed:false,
 });
 const ready=sameConversation&&eligible?.phase==='NOT_QUEUED'&&
  eligible.eligible_for_investigation===true&&workId(eligible.original_work_id);
 if(ready)return Object.freeze({
  status:'EXISTING_ORIGINAL_DISCOVERY_ELIGIBLE',
  original_work_id:eligible.original_work_id,
  request_id:requestId,source_ref:verified[0].source_ref,
  execution_started:false,installation_authorized:false,production_changed:false,
 });
 return Object.freeze({
  status:'CHAT_WORK_NEEDS_A_VERIFIED_EXECUTION_ADAPTER',
  request_id:requestId,source_ref:verified[0].source_ref,
  // This user instruction is already in the authenticated durable Chat inbox.
  // Existing shift-bound source investigation is separate from executable work.
  execution_started:false,installation_authorized:false,production_changed:false,
 });
}
export async function authorizeSavedChatExistingOriginal({
 session,conversationId,requestId,messages,
 inspect=inspectSavedChatWork,queue=queueOwnerGovernedBuild,
}={}){
 const state=await inspect({session,conversationId,requestId,messages});
 if(state.status!=='EXISTING_ORIGINAL_DISCOVERY_ELIGIBLE')
  fail('CHAT_WORK_NO_VERIFIED_ELIGIBLE_ORIGINAL',409);
 const response=await queue({session,expectedOriginalWorkId:state.original_work_id});
 if(response?.original_work_id!==state.original_work_id||
    response?.installation_authorized!==false||
    response?.production_changed===true)
  fail('CHAT_WORK_EXECUTOR_OWNER_RECEIPT_UNVERIFIED',503);
 return Object.freeze({status:response.worker_dispatch_started===true?
   'CHAT_WORK_ORIGINAL_DISCOVERY_DISPATCHED':
   'CHAT_WORK_ORIGINAL_DISCOVERY_QUEUED_BLOCKED',
  original_work_id:state.original_work_id,request_id:requestId,
  source_ref:state.source_ref,
  queue_id:response.queue_id||null,
  worker_dispatch_verified:response.worker_dispatch_started===true,
  execution_started:response.worker_dispatch_started===true,
  installation_authorized:false,production_changed:false});
}
