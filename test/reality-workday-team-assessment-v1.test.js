import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assessRealityWorkdayTeam,assessRealityCompanyWorkforce}
 from '../src/reality-workday-team-assessment-v1.js';

const fixture=(kinds=[],coverage='not_connected')=>({
 status:'SOURCE_BACKED_DISCOVERY_OBSERVED',
 source_scope:'REALITY_GITHUB_REPOSITORY_ONLY',
 read_only:true,job_started:false,
 source_coverage:{issues:'checked',pull_requests:'checked',
  actions:'checked',external_research:coverage},
 counts:{source_backed_opportunities:kinds.length},
 items:kinds.map((finding_type,i)=>({
  finding_type,finding_id:'catalog:'+String(i+1).repeat(32),
  title:'Existing source record',evidence_refs:[
   'https://github.com/maloney2323/Reality/issues/'+(101+i)]
 }))
});
test('assess required functions from source-backed work instead of a fixed employee count',()=>{
 const one=assessRealityWorkdayTeam(fixture(['OPEN_ISSUE']));
 const mixed=assessRealityWorkdayTeam(fixture([
  'OPEN_ISSUE','OPEN_PULL_REQUEST','RECURRING_FAILURE']));
 const zero=assessRealityWorkdayTeam(fixture([]));
 assert.equal(one.proposed_role_slots,3);
 assert.equal(mixed.proposed_role_slots,4);
 assert.equal(zero.proposed_role_slots,1);
 assert.deepEqual(mixed.proposed_roles.map(x=>x.role_id),[
  'operations_coordinator','failure_investigator','code_reviewer','independent_verifier']);
 assert.equal(mixed.observed_source_opportunities,3);
 assert.equal(mixed.confirmed_active_ai_workers,null);
 assert.equal(mixed.confirmed_human_employees_required,null);
 assert.equal(mixed.headcount_optimization_not_yet_measured,true);
 assert.equal(mixed.execution_authorized,false);
 assert.equal(mixed.installation_authorized,false);
 assert.equal(mixed.production_changed,false);
});
test('competitive intelligence is conditional until a relevant source is connected',()=>{
 const disconnected=assessRealityWorkdayTeam(fixture(['OPEN_ISSUE']));
 assert.equal(disconnected.conditional_roles[0].role_id,'competitive_researcher');
 assert.equal(disconnected.conditional_roles[0].activation_status,
  'EXTERNAL_RESEARCH_NOT_CONNECTED');
 const connected=assessRealityWorkdayTeam(fixture(['OPEN_ISSUE'],'checked'));
 assert.equal(connected.conditional_roles[0].activation_status,
  'RESEARCH_SOURCE_AVAILABLE_NEEDS_ORIGINAL_JOB_BINDING');
 assert.equal(connected.proposed_role_slots,3);
 assert.equal(connected.conditional_roles[1].activation_status,
  'CONDITIONAL_VERIFIED_GAP_REQUIRED');
 assert.ok(connected.proposed_roles.every(x=>x.active_worker_id===null));
});
test('unverified work catalog cannot produce staffing claims',()=>{
 assert.throws(()=>assessRealityWorkdayTeam(fixture().items),
  /SHIFT_TEAM_EVIDENCE_SCOPE_UNVERIFIED/);
 assert.throws(()=>assessRealityWorkdayTeam({...fixture(),job_started:true}),
  /SHIFT_TEAM_EVIDENCE_SCOPE_UNVERIFIED/);
 assert.throws(()=>assessRealityWorkdayTeam({...fixture(),source_scope:'CUSTOMER_PRIVATE_FINANCES'}),
  /SHIFT_TEAM_EVIDENCE_SCOPE_UNVERIFIED/);
});
test('staffing is an observation in the existing owner-authenticated Chat path',()=>{
 const context=readFileSync(new URL('../src/reality-employee-shift-chat-context-v1.js',import.meta.url),'utf8');
 const api=readFileSync(new URL('../api/reality/personal-governed-employee-shift.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../reality-chat-simple.html',import.meta.url),'utf8');
 assert.match(context,/teamRequested\(message\)/);
 assert.match(context,/assessRealityWorkdayTeam\(workday\)/);
 assert.match(context,/active_ai_workers:null/);
 assert.match(context,/human_employees_needed_verified:null/);
 assert.match(api,/proposed_team:assessRealityWorkdayTeam\(brief\)/);
 assert.match(html,/Proposed work functions/);
 assert.match(html,/not active employees/);
 assert.doesNotMatch(context,/installation_authorized:true/);
});

