// REAL customer internal job -> verified missing ability -> durable capability
// queue. No dashboard or manually authored GitHub issue in this path.
// External connector writes, uncertain provider effects and owner approvals
// remain governed by their existing separate execution boundaries.
import {executeAuthorizedWork} from './reality-governed-execution-engine-v0.1.js';
import {createGenuinePreviewLiveIntake}
 from './reality-genuine-capability-preview-intake-v1.js';
const WORK=/^work:[a-f0-9]{32}$/;
const fail=x=>{throw Error('GENUINE_EXECUTION_RUNTIME_'+x)};
export function createGenuineOriginalWorkRunner({
 session,conversationId,env=process.env,
 loadAuthorizedInternalJob,makeProviderReadback,workerWake,
 runExecution=executeAuthorizedWork,
 makeLiveIntake=createGenuinePreviewLiveIntake,
}={}){
 if(typeof loadAuthorizedInternalJob!=='function'||
  typeof makeProviderReadback!=='function'||
  typeof workerWake!=='function'||
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
   capability_response:result.self_repair?.status||null,
   original_job_completed:false,
   new_job_created:false,
   production_changed:false,
  });
 };
}
