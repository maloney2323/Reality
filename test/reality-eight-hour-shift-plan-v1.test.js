import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {buildRealityWorkdayOpportunityBrief} from '../src/reality-workday-opportunity-brief-v1.js';
import {buildRealityEightHourShiftDraft} from '../src/reality-eight-hour-shift-plan-v1.js';
import shiftHandler from '../api/reality/eight-hour-employee-shift-plan.js';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const client=readFileSync(new URL('../reality-eight-hour-shift-plan-v1.js',import.meta.url),'utf8');
const url='https://github.com/maloney2323/Reality/';
const item=(letter,type,source,state,link,score)=>({
 finding_id:'catalog:'+letter.repeat(32),finding_type:type,source,state,
 title:'Current source-backed observation '+letter,category:'reliability',
 evidence_refs:[url+link],value_assessment:{triage_score:score},
 execution_work_item:null,authorization_required:false
});
const issue=item('a','OPEN_ISSUE','github_issues','TRACKED_NEEDS_REVIEW','issues/201',90);
const issue2=item('b','OPEN_ISSUE','github_issues','TRACKED_NEEDS_REVIEW','issues/188',79);
const pr=item('c','OPEN_PULL_REQUEST','github_pull_requests','OPEN_AWAITING_REVIEW','pull/229',75);
const failure=item('d','RECURRING_FAILURE','github_actions','DISCOVERED_REQUIRES_REVIEW','actions/runs/41766221591',85);
const catalog=(items=[issue,issue2,pr,failure])=>({
 version:'reality-work-catalog-v0.1',status:'OBSERVED',
 observed_at:'2026-11-04T12:00:00Z',authority:'NONE_GRANTED',
 execution_enabled:false,items,source_coverage:{
 issues:'checked',pull_requests:'checked',actions:'checked',commits:'checked',
 customer_feedback:'not_connected',business_operations:'not_connected',external_research:'not_connected'
 }
});
const plan=(items)=>buildRealityEightHourShiftDraft(
 buildRealityWorkdayOpportunityBrief(catalog(items)));
