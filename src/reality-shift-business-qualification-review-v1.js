// A SECOND signed worker independently confirms whether Reality admitted any
// original OWNER business work. This read-only check cannot mint a customer job,
// install code, approve external effects or disguise evidence work as ROI.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {readFreshEmployeeInquirySource}
 from './reality-dynamic-employee-inquiry-worker-v1.js';
import {buildRealityProposedEmployeeRoleDiscussionContext}
 from './reality-employee-identity-roster-v1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/;
const SOURCE=/^https:\/\/github[.]com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/(issues|pull)\/[1-9][0-9]*$/;
const fail=x=>{throw Error('BUSINESS_QUALIFICATION_INDEPENDENT_'+x)};
const safe=(status,fields={})=>Object.freeze({status,...fields,
 original_job_completed:false,repair_executed:false,
 installation_authorized:false,production_changed:false});
export async function reviewOneSignedBusinessQualificationStall({
 db,env=process.env,shiftId,workerRunId,call=shiftRpc,
 readSource=readFreshEmployeeInquirySource,fetchImpl=fetch,
 rolesBuilder=buildRealityProposedEmployeeRoleDiscussionContext
}={}){
 if(env.VERCEL_ENV!=='preview'||db?.strictSecrets!==true||!db.secretKey||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  !UUID.test(shiftId||'')||!UUID.test(workerRunId||'')||
  typeof call!=='function'||typeof readSource!=='function'||
  typeof fetchImpl!=='function'||typeof rolesBuilder!=='function')
  fail('EXACT_SIGNED_SHIFT_BOUNDARY_REQUIRED');
 const claim=await call(db,'reality_claim_shift_business_qualification_review_v1',{
  p_shift_id:shiftId,p_worker_run_id:workerRunId
 },{fetchImpl});
 if(claim?.status==='NO_SIGNED_BUSINESS_QUALIFICATION_REVIEW_READY'&&
  claim.original_job_completed===false&&
  claim.installation_authorized===false&&claim.production_changed===false)
  return safe(claim.status,{review_claimed:false});
 if(claim?.status!=='SIGNED_BUSINESS_QUALIFICATION_REVIEW_CLAIMED'||
  !UUID.test(claim.incident_id||'')||!UUID.test(claim.owner_id||'')||
  !UUID.test(claim.source_claim_id||'')||!UUID.test(claim.claim_id||'')||
  !Number.isSafeInteger(claim.review_attempt)||
  claim.review_attempt<1||claim.review_attempt>2||
  claim.shift_id!==shiftId||claim.worker_run_id!==workerRunId||
  !SOURCE.test(claim.source_ref||'')||
  !HASH.test(claim.prior_source_sha256||'')||
  !HASH.test(claim.investigation_receipt_sha256||'')||
  claim.original_job_completed!==false||
  claim.installation_authorized!==false||claim.production_changed!==false)
  fail('EXACT_OWNER_SOURCE_AND_LEASE_REQUIRED');
 const roles=rolesBuilder({observedAt:new Date()})?.roles;
 if(!Array.isArray(roles)||!roles.some(x=>
  x.function_id===claim.reviewer_function_id&&
  x.employee_name===claim.reviewer))
  return safe('INDEPENDENT_REVIEWER_DIRECTORY_MISMATCH',{
   incident_id:claim.incident_id,
   next_action:'REVIEW_ROLE_DIRECTORY_WITHOUT_AUTHORIZING_EXECUTION'});
 const token=String(env.REALITY_GITHUB_TOKEN||'').trim();
 let first,second;
 try{
  first=await readSource(claim.source_ref,{fetchImpl,token});
  second=await readSource(claim.source_ref,{fetchImpl,token});
 }catch{
  return safe('BUSINESS_QUALIFICATION_PROVIDER_RECHECK_BLOCKED',{
   incident_id:claim.incident_id,
   next_action:'WATCHDOG_FENCES_EXPIRED_SIGNED_REVIEW_PROOF'});
 }
 if(first?.source_ref!==claim.source_ref||
  second?.source_ref!==claim.source_ref||
  !HASH.test(first?.provider_proof_sha256||'')||
  !HASH.test(second?.provider_proof_sha256||'')||
  first.provider_proof_sha256!==second.provider_proof_sha256||
  !Number.isFinite(Date.parse(first.checked_at||''))||
  !Number.isFinite(Date.parse(second.checked_at||'')))
  return safe('BUSINESS_QUALIFICATION_SOURCE_EPOCH_UNSTABLE',{
   incident_id:claim.incident_id,
   next_action:'WATCHDOG_FENCES_UNSTABLE_PROVIDER_READ'});
 const r=await call(db,'reality_record_shift_business_qualification_review_v1',{
  p_incident_id:claim.incident_id,p_claim_id:claim.claim_id,
  p_worker_run_id:workerRunId,p_source_ref:claim.source_ref,
  p_provider_sha256:second.provider_proof_sha256,
  p_checked_at:second.checked_at
 },{fetchImpl});
 const allowed=new Set(['NO_ORIGINAL_ADMISSION_CONFIRMED',
  'ORIGINAL_CLAIM_NOW_EXISTS','INSUFFICIENT_LIVE_SOURCE_EVIDENCE']);
 if(!allowed.has(r?.status)||r.incident_id!==claim.incident_id||
  r.shift_id!==shiftId||r.reviewer!==claim.reviewer||
  !HASH.test(r.independent_receipt_sha256||'')||
  !Number.isSafeInteger(r.original_job_claims)||r.original_job_claims<0||
  !Number.isSafeInteger(r.source_backed_inquiries)||r.source_backed_inquiries<0||
  r.provider_source_epoch_changed!==
   (claim.prior_source_sha256!==second.provider_proof_sha256)||
  (r.status==='NO_ORIGINAL_ADMISSION_CONFIRMED'&&
   (r.original_job_claims!==0||r.source_backed_inquiries<2))||
  (r.status==='ORIGINAL_CLAIM_NOW_EXISTS'&&r.original_job_claims===0)||
  (r.status==='INSUFFICIENT_LIVE_SOURCE_EVIDENCE'&&
   (r.original_job_claims!==0||r.source_backed_inquiries>=2))||
  r.original_job_completed!==false||r.repair_executed!==false||
  r.installation_authorized!==false||r.production_changed!==false)
  fail('INDEPENDENT_QUALIFICATION_VERIFICATION_RECEIPT_INVALID');
 return safe(r.status,{
  incident_id:claim.incident_id,owner_id:claim.owner_id,
  shift_id:shiftId,reviewer:claim.reviewer,
  review_attempt:claim.review_attempt,
  independent_receipt_sha256:r.independent_receipt_sha256,
  source_backed_inquiries:r.source_backed_inquiries,
  original_job_claims:r.original_job_claims,
  source_epoch_changed:r.provider_source_epoch_changed,
  independent_qualification_gap_verification_completed:true,
  independent_code_repair_verified:false,
  next_action:r.next_action
 });
}
