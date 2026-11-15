import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildRealityWorkdayOpportunityBrief}
 from '../src/reality-workday-opportunity-brief-v1.js';
import {buildRealityNamedEmployeeRoster}
 from '../src/reality-employee-identity-roster-v1.js';
import {prepareNextWeekEmployeePlan}
 from '../src/reality-next-week-employee-plan-v1.js';
import {projectRealityWeeklyWorkloadInsight}
 from '../src/reality-weekly-workload-insight-v1.js';
import {readVerifiedWeeklyWorkloadForChat}
 from '../src/reality-employee-shift-chat-context-v1.js';

const now=new Date('2026-11-06T17:00:00.000Z');
const root='https://github.com/maloney2323/Reality/';
const source=(k,category,path)=>({
 finding_id:'catalog:'+k.repeat(32),
 finding_type:'OPEN_ISSUE',source:'github_issues',
 state:'TRACKED_NEEDS_REVIEW',title:'Current issue '+k,
 category,evidence_refs:[root+path],
 value_assessment:{triage_score:80},
 execution_work_item:null,authorization_required:false
});
function catalog(){
 return {
  version:'reality-work-catalog-v0.1',status:'OBSERVED',
  observed_at:'2026-11-06T16:45:00.000Z',
  authority:'NONE_GRANTED',execution_enabled:false,
  items:[source('a','bugs','issues/263'),
   source('b','reliability','issues/143'),
   source('c','customer','issues/62'),
   source('d','security','issues/188')],
  source_coverage:{
   issues:'checked',pull_requests:'checked',actions:'checked',
   commits:'checked',customer_feedback:'not_connected',
   business_operations:'not_connected',external_research:'not_connected'
  }
 };
}
const plan=()=>prepareNextWeekEmployeePlan(
 buildRealityNamedEmployeeRoster(buildRealityWorkdayOpportunityBrief(catalog())),
 {now}
);
test('canonical weekly source plan identifies provisional coverage, not a real scheduled shift',()=>{
 const p=plan(),i=projectRealityWeeklyWorkloadInsight(p);
 assert.equal(i.version,'reality-weekly-workload-insight-v1');
 assert.equal(i.status,'PROVISIONAL_REVIEW_COVERAGE_GAP_NOT_VERIFIED_EMPLOYEE_SCHEDULE');
 assert.equal(i.week_start,'2026-11-09');
 assert.equal(i.role_count,p.employee_role_count);
 assert.equal(i.source_finding_count,4);
 assert.equal(i.provisional_review_timebox_hours,4);
 assert.equal(i.hypothetical_weekly_reference_hours,320);
 assert.equal(i.unallocated_hypothetical_reference_hours,316);
 const sourceBearing=i.roles.filter(r=>r.source_finding_count+r.deferred_source_count>0);
 assert.equal(i.source_work_role_count,sourceBearing.length);
 assert.equal(i.roles_without_source_work_count,8-sourceBearing.length);
 assert.equal(i.source_work_roles_hypothetical_reference_hours,sourceBearing.length*40);
 assert.equal(i.source_work_roles_provisional_hours,4);
 assert.equal(i.source_work_roles_unallocated_reference_hours,
  sourceBearing.reduce((sum,r)=>sum+r.unallocated_hypothetical_reference_hours,0));
 assert.equal(i.gap_recognized,true);
 assert.equal(i.roles.length,8);
 assert.equal(i.roles.reduce((sum,r)=>sum+r.proposed_review_timebox_hours,0),4);
 assert.equal(i.roles.reduce((sum,r)=>sum+r.unallocated_hypothetical_reference_hours,0),316);
 assert(i.roles.every(r=>r.hypothetical_weekly_comparison_hours===40));
 assert(i.roles.every(r=>r.week_days.length===5));
 assert.equal(i.actual_scheduled_execution_hours_verified,null);
 assert.equal(i.actual_productive_work_hours_verified,null);
 assert.equal(i.verified_human_hours_saved,null);
 assert.equal(i.verified_cash_savings_usd,null);
 assert.equal(i.execution_authorized,false);
 assert.equal(i.installation_authorized,false);
 assert.equal(i.production_changed,false);
 assert.equal(i.remaining_reference_hours_are_not_verified_missing_customer_jobs,true);
 assert.equal(i.evidence_refs.length,4);
 // Published NASA/BLS comparator is conditional; candidates aren't completed repairs.
 const n=i.nasa_bls_repair_comparator;
 assert.equal(n.source_review_candidates_needing_fault_validation,2);
 assert.equal(n.verified_comparable_repairs_from_this_plan,0);
 assert.equal(n.investigation_median_hours,2);
 assert.equal(n.implementation_median_hours,3);
 assert.equal(n.sum_of_separate_medians_hours,5);
 assert.equal(n.sum_of_medians_not_median_total,true);
 assert.equal(n.bls_national_median_hourly_wage_usd,65.38);
 assert.equal(n.illustrative_gross_wage_equivalent_usd_per_confirmed_comparable_repair,326.9);
 assert.equal(n.counted_as_weekly_proposed_review_hours,false);
 assert.equal(n.forecast_human_effort_hours,null);
 assert.equal(n.measured_human_hours_saved,null);
 assert.equal(n.verified_cash_savings_usd,null);
 const riley=i.roles.find(r=>r.function_id==='software_engineering');
 assert.equal(riley.nasa_fault_candidates_needing_validation,2);
 const flagged=riley.week_days.flatMap(d=>d.source_findings).filter(x=>x.nasa_fault_candidate_needs_validation);
 assert.equal(flagged.length,2);
 assert.equal(flagged.reduce((n,x)=>n+x.review_hours,0),2,
  'NASA medians must never be substituted for source triage timeboxes');
});
test('refuses forged schedule, duplicated source, inflated time and claimed completions',()=>{
 const p=plan();
 for(const corrupt of [
  {...p,owner_shift_authorization_recorded:true},
  {...p,read_only:false},
  {...p,proposed_review_timebox_hours_total:45},
  {...p,verified_human_hours_saved:1},
  {...p,capacity_unit:'REAL_LABOR_HOURS_SAVED'},
  {...p,employee_roles:[...p.employee_roles].slice(1)},
  {...p,employee_roles:p.employee_roles.map((r,j)=>j===0?
   {...r,provisional_weekly_review_timebox_hours:r.provisional_weekly_review_timebox_hours+1}:r)}
 ])assert.throws(()=>projectRealityWeeklyWorkloadInsight(corrupt),
  /WEEKLY_WORKLOAD_INSIGHT_/);
});
test('non-defect source categories do not borrow NASA repair effort or invent ROI',()=>{
 const c=catalog();
 c.items[0].category='features';
 c.items[1].category='upgrades';
 const p=prepareNextWeekEmployeePlan(buildRealityNamedEmployeeRoster(
  buildRealityWorkdayOpportunityBrief(c)),{now});
 const i=projectRealityWeeklyWorkloadInsight(p);
 assert.equal(i.nasa_bls_repair_comparator.source_review_candidates_needing_fault_validation,0);
 assert.equal(i.provisional_review_timebox_hours,4);
 assert.equal(i.verified_human_hours_saved,null);
 assert.equal(i.verified_cash_savings_usd,null);
 assert(i.roles.every(r=>r.nasa_fault_candidates_needing_validation===0));
});

