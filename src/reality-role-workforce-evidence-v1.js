// Owner-scoped workforce evidence bridge. Draws ONLY from the separately
// verified isolated original-job ROI readback; does not interpret technical
// settlements as recurring role coverage, removable employees or cash savings.
// Owner payroll what-if assumptions are held in a different request-only path.
export const ROLE_WORKFORCE_EVIDENCE_VERSION='reality-role-workforce-evidence-v1';
const ROLE_IDS=Object.freeze([
 'product_strategy','software_engineering','quality_security_reliability',
 'infrastructure_operations','experience_onboarding','marketing_competitive',
 'sales_customer_success','financial_legal_admin']);
const WORK=/^work:[a-f0-9]{32}$/;
const fail=x=>{throw Error('REALITY_ROLE_WORKFORCE_EVIDENCE_'+x)};
const frozen=Object.freeze;
export function projectOwnerRoleWorkforceEvidence({roster,roi}={}){
 if(roster?.version!=='reality-proposed-ai-employee-roster-v1'||
  roster.status!=='READ_ONLY_PROPOSED_AI_EMPLOYEES'||
  roster.proposed_employee_count!==8||roster.active_ai_employee_count!==0||
  roster.verified_cash_savings_usd!==null||
  !Array.isArray(roster.proposed_employees)||roster.proposed_employees.length!==8||
  roi?.version!=='reality-operational-roi-evidence-v2'||
  roi.scope!=='ISOLATED_SETTLEMENT_NOT_ENTIRE_BUSINESS_WORKFLOW'||
  roi.financial_roi_verified!==false||
  roi.verified_customer_financial_roi!==false||
  roi.production_changed!==false||
  !Array.isArray(roi.jobs)||roi.jobs.length>20||
  !Number.isSafeInteger(roi.distinct_isolated_jobs_verified)||
  roi.jobs.length!==roi.distinct_isolated_jobs_verified||
  roi.collection_state?.comparable_human_work_verified!==0||
  roi.collection_state?.billable_provider_cost_verified!==0||
  roi.collection_state?.verified_cash_savings_usd!==null||
  !Number.isSafeInteger(roi.collection_state?.jobs_with_recorded_economic_inputs)||
  roi.collection_state.jobs_with_recorded_economic_inputs>roi.jobs.length)
  fail('INDEPENDENT_OWNER_ISOLATED_ROI_READBACK_REQUIRED');
 const seenRoles=new Set();
 for(const role of roster.proposed_employees){
  if(!ROLE_IDS.includes(role?.function_id)||
   seenRoles.has(role.function_id)||
   role.employee_id!=='reality-proposed:'+role.function_id||
   role.activation_status!=='PROPOSED_NOT_DEPLOYED'||
   role.independently_completed_jobs!==0||
   typeof role.role!=='string'||!role.role)
   fail('EXACT_BUSINESS_FUNCTION_CATALOG_REQUIRED');
  seenRoles.add(role.function_id);
 }
 if(seenRoles.size!==8)fail('EIGHT_FUNCTION_LABELS_REQUIRED');
 const seenWork=new Set();
 for(const j of roi.jobs){
  if(!WORK.test(j?.original_work_id||'')||seenWork.has(j.original_work_id)||
   j.technical_settlement_status!=='INDEPENDENTLY_SETTLED_ISOLATED_PREVIEW'||
   j.production_changed!==false||
   j.economic_value?.verified_cash_savings_usd?.value!==null||
   j.economic_value?.verified_hours_returned?.value!==null||
   j.human_labor_context?.human_task_effort_hours?.value!==null||
   !Array.isArray(j.economic_observations))
   fail('DUPLICATED_OR_EXAGGERATED_ORIGINAL_JOB_PROOF');
  seenWork.add(j.original_work_id);
 }
 return frozen({
  version:ROLE_WORKFORCE_EVIDENCE_VERSION,
  status:'ISOLATED_TECHNICAL_WORK_PROOF_NO_RECURRING_STAFF_COVERAGE',
  source_scope:'SIGNED_IN_OWNER_INDEPENDENT_ISOLATED_ROI_READBACK',
  isolated_original_jobs_independently_settled:roi.distinct_isolated_jobs_verified,
  isolated_jobs_with_source_recorded_economic_inputs:
   roi.collection_state.jobs_with_recorded_economic_inputs,
  independently_verified_comparable_human_work_count:0,
  independently_verified_billable_provider_cost_count:0,
  verified_recurring_role_task_coverage_count:0,
  independently_proven_replacement_ready_role_count:0,
  role_work_proof:frozen(roster.proposed_employees.map(role=>frozen({
   function_id:role.function_id,role_title:role.role,
   role_label:role.display_name,
   verified_recurring_task_coverage_percent:null,
   qualified_role_settlements_with_workload_mapping:null,
   independently_proven_removable_positions:null,
   realized_payroll_savings_usd:null,
   proof_state:'REQUIRES_OWNER_ROLE_TASK_MAPPING_RECURRING_COMPLETION_AND_COSTS'
  }))),
  technical_isolated_settlement_is_not_business_role_replacement:true,
  owner_payroll_assumptions_are_not_verified_savings:true,
  verified_positions_eliminated:null,
  verified_cash_savings_usd:null,
  realized_net_roi_usd:null,
  verified_business_fte_saved:null,
  read_only:true,
  owner_execution_authorized:false,
  production_changed:false
 });
}
export function unavailableOwnerRoleWorkforceEvidence(){
 return frozen({
  version:ROLE_WORKFORCE_EVIDENCE_VERSION,
  status:'OWNER_ROI_READBACK_UNAVAILABLE_NO_CLAIMS',
  isolated_original_jobs_independently_settled:null,
  isolated_jobs_with_source_recorded_economic_inputs:null,
  verified_recurring_role_task_coverage_count:null,
  independently_proven_replacement_ready_role_count:null,
  role_work_proof:null,
  verified_positions_eliminated:null,
  verified_cash_savings_usd:null,
  realized_net_roi_usd:null,
  read_only:true,
  owner_execution_authorized:false,
  production_changed:false,
 });
}
