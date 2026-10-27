import test from 'node:test';
import assert from 'node:assert/strict';
import {projectHypotheticalWorkforceImpact}
 from '../src/reality-work-value-assessment-v0.1.js';
import workforceHandler from '../api/reality/workforce-impact.js';

const assumptions={
 manual_minutes_per_occurrence:60,
 occurrences_per_month:400,
 automatable_fraction:0.8,
 loaded_hourly_labor_cost_usd:35,
 productive_hours_per_fte_month:160,
 human_review_minutes_per_automated_occurrence:2,
 exception_fraction_of_automated_occurrences:0.1,
 human_minutes_per_exception:15,
 team_headcount:5,
 estimated_automation_cost_usd_per_month:1200,
 estimated_monthly_implementation_amortization_usd:300,
};
test('staffing model accounts for review, exceptions, productive FTE and cost assumptions',()=>{
 const p=projectHypotheticalWorkforceImpact(assumptions);
 assert.equal(p.monthly_manual_baseline_hours,400);
 assert.equal(p.monthly_covered_occurrences,320);
 assert.equal(p.monthly_gross_task_hours_released,320);
 assert.equal(p.monthly_human_review_hours,10.67);
 assert.equal(p.monthly_exception_handling_hours,8);
 assert.equal(p.monthly_net_capacity_hours,301.33);
 assert.equal(p.workforce_capacity_fte_equivalent,1.88);
 assert.equal(p.theoretical_whole_position_capacity_upper_bound,1);
 assert.equal(p.gross_monthly_labor_capacity_value_usd,10546.67);
 assert.equal(p.hypothetical_net_economic_value_usd_month,9046.67);
 assert.equal(p.actual_eliminable_positions,null);
 assert.equal(p.verified_monthly_payroll_reduction_usd,null);
 assert.equal(p.verified_company_cash_savings_usd,null);
 assert.equal(p.actual_layoffs_recommended,false);
 assert.equal(p.staffing_action_authorized,false);
 assert.equal(p.full_job_automation_verified,false);
 assert.equal(p.role_consolidation_verified,false);
});
test('no company headcount means no theoretical whole-role ceiling, even with FTE equivalents',()=>{
 const p=projectHypotheticalWorkforceImpact({...assumptions,team_headcount:null});
 assert.equal(p.workforce_capacity_fte_equivalent,1.88);
 assert.equal(p.theoretical_whole_position_capacity_upper_bound,null);
 assert.equal(p.actual_eliminable_positions,null);
});
test('theoretical whole-role upper bound never exceeds team headcount; cannot imply layoffs',()=>{
 const p=projectHypotheticalWorkforceImpact({
  ...assumptions,manual_minutes_per_occurrence:200,
  team_headcount:1,
 });
 assert.ok(p.workforce_capacity_fte_equivalent>4);
 assert.equal(p.theoretical_whole_position_capacity_upper_bound,1);
 assert.equal(p.actual_eliminable_positions,null);
});
test('zero possible automation and oversight-heavy cases do not invent recovered labor',()=>{
 const zero=projectHypotheticalWorkforceImpact({
  ...assumptions,automatable_fraction:0,
 });
 assert.equal(zero.monthly_net_capacity_hours,0);
 assert.equal(zero.workforce_capacity_fte_equivalent,0);
 assert.equal(zero.theoretical_whole_position_capacity_upper_bound,0);
 const review=projectHypotheticalWorkforceImpact({
  ...assumptions,human_review_minutes_per_automated_occurrence:120,
 });
 assert.equal(review.monthly_net_capacity_hours,0);
 assert.equal(review.gross_monthly_labor_capacity_value_usd,0);
 assert.equal(review.hypothetical_net_economic_value_usd_month,-1500);
});
test('without observed operating and implementation costs, hypothetical net economic result is UNKNOWN',()=>{
 const p=projectHypotheticalWorkforceImpact({
  ...assumptions,estimated_automation_cost_usd_per_month:null,
 });
 assert.equal(p.hypothetical_net_economic_value_usd_month,null);
 assert.equal(p.verified_company_cash_savings_usd,null);
});
test('reject missing or deceptive staffing assumptions including noninteger team headcount',()=>{
 for(const override of [
  {productive_hours_per_fte_month:null},
  {productive_hours_per_fte_month:0},
  {productive_hours_per_fte_month:745},
  {human_review_minutes_per_automated_occurrence:undefined},
  {exception_fraction_of_automated_occurrences:-0.1},
  {exception_fraction_of_automated_occurrences:1.1},
  {human_minutes_per_exception:-1},
  {team_headcount:0},
  {team_headcount:1.2},
  {team_headcount:Infinity},
  {estimated_automation_cost_usd_per_month:-1},
  {estimated_monthly_implementation_amortization_usd:NaN},
  {loaded_hourly_labor_cost_usd:0},
 ])assert.throws(()=>projectHypotheticalWorkforceImpact({
  ...assumptions,...override,
 }),/WORKFORCE_IMPACT_/);
});
function mockResponse(){
 return {statusCode:200,headers:{},status(s){this.statusCode=s;return this},
 setHeader(k,v){this.headers[k]=v},
 json(j){this.body=j;return this}};
}
test('staffing projection API is arithmetic-only, rejects invalid/unapproved fields and no mutation',()=>{
 const ok=mockResponse();
 workforceHandler({method:'POST',headers:{'content-type':'application/json'},
  body:assumptions},ok);
 assert.equal(ok.statusCode,200);
 assert.equal(ok.body.projection.workforce_capacity_fte_equivalent,1.88);
 assert.equal(ok.body.projection.actual_eliminable_positions,null);
 assert.equal(ok.headers['Cache-Control'],'no-store');
 const bad=mockResponse();
 workforceHandler({method:'POST',headers:{'content-type':'application/json'},
  body:{...assumptions,authorized_action:'DELETE_WORKER'}},bad);
 assert.equal(bad.statusCode,400);
 assert.equal(bad.body.ok,false);
 const get=mockResponse();
 workforceHandler({method:'GET',headers:{}},get);
 assert.equal(get.statusCode,405);
 const wrong=mockResponse();
 workforceHandler({method:'POST',headers:{'content-type':'text/plain'},body:assumptions},wrong);
 assert.equal(wrong.statusCode,415);
});