test('authenticated weekly question projects the same source plan into existing Universe context',async()=>{
 const session={
  user_id:'a61c7791-9d0d-4969-881b-05af149e37ae',
  config:{url:'https://hvkfreoagbrphwghjajw.supabase.co'},
  access_token:'authenticated-test-source'
 };
 const env={VERCEL_ENV:'preview',
  REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw'};
 let calls=0;
 const evidence=await readVerifiedWeeklyWorkloadForChat({
  session,message:'How much of our employee workweek is unfilled?',
  env,now,catalogBuilder:async()=>{calls++;return catalog();}
 });
 assert.equal(calls,1);
 assert.equal(evidence.length,1);
 const e=evidence[0],i=projectRealityWeeklyWorkloadInsight(plan());
 assert.equal(e.source_kind,'READ_ONLY_EXISTING_REALITY_WORK_CATALOG');
 assert.equal(e.event_kind,'owner_source_backed_weekly_review_capacity_gap');
 assert.equal(e.weekly_workload_insight.provisional_review_timebox_hours,
  i.provisional_review_timebox_hours);
 assert.equal(e.weekly_workload_insight.unallocated_hypothetical_reference_hours,
  i.unallocated_hypothetical_reference_hours);
 assert.match(e.summary,new RegExp(
  String(i.source_work_roles_unallocated_reference_hours)+' comparison hours unallocated'));
 assert.match(e.summary,/source-bearing roles/);
 assert.match(e.summary,/other proposed roles have no routed source work/);
 assert.match(e.summary,/NOT confirmed missing customer work/);
 assert.equal(e.execution_authorized,false);
 assert.equal(e.installation_authorized,false);
 assert.equal(e.work_execution_verified,false);
 const unrelated=await readVerifiedWeeklyWorkloadForChat({
  session,message:'Tell me a joke.',env,now,
  catalogBuilder:async()=>{throw Error('Should not fetch unrelated')},
 });
 assert.deepEqual(unrelated,[]);
 const noOwner=await readVerifiedWeeklyWorkloadForChat({
  session:{...session,user_id:'different-tenant'},
  message:'weekly capacity',env,now,catalogBuilder:async()=>catalog()
 });
 assert.deepEqual(noOwner,[]);
});
test('Home, roster, Chat and both model paths use the same projection without execution side effects',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const roster=read('api/reality/personal-employee-roster.js');
 const home=read('reality-home-command-v1.js');
 const brief=read('reality-home-employee-brief-v1.js');
 const chat=read('api/reality/personal-chat.js');
 const workspace=read('reality-chat-workspace-v1.js');
 assert.match(roster,/projectRealityWeeklyWorkloadInsight\(next_week_plan\)/);
 assert.match(roster,/next_week_plan,weekly_workload_insight/);
 assert.match(brief,/reality:weekly-workload-readback/);
 assert.match(brief,/validWeekly\(data\.weekly_workload_insight,data\)/);
 assert.match(home,/realityHomeWeeklyWorkload/);
 assert.match(home,/rc-weekly-fill/);
 assert.match(home,/aria-valuenow/);
 assert.match(home,/View Monday–Friday source assignments/);
 assert.match(home,/reality:weekly-workload-readback/);
 assert.match(home,/Ask Reality to assess this workweek gap/);
 assert.doesNotMatch(home,/\bfetch\s*\(|AUTHORIZE_EXACT|owner_approve/);
 assert.match(chat,/weekly_workload:weeklyWorkloadObservations/);
 assert.match(chat,/\.\.\.weeklyWorkloadObservations/);
 assert.match(chat,/weekly_workload_gap:weeklyWorkloadObservations\[0\]/);
 assert.match(chat,/owner_weekly_workload_gap:weeklyWorkloadObservations\[0\]/);
 assert.match(workspace,/window\.location\.hash==='#weekly-workload'/);
 assert.match(workspace,/input\.value='Reality, assess our next-week/);
 assert.doesNotMatch(workspace,/input\.form\.submit\(\)|input\.closest\('form'\)\.submit/);
});
