// Existing owner 8-role calendar + prior model inquiry -> independently
// rechecked, qualified READ-ONLY evidence job on the same signed shift.
// Existing signed evidence worker executes it and another signed process
// independently reviews its source before marking the evidence job complete.
// Does not write customer systems, install code, start shifts, or settle repairs.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {readFreshEmployeeInquirySource}
 from './reality-dynamic-employee-inquiry-worker-v1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/;
const WORK=/^schedule:[a-f0-9]{64}$/;
const SOURCE=/^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull)\/[1-9][0-9]*$/;
const EMPLOYEE=new Set(['Avery','Riley','Quinn','Taylor','Casey',
 'Morgan','Jordan','Sage']);
const WORK_STATE=new Set(['CURRENT_SOURCE_REVIEW_REQUIRED',
 'SOURCE_EPOCH_REVIEW_REQUIRED','HISTORICAL_REVALIDATION_REQUIRED']);
const fail=code=>{throw Error('SIGNED_SCHEDULE_EVIDENCE_'+code)};
const stop=(status,extra={})=>Object.freeze({
 status,...extra,evidence_job_created:false,
 customer_original_job_created:false,code_installation_authorized:false,
 installation_authorized:false,production_changed:false
});
export async function admitOneSignedScheduledEvidenceJob({
 db,env=process.env,shiftId,workerRunId,
 call=shiftRpc,readSource=readFreshEmployeeInquirySource,
 fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||!db?.strictSecrets||!db.secretKey||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  !UUID.test(shiftId||'')||!UUID.test(workerRunId||'')||
  typeof call!=='function'||typeof readSource!=='function'||
  typeof fetchImpl!=='function')
  fail('ISOLATED_OWNER_SIGNED_WORKER_REQUIRED');
 const scope=await call(db,
  'reality_read_next_signed_scheduled_evidence_admission_v1',{
   p_shift_id:shiftId,p_worker_run_id:workerRunId
  },{fetchImpl});
 if(scope?.status==='NO_ELIGIBLE_SIGNED_SCHEDULED_INQUIRY_FOR_QUALIFICATION'&&
    scope.evidence_job_created===false&&
    scope.customer_original_job_created===false&&
    scope.installation_authorized===false&&
    scope.production_changed===false)
  return stop(scope.status,{schedule_candidate_qualified:false});
 if(scope?.status!==
     'SIGNED_SCHEDULED_EVIDENCE_INQUIRY_READY_FOR_INDEPENDENT_SOURCE_RECHECK'||
    scope.shift_id!==shiftId||scope.worker_run_id!==workerRunId||
    !UUID.test(scope.owner_id||'')||
    !WORK.test(scope.work_key||'')||
    !EMPLOYEE.has(scope.employee)||!SOURCE.test(scope.source_ref||'')||
    !WORK_STATE.has(scope.work_state)||
    !HASH.test(scope.source_evidence_sha256||'')||
    !UUID.test(scope.inquiry_claim_id||'')||
    !HASH.test(scope.inquiry_provider_sha256||'')||
    !/^resp_[A-Za-z0-9_-]{4,160}$/.test(scope.model_response_id||'')||
    scope.prior_model_recommendation!=='INVESTIGATE_MORE'||
    !Number.isFinite(Date.parse(scope.inquiry_finished_at||''))||
    scope.evidence_job_created!==false||
    scope.customer_original_job_created!==false||
    scope.installation_authorized!==false||
    scope.production_changed!==false)
  fail('OWNER_AND_PREVIOUS_EMPLOYEE_INQUIRY_SCOPE_INVALID');
 let first,second;
 try{
  const token=String(env.REALITY_GITHUB_TOKEN||'').trim();
  first=await readSource(scope.source_ref,{fetchImpl,token,
   includeRecentComments:scope.source_ref.includes('/issues/')});
  second=await readSource(scope.source_ref,{fetchImpl,token,
   includeRecentComments:scope.source_ref.includes('/issues/')});
 }catch{
  return stop('SIGNED_SCHEDULE_PROVIDER_UNAVAILABLE_NO_ADMISSION',{
   work_key:scope.work_key,source_ref:scope.source_ref,
   next_action:'RECHECK_PROVIDER_BEFORE_QUALIFICATION'});
 }
 if(first?.source_ref!==scope.source_ref||
    second?.source_ref!==scope.source_ref||
    !HASH.test(first.provider_proof_sha256||'')||
    second.provider_proof_sha256!==first.provider_proof_sha256||
    !Number.isFinite(Date.parse(second.checked_at||''))||
    Date.parse(second.checked_at)>Date.now()+60000||
    Date.parse(second.checked_at)<Date.now()-180000)
  return stop('SIGNED_SCHEDULE_UNSTABLE_PROVIDER_NO_ADMISSION',{
   work_key:scope.work_key,
   next_action:'WAIT_FOR_STABLE_INDEPENDENT_PROVIDER_EVIDENCE'});
 if(second.provider_proof_sha256!==scope.inquiry_provider_sha256)
  return stop('SIGNED_SCHEDULE_SOURCE_EPOCH_CHANGED_REQUALIFY',{
   work_key:scope.work_key,
   same_inquiry_preserved:true,
   next_action:'REFRESH_PRIOR_INQUIRY_BEFORE_NEW_EVIDENCE_WORK'});
 const recorded=await call(db,
  'reality_admit_signed_scheduled_evidence_v1',{
   p_shift_id:shiftId,p_worker_run_id:workerRunId,
   p_work_key:scope.work_key,p_inquiry_claim_id:scope.inquiry_claim_id,
   p_source_ref:scope.source_ref,
   p_current_provider_sha256:second.provider_proof_sha256,
   p_checked_at:second.checked_at
  },{fetchImpl});
 if(recorded?.status==='SIGNED_SCHEDULE_SOURCE_ALREADY_INDEPENDENTLY_VERIFIED_NO_REPLAY'||
    recorded?.status==='SIGNED_SCHEDULE_EXISTING_EVIDENCE_JOB_NO_DUPLICATE'){
  if(recorded.owner_id!==scope.owner_id||
     recorded.shift_id!==shiftId||
     recorded.evidence_job_created!==false||
     recorded.customer_original_job_created!==false||
     recorded.installation_authorized!==false||
     recorded.production_changed!==false)
   fail('DURABLE_NO_REPLAY_RECEIPT_INVALID');
  return stop(recorded.status,{same_source_not_replayed:true});
 }
 if(recorded?.status!=='SIGNED_SCHEDULE_EVIDENCE_JOB_QUALIFIED_EXECUTABLE'||
    recorded.owner_id!==scope.owner_id||
    recorded.shift_id!==shiftId||
    recorded.work_key!==scope.work_key||
    !UUID.test(recorded.job_id||'')||
    recorded.employee!==scope.employee||
    recorded.source_ref!==scope.source_ref||
    !HASH.test(recorded.qualification_receipt_sha256||'')||
    recorded.job_type!=='CURRENT_SOURCE_EVIDENCE_PACK'||
    recorded.next_worker_action!=='EXISTING_SIGNED_QUALIFIED_EVIDENCE_EXECUTOR'||
    recorded.independent_final_review_required!==true||
    recorded.evidence_job_created!==true||
    recorded.customer_original_job_created!==false||
    recorded.installation_authorized!==false||
    recorded.production_changed!==false)
  fail('DURABLE_QUALIFIED_READ_ONLY_JOB_RECEIPT_INVALID');
 return Object.freeze({
  status:recorded.status,job_id:recorded.job_id,
  owner_id:scope.owner_id,shift_id:shiftId,
  employee:scope.employee,source_ref:scope.source_ref,
  work_key:scope.work_key,
  qualification_receipt_sha256:recorded.qualification_receipt_sha256,
  evidence_job_created:true,customer_original_job_created:false,
  independent_final_review_required:true,
  existing_signed_evidence_executor_required:true,
  code_installation_authorized:false,installation_authorized:false,
  production_changed:false
 });
}
