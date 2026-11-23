// Reality's EXISTING engineering/maintenance capability seen through the
// SAME canonical Final Loop, original work and Continuity Spine.
// This is a continuation decision, not a new agent or a second work ledger.
// The actual signed worker already owns model drafting, CI claims, independent
// reviews, exact installation approvals and original-work settlement.
export const FINAL_LOOP_GOVERNED_ENGINEERING_VERSION=
 'reality-final-loop-governed-engineering-v1';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const PR=/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/;
const result=(status,data={})=>Object.freeze({
 schema:FINAL_LOOP_GOVERNED_ENGINEERING_VERSION,
 status,read_only:true,continuity_source:'SAME_FINAL_LOOP_CONTINUITY_HEAD',
 engineering_handler_dispatch_authorized:false,
 model_output_is_not_independent_test:true,
 owner_approval_granted:false,installation_authorized:false,
 production_changed:false,recovery_verified:false,
 original_job_completed:false,shift_completed:false,
 ...data
});
function recognizedOriginal(view){
 const c=view?.canonical_continuity_handoff;
 const p=view?.time_horizon?.present;
 if(!['FINAL_LOOP_OWNER_TIME_AND_EXECUTIVE_EVIDENCE_READY',
  'FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING'].includes(view?.status)||
  view.owner_id==null||!UUID.test(view.owner_id)||
  !UUID.test(view.shift_id||'')||
  !HASH.test(view.continuity_head_sha256||'')||
  c?.status!=='CANONICAL_HANDOFF_CARRIED_WITH_UNFINISHED_PROOFS'||
  c.canonical_handoff_verified!==true||
  c.read_only!==true||
  c.continuity_head_sha256!==view.continuity_head_sha256||
  !UUID.test(c.continuity_root_id||'')||
  c.original_job_completed!==false||
  p?.owner_id!==view.owner_id||p.shift_id!==view.shift_id||
  !Array.isArray(p.obligations)||p.obligations.length>8||
  view.original_job_completed!==false)
  return null;
 return {owner_id:view.owner_id,shift_id:view.shift_id,
  continuity_root_id:c.continuity_root_id,
  continuity_head_sha256:c.continuity_head_sha256,
  obligations:p.obligations};
}
const sameOrigin=(x,scope)=>
 x?.owner_id===scope.owner_id&&
 x?.shift_id===scope.shift_id&&
 x?.source_ref===scope.source_ref&&
 x?.original_work_id===scope.original_work_id;
