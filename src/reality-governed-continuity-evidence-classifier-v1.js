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
   // A later independent signed worker may have verified the exact preview
   // installation target, but this is still NOT an owner approval or an install.
   const reviewedTarget=x?.install_target_verified===true&&
    HASH.test(x.target_review_receipt_sha256||'')&&
    x.target_review_branch==='reality/chat-direct-work-handoff-20261115'&&
    GIT.test(x.target_review_head_sha||'')&&
    GIT.test(x.historical_source_blob_sha||'')&&
    x.target_review_existing_blob_sha===x.historical_source_blob_sha;
   const pendingTarget=x?.install_target_verified===false&&
    x.target_review_receipt_sha256==null;
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
    (!reviewedTarget&&!pendingTarget)||x.owner_approval_ready!==false||
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
    classified_state:reviewedTarget?
     'EXACT_ARTIFACT_INSTALL_TARGET_INDEPENDENTLY_VERIFIED_APPROVAL_PENDING':
     'VERIFIED_ARTIFACT_INSTALL_TARGET_NOT_YET_VERIFIED',
    candidate_commit_sha:x.candidate_commit_sha,
    source_blob_sha:x.candidate_source_blob_sha,
    independent_evidence_receipt_sha256:x.review_receipt_sha256,
    frozen_test_receipt_sha256:x.case_ci_receipt_sha256,
    github_run_id:x.github_run_id,github_artifact_id:x.github_artifact_id,
    next_governed_action:reviewedTarget?
     'EXACT_OWNER_APPROVAL_AND_ORIGINAL_RESUME_CONTRACT_REQUIRED':
     'INDEPENDENT_INSTALL_TARGET_AND_OWNER_APPROVAL_REVIEW_REQUIRED',
    next_responsible_actor:reviewedTarget?
     'REALITY_GOVERNED_EXACT_OWNER_INSTALL_APPROVAL_GATE':
     'REALITY_GOVERNED_INSTALL_TARGET_REVIEW',
    install_target_verified:reviewedTarget,
    target_review_receipt_sha256:reviewedTarget?x.target_review_receipt_sha256:null,
    owner_approval_ready:false
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


