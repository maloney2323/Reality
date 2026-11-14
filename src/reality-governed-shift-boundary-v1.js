import crypto from 'node:crypto';
import {resolveReliabilityBenchmarkDb} from './reality-reliability-db-boundary-v0.1.js';
export const SHIFT_FINGERPRINT_VERSION='reality-exact-eight-hour-shift-v1';
const FLEXIBLE_SHIFT_FINGERPRINT_VERSION='reality-exact-flexible-shift-v2';
const ADAPTIVE_SHIFT_FINGERPRINT_VERSION='reality-exact-adaptive-shift-v3';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export function computeShiftFingerprint(plan){
 if(!plan||plan.version!=='reality-eight-hour-employee-shift-draft-v1'||
  plan.status!=='DRAFT_ONLY_NOT_SCHEDULED_OR_AUTHORIZED'||
  !Number.isSafeInteger(plan.shift_duration_minutes)||
  plan.shift_duration_minutes<60||plan.shift_duration_minutes>720||
  plan.shift_duration_minutes%60!==0||
  plan.shift_duration_minutes!==plan.shift_duration_hours*60||
  plan.read_only!==true||
  plan.ready_to_execute_batch!==false||plan.job_started!==false||
  !Array.isArray(plan.slots)||plan.slots.length!==8||
  plan.slots.some((x,i)=>x.sequence!==i+1||
    !Number.isSafeInteger(x.planning_minutes)||x.planning_minutes<1||
    x.planning_minutes>120||x.offset_end_minutes-x.offset_start_minutes!==x.planning_minutes||
    x.offset_start_minutes!==(i?plan.slots[i-1].offset_end_minutes:0))||
  plan.slots.at(-1)?.offset_end_minutes!==plan.shift_duration_minutes)
  throw Error('SHIFT_FINGERPRINT_UNVERIFIED_PLAN');
 const source=plan.slots.map(x=>({
  i:x.sequence,id:x.id,stage:x.stage,
  begin:x.offset_start_minutes,end:x.offset_end_minutes,
  source:x.candidate?.source_url||null,
  finding:x.candidate?.finding_id||null,
  gate:x.required_gate||null
 }));
 const hash=crypto.createHash('sha256').update(JSON.stringify({
  version:plan.shift_duration_minutes===480?
   SHIFT_FINGERPRINT_VERSION:
   [600,720].includes(plan.shift_duration_minutes)?
    FLEXIBLE_SHIFT_FINGERPRINT_VERSION:ADAPTIVE_SHIFT_FINGERPRINT_VERSION,
  source_scope:plan.source_scope,
  timebox:plan.shift_duration_minutes,slots:source
 })).digest('hex');
 return 'sha256:'+hash;
}
export function shiftDatabase(env=process.env){
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  throw Error('SHIFT_ISOLATED_DATABASE_BOUNDARY_UNVERIFIED');
 return db;
}
export async function shiftRpc(db,rpc,payload,{fetchImpl=fetch}={}){
 if(!/^reality_(?:authorize_employee_shift_v1|authorize_employee_completion_shift_v1|read_owner_employee_shifts_v1|claim_employee_shift_step_v1|settle_employee_shift_step_v1|close_employee_shift_v1|close_employee_completion_shift_v1|read_owner_shift_live_activity_v1|read_current_shift_execution_graph_v1|read_owner_shift_execution_graph_v1|read_owner_native_reviewed_patch_v1|record_employee_shift_worker_pulse_v1|record_current_shift_worker_pulse_v1|reconcile_employee_shift_original_v1|read_shift_capability_wake_v1|read_owner_final_receipts_v1|read_owner_genuine_loop_v1|read_owner_existing_original_issue_v1|read_eligible_shift_originals_v1|read_shift_original_execution_context_v1|claim_exact_shift_original_v1|record_exact_shift_original_outcome_v1|reconcile_exact_shift_original_receipt_v1|read_owner_qualified_capabilities_v1|read_current_riley_source_work_v1|claim_authorized_riley_pr_review_v1|prepare_authorized_riley_pr_review_v1|mark_authorized_riley_pr_publish_v1|settle_authorized_riley_pr_review_v1|read_owner_riley_pr_review_v1|read_authorized_pr_review_model_scope_v1|admit_exact_riley_263_repair_v1|admit_verified_shift_commit_triage_v1|record_verified_shift_commit_triage_v1|settle_verified_shift_commit_triage_v1|admit_shift_failure_triage_143_v1|settle_shift_failure_triage_143_v1|read_owner_shift_failure_triage_143_v1|read_owner_riley_repair_original_v1|attest_riley_263_candidate_v1|attest_riley_263_candidate_v2|claim_current_riley_native_model_draft_v1|record_current_riley_native_model_draft_v1|mark_riley_native_model_draft_uncertain_v1|claim_same_riley_native_model_revision_v1|record_same_riley_native_model_revision_v1|mark_same_riley_native_model_revision_uncertain_v1|read_current_riley_revision_test_outcome_v1|read_shift_native_candidate_frozen_v1|record_current_shift_native_candidate_ci_failure_v1|claim_current_native_readonly_tool_v1|finish_current_native_readonly_tool_v1|read_owner_native_readonly_tool_proof_v1|read_next_week_source_snapshot_v1|read_current_shift_weekly_investigations_v1||claim_chat_work_for_shift_v1|record_chat_work_diagnosis_v1|fail_chat_work_claim_v1|reconcile_expired_chat_work_v1|read_chat_work_for_owner_v1record_current_shift_weekly_investigation_v1|admit_current_shift_verified_repair_v1|read_owner_shift_weekly_backlog_v1|read_owner_capability_gap_feed_v1|read_owner_job_roi_evidence_v2|stage_native263_exact_install_warrant_v1|read_native263_exact_install_warrant_v1|read_native263_postinstall_context_v1)$/.test(rpc))
  throw Error('SHIFT_RPC_NOT_ALLOWLISTED');
 const r=await fetchImpl(db.url+'/rest/v1/rpc/'+rpc,{
  method:'POST',redirect:'error',cache:'no-store',
  headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
    'content-type':'application/json',accept:'application/json'},
  body:JSON.stringify(payload)
 });
 const result=await r.json().catch(()=>null);
 if(!r.ok||result===null||typeof result!=='object')
  throw Error('SHIFT_DATABASE_RPC_'+rpc+'_UNAVAILABLE');
 return result;
}
export function assertShiftReceipt(x){
 if(!x||!['SHIFT_DURABLY_AUTHORIZED','SHIFT_ALREADY_AUTHORIZED'].includes(x.status)||
   !UUID.test(x.shift_id||'')||x.owner_scope_verified!==true||
   x.installation_authorized!==false||x.production_changed!==false)
  throw Error('SHIFT_AUTHORIZED_RECEIPT_UNTRUSTED');
 return x;
}
export function assertShiftReadback(x){
 if(!x||x.status!=='OWNER_SCOPED_EMPLOYEE_SHIFT_READBACK'||
  x.work_installation_authorized_by_read!==false||
  x.production_changed!==false||x.verified_human_hours_saved!==null||
  !Array.isArray(x.shifts)||x.shifts.length>5||
  x.shifts.some(s=>!UUID.test(s.shift_id)||!/^sha256:[a-f0-9]{64}$/.test(s.plan_fingerprint)||
    !['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK','ENDED_WITH_BLOCKED_WORK','ENDED_WITH_VERIFIED_JOB','ENDED_READ_ONLY','ESCALATED'].includes(s.status)||
    !Array.isArray(s.steps)||s.steps.length!==8||
    s.steps.some((t,i)=>t.step_index!==i+1||
     !['QUEUED','CLAIMED','SOURCE_CHECKED','AWAITING_EXACT_WORK','ORIGINAL_JOB_RECEIPT_VERIFIED','BLOCKED_PROVIDER','REPORTED'].includes(t.state)||
     (t.proof_sha256!=null&&!/^sha256:[a-f0-9]{64}$/.test(t.proof_sha256)))))
  throw Error('SHIFT_INDEPENDENT_READBACK_INVALID');
 return x;
}