export function inspectFinalLoopGovernedEngineering({
 canonicalView,maintenanceGate,modelCandidate=null,
 independentTargetReview=null,caseCi=null,releaseLane=null
}={}){
 const c=recognizedOriginal(canonicalView);
 if(!c)return result('ENGINEERING_CANONICAL_FINAL_LOOP_NOT_VERIFIED');
 if(maintenanceGate?.status!==
     'EXISTING_ORIGINAL_AUTHORIZED_INTERNAL_MAINTENANCE'||
    maintenanceGate.read_only!==true||
    maintenanceGate.owner_id!==c.owner_id||
    maintenanceGate.shift_id!==c.shift_id||
    !UUID.test(maintenanceGate.existing_maintenance_id||'')||
    !WORK.test(maintenanceGate.original_work_id||'')||
    !PR.test(maintenanceGate.source_ref||'')||
    maintenanceGate.original_job_completed!==false||
    maintenanceGate.installation_authorized!==false||
    maintenanceGate.production_changed!==false||
    maintenanceGate.independent_final_receipt_verified!==false||
    !['VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI',
      'RUN_INDEPENDENT_EXECUTABLE_FROZEN_CI_RED_BEFORE_MODEL_PATCH',
      'INDEPENDENTLY_VERIFY_FROZEN_CI_RED_AND_REPAIR'].includes(
       maintenanceGate.next_action))
  return result('ENGINEERING_ORIGINAL_MAINTENANCE_READBACK_UNVERIFIED');
 const original=c.obligations.filter(x=>
  x.original_work_id===maintenanceGate.original_work_id&&
  x.source_ref===maintenanceGate.source_ref&&
  x.action_executed===false&&x.settlement_committed===false);
 if(original.length!==1)
  return result('ENGINEERING_MAINTENANCE_NOT_BOUND_TO_ONE_FINAL_LOOP_ORIGINAL');
 const scope={owner_id:c.owner_id,shift_id:c.shift_id,
  original_work_id:maintenanceGate.original_work_id,
  source_ref:maintenanceGate.source_ref};
 const common={
  ...scope,continuity_root_id:c.continuity_root_id,
  continuity_head_sha256:c.continuity_head_sha256,
  maintenance_id:maintenanceGate.existing_maintenance_id,
  pending_original_obligation:true,source_not_replaced:true,
  candidate_is_not_verified_repair:true
 };
 if(maintenanceGate.canonical_owner_business_original_missing===true)
  return result('ENGINEERING_EXACT_BUSINESS_ORIGINAL_WARRANT_REQUIRED',{
   ...common,model_candidate_status:'NOT_DECISIVE_FOR_AUTHORITY',
   next_governed_action:
    'VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI',
   next_registered_handler:null,
   owner_action_required:true,
   frozen_case_red_independently_verified:false,
   registered_engineering_execution_not_permitted:true
  });
 if(maintenanceGate.canonical_owner_business_original_missing!==false)
  return result('ENGINEERING_BUSINESS_ORIGINAL_LINEAGE_UNKNOWN',common);
 if(modelCandidate!==null){
  if(modelCandidate.maintenance_id!==scope.maintenance_id&&
     modelCandidate.maintenance_id!==maintenanceGate.existing_maintenance_id){
   // The candidate can belong to another signed maintenance original.
   return result('ENGINEERING_MODEL_CANDIDATE_IS_DIFFERENT_MAINTENANCE',{
    ...common,next_governed_action:
     'REOBSERVE_EXACT_ORIGINAL_ENGINEERING_CANDIDATE'
   });
  }
  if(modelCandidate.status===
   'SIGNED_MAINTENANCE_REPAIR_CODE_CANDIDATE_RECORDED'&&
   (!sameOrigin(modelCandidate,scope)||
    !HASH.test(modelCandidate.candidate_receipt_sha256||'')||
    modelCandidate.model_generated!==true||
    modelCandidate.independent_frozen_red_verified!==false||
    modelCandidate.independent_ci_verified!==false||
    modelCandidate.installation_authorized!==false||
    modelCandidate.original_job_completed!==false||
    modelCandidate.production_changed!==false))
   return result('ENGINEERING_GENERATED_CANDIDATE_RECEIPT_UNVERIFIED',common);
 }
 const candidateRecorded=modelCandidate?.status===
  'SIGNED_MAINTENANCE_REPAIR_CODE_CANDIDATE_RECORDED'&&
  modelCandidate.maintenance_id===maintenanceGate.existing_maintenance_id;
 if(caseCi!==null&&caseCi.maintenance_id===maintenanceGate.existing_maintenance_id&&
    caseCi.status===
      'EXACT_SIGNED_MAINTENANCE_SOURCE_CI_RED_GREEN_INDEPENDENTLY_ATTESTED'&&
    (caseCi.shift_id!==scope.shift_id||
     !HASH.test(caseCi.case_specific_ci_receipt_sha256||'')||
     caseCi.case_specific_frozen_red_attested!==true||
     caseCi.code_regression_green_verified!==true||
     caseCi.repair_installed!==false||
     caseCi.original_job_completed!==false||
     caseCi.installation_authorized!==false))
  return result('ENGINEERING_CASE_CI_EVIDENCE_INVALID',common);
 const verifiedCi=caseCi?.maintenance_id===maintenanceGate.existing_maintenance_id&&
  caseCi.status===
    'EXACT_SIGNED_MAINTENANCE_SOURCE_CI_RED_GREEN_INDEPENDENTLY_ATTESTED'&&
  caseCi.shift_id===scope.shift_id&&
  HASH.test(caseCi.case_specific_ci_receipt_sha256||'')&&
  caseCi.case_specific_frozen_red_attested===true&&
  caseCi.code_regression_green_verified===true;
 if(verifiedCi)return result('ENGINEERING_CASE_CI_VERIFIED_ORIGINAL_STILL_OPEN',{
  ...common,case_ci_receipt_sha256:caseCi.case_specific_ci_receipt_sha256,
  frozen_case_red_independently_verified:true,
  candidate_model_generated_on_this_wake:candidateRecorded,
  next_governed_action:
   'INDEPENDENTLY_VERIFY_CANDIDATE_FIX_AND_REQUEST_EXACT_INSTALL_APPROVAL',
  next_registered_handler:null,owner_action_required:true
 });
 const targetReviewed=independentTargetReview?.maintenance_id===
  maintenanceGate.existing_maintenance_id&&
  independentTargetReview.target_in_worker_graph===true&&
  independentTargetReview.model_candidate_is_fix===false;
 return result('ENGINEERING_INDEPENDENT_FROZEN_RED_STILL_REQUIRED',{
  ...common,model_candidate_status:candidateRecorded?
   'SOURCE_CANDIDATE_DURABLY_RECORDED_NOT_TESTED':
   'CANDIDATE_NOT_IN_THIS_SIGNED_WAKE',
  target_dependency_only:targetReviewed,
  frozen_case_red_independently_verified:false,
  next_governed_action:'RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED',
  next_registered_handler:'RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED',
  handler_claim_must_reverify_exact_warrant:true,
  // No automatic dispatch from a read model. The existing signed worker
  // holds the registered handler and service-only one-use DB claim.
  registered_engineering_execution_not_permitted:
    releaseLane?.operating_lane!=='NORMAL_SIGNED_SHIFT',
  release_lane_status:releaseLane?.status||'NOT_OBSERVED',
  owner_action_required:false
 });
}
