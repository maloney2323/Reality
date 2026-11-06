import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildRealityWorkdayOpportunityBrief}
 from '../src/reality-workday-opportunity-brief-v1.js';
import {buildRealityNamedEmployeeRoster}
 from '../src/reality-employee-identity-roster-v1.js';
import {nextWeekStartDate,prepareNextWeekEmployeePlan}
 from '../src/reality-next-week-employee-plan-v1.js';
const root='https://github.com/maloney2323/Reality/';
const NOW=new Date('2026-11-06T17:00:00.000Z');
const source=(k,category,path)=>({
 finding_id:'catalog:'+k.repeat(32),finding_type:'OPEN_ISSUE',
 source:'github_issues',state:'TRACKED_NEEDS_REVIEW',
 title:'Current source finding '+k,category,
 evidence_refs:[root+path],value_assessment:{triage_score:80},
 execution_work_item:null,authorization_required:false
});
function roster(){
 const catalog={
  version:'reality-work-catalog-v0.1',status:'OBSERVED',
  observed_at:'2026-11-06T16:45:00.000Z',
  authority:'NONE_GRANTED',execution_enabled:false,
  items:[source('a','bugs','issues/263'),source('b','reliability','issues/143'),
   source('c','customer','issues/62'),source('d','security','issues/188')],
  source_coverage:{
   issues:'checked',pull_requests:'checked',actions:'checked',
   commits:'checked',customer_feedback:'not_connected',
   business_operations:'not_connected',external_research:'not_connected'}
 };
 return buildRealityNamedEmployeeRoster(buildRealityWorkdayOpportunityBrief(catalog));
}
const background={
 status:'NEXT_WEEK_SOURCE_SNAPSHOT_PREPARED',
 week_start:'2026-11-09',
 source_scope:'maloney2323/Reality',
 source_sha256:'a'.repeat(64),
 open_issue_count:7,prepared_at:'2026-11-06T16:55:00.000Z',
 shift_execution_authorized:false,
 installation_authorized:false,production_changed:false
};
test('every Friday/Sunday/Monday rolls to the immediately upcoming NY Monday',()=>{
 assert.equal(nextWeekStartDate(NOW),'2026-11-09');
 assert.equal(nextWeekStartDate(new Date('2026-11-08T18:00:00.000Z')),
  '2026-11-09');
 assert.equal(nextWeekStartDate(new Date('2026-11-09T17:00:00.000Z')),
  '2026-11-16');
 assert.equal(nextWeekStartDate(new Date('2026-03-06T17:00:00.000Z')),
  '2026-03-09');
 assert.equal(nextWeekStartDate(new Date('2026-11-01T15:00:00.000Z')),
  '2026-11-02');
 assert.throws(()=>nextWeekStartDate(new Date('invalid')),
  /REALITY_NEXT_WEEK_PLAN_/);
});
test('prepares 8 business functions and 40 prospective weekdays with distinct source reviews',()=>{
 const plan=prepareNextWeekEmployeePlan(roster(),{now:NOW});
 assert.equal(plan.status,'NEXT_WEEK_DRAFT_PREPARED_AWAITING_OWNER_SHIFT_AUTHORIZATION');
 assert.equal(plan.week_start,'2026-11-09');
 assert.equal(plan.week_end,'2026-11-13');
 assert.equal(plan.calendar_time_zone,'America/New_York');
 assert.equal(plan.employee_role_count,8);
 assert.equal(plan.employee_roles.length,8);
 assert.equal(plan.employee_roles.reduce((s,r)=>s+r.week_days.length,0),40);
 assert.equal(plan.proposed_work_findings,4);
 assert.equal(plan.four_day_week_capacity_hours,256);
 assert.equal(plan.five_day_week_capacity_hours,320);
 const assignments=plan.employee_roles.flatMap(r=>r.week_days.flatMap(day=>day.assignments));
 assert.equal(assignments.length,4);
 assert.equal(new Set(assignments.map(x=>x.finding_id)).size,4);
 assert.ok(assignments.every(a=>a.owner_execution_authorized===false));
 assert.equal(plan.candidate_source_review_assignments_not_jobs,true);
 assert.equal(plan.owner_shift_authorization_recorded,false);
 assert.equal(plan.installation_authorized,false);
 assert.equal(plan.verified_financial_roi_usd,null);
 assert.equal(plan.verified_human_hours_saved,null);
 assert.equal(plan.production_changed,false);
 assert.equal(plan.preparation_source,'BACKGROUND_SOURCE_SNAPSHOT_NOT_YET_VERIFIED');
});
test('server-prepared source evidence makes background status visible without executing a job',()=>{
 const plan=prepareNextWeekEmployeePlan(roster(),{
  now:NOW,preparedSource:background});
 assert.equal(plan.preparation_source,'BACKGROUND_NEXT_WEEK_SOURCE_REFRESH_VERIFIED');
 assert.equal(plan.background_source_prepared_at,background.prepared_at);
 assert.equal(plan.existing_authorized_originals_preserved,true);
 assert.equal(plan.verified_headcount_reduction,null);
 assert.ok(plan.employee_roles.some(x=>
  x.function_id==='software_engineering'&&x.candidate_finding_count===2));
 assert.ok(plan.employee_roles.some(x=>x.candidate_finding_count===0&&
  x.week_days.every(d=>d.work_status==='WORK_GAP_DISCOVERY_OR_REVIEW_NEEDED')));
});
test('untrusted snapshot, wrong week and forged active workforce fail closed',()=>{
 const r=roster();
 for(const bad of [
  {...background,week_start:'2026-11-16'},
  {...background,open_issue_count:9999},
  {...background,source_sha256:'unknown'},
  {...background,prepared_at:'2026-12-31T17:00:00Z'},
  {...background,status:'SCHEDULED_EMPLOYEES_EXECUTING'}
 ]){
  assert.throws(()=>prepareNextWeekEmployeePlan(r,{
   now:NOW,preparedSource:bad}),/REALITY_NEXT_WEEK_PLAN_/);
 }
 assert.throws(()=>prepareNextWeekEmployeePlan({
  ...r,active_ai_employee_count:2},{now:NOW}),/REALITY_NEXT_WEEK_PLAN_/);
 const duplicated={...r,proposed_employees:r.proposed_employees.map((x,i)=>
  i===1?{...x,candidate_jobs:r.proposed_employees[0].candidate_jobs,
   candidate_count:r.proposed_employees[0].candidate_jobs.length}:x)};
 assert.throws(()=>prepareNextWeekEmployeePlan(duplicated,{now:NOW}),
  /REALITY_NEXT_WEEK_PLAN_/);
});
test('unattended source preparation, private SQL, owner UI and actual 6-hour cron are separate from execution',()=>{
 const edge=readFileSync(new URL(
  '../supabase/functions/reality-next-week-employee-planning-v1/index.ts',
  import.meta.url),'utf8');
 const table=readFileSync(new URL(
  '../supabase/migrations/20261106_next_week_employee_source_snapshot_v1.sql',
  import.meta.url),'utf8');
 const cron=readFileSync(new URL(
  '../supabase/migrations/20261106_next_week_employee_planner_cron_v1.sql',
  import.meta.url),'utf8');
 const api=readFileSync(new URL(
  '../api/reality/personal-employee-roster.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../reality-chat-simple.html',import.meta.url),'utf8');
 assert.match(edge,/reality_store_next_week_source_snapshot_v1/);
 assert.match(edge,/reality_read_next_week_source_snapshot_v1/);
 assert.match(edge,/reality_authenticate_employee_shift_wake_v1/);
 assert.match(edge,/githubOpenIssues/);
 assert.match(edge,/independent|INDEPENDENT_NEXT_WEEK_READBACK_MISMATCH/i);
 assert.match(table,/create table if not exists reality_internal.next_week_employee_source_snapshots_v1/);
 assert.match(table,/enable row level security/);
 assert.match(table,/revoke all on function public.reality_store_next_week_source_snapshot_v1/);
 assert.match(cron,/23 \*\/6 \* \* \*/);
 assert.match(cron,/vault\.decrypted_secrets/);
 assert.match(api,/authenticatedChatSession\(req,res\)/);
 assert.match(api,/prepareNextWeekEmployeePlan\(roster/);
 assert.match(api,/next_week_plan/);
 assert.match(ui,/Next week's proposed employee schedule/);
 assert.match(ui,/renderNextWeekWorkPlan\(roster\)/);
 assert.match(ui,/Background source refresh verified/);
 assert.match(ui,/Find and qualify useful work/);
 assert.doesNotMatch(edge,/approveInstall|queueVerifiedOriginalRepair|openai\.com|deployProduction/);
});
