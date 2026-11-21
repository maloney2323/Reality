// Existing owner-signed internal maintenance is valid shift work even when
// there are no NEW GitHub issues or customer originals to admit.
// Reuse the canonical eight-stage plan and fingerprint; do not mint substitute
// customer claims, alter archived shift receipts, or manufacture GitHub status.
import {createHash} from 'node:crypto';
import {buildRealityEightHourShiftDraft}
 from './reality-eight-hour-shift-plan-v1.js';
import {computeShiftFingerprint}
 from './reality-governed-shift-boundary-v1.js';
import {buildRileyTaylorCombinedWorkOrders}
 from './reality-riley-taylor-combined-work-orders-v1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA=/^sha256:[a-f0-9]{64}$/;
const REF=/^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull)\/[1-9]\d{0,15}$/;
const KIND=new Set(['EMPLOYEE_QUALIFICATION_HANDOFF_STALLED',
 'QUALIFIED_EVIDENCE_JOB_BLOCKED']);
const fail=x=>{throw Error('OWNER_MAINTENANCE_CONTINUATION_'+x)};
export function buildOwnerMaintenanceContinuationDraft(projection,{
 ownerId,observedAt=new Date().toISOString()
}={}){
 if(!UUID.test(ownerId||'')||
    projection?.status!=='OWNER_UNFINISHED_INTERNAL_MAINTENANCE_PRESERVED'||
    projection.open_count<1||projection.open_count>4||
    projection.open_count!==projection.items?.length||
    projection.no_new_shift_started!==true||
    projection.owner_authority_granted!==false||
    projection.customer_job_completed!==false||
    projection.production_changed!==false||
    !Number.isFinite(Date.parse(observedAt))||
    Date.parse(observedAt)>Date.now()+120000||
    Date.parse(observedAt)<Date.now()-1800000)
  fail('INDEPENDENT_OWNER_BACKLOG_READBACK_REQUIRED');
 const refs=new Set(),ids=new Set(),items=[];
 for(const j of projection.items){
  if(!UUID.test(j.origin_incident_id||'')||
     !UUID.test(j.origin_shift_id||'')||
     j.internal_work_id!=='maintenance:'+j.origin_incident_id||
     !KIND.has(j.kind)||!REF.test(j.source_ref||'')||
     !SHA.test(j.independent_review_receipt_sha256||'')||
     j.repair_verified!==false||
     j.original_customer_job_completed!==false||
     !['Riley','Taylor','Quinn','Avery','Casey','Morgan','Jordan','Sage'].includes(j.assignee)||
     j.assignee===j.independent_reviewer||
     !['Riley','Taylor','Quinn','Avery','Casey','Morgan','Jordan','Sage'].includes(j.independent_reviewer)||
     ids.has(j.origin_incident_id)||refs.has(j.source_ref))
   fail('EXACT_ORIGINAL_INCIDENTS_OR_SOURCE_IDENTITIES_NOT_VERIFIED');
  ids.add(j.origin_incident_id);refs.add(j.source_ref);
  const id=createHash('sha256').update(
   j.origin_incident_id+'|'+j.origin_shift_id+'|'+
   j.independent_review_receipt_sha256).digest('hex').slice(0,32);
  items.push(Object.freeze({
   finding_id:'catalog:'+id,
   finding_type:'INTERNAL_MAINTENANCE',
   title:j.assignee+' · existing independently reviewed '+j.kind.replaceAll('_',' ').toLowerCase(),
   evidence_refs:[j.source_ref],
   priority_heuristic:null,
   verified_current_defect:false,
   authorized_execution:false,
   customer_job_approved:false,
   verified_time_saved_minutes:null,
   human_baseline_minutes:null
  }));
 }
 const brief={
  status:'SOURCE_BACKED_DISCOVERY_OBSERVED',
  phase:'DISCOVERY_AND_PRIORITIZATION_ONLY_NOT_AN_EXECUTED_WORKDAY',
  source_scope:'REALITY_GITHUB_REPOSITORY_ONLY',
  evidence_status:'SOURCE_BACKED_OBSERVATIONS_NOT_INDEPENDENTLY_CONFIRMED_DEFECTS',
  observed_at:observedAt,
  source_coverage:{issues:'unavailable',pull_requests:'partial',actions:'unavailable'},
  counts:{
   source_backed_opportunities:items.length,open_issues:0,
   open_pull_requests:0,historical_failure_signals:0,
   independent_maintenance_obligations:items.length,
   verified_current_defects:0,approved_autonomous_repairs:0,
   completed_customer_jobs_from_this_report:0
  },
  value_measurement:{verified_cash_savings_usd:null,financial_roi_verified:false},
  items,read_only:true,job_started:false,shift_completed:false,
  installation_authorized:false,production_changed:false
 };
 const plan=buildRealityEightHourShiftDraft(brief,{durationHours:8});
 const fingerprint=computeShiftFingerprint(plan);
 const workOrders=buildRileyTaylorCombinedWorkOrders({plan,fingerprint});
 if(workOrders.task_count!==items.length||
    plan.slots.slice(1,5).filter(x=>x.candidate).length!==items.length||
    plan.slots.slice(1,5).some(x=>x.candidate&&
     !refs.has(x.candidate.source_url)))
  fail('SOURCE_AND_MAINTENANCE_PLAN_NOT_IDENTICAL');
 return Object.freeze({
  status:'EXACT_OWNER_INTERNAL_MAINTENANCE_CONTINUATION_DRAFT',
  owner_id:ownerId,
  originating_shift_ids:Object.freeze([...new Set(
   projection.items.map(x=>x.origin_shift_id))]),
  expected_fingerprint:fingerprint,
  open_maintenance_jobs:items.length,
  work_items:Object.freeze(projection.items.map(x=>Object.freeze({
   maintenance_id:x.origin_incident_id,
   origin_shift_id:x.origin_shift_id,assignee:x.assignee,
   independent_reviewer:x.independent_reviewer,
   source_ref:x.source_ref,phase:x.phase,
   independent_review_receipt_sha256:x.independent_review_receipt_sha256
  }))),
  plan,combined_employee_work_orders:workOrders,
  completion_bound:true,
  completion_condition:'ALL_EXACT_INTERNAL_MAINTENANCE_REPAIR_RECEIPTS_VERIFIED',
  owner_authorization_required:true,
  no_new_customer_work_created:true,
  previously_closed_shifts_reopened:false,
  original_job_completed:false,
  installation_authorized:false,production_changed:false
 });
}
