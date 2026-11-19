// Existing signed owner maintenance executor -> independent GitHub Actions
// case-CI trigger. No test verdict, model repair, install, or original settlement.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/;
const SHA=/^[a-f0-9]{40}$/;
const SOURCE=/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/;
const ACTION='RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED';
const safe=(status,other={})=>Object.freeze({
 status,...other,case_ci_red_verified:false,repair_executed:false,
 original_job_completed:false,installation_authorized:false,
 production_changed:false,new_shift_started:false
});
const fail=x=>{throw Error('SIGNED_MAINTENANCE_CI_EXECUTOR_'+x)};
export async function executeOneRegisteredMaintenanceCiWake({
 db,env=process.env,shiftId,workerRunId,fetchImpl=fetch,call=shiftRpc
}={}){
 if(env.VERCEL_ENV!=='preview'||!db?.strictSecrets||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  typeof db.url!=='string'||!db.url.startsWith('https://')||
  typeof db.secretKey!=='string'||db.secretKey.length<24||
  !UUID.test(shiftId||'')||!UUID.test(workerRunId||'')||
  typeof fetchImpl!=='function'||typeof call!=='function')
  fail('EXACT_SIGNED_SHIFT_AND_SERVICE_REQUIRED');
 const claim=await call(db,'reality_claim_registered_maintenance_action_v2',{
  p_shift_id:shiftId,p_worker_run_id:workerRunId,
  p_registered_action:ACTION
 },{fetchImpl});
 if(['NO_UNCLAIMED_AUTHORIZED_MAINTENANCE_EXECUTOR',
  'SIGNED_MAINTENANCE_ACTION_NOT_YET_EXECUTABLE'].includes(claim?.status)&&
  claim.original_job_completed===false&&
  claim.installation_authorized===false&&claim.production_changed===false&&
  claim.repair_executed===false)
  return safe(claim.status,{claim_consumed:false,next_action:claim.next_action||null});
 if(claim?.status!=='SIGNED_MAINTENANCE_EXECUTOR_DURABLY_CLAIMED'||
  !UUID.test(claim.maintenance_id||'')||
  claim.shift_id!==shiftId||claim.worker_run_id!==workerRunId||
  claim.next_action!==ACTION||
  !SOURCE.test(claim.source_ref||'')||
  !HASH.test(claim.source_epoch_receipt_sha256||'')||
  !Number.isInteger(claim.claim_attempt)||claim.claim_attempt<1||claim.claim_attempt>3||
  !Number.isFinite(Date.parse(claim.lease_expires_at||''))||
  Date.parse(claim.lease_expires_at)<=Date.now()||
  claim.handoff_executed!==false||
  claim.independent_frozen_ci_red_verified!==false||
  claim.original_job_completed!==false||
  claim.installation_authorized!==false||
  claim.production_changed!==false)
  fail('EXACT_OWNER_SIGNED_CI_CLAIM_NOT_VERIFIED');
 async function rejectClaim(code){
  let failure;
  try{
   failure=await call(db,'reality_record_signed_maintenance_executor_failure_v1',{
    p_maintenance_id:claim.maintenance_id,
    p_worker_run_id:workerRunId,p_error_code:code
   },{fetchImpl});
  }catch{return safe('MAINTENANCE_CI_FAILURE_RECONCILIATION_UNAVAILABLE',{
    maintenance_id:claim.maintenance_id});}
  if(!['MAINTENANCE_FAILURE_RECORDED_RETRYABLE',
   'MAINTENANCE_RETRY_LIMIT_REACHED'].includes(failure?.status)||
   failure.maintenance_id!==claim.maintenance_id||
   failure.shift_id!==shiftId||
   failure.repair_executed!==false||
   failure.original_job_completed!==false||failure.production_changed!==false)
   return safe('MAINTENANCE_CI_FAILURE_RECEIPT_UNVERIFIED');
  return safe(failure.status,{maintenance_id:claim.maintenance_id,
   error_code:code,claim_attempt:claim.claim_attempt,
   next_action:'RECONCILE_EXACT_PROVIDER_DELIVERY_BEFORE_RETRY'});
 }
 let res,record;
 try{
  res=await fetchImpl(db.url+
   '/functions/v1/reality-signed-maintenance-case-ci-broker-v1',{
    method:'POST',redirect:'error',cache:'no-store',
    signal:AbortSignal.timeout(38000),
    headers:{apikey:db.secretKey,
     authorization:'Bearer '+db.secretKey,
     'content-type':'application/json'},
    body:JSON.stringify({shift_id:shiftId,
     maintenance_id:claim.maintenance_id,worker_run_id:workerRunId})
   });
  record=await res.json().catch(()=>null);
 }catch{return rejectClaim('MAINTENANCE_CI_BROKER_TRANSPORT_UNAVAILABLE');}
 if(!res?.ok||record?.ok!==true||
  record.status!=='SIGNED_MAINTENANCE_CASE_CI_DISPATCH_CONFIRMED_RED_NOT_VERIFIED'||
  record.maintenance_id!==claim.maintenance_id||
  record.shift_id!==shiftId||
  record.source_ref!==claim.source_ref||
  !SHA.test(record.github_trigger_commit_sha||'')||
  !HASH.test(record.ci_dispatch_receipt_sha256||'')||
  record.frozen_ci_red_verified!==false||
  record.repair_executed!==false||
  record.original_job_completed!==false||
  record.installation_authorized!==false||
  record.production_changed!==false)
  return rejectClaim('MAINTENANCE_CI_DELIVERY_UNVERIFIED');
 return safe(record.status,{
  shift_id:shiftId,maintenance_id:claim.maintenance_id,
  source_ref:claim.source_ref,
  github_trigger_commit_sha:record.github_trigger_commit_sha,
  ci_dispatch_receipt_sha256:record.ci_dispatch_receipt_sha256,
  case_ci_dispatch_confirmed:true,
  next_action:'INDEPENDENT_GITHUB_CI_RUN_AND_FROZEN_RED_VERIFICATION_REQUIRED'
 });
}
