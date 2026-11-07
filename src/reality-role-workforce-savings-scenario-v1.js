// Customer-facing WORKFORCE CONSOLIDATION scenario, not automated HR judgment.
// Roles are business functions served by ONE shared OpenAI model. No payroll,
// workforce reduction, model capacity, staffing decision or verified savings
// can be inferred from eight named role cards or from NASA/BLS defect medians.
// This is a read-only WHAT-IF using explicit employer assumptions. Verified
// labor reductions require a separate job and payroll evidence pipeline.
export const WORKFORCE_CONSOLIDATION_SCENARIO_VERSION=
 'reality-role-workforce-consolidation-scenario-v1';
const ROLE=new Set([
 'product_strategy','software_engineering','quality_security_reliability',
 'infrastructure_operations','experience_onboarding','marketing_competitive',
 'sales_customer_success','financial_legal_admin']);
const fail=x=>{throw Error('REALITY_WORKFORCE_SCENARIO_'+x)};
const money=n=>Number(n.toFixed(2));
const rounded=n=>Number(n.toFixed(3));
function number(x,min,max){
 return typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
}
function whole(x,min,max){return Number.isSafeInteger(x)&&x>=min&&x<=max;}
export function projectRoleWorkforceConsolidation({
 roster,assumptions=[],shared_monthly_model_runtime_capacity_hours
}={}){
 if(roster?.version!=='reality-proposed-ai-employee-roster-v1'||
  roster.status!=='READ_ONLY_PROPOSED_AI_EMPLOYEES'||
  !Array.isArray(roster.proposed_employees)||
  roster.proposed_employees.length!==8||
  roster.proposed_employee_count!==8||
  roster.active_ai_employee_count!==0||
  roster.verified_cash_savings_usd!==null||
  roster.live_deployment_verified!==false||
  roster.production_changed!==false||
  !Array.isArray(assumptions)||assumptions.length>8||
  !number(shared_monthly_model_runtime_capacity_hours,1,744))
  fail('OWNER_ROLE_ROSTER_AND_EXPLICIT_SHARED_MODEL_CAPACITY_REQUIRED');
 const rosterByRole=new Map();
 for(const role of roster.proposed_employees){
  if(!ROLE.has(role.function_id)||rosterByRole.has(role.function_id)||
    role.employee_id!=='reality-proposed:'+role.function_id||
    typeof role.role!=='string'||!role.role||
    role.activation_status!=='PROPOSED_NOT_DEPLOYED'||
    role.independently_completed_jobs!==0||
    !whole(role.candidate_count,0,1000))
   fail('EIGHT_BUSINESS_FUNCTION_LABELS_NOT_WORKERS');
  rosterByRole.set(role.function_id,role);
 }
 if(rosterByRole.size!==8)fail('EIGHT_ROLE_COVERAGE_REQUIRED');
 const seen=new Set(),rows=[];
 let runtime=0;
 for(const a of assumptions){
  if(!rosterByRole.has(a?.function_id)||seen.has(a.function_id)||
   !whole(a.current_employee_positions,0,5000)||
   !number(a.annual_fully_loaded_cost_per_position_usd,0,1e7)||
   !number(a.monthly_human_work_hours_per_position,40,260)||
   !number(a.assumed_automatable_human_hours_per_month,0,100000)||
   !number(a.assumed_human_supervision_hours_per_month,0,100000)||
   !number(a.assumed_shared_model_runtime_hours_per_month,0,744)||
   !number(a.estimated_monthly_provider_and_infrastructure_cost_usd,0,1e7)||
   !number(a.extra_monthly_supervision_cash_cost_usd,0,1e7)||
   typeof a.all_critical_duties_assumed_covered!=='boolean'||
   a.assumed_automatable_human_hours_per_month>
    a.current_employee_positions*a.monthly_human_work_hours_per_position||
   a.assumed_human_supervision_hours_per_month>
    a.assumed_automatable_human_hours_per_month)
   fail('BOUNDED_EXPLICIT_ROLE_AND_COST_ASSUMPTIONS_REQUIRED');
  seen.add(a.function_id);
  runtime+=a.assumed_shared_model_runtime_hours_per_month;
  const role=rosterByRole.get(a.function_id);
  const freed=Math.max(0,a.assumed_automatable_human_hours_per_month-
   a.assumed_human_supervision_hours_per_month);
  const capacity=freed/a.monthly_human_work_hours_per_position;
  // Fractional hours are capacity NOT a position that can be removed.
  // A full-position scenario also requires the user explicitly assuming
  // coverage of non-automatable essential duties.
  const tentativePositions=a.all_critical_duties_assumed_covered?
   Math.min(a.current_employee_positions,Math.floor(capacity+1e-10)):0;
  const annualGross=tentativePositions*
   a.annual_fully_loaded_cost_per_position_usd;
  const annualAutomation=(a.estimated_monthly_provider_and_infrastructure_cost_usd+
   a.extra_monthly_supervision_cash_cost_usd)*12;
  rows.push(Object.freeze({
   function_id:a.function_id,
   role_title:role.role,
   role_label:role.display_name,
   source_backed_findings_not_completed_jobs:role.candidate_count,
   current_positions_assumed:a.current_employee_positions,
   assumed_gross_automatable_hours_per_month:a.assumed_automatable_human_hours_per_month,
   assumed_monthly_human_supervision_hours:a.assumed_human_supervision_hours_per_month,
   assumed_net_human_capacity_hours_per_month:rounded(freed),
   hypothetical_fte_capacity_equivalent:rounded(capacity),
   essential_duties_assumed_covered:a.all_critical_duties_assumed_covered,
   hypothetical_whole_positions_potentially_consolidatable:tentativePositions,
   annual_fully_loaded_position_cost_assumed_usd:
    money(a.annual_fully_loaded_cost_per_position_usd),
   illustrative_annual_gross_payroll_avoidance_usd:money(annualGross),
   illustrative_annual_incremental_automation_and_supervision_cost_usd:
    money(annualAutomation),
   illustrative_annual_net_payroll_scenario_usd:
    money(annualGross-annualAutomation),
   assumed_shared_model_runtime_hours_per_month:
    a.assumed_shared_model_runtime_hours_per_month,
   proof_status:'OWNER_ENTERED_WHAT_IF_NOT_VALIDATED_EMPLOYEE_REMOVAL',
   verified_recurring_task_coverage_percent:null,
   verified_removable_positions:null,
   verified_actual_cash_savings_usd:null,
   personnel_decision_authorized:false,
  }));
 }
 if(runtime>shared_monthly_model_runtime_capacity_hours+1e-9)
  fail('SHARED_ONE_OPENAI_PROVIDER_CAPACITY_EXCEEDED');
 const sums=rows.reduce((x,r)=>({
  positions:x.positions+r.hypothetical_whole_positions_potentially_consolidatable,
  gross:x.gross+r.illustrative_annual_gross_payroll_avoidance_usd,
  cost:x.cost+r.illustrative_annual_incremental_automation_and_supervision_cost_usd
 }),{positions:0,gross:0,cost:0});
 return Object.freeze({
  version:WORKFORCE_CONSOLIDATION_SCENARIO_VERSION,
  status:rows.length?'HYPOTHETICAL_ROLE_PAYROLL_CONSOLIDATION_NOT_VERIFIED':
   'AWAITING_COMPANY_ROLE_PAYROLL_AND_AUTOMATION_ASSUMPTIONS',
  business_role_labels:8,
  underlying_model_provider:'OpenAI',
  independently_active_ai_employees:0,
  shared_model_concurrency_limit:1,
  shared_monthly_model_runtime_capacity_hours,
  proposed_total_model_runtime_hours_per_month:rounded(runtime),
  potential_whole_positions_scenario:sums.positions,
  annual_gross_payroll_avoidance_scenario_usd:money(sums.gross),
  annual_model_infrastructure_and_incremental_supervision_scenario_usd:
   money(sums.cost),
  annual_net_payroll_scenario_usd:money(sums.gross-sums.cost),
  role_scenarios:Object.freeze(rows),
  model_assumptions_are_owner_reported_unverified:true,
  cannot_prove_essential_role_coverage_from_job_hours_alone:true,
  individual_employee_assessment_performed:false,
  original_jobs_independently_completed_by_projection:0,
  actual_positions_removed_verified:null,
  realized_payroll_savings_usd:null,
  verified_human_capacity_returned_hours:null,
  authorized_hr_actions:false,
  execution_authorized:false,
  production_changed:false,
  read_only:true,
 });
}
