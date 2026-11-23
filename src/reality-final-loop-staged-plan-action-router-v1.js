// Existing signed Final Loop: durable source plans -> classified next handler.
// This is a read model, never a substitute for an original admission, owner
// approval, one-use service-role claim, executor, or independent final receipt.
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/;
const SHA=/^[a-f0-9]{40}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const PR=/^https:\/\/github\.com\/[a-z0-9_.-]+\/[a-z0-9_.-]+\/pull\/[1-9]\d*$/i;
const base=Object.freeze({
 schema:'reality-final-loop-staged-plan-action-route-v1',
 read_only:true,classification_only:true,
 action_dispatched:false,owner_approval_granted:false,
 child_originals_admitted:0,model_execution_authorized:false,
 installation_authorized:false,original_job_completed:false,
 production_changed:false,new_shift_started:false
});
const result=(status,routes=[])=>Object.freeze({
 ...base,status,routes:Object.freeze(routes),
 prepared_owner_packet_candidate_count:routes.filter(x=>
  x.next_registered_handler==='PREPARE_FINAL_LOOP_CHILD_OWNER_PACKET').length,
 parent_admission_required_count:routes.filter(x=>
  x.next_governed_action==='QUALIFY_AND_ADMIT_EXACT_PARENT_ORIGINAL').length
});
export function classifySignedFinalLoopStagedPlanActions({
 graph,staged,preflight
}={}){
 if(graph?.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||
  !UUID.test(graph.owner_id||'')||!UUID.test(graph.shift_id||'')||
  !HASH.test(graph.plan_fingerprint||'')||
  graph.installation_authorized!==false||
  graph.production_changed!==false||
  !Array.isArray(graph.jobs)||
  staged?.schema!=='reality-final-loop-pr-source-plans-readback-v1'||
  staged.status!=='FINAL_LOOP_PROPOSED_SOURCE_PLANS_NOT_EXECUTABLE'||
  staged.owner_id!==graph.owner_id||staged.shift_id!==graph.shift_id||
  staged.plan_fingerprint!==graph.plan_fingerprint||
  staged.read_only!==true||staged.execution_authorized!==false||
  staged.original_job_completed!==false||
  staged.child_originals_admitted!==0||
  !Array.isArray(staged.plans)||staged.plans.length<1||
  staged.plans.length>10)
  return result('FINAL_LOOP_SIGNED_STAGED_SOURCE_PROOF_UNVERIFIED');
 if(preflight?.status!=='FINAL_LOOP_CHILD_GOAL_ACCEPTANCE_PREFLIGHT_READ_ONLY'||
  preflight.owner_id!==graph.owner_id||
  preflight.shift_id!==graph.shift_id||
  preflight.plan_fingerprint!==graph.plan_fingerprint||
  preflight.read_only!==true||preflight.execution_authorized!==false||
  preflight.original_job_completed!==false||
  !Array.isArray(preflight.plans)||preflight.plans.length>10)
  return result('FINAL_LOOP_STAGED_APPROVAL_PREFLIGHT_UNVERIFIED');
 const usedPlans=new Set(),usedSources=new Set(),matched=new Set();
 const routes=[];
 for(const plan of staged.plans){
  if(!UUID.test(plan?.plan_id||'')||
    usedPlans.has(plan.plan_id)||usedSources.has(plan.source_ref)||
    !PR.test(plan.source_ref||'')||
    !SHA.test(plan.source_head_sha||'')||
    !HASH.test(plan.source_manifest_sha256||'')||
    plan.state!=='PROPOSED_SOURCE_PLAN_AWAITING_INDEPENDENT_ADMISSION'||
    !Number.isSafeInteger(plan.file_count)||plan.file_count<9||
    plan.file_count>500||
    !Number.isSafeInteger(plan.proposed_scope_count)||
    plan.proposed_scope_count<2||plan.proposed_scope_count>63||
    plan.child_originals_admitted!==0||
    plan.owner_acceptance_verified!==false||
    plan.independent_source_review_verified!==false||
    !['BLOCKED','NOT_ADMITTED'].includes(plan.parent_source_phase)||
    (plan.parent_source_phase==='BLOCKED'?
     !WORK.test(plan.parent_original_work_id||''):
     plan.parent_original_work_id!==null))
   return result('FINAL_LOOP_STAGED_SOURCE_IDENTITY_OR_PHASE_DRIFT');
  const found=graph.jobs.filter(j=>j.source_ref===plan.source_ref&&
   j.phase===plan.parent_source_phase&&
   (j.original_work_id??null)===plan.parent_original_work_id&&
   j.original_kind==='REAL_PR_REVIEW_ORIGINAL'&&
   j.independent_source_proof_verified===true);
  if(found.length!==1)
   return result('FINAL_LOOP_STAGED_PARENT_ORIGINAL_GRAPH_MISMATCH');
  usedPlans.add(plan.plan_id);usedSources.add(plan.source_ref);
  const matching=preflight.plans.filter(p=>p.plan_id===plan.plan_id);
  if(matching.length>1)
   return result('FINAL_LOOP_STAGED_GOAL_PREFLIGHT_DUPLICATED');
  const p=matching[0];
  if(p){
   if(plan.parent_source_phase!=='BLOCKED'||
    p.source_ref!==plan.source_ref||
    p.parent_original_work_id!==plan.parent_original_work_id||
    p.source_manifest_sha256!==plan.source_manifest_sha256||
    !HASH.test(p.acceptance_contract_sha256||'')||
    p.verified_signed_source_goal_contract_prepared!==true||
    p.owner_goal_acceptance_pending!==true||
    p.independent_goal_acceptance_verified!==false||
    p.pending_exact_owner_approval!==true||
    p.child_review_automatically_authorized!==false)
    return result('FINAL_LOOP_STAGED_GOAL_CONTRACT_OR_SOURCE_DRIFT');
   matched.add(p.plan_id);
  }
  const next=plan.parent_source_phase==='NOT_ADMITTED'?
   'QUALIFY_AND_ADMIT_EXACT_PARENT_ORIGINAL':
   p?'PREPARE_EXACT_SOURCE_BOUND_OWNER_APPROVAL_PACKET':
    'PREPARE_VERIFIED_PARENT_GOAL_ACCEPTANCE_CONTRACT';
  routes.push(Object.freeze({
   plan_id:plan.plan_id,source_ref:plan.source_ref,
   parent_original_work_id:plan.parent_original_work_id,
   source_manifest_sha256:plan.source_manifest_sha256,
   source_head_sha:plan.source_head_sha,
   parent_source_phase:plan.parent_source_phase,
   proposed_scope_count:plan.proposed_scope_count,
   acceptance_contract_sha256:p?.acceptance_contract_sha256??null,
   next_governed_action:next,
   next_registered_handler:p?
    'PREPARE_FINAL_LOOP_CHILD_OWNER_PACKET':null,
   handler_requires_isolated_service_claim:Boolean(p),
   source_plan_only:true,owner_action_required:Boolean(p),
   handler_dispatched:false,owner_approval_granted:false,
   child_execution_authorized:false,original_job_completed:false
  }));
 }
 if(matched.size!==preflight.plans.length)
  return result('FINAL_LOOP_STAGED_PREFLIGHT_REFERENCES_UNMATCHED_SOURCE');
 return result('FINAL_LOOP_STAGED_PLANS_VERIFIED_AND_NEXT_HANDLERS_CLASSIFIED',routes);
}
