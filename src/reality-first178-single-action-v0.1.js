// Single signed-in customer action for the SAME original #178 job.
// This is an orchestration entry point, not a second lifecycle controller.
// The existing constitutional driver owns generation, sandbox and state.
// No install, production write, capability registration or settlement adapter.
import {inspectFirstUpgrade178,startFirstUpgrade178}
 from './reality-personal-first-upgrade-178-v0.1.js';
import {executeFirst178Constitutional}
 from './reality-first178-constitutional-executor-v0.1.js';

const stop=(code,status=409)=>{
 throw Object.assign(Error('FIRST178_SINGLE_ACTION_'+code),{status});
};
export async function runFirst178SingleAction({
 session,conversationId,env=process.env,
 inspect=inspectFirstUpgrade178,start=startFirstUpgrade178,
 execute=executeFirst178Constitutional,
}={}){
 const current=await inspect({session,conversationId,env});
 if(current?.issue_number!==178||
    current?.installation_authorized!==false||
    current?.job_completed!==false||
    !/^work:[a-f0-9]{32}$/.test(current.original_work_id||''))
  stop('VERIFIED_ORIGINAL_SCOPE_REQUIRED');
 const workId=current.original_work_id;
 let source=current;
 if(current.status==='READY_FOR_EXACT_OWNER_CONFIRMATION'){
  source=await start({session,conversationId,env});
  if(source?.status!=='QUEUED_DIRECT_CONSTITUTIONAL'||
     source.original_work_id!==workId||
     source.installation_authorized!==false||
     !source.queue_id||!source.continuity_work_receipt_id)
   stop('SOURCE_WORK_ADMISSION_UNVERIFIED',503);
 }else if(current.status==='ALREADY_QUEUED'){
  if(current.queue_phase!=='QUEUED_DISCOVERY'){
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
  if(!current.queue_id)stop('EXISTING_QUEUE_RECEIPT_REQUIRED');
 }else{
  stop('NOT_READY_'+String(current.status||'UNKNOWN').replace(/[^A-Z0-9_]/g,'_'));
 }
 const result=await execute({session,conversationId,env});
 if(result?.original_work_id!==workId||
    result?.installation_authorized!==false||
    result?.capability_installed!==false||
    result?.original_job_completed!==false)
  stop('CONSTITUTIONAL_EXECUTION_RESULT_UNVERIFIED',503);
 return Object.freeze({...result,existing_work:false,
  installation_authorized:false,capability_installed:false,
  original_job_completed:false,production_changed:false});
}
