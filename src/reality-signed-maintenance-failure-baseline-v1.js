// Reality's second signed worker run independently reconstructs a verified
// historical operating failure from the SAME owner, incident, source and shift.
// It is NOT the independent executable CI RED, a model patch, or an installation.
// A stable GitHub readback and a service-only SQL baseline predicate are both
// required before the frozen acceptance and repair pipeline can proceed.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {readFreshEmployeeInquirySource}
 from './reality-dynamic-employee-inquiry-worker-v1.js';
import {buildRealityProposedEmployeeRoleDiscussionContext}
 from './reality-employee-identity-roster-v1.js';

const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/;
const SOURCE=/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/(?:issues|pull)\/[1-9][0-9]*$/;
const KINDS=new Set(['EMPLOYEE_QUALIFICATION_HANDOFF_STALLED',
 'QUALIFIED_EVIDENCE_JOB_BLOCKED']);
const BASELINES=new Set(['HISTORICAL_ZERO_ORIGINAL_CLAIMS_WITH_SIGNED_INQUIRIES',
 'HISTORICAL_SOURCE_EPOCH_MISMATCH_INDEPENDENTLY_REOBSERVED']);
const ROLE_NAMES=new Set(['Riley','Taylor','Quinn','Avery','Casey',
 'Morgan','Jordan','Sage']);
