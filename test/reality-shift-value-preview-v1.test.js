import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildRealityWorkdayOpportunityBrief}
 from '../src/reality-workday-opportunity-brief-v1.js';
import {buildRealityNamedEmployeeRoster}
 from '../src/reality-employee-identity-roster-v1.js';
import {buildRealityShiftValuePreview}
 from '../src/reality-shift-value-preview-v1.js';
const root='https://github.com/maloney2323/Reality/';
const source=(k,category,path)=>({
 finding_id:'catalog:'+k.repeat(32),finding_type:'OPEN_ISSUE',
 source:'github_issues',state:'TRACKED_NEEDS_REVIEW',
 title:'Open work item '+k,category,evidence_refs:[root+path],
 value_assessment:{triage_score:80},execution_work_item:null,
 authorization_required:false});
function roster(){
 const catalog={
 version:'reality-work-catalog-v0.1',status:'OBSERVED',
 observed_at:'2026-11-06T17:00:00.000Z',authority:'NONE_GRANTED',
 execution_enabled:false,
 items:[source('a','bugs','issues/263'),source('b','reliability','issues/143'),
  source('c','customer','issues/62')],
 source_coverage:{issues:'checked',pull_requests:'checked',
  actions:'checked',commits:'checked',customer_feedback:'not_connected',
  business_operations:'not_connected',external_research:'not_connected'}
 };
 return buildRealityNamedEmployeeRoster(buildRealityWorkdayOpportunityBrief(catalog));
}
test('eight named roles schedule 256–320 role hours weekly without eight employees replaced',()=>{
 const view=buildRealityShiftValuePreview(roster());
 assert.equal(view.status,'SOURCE_BACKED_WORKFORCE_POTENTIAL_NOT_MEASURED_ROI');
 assert.equal(view.illustrative_shift_capacity.proposed_roles,8);
 assert.equal(view.illustrative_shift_capacity.illustrative_role_schedule_hours_per_week_min,256);
 assert.equal(view.illustrative_shift_capacity.illustrative_role_schedule_hours_per_week_max,320);
 assert.equal(view.illustrative_shift_capacity.unit,'AI_ROLE_SCHEDULE_HOURS_NOT_HUMAN_HOURS_REPLACED');
 assert.equal(view.illustrative_shift_capacity.equivalent_human_hours_saved_verified,null);
 assert.equal(view.illustrative_shift_capacity.every_role_has_eight_hours_of_work_unverified,true);
 assert.equal(view.illustrative_shift_capacity.financial_roi_verified,false);
 assert.equal(view.team.independently_measured_human_fte_replaced,null);
 assert.equal(view.team.source_backed_work_center_findings,3);
 assert.equal(view.team.software_engineering_findings,2);
 assert.equal(view.evidence.verified_net_roi_usd,null);
 assert.equal(view.evidence.actual_automation_cost_usd,null);
 assert.equal(view.read_only,true);
 assert.equal(view.job_started,false);
});
test('study and wage examples are comparable human software-fault what-ifs only',()=>{
 const view=buildRealityShiftValuePreview(roster());
 const e=view.comparable_software_repair;
 assert.equal(e.investigation_median_hours,2);
 assert.equal(e.implementation_median_hours,3);
 assert.equal(e.illustrative_sum_of_medians_hours,5);
 assert.equal(e.sum_of_medians_not_median_total,true);
 assert.equal(e.wage_observation_period,'2025-05');
 assert.equal(e.developer_median_wage_usd_per_hour,65.38);
 assert.equal(e.one_fault_example.illustrative_gross_human_wage_equivalent_usd,326.9);
 assert.equal(e.four_fault_example.illustrative_gross_human_wage_equivalent_usd,1307.6);
 assert.equal(e.four_fault_example.human_eight_hour_shift_equivalents,2.5);
 assert.equal(e.scenario_not_shift_throughput_forecast,true);
 assert.equal(e.scenario_not_cash_savings,true);
 assert.equal(e.four_fault_example.realized_cash_savings_usd,null);
});
test('forged real ROI, worker role or budget cannot be displayed as validated',()=>{
 const r=roster();
 for(const modification of [
  {active_ai_employee_count:2},
  {verified_cash_savings_usd:12345},
  {proposed_employee_count:7},
  {existing_work_center_candidates:999},
  {production_changed:true},
  {proposed_employees:r.proposed_employees.map((e,i)=>
   i===0?{...e,independently_completed_jobs:2}:e)}
 ]){
  assert.throws(()=>buildRealityShiftValuePreview({...r,...modification}),
   /RILEY_SHIFT_VALUE_/);
 }
 assert.throws(()=>buildRealityShiftValuePreview(r,{humanDayHours:12}),
  /RILEY_SHIFT_VALUE_/);
});
test('signed-in API and Chat show assumptions and sources, never promise staffing reduction',()=>{
 const api=readFileSync(new URL('../api/reality/personal-employee-roster.js',
  import.meta.url),'utf8');
 const ui=readFileSync(new URL('../reality-chat-simple.html',
  import.meta.url),'utf8');
 assert.match(api,/authenticatedChatSession\(req,res\)/);
 assert.match(api,/buildRealityShiftValuePreview/);
 assert.match(api,/value_preview/);
 assert.match(ui,/teamValueWeekly/);
 assert.match(ui,/256/);
 assert.match(ui,/320/);
 assert.match(ui,/showShiftValueEvidence\(roster\)/);
 assert.match(ui,/teamValueNASA/);
 assert.match(ui,/teamValueProof/);
 assert.match(ui,/People replaced: not measured/);
 assert.doesNotMatch(ui,/8 employees replaced|verified annual savings/);
});
