// Existing signed Reality employee shift -> one pre-existing owner maintenance job.
// Never create a customer job, invoke a code installer, or claim a solved defect.
// The reviewer receipt originated in a DIFFERENT signed worker run. This
// worker independently re-observes the source before frozen reproduction.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {readFreshEmployeeInquirySource}
 from './reality-dynamic-employee-inquiry-worker-v1.js';
import {buildRealityProposedEmployeeRoleDiscussionContext}
 from './reality-employee-identity-roster-v1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/;
const ISSUE=/^https:\/\/github[.]com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/(issues|pull)\/[1-9][0-9]*$/;
const kinds=new Set(['EMPLOYEE_QUALIFICATION_HANDOFF_STALLED',
 'QUALIFIED_EVIDENCE_JOB_BLOCKED']);
const safe=(status,details={})=>Object.freeze({
 status,...details,
 customer_job_completed:false,new_customer_work_created:false,
 independent_frozen_test_completed:false,repair_executed:false,
 installation_authorized:false,production_changed:false
});
const fail=code=>{throw Error('SIGNED_INTERNAL_MAINTENANCE_'+code)};
export async function advanceOneSignedInternalMaintenanceJob({
 db,env=process.env,shiftId,workerRunId,call=shiftRpc,
 readSource=readFreshEmployeeInquirySource,fetchImpl=fetch,
 rolesBuilder=buildRealityProposedEmployeeRoleDiscussionContext
}={}){
 if(env.VERCEL_ENV!=='preview'||!db?.strictSecrets||!db.secretKey||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  !UUID.test(shiftId||'')||!UUID.test(workerRunId||'')||
  typeof call!=='function'||typeof readSource!=='function'||
  typeof rolesBuilder!=='function'||typeof fetchImpl!=='function')
  fail('EXACT_SIGNED_WORKER_SCOPE_REQUIRED');
 const claim=await call(db,'reality_claim_signed_internal_maintenance_v1',{
  p_shift_id:shiftId,p_worker_run_id:workerRunId
 },{fetchImpl});
 if(claim?.status==='NO_AUTHORIZED_INTERNAL_MAINTENANCE_JOB_READY'&&
  claim.new_customer_work_created===false&&
  claim.customer_job_completed===false&&claim.repair_executed===false&&
  claim.installation_authorized===false&&claim.production_changed===false)
  return safe(claim.status,{maintenance_job_claimed:false});
 if(claim?.status!=='SIGNED_INTERNAL_MAINTENANCE_CLAIMED'||
  !UUID.test(claim.maintenance_id||'')||
  !UUID.test(claim.owner_id||'')||
  !UUID.test(claim.origin_shift_id||'')||
  !UUID.test(claim.claim_id||'')||
  claim.claim_shift_id!==shiftId||claim.worker_run_id!==workerRunId||
  !kinds.has(claim.kind)||!ISSUE.test(claim.source_ref||'')||
  !HASH.test(claim.prior_source_sha256||'')||
  !HASH.test(claim.independent_review_receipt_sha256||'')||
  !['Riley','Taylor','Quinn','Avery','Casey','Morgan','Jordan','Sage']
   .includes(claim.assignee)||
  !['Riley','Taylor','Quinn','Avery','Casey','Morgan','Jordan','Sage']
   .includes(claim.independent_reviewer)||
  claim.assignee===claim.independent_reviewer||
  claim.new_customer_work_created!==false||
  claim.customer_job_completed!==false||
  claim.repair_executed!==false||
  claim.installation_authorized!==false||
  claim.production_changed!==false)
  fail('OWNER_INCIDENT_AND_PROOF_BOUND_CLAIM_INVALID');
 const roles=rolesBuilder({observedAt:new Date()})?.roles;
 if(!Array.isArray(roles)||
  !roles.some(x=>x.employee_name===claim.assignee)||
  !roles.some(x=>x.employee_name===claim.independent_reviewer))
  return safe('SIGNED_INTERNAL_EMPLOYEE_ROLE_DIRECTORY_MISMATCH',{
   maintenance_id:claim.maintenance_id,
   next_action:'PRESERVE_SIGNED_CLAIM_FOR_WATCHDOG_FENCING'});
 const token=String(env.REALITY_GITHUB_TOKEN||'').trim();
 let first,second;
 try{
  first=await readSource(claim.source_ref,{fetchImpl,token});
  second=await readSource(claim.source_ref,{fetchImpl,token});
 }catch{
  return safe('SIGNED_INTERNAL_MAINTENANCE_PROVIDER_UNAVAILABLE',{
   maintenance_id:claim.maintenance_id,
   next_action:'WAIT_FOR_EXISTING_WATCHDOG_TO_FENCE_SIGNED_CLAIM'});
 }
 if(first?.source_ref!==claim.source_ref||
  second?.source_ref!==claim.source_ref||
  !HASH.test(first?.provider_proof_sha256||'')||
  !HASH.test(second?.provider_proof_sha256||'')||
  first.provider_proof_sha256!==second.provider_proof_sha256||
  !Number.isFinite(Date.parse(first?.checked_at||''))||
  !Number.isFinite(Date.parse(second?.checked_at||'')))
  return safe('SIGNED_INTERNAL_MAINTENANCE_UNSTABLE_SOURCE',{
   maintenance_id:claim.maintenance_id,
   next_action:'PRESERVE_UNVERIFIED_CLAIM_FOR_WATCHDOG_FENCING'});
 const recorded=await call(db,
  'reality_record_signed_internal_maintenance_recheck_v1',{
   p_maintenance_id:claim.maintenance_id,p_claim_id:claim.claim_id,
   p_worker_run_id:workerRunId,p_source_ref:claim.source_ref,
   p_provider_sha256:second.provider_proof_sha256,
   p_checked_at:second.checked_at
  },{fetchImpl});
 const action=claim.kind==='EMPLOYEE_QUALIFICATION_HANDOFF_STALLED'?
  'REPRODUCE_EXACT_ADMISSION_HANDOFF_CAUSE_BEFORE_SOFTWARE_REPAIR':
  'RUN_FROZEN_SOURCE_EPOCH_REGRESSION_BEFORE_CANDIDATE_INSTALL';
 if(recorded?.status!=='INTERNAL_MAINTENANCE_SOURCE_REOBSERVED'||
  recorded.maintenance_id!==claim.maintenance_id||
  recorded.owner_id!==claim.owner_id||
  recorded.source_ref!==claim.source_ref||
  recorded.assignee!==claim.assignee||
  recorded.next_action!==action||
  !HASH.test(recorded.source_readback_receipt_sha256||'')||
  recorded.independent_frozen_test_completed!==false||
  recorded.repair_executed!==false||
  recorded.customer_job_completed!==false||
  recorded.new_customer_work_created!==false||
  recorded.installation_authorized!==false||
  recorded.production_changed!==false)
  fail('INDEPENDENT_SOURCE_AND_MAINTENANCE_RECEIPT_REQUIRED');
 return safe(recorded.status,{
  maintenance_id:claim.maintenance_id,
  originating_shift_id:claim.origin_shift_id,
  shift_id:shiftId,assignee:claim.assignee,
  independent_reviewer:claim.independent_reviewer,
  kind:claim.kind,source_ref:claim.source_ref,
  source_epoch_changed:
   second.provider_proof_sha256!==claim.prior_source_sha256,
  source_readback_receipt_sha256:recorded.source_readback_receipt_sha256,
  next_action:recorded.next_action,
  source_reobservation_completed:true,
  same_internal_work_preserved:true
 });
}