const fail=x=>{throw Error('SIGNED_MAINTENANCE_BASELINE_'+x)};
const hold=(status,extra={})=>Object.freeze({
 status,...extra,historical_baseline_verified:false,
 executable_frozen_ci_red_verified:false,
 model_code_generated:false,repair_executed:false,
 original_job_completed:false,new_customer_work_created:false,
 installation_authorized:false,production_changed:false
});
export async function reproduceOneSignedMaintenanceFailureBaseline({
 db,env=process.env,shiftId,workerRunId,call=shiftRpc,
 readSource=readFreshEmployeeInquirySource,fetchImpl=fetch,
 rolesBuilder=buildRealityProposedEmployeeRoleDiscussionContext
}={}){
 if(env.VERCEL_ENV!=='preview'||!db?.strictSecrets||!db.secretKey||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
    !UUID.test(shiftId||'')||!UUID.test(workerRunId||'')||
    typeof call!=='function'||typeof readSource!=='function'||
    typeof fetchImpl!=='function'||typeof rolesBuilder!=='function')
  fail('SIGNED_OWNER_AND_ENVIRONMENT_REQUIRED');
 const claim=await call(db,'reality_claim_signed_internal_maintenance_baseline_v1',{
  p_shift_id:shiftId,p_worker_run_id:workerRunId
 },{fetchImpl});
 if(claim?.status==='NO_SIGNED_MAINTENANCE_BASELINE_READY'&&
    claim.original_job_completed===false&&claim.repair_executed===false&&
    claim.installation_authorized===false&&claim.production_changed===false)
  return hold(claim.status,{maintenance_job_claimed:false});
 if(claim?.status!=='SIGNED_MAINTENANCE_BASELINE_CLAIMED'||
    !UUID.test(claim.maintenance_id||'')||!UUID.test(claim.owner_id||'')||
    !UUID.test(claim.origin_shift_id||'')||!UUID.test(claim.claim_id||'')||
    claim.claim_shift_id!==shiftId||claim.worker_run_id!==workerRunId||
    !KINDS.has(claim.kind)||!SOURCE.test(claim.source_ref||'')||
    !HASH.test(claim.last_source_sha256||'')||
    !HASH.test(claim.source_observation_receipt_sha256||'')||
    !HASH.test(claim.independent_review_receipt_sha256||'')||
    !ROLE_NAMES.has(claim.assignee)||!ROLE_NAMES.has(claim.independent_reviewer)||
    claim.assignee===claim.independent_reviewer||
    claim.original_job_completed!==false||claim.repair_executed!==false||
    claim.installation_authorized!==false||claim.production_changed!==false)
  fail('INDEPENDENT_FENCED_CLAIM_UNTRUSTED');
 const roles=rolesBuilder({observedAt:new Date()})?.roles;
 if(!Array.isArray(roles)||!roles.some(r=>r.employee_name===claim.assignee)||
    !roles.some(r=>r.employee_name===claim.independent_reviewer))
  return hold('SIGNED_MAINTENANCE_BASELINE_EMPLOYEE_ROSTER_CHANGED',{
   maintenance_id:claim.maintenance_id,claim_reserved:true});
 let first,second;
 try{
  const token=String(env.REALITY_GITHUB_TOKEN||'').trim();
  first=await readSource(claim.source_ref,{fetchImpl,token});
  second=await readSource(claim.source_ref,{fetchImpl,token});
 }catch{
  return hold('SIGNED_MAINTENANCE_BASELINE_PROVIDER_UNAVAILABLE',{
   maintenance_id:claim.maintenance_id,claim_reserved:true});
 }
 if(first?.source_ref!==claim.source_ref||
    second?.source_ref!==claim.source_ref||
    !HASH.test(first?.provider_proof_sha256||'')||
    first.provider_proof_sha256!==second.provider_proof_sha256||
    second.provider_proof_sha256!==claim.last_source_sha256||
    !Number.isFinite(Date.parse(first.checked_at||''))||
    !Number.isFinite(Date.parse(second.checked_at||'')))
  return hold('SIGNED_MAINTENANCE_BASELINE_SOURCE_EPOCH_CHANGED',{
   maintenance_id:claim.maintenance_id,claim_reserved:true,
   next_action:'REQUALIFY_SOURCE_BEFORE_FROZEN_CODE_TEST'});
 const confirmed=await call(db,
  'reality_record_signed_internal_maintenance_baseline_v1',{
   p_maintenance_id:claim.maintenance_id,p_claim_id:claim.claim_id,
   p_worker_run_id:workerRunId,p_source_ref:claim.source_ref,
   p_provider_sha256:second.provider_proof_sha256,
   p_checked_at:second.checked_at
  },{fetchImpl});
 if(confirmed?.status!=='INTERNAL_MAINTENANCE_HISTORICAL_FAILURE_BASELINE_REPRODUCED'||
    confirmed.maintenance_id!==claim.maintenance_id||
    confirmed.owner_id!==claim.owner_id||
    confirmed.origin_shift_id!==claim.origin_shift_id||
    confirmed.source_ref!==claim.source_ref||
    !BASELINES.has(confirmed.baseline_kind)||
    !HASH.test(confirmed.baseline_receipt_sha256||'')||
    confirmed.next_action!=='RUN_INDEPENDENT_EXECUTABLE_FROZEN_CI_RED_BEFORE_MODEL_PATCH'||
    confirmed.independent_frozen_ci_test_completed!==false||
    confirmed.model_code_generated!==false||
    confirmed.repair_executed!==false||
    confirmed.original_job_completed!==false||
    confirmed.installation_authorized!==false||
    confirmed.production_changed!==false)
  fail('DURABLE_INDEPENDENT_HISTORICAL_BASELINE_RECEIPT_UNTRUSTED');
 return Object.freeze({
  status:confirmed.status,
  maintenance_id:claim.maintenance_id,
  origin_shift_id:claim.origin_shift_id,
  current_shift_id:shiftId,
  assignee:claim.assignee,independent_reviewer:claim.independent_reviewer,
  source_ref:claim.source_ref,baseline_kind:confirmed.baseline_kind,
  baseline_receipt_sha256:confirmed.baseline_receipt_sha256,
  historical_baseline_verified:true,
  executable_frozen_ci_red_verified:false,
  next_action:confirmed.next_action,
  same_internal_job_preserved:true,
  no_new_shift_started:true,
  model_code_generated:false,repair_executed:false,
  original_job_completed:false,new_customer_work_created:false,
  installation_authorized:false,production_changed:false
 });
}