// The SAME categorizer also reconciles durable Continuity investigation,
// governed-action and independent-review readbacks. These are different
// receipts: a model's diagnosis is never repair, execution or settlement.
// This projects next-work evidence only; it does not invoke any handler.
export function classifyRealityContinuityRecoveryHandoff({
 ownerId,shiftId,incidentsReadback,actionsReadback
}={}){
 const base={
  schema:'reality-governed-continuity-recovery-handoff-v1',
  owner_id:UUID.test(ownerId||'')?ownerId:null,
  shift_id:UUID.test(shiftId||'')?shiftId:null,
  read_only:true,classification_only:true,
  action_dispatched:false,repair_executed:false,
  independent_repair_verified:false,original_job_completed:false,
  installation_authorized:false,production_changed:false,
  owner_approval_granted:false,new_shift_started:false
 };
 const finish=(status,items=[])=>Object.freeze({
  ...base,status,items:Object.freeze(items),count:items.length
 });
 const goodRead=(r,status)=>r?.status===status&&
  r.owner_id===ownerId&&r.owner_scope_verified===true&&
  r.read_only===true&&r.execution_authorized===false&&
  r.installation_authorized===false&&r.production_changed===false&&
  Array.isArray(r.items)&&r.count===r.items.length&&
  Number.isSafeInteger(r.count)&&r.count>=0&&r.count<=8;
 if(!UUID.test(ownerId||'')||!UUID.test(shiftId||'')||
  !goodRead(incidentsReadback,'OWNER_SHIFT_CONTINUITY_INCIDENTS_READ_ONLY')||
  !goodRead(actionsReadback,'OWNER_SIGNED_SHIFT_RECOVERY_ACTIONS_READ_ONLY'))
  return finish('GOVERNED_RECOVERY_DURABLE_READBACK_UNVERIFIED');
 const actions=new Map();
 for(const a of actionsReadback.items){
  if(!UUID.test(a?.incident_id||'')||
    !UUID.test(a?.shift_id||'')||
    a.original_job_completed!==false||
    a.installation_authorized!==false||
    a.production_changed!==false)
   return finish('GOVERNED_RECOVERY_ACTION_LINEAGE_UNVERIFIED');
  // An owner can have historical shifts; their independently scoped receipts
  // are not foreign authorization and cannot drive this particular shift.
  if(a.shift_id!==shiftId)continue;
  if(actions.has(a.incident_id))
   return finish('GOVERNED_RECOVERY_ACTION_LINEAGE_UNVERIFIED');
  actions.set(a.incident_id,a);
 }
 const items=[],seen=new Set();
 for(const i of incidentsReadback.items){
  if(!UUID.test(i?.incident_id||'')||
   !UUID.test(i?.shift_id||'')||
   typeof i.kind!=='string'||!/^[A-Z][A-Z0-9_]{3,110}$/.test(i.kind)||
   typeof i.phase!=='string'||!/^[A-Z][A-Z0-9_]{3,110}$/.test(i.phase)||
   seen.has(i.incident_id))
   return finish('GOVERNED_RECOVERY_INCIDENT_LINEAGE_UNVERIFIED');
  seen.add(i.incident_id);
  if(i.shift_id!==shiftId)continue; // Other owner's shifts cannot be routed here.
  const a=actions.get(i.incident_id);
  if(a&&(a.kind!==i.kind||a.incident_phase!==i.phase||
    !HASH.test(a.action_receipt_sha256||'')||
    a.action_independently_rechecked===true&&
     !HASH.test(a.independent_review_receipt_sha256||'')))
   return finish('GOVERNED_RECOVERY_ACTION_RECEIPT_UNVERIFIED');
  const m=typeof i.proposed_upgrade==='string'?
   /^\[GOVERNED_ACTION:([A-Z][A-Z0-9_]{3,90})\]\[BLOCKER_CLASS:([A-Z][A-Z0-9_]{3,90})\] /.exec(i.proposed_upgrade):null;
  const diagnosisValid=
   i.phase==='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF'&&
   HASH.test(i.investigation_receipt_sha256||'');
  const recoveryRecorded=
   HASH.test(i.recovery_receipt_sha256||'')&&
   typeof i.recovered_at==='string'&&
   Number.isFinite(Date.parse(i.recovered_at));
  const reviewed=Boolean(a&&a.action_independently_rechecked===true&&
   HASH.test(a.independent_review_receipt_sha256||''));
  const state=recoveryRecorded?
   'INCIDENT_RECOVERY_RECEIPTED_ORIGINAL_SETTLEMENT_UNVERIFIED':
   reviewed?'GOVERNED_ACTION_INDEPENDENTLY_REVIEWED_ORIGINAL_UNSETTLED':
   a?'GOVERNED_ACTION_RECORDED_INDEPENDENT_REVIEW_PENDING':
   diagnosisValid?'DIAGNOSIS_RECORDED_CORRECTIVE_ACTION_UNVERIFIED':
   'INCIDENT_UNVERIFIED_OR_STILL_UNDER_INVESTIGATION';
  const nextAction=recoveryRecorded?'VERIFY_ORIGINAL_JOB_SETTLEMENT_INDEPENDENTLY':
   reviewed?(typeof a.owner_next_action==='string'?
     a.owner_next_action:'VERIFY_EXACT_ORIGINAL_AND_REENTRY_GATE'):
   a?'WAIT_FOR_DISTINCT_INDEPENDENT_ACTION_REVIEW':
   diagnosisValid&&m&&m[1]==='REQUEST_EXACT_OWNER_APPROVAL'?
    'VERIFY_PROVIDER_AUTHORITY_BEFORE_EXACT_OWNER_REQUEST':
   diagnosisValid&&m?'DISCOVER_REGISTERED_GOVERNED_ACTION_ADAPTER':
    'REQUIRE_DURABLE_INDEPENDENT_INVESTIGATION_PROOF';
  items.push(Object.freeze({
   incident_id:i.incident_id,shift_id:shiftId,kind:i.kind,
   incident_phase:i.phase,continuity_state:state,
   proposed_action:m?m[1]:null,blocker_class:m?m[2]:null,
   investigation_receipt_sha256:diagnosisValid?
    i.investigation_receipt_sha256:null,
   governed_action_receipt_sha256:a?a.action_receipt_sha256:null,
   independent_action_review_receipt_sha256:reviewed?
    a.independent_review_receipt_sha256:null,
   incident_recovery_receipt_sha256:recoveryRecorded?
    i.recovery_receipt_sha256:null,
   next_governed_action:nextAction,
   execution_permitted_by_classification:false,
   owner_approval_granted_by_classification:false,
   original_job_completed:false,repair_verified_by_classification:false
  }));
 }
 return finish('GOVERNED_RECOVERY_DURABLE_HANDOFFS_CLASSIFIED',items);
}
