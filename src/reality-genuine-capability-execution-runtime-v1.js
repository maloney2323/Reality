// REAL customer internal job -> verified missing ability -> durable capability
// queue. No dashboard or manually authored GitHub issue in this path.
// External connector writes, uncertain provider effects and owner approvals
// remain governed by their existing separate execution boundaries.
import {executeAuthorizedWork} from './reality-governed-execution-engine-v0.1.js';
import {createGenuinePreviewLiveIntake}
 from './reality-genuine-capability-preview-intake-v1.js';
import {classifyGenuineExecutionFailure}
 from './reality-genuine-capability-failure-classifier-v1.js';
const WORK=/^work:[a-f0-9]{32}$/;
const fail=x=>{throw Error('GENUINE_EXECUTION_RUNTIME_'+x)};
export function createGenuineOriginalWorkRunner({
 session,conversationId,env=process.env,
 loadAuthorizedInternalJob,makeProviderReadback,workerWake=null,
 runExecution=executeAuthorizedWork,
 makeLiveIntake=createGenuinePreviewLiveIntake,
}={}){
 if(typeof loadAuthorizedInternalJob!=='function'||
  typeof makeProviderReadback!=='function'||
  (workerWake!==null&&typeof workerWake!=='function')||
  typeof runExecution!=='function'||typeof makeLiveIntake!=='function')
  fail('TRUSTED_SERVER_ADAPTERS_REQUIRED');
 return async function executeOriginal({originalWorkId}={}){
  if(!WORK.test(originalWorkId))
   fail('ORIGINAL_WORK_ID_REQUIRED');
  // A browser must never provide workItem, connector, verifier, authorizer,
  // goal, evidence, or job id from a model-generated suggestion.
  const job=await loadAuthorizedInternalJob(Object.freeze({
   original_work_id:originalWorkId,owner_id:session?.user_id,
   conversation_id:conversationId,read_only:true,
  }));
  if(job?.original_work_id!==originalWorkId||
   job?.work_item?.work_item_id!==originalWorkId||
   job.work_item.workflow_id!=='workflow:'+originalWorkId||
   job.work_item.connector!=null||
   job.work_item.consequential===true||
   job.execution_previously_completed===true||
   job.goal_still_authorized!==true||
   job.original_job_settled!==false||
   job.owner_id!==session?.user_id||
   job.conversation_id!==conversationId||
   typeof job.connector?.execute!=='function'||
   typeof job.independent_verifier?.verify!=='function'||
   !job.authorization?.authorization_id)
   fail('CURRENT_AUTHORIZED_INTERNAL_ORIGINAL_JOB_REQUIRED');
  const intake=makeLiveIntake({
   session,conversationId,env,
   providerReadback:makeProviderReadback(job),
   workerWake,
  });
  const result=await runExecution({
   workItem:job.work_item,workflowId:job.work_item.workflow_id,
   authorization:job.authorization,connector:job.connector,
   independentVerifier:job.independent_verifier,
   originalWorkId,onVerifiedCapabilityGap:intake,
  });
  if(result?.status!=='UNRESOLVED'&&result?.status!=='VERIFIED'&&
     result?.status!=='BLOCKED')
   fail('EXECUTION_OUTCOME_UNTRUSTED');
  // A capability gap starts investigation; it never upgrades the failed
  // execution to VERIFIED, manufactures customer acceptance or authorizes
  // external actions. Its original execution remains unresolved.
  if(result.self_repair&&(
   result.status!=='UNRESOLVED'||
   result.self_repair.original_work_id!==originalWorkId||
   result.self_repair.new_job_created!==false||
   result.self_repair.original_job_completed!==false))
   fail('ORIGINAL_EXECUTION_NOT_PRESERVED');
  return Object.freeze({
   original_work_id:originalWorkId,
   execution_status:result.status,
   failure_diagnosis:result.capability_diagnosis||
    classifyGenuineExecutionFailure({result,originalWorkId}),
   capability_response:result.self_repair?.status||null,
   independent_source_readback_error_code:
    /^GENUINE_SOURCE_JOB_[A-Z0-9_]{3,110}$/.test(
     String(result.independent_source_readback_error_code||''))?
      result.independent_source_readback_error_code:null,
   // Only source-bound queue and OIDC wake receipts; neither authorizes
   // generation, installation, cross-tenant reuse or original settlement.
   queue_trigger_id:result.self_repair?.queue_trigger_id||null,
   worker_wake_status:result.self_repair?.wake_status||null,
   value_passport_status:result.self_repair?.value_passport_status||null,
   // Report a trusted intake failure without leaking arbitrary exceptions.
   intake_attempted:result.self_repair?.intake_attempted===true,
   handoff_error_code:result.self_repair?.status==='REPAIR_HANDOFF_NEEDS_RECONCILIATION'
    &&/^(?:GENUINE_CAPABILITY_INTAKE_|GENUINE_PREVIEW_|GENUINE_WAKE_DISPATCH_|GENUINE_EXECUTION_RUNTIME_|GENUINE_CAPABILITY_)[A-Z0-9_]{3,100}$/.test(
     String(result.self_repair.handoff_error_code||''))
     ?result.self_repair.handoff_error_code:
      result.self_repair?.status==='REPAIR_HANDOFF_NEEDS_RECONCILIATION'
       ?'REPAIR_HANDOFF_UNTRUSTED_FAILURE':null,
   original_job_completed:false,
   new_job_created:false,
   production_changed:false,
  });
 };
}
