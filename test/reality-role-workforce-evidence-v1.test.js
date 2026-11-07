import test from 'node:test';
import assert from 'node:assert/strict';
import {projectOwnerRoleWorkforceEvidence as project,
 unavailableOwnerRoleWorkforceEvidence as unavailable}
 from '../src/reality-role-workforce-evidence-v1.js';
const roleIds=['product_strategy','software_engineering',
 'quality_security_reliability','infrastructure_operations',
 'experience_onboarding','marketing_competitive',
 'sales_customer_success','financial_legal_admin'];
const roster={version:'reality-proposed-ai-employee-roster-v1',
 status:'READ_ONLY_PROPOSED_AI_EMPLOYEES',proposed_employee_count:8,
 active_ai_employee_count:0,verified_cash_savings_usd:null,
 proposed_employees:roleIds.map((function_id,i)=>({
  function_id,employee_id:'reality-proposed:'+function_id,
  display_name:'Role '+i,role:'Business Function '+i,
  activation_status:'PROPOSED_NOT_DEPLOYED',independently_completed_jobs:0
 }))};
const job={original_work_id:'work:'+'a'.repeat(32),
 technical_settlement_status:'INDEPENDENTLY_SETTLED_ISOLATED_PREVIEW',
 production_changed:false,economic_value:{
  verified_cash_savings_usd:{value:null},
  verified_hours_returned:{value:null}
 },human_labor_context:{human_task_effort_hours:{value:null}},
 economic_observations:[]};
const roi={version:'reality-operational-roi-evidence-v2',
 scope:'ISOLATED_SETTLEMENT_NOT_ENTIRE_BUSINESS_WORKFLOW',
 financial_roi_verified:false,verified_customer_financial_roi:false,
 production_changed:false,
 distinct_isolated_jobs_verified:1,jobs:[job],
 collection_state:{comparable_human_work_verified:0,
  billable_provider_cost_verified:0,
  verified_cash_savings_usd:null,jobs_with_recorded_economic_inputs:0}};
test('actual independently settled isolated work does not create 8 removable role claims',()=>{
 const r=project({roster,roi});
 assert.equal(r.isolated_original_jobs_independently_settled,1);
 assert.equal(r.verified_recurring_role_task_coverage_count,0);
 assert.equal(r.independently_proven_replacement_ready_role_count,0);
 assert.equal(r.role_work_proof.length,8);
 assert.ok(r.role_work_proof.every(e=>
  e.verified_recurring_task_coverage_percent===null&&
  e.independently_proven_removable_positions===null));
 assert.equal(r.verified_positions_eliminated,null);
 assert.equal(r.verified_cash_savings_usd,null);
 assert.equal(r.realized_net_roi_usd,null);
 assert.equal(r.read_only,true);
});
test('unavailable ledger readback is UNKNOWN, not automatically zero saved',()=>{
 const r=unavailable();
 assert.equal(r.isolated_original_jobs_independently_settled,null);
 assert.equal(r.verified_recurring_role_task_coverage_count,null);
 assert.equal(r.verified_cash_savings_usd,null);
 assert.equal(r.owner_execution_authorized,false);
});
test('no forged savings, inflated evidence, foreign jobs or duplicates can be accepted',()=>{
 for(const altered of [
  {...roi,verified_customer_financial_roi:true},
  {...roi,collection_state:{...roi.collection_state,
   comparable_human_work_verified:1}},
  {...roi,collection_state:{...roi.collection_state,
   billable_provider_cost_verified:1}},
  {...roi,collection_state:{...roi.collection_state,
   verified_cash_savings_usd:200}},
  {...roi,jobs:[job,job],distinct_isolated_jobs_verified:2},
  {...roi,jobs:[{...job,technical_settlement_status:'MODEL_SAYS_COMPLETE'}]},
  {...roi,jobs:[{...job,economic_value:{
   ...job.economic_value,verified_cash_savings_usd:{value:10000}}}]},
  {...roi,jobs:[{...job,economic_value:{
   ...job.economic_value,verified_hours_returned:{value:8}}}]}
 ])assert.throws(()=>project({roster,roi:altered}),
  /REALITY_ROLE_WORKFORCE_EVIDENCE_/);
});
test('8 business labels are not 8 model instances or fake active staff',()=>{
 for(const r of [
  {...roster,active_ai_employee_count:8},
  {...roster,proposed_employees:[
   ...roster.proposed_employees.slice(0,7),roster.proposed_employees[0]]},
  {...roster,proposed_employees:roster.proposed_employees.map((x,i)=>
   i===0?{...x,activation_status:'ACTIVE'}:x)}
 ])assert.throws(()=>project({roster:r,roi}),
  /REALITY_ROLE_WORKFORCE_EVIDENCE_/);
});
