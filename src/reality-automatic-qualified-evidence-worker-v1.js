// Authoritative employee source inquiry -> qualified, executable READ-ONLY
// evidence pack. Original code repairs remain gated by the separate exact
// authorized original/independent CI/installation path.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {readFreshEmployeeInquirySource} from './reality-dynamic-employee-inquiry-worker-v1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA=/^sha256:[a-f0-9]{64}$/;
const SOURCE=/^https:\/\/github\.com\/[^/]+\/[^/]+\/(issues|pull)\/[1-9][0-9]*$/;
const stop=x=>{throw Error('QUALIFIED_EVIDENCE_WORK_'+x)};
const safe=(status,other={})=>Object.freeze({
 status,...other,customer_original_completed:false,code_repair_installed:false,
 installation_authorized:false,production_changed:false
});
export async function advanceOneQualifiedEmployeeEvidenceJob({
 db,env=process.env,shiftId,workerRunId,
 call=shiftRpc,readSource=readFreshEmployeeInquirySource,fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||!db?.strictSecrets||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  !db.secretKey||!UUID.test(shiftId||'')||!UUID.test(workerRunId||'')||
  typeof call!=='function'||typeof readSource!=='function'||
  typeof fetchImpl!=='function')stop('SIGNED_PREVIEW_SHIFT_BOUNDARY_REQUIRED');
 const token=String(env.REALITY_GITHUB_TOKEN||'').trim();
 // A different, already completed real signed worker submitted each review
 // candidate. The current worker's provider readback cannot self-review it.
 let claim=await call(db,'reality_claim_qualified_employee_evidence_review_v1',{
  p_shift_id:shiftId,p_worker_run_id:workerRunId
 },{fetchImpl});
 if(claim?.status==='INDEPENDENT_SOURCE_RECHECK_SIGNED_CLAIMED'){
  if(!UUID.test(claim.job_id||'')||
   !UUID.test(claim.owner_id||'')||claim.shift_id!==shiftId||
   !UUID.test(claim.review_claim_id||'')||
   claim.review_worker_run_id!==workerRunId||
   !UUID.test(claim.original_execution_worker_run_id||'')||
   claim.original_execution_worker_run_id===workerRunId||
   !SOURCE.test(claim.source_ref||'')||
   !SHA.test(claim.source_sha256_to_verify||'')||
   !SHA.test(claim.deliverable_receipt_sha256||'')||
   claim.installation_authorized!==false||
   claim.production_changed!==false)
   stop('INDEPENDENT_REVIEW_SCOPE_UNVERIFIED');
  try{
   const source=await readSource(claim.source_ref,{fetchImpl,token});
   if(source.source_ref!==claim.source_ref||
    !SHA.test(source.provider_proof_sha256||'')||
    !Number.isFinite(Date.parse(source.checked_at||'')))
    stop('INDEPENDENT_CURRENT_GITHUB_READ_MISSING');
   const proof=await call(db,'reality_record_qualified_employee_evidence_review_v1',{
    p_job_id:claim.job_id,p_review_claim_id:claim.review_claim_id,
    p_worker_run_id:workerRunId,p_source_ref:claim.source_ref,
    p_provider_sha256:source.provider_proof_sha256,
    p_provider_checked_at:source.checked_at
   },{fetchImpl});
   if(!['QUALIFIED_SOURCE_EVIDENCE_JOB_INDEPENDENTLY_COMPLETED',
    'QUALIFIED_SOURCE_EVIDENCE_SOURCE_CHANGED_NO_COMPLETION'
   ].includes(proof?.status)||proof.job_id!==claim.job_id||
    proof.owner_id!==claim.owner_id||proof.shift_id!==shiftId||
    proof.source_ref!==claim.source_ref||
    !SHA.test(proof.independent_receipt_sha256||'')||
    proof.original_customer_job_completed!==false||
    proof.code_repair_installed!==false||
    proof.installation_authorized!==false||
    proof.production_changed!==false||
    proof.evidence_job_completed!==(proof.status===
     'QUALIFIED_SOURCE_EVIDENCE_JOB_INDEPENDENTLY_COMPLETED'))
    stop('INDEPENDENT_VERIFICATION_RECEIPT_UNVERIFIED');
   return safe(proof.status,{
    job_id:claim.job_id,employee_job_kind:'CURRENT_SOURCE_EVIDENCE_PACK',
    evidence_job_independently_completed:proof.evidence_job_completed,
    independent_receipt_sha256:proof.independent_receipt_sha256,
    first_worker_run_id:claim.original_execution_worker_run_id,
    independent_worker_run_id:workerRunId
   });
  }catch{
   return safe('QUALIFIED_SOURCE_EVIDENCE_INDEPENDENT_PROVIDER_READ_BLOCKED',{
    job_id:claim.job_id,
    evidence_job_independently_completed:false,
    next_action:'WATCHDOG_RECONCILES_UNPROVEN_REVIEW_LEASE'
   });
  }
 }
 if(!['NO_INDEPENDENT_EVIDENCE_JOB_REVIEW_READY',
  'NO_CURRENT_SIGNED_QUALIFIED_REVIEW_SCOPE'].includes(claim?.status)||
   claim.installation_authorized!==false||
   claim.production_changed!==false)
  stop('SOURCE_REVIEW_CLAIM_OUTCOME_UNVERIFIED');
 claim=await call(db,'reality_claim_next_qualified_employee_evidence_job_v1',{
  p_shift_id:shiftId,p_worker_run_id:workerRunId
 },{fetchImpl});
 if(['NO_QUALIFIED_EVIDENCE_JOB_READY',
  'NO_CURRENT_SIGNED_QUALIFIED_JOB_AUTHORITY'].includes(claim?.status)&&
   claim.execution_authorized===false&&
   claim.installation_authorized===false&&
   claim.production_changed===false)
  return safe(claim.status,{qualified_executable_job_claimed:false});
 if(claim?.status!=='QUALIFIED_EVIDENCE_JOB_SIGNED_CLAIMED'||
  claim.shift_id!==shiftId||
  !UUID.test(claim.owner_id||'')||!UUID.test(claim.job_id||'')||
  !UUID.test(claim.execution_claim_id||'')||
  claim.worker_run_id!==workerRunId||
  !SOURCE.test(claim.source_ref||'')||
  !SHA.test(claim.qualification_receipt_sha256||'')||
  claim.job_type!=='CURRENT_SOURCE_EVIDENCE_PACK'||
  typeof claim.employee!=='string'||claim.employee.length<2||
  typeof claim.objective!=='string'||claim.objective.length<15||
  claim.authorized_evidence_only!==true||
  claim.installation_authorized!==false||
  claim.production_changed!==false||
  claim.original_customer_job_completed!==false)
  stop('QUALIFIED_SOURCE_WORK_CLAIM_UNVERIFIED');
 try{
  const source=await readSource(claim.source_ref,{fetchImpl,token});
  if(source.source_ref!==claim.source_ref||
   !SHA.test(source.provider_proof_sha256||'')||
   !Number.isFinite(Date.parse(source.checked_at||''))||
   !Number.isFinite(Date.parse(source.provider_updated_at||''))||
   typeof source.source_title!=='string'||
   typeof source.source_body!=='string')
   stop('QUALIFIED_CURRENT_SOURCE_PROVIDER_PROOF_UNVERIFIED');
  const recorded=await call(db,'reality_record_qualified_employee_evidence_job_v1',{
   p_job_id:claim.job_id,
   p_execution_claim_id:claim.execution_claim_id,
   p_worker_run_id:workerRunId,
   p_source_ref:claim.source_ref,
   p_source_title:source.source_title,
   p_source_updated_at:source.provider_updated_at,
   p_source_checked_at:source.checked_at,
   p_source_proof_sha256:source.provider_proof_sha256,
   p_source_excerpt:source.source_body.slice(0,3500)
  },{fetchImpl});
  if(recorded?.status!=='EXECUTABLE_SOURCE_EVIDENCE_PACK_SUBMITTED'||
   recorded.job_id!==claim.job_id||
   recorded.owner_id!==claim.owner_id||
   recorded.shift_id!==shiftId||
   recorded.source_ref!==claim.source_ref||
   recorded.execution_worker_run_id!==workerRunId||
   !SHA.test(recorded.evidence_deliverable_sha256||'')||
   recorded.independent_verification_required!==true||
   recorded.original_customer_job_completed!==false||
   recorded.installation_authorized!==false||
   recorded.production_changed!==false)
   stop('DURABLE_EXECUTABLE_SOURCE_REPORT_UNVERIFIED');
  return safe(recorded.status,{
   job_id:claim.job_id,employee:claim.employee,
   source_ref:claim.source_ref,
   employee_job_kind:'CURRENT_SOURCE_EVIDENCE_PACK',
   evidence_deliverable_sha256:recorded.evidence_deliverable_sha256,
   independent_verification_required:true,
   qualified_executable_job_claimed:true,
   actual_evidence_report_submitted:true
  });
 }catch{
  return safe('QUALIFIED_EVIDENCE_JOB_EXECUTION_PROVIDER_BLOCKED',{
   job_id:claim.job_id,
   actual_evidence_report_submitted:false,
   next_action:'WATCHDOG_RECONCILES_UNPROVEN_EXECUTION_LEASE'
  });
 }
}
