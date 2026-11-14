// Authenticated, readback-verified Reality Chat -> installed-capability router.
// Only the signed user message can be classified. Models NEVER grant authority.
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {readOwnerGovernedBuild,queueOwnerGovernedBuild}
 from './reality-governed-build-chat-connection-v1.0.js';
import {shiftDatabase,shiftRpc,assertShiftReadback}
 from './reality-governed-shift-boundary-v1.js';
import {classifyChatWorkIntent} from './reality-chat-work-intent-v1.js';

const workId=x=>/^work:[a-f0-9]{32}$/.test(String(x||''));
const SOURCE=/^supabase:reality_chat_messages:[a-f0-9-]{36}$/i;
const fail=(code,status=409)=>{throw Object.assign(new Error(code),{status})};

// These are INSTALLED server adapters, not model-suggested permissions.
// A new capability can register its adapter without adding job numbers or
// client-side branch/path rules. "Website edit" isn't registered yet.
export const CHAT_WORK_CAPABILITIES=Object.freeze([
 Object.freeze({id:'governed-original-discovery',
  description:'Queue discovery of an independently eligible existing original development job tied to the signed-in confirmed user goal. Does not install or settle.',
  effect:'owner-scoped investigation',authorizes_installation:false}),
 Object.freeze({id:'owner-employee-shift-briefing',
  description:'Read actual employee shift authorization, current work and steps from the owner-scoped independent ledger. Read only.',
  effect:'read only',authorizes_installation:false}),
]);
function sourceTurn({session,conversationId,requestId,messages}={}){
 if(!validUuid(session?.user_id)||!validUuid(conversationId)||!validUuid(requestId)||
    !Array.isArray(messages))fail('CHAT_WORK_OWNER_SOURCE_UNVERIFIED',401);
 const verified=messages.filter(x=>x.request_id===requestId&&x.role==='user'&&
   SOURCE.test(x.source_ref||'')&&typeof x.text==='string'&&x.text.trim());
 if(verified.length!==1)fail('CHAT_WORK_SIGNED_USER_TURN_REQUIRED',403);
 return verified[0];
}
async function readOwnerEmployeeShift({
 session,env=process.env,dbFactory=shiftDatabase,callRpc=shiftRpc
}={}){
 if(env.VERCEL_ENV!=='preview')throw Error('SHIFT_PREVIEW_SCOPE_UNAVAILABLE');
 const db=dbFactory(env);
 if(!db?.strictSecrets||db.url!==session.config?.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  throw Error('SHIFT_OWNER_PROJECT_MISMATCH');
 const read=assertShiftReadback(await callRpc(db,'reality_read_owner_employee_shifts_v1',
  {p_owner_id:session.user_id}));
 const shifts=Array.isArray(read.shifts)?read.shifts:[];
 const current=shifts.find(x=>['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK'].includes(x.status)&&
  !x.closed_at)||shifts[0]||null;
 return Object.freeze({
  status:current?'OWNER_SHIFT_INDEPENDENTLY_READ':'NO_SHIFT_FOUND',
  shift_id:current?.shift_id||null,
  shift_status:current?.status||null,
  authorized_at:current?.authorized_at||null,
  owner_bound:true,read_only:true,
  work_step_count:Array.isArray(current?.steps)?current.steps.length:null,
  independent_shift_completion_proven:false,
 });
}
export async function inspectSavedChatWork({
 session,conversationId,requestId,messages,
 readBuild=readOwnerGovernedBuild,
 readShift=readOwnerEmployeeShift,
 classify=classifyChatWorkIntent
}={}){
 const verified=sourceTurn({session,conversationId,requestId,messages});
 let intent;
 try{intent=await classify({message:verified.text,
   registeredCapabilities:CHAT_WORK_CAPABILITIES});
 }catch{
  return Object.freeze({status:'CHAT_WORK_INTENT_UNAVAILABLE',
   request_id:requestId,source_ref:verified.source_ref,
   action_eligible:false,execution_started:false,
   installation_authorized:false,production_changed:false});
 }
 const common={
  request_id:requestId,source_ref:verified.source_ref,
  intent_kind:intent.kind,objective:intent.objective||null,
  capability_id:intent.capability_id||null,
  action_eligible:false,execution_started:false,
  installation_authorized:false,production_changed:false
 };
 if(intent.kind==='CONVERSATION'||intent.kind==='UNCERTAIN')
  return Object.freeze({...common,status:intent.status==='CONVERSATION_ONLY'?
   'CHAT_WORK_CONVERSATION_ONLY':'CHAT_WORK_INTENT_NEEDS_CLARIFICATION'});
 if(!intent.capability_id)
  return Object.freeze({...common,status:'CHAT_WORK_CAPABILITY_GAP',
   capability_gap:true,reviewed_not_executed:true});
 if(intent.capability_id==='owner-employee-shift-briefing'){
  try{
   const briefing=await readShift({session});
   return Object.freeze({...common,
    status:'CHAT_WORK_READ_ONLY_EVIDENCE_AVAILABLE',
    briefing,capability_gap:false,work_receipt_verified:false});
  }catch{
   return Object.freeze({...common,status:'CHAT_WORK_EXECUTOR_READBACK_UNAVAILABLE'});
  }
 }
 if(intent.capability_id!=='governed-original-discovery'||
    intent.kind!=='WORK_REQUEST'||intent.action_eligible!==true)
  return Object.freeze({...common,status:'CHAT_WORK_NOT_EXECUTABLE'});
 let eligible=null;
 try{eligible=await readBuild({session})}catch{
  return Object.freeze({...common,status:'CHAT_WORK_EXECUTOR_READBACK_UNAVAILABLE'});
 }
 const sameConversation=eligible?.original_conversation_id===conversationId;
 if(sameConversation&&eligible?.queued===true&&workId(eligible.original_work_id))
  return Object.freeze({...common,status:'ORIGINAL_JOB_ALREADY_QUEUED',
   original_work_id:eligible.original_work_id});
 const ready=sameConversation&&eligible?.phase==='NOT_QUEUED'&&
  eligible.eligible_for_investigation===true&&workId(eligible.original_work_id);
 if(ready)return Object.freeze({...common,
  status:'EXISTING_ORIGINAL_DISCOVERY_ELIGIBLE',
  action_eligible:true,original_work_id:eligible.original_work_id});
 return Object.freeze({...common,status:'CHAT_WORK_NEEDS_A_VERIFIED_EXECUTION_ADAPTER',
  capability_gap:true});
}
export async function authorizeSavedChatExistingOriginal({
 session,conversationId,requestId,messages,
 inspect=inspectSavedChatWork,queue=queueOwnerGovernedBuild
}={}){
 const state=await inspect({session,conversationId,requestId,messages});
 if(state.status!=='EXISTING_ORIGINAL_DISCOVERY_ELIGIBLE'||
    state.action_eligible!==true||
    state.capability_id!=='governed-original-discovery')
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
  capability_id:'governed-original-discovery',
  queue_id:response.queue_id||null,
  dispatch_requested:response.worker_dispatch_started===true,
  worker_execution_verified:false,execution_started:false,
  installation_authorized:false,production_changed:false});
}
