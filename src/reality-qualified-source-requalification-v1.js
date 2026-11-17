// Singleflight automatic requalification for a same original read-only job
// when its live GitHub source changed between signed executor and reviewer.
// The previous failed receipt is durably preserved before any requalification.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {readFreshEmployeeInquirySource} from './reality-dynamic-employee-inquiry-worker-v1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA=/^sha256:[a-f0-9]{64}$/;
const SOURCE=/^https:\/\/github\.com\/[^/]+\/[^/]+\/(issues|pull)\/[1-9][0-9]*$/;
const safe=(status,fields={})=>Object.freeze({
 status,...fields,original_customer_job_completed:false,
 installation_authorized:false,production_changed:false,
 code_self_repair_proven:false
});
const fail=s=>{throw Error('SAME_JOB_CHANGED_SOURCE_REQUALIFICATION_'+s)};
export async function requalifyOneChangedEmployeeSource({
 db,env=process.env,shiftId,workerRunId,call=shiftRpc,
 fetchImpl=fetch,readSource=readFreshEmployeeInquirySource
}={}){
 if(env.VERCEL_ENV!=='preview'||!db?.strictSecrets||!db.secretKey||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  !UUID.test(shiftId||'')||!UUID.test(workerRunId||'')||
  typeof call!=='function'||typeof fetchImpl!=='function'||
  typeof readSource!=='function')fail('SIGNED_OWNER_BOUNDARY');
 const claim=await call(db,'reality_claim_changed_qualified_evidence_source_v1',{
  p_shift_id:shiftId,p_worker_run_id:workerRunId
 },{fetchImpl});
 if(['NO_CHANGED_SOURCE_REQUALIFICATION_READY',
  'NO_CURRENT_SIGNED_SOURCE_REQUALIFICATION_SCOPE'].includes(claim?.status)&&
  claim.installation_authorized===false&&
  claim.production_changed===false)
  return safe(claim.status,{requalification_performed:false});
 if(claim?.status!=='CHANGED_QUALIFIED_SOURCE_SIGNED_REQUALIFICATION_CLAIMED'||
  !UUID.test(claim.job_id||'')||!UUID.test(claim.owner_id||'')||
  claim.shift_id!==shiftId||
  !UUID.test(claim.claim_id||'')||
  claim.worker_run_id!==workerRunId||
  !SOURCE.test(claim.source_ref||'')||
  !SHA.test(claim.first_source_sha256||'')||
  !SHA.test(claim.changed_review_sha256||'')||
  !SHA.test(claim.original_independent_receipt_sha256||'')||
  claim.first_source_sha256===claim.changed_review_sha256||
  typeof claim.original_title!=='string'||
  !Number.isFinite(Date.parse(claim.original_source_updated_at||''))||
  claim.requalification_attempts_remaining!==1||
  claim.installation_authorized!==false||
  claim.production_changed!==false||
  claim.original_customer_job_completed!==false)
  fail('EXACT_FAILED_SOURCE_AND_WARRANT_REQUIRED');
 let source;
 try{
  source=await readSource(claim.source_ref,{
   fetchImpl,token:String(env.REALITY_GITHUB_TOKEN||'').trim()
  });
 }catch{
  return safe('CHANGED_SOURCE_REQUALIFICATION_PROVIDER_BLOCKED',{
   job_id:claim.job_id,
   next_action:'WATCHDOG_FENCES_SINGLEFLIGHT_FAILED_SOURCE_REQUALIFICATION'
  });
 }
 if(source?.source_ref!==claim.source_ref||
  !SHA.test(source.provider_proof_sha256||'')||
  typeof source.source_title!=='string'||
  !Number.isFinite(Date.parse(source.provider_updated_at||''))||
  !Number.isFinite(Date.parse(source.checked_at||'')))
  fail('CURRENT_SOURCE_READBACK_UNVERIFIED');
 const receipt=await call(db,'reality_record_changed_qualified_evidence_source_v1',{
  p_job_id:claim.job_id,
  p_claim_id:claim.claim_id,
  p_worker_run_id:workerRunId,
  p_source_ref:claim.source_ref,
  p_source_title:source.source_title,
  p_source_updated_at:source.provider_updated_at,
  p_checked_at:source.checked_at,
  p_current_provider_sha256:source.provider_proof_sha256
 },{fetchImpl});
 if(receipt?.status==='CHANGED_SOURCE_REQUALIFICATION_NOT_STABLE'&&
  receipt.job_id===claim.job_id&&
  receipt.installation_authorized===false&&
  receipt.production_changed===false&&
  receipt.original_customer_job_completed===false)
  return safe(receipt.status,{
   job_id:claim.job_id,
   next_action:'SOURCE_CHANGED_AGAIN_OR_TITLE_CHANGED_REVIEW_REQUIRED'
  });
 if(receipt?.status!=='SAME_QUALIFIED_EVIDENCE_JOB_REQUALIFIED'||
  receipt.job_id!==claim.job_id||
  receipt.owner_id!==claim.owner_id||
  receipt.shift_id!==shiftId||
  !SHA.test(receipt.requalification_receipt_sha256||'')||
  receipt.original_failed_receipt_preserved!==true||
  receipt.execution_authorized_by_existing_shift!==true||
  receipt.independent_final_verification_required!==true||
  receipt.installation_authorized!==false||
  receipt.production_changed!==false||
  receipt.original_customer_job_completed!==false)
  fail('DURABLE_SAME_JOB_REQUALIFICATION_RECEIPT_INVALID');
 return safe(receipt.status,{
  job_id:claim.job_id,owner_id:claim.owner_id,shift_id:shiftId,
  source_ref:claim.source_ref,
  independent_final_verification_required:true,
  old_failed_receipt_preserved:true,
  requalification_receipt_sha256:receipt.requalification_receipt_sha256,
  next_action:'SAME_JOB_REEXECUTE_AND_INDEPENDENTLY_VERIFY_ON_SEPARATE_SIGNED_RUN'
 });
}
