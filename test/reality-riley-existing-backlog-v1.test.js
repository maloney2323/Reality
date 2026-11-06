import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectRileyExistingBacklog} from '../src/reality-riley-existing-backlog-v1.js';
const work=id=>'work:'+id.repeat(32);
const issue=(number,title)=>({
 number,title,state:'open',
 html_url:'https://github.com/maloney2323/Reality/issues/'+number
});
const issues=[
 issue(263,'Riley live-work blocker: connect authorized shift and executor'),
 issue(185,'Reality full self-repair loop — real work and receipts'),
 issue(178,'Reality first self-upgrade customer job'),
 issue(201,'Production readiness continuity settlement reconciliation'),
 issue(143,'Reality recurring failure maintenance'),
 issue(188,'Reality genuine capability gap')
];
const noPrior={status:'NO_PRIOR_ORIGINAL',installation_authorized:false,
 job_completed:false,production_changed:false};
const legacy={status:'EXISTING_UNFINISHED_ORIGINAL',queue_id:
 '11111111-2222-4333-8444-555555555555',
 original_work_id:work('a'),phase:'QUEUED_DISCOVERY',
 installation_authorized:false,job_completed:false,production_changed:false};
const priorOriginals=()=>issues.map(i=>({
 issue_number:i.number,record:i.number===178?legacy:noPrior
}));
const loop=jobs=>({status:'OWNER_GOVERNED_LOOP_READBACK',
 jobs,owner_installation_authorized_by_read:false,
 external_action_performed:false,production_changed:false});
const job=(issue,phase,extra={})=>({
 source_issue_number:issue,
 original_work_id:work('f'),phase,trigger_id:'11111111-2222-4333-8444-555555555555',
 independently_settled:false,owner_install_approved:false,
 environment:'ISOLATED_PREVIEW',...extra
});
const run=(jobs=[],overrides={})=>projectRileyExistingBacklog({
 issues,ownerLoop:loop(jobs),priorOriginals:priorOriginals(),
 activeShiftCount:0,coverageComplete:true,...overrides
});
test('already discovered work remains visible when no employee shift exists',()=>{
 const x=run();
 assert.equal(x.status,'OWNER_RECONCILED_EXISTING_OPEN_BACKLOG');
 assert.equal(x.active_employee_shifts,0);
 assert.equal(x.total_open_provider_issues_reviewed,6);
 assert.equal(x.no_work_claimed,false);
 const by=new Map(x.rows.map(r=>[r.issue_number,r]));
 assert.equal(by.get(263).status,'OPEN_SOURCE_WORK_AWAITING_ORIGINAL_JOB_QUALIFICATION');
 assert.equal(by.get(185).status,'OPEN_SOURCE_WORK_AWAITING_ORIGINAL_JOB_QUALIFICATION');
 assert.equal(by.get(178).status,'LEGACY_DISCOVERY_QUEUE_REQUIRES_RECONCILIATION');
 assert.equal(by.get(178).original_work_id,work('a'));
 assert.equal(x.rows[0].issue_number,263);
 assert.equal(x.starts_original_job,false);
 assert.equal(x.execution_authorized_by_read,false);
 assert.equal(x.production_changed,false);
 assert.equal(x.human_hours_saved_verified,null);
});
test('independent settled receipts override stale open GitHub issue and queued discovery',()=>{
 const x=run([job(178,'SETTLED_ISOLATED',{
  independently_settled:true,original_work_id:work('b')})]);
 const row=x.rows.find(r=>r.issue_number===178);
 assert.equal(row.status,'PREVIOUS_ORIGINAL_JOBS_INDEPENDENTLY_SETTLED');
 assert.equal(row.original_work_id,null);
 assert.equal(row.independently_settled_originals_observed,1);
 assert.match(row.next_action,/Do not replay/);
 assert.equal(row.exact_worker_wake_authorized_by_read,false);
});
test('isolated probation is NOT a new executable capability job',()=>{
 const x=run([job(201,'ISOLATED_INSTALLED_PROBATION',{
  original_work_id:work('c'),owner_install_approved:true})]);
 const row=x.rows.find(r=>r.issue_number===201);
 assert.equal(row.status,'HISTORICAL_INSTALL_OR_PROBATION_NEEDS_RECONCILIATION');
 assert.equal(row.original_work_id,null);
});
test('exact qualified existing capability is reviewable without a new job',()=>{
 const x=run([job(263,'PENDING_FROZEN_REPRODUCTION')]);
 const row=x.rows.find(r=>r.issue_number===263);
 assert.equal(row.status,'EXISTING_CAPABILITY_JOB_REQUIRES_LIVE_AUTHORITY_GATE');
 assert.equal(row.original_work_id,work('f'));
 assert.equal(x.existing_owner_originals_requiring_live_gate,1);
 assert.equal(x.execution_authorized_by_read,false);
});
test('provider coverage and owner evidence failures are never disguised as no work',()=>{
 const partial=run([],{coverageComplete:false});
 assert.equal(partial.source_coverage_complete,false);
 assert.equal(partial.status,'PARTIAL_OWNER_RECONCILED_EXISTING_OPEN_BACKLOG');
 assert.throws(()=>run([],{ownerLoop:{...loop([]),production_changed:true}}),
  /RILEY_BACKLOG_OWNER_PROVIDER_READBACK_REQUIRED/);
 assert.throws(()=>run([],{priorOriginals:[]}),
  /RILEY_BACKLOG_MISSING_OWNER_PRIOR_QUEUE_READBACK/);
 assert.throws(()=>run([],{priorOriginals:[...priorOriginals(),priorOriginals()[0]]}),
  /RILEY_BACKLOG_PRIOR_ORIGINAL_LEDGER_UNVERIFIED/);
});
test('owner-authenticated Reality API and Chat show existing tasks but never self-approve',()=>{
 const api=readFileSync(new URL(
  '../api/reality/personal-riley-existing-backlog.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../reality-chat-simple.html',import.meta.url),'utf8');
 const scope=readFileSync(new URL(
  '../src/reality-governed-shift-boundary-v1.js',import.meta.url),'utf8');
 assert.match(api,/authenticatedChatSession\(req,res\)/);
 assert.match(api,/VERCEL_ENV!=='preview'/);
 assert.match(api,/req\.method!=='GET'/);
 assert.match(api,/fetchCatalogGitHub\('issues'\)/);
 assert.match(api,/reality_read_owner_existing_original_issue_v1/);
 assert.match(api,/reality_read_owner_genuine_loop_v1/);
 assert.match(api,/worker_execution_authorized_by_read:false/);
 assert.match(scope,/read_owner_existing_original_issue_v1/);
 assert.doesNotMatch(api,/enqueue_governed_build|authorize_employee_shift_v1|install/);
 assert.match(ui,/const RILEY_BACKLOG='\/api\/reality\/personal-riley-existing-backlog'/);
 assert.match(ui,/refreshRileyExistingBacklog/);
 assert.match(ui,/LEGACY_DISCOVERY_QUEUE_REQUIRES_RECONCILIATION/);
 assert.match(ui,/Tracked issues are work candidates, not permission to repair/);
});
