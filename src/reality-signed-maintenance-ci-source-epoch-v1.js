// Signed maintenance -> fresh provider source epoch. Neither CI success nor install.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {readFreshEmployeeInquirySource} from './reality-dynamic-employee-inquiry-worker-v1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/;
const SOURCE=/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9][0-9]*$/;
const hold=(status,other={})=>Object.freeze({status,...other,
 source_current_epoch_verified:false,independent_frozen_ci_red_verified:false,
 repair_executed:false,original_job_completed:false,installation_authorized:false,
 production_changed:false,new_shift_started:false});
const fail=x=>{throw Error('SIGNED_MAINTENANCE_CI_SOURCE_'+x)};
export async function attestOneSignedMaintenanceCiSourceEpoch({
 db,env=process.env,shiftId,workerRunId,preflight,
 call=shiftRpc,readSource=readFreshEmployeeInquirySource,fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||!db?.strictSecrets||!db.secretKey||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
    !UUID.test(shiftId||'')||!UUID.test(workerRunId||'')||
    typeof call!=='function'||typeof readSource!=='function'||
    typeof fetchImpl!=='function')fail('SIGNED_OWNER_AND_ENVIRONMENT_REQUIRED');
 if(['NO_SIGNED_MAINTENANCE_FROZEN_CI_SCOPE',
      'SIGNED_MAINTENANCE_CI_PREFLIGHT_PROOF_UNAVAILABLE',
      'NO_CURRENT_SIGNED_MAINTENANCE_CI_PREFLIGHT'].includes(preflight?.status))
  return hold(preflight.status,{maintenance_source_attestation_attempted:false});
 if(preflight?.status!=='SIGNED_MAINTENANCE_CI_PREFLIGHT_NEEDS_SOURCE_ATTESTATION'||
    preflight.shift_id!==shiftId||
    !UUID.test(preflight.owner_id||'')||
    !UUID.test(preflight.maintenance_id||'')||
    !UUID.test(preflight.origin_shift_id||'')||
    !SOURCE.test(preflight.source_ref||'')||
    !HASH.test(preflight.independent_review_receipt_sha256||'')||
    !HASH.test(preflight.independent_failure_baseline_receipt_sha256||'')||
    !HASH.test(preflight.historical_source_sha256||'')||
    preflight.source_current_epoch_verified!==false||
    preflight.executable_frozen_ci_red_verified!==false||
    preflight.repair_executed!==false||
    preflight.original_job_completed!==false||
    preflight.installation_authorized!==false||
    preflight.production_changed!==false)
  fail('EXACT_SIGNED_OWNER_BASELINE_UNTRUSTED');
 let first,second;
 try{
  const token=String(env.REALITY_GITHUB_TOKEN||'').trim();
  first=await readSource(preflight.source_ref,{fetchImpl,token});
  second=await readSource(preflight.source_ref,{fetchImpl,token});
 }catch{
  return hold('SIGNED_MAINTENANCE_CI_PROVIDER_READBACK_UNAVAILABLE',{
   maintenance_id:preflight.maintenance_id,
   maintenance_source_attestation_attempted:true});
 }
 if(first?.source_ref!==preflight.source_ref||
    second?.source_ref!==preflight.source_ref||
    !HASH.test(first?.provider_proof_sha256||'')||
    !HASH.test(second?.provider_proof_sha256||'')||
    first.provider_proof_sha256!==second.provider_proof_sha256||
    !Number.isFinite(Date.parse(first.checked_at||''))||
    !Number.isFinite(Date.parse(second.checked_at||'')))
  return hold('SIGNED_MAINTENANCE_CI_PROVIDER_EPOCH_NOT_STABLE',{
   maintenance_id:preflight.maintenance_id,
   maintenance_source_attestation_attempted:true});
 const recorded=await call(db,'reality_record_signed_maintenance_ci_source_epoch_v1',{
  p_shift_id:shiftId,p_worker_run_id:workerRunId,
  p_maintenance_id:preflight.maintenance_id,
  p_source_ref:preflight.source_ref,
  p_provider_sha256:second.provider_proof_sha256,
  p_checked_at:second.checked_at
 },{fetchImpl});
 const status=second.provider_proof_sha256===preflight.historical_source_sha256?
  'SOURCE_EPOCH_ATTESTED_EXECUTABLE_RED_REQUIRED':
  'SOURCE_EPOCH_CHANGED_REQUALIFICATION_REQUIRED';
 if(recorded?.status!==status||recorded.owner_id!==preflight.owner_id||
   recorded.shift_id!==shiftId||recorded.worker_run_id!==workerRunId||
   recorded.maintenance_id!==preflight.maintenance_id||
   recorded.origin_shift_id!==preflight.origin_shift_id||
   recorded.source_ref!==preflight.source_ref||
   recorded.historical_baseline_receipt_sha256!==
      preflight.independent_failure_baseline_receipt_sha256||
   recorded.historical_source_sha256!==preflight.historical_source_sha256||
   recorded.current_provider_sha256!==second.provider_proof_sha256||
   !HASH.test(recorded.source_epoch_receipt_sha256||'')||
   recorded.source_current_epoch_verified!==
      (status==='SOURCE_EPOCH_ATTESTED_EXECUTABLE_RED_REQUIRED')||
   recorded.independent_frozen_ci_red_verified!==false||
   recorded.repair_executed!==false||
   recorded.original_job_completed!==false||
   recorded.installation_authorized!==false||
   recorded.production_changed!==false)
   fail('DURABLE_SOURCE_EPOCH_RECEIPT_UNTRUSTED');
 return Object.freeze({
  status:recorded.status,owner_id:recorded.owner_id,
  shift_id:recorded.shift_id,origin_shift_id:recorded.origin_shift_id,
  maintenance_id:recorded.maintenance_id,source_ref:recorded.source_ref,
  source_epoch_receipt_sha256:recorded.source_epoch_receipt_sha256,
  source_current_epoch_verified:recorded.source_current_epoch_verified,
  maintenance_source_attestation_attempted:true,
  same_maintenance_job_preserved:true,new_shift_started:false,
  independent_frozen_ci_red_verified:false,next_action:recorded.next_action,
  repair_executed:false,original_job_completed:false,
  installation_authorized:false,production_changed:false
 });
}
