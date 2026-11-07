import test from 'node:test';
import assert from 'node:assert/strict';
import {projectRoleWorkforceConsolidation as run}
 from '../src/reality-role-workforce-savings-scenario-v1.js';
const roles=['product_strategy','software_engineering',
 'quality_security_reliability','infrastructure_operations',
 'experience_onboarding','marketing_competitive',
 'sales_customer_success','financial_legal_admin'];
const roster={version:'reality-proposed-ai-employee-roster-v1',
 status:'READ_ONLY_PROPOSED_AI_EMPLOYEES',proposed_employee_count:8,
 active_ai_employee_count:0,verified_cash_savings_usd:null,
 live_deployment_verified:false,production_changed:false,
 proposed_employees:roles.map((function_id,i)=>({
  employee_id:'reality-proposed:'+function_id,function_id,
  display_name:['Avery','Riley','Quinn','Taylor','Casey','Morgan','Jordan','Sage'][i],
  role:['Product','Engineer','QA','Operations','Experience','Marketing','Sales','Finance'][i],
  candidate_count:i,activation_status:'PROPOSED_NOT_DEPLOYED',
  independently_completed_jobs:0
 }))};
const a={
 function_id:'software_engineering',current_employee_positions:2,
 annual_fully_loaded_cost_per_position_usd:120000,
 monthly_human_work_hours_per_position:160,
 assumed_automatable_human_hours_per_month:320,
 assumed_human_supervision_hours_per_month:10,
 assumed_shared_model_runtime_hours_per_month:100,
 estimated_monthly_provider_and_infrastructure_cost_usd:100,
 extra_monthly_supervision_cash_cost_usd:50,
 all_critical_duties_assumed_covered:true,
};
const calc=(assumptions=[a],capacity=160,r=roster)=>
 run({roster:r,assumptions,
  shared_monthly_model_runtime_capacity_hours:capacity});
test('one shared OpenAI model across 8 role labels can indicate a CONDITIONAL whole-position scenario',()=>{
 const x=calc();
 assert.equal(x.business_role_labels,8);
 assert.equal(x.underlying_model_provider,'OpenAI');
 assert.equal(x.shared_model_concurrency_limit,1);
 assert.equal(x.independently_active_ai_employees,0);
 assert.equal(x.role_scenarios.length,1);
 assert.equal(x.role_scenarios[0].hypothetical_fte_capacity_equivalent,1.938);
 assert.equal(x.role_scenarios[0].hypothetical_whole_positions_potentially_consolidatable,1);
 assert.equal(x.role_scenarios[0].illustrative_annual_gross_payroll_avoidance_usd,120000);
 assert.equal(x.role_scenarios[0].illustrative_annual_net_payroll_scenario_usd,118200);
 assert.equal(x.annual_net_payroll_scenario_usd,118200);
 assert.equal(x.actual_positions_removed_verified,null);
 assert.equal(x.realized_payroll_savings_usd,null);
 assert.equal(x.authorized_hr_actions,false);
 assert.equal(x.read_only,true);
});
test('a business cannot count fractional task time as a removable position',()=>{
 const x=calc([{...a,assumed_automatable_human_hours_per_month:80,
  assumed_human_supervision_hours_per_month:10}]);
 assert.equal(x.role_scenarios[0].hypothetical_fte_capacity_equivalent,0.438);
 assert.equal(x.potential_whole_positions_scenario,0);
 assert.equal(x.annual_net_payroll_scenario_usd,-1800);
});
test('critical duties not assumed covered blocks hypothetical whole-position consolidation',()=>{
 const x=calc([{...a,all_critical_duties_assumed_covered:false}]);
 assert.equal(x.role_scenarios[0].hypothetical_fte_capacity_equivalent,1.938);
 assert.equal(x.potential_whole_positions_scenario,0);
 assert.equal(x.annual_gross_payroll_avoidance_scenario_usd,0);
 assert.equal(x.actual_positions_removed_verified,null);
});
test('model runtime shared across departments cannot be multiplied by 8',()=>{
 const other={...a,function_id:'sales_customer_success',
  assumed_shared_model_runtime_hours_per_month:80};
 assert.throws(()=>calc([a,other],160),/SHARED_ONE_OPENAI_PROVIDER_CAPACITY_EXCEEDED/);
 const good=calc([a,{...other,assumed_shared_model_runtime_hours_per_month:60}]);
 assert.equal(good.role_scenarios.length,2);
 assert.equal(good.proposed_total_model_runtime_hours_per_month,160);
 assert.equal(good.potential_whole_positions_scenario,2);
 assert.equal(good.underlying_model_provider,'OpenAI');
 assert.equal(good.independently_active_ai_employees,0);
});
test('missing business payroll assumptions cannot manufacture a savings claim',()=>{
 const x=calc([]);
 assert.equal(x.status,'AWAITING_COMPANY_ROLE_PAYROLL_AND_AUTOMATION_ASSUMPTIONS');
 assert.equal(x.annual_net_payroll_scenario_usd,0);
 assert.equal(x.realized_payroll_savings_usd,null);
 assert.equal(x.role_scenarios.length,0);
});
test('invalid payroll, duplicate roles, high claimed coverage and fake activated employees fail',()=>{
 for(const bad of [
  {...a,annual_fully_loaded_cost_per_position_usd:-1},
  {...a,current_employee_positions:-1},
  {...a,assumed_automatable_human_hours_per_month:321},
  {...a,assumed_human_supervision_hours_per_month:321},
  {...a,assumed_shared_model_runtime_hours_per_month:745},
  {...a,function_id:'new_fake_employee'},
  {...a,all_critical_duties_assumed_covered:'true'},
  {...a,extra_monthly_supervision_cash_cost_usd:-1}
 ])assert.throws(()=>calc([bad]),/REALITY_WORKFORCE_SCENARIO_/);
 assert.throws(()=>calc([a,a]),/REALITY_WORKFORCE_SCENARIO_/);
 assert.throws(()=>calc([a],0),/REALITY_WORKFORCE_SCENARIO_/);
 assert.throws(()=>calc([a],160,{...roster,active_ai_employee_count:1}),
  /REALITY_WORKFORCE_SCENARIO_/);
});
