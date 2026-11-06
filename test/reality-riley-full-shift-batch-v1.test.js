import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectRileyFullShiftOriginals}
 from '../src/reality-riley-full-shift-batch-intake-v1.js';
const OWNER='11111111-2222-4333-8444-555555555555';
const SHIFT='22222222-3333-4444-8555-666666666666';
const HASH='sha256:'+'f'.repeat(64);
const SHA='a'.repeat(40);
const NOW=new Date('2026-11-06T17:00:00Z');
const issue=n=>'https://github.com/maloney2323/Reality/issues/'+n;
const jobs=[263,185,143,62];
const shift=()=>({
 status:'OWNER_SCOPED_EMPLOYEE_SHIFT_READBACK',
 work_installation_authorized_by_read:false,production_changed:false,
 verified_human_hours_saved:null,
 shifts:[{shift_id:SHIFT,plan_fingerprint:HASH,status:'QUEUED',
  planned_start_at:'2026-11-06T16:59:50Z',
  planned_end_at:'2026-11-07T00:59:50Z',
  steps:Array.from({length:8},(_,i)=>({
   step_index:i+1,source_ref:jobs[i-1]?issue(jobs[i-1]):null,
   state:'QUEUED',proof_sha256:null
  }))}]
});
const loop=()=>({
 status:'OWNER_GOVERNED_LOOP_READBACK',
 owner_installation_authorized_by_read:false,
 external_action_performed:false,production_changed:false,
 jobs:[]
});
const opportunity=n=>({
 issue_number:n,issue_url:issue(n),independently_verified:true,
 original_provider_failed_run_id:400000+n,source_sha:SHA,
 source_path:'src/reality-extensions/reality-gap-'+n+'.mjs',
 owner_installation_authorized:false,production_changed:false
});
const priors=(numbers=jobs)=>numbers.map(issue_number=>({
 issue_number,record:{status:'NO_PRIOR_ORIGINAL',
  installation_authorized:false,job_completed:false,
  production_changed:false}
}));
const base=()=>({ownerId:OWNER,shiftId:SHIFT,expectedFingerprint:HASH,
 shiftReadback:shift(),ownerLoopReadback:loop(),
 opportunities:jobs.map(opportunity),priorOriginals:priors(),now:NOW});
test('ONE exact owner-authorized shift selects several distinct original repairs automatically',()=>{
 const x=selectRileyFullShiftOriginals(base());
 assert.equal(x.status,'OWNER_APPROVED_SHIFT_SOURCE_JOBS_INDEPENDENTLY_SELECTED');
 assert.deepEqual(x.selected.map(j=>j.issue_number),jobs);
 assert.equal(x.selected_count,4);
 assert.equal(x.one_owner_shift_authorization,true);
 assert.equal(x.no_per_job_button_required,true);
 assert.equal(x.final_receipt_verified,false);
 assert.equal(x.worker_execution_proven,false);
 assert.equal(x.installation_authorized,false);
 assert.equal(x.production_changed,false);
});
test('prior, independently settled and unplanned sources are excluded without replay',()=>{
 const b=base();
 b.ownerLoopReadback.jobs=[{
  source_issue_number:185,independently_settled:true,
  original_work_id:'work:'+'a'.repeat(32),phase:'SETTLED_ISOLATED'}];
 b.priorOriginals=priors().map(x=>x.issue_number===143?{
  issue_number:143,record:{status:'EXISTING_UNFINISHED_ORIGINAL',
  installation_authorized:false,job_completed:false,production_changed:false}
 }:x);
 b.opportunities=[...b.opportunities,opportunity(201)];
 const x=selectRileyFullShiftOriginals(b);
 assert.deepEqual(x.selected.map(j=>j.issue_number),[263,62]);
 assert.equal(x.skipped.length,2);
 assert.equal(x.selected.some(j=>j.issue_number===201),false);
});
test('ambiguous duplicates, forged source and changed shift approval fail closed',()=>{
 const b=base();
 for(const change of [
  {opportunities:[b.opportunities[0],b.opportunities[0]]},
  {opportunities:[{...b.opportunities[0],independently_verified:false}]},
  {opportunities:[{...b.opportunities[0],issue_url:issue(999)}]},
  {opportunities:[{...b.opportunities[0],source_sha:'tampered'}]},
  {shiftReadback:{...b.shiftReadback,production_changed:true}},
  {ownerLoopReadback:{...b.ownerLoopReadback,production_changed:true}},
  {expectedFingerprint:'sha256:'+'a'.repeat(64)},
  {now:new Date('2026-11-07T01:00:00Z')}
 ]){
  assert.throws(()=>selectRileyFullShiftOriginals({...b,...change}),
   /RILEY_FULL_SHIFT_/);
 }
});
test('no new qualified tasks does not fabricate work or final receipts',()=>{
 const b=base(),x=selectRileyFullShiftOriginals({
  ...b,opportunities:[],priorOriginals:[]});
 assert.equal(x.status,'NO_NEW_INDEPENDENTLY_VERIFIED_REPAIRS_IN_THIS_SHIFT');
 assert.deepEqual(x.selected,[]);
 assert.equal(x.selected_count,0);
 assert.equal(x.original_job_completed,false);
 assert.equal(x.final_receipt_verified,false);
});
test('API requires same owner session, current shift, real provider and durable originals',()=>{
 const api=readFileSync(new URL(
  '../api/reality/personal-riley-full-shift-batch.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../reality-chat-simple.html',import.meta.url),'utf8');
 assert.match(api,/authenticatedChatSession\(req,res\)/);
 assert.match(api,/assertSameOrigin\(req\)/);
 assert.match(api,/verifyRealMissingRepairIssue/);
 assert.match(api,/authorizeExistingRealRepairWork/);
 assert.match(api,/queueVerifiedOriginalRepair/);
 assert.match(api,/reality_read_owner_existing_original_issue_v1/);
 assert.match(api,/selectRileyFullShiftOriginals/);
 assert.match(ui,/intakeVerifiedRileyShiftJobs/);
 assert.match(ui,/ADMIT_QUALIFIED_WORK_IN_EXACT_AUTHORIZED_RILEY_SHIFT/);
 assert.doesNotMatch(api,/owner_approve_qualified_preview|merge_pull_request|installRiley/);
});