test('company workforce covers product, launch, marketing, sales and operations, not arbitrary employee headcount',()=>{
 const company=assessRealityCompanyWorkforce(fixture([
  'OPEN_ISSUE','OPEN_PULL_REQUEST','RECURRING_FAILURE'
 ]));
 assert.equal(company.objective,'BUILD_LAUNCH_MARKET_AND_OPERATE_REALITY');
 assert.equal(company.status,'FUNCTIONAL_LAUNCH_WORKFORCE_PROPOSAL_NOT_A_VERIFIED_STAFFING_ESTIMATE');
 assert.equal(company.functional_areas_count,8);
 assert.deepEqual(company.required_business_functions.map(x=>x.function_id),[
  'product_strategy','software_engineering','quality_security_reliability',
  'infrastructure_operations','experience_onboarding','marketing_competitive',
  'sales_customer_success','financial_legal_admin'
 ]);
 assert.equal(company.evidence_supported_repository_observations,3);
 assert.equal(company.exact_human_employee_count_required,null);
 assert.equal(company.exact_ai_employee_count_required,null);
 assert.equal(company.measured_human_staffing_fte,null);
 assert.equal(company.verified_automated_roles,0);
 assert.equal(company.work_started,false);
 assert.equal(company.actual_company_launch_verified,false);
 assert.equal(company.installation_authorized,false);
 assert.equal(company.production_changed,false);
 assert.match(company.staffing_method,/remaining human FTE = verified residual weekly human hours/);
 assert.ok(company.required_business_functions.every(x=>
  x.candidate_ai_automation.length>0&&x.human_accountability.length>15&&
  x.automation_verified===false&&x.active_ai_employee_count===null));
});
test('GitHub source evidence does not invent customer sales or automated competitive marketing',()=>{
 const company=assessRealityCompanyWorkforce(fixture(['OPEN_ISSUE'],'not_connected'));
 const marketing=company.required_business_functions.find(x=>x.function_id==='marketing_competitive');
 const sales=company.required_business_functions.find(x=>x.function_id==='sales_customer_success');
 assert.equal(marketing.evidence_status,'EXTERNAL_RESEARCH_NOT_CONNECTED_TO_WORK_CATALOG');
 assert.equal(sales.evidence_status,'CUSTOMER_PIPELINE_AND_SUPPORT_RECORDS_NOT_CONNECTED');
 assert.equal(company.source_coverage.actual_business_sales,'NOT_MEASURED');
 assert.equal(company.comparable_human_costs_unmeasured,true);
 assert.equal(company.available_market_evidence_does_not_prove_launch_readiness,true);
 assert.throws(()=>assessRealityCompanyWorkforce({...fixture(),read_only:false}),
  /REALITY_COMPANY_STAFFING_SOURCE_NOT_VERIFIED/);
});
test('company workforce questions use a dedicated non-shift read-only Chat path',()=>{
 const api=readFileSync(new URL('../api/reality/personal-chat.js',import.meta.url),'utf8');
 const context=readFileSync(new URL('../src/reality-employee-shift-chat-context-v1.js',import.meta.url),'utf8');
 assert.match(api,/readVerifiedRealityCompanyWorkforceForChat\(\{session,message:text,db:isolated\}\)/);
 assert.match(api,/\.\.\.workerWakeObservations,\.\.\.companyWorkforceObservations/);
 assert.match(context,/export async function readVerifiedRealityCompanyWorkforceForChat/);
 assert.match(context,/const company=assessRealityCompanyWorkforce\(workday\)/);
 const functionBody=context.split('export async function readVerifiedRealityCompanyWorkforceForChat')[1];
 assert.doesNotMatch(functionBody,/reality_read_owner_employee_shifts_v1|shiftRpc\(/);
 assert.match(functionBody,/actual_company_launch_verified:false/);
 assert.match(functionBody,/work_started:false/);
 assert.match(functionBody,/exact_human_employee_count_required:null/);
 assert.match(context,/if\(teamRequested\(message\)\)/);
 assert.doesNotMatch(api,/companyWorkforceObservations[^\n]*execution_authorized:true/);
});
