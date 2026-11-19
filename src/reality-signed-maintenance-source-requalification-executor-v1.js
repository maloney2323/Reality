// The existing signed Reality maintenance claim -> ONE registered executable
// action: independently re-read a changed GitHub source and durably record
// requalification. Not a code repair, frozen CI RED, install or settlement.
// Unsupported case-specific CI work is never leased or charged a retry.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {readFreshEmployeeInquirySource}
 from './reality-dynamic-employee-inquiry-worker-v1.js';
const UUID=/^[a-f0-9]{8}-(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/;
const REF=/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9][0-9]*$/;
const ACTION='REQUALIFY_CHANGED_MAINTENANCE_SOURCE_BEFORE_CI';
const safe=(status,more={})=>Object.freeze({
 status,...more,repair_executed:false,frozen_ci_red_verified:false,
 original_job_completed:false,installation_authorized:false,
 production_changed:false,new_shift_started:false
});
const fail=x=>{throw Error('SIGNED_MAINTENANCE_REQUALIFICATION_'+x)};
export async function executeOneRegisteredMaintenanceAction({
 db,env=process.env,shiftId,workerRunId,fetchImpl=fetch,
 call=shiftRpc,readSource=readFreshEmployeeInquirySource
}={}){
 if(env.VERCEL_ENV!=='preview'||!db?.strictSecrets||!db.secretKey||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  !UUID.test(shiftId||'')||!UUID.test(workerRunId||'')||
  typeof call!=='function'||typeof readSource!=='function'||
  typeof fetchImpl!=='function')
  fail('EXACT_SIGNED_PREVIEW_SCOPE_REQUIRED');
 const claim=await call(db,'reality_claim_registered_maintenance_action_v2',{
  p_shift_id:shiftId,p_worker_run_id:workerRunId,
  p_registered_action:ACTION
 },{fetchImpl});
 if(['NO_UNCLAIMED_AUTHORIZED_MAINTENANCE_EXECUTOR',
     'SIGNED_MAINTENANCE_ACTION_NOT_YET_EXECUTABLE'].includes(claim?.status)&&
    claim.repair_executed===false&&
    claim.original_job_completed===false&&
    claim.installation_authorized===false&&
    claim.production_changed===false)
  return safe(claim.status,{
   claim,claim_consumed:false,
   outcome:safe('NO_REGISTERED_MAINTENANCE_ACTION_EXECUTED'),
   ...(claim.next_action?{next_action:claim.next_action}:{})
  });
 if(claim?.status!=='SIGNED_MAINTENANCE_EXECUTOR_DURABLY_CLAIMED'||
  !UUID.test(claim.maintenance_id||'')||
  claim.shift_id!==shiftId||claim.worker_run_id!==workerRunId||
  claim.next_action!==ACTION||
  !REF.test(claim.source_ref||'')||
  !HASH.test(claim.source_epoch_receipt_sha256||'')||
  !Number.isInteger(claim.claim_attempt)||claim.claim_attempt<1||
  claim.claim_attempt>3||
  !Number.isFinite(Date.parse(claim.lease_expires_at||''))||
  Date.parse(claim.lease_expires_at)<=Date.now()||
  claim.handoff_executed!==false||
  claim.independent_frozen_ci_red_verified!==false||
  claim.original_job_completed!==false||
  claim.installation_authorized!==false||
  claim.production_changed!==false)
  fail('CLAIM_NOT_EXACT_OWNER_WARRANTED_ACTION');
 const markFailure=async errorCode=>{
  let outcome;
  try{
   outcome=await call(db,'reality_record_signed_maintenance_executor_failure_v1',{
    p_maintenance_id:claim.maintenance_id,
    p_worker_run_id:workerRunId,p_error_code:errorCode
   },{fetchImpl});
  }catch{
   return safe('REQUALIFICATION_FAILURE_RECONCILIATION_UNAVAILABLE',{
    claim,outcome:safe('SOURCE_REQUALIFICATION_UNVERIFIED')
   });
  }
  if(!['MAINTENANCE_FAILURE_RECORDED_RETRYABLE',
      'MAINTENANCE_RETRY_LIMIT_REACHED'].includes(outcome?.status)||
   outcome.maintenance_id!==claim.maintenance_id||
   outcome.shift_id!==shiftId||
   outcome.repair_executed!==false||
   outcome.original_job_completed!==false||
   outcome.production_changed!==false)
   return safe('REQUALIFICATION_FAILURE_RECEIPT_UNVERIFIED',{
    claim,outcome:safe('SOURCE_REQUALIFICATION_UNVERIFIED')
   });
  return safe('SOURCE_REQUALIFICATION_RETRYABLE_FAILURE',{
   claim,outcome,error_code:errorCode
  });
 };
 let first,second;
 try{
  const token=String(env.REALITY_GITHUB_TOKEN||'').trim();
  first=await readSource(claim.source_ref,{fetchImpl,token});
  second=await readSource(claim.source_ref,{fetchImpl,token});
 }catch{return markFailure('SOURCE_PROVIDER_READBACK_UNAVAILABLE');}
 if(first?.source_ref!==claim.source_ref||
    second?.source_ref!==claim.source_ref||
    !HASH.test(first.provider_proof_sha256||'')||
    !HASH.test(second.provider_proof_sha256||'')||
    first.provider_proof_sha256!==second.provider_proof_sha256||
    !Number.isFinite(Date.parse(first.checked_at||''))||
    !Number.isFinite(Date.parse(second.checked_at||'')))
  return markFailure('SOURCE_CHANGED_DURING_REQUALIFICATION');
 const recorded=await call(db,
  'reality_record_signed_maintenance_source_requalification_v1',{
   p_maintenance_id:claim.maintenance_id,
   p_worker_run_id:workerRunId,
   p_provider_sha256:second.provider_proof_sha256,
   p_checked_at:second.checked_at
  },{fetchImpl});
 if(recorded?.status!==
    'SIGNED_MAINTENANCE_SOURCE_REQUALIFIED_CI_RED_STILL_REQUIRED'||
   recorded.maintenance_id!==claim.maintenance_id||
   recorded.shift_id!==shiftId||
   recorded.source_ref!==claim.source_ref||
   recorded.historical_epoch_receipt_sha256!==
    claim.source_epoch_receipt_sha256||
   recorded.verified_current_source_sha256!==second.provider_proof_sha256||
   !HASH.test(recorded.source_requalification_receipt_sha256||'')||
   recorded.independent_signed_worker_run_id!==workerRunId||
   recorded.source_requalified!==true||
   recorded.frozen_ci_red_verified!==false||
   recorded.repair_executed!==false||
   recorded.original_job_completed!==false||
   recorded.installation_authorized!==false||
   recorded.production_changed!==false)
  fail('DURABLE_SOURCE_REQUALIFICATION_PROOF_UNTRUSTED');
 return safe(recorded.status,{
  maintenance_id:claim.maintenance_id,shift_id:shiftId,
  claim,outcome:recorded,
  source_requalified:true,claim_consumed:true,
  source_requalification_receipt_sha256:
   recorded.source_requalification_receipt_sha256,
  next_action:'CASE_SPECIFIC_INDEPENDENT_FROZEN_CI_RED_REQUIRED'
 });
}
