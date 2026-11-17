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
export function projectOwnerIncidentChatBriefing({ownerId,source,handoff=null,delivery=null,autoRepair=null}={}){
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
 const [source,handoff,delivery,autoRepair]=await Promise.all([
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
  },{fetchImpl}).catch(()=>null)
 ]);
 return projectOwnerIncidentChatBriefing({
  ownerId:owner,source,handoff,delivery,autoRepair
 });
}
export function incidentChatUniverseObservations(briefing){
 if(briefing?.status!=='OWNER_OPERATIONAL_INCIDENT_CHAT_BRIEFING_READ_ONLY'||
  briefing.owner_scope_verified!==true||
  briefing.original_job_authorized_by_chat!==false||
  briefing.installation_authorized!==false||
  !Array.isArray(briefing.items)||briefing.items.length>5)
  return [];
 return briefing.items.slice(0,3).map(item=>Object.freeze({
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
}
