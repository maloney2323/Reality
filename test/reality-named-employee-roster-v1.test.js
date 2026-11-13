import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildRealityWorkdayOpportunityBrief}
 from '../src/reality-workday-opportunity-brief-v1.js';
import {buildRealityNamedEmployeeRoster}
 from '../src/reality-employee-identity-roster-v1.js';

const root='https://github.com/maloney2323/Reality/';
function brief(){
 const source=(i,kind,category,path)=>({
  finding_id:'catalog:'+String(i).repeat(32),
  finding_type:kind,
  source:kind==='OPEN_PULL_REQUEST'?'github_pull_requests':'github_issues',
  state:kind==='OPEN_PULL_REQUEST'?'OPEN_AWAITING_REVIEW':'TRACKED_NEEDS_REVIEW',
  title:'Observed source item '+i,category,evidence_refs:[root+path],
  value_assessment:{triage_score:80},
  execution_work_item:null,authorization_required:false
 });
 const catalog={
  version:'reality-work-catalog-v0.1',status:'OBSERVED',
  observed_at:'2026-11-05T18:00:00.000Z',authority:'NONE_GRANTED',
  execution_enabled:false,items:[
   source('a','OPEN_ISSUE','bugs','issues/201'),
   source('b','OPEN_PULL_REQUEST','upgrades','pull/231'),
   source('c','OPEN_ISSUE','security','issues/188'),
   source('d','OPEN_ISSUE','customer','issues/250'),
   source('e','OPEN_ISSUE','research','issues/251')
  ],
  source_coverage:{
   issues:'checked',pull_requests:'checked',actions:'checked',commits:'checked',
   customer_feedback:'not_connected',business_operations:'not_connected',
   external_research:'not_connected'
  }
 };
 return buildRealityWorkdayOpportunityBrief(catalog);
}
test('eight distinct visual employee identities show real roles, not invented workers',()=>{
 const view=buildRealityNamedEmployeeRoster(brief());
 assert.equal(view.version,'reality-proposed-ai-employee-roster-v1');
 assert.equal(view.status,'READ_ONLY_PROPOSED_AI_EMPLOYEES');
 assert.equal(view.proposed_employee_count,8);
 assert.deepEqual(view.proposed_employees.map(e=>e.display_name),
  ['Avery','Riley','Quinn','Taylor','Casey','Morgan','Jordan','Sage']);
 assert.equal(new Set(view.proposed_employees.map(x=>x.employee_id)).size,8);
 assert.equal(view.active_ai_employee_count,0);
 assert.equal(view.verified_independently_completed_jobs,0);
 assert.equal(view.verified_cash_savings_usd,null);
 assert.equal(view.original_job_admitted,false);
 assert.equal(view.installation_authorized,false);
 assert.equal(view.daily_schedule_authorized,false);
 assert.equal(view.production_changed,false);
 for(const e of view.proposed_employees){
  assert.equal(e.activation_status,'PROPOSED_NOT_DEPLOYED');
  assert.equal(e.active_worker_id,null);
  assert.equal(e.worker_shift_id,null);
  assert.equal(e.realized_savings_usd,null);
  assert.equal(e.independently_completed_jobs,0);
  assert.ok(e.categories.length);
  assert.ok(e.responsibilities.length);
  assert.ok(e.role_summary.length>20);
  assert.equal(e.candidate_jobs.length,e.candidate_count);
 }
});
test('software pilot has source-backed bugs, upgrade candidates and conditional NASA reference',()=>{
 const v=buildRealityNamedEmployeeRoster(brief());
 const engineer=v.proposed_employees.find(x=>x.display_name==='Riley');
 assert.equal(engineer.pilot,true);
 assert.equal(engineer.function_id,'software_engineering');
 assert.equal(engineer.candidate_count,2);
 assert.equal(engineer.candidate_jobs[0].proof,'PROVIDER_OBSERVATION_REQUIRES_INDEPENDENT_VALIDATION');
 assert.ok(engineer.candidate_jobs.every(x=>!x.authorized_execution&&!x.independently_verified_done));
 assert.equal(v.nasa_reference.investigation_median_hours,2);
 assert.equal(v.nasa_reference.implementation_median_hours,3);
 assert.match(v.nasa_reference.usage,/NO_VERIFIED_SAVINGS/);
 const q=v.proposed_employees.find(x=>x.display_name==='Quinn');
 assert.equal(q.candidate_count,1);
 assert.equal(q.candidate_jobs[0].source_category,'security');
 const marketer=v.proposed_employees.find(x=>x.display_name==='Morgan');
 assert.equal(marketer.candidate_count,0);
 assert.notEqual(marketer.evidence_status,'CONNECTED_CAMPAIGN_PROVEN');
});
test('invalid or detached catalog does not invent an employee workforce',()=>{
 assert.throws(()=>buildRealityNamedEmployeeRoster({
  ...brief(),source_scope:'OTHER_COMPANY_UNCONNECTED'}),
 /REALITY_COMPANY_STAFFING_SOURCE_NOT_VERIFIED/);
 assert.throws(()=>buildRealityNamedEmployeeRoster({
  ...brief(),job_started:true}),
 /REALITY_COMPANY_STAFFING_SOURCE_NOT_VERIFIED/);
});
test('read-only roster endpoint uses existing sources and explicit owner authentication',()=>{
 const endpoint=readFileSync(new URL('../api/reality/personal-employee-roster.js',import.meta.url),'utf8');
 const chat=readFileSync(new URL('../reality-chat-simple.html',import.meta.url),'utf8');
 assert.match(endpoint,/authenticatedChatSession\(req,res\)/);
 assert.match(endpoint,/buildRealityWorkCatalog\(\)/);
 assert.match(endpoint,/buildRealityWorkdayOpportunityBrief\(catalog\)/);
 assert.match(endpoint,/buildRealityNamedEmployeeRoster\(brief\)/);
 assert.match(endpoint,/req\.method!=='GET'/);
 assert.match(endpoint,/process\.env\.VERCEL_ENV!=='preview'/);
 assert.match(endpoint,/shiftRpc\(db,'reality_read_next_week_source_snapshot_v1'/);
 assert.doesNotMatch(endpoint,/reality_authorize_employee_shift_v1|reality_claim_employee_shift_step_v1|worker_dispatch\(/);
 assert.doesNotMatch(endpoint,/reality_store_next_week_source_snapshot_v1/);
 assert.match(chat,/Meet Reality's AI team/);
 assert.match(chat,/const ROSTER='\/api\/reality\/personal-employee-roster'/);
 assert.match(chat,/employeeCard\(employee,approved\.roles\.get\(employee\.display_name\)\|\|\[\]\)/);
 assert.match(chat,/Owner-approved Chat job list/);
 assert.match(chat,/roster\.proposed_employee_count!==8/);
 assert.match(chat,/roster\.active_ai_employee_count!==0/);
 assert.match(chat,/No verified cash savings/);
 assert.match(chat,/\.textContent=String\(content\?\?''\)/);
 assert.match(chat,/EMPLOYEE_TEAM_JOB_SOURCE_UNVERIFIED/);
});
