// Signed worker adapter, not a second controller. Source plan already staged
// on the exact current shift; only verified Universe acceptance can produce
// an exact owner approval request. Never approves on the owner's behalf.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
export const FINAL_LOOP_CHILD_APPROVAL_REQUEST_VERSION=
 'reality-final-loop-child-approval-request-v1';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const fail=(status,extra={})=>Object.freeze({
 version:FINAL_LOOP_CHILD_APPROVAL_REQUEST_VERSION,status,
 owner_approval_granted:false,child_originals_admitted:0,
 execution_authorized:false,original_job_completed:false,...extra
});
// The existing shared benchmark may prepare exact READ-ONLY owner review
// packets only. Actual child execution remains separately gated and isolated.
function permittedPacketStorage(db,graph,env){
 const exact=db?.strictSecrets===true&&
  db.project===env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF;
 const isolated=exact&&
  env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED==='true'&&
  db.project===env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF;
 const shared=exact&&
  env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_STAGING_ENABLED==='true'&&
  env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED!=='true'&&
  env.REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED!=='true'&&
  env.REALITY_FINAL_LOOP_PARENT_DELIVERY_ENABLED!=='true'&&
  db.project===env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF&&
  graph?.owner_id===env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_OWNER_ID&&
  graph?.shift_id===env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_SHIFT_ID;
 return isolated||shared;
}
export async function requestFinalLoopChildApprovalFromAcceptedOriginal({
 db,graph,workerRunId,selectedRoutes=null,env=process.env,fetchImpl=fetch,call=shiftRpc
}={}){
 if(env.VERCEL_ENV!=='preview'||
  env.REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED!=='true'||
  env.REALITY_FINAL_LOOP_PR_SOURCE_PLAN_STAGING_ENABLED!=='true'||
  (env.REALITY_FINAL_LOOP_CHILD_APPROVAL_PREPARATION_ENABLED!=='true'&&
   env.REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED!=='true')||
  !permittedPacketStorage(db,graph,env)||
  db?.strictSecrets!==true||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  graph?.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||
  !UUID.test(graph.owner_id||'')||!UUID.test(graph.shift_id||'')||
  !HASH.test(graph.plan_fingerprint||'')||
  !UUID.test(workerRunId||'')||
  !Array.isArray(graph.jobs)||typeof call!=='function')
  return fail('FINAL_LOOP_CHILD_APPROVAL_GOVERNED_SCOPE_NOT_ENABLED');
 // Optional router scope: packet preparation must not expand beyond the
 // selected source plans, even when the fresh preflight contains new work.
 if(selectedRoutes!==null&&(!Array.isArray(selectedRoutes)||selectedRoutes.length<1||
    selectedRoutes.length>10||new Set(selectedRoutes.map(r=>r?.plan_id)).size!==selectedRoutes.length||
    selectedRoutes.some(r=>!UUID.test(r?.plan_id||'')||!WORK.test(r.parent_original_work_id||'')||
     !HASH.test(r.source_manifest_sha256||'')||!HASH.test(r.acceptance_contract_sha256||'')||
     r.next_registered_handler!=='PREPARE_FINAL_LOOP_CHILD_OWNER_PACKET'||
     r.owner_action_required!==true||r.child_execution_authorized!==false||r.handler_dispatched!==false)))
  return fail('FINAL_LOOP_CHILD_SELECTED_PACKET_SCOPE_UNVERIFIED');
 let current;
 try{
  current=await call(db,'reality_read_final_loop_child_approval_preflight_v1',{
   p_shift_id:graph.shift_id
  },{fetchImpl,timeoutMs:6000});
 }catch{
  return fail('FINAL_LOOP_CHILD_GOAL_ACCEPTANCE_PREFLIGHT_UNAVAILABLE');
 }
 if(current?.status!=='FINAL_LOOP_CHILD_GOAL_ACCEPTANCE_PREFLIGHT_READ_ONLY'||
  current.owner_id!==graph.owner_id||
  current.shift_id!==graph.shift_id||
  current.plan_fingerprint!==graph.plan_fingerprint||
  current.read_only!==true||current.execution_authorized!==false||
  !Array.isArray(current.plans)||current.plans.length>10)
  return fail('FINAL_LOOP_CHILD_GOAL_ACCEPTANCE_PREFLIGHT_SCOPE_MISMATCH');
 if(selectedRoutes!==null&&selectedRoutes.some(r=>current.plans.filter(p=>
  p.plan_id===r.plan_id&&p.source_ref===r.source_ref&&
  p.parent_original_work_id===r.parent_original_work_id&&
  p.source_manifest_sha256===r.source_manifest_sha256&&
  p.acceptance_contract_sha256===r.acceptance_contract_sha256&&
  p.pending_exact_owner_approval===true&&p.owner_goal_acceptance_pending===true&&
  p.independent_goal_acceptance_verified===false&&p.verified_signed_source_goal_contract_prepared===true).length!==1))
  return fail('FINAL_LOOP_CHILD_SELECTED_PACKET_SCOPE_CHANGED');
 const seen=new Set(),status=[];
 for(const plan of current.plans){
  if(!UUID.test(plan?.plan_id||'')||
   !HASH.test(plan.source_manifest_sha256||'')||
   !/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/.test(
    plan.source_ref||'')||
   !WORK.test(plan.parent_original_work_id||'')||
   seen.has(plan.plan_id)||!graph.jobs.some(j=>
    j.original_work_id===plan.parent_original_work_id&&
    j.source_ref===plan.source_ref&&j.phase==='BLOCKED'&&
    j.independent_source_proof_verified===true))
   return fail('FINAL_LOOP_CHILD_PARENT_OR_PLAN_SCOPE_DRIFT');
  seen.add(plan.plan_id);
  if(selectedRoutes!==null&&!selectedRoutes.some(r=>r.plan_id===plan.plan_id))continue;
  if(plan.verified_signed_source_goal_contract_prepared!==true||
     plan.owner_goal_acceptance_pending!==true||
     plan.independent_goal_acceptance_verified!==false||
     !HASH.test(plan.acceptance_contract_sha256||'')||
     plan.pending_exact_owner_approval!==true){
   status.push({plan_id:plan.plan_id,
    status:'SIGNED_SOURCE_GOAL_CONTRACT_OR_OWNER_APPROVAL_NOT_READY',
    owner_approval_granted:false});
   continue;
  }
  let p;try{
   p=await call(db,'reality_prepare_final_loop_child_approval_v1',{
    p_plan_id:plan.plan_id,
    p_acceptance_contract_sha256:plan.acceptance_contract_sha256,
    p_worker_run_id:workerRunId
   },{fetchImpl,timeoutMs:6000});
  }catch{
   p={status:'FINAL_LOOP_CHILD_APPROVAL_PACKET_PREPARATION_UNVERIFIED'};
  }
  const good=p?.status==='FINAL_LOOP_CHILD_EXACT_OWNER_APPROVAL_REQUIRED'&&
   UUID.test(p.packet_id||'')&&p.owner_id===graph.owner_id&&
   p.shift_id===graph.shift_id&&
   p.parent_original_work_id===plan.parent_original_work_id&&
   p.source_ref===plan.source_ref&&
   p.source_manifest_sha256===plan.source_manifest_sha256&&
   p.acceptance_contract_sha256===plan.acceptance_contract_sha256&&
   HASH.test(p.proposal_fingerprint||'')&&
   p.effect_type==='READ_ONLY_INTERNAL_PR_REVIEW'&&
   p.owner_approval_granted===false&&p.execution_authorized===false&&
   p.original_job_completed===false;
  status.push(Object.freeze({
   plan_id:plan.plan_id,status:good?p.status:
    'FINAL_LOOP_CHILD_APPROVAL_PACKET_NOT_VERIFIED',
   packet_id:good?p.packet_id:null,
   proposal_fingerprint:good?p.proposal_fingerprint:null,
   source_ref:plan.source_ref,
   owner_approval_granted:false
  }));
 }
 return fail('FINAL_LOOP_CHILD_APPROVAL_GATED_BY_EXACT_OWNER_ACTION',{
  owner_id:graph.owner_id,shift_id:graph.shift_id,
  parent_plan_count:status.length,
  pending_exact_approval_count:status.filter(x=>
   x.status==='FINAL_LOOP_CHILD_EXACT_OWNER_APPROVAL_REQUIRED').length,
  approvals:status
 });
}
