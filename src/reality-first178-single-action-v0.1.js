// Single signed-in customer action for the SAME original #178 job.
// This is an orchestration entry point, not a second lifecycle controller.
// The existing constitutional driver owns generation, sandbox and state.
// No install, production write, capability registration or settlement adapter.
import {inspectFirstUpgrade178,startFirstUpgrade178}
 from './reality-personal-first-upgrade-178-v0.1.js';
import {executeFirst178Constitutional}
 from './reality-first178-constitutional-executor-v0.1.js';
import {dbFor,rpc}
 from './reality-personal-first-upgrade-178-v0.1.js';
import {validUuid}
 from './reality-private-chat-store-v0.1.js';

const stop=(code,status=409)=>{
 throw Object.assign(Error('FIRST178_SINGLE_ACTION_'+code),{status});
};
// Existing owner-original work always wins over a different conversation
// selected by the browser. No cross-owner or unverified-goal promotion.
export async function resolveOriginalFirst178OwnerQueue({
 session,env=process.env,call=rpc,dbReader=dbFor,
}={}){
 if(!validUuid(session?.user_id))
  stop('AUTHENTICATED_OWNER_REQUIRED',401);
 const data=await call(dbReader(session,env),
  'reality_read_first178_owner_queue_v1',{
   p_owner_id:session.user_id,
  });
 if(!data||typeof data!=='object'||Array.isArray(data))
  stop('OWNER_QUEUE_READBACK_INVALID',503);
 if(!data.queue_id)return null;
 if(data.verified_owner!==session.user_id||
    data.issue_number!==178||
    !validUuid(data.conversation_id)||
    !validUuid(data.queue_id)||
    !/^work:[a-f0-9]{32}$/.test(data.original_work_id||'')||
    data.installation_authorized!==false||
    data.original_job_completed!==false)
  stop('OWNER_ORIGINAL_WORK_SCOPE_MISMATCH',503);
 return Object.freeze(data);
}
export async function runFirst178SingleAction({
 session,conversationId,env=process.env,
 inspect=inspectFirstUpgrade178,start=startFirstUpgrade178,
 execute=executeFirst178Constitutional,
 resolveOriginal=resolveOriginalFirst178OwnerQueue,
}={}){
 const original=await resolveOriginal({session,conversationId,env});
 const selected=original?.conversation_id||conversationId;
 if(!validUuid(selected))
  stop('ORIGINAL_CONVERSATION_INVALID',401);
 const current=await inspect({session,conversationId:selected,env});
 if(original&&(current.original_work_id!==original.original_work_id||
    current.goal_id!==original.goal_id||
    current.queue_id!==original.queue_id||
    current.status!=='ALREADY_QUEUED'))
  stop('CANONICAL_ORIGINAL_OWNER_GOAL_CHANGED',409);
 if(current?.issue_number!==178||
    current?.installation_authorized!==false||
    current?.job_completed!==false||
    !/^work:[a-f0-9]{32}$/.test(current.original_work_id||''))
  stop('VERIFIED_ORIGINAL_SCOPE_REQUIRED');
 const workId=current.original_work_id;
 let source=current;
 if(current.status==='READY_FOR_EXACT_OWNER_CONFIRMATION'){
  source=await start({session,conversationId:selected,env});
  if(source?.status!=='QUEUED_DIRECT_CONSTITUTIONAL'||
     source.original_work_id!==workId||
     source.installation_authorized!==false||
     !source.queue_id||!source.continuity_work_receipt_id)
   stop('SOURCE_WORK_ADMISSION_UNVERIFIED',503);
 }else if(current.status==='ALREADY_QUEUED'){
  if(!['QUEUED_DISCOVERY','RUNNING_CONSTITUTIONAL'].includes(
    current.queue_phase)){
   // Never retry a consumed/ambiguous execution claim. Show its recorded
   // state, and leave recovery to the same constitutional journal.
   return Object.freeze({
    status:current.queue_phase||'EXISTING_WORK_UNRESOLVED',
    original_work_id:workId,queue_id:current.queue_id,
    checkpoint_receipt_id:current.checkpoint_receipt_id||null,
    checkpoint_hash:current.checkpoint_hash||null,
    owner_approval_required:current.owner_approval_required===true,
    installation_authorized:false,capability_installed:false,
    original_job_completed:false,production_changed:false,
    existing_work:true,do_not_retry:true,
   });
  }
  // An already running constitutional claim can only proceed through
  // the exact independent GAP checkpoint + one-time PostgreSQL recovery
  // reservation. The executor never claims the work a second time.
  if(!current.queue_id)stop('EXISTING_QUEUE_RECEIPT_REQUIRED');
 }else{
  stop('NOT_READY_'+String(current.status||'UNKNOWN').replace(/[^A-Z0-9_]/g,'_'));
 }
 const result=await execute({session,conversationId:selected,env});
 if(result?.original_work_id!==workId||
    result?.installation_authorized!==false||
    result?.capability_installed!==false||
    result?.original_job_completed!==false)
  stop('CONSTITUTIONAL_EXECUTION_RESULT_UNVERIFIED',503);
 return Object.freeze({...result,existing_work:Boolean(original),
  same_original_owner_job:true,
  installation_authorized:false,capability_installed:false,
  original_job_completed:false,production_changed:false});
}
