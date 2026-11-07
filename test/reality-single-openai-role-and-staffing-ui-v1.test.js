import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectSingleModelRoleQueue}
 from '../src/reality-single-model-role-work-router-v1.js';
const roles=['product_strategy','software_engineering','quality_security_reliability',
 'infrastructure_operations','experience_onboarding','marketing_competitive',
 'sales_customer_success','financial_legal_admin'];
const item={finding_id:'catalog:'+'a'.repeat(32),
 title:'Current real issue #263',source_url:'https://github.com/maloney2323/Reality/issues/263',
 category:'bugs',status:'SOURCE_OBSERVATION_REQUIRES_INDEPENDENT_QUALIFICATION',
 owner_execution_authorized:false,proposed_review_timebox_hours:1,
 accepted_task_duration_hours:null,human_effort_hours_verified:null,
 ai_execution_hours_verified:null};
function plan(){
 return {version:'reality-next-week-employee-plan-v1',
 status:'NEXT_WEEK_DRAFT_PREPARED_AWAITING_OWNER_SHIFT_AUTHORIZATION',
 calendar_time_zone:'America/New_York',employee_role_count:8,
 owner_shift_authorization_recorded:false,installation_authorized:false,
 external_business_actions_authorized:false,
 candidate_source_review_assignments_not_jobs:true,
 proposed_work_findings:1,production_changed:false,
 employee_roles:roles.map((function_id,index)=>({
  function_id,employee_id:'reality-proposed:'+function_id,
  employee_name:'Role '+index,active_worker_verified:false,approved_execution_hours:0,
  week_days:Array.from({length:5},(_,day)=>({
   date:'2026-11-'+(9+day),
   assignments:day===0&&index===1?[item]:[],
   shifts_authorized:false,proposed_execution_shift_hours:null,
   timebox_is_verified_task_duration:false
  }))
 }))};
}
test('eight function labels route one proposed source assignment over ONE OpenAI lane',()=>{
 const r=projectSingleModelRoleQueue(plan());
 assert.equal(r.business_role_labels,undefined);
 assert.equal(r.role_label_count,8);
 assert.equal(r.configured_model_provider_lanes,1);
 assert.equal(r.concurrent_proposed_model_jobs_limit,1);
 assert.equal(r.underlying_intelligence_provider,'OpenAI');
 assert.equal(r.independent_agents_created,0);
 assert.equal(r.planned_review_assignments,1);
 assert.equal(r.workload_items[0].display_owner_role,'Role 1');
 assert.equal(r.workload_items[0].original_work_id,null);
 assert.equal(r.execution_ready_count,0);
 assert.equal(r.verified_cash_savings_usd,null);
 assert.equal(r.jobs_executed_by_projection,false);
});
test('duplicate source observations and forged executed shifts are not routable',()=>{
 const p=plan();
 p.proposed_work_findings=2;
 p.employee_roles[1].week_days[1].assignments=[item];
 assert.throws(()=>projectSingleModelRoleQueue(p),/REALITY_SINGLE_MODEL_ROUTING_/);
 p.employee_roles[1].week_days[1].assignments=[];
 p.proposed_work_findings=1;
 p.employee_roles[1].week_days[0].assignments[0]={...item,owner_execution_authorized:true};
 assert.throws(()=>projectSingleModelRoleQueue(p),/REALITY_SINGLE_MODEL_ROUTING_/);
});
test('private workforce API is authenticated, never executes layoffs or persists pay',()=>{
 const api=readFileSync(new URL('../api/reality/personal-workforce-savings-scenario.js',
  import.meta.url),'utf8');
 assert.match(api,/authenticatedChatSession\(req,res\)/);
 assert.match(api,/assertSameOrigin\(req\)/);
 assert.match(api,/process\.env\.VERCEL_ENV!=='preview'/);
 assert.match(api,/buildRealityNamedEmployeeRoster\(brief\)/);
 assert.match(api,/projectRoleWorkforceConsolidation\(/);
 assert.match(api,/inputs_saved:false/);
 assert.match(api,/positions_terminated:false/);
 assert.doesNotMatch(api,/executeAuthorizedWork|worker_dispatch|installCapability|githubWrite|insert into/i);
});
test('company scenario UI displays possible consolidated whole positions only as assumptions',()=>{
 const ui=readFileSync(new URL('../reality-chat-simple.html',
  import.meta.url),'utf8');
 assert.match(ui,/Workforce savings · roles Reality could potentially consolidate/);
 assert.match(ui,/workforceRole/);
 assert.match(ui,/workforceCriticalDuties/);
 assert.match(ui,/workforceSharedCapacity/);
 assert.match(ui,/WORKFORCE_SAVINGS='\/api\/reality\/personal-workforce-savings-scenario'/);
 assert.match(ui,/renderWorkforceSavingsProjection\(data\)/);
 assert.match(ui,/data\.realized_payroll_savings_usd!==null/);
 assert.match(ui,/data\.positions_terminated!==false/);
 assert.match(ui,/One shared OpenAI model covers business functions/);
 assert.doesNotMatch(ui,/8 employees replaced|guaranteed payroll savings/i);
});