test('source-backed human shift is an eight-hour organized draft, never work authorization',()=>{
 const r=plan([issue,issue2,pr,failure]);
 assert.equal(r.version,'reality-eight-hour-employee-shift-draft-v1');
 assert.equal(r.status,'DRAFT_ONLY_NOT_SCHEDULED_OR_AUTHORIZED');
 assert.equal(r.shift_duration_minutes,480);
 assert.equal(r.slots.length,8);
 assert.equal(r.slots[0].stage,'SOURCE_RECONCILIATION');
 assert.deepEqual(r.slots.map(x=>x.planning_minutes),[45,60,60,60,60,90,60,45]);
 assert.equal(r.slots[7].offset_end_minutes,480);
 assert.deepEqual(r.slots.slice(1,5).map(x=>x.candidate?.finding_type),
  ['OPEN_ISSUE','RECURRING_FAILURE','OPEN_PULL_REQUEST','OPEN_ISSUE']);
 assert.deepEqual(r.slots.slice(1,5).map(x=>x.candidate?.source_url),[
  url+'issues/201',url+'actions/runs/41766221591',
  url+'pull/229',url+'issues/188']);
 assert.equal(r.counts.selected_distinct_source_records,4);
 assert.equal(r.counts.qualified_executable_jobs,0);
 assert.equal(r.scheduling_state,'PROPOSED_AGENDA_NOT_PERSISTED_TO_WORKER_OR_CALENDAR');
 assert.equal(r.human_equivalent_hours_verified,null);
 assert.equal(r.measured_human_effort_minutes,null);
 assert.equal(r.verified_cash_savings_usd,null);
 assert.equal(r.financial_roi_verified,false);
 assert.equal(r.ready_to_execute_batch,false);
 assert.equal(r.job_started,false);
 assert.equal(r.shift_started,false);
 assert.equal(r.installation_authorized,false);
 assert.equal(r.owner_approval_created,false);
 assert.equal(r.production_changed,false);
 assert.match(r.benchmark_note,/does not establish eight hours/);
 assert.match(r.overlap_note,/do not prove distinct underlying work/);
 assert.equal(r.slots[5].status,'CONDITIONAL_NOT_EXECUTION_READY');
 assert.equal(r.slots[6].status,'CONDITIONAL_NOT_EXECUTION_READY');
});
test('two observations of same source URL are not scheduled as two separate jobs',()=>{
 const duplicate={...issue2,evidence_refs:issue.evidence_refs};
 const result=plan([issue,duplicate,pr,failure]);
 assert.equal(result.counts.selected_distinct_source_records,3);
 assert.equal(result.counts.dropped_duplicate_source_records,1);
 assert.equal(result.counts.unassigned_validation_slots,1);
 const refs=result.slots.filter(x=>x.candidate).map(x=>x.candidate.source_url);
 assert.equal(new Set(refs).size,refs.length);
});
test('empty and incomplete discovery preserve truthful unknown and unassigned states',()=>{
 const empty=plan([]);
 assert.equal(empty.slots.length,8);
 assert.equal(empty.counts.selected_distinct_source_records,0);
 assert.equal(empty.counts.unassigned_validation_slots,4);
 assert.equal(empty.counts.validated_human_equivalent_hours,0);
 assert.equal(empty.human_equivalent_hours_verified,null);
 const partial=catalog([issue]);partial.status='PARTIAL';partial.source_coverage.issues='partial';
 const planned=buildRealityEightHourShiftDraft(buildRealityWorkdayOpportunityBrief(partial));
 assert.equal(planned.source_status,'SOURCE_BACKED_DISCOVERY_PARTIAL');
 assert.equal(planned.ready_to_execute_batch,false);
});
test('adversarial or fake-approved discovery cannot make a shift plan',()=>{
 const original=buildRealityWorkdayOpportunityBrief(catalog());
 for(const diff of [
  {job_started:true},{installation_authorized:true},{shift_completed:true},
  {source_scope:'EXTERNAL_ACCESS'},{phase:'EXECUTED_SHIFT'},
  {counts:{...original.counts,verified_current_defects:1}},
  {value_measurement:{...original.value_measurement,verified_cash_savings_usd:1000}},
  {items:[{...original.items[0],authorized_execution:true}]},
  {items:[{...original.items[0],evidence_refs:['https://malicious.example/issue/1']}]}
 ]){
  assert.throws(()=>buildRealityEightHourShiftDraft({...original,...diff}),
    /REALITY_EIGHT_HOUR_SHIFT_UNVERIFIED_DISCOVERY_SOURCE/);
 }
});
test('GET-only preview planner blocks writes without contacting providers',async()=>{
 const prev=process.env.VERCEL_ENV;
 const res={
  headers:{},statusCode:200,
  setHeader(k,v){this.headers[k]=v;return this},
  status(n){this.statusCode=n;return this},
  json(body){this.body=body;return this}
 };
 try{
  process.env.VERCEL_ENV='preview';
  await shiftHandler({method:'POST'},res);
  assert.equal(res.statusCode,405);
  assert.equal(res.body.error,'EMPLOYEE_SHIFT_PLAN_READ_ONLY');
  assert.equal(res.headers['Cache-Control'],'private, no-store');
  process.env.VERCEL_ENV='production';
  await shiftHandler({method:'GET'},res);
  assert.equal(res.statusCode,403);
  assert.equal(res.body.error,'EMPLOYEE_SHIFT_PREVIEW_ONLY');
 }finally{if(prev===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=prev}
});
test('homepage preserves exact Run Full Loop, chat, receipts and source links after new planning action',()=>{
 for(const id of ['realityEmployeeShiftPlanner','realityBuildEmployeeShift',
   'realityEmployeeShiftStart','realityEmployeeShiftStatus','realityEmployeeShiftSchedule',
   'simpleRunFullLoop','simpleChat','homeOwnerAuthorizations','realityEconReceipts',
   'realityEconWorkHistory','realityPublishedRepairEvidence'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.ok(html.indexOf('id="realityEconReceipts"')<
  html.indexOf('id="realityBuildEmployeeShift"'));
 assert.ok(html.indexOf('id="realityBuildEmployeeShift"')<
  html.indexOf('id="simpleRunFullLoop"'));
 assert.match(html,/src="\/reality-eight-hour-shift-plan-v1\.js"/);
 assert.match(client,/AUTHORIZE_EXACT_EMPLOYEE_SHIFT/);
 assert.match(client,/\/api\/reality\/personal-governed-employee-shift/);
 assert.doesNotMatch(client,/OWNER_APPROVE_EXACT_VERIFIED|INSTALL_CAPABILITY|localStorage/);
 assert.doesNotThrow(()=>new vm.Script(client));
});
test('one click requests ONLY draft via GET, renders an evidence-linked eight-hour agenda',async()=>{
 const slots={};
 const node=tag=>({tag,children:[],hidden:false,disabled:false,
  value:'09:00',textContent:'',className:'',href:'',
  append(...values){this.children.push(...values)},
  replaceChildren(...values){this.children=values}
 });
 for(const id of ['realityEmployeeShiftPlanner','realityBuildEmployeeShift',
  'realityEmployeeShiftStatus','realityEmployeeShiftSchedule','realityEmployeeShiftStart'])
  slots[id]=node('div');
 const draft={ok:true,...plan([issue,issue2,pr,failure])};
 const calls=[];
 vm.runInNewContext(client,{
  document:{getElementById:id=>slots[id],createElement:node},
  fetch:async(path,options)=>{
   calls.push({path,options});
   return {ok:true,json:async()=>draft};
  }
 });
 assert.equal(calls.length,0,'planning must not run on page load');
 await slots.realityBuildEmployeeShift.onclick();
 assert.equal(calls.length,1);
 assert.equal(calls[0].path,'/api/reality/eight-hour-employee-shift-plan');
 assert.equal(calls[0].options.method,'GET');
 assert.equal(calls[0].options.credentials,'same-origin');
 assert.equal(slots.realityEmployeeShiftSchedule.hidden,false);
 assert.match(slots.realityEmployeeShiftStatus.textContent,/No job started/);
 assert.equal(slots.realityEmployeeShiftSchedule.children[2].children.length,8);
 const first=slots.realityEmployeeShiftSchedule.children[2].children[0];
 assert.match(first.children[0].textContent,/09:00/);
 const conditional=slots.realityEmployeeShiftSchedule.children[2].children[5];
 assert.match(conditional.children[1].children[0].textContent,/Governed execution/);
 assert.match(slots.realityEmployeeShiftSchedule.children[1].textContent,/NOT eight measured/);
});
test('forged shift plans never display a calendar or executable success',async()=>{
 const slots={};
 const node=tag=>({tag,children:[],hidden:false,disabled:false,
  value:'09:00',textContent:'',append(...x){this.children.push(...x)},
  replaceChildren(...x){this.children=x}
 });
 for(const id of ['realityEmployeeShiftPlanner','realityBuildEmployeeShift',
 'realityEmployeeShiftStatus','realityEmployeeShiftSchedule','realityEmployeeShiftStart'])
 slots[id]=node('div');
 const forged={ok:true,...plan([issue,pr]),ready_to_execute_batch:true};
 vm.runInNewContext(client,{
  document:{getElementById:id=>slots[id],createElement:node},
  fetch:async()=>({ok:true,json:async()=>forged})
 });
 await slots.realityBuildEmployeeShift.onclick();
 assert.equal(slots.realityEmployeeShiftSchedule.hidden,true);
 assert.match(slots.realityEmployeeShiftStatus.textContent,/No trustworthy/);
});
