// Reality's GOVERNED evidence classifier lives AFTER independent verification
// and BEFORE continuity state advancement. This is a deterministic, read-only
// policy boundary, NOT an LLM planner, installer, verifier, authority grant,
// new job creator, or replacement for the existing shift controller.
import {isSignedMaintenanceOriginalLineageMissing}
 from './reality-signed-maintenance-original-lineage-boundary-v1.js';
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/;
const GIT=/^[a-f0-9]{40}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const PR=/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/;
const readonly=Object.freeze({
 classifier_grants_authority:false,
 evidence_classification_only:true,
 ledger_mutated:false,
 universe_state_mutated:false,
 installation_authorized:false,
 repair_installed:false,
 original_job_completed:false,
 production_changed:false,
 new_shift_started:false
});
const lane=(o)=>Object.freeze({...o,authority_status:'NO_NEW_ACTION_AUTHORITY',
 execution_permitted_by_classification:false,
 approval_permitted_by_classification:false});
const result=(status,ownerId,shiftId,lanes,notes)=>Object.freeze({
 schema:'reality-governed-continuity-evidence-classifier-v1',
 status,owner_id:ownerId||null,shift_id:shiftId||null,
 lanes:Object.freeze(lanes),lane_count:lanes.length,
 classifier_notes:Object.freeze(notes),
 ...readonly
});
export function classifyRealityGovernedContinuityEvidence({
 ownerId,shiftId,originalGate,artifactReadback
}={}){
 if(!UUID.test(ownerId||'')||!UUID.test(shiftId||''))
  return result('GOVERNED_CLASSIFIER_SIGNED_IDENTITY_UNVERIFIED',null,null,[],
   ['OWNER_AND_EXISTING_SHIFT_REQUIRED']);
 // Other original statuses must be separately admitted to classification.
 // Never translate a claim or plain GitHub PR into business execution.
 const g=originalGate;
 if(g?.owner_id!==ownerId||g?.shift_id!==shiftId||
    g?.read_only!==true||
    g?.installation_authorized!==false||
    g?.production_changed!==false||
    g?.new_job_created!==false||
    g?.warrant_mode!=='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'||
    g?.independent_final_receipt_verified!==false||
    g?.original_job_completed!==false)
  return result('GOVERNED_CLASSIFIER_ORIGINAL_GATE_UNVERIFIED',
   ownerId,shiftId,[],['INDEPENDENT_ORIGINAL_GATE_RECHECK_REQUIRED']);
 const lanes=[],notes=[];
 if(isSignedMaintenanceOriginalLineageMissing(g)&&
   UUID.test(g.existing_maintenance_id||'')&&WORK.test(g.original_work_id||'')){
  lanes.push(lane({
   lane_kind:'CANONICAL_BUSINESS_ORIGINAL',
   source_ref:g.source_ref,
   maintenance_id:g.existing_maintenance_id,
   original_work_id:g.original_work_id,
   evidence_class:'SIGNED_REVIEWED_SOURCE_WITHOUT_EXECUTABLE_ORIGINAL_ADMISSION',
   verified_fact:'CANONICAL_OWNER_BUSINESS_ORIGINAL_MISSING',
   classified_state:'SOURCE_ADMITTED_EXECUTION_BLOCKED',
   independent_evidence_receipt_sha256:g.signed_external_review_receipt_sha256,
   next_governed_action:'VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI',
   next_responsible_actor:'REALITY_GOVERNED_WORK_QUALIFICATION',
   original_customer_execution_verified:false
  }));
 }else notes.push('ORIGINAL_WORK_LINEAGE_NOT_INDEPENDENTLY_CLASSIFIED');
 const a=artifactReadback;
 if(a?.status!=='OWNER_VERIFIED_MAINTENANCE_ARTIFACTS_READ_ONLY'||
  a.owner_id!==ownerId||a.installation_authorized!==false||
  a.production_changed!==false||
  !Number.isSafeInteger(a.count)||a.count<0||a.count>4||
  !Array.isArray(a.items)||a.items.length!==a.count){
  notes.push('INDEPENDENT_REPAIR_ARTIFACT_READBACK_UNVERIFIED');
 }else{
  const scoped=Array.isArray(g.scoped_maintenance_case_ci_receipts)?
   g.scoped_maintenance_case_ci_receipts:[];
  const seen=new Set(),verified=[];
  let invalid=false;
  for(const x of a.items){
   const linked=scoped.find(c=>c?.maintenance_id===x?.maintenance_id&&
    c?.source_ref===x?.source_ref&&
    c?.case_specific_ci_receipt_sha256===x?.case_ci_receipt_sha256&&
    c?.frozen_source_red_verified===true&&
    c?.corrected_code_green_verified===true&&
    c?.repair_installed===false&&c?.original_job_completed===false);
   if(!x||!UUID.test(x.maintenance_id||'')||
    x.shift_id!==shiftId||!PR.test(x.source_ref||'')||
    seen.has(x.maintenance_id)||x.maintenance_id===g.existing_maintenance_id||
    !linked||
    !GIT.test(x.candidate_commit_sha||'')||
    !GIT.test(x.candidate_source_blob_sha||'')||
    !HASH.test(x.review_receipt_sha256||'')||
    !HASH.test(x.case_ci_receipt_sha256||'')||
    !HASH.test(x.github_artifact_digest||'')||
    !Number.isSafeInteger(x.github_run_id)||x.github_run_id<10000||
    !Number.isSafeInteger(x.github_artifact_id)||x.github_artifact_id<10000||
    x.install_target_verified!==false||x.owner_approval_ready!==false||
    x.installation_authorized!==false||x.repair_installed!==false||
    x.original_job_completed!==false){
    invalid=true;break;
   }
   seen.add(x.maintenance_id);
   verified.push(lane({
    lane_kind:'INTERNAL_CAPABILITY_REPAIR',
    source_ref:x.source_ref,
    maintenance_id:x.maintenance_id,
    original_work_id:null,
    evidence_class:'INDEPENDENT_FROZEN_RED_GREEN_AND_PINNED_REPAIR_ARTIFACT',
    verified_fact:'EXACT_SOURCE_REPAIR_ARTIFACT_IN_LEDGER',
    classified_state:'VERIFIED_ARTIFACT_INSTALL_TARGET_NOT_YET_VERIFIED',
    candidate_commit_sha:x.candidate_commit_sha,
    source_blob_sha:x.candidate_source_blob_sha,
    independent_evidence_receipt_sha256:x.review_receipt_sha256,
    frozen_test_receipt_sha256:x.case_ci_receipt_sha256,
    github_run_id:x.github_run_id,github_artifact_id:x.github_artifact_id,
    next_governed_action:'INDEPENDENT_INSTALL_TARGET_AND_OWNER_APPROVAL_REVIEW_REQUIRED',
    next_responsible_actor:'REALITY_GOVERNED_INSTALL_TARGET_REVIEW',
    install_target_verified:false,owner_approval_ready:false
   }));
  }
  if(invalid)notes.push('ARTIFACT_CROSS_LEDGER_LINEAGE_OR_AUTHORITY_CONFLICT');
  else lanes.unshift(...verified);
 }
 return result(lanes.length&&notes.length===0?
   'GOVERNED_CONTINUITY_EVIDENCE_SEPARATED_AND_ROUTED':
   lanes.length?'GOVERNED_CONTINUITY_PARTIAL_EVIDENCE_CLASSIFIED':
   'GOVERNED_CONTINUITY_EVIDENCE_UNVERIFIED',
  ownerId,shiftId,lanes,notes);
}
