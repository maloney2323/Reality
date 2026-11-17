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
export function projectOwnerIncidentChatBriefing({ownerId,source}={}){
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
  const employee=trim(x.assigned_employee,85)||null;
  const reviewer=trim(x.independent_reviewer,85)||null;
  const summary=recovered?
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
  return Object.freeze({
   incident_id:x.incident_id,
   source_ref:'reality:operational-incident:'+x.incident_id,
   phase:x.phase,stage:stage(x.phase),
   observed_at:x.last_observed_at,
   error_summary:trim(x.error_summary,220),
   occurrence_count:x.failure_count,
   assigned_employee:employee,independent_reviewer:reviewer,
   investigation_scope:trim(x.investigation_scope,900)||null,
   independent_test_requirement:trim(x.independent_test_requirement,900)||null,
   outcome:summary,next_action:next,
   operational_continuity_verified:recovered,
   operational_recovery_receipt_sha256:recovered?
    x.operational_recovery_receipt_sha256:null,
   recovery_attribution:recovered?'EXTERNALLY_CORRECTED_NOT_SELF_REPAIRED':null,
   self_repair_completed:false,
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
 const source=await call(db,'reality_read_owner_worker_recovery_status_v1',{
  p_owner_id:owner
 },{fetchImpl});
 return projectOwnerIncidentChatBriefing({ownerId:owner,source});
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
   '; NEXT '+item.next_action,
  independent_recovery_receipt:item.operational_recovery_receipt_sha256,
  original_job_completed:false,
  self_repair_proven:false,
  installation_authorized:false,
  production_changed:false
 }));
}
