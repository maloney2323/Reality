import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assessRealityWorkdayTeam}
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
