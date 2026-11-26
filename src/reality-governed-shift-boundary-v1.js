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
export const SHIFT_RPC_DEFAULT_TIMEOUT_MS=8000;
export function isShiftDatabaseTransportUnreachable(error){
 // The allowlisted RPC identifiers are lowercase reality_* names. This must
 // match the error emitted by shiftRpc, otherwise failure handling can issue
 // a second, ambiguous DB write during an outage.
 return /^SHIFT_DATABASE_RPC_reality_[a-z0-9_]+_(TIMEOUT|UNAVAILABLE)$/
  .test(String(error?.message||''));
}

// One signed worker can be invoked every minute. A stalled PostgREST call
// must not occupy a Vercel worker for 300 seconds or stack duplicate wakes.
export async function shiftRpc(db,rpc,payload,{
 fetchImpl=fetch,timeoutMs=SHIFT_RPC_DEFAULT_TIMEOUT_MS
}={}){
 if(!/^reality_(?:authorize_employee_shift_v1|authorize_employee_completion_shift_v1|read_final_loop_governed_start_v1|claim_canonical_governed_wake_v1|authorize_employee_maintenance_continuation_v1|close_employee_maintenance_continuation_v1|read_owner_employee_shifts_v1|read_owner_market_repair_proofs_v1|read_owner_shift_handoff_health_v1|stage_signed_original_lineage_packet_v1|read_owner_original_lineage_packet_v1|stage_signed_repair_scope_handoff_v1|read_owner_repair_scope_decision_v1|record_owner_repair_scope_decision_v1|read_signed_approved_repair_scope_v1|record_signed_repair_scope_continuation_v1|claim_employee_shift_step_v1|settle_employee_shift_step_v1|close_employee_shift_v1|close_employee_completion_shift_v1|read_owner_shift_live_activity_v1|read_current_shift_execution_graph_v1|read_current_final_loop_proof_envelope_v1|read_final_loop_shared_continuity_guard_v1|read_final_loop_event_resume_shadow_v1|claim_signed_maintenance_frozen_test_draft_v1|record_signed_maintenance_frozen_test_draft_v1|freeze_final_loop_recovery_contract_v1|read_final_loop_recovery_contract_v1|read_final_loop_recovery_capability_v1|read_final_loop_technical_ci_observation_v1|record_final_loop_technical_ci_observation_v1|record_final_loop_evidence_checkpoint_v1|stage_final_loop_pr_source_plan_v1|read_final_loop_pr_source_plans_v1|read_final_loop_child_approval_preflight_v1|read_owner_final_loop_child_approvals_v1|prepare_final_loop_child_approval_v1|owner_approve_final_loop_child_v1|claim_final_loop_child_review_v1|read_final_loop_child_model_scope_v1|fence_final_loop_child_transport_v1|prepare_final_loop_child_review_v1|read_final_loop_child_verify_v1|record_final_loop_child_verified_v1|read_final_loop_child_recovery_v1|reconcile_final_loop_child_premodel_v1|claim_final_loop_parent_integration_v1|read_final_loop_parent_integration_claim_v1|record_final_loop_parent_integration_v1|prepare_final_loop_parent_delivery_v1|prepare_next_final_loop_parent_delivery_v1|read_owner_final_loop_parent_deliveries_v1|owner_approve_final_loop_parent_delivery_v1|claim_final_loop_parent_publish_v1|read_final_loop_parent_publish_verify_v1|record_final_loop_parent_settlement_v1|read_final_loop_parent_settlement_v1|read_owner_final_loop_parent_outcomes_v1|reconcile_verified_parent_universe_return_v1|read_owner_shift_execution_graph_v1|read_owner_native_reviewed_patch_v1|record_employee_shift_worker_pulse_v1|record_current_shift_worker_pulse_v1|reconcile_employee_shift_original_v1|read_shift_capability_wake_v1|read_owner_final_receipts_v1|read_owner_genuine_loop_v1|read_owner_existing_original_issue_v1|read_eligible_shift_originals_v1|read_shift_original_execution_context_v1|claim_exact_shift_original_v1|record_exact_shift_original_outcome_v1|reconcile_exact_shift_original_receipt_v1|read_owner_qualified_capabilities_v1|read_current_riley_source_work_v1|claim_authorized_riley_pr_review_v1|prepare_authorized_riley_pr_review_v1|mark_authorized_riley_pr_publish_v1|settle_authorized_riley_pr_review_v1|read_owner_riley_pr_review_v1|read_authorized_pr_review_model_scope_v1|admit_exact_riley_263_repair_v1|admit_verified_shift_commit_triage_v1|record_verified_shift_commit_triage_v1|settle_verified_shift_commit_triage_v1|admit_shift_failure_triage_143_v1|settle_shift_failure_triage_143_v1|read_owner_shift_failure_triage_143_v1|read_owner_riley_repair_original_v1|read_owner_additional_settled_shift_sources_v1|read_owner_employee_discovery_v1|read_owner_employee_operating_schedule_v1|read_owner_continuous_qualification_inbox_v1|read_owner_chat_development_completion_preflight_v1|record_next_chat_development_goal_gap_v1|recompile_signed_chat_recovery_line_span_v1|record_signed_chat_recovery_target_review_failure_v1|reconcile_expired_signed_chat_target_review_v1|claim_next_signed_chat_recovery_target_review_v1|record_signed_chat_recovery_target_review_v1|requeue_signed_chat_recovery_after_upgrade_v1|admit_next_signed_chat_recovery_spec_v1|claim_next_signed_chat_recovery_candidate_v1|record_signed_chat_recovery_draft_v1|mark_signed_chat_recovery_unverified_v1|reconcile_continuous_qualification_inbox_v1|reconcile_continuity_qualification_routes_v1|observe_signed_infrastructure_blocker_v1|read_signed_infrastructure_blocker_v1|observe_signed_shift_no_progress_v1|observe_signed_chat_review_incident_v1|read_signed_chat_model_rejection_reentry_v1|reenter_signed_chat_model_rejection_v1|read_next_signed_chat_recovery_publish_v1|requalify_fenced_signed_chat_provider_v1|record_signed_chat_recovery_syntax_v1|read_signed_chat_goal_acceptance_scope_v1|record_signed_chat_goal_acceptance_v1|read_signed_chat_general_install_card_v1|owner_approve_signed_chat_general_install_v1|read_owner_qualified_chat_original_source_v1|stage_qualified_chat_original_review_v1|owner_approve_qualified_chat_original_v1|read_owner_qualified_chat_original_reviews_v1|read_owner_multi_original_shift_preflight_v1|read_owner_business_original_source_executor_contract_v1|read_owner_exact_business_effect_preflight_v1|stage_exact_business_original_effect_review_v1|owner_approve_exact_business_original_effect_v1|claim_approved_business_original_effect_v1|read_next_signed_business_effect_handoff_v1|read_owner_exact_business_effect_receipt_v1|read_next_signed_internal_repo_business_source_v1|record_signed_internal_repo_provider_proof_v1|read_owner_internal_repo_provider_proofs_v1|send_owner_first_business_chat_v1|send_owner_operational_chat_digest_v1|read_next_signed_scheduled_evidence_admission_v1|admit_signed_scheduled_evidence_v1|claim_owner_employee_time_inquiry_v1|record_owner_employee_time_inquiry_v1|block_owner_employee_time_inquiry_v1|read_owner_employee_time_inquiries_v1|read_current_signed_employee_inquiry_scope_v1|set_owner_routine_delegation_v1|read_owner_routine_delegation_v1|reserve_next_standing_inquiry_v1|claim_next_standing_capability_schedule_v1|record_owner_capability_role_schedule_v1|block_owner_capability_role_schedule_v1|read_owner_capability_employee_schedule_v1|claim_next_standing_worker_recovery_v1|record_owner_worker_recovery_plan_v1|block_owner_worker_recovery_plan_v1|read_owner_worker_recovery_status_v1|claim_next_incident_original_handoff_v1|record_incident_original_handoff_v1|fail_incident_original_handoff_v1|read_owner_incident_original_handoff_v1|commit_genuine_original_recovery_v1|claim_governed_shift_worker_run_v1|release_governed_shift_worker_run_v1|record_signed_worker_actual_run_v1|record_signed_worker_release_wake_v1|read_signed_worker_release_wakes_v1|read_owner_signed_worker_actual_runs_v1|read_owner_preview_worker_auto_repair_v1|claim_next_shift_continuity_investigation_v1|record_signed_builder_recovery_decision_v1|record_shift_continuity_investigation_v1|execute_signed_continuity_recovery_v1|verify_signed_continuity_recovery_v1|claim_shift_continuity_independent_review_v1|record_shift_continuity_independent_review_v1|claim_shift_business_qualification_review_v1|record_shift_business_qualification_review_v1|claim_signed_internal_maintenance_v1|record_signed_internal_maintenance_recheck_v1|claim_signed_internal_maintenance_baseline_v1|record_signed_internal_maintenance_baseline_v1|read_signed_maintenance_ci_preflight_v1|record_signed_maintenance_ci_source_epoch_v1|claim_registered_maintenance_action_v2|record_signed_maintenance_source_requalification_v1|read_next_signed_maintenance_ci_diagnostic_v1|read_requalified_maintenance_ci_preflight_v1|promote_requalified_maintenance_to_ci_claim_v1|record_signed_maintenance_ci_diagnostic_v1|read_next_signed_maintenance_external_review_v1|record_signed_maintenance_external_review_v1|read_same_original_postmaintenance_gate_v1|read_owner_internal_maintenance_v1|read_owner_maintenance_verified_artifacts_v1|read_owner_signed_maintenance_install_decision_v1|record_owner_signed_maintenance_install_decision_v1|dispatch_existing_chat_maintenance_shift_v1|read_existing_chat_maintenance_wake_v1|read_owner_latest_signed_chat_shift_receipt_v1|admit_existing_signed_maintenance_repair_handoff_v1|claim_signed_maintenance_repair_candidate_v1|record_signed_maintenance_repair_candidate_v1|mark_signed_maintenance_repair_candidate_unverified_v1|recover_signed_maintenance_repair_candidate_source_v1|claim_signed_maintenance_candidate_target_review_v1|record_signed_maintenance_candidate_target_review_v1|revise_signed_offtarget_maintenance_candidate_v1|block_shift_continuity_investigation_v1|block_shift_continuity_investigation_evidenced_v1|read_shift_investigation_remediation_scope_v1|record_shift_investigation_remediation_v1|claim_signed_continuity_review_probe_v1|record_signed_continuity_review_probe_v1|recompile_signed_rejected_chat_target_v1|read_owner_shift_continuity_incidents_v1|read_owner_signed_shift_recovery_actions_v1|read_owner_shift_repair_install_gates_v1|claim_next_qualified_employee_evidence_job_v1|record_qualified_employee_evidence_job_v1|block_qualified_evidence_claim_v1|claim_changed_qualified_evidence_source_v1|record_changed_qualified_evidence_source_v1|claim_qualified_employee_evidence_review_v1|record_qualified_employee_evidence_review_v1|read_owner_qualified_employee_evidence_jobs_v1|claim_next_scheduled_capability_inquiry_v1|record_scheduled_capability_inquiry_v1|block_scheduled_capability_inquiry_v1|authorize_one_isolated_self_repair_demo_v1|settle_one_isolated_self_repair_demo_v1|fail_one_isolated_self_repair_demo_v1|read_owner_isolated_self_repair_demo_v1|request_owner_connector_setup_v1|read_owner_connector_setup_v1|attest_riley_263_candidate_v1|attest_riley_263_candidate_v2|claim_current_riley_native_model_draft_v1|record_current_riley_native_model_draft_v1|mark_riley_native_model_draft_uncertain_v1|claim_same_riley_native_model_revision_v1|record_same_riley_native_model_revision_v1|mark_same_riley_native_model_revision_uncertain_v1|read_current_riley_revision_test_outcome_v1|read_shift_native_candidate_frozen_v1|record_current_shift_native_candidate_ci_failure_v1|claim_current_native_readonly_tool_v1|finish_current_native_readonly_tool_v1|read_owner_native_readonly_tool_proof_v1|read_next_week_source_snapshot_v1|read_current_shift_weekly_investigations_v1|claim_chat_work_for_shift_v1|claim_signed_maintenance_chat_investigation_v1|record_chat_work_diagnosis_v1|fail_chat_work_claim_v1|reconcile_expired_chat_work_v1|read_chat_work_for_owner_v1|record_current_shift_weekly_investigation_v1|admit_current_shift_verified_repair_v1|read_owner_shift_weekly_backlog_v1|read_owner_capability_gap_feed_v1|claim_same_original_recovery_attempt_v2|record_same_original_recovery_patch_v2|mark_same_original_recovery_uncertain_v2|read_next_same_original_recovery_candidate_v2|read_next_generalized_verified_install_review_v1|stage_generalized_original_install_review_v1|read_generalized_original_install_review_v1|read_owner_job_roi_evidence_v2|stage_native263_exact_install_warrant_v1|read_native263_exact_install_warrant_v1|read_native263_postinstall_context_v1|admit_chat_new_development_v1|read_chat_new_development_v1|claim_chat_new_development_release_v2|claim_chat_new_development_signed_v3|record_chat_new_development_draft_v1|mark_chat_new_development_unverified_v1|read_next_chat_new_development_candidate_v2|fence_chat_new_development_publish_v1|record_chat_new_development_candidate_v1|record_chat_new_development_ci_v1|read_general_original_recovery_review_v1|read_general_original_fenced_investigation_state_v1|claim_general_original_fenced_investigation_v1|record_general_original_fenced_hypothesis_v1|mark_general_original_fenced_model_uncertain_v1)$/.test(rpc))
  throw Error('SHIFT_RPC_NOT_ALLOWLISTED');
 if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>20000)
  throw Error('SHIFT_DATABASE_RPC_TIMEOUT_BUDGET_INVALID');
 // Do not retry unknown server-side writes. Timeout may mean the RPC committed
 // while its response was lost. The existing owner-scoped readback resolves it.
 const signal=AbortSignal.timeout(timeoutMs);
 let response;
 try{
  response=await fetchImpl(db.url+'/rest/v1/rpc/'+rpc,{
   method:'POST',redirect:'error',cache:'no-store',signal,
   headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
     'content-type':'application/json',accept:'application/json'},
   body:JSON.stringify(payload)
  });
  const result=await response.json().catch(()=>null);
  if(!response.ok||result===null||typeof result!=='object'){
   // A failed owner decision must not be ambiguously reported as a generic
   // transport failure. Only log the numeric HTTP status and a validated
   // five-character SQLSTATE; never emit provider body, token or user data.
   if(rpc==='reality_record_owner_signed_maintenance_install_decision_v1'){
    const safeStatus=Number.isInteger(response.status)&&
     response.status>=100&&response.status<=599?response.status:'NO_STATUS';
    const safeCode=/^[A-Z0-9]{5}$/.test(String(result?.code||''))?
     result.code:'NO_SQLSTATE';
    console.warn('REALITY_EXACT_APPROVAL_DB_REJECTED',safeStatus,safeCode);
   }
   throw Error('SHIFT_DATABASE_RPC_'+rpc+'_UNAVAILABLE');
  }
  return result;
 }catch(error){
  if(signal.aborted||error?.name==='TimeoutError'||
     error?.name==='AbortError'){
   if(rpc==='reality_record_owner_signed_maintenance_install_decision_v1')
    console.warn('REALITY_EXACT_APPROVAL_DB_TIMEOUT',timeoutMs);
   throw Error('SHIFT_DATABASE_RPC_'+rpc+'_TIMEOUT');
  }
  // A network failure has no PostgREST HTTP response or SQLSTATE.
  if(!response&&rpc==='reality_record_owner_signed_maintenance_install_decision_v1')
   console.warn('REALITY_EXACT_APPROVAL_DB_NO_RESPONSE');
  // No internal provider errors or secrets are surfaced.
  throw Error('SHIFT_DATABASE_RPC_'+rpc+'_UNAVAILABLE');
 }
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
  !Array.isArray(x.shifts)||x.shifts.length>25||
  x.shifts.some(s=>!UUID.test(s.shift_id)||!/^sha256:[a-f0-9]{64}$/.test(s.plan_fingerprint)||
    !['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK','ENDED_WITH_BLOCKED_WORK','ENDED_WITH_VERIFIED_JOB','ENDED_READ_ONLY','ESCALATED'].includes(s.status)||
    !Array.isArray(s.steps)||s.steps.length!==8||
    s.steps.some((t,i)=>t.step_index!==i+1||
     !['QUEUED','CLAIMED','SOURCE_CHECKED','AWAITING_EXACT_WORK','ORIGINAL_JOB_RECEIPT_VERIFIED','INTERNAL_MAINTENANCE_RECEIPTS_VERIFIED','BLOCKED_PROVIDER','REPORTED'].includes(t.state)||
     (t.proof_sha256!=null&&!/^sha256:[a-f0-9]{64}$/.test(t.proof_sha256)))))
  throw Error('SHIFT_INDEPENDENT_READBACK_INVALID');
 return x;
}
