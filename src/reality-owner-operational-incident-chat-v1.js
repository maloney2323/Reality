// Reality operational incident -> authenticated OWNER Chat readback.
// Source of truth is the EXISTING watchdog / recovery ledger, not model prose.
// Chat may explain and discuss this evidence. It cannot approve a repair,
// create a customer job, mutate the recovery state, or notify customers.
import {shiftDatabase,shiftRpc} from './reality-governed-shift-boundary-v1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/;
const phases=new Set([
 'DETECTED','LEASED_FOR_INVESTIGATION',
 'EMPLOYEE_INVESTIGATION_SCHEDULED','BLOCKED_NEEDS_EVIDENCE',
 'OPERATIONAL_CONTINUITY_VERIFIED_EXTERNAL_FIX'
]);
const fail=()=>{throw Error('OPERATIONAL_CHAT_OWNER_INCIDENT_PROOF_REQUIRED');};
const trim=(v,max)=>typeof v==='string'?v.slice(0,max):'';
const validDate=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const stage=phase=>({
 DETECTED:'DETECTED · Reality is opening an investigation',
 LEASED_FOR_INVESTIGATION:'INVESTIGATING · Employee recovery inquiry claimed',
 EMPLOYEE_INVESTIGATION_SCHEDULED:'INVESTIGATION SCHEDULED · Independent proof pending',
 BLOCKED_NEEDS_EVIDENCE:'BLOCKED · The required evidence is not verified',
 OPERATIONAL_CONTINUITY_VERIFIED_EXTERNAL_FIX:
  'OPERATIONAL RECOVERY VERIFIED · External correction, not autonomous repair'
})[phase];
export function projectOwnerIncidentChatBriefing({ownerId,source,handoff=null,delivery=null,autoRepair=null,continuity=null,repairGates=null,qualifiedWork=null}={}){
 if(!UUID.test(ownerId||'')||
   source?.status!=='OWNER_SIGNED_WORKER_RECOVERY_EVIDENCE_READ_ONLY'||
   source.owner_id!==ownerId||source.owner_scope_verified!==true||
   source.read_only!==true||
   source.execution_authorized_by_read!==false||
   source.installation_authorized!==false||
   source.production_changed!==false||
   source.scheduler_dispatch_success_not_worker_proof!==true||
   source.autonomous_self_repair_proven!==false||
   !Array.isArray(source.incidents)||source.incidents.length>8||
   source.incident_count!==source.incidents.length||
   typeof source.next_action!=='string'||source.next_action.length>650)
  fail();
 let workerDelivery={
  phase:'SIGNED_WORKER_PROCESS_NOT_YET_ATTESTED',
  actual_worker_process_attested:false,
  latest_worker_status:'NO_SIGNED_WORKER_RUN_OBSERVED',
  latest_worker_stage:null,
  last_actual_worker_started_at:null,
  last_actual_worker_finished_at:null,
  last_scheduler_sql_dispatch_at:null,
  last_scheduler_sql_check_at:null,
  latest_scheduler_sql_dispatch_result:'NO_SCHEDULER_SQL_CHECK',
  scheduler_success_alone_proves_execution:false,
  next_action:'Verify a signed worker process receipt. A successful scheduler SQL call does not prove the worker executed.'
 };
 if(delivery!==null){
  if(delivery?.status!=='OWNER_SIGNED_WORKER_ACTUAL_RUN_READ_ONLY'||
   delivery.owner_id!==ownerId||delivery.owner_scope_verified!==true||
   delivery.read_only!==true||
   delivery.scheduler_success_alone_proves_execution!==false||
   delivery.original_job_completed_by_read!==false||
   delivery.repair_executed_by_read!==false||
   delivery.installation_authorized!==false||
   delivery.production_changed!==false||
   typeof delivery.actual_worker_process_attested!=='boolean'||
   !['STARTED','COMPLETED','FAILED',
      'NO_SIGNED_WORKER_RUN_OBSERVED'].includes(delivery.latest_worker_status))
   fail();
  const lastStarted=delivery.last_actual_worker_started_at;
  const lastFinished=delivery.last_actual_worker_finished_at;
  const started=typeof lastStarted==='string'&&Number.isFinite(Date.parse(lastStarted));
  const finished=typeof lastFinished==='string'&&Number.isFinite(Date.parse(lastFinished));
  if(delivery.actual_worker_process_attested!==started)fail();
  let phase=delivery.latest_worker_status==='FAILED'?
   'SIGNED_WORKER_FAILURE_RECORDED':
   delivery.latest_worker_status==='STARTED'?
    'SIGNED_WORKER_STARTED_NO_FINAL_RECEIPT':
   delivery.latest_worker_status==='COMPLETED'?
    'SIGNED_WORKER_PROCESS_COMPLETED':
    'SIGNED_WORKER_PROCESS_NOT_YET_ATTESTED';
  // A worker that started but has not recorded a terminal receipt is not
  // necessarily failed. After its bounded execution window, mark it unknown.
  if(phase==='SIGNED_WORKER_STARTED_NO_FINAL_RECEIPT'&&started&&
   Date.now()-Date.parse(lastStarted)>4*60*1000)
   phase='SIGNED_WORKER_STALLED_OR_FINAL_RECEIPT_MISSING';
  workerDelivery={
   phase,actual_worker_process_attested:delivery.actual_worker_process_attested,
   latest_worker_status:delivery.latest_worker_status,
   latest_worker_stage:trim(delivery.latest_worker_stage,80)||null,
   last_scheduler_sql_check_at:delivery.last_scheduler_sql_check_at||null,
   latest_scheduler_sql_dispatch_result:
    ['NO_ELIGIBLE_REQUEST_QUEUED',
     'HTTP_ENQUEUE_ATTEMPTED_NOT_DELIVERY_PROOF',
     'SCHEDULER_SQL_STATUS_UNCLASSIFIED','FAILED','NO_SCHEDULER_SQL_CHECK']
    .includes(delivery.latest_scheduler_sql_dispatch_result)?
     delivery.latest_scheduler_sql_dispatch_result:'DISPATCH_READBACK_UNVERIFIED',
   last_actual_worker_started_at:started?lastStarted:null,
   last_actual_worker_finished_at:finished?lastFinished:null,
   last_scheduler_sql_dispatch_at:delivery.last_scheduler_sql_dispatch_at||null,
   scheduler_success_alone_proves_execution:false,
   next_action:phase==='SIGNED_WORKER_PROCESS_COMPLETED'?
    'Signed worker process completion is attested. Continue checking each original job’s independent receipt.':
    phase==='SIGNED_WORKER_FAILURE_RECORDED'?
    'Reality recorded a signed worker failure. Diagnose its last stage and continue other authorized work.':
    delivery.latest_scheduler_sql_dispatch_result==='NO_ELIGIBLE_REQUEST_QUEUED'?
    'The scheduler returned zero eligible rows: no HTTP request was queued this check. If assigned work remains, inspect eligibility, quota and recorded inquiry receipts.':
    'The signed worker has not supplied a verified final receipt. Inspect worker delivery and preserve the blocker; do not call scheduler dispatch a completed job.'
  };
 }
 let previewRepair={
  status:'NO_OWNER_PREVIEW_SELF_REPAIR_READBACK',
  count:0,items:[],historical_external_correction_not_reclassified:true
 };
 const repairByIncident=new Map();
 if(autoRepair!==null){
  if(autoRepair?.status!=='OWNER_PREVIEW_OPERATIONAL_AUTO_REPAIR_READ_ONLY'||
   autoRepair.owner_id!==ownerId||
   autoRepair.owner_scope_verified!==true||
   autoRepair.read_only!==true||
   autoRepair.production_changed!==false||
   autoRepair.new_job_authorized_by_read!==false||
   autoRepair.install_authorized_by_read!==false||
   autoRepair.historical_external_correction_not_reclassified!==true||
   !Array.isArray(autoRepair.items)||autoRepair.items.length>6||
   autoRepair.items.length!==autoRepair.count)fail();
  const allowed=new Set([
   'PATCH_APPLIED_AWAITING_WORKER',
   'WORKER_ATTESTED_AWAITING_ORIGINAL',
   'WORKER_RESTORED_NO_ORIGINAL_TO_RESUME',
   'INDEPENDENT_WORKER_AND_ORIGINAL_VERIFIED',
   'BLOCKED_UNRECOGNIZED_SCOPE',
   'BLOCKED_EVIDENCE_OR_WORKER_MISSING'
  ]);
  const normalized=autoRepair.items.map(r=>{
   if(!UUID.test(r.repair_id||'')||
      !UUID.test(r.incident_id||'')||
      !allowed.has(r.phase)||
      r.repair_kind!=='EXACT_PREVIEW_SCHEDULER_OWNER_FEED_ROLE_MISMATCH'||
      r.preview_only!==true||r.production_changed!==false||
      !HASH.test(r.before_sha256||'')||
      !HASH.test(r.repair_receipt_sha256||'')||
      (r.after_sha256!=null&&!HASH.test(r.after_sha256))||
      (r.original_work_receipt_sha256!=null&&
       !HASH.test(r.original_work_receipt_sha256))||
      typeof r.next_action!=='string'||r.next_action.length>650||
      (r.phase==='INDEPENDENT_WORKER_AND_ORIGINAL_VERIFIED'&&
       (!UUID.test(r.worker_run_id||'')||
        !UUID.test(r.original_capability_claim_id||'')||
        !HASH.test(r.original_work_receipt_sha256||'')||
        !validDate(r.verified_at)))||
      (r.phase==='PATCH_APPLIED_AWAITING_WORKER'&&
       (!HASH.test(r.after_sha256||'')||!validDate(r.repair_applied_at))))
    fail();
   const normalizedItem=Object.freeze({
    repair_id:r.repair_id,incident_id:r.incident_id,phase:r.phase,
    repair_kind:r.repair_kind,receipt_sha256:r.repair_receipt_sha256,
    repair_applied_at:r.repair_applied_at||null,
    verified_at:r.verified_at||null,
    worker_run_id:r.worker_run_id||null,
    original_capability_claim_id:r.original_capability_claim_id||null,
    original_work_receipt_sha256:r.original_work_receipt_sha256||null,
    next_action:trim(r.next_action,650),
    bounded_preview_only:true,production_changed:false,
    complete_cycle_proven:r.phase==='INDEPENDENT_WORKER_AND_ORIGINAL_VERIFIED'
   });
   if(!repairByIncident.has(r.incident_id))
    repairByIncident.set(r.incident_id,normalizedItem);
   return normalizedItem;
  });
  previewRepair={
   status:autoRepair.status,count:autoRepair.count,items:normalized,
   historical_external_correction_not_reclassified:true
  };
 }
 let qualifiedEmployeeWork={
  status:'QUALIFIED_EMPLOYEE_WORK_READBACK_UNAVAILABLE',
  counts:{total:0,qualified_executable:0,executing:0,
   pending_independent_verification:0,independently_completed:0,blocked:0},
  items:[],source_report_only:true,original_customer_job_completed:false
 };
 if(qualifiedWork!==null){
  if(qualifiedWork?.status!=='OWNER_SOURCE_QUALIFIED_EMPLOYEE_WORK_READ_ONLY'||
   qualifiedWork.owner_id!==ownerId||
   qualifiedWork.owner_scope_verified!==true||
   qualifiedWork.read_only!==true||
   qualifiedWork.installation_authorized_by_read!==false||
   qualifiedWork.original_customer_job_completed_by_read!==false||
   qualifiedWork.production_changed!==false||
   !Array.isArray(qualifiedWork.items)||qualifiedWork.items.length>12)
   fail();
  const counts=qualifiedWork.counts;
  const countKeys=['total','qualified_executable','executing',
   'pending_independent_verification','independently_completed','blocked'];
  if(!counts||countKeys.some(k=>!Number.isSafeInteger(counts[k])||
   counts[k]<0||counts[k]>100000)||
   counts.total!==countKeys.slice(1).reduce((acc,k)=>acc+counts[k],0))
   fail();
  const phases=new Set(['QUALIFIED_EXECUTABLE','EXECUTION_CLAIMED',
   'SUBMITTED_AWAITING_INDEPENDENT_RECHECK','REVIEW_CLAIMED',
   'COMPLETED_INDEPENDENTLY_VERIFIED','BLOCKED_SOURCE_CHANGED',
   'BLOCKED_PROVIDER_OR_WORKER_EVIDENCE']);
  const jobs=qualifiedWork.items.map(job=>{
   if(!UUID.test(job.job_id||'')||
    !UUID.test(job.shift_id||'')||
    typeof job.employee!=='string'||job.employee.length<2||
    job.employee.length>160||
    job.job_type!=='CURRENT_SOURCE_EVIDENCE_PACK'||
    !/^https:\/\/github[.]com\/[^/]+\/[^/]+\/(issues|pull)\/[1-9][0-9]*$/.test(job.source_ref||'')||
    !phases.has(job.phase)||
    typeof job.objective!=='string'||job.objective.length<15||
    job.objective.length>1500||
    !HASH.test(job.qualification_receipt_sha256||'')||
    (job.deliverable_receipt_sha256!==null&&
     !HASH.test(job.deliverable_receipt_sha256))||
    (job.independent_receipt_sha256!==null&&
     !HASH.test(job.independent_receipt_sha256))||
    job.original_customer_job_completed!==false||
    job.code_repair_installed===true||
    job.production_changed!==false||
    job.evidence_job_completed!==(job.phase===
     'COMPLETED_INDEPENDENTLY_VERIFIED')||
    (job.evidence_job_completed===true&&
     (!UUID.test(job.execution_worker_run_id||'')||
      !UUID.test(job.review_worker_run_id||'')||
      job.execution_worker_run_id===job.review_worker_run_id||
      !HASH.test(job.independent_receipt_sha256||'')||
      !validDate(job.verified_at))))
    fail();
   return Object.freeze({
    job_id:job.job_id,shift_id:job.shift_id,employee:job.employee,
    source_ref:job.source_ref,job_type:job.job_type,phase:job.phase,
    objective:trim(job.objective,1500),
    qualification_receipt_sha256:job.qualification_receipt_sha256,
    deliverable_receipt_sha256:job.deliverable_receipt_sha256,
    independent_receipt_sha256:job.independent_receipt_sha256,
    execution_worker_run_id:job.execution_worker_run_id,
    review_worker_run_id:job.review_worker_run_id,
    current_source_title:trim(job.deliverable?.source_title,500)||null,
    followup_proof_still_required:
     trim(job.deliverable?.next_evidence_required,1500)||null,
    blocker:trim(job.blocker,500)||null,
    evidence_job_completed:job.evidence_job_completed===true,
    original_customer_job_completed:false,code_repair_installed:false,
    production_changed:false
   });
  });
  qualifiedEmployeeWork={
   status:qualifiedWork.status,counts:Object.freeze({...counts}),
   items:jobs,source_report_only:true,
   original_customer_job_completed:false
  };
 }
 const gateByIncident=new Map();
 let installGateReadStatus='EXACT_REPAIR_INSTALL_GATE_READBACK_UNAVAILABLE';
 if(repairGates!==null){
  if(repairGates?.status!=='OWNER_SHIFT_REPAIR_INSTALL_GATES_READ_ONLY'||
   repairGates.owner_id!==ownerId||
   repairGates.owner_scope_verified!==true||repairGates.read_only!==true||
   repairGates.new_original_job_created!==false||
   repairGates.installation_authorized_by_read!==false||
   repairGates.production_changed!==false||
   repairGates.new_self_repair_proven!==false||
   !Array.isArray(repairGates.items)||repairGates.items.length>8||
   repairGates.count!==repairGates.items.length)fail();
  const statuses=new Set([
   'WORK_RESUMED_CODE_SELF_REPAIR_NOT_PROVEN',
   'INCIDENT_REQUIRES_SOURCE_BACKED_DIAGNOSIS',
   'INCIDENT_INVESTIGATION_EVIDENCE_BLOCKED',
   'EXACT_ORIGINAL_REPAIR_WARRANT_REQUIRED',
   'CURRENT_EXACT_COMPLETION_WARRANT_REQUIRED',
   'INDEPENDENT_REPAIR_CI_NOT_YET_PASSED',
   'INDEPENDENT_INTEGRATION_AND_FROZEN_REVIEW_REQUIRED',
   'OWNER_EXACT_TESTED_ARTIFACT_APPROVAL_REQUIRED',
   'EXACT_OWNER_APPROVED_INSTALL_CONTINUATION_ELIGIBLE',
   'INSTALLED_ORIGINAL_INDEPENDENT_SETTLEMENT_PENDING',
   'EXACT_ORIGINAL_SETTLED_AFTER_TESTED_INSTALL',
   'EXACT_REPAIR_APPROVAL_OR_PROVIDER_EVIDENCE_UNVERIFIED'
  ]);
  for(const gate of repairGates.items){
   if(!UUID.test(gate.incident_id||'')||!UUID.test(gate.shift_id||'')||
    !HASH.test(gate.incident_evidence_sha256||'')||
    !statuses.has(gate.gate_status)||
    gate.read_only!==true||
    gate.new_job_authorized!==false||
    gate.installation_authorized_by_read!==false||
    gate.production_changed!==false||
    gate.new_self_repair_proven!==false||
    typeof gate.next_action!=='string'||gate.next_action.length>720||
    (gate.authorized_original_work_id!==null&&
     !/^work:[a-f0-9]{32}$/.test(gate.authorized_original_work_id))||
    (gate.candidate_commit_sha!==null&&
     !/^[a-f0-9]{40}$/.test(gate.candidate_commit_sha))||
    (gate.candidate_artifact_sha256!==null&&
     !HASH.test(gate.candidate_artifact_sha256))||
    (gate.independent_ci_run_id!==null&&
     (!Number.isSafeInteger(gate.independent_ci_run_id)||
      gate.independent_ci_run_id<1))||
    gateByIncident.has(gate.incident_id))
     fail();
   gateByIncident.set(gate.incident_id,Object.freeze({
    incident_id:gate.incident_id,
    shift_id:gate.shift_id,
    incident_evidence_sha256:gate.incident_evidence_sha256,
    status:gate.gate_status,
    authorized_original_work_id:gate.authorized_original_work_id,
    current_completion_warrant:gate.current_completion_warrant===true,
    independent_ci_run_id:gate.independent_ci_run_id,
    candidate_commit_sha:gate.candidate_commit_sha,
    candidate_artifact_sha256:gate.candidate_artifact_sha256,
    integration_ci_run_id:gate.integration_ci_run_id,
    approval_receipt_id:gate.previous_exact_approval_receipt_id,
    installed_commit_sha:gate.previous_installed_commit_sha,
    original_final_receipt_id:gate.original_final_receipt_id,
    next_action:trim(gate.next_action,720),
    installation_authorized_by_read:false,
    new_self_repair_proven:false,production_changed:false
   }));
  }
  installGateReadStatus='OWNER_EXACT_REPAIR_INSTALL_GATE_VERIFIED_READ_ONLY';
 }
 const continuityItems=[];
 let continuityReadStatus='OWNER_SHIFT_CONTINUITY_EVIDENCE_UNAVAILABLE';
 if(continuity!==null){
  if(continuity?.status!=='OWNER_SHIFT_CONTINUITY_INCIDENTS_READ_ONLY'||
   continuity.owner_id!==ownerId||continuity.owner_scope_verified!==true||
   continuity.read_only!==true||
   continuity.execution_authorized!==false||
   continuity.installation_authorized!==false||
   continuity.production_changed!==false||
   continuity.self_repair_proven!==false||
   !Array.isArray(continuity.items)||continuity.items.length>8||
   continuity.count!==continuity.items.length)fail();
  const types=new Set(['ELIGIBLE_WORK_NO_DISPATCH','EMPLOYEE_INQUIRY_CLAIM_STALE',
   'QUALIFIED_EVIDENCE_JOB_BLOCKED','EMPLOYEE_QUALIFICATION_HANDOFF_STALLED']);
  const phases=new Set(['DETECTED','INVESTIGATION_CLAIMED',
   'INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF',
   'BLOCKED_NEEDS_EVIDENCE','RECOVERED_AFTER_OBSERVATION']);
  for(const x of continuity.items){
   if(!UUID.test(x.incident_id||'')||!UUID.test(x.shift_id||'')||
    !types.has(x.kind)||!phases.has(x.phase)||
    !HASH.test(x.evidence_sha256||'')||
    !validDate(x.first_detected_at)||
    typeof x.error_summary!=='string'||x.error_summary.length>280||
    typeof x.next_action!=='string'||x.next_action.length>700||
    x.repair_executed!==false||
    x.installation_authorized!==false||x.production_changed!==false||
    (x.investigation_receipt_sha256!==null&&
     !HASH.test(x.investigation_receipt_sha256))||
    (x.phase==='RECOVERED_AFTER_OBSERVATION'&&
     (!HASH.test(x.recovery_receipt_sha256||'')||
      !UUID.test(x.resolved_worker_run_id||'')||
      !UUID.test(x.resolved_inquiry_claim_id||'')||
      !validDate(x.recovered_at)||
      x.recovery_attribution!==
       'WORK_RESUMED_AFTER_OBSERVATION_SELF_REPAIR_UNPROVEN'))||
    (x.phase==='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF'&&
     (!HASH.test(x.investigation_receipt_sha256||'')||
      !x.assigned_employee||!x.independent_reviewer||
      x.assigned_employee===x.independent_reviewer)))
    fail();
   const exactGate=gateByIncident.get(x.incident_id)||null;
   if(exactGate&&(exactGate.shift_id!==x.shift_id||
    exactGate.incident_evidence_sha256!==x.evidence_sha256))fail();
   continuityItems.push(Object.freeze({
    incident_id:x.incident_id,
    shift_id:x.shift_id,kind:x.kind,phase:x.phase,
    source_ref:'reality:shift-continuity-incident:'+x.incident_id,
    exact_code_repair_install_gate:exactGate,
    evidence_sha256:x.evidence_sha256,
    observed_at:x.last_observed_at,
    error_summary:trim(x.error_summary,280),
    assigned_employee:trim(x.assigned_employee,100)||null,
    independent_reviewer:trim(x.independent_reviewer,100)||null,
    diagnosis:trim(x.diagnosis,1500)||null,
    proposed_upgrade:trim(x.proposed_upgrade,1600)||null,
    independent_test_requirement:trim(x.independent_test_requirement,1600)||null,
    investigation_receipt_sha256:x.investigation_receipt_sha256,
    work_resumption_verified:x.phase==='RECOVERED_AFTER_OBSERVATION',
    independent_resumption_receipt_sha256:
     x.phase==='RECOVERED_AFTER_OBSERVATION'?
       x.recovery_receipt_sha256:null,
    verified_worker_run_id:
     x.phase==='RECOVERED_AFTER_OBSERVATION'?
       x.resolved_worker_run_id:null,
    verified_original_inquiry_claim_id:
     x.phase==='RECOVERED_AFTER_OBSERVATION'?
       x.resolved_inquiry_claim_id:null,
    next_action:trim(x.next_action,700),
    repair_executed:false,installation_authorized:false,
    production_changed:false,
    self_repair_proven:false,
    customer_job_completed:false,owner_chat_only:true
   }));
  }
  continuityReadStatus='OWNER_SHIFT_CONTINUITY_INCIDENTS_VERIFIED_READ_ONLY';
 }
 const handoffById=new Map();
 if(handoff!==null){
  if(handoff?.status!=='OWNER_INCIDENT_ORIGINAL_REPAIR_HANDOFF_READ_ONLY'||
   handoff.owner_id!==ownerId||handoff.owner_scope_verified!==true||
   handoff.read_only!==true||handoff.original_job_created!==false||
   handoff.repair_executed!==false||handoff.installation_authorized!==false||
   handoff.production_changed!==false||
   !Array.isArray(handoff.items)||handoff.items.length>8||
   handoff.count!==handoff.items.length)fail();
  const statuses=new Set([
   'UNASSESSED','RECOVERED_PREVIOUSLY_NO_REPLAY',
   'WAITING_FOR_CURRENT_INDEPENDENT_FAILURE',
   'ORIGINAL_WARRANT_AND_FROZEN_PROOF_REQUIRED',
   'EXISTING_ORIGINAL_RECOVERY_ELIGIBLE',
   'EXISTING_ORIGINAL_RECOVERY_CLAIMED',
   'EXISTING_ORIGINAL_OBLIGATION_PRESERVED',
   'ORIGINAL_RECOVERY_PROOF_FAILED_NEEDS_REVIEW'
  ]);
  for(const item of handoff.items){
   if(!UUID.test(item.incident_id||'')||
    !statuses.has(item.handoff_status)||
    item.original_created_by_handoff!==false||
    item.repair_executed_by_handoff!==false||
    item.installation_authorized!==false||
    item.production_changed!==false||
    (item.original_work_id!=null&&
     !/^work:[a-f0-9]{32}$/.test(item.original_work_id))||
    (item.original_handoff_receipt_sha256!=null&&
     !HASH.test(item.original_handoff_receipt_sha256))||
    handoffById.has(item.incident_id))fail();
   handoffById.set(item.incident_id,item);
  }
 }
 const items=source.incidents.slice(0,5).map(x=>{
  if(!UUID.test(x.incident_id||'')||!phases.has(x.phase)||
    typeof x.error_summary!=='string'||x.error_summary.length<4||
    x.error_summary.length>220||
    !validDate(x.last_observed_at)||
    !Number.isSafeInteger(x.failure_count)||x.failure_count<1||
    x.independently_verified_repaired!==false||
    x.autonomous_self_repair_proven!==false||
    typeof x.scheduler_dispatched_after_failure!=='boolean'||
    (x.phase==='OPERATIONAL_CONTINUITY_VERIFIED_EXTERNAL_FIX'&&
      (x.operational_continuity_verified!==true||
       x.operational_recovery_attribution!=='EXTERNALLY_CORRECTED_NOT_SELF_REPAIRED'||
       !HASH.test(x.operational_recovery_receipt_sha256||'')))||
    (x.phase!=='OPERATIONAL_CONTINUITY_VERIFIED_EXTERNAL_FIX'&&
      x.operational_continuity_verified===true))
   fail();
  const recovered=x.phase==='OPERATIONAL_CONTINUITY_VERIFIED_EXTERNAL_FIX';
  const handoffItem=handoffById.get(x.incident_id)||null;
  const previewRepairItem=repairByIncident.get(x.incident_id)||null;
  const actualPreviewSelfRepairProven=
   previewRepairItem?.complete_cycle_proven===true;
  const handoffStatus=handoffItem?.handoff_status||'HANDOFF_READBACK_UNAVAILABLE';
  if(recovered&&
   handoffItem&&handoffStatus!=='RECOVERED_PREVIOUSLY_NO_REPLAY')
   fail();
  const employee=trim(x.assigned_employee,85)||null;
  const reviewer=trim(x.independent_reviewer,85)||null;
  const summary=actualPreviewSelfRepairProven?
   'Reality automatically corrected the exact preview scheduler permission defect. Independent receipts confirm the signed worker actually ran and the same previously scheduled owner investigation produced a source-backed result. This proves only the bounded preview repair class, not arbitrary production self-repair.':
   previewRepairItem?.phase==='PATCH_APPLIED_AWAITING_WORKER'?
   'Reality applied its reviewed preview-only scheduler correction. The signed worker and original job have not yet independently verified resumption.':
   previewRepairItem?.phase==='WORKER_RESTORED_NO_ORIGINAL_TO_RESUME'?
   'Reality automatically corrected the preview scheduler defect and independently observed the signed worker running again. No earlier original job was waiting, so it cannot claim original-work resumption.':
   previewRepairItem?.phase==='WORKER_ATTESTED_AWAITING_ORIGINAL'?
   'The signed worker resumed after Reality’s preview correction. The original assigned work is not yet independently verified.':
   recovered?
   'Reality independently verified that the signed worker resumed after an externally applied correction. It did not independently author or install that correction.':
   x.phase==='BLOCKED_NEEDS_EVIDENCE'?
   'Reality recorded an operational failure but cannot verify the next repair step. The blocker must stay visible in Chat.':
   x.phase==='DETECTED'?
   'Reality detected a scheduled-worker failure. Employee investigation and current-failure qualification must follow.':
   x.phase==='LEASED_FOR_INVESTIGATION'?
   'Reality claimed a bounded investigation. This is not evidence that the failure was corrected.':
   'Reality assigned an employee investigation and separate review; a repair remains unqualified until current evidence and original-job authority are verified.';
  const next=recovered?
   'Monitor for a fresh recurrence. No repair of this historical incident is currently warranted; a new failure reopens the investigation.':
   x.phase==='BLOCKED_NEEDS_EVIDENCE'?
   'Collect fresh independent failure evidence, check the exact original-job permission, and present any missing authority to the owner. Continue other permitted work.':
   x.phase==='EMPLOYEE_INVESTIGATION_SCHEDULED'?
   'Verify a CURRENT missing capability against independent evidence; bind a qualifying original job to the EXISTING repair governor only when its warrant permits execution.':
   'Investigate the observed failure, preserve exact receipts, and schedule independent review; do not wait for a manual restart if delegated investigation is permitted.';
  const governedNext=previewRepairItem?.next_action||handoffItem?.next_action;
  const meaningfulNext=typeof governedNext==='string'&&
    governedNext.length>=10&&governedNext.length<=500?
    governedNext:next;
  return Object.freeze({
   incident_id:x.incident_id,
   source_ref:'reality:operational-incident:'+x.incident_id,
   phase:x.phase,
   stage:actualPreviewSelfRepairProven?
    'BOUNDED PREVIEW SELF-REPAIR AND ORIGINAL WORK INDEPENDENTLY VERIFIED':
    previewRepairItem?.phase==='PATCH_APPLIED_AWAITING_WORKER'?
     'PREVIEW REPAIR APPLIED · Worker verification pending':
     stage(x.phase),
   observed_at:x.last_observed_at,
   error_summary:trim(x.error_summary,220),
   occurrence_count:x.failure_count,
   assigned_employee:employee,independent_reviewer:reviewer,
   investigation_scope:trim(x.investigation_scope,900)||null,
   independent_test_requirement:trim(x.independent_test_requirement,900)||null,
   outcome:summary,next_action:meaningfulNext,
   governed_original_handoff_status:handoffStatus,
   linked_existing_original_work_id:handoffItem?.original_work_id||null,
   existing_original_handoff_receipt_sha256:
    handoffItem?.original_handoff_receipt_sha256||null,
   repair_executed_by_handoff:false,
   bounded_preview_self_repair:previewRepairItem,
   bounded_preview_self_repair_cycle_proven:
    previewRepairItem?.complete_cycle_proven===true,
   operational_continuity_verified:recovered,
   operational_recovery_receipt_sha256:recovered?
    x.operational_recovery_receipt_sha256:null,
   recovery_attribution:recovered?'EXTERNALLY_CORRECTED_NOT_SELF_REPAIRED':null,
   self_repair_completed:actualPreviewSelfRepairProven,
   self_repair_scope:actualPreviewSelfRepairProven?
    'KNOWN_SAFE_PREVIEW_SCHEDULER_PERMISSION_GATE_ONLY':null,
   original_scheduled_inquiry_resumed_and_verified:
    actualPreviewSelfRepairProven,
   original_customer_job_completed_by_repair:false,
   original_job_authorized_by_chat:false,
   install_authorized_by_chat:false,
   customer_notified:false,
   owner_chat_only:true
  });
 });
 return Object.freeze({
  status:'OWNER_OPERATIONAL_INCIDENT_CHAT_BRIEFING_READ_ONLY',
  owner_scope_verified:true,
  source:'AUTHENTICATED_OWNER_OPERATIONAL_INCIDENT_LEDGER',
  read_only:true,owner_chat_only:true,
  items:Object.freeze(items),
  count:items.length,
  scheduler_status:source.last_scheduler_status,
  signed_worker_delivery:Object.freeze(workerDelivery),
  bounded_preview_auto_repair:Object.freeze(previewRepair),
  shift_continuity_read_status:continuityReadStatus,
  shift_continuity_incidents:Object.freeze(continuityItems),
  shift_continuity_count:continuityItems.length,
  exact_repair_install_gate_read_status:installGateReadStatus,
  exact_repair_install_gate_count:gateByIncident.size,
  qualified_employee_evidence_work:Object.freeze(qualifiedEmployeeWork),
  reported_next_action:trim(source.next_action,500),
  external_actions_authorized:false,production_changed:false,
  original_job_authorized_by_chat:false,installation_authorized:false
 });
}
export async function readOwnerOperationalIncidentChatBriefing({
 session,db=shiftDatabase(),call=shiftRpc,fetchImpl=fetch
}={}){
 const owner=session?.user_id;
 if(!UUID.test(owner||'')||
  !session?.config?.url||db?.strictSecrets!==true||
  db.url!==session.config.url||
  db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail();
 const [source,handoff,delivery,autoRepair,continuity,repairGates,qualifiedWork]=await Promise.all([
  call(db,'reality_read_owner_worker_recovery_status_v1',{
   p_owner_id:owner
  },{fetchImpl}),
  // If this optional proof reader is temporarily unavailable, preserve the
  // authenticated incident without fabricating an original-job authorization.
  call(db,'reality_read_owner_incident_original_handoff_v1',{
   p_owner_id:owner
  },{fetchImpl}).catch(()=>null),
  call(db,'reality_read_owner_signed_worker_actual_runs_v1',{
   p_owner_id:owner
  },{fetchImpl}).catch(()=>null),
  call(db,'reality_read_owner_preview_worker_auto_repair_v1',{
   p_owner_id:owner
  },{fetchImpl}).catch(()=>null),
  call(db,'reality_read_owner_shift_continuity_incidents_v1',{
   p_owner_id:owner
  },{fetchImpl}).catch(()=>null),
  call(db,'reality_read_owner_shift_repair_install_gates_v1',{
   p_owner_id:owner
  },{fetchImpl}).catch(()=>null),
  call(db,'reality_read_owner_qualified_employee_evidence_jobs_v1',{
   p_owner_id:owner
  },{fetchImpl}).catch(()=>null)
 ]);
 return projectOwnerIncidentChatBriefing({
  ownerId:owner,source,handoff,delivery,autoRepair,continuity,repairGates,
  qualifiedWork
 });
}
export function incidentChatUniverseObservations(briefing){
 if(briefing?.status!=='OWNER_OPERATIONAL_INCIDENT_CHAT_BRIEFING_READ_ONLY'||
  briefing.owner_scope_verified!==true||
  briefing.original_job_authorized_by_chat!==false||
  briefing.installation_authorized!==false||
  !Array.isArray(briefing.items)||briefing.items.length>5)
  return [];
 const legacy=briefing.items.slice(0,3).map(item=>Object.freeze({
  entry_id:item.source_ref,
  event_kind:'reality_owner_operational_failure_recovery_briefing',
  source_kind:'AUTHENTICATED_OWNER_OPERATIONAL_INCIDENT_LEDGER',
  source_ref:item.source_ref,
  assertion_time:item.observed_at,
  epistemic_status:item.operational_continuity_verified?
   'OPERATING_RECOVERY_VERIFIED_EXTERNAL_FIX_NOT_SELF_REPAIR':
   'RECORDED_INCIDENT_NOT_INDEPENDENTLY_REPAIRED',
  summary:'Reality operational incident '+item.incident_id+
   '; recorded error '+item.error_summary+
   '; phase '+item.phase+
   '; assigned employee '+(item.assigned_employee||'not yet assigned')+
   '; reviewer '+(item.independent_reviewer||'not yet assigned')+
   '; outcome '+item.outcome+
   '; governed original handoff '+item.governed_original_handoff_status+
   '; existing original '+(item.linked_existing_original_work_id||'not verified')+
   '; preview remediation '+(
     item.bounded_preview_self_repair?.phase||'NO_CURRENT_REPAIR_RECEIPT')+
   '; preview remediation fully verified '+item.bounded_preview_self_repair_cycle_proven+
   '; scoped self repair proven '+item.self_repair_completed+
   '; signed worker process '+(briefing.signed_worker_delivery?.phase||'UNVERIFIED')+
   '; NEXT '+item.next_action,
  independent_recovery_receipt:item.operational_recovery_receipt_sha256,
  original_job_completed:false,
  self_repair_proven:item.self_repair_completed===true,
  self_repair_scope:item.self_repair_scope,
  installation_authorized:false,
  production_changed:false
 }));
 const stalls=Array.isArray(briefing.shift_continuity_incidents)?
  briefing.shift_continuity_incidents.slice(0,3):[];
 return [...legacy,...stalls.map(x=>Object.freeze({
  entry_id:x.source_ref,
  event_kind:'reality_owner_shift_continuity_stall_investigation',
  source_kind:'AUTHENTICATED_OWNER_SHIFT_CONTINUITY_LEDGER',
  source_ref:x.source_ref,assertion_time:x.observed_at,
  epistemic_status:x.work_resumption_verified?
   'SIGNED_WORKER_AND_SOURCE_RESUMPTION_VERIFIED_SELF_REPAIR_UNPROVEN':
   'RECORDED_STALL_NOT_INDEPENDENTLY_REPAIRED',
  summary:'Reality detected signed-shift stall '+x.incident_id+
   '; phase '+x.phase+'; source evidence '+x.evidence_sha256+
   '; model-assigned employee '+(x.assigned_employee||'not assigned')+
   '; reviewer '+(x.independent_reviewer||'not assigned')+
   '; diagnosis is a PROPOSAL, not verified root cause: '+
   (x.diagnosis||'not yet investigated')+
   '; proposed capability upgrade: '+(x.proposed_upgrade||'none yet')+
   '; independent test required: '+(x.independent_test_requirement||'not yet specified')+
   '; source-bound work resumption independently verified '+x.work_resumption_verified+
   '; resumption receipt '+(x.independent_resumption_receipt_sha256||'not yet available')+
   '; root-cause patch independently verified FALSE'+
   '; independently tested code install gate '+(
    x.exact_code_repair_install_gate?.status||
    'CURRENT_TEST_AND_APPROVAL_GATE_NOT_VERIFIED')+
   '; exact gate next action '+(
    x.exact_code_repair_install_gate?.next_action||
    'Get current original authorization and independent CI proof before modifying code')+
   '; next action '+x.next_action,
  independent_investigation_receipt:x.investigation_receipt_sha256,
  original_job_completed:false,self_repair_proven:false,
  installation_authorized:false,production_changed:false
 }))];
}
