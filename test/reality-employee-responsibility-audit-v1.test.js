import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildEmployeeResponsibilityAudit}
 from '../src/reality-employee-responsibility-audit-v1.js';
const names=['Avery','Riley','Quinn','Taylor','Casey','Morgan','Jordan','Sage'];
const origin='https://github.com/maloney2323/Reality/issues/';
const roster={
 version:'reality-proposed-ai-employee-roster-v1',
 status:'READ_ONLY_PROPOSED_AI_EMPLOYEES',proposed_employee_count:8,
 production_changed:false,installation_authorized:false,
 proposed_employees:names.map(name=>({
  display_name:name,role:name+' responsibility',role_summary:'Handle '+name+' checks',
  activation_status:'PROPOSED_NOT_DEPLOYED',candidate_count:0,candidate_jobs:[]
 }))
};
const task=(n,employee,status)=>({
 issue_number:n,source_url:origin+n,title:'Investigate issue '+n,
 assigned_employee:employee,status,
 next_proof:'Independently confirm the current source and remaining original work.',
 execution_authorized:false,installation_authorized:false,
 executable_original:false
});
const snapshot={
 status:'NEXT_WEEK_SOURCE_SNAPSHOT_PREPARED',
 qualification_status:'CURRENT_SOURCE_INSPECTED_BEFORE_OWNER_DISCOVERY',
 source_scope:'maloney2323/Reality',source_sha256:'a'.repeat(64),
 open_issue_count:3,upstream_inspected_count:3,
 shift_execution_authorized:false,installation_authorized:false,
 production_changed:false,week_start:'2026-11-16',
 employee_source_investigation_assignments:[
  task(185,'Riley','CURRENT_OWNER_OBJECTIVE_NEEDS_EXACT_TASK'),
  task(201,'Taylor','CURRENT_FAILURE_REPRODUCTION_REQUIRED'),
  task(263,'Taylor','PRIOR_ORIGINAL_SETTLED_NO_REPLAY')
 ]
};
test('employee card audit routes only its inspected unsatisfied source work',()=>{
 const a=buildEmployeeResponsibilityAudit({
  roster,snapshot,employee:'Riley',now:new Date('2026-11-13T23:00:00Z')});
 assert.equal(a.status,'EMPLOYEE_RESPONSIBILITIES_SOURCE_AUDITED');
 assert.equal(a.included_employee_roles,1);
 assert.equal(a.role_audits[0].employee_name,'Riley');
 assert.equal(a.role_audits[0].weekly_investigation_assignments,1);
 assert.equal(a.role_audits[0].suggested_checks[0].issue_number,185);
 assert.equal(a.new_original_jobs_created,0);
 assert.equal(a.installation_authorized,false);
 assert.equal(a.shift_started,false);
});
test('whole team source audits deduplicate already-settled originals without replay',()=>{
 const a=buildEmployeeResponsibilityAudit({
  roster,snapshot,employee:'ALL',now:new Date('2026-11-13T23:00:00Z')});
 assert.equal(a.included_employee_roles,8);
 assert.equal(a.weekly_source_inspected,3);
 const t=a.role_audits.find(x=>x.employee_name==='Taylor');
 assert.equal(t.settled_origins_excluded,1);
 assert.equal(t.weekly_investigation_assignments,1);
 assert.ok(t.suggested_checks.every(x=>x.issue_number!==263));
 assert.equal(a.source_coverage_complete_for_business,false);
 assert.equal(a.automatic_business_execution_performed,false);
});
test('unavailable weekly source stays explicitly partial; fake or duplicate source fails closed',()=>{
 const partial=buildEmployeeResponsibilityAudit({roster,employee:'Morgan'});
 assert.equal(partial.status,'EMPLOYEE_RESPONSIBILITIES_PARTIAL_SOURCE_AUDIT');
 assert.equal(partial.role_audits[0].additional_business_connections_needed,true);
 assert.throws(()=>buildEmployeeResponsibilityAudit({
  roster,snapshot:{...snapshot,
   employee_source_investigation_assignments:[
    snapshot.employee_source_investigation_assignments[0],
    snapshot.employee_source_investigation_assignments[0],
    snapshot.employee_source_investigation_assignments[2]
   ]},employee:'ALL'
 }),/WEEKLY_PROVIDER_OR_DEDUP_PROOF_INVALID/);
 assert.throws(()=>buildEmployeeResponsibilityAudit({
  roster,snapshot:{...snapshot,
   employee_source_investigation_assignments:[
    {...snapshot.employee_source_investigation_assignments[0],execution_authorized:true},
    ...snapshot.employee_source_investigation_assignments.slice(1)
   ]},employee:'ALL'
 }),/WEEKLY_PROVIDER_OR_DEDUP_PROOF_INVALID/);
});
test('home buttons really invoke authenticated audit, never authorize an install or shift',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../reality-employee-work-audit-ui-v1.js',import.meta.url),'utf8');
 const api=readFileSync(new URL('../api/reality/personal-employee-work-audit.js',import.meta.url),'utf8');
 assert.match(html,/script defer src="\/reality-employee-work-audit-ui-v1\.js"/);
 assert.match(ui,/Refresh & Audit Work/);
 assert.match(ui,/Audit All Employees/);
 assert.match(ui,/personal-employee-work-audit/);
 assert.match(ui,/AUDIT_EMPLOYEE_WEEK/);
 assert.match(api,/authenticatedChatSession/);
 assert.match(api,/assertSameOrigin/);
 assert.match(api,/buildRealityWorkCatalog/);
 assert.match(api,/discoverGovernedCapabilityAudit/);
 assert.match(api,/saveGovernedCapabilityAudit/);
 assert.match(api,/reality_read_next_week_source_snapshot_v1/);
 assert.match(api,/installation_authorized:false/);
 assert.doesNotMatch(api,/authorize_employee_shift_v1|approve_qualified_capability|install_approved/);
});
