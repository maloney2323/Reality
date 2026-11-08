import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reconcileRileyCategoryAssignments} from '../src/reality-riley-category-backlog-bridge-v1.js';

const source=(kind,n)=>'https://github.com/maloney2323/Reality/'+kind+'/'+n;
const finding=(n,url,category,title)=>({
 finding_id:'catalog:'+String(n).repeat(32),source_url:url,
 source_category:category,title,
 authorized_execution:false,independently_verified_done:false
});
const originals=[
 finding('a',source('issues',263),'bugs','Review issue #263: worker original-job handoff'),
 finding('b',source('pull',265),'upgrades','Review draft PR #265: governed worker bridge'),
 finding('c',source('pull',264),'reliability','Review draft PR #264: restart repair'),
 finding('d',source('actions/runs',42381708040),'features','Verify source signal')
];
const original='work:'+'e'.repeat(32);
const issue={
 issue_number:263,source_url:source('issues',263),
 status:'EXISTING_CAPABILITY_JOB_REQUIRES_LIVE_AUTHORITY_GATE',
 original_work_id:original,
 installation_authorized:false,original_job_completed_by_read:false
};
const backlog={
 version:'reality-riley-existing-backlog-v1',rows:[issue],
 execution_authorized_by_read:false,installation_authorized:false,
 production_changed:false,source_coverage_complete:true
};
const roster={
 status:'READ_ONLY_PROPOSED_AI_EMPLOYEES',
 proposed_employees:[{
  employee_id:'reality-proposed:software_engineering',
  display_name:'Riley',pilot:true,
  candidate_count:originals.length,candidate_jobs:originals,
  independently_completed_jobs:0
 },...Array.from({length:7},(_,i)=>({employee_id:'other'+i}))],
};
const run=(r=roster,b=backlog)=>
 reconcileRileyCategoryAssignments({roster:r,issueBacklog:b});
test('Riley Employee assignments retain basic Work Center issue and PR source work',()=>{
 const x=run();
 assert.equal(x.status,'EXISTING_RILEY_CATEGORY_FINDINGS_RECONCILED_NOT_EXECUTED');
 assert.equal(x.category_findings,4);
 assert.equal(x.open_implementation_review_items,2);
 assert.equal(x.open_issue_work_items,1);
 assert.equal(x.provider_failure_signals,1);
 assert.equal(x.remaining_or_reconciliation_findings,4);
 const by=new Map(x.assignments.map(z=>[z.source_url,z]));
 assert.equal(by.get(source('issues',263)).existing_original_work_id,original);
 assert.equal(by.get(source('issues',263)).execution_route,
  'EXACT_EXISTING_ORIGINAL_MUST_PASS_CURRENT_OWNER_SHIFT_GATE');
 assert.equal(by.get(source('pull',265)).status,'OPEN_IMPLEMENTATION_NEEDS_INDEPENDENT_REVIEW');
 assert.equal(by.get(source('pull',264)).independently_accepted_outcome,false);
 assert.equal(x.execution_authorized,false);
 assert.equal(x.completed_original_jobs_created_by_bridge,0);
 assert.equal(x.worker_shift_dispatched,false);
});
test('already settled originals are reconciled as historical, not new jobs',()=>{
 const x=run(roster,{...backlog,rows:[{...issue,
  original_work_id:null,status:'PREVIOUS_ORIGINAL_JOBS_INDEPENDENTLY_SETTLED'}]});
 assert.equal(x.independently_settled_issue_sources,1);
 assert.equal(x.remaining_or_reconciliation_findings,3);
 assert.equal(x.assignments[0].original_execution_authorized,false);
});
test('category readback missing owner coverage is NOT falsely called no work',()=>{
 const x=run(roster,{...backlog,rows:[],source_coverage_complete:false});
 assert.equal(x.category_findings,4);
 assert.equal(x.assignments[0].status,'OWNER_ISSUE_READBACK_NOT_IN_COVERAGE');
 assert.equal(x.source_coverage_complete,false);
});
test('forged employee execution and duplicate source admissions fail closed',()=>{
 const change=(patch)=>({...roster,proposed_employees:[
  {...roster.proposed_employees[0],...patch},...roster.proposed_employees.slice(1)]});
 assert.throws(()=>run(change({candidate_jobs:[
  {...originals[0],authorized_execution:true},...originals.slice(1)]})),/UNTRUSTED_OR_DUPLICATE/);
 assert.throws(()=>run(change({candidate_jobs:[
  originals[0],originals[0],...originals.slice(2)]})),/UNTRUSTED_OR_DUPLICATE/);
 assert.throws(()=>run(roster,{...backlog,production_changed:true}),/CATALOG_AND_OWNER_BACKLOG/);
 assert.throws(()=>run(change({pilot:false})),/EXACT_RILEY/);
});
test('owner-authenticated readback and UI show both categories, without admitting a job',()=>{
 const api=readFileSync(new URL('../api/reality/personal-riley-existing-backlog.js',
  import.meta.url),'utf8');
 const ui=readFileSync(new URL('../reality-chat-simple.html',import.meta.url),'utf8');
 assert.match(api,/authenticatedChatSession\(req,res\)/);
 assert.match(api,/reconcileRileyCategoryAssignments/);
 assert.match(api,/buildRealityWorkCatalog/);
 assert.match(api,/assigned_category_backlog_status/);
 assert.match(api,/worker_execution_authorized_by_read:false/);
 assert.match(ui,/Riley’s existing Employee \+ Work Center assignments/);
 assert.match(ui,/current original-job intake requires a narrow, independently proven missing-extension defect/);
 assert.match(ui,/Tracked issues are work candidates, not permission to repair/);
 assert.doesNotMatch(api,/reality_authorize_employee_shift_v1|queueVerifiedOriginalRepair|installCapability\(/);
});
