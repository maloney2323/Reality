import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildRileyTaylorCombinedWorkOrders}
 from '../src/reality-riley-taylor-combined-work-orders-v1.js';
const fp='sha256:'+'a'.repeat(64);
const issue=n=>'https://github.com/maloney2323/Reality/issues/'+n;
const pr=n=>'https://github.com/maloney2323/Reality/pull/'+n;
const run=n=>'https://github.com/maloney2323/Reality/actions/runs/'+n;
const slot=(sequence,stage,candidate=null)=>({
 sequence,stage,candidate,
 status:candidate?'SOURCE_OBSERVED_REQUIRES_VALIDATION':'READ_ONLY_PLANNED'
});
const c=(n,url,finding_type)=>({
 finding_id:'catalog:'+n.repeat(32),title:'Existing Reality work '+n,
 source_url:url,finding_type,verified_current_defect:false,authorized_execution:false
});
function draft(){
 return {
  version:'reality-eight-hour-employee-shift-draft-v1',
  status:'DRAFT_ONLY_NOT_SCHEDULED_OR_AUTHORIZED',
  shift_duration_hours:8,read_only:true,job_started:false,
  installation_authorized:false,production_changed:false,
  slots:[
   slot(1,'SOURCE_RECONCILIATION'),
   slot(2,'VERIFY_OPEN_ISSUE',c('b',issue(263),'OPEN_ISSUE')),
   slot(3,'VERIFY_PROVIDER_EVIDENCE',c('c',run(42381708040),'RECURRING_FAILURE')),
   slot(4,'REVIEW_INDEPENDENT_EVIDENCE',c('d',pr(265),'OPEN_PULL_REQUEST')),
   slot(5,'QUALIFY_NEXT_WORK',c('e',issue(260),'OPEN_ISSUE')),
   slot(6,'CONDITIONAL_EXECUTION_WINDOW'),
   slot(7,'CONDITIONAL_VERIFICATION_WINDOW'),
   slot(8,'EVIDENCE_AND_VALUE_REPORT')
  ]
 };
}
test('one owner shift combines Riley engineering and Taylor operational work for actual assigned sources',()=>{
 const result=buildRileyTaylorCombinedWorkOrders({plan:draft(),fingerprint:fp});
 assert.equal(result.status,'COMBINED_BACKLOG_TASKS_READY_FOR_OWNER_SHIFT');
 assert.equal(result.task_count,4);
 assert.deepEqual(result.paired_roles,['Riley','Taylor']);
 assert.equal(result.operating_model,'ONE_OPENAI_MODEL_SWITCHES_EMPLOYEE_ROLE_CONTEXT');
 assert.equal(result.tasks[0].source_ref,issue(263));
 assert.equal(result.tasks[1].source_ref,run(42381708040));
 assert.equal(result.tasks[2].source_ref,pr(265));
 assert.equal(result.tasks[2].work_type,'PR_CODE_REVIEW');
 assert.match(result.tasks[2].riley,/changed files/);
 assert.match(result.tasks[2].taylor,/CI and deployment/);
 assert.equal(result.tasks.every(x=>x.accepted_original_repair===false),true);
 assert.equal(result.no_extra_per_task_owner_start_approval,true);
 assert.equal(result.execution_started,false);
 assert.equal(result.original_jobs_completed,0);
 assert.equal(result.independent_final_job_receipts,0);
 assert.equal(result.verified_cash_savings_usd,null);
 assert.equal(result.completion_policy,'STOP_ON_INDEPENDENTLY_VERIFIED_ADMITTED_JOB_RECEIPTS_NOT_ELAPSED_HOURS');
});
test('absence of exact assigned work does not create a timer-only active job',()=>{
 const empty=draft();empty.slots=empty.slots.map(x=>({...x,candidate:null,status:'READ_ONLY_PLANNED'}));
 const result=buildRileyTaylorCombinedWorkOrders({plan:empty,fingerprint:fp});
 assert.equal(result.task_count,0);
 assert.equal(result.status,'NO_SOURCE_BACKED_COMBINED_TASKS_IN_CURRENT_SHIFT_PLAN');
 assert.equal(result.execution_started,false);
});
test('model, untrusted URL and settled or duplicate source never mint execution from category observation',()=>{
 const base=draft();
 const changed=(step,patch)=>({...base,slots:base.slots.map((s,i)=>
  i===step-1?{...s,candidate:{...s.candidate,...patch}}:s)});
 assert.throws(()=>buildRileyTaylorCombinedWorkOrders({
  plan:changed(2,{authorized_execution:true}),fingerprint:fp
 }),/SOURCE_IDENTITY_OR_DEDUP/);
 assert.throws(()=>buildRileyTaylorCombinedWorkOrders({
  plan:changed(4,{source_url:'https://malicious.example/pull/265'}),fingerprint:fp
 }),/SOURCE_IDENTITY_OR_DEDUP/);
 assert.throws(()=>buildRileyTaylorCombinedWorkOrders({
  plan:changed(5,{source_url:issue(263)}),fingerprint:fp
 }),/SOURCE_IDENTITY_OR_DEDUP/);
 assert.throws(()=>buildRileyTaylorCombinedWorkOrders({
  plan:{...base,installation_authorized:true},fingerprint:fp
 }),/SOURCE_FINGERPRINTED_OWNER_DRAFT/);
});
test('owner-authenticated start and work queue share a source fingerprint and one start click',()=>{
 const api=readFileSync(new URL('../api/reality/personal-governed-employee-shift.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../reality-chat-simple.html',import.meta.url),'utf8');
 assert.match(api,/authenticatedChatSession\(req,res\)/);
 assert.match(api,/buildRileyTaylorCombinedWorkOrders\(\{plan,fingerprint\}\)/);
 assert.match(api,/combined_employee_work_orders:combined/);
 assert.match(api,/NO_COMBINED_RILEY_TAYLOR_SOURCE_WORK_IN_APPROVED_PLAN/);
 assert.match(api,/reality_authorize_employee_shift_v1/);
 assert.match(ui,/id="rileyTaylorCombinedQueue"/);
 assert.match(ui,/id="runFullShift"/);
 assert.match(ui,/Start Riley \+ Taylor Jobs/);
 assert.match(ui,/refreshRileyTaylorCombinedWorkQueue\(\)/);
 assert.match(ui,/renderActiveRileyTaylorQueue\(data\)/);
 assert.match(ui,/RILEY_TAYLOR_COMBINED_TASK_PLAN_NOT_READY_NO_IDLE_SHIFT/);
 assert.match(ui,/intakeVerifiedRileyShiftJobs\(created.shift_id/);
 assert.doesNotMatch(ui,/3h selected\. Tap/);
 const scripts=[...ui.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)];
 assert.ok(scripts.length);
 for(const match of scripts){
  const code=match[1].replace(/^\s*import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]+['"];\s*/,'');
  assert.doesNotThrow(()=>new Function(code));
 }
});
