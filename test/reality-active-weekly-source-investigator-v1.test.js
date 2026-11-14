import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runCurrentShiftWeeklyInvestigations}
 from '../src/reality-active-weekly-source-investigator-v1.js';
const shift='9460cfff-937a-4105-9093-2e41ab39a950';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const fingerprint='sha256:'+'a'.repeat(64),snapshot='f'.repeat(64);
const source=n=>'https://github.com/maloney2323/Reality/issues/'+n;
const graph={status:'UNIFIED_OWNER_JOB_CONTROL_READY',shift_id:shift,
 owner_id:owner,plan_fingerprint:fingerprint};
const item=(n,status='CURRENT_OWNER_OBJECTIVE_NEEDS_EXACT_TASK')=>({
 source_url:source(n),investigation_employee:'Riley',
 upstream_qualification_status:status,source_provider_checked_upstream:true,
 scope_status:'INSIDE_CURRENT_WARRANT_QUALIFICATION_REQUIRED',
 is_executable_original:false,installation_authorized:false
});
const intake={
 status:'CURRENT_WARRANT_AND_EXISTING_WORK_INVENTORY_RECONCILED_READ_ONLY',
 shift_id:shift,owner_id:owner,plan_fingerprint:fingerprint,
 current_shift_scope_extended:false,original_jobs_created:false,
 installation_authorized:false,production_changed:false,
 week_source_sha256:snapshot,weekly_sources:[item(185)]
};
const baseRead=()=>({status:'CURRENT_SIGNED_WEEKLY_INVESTIGATION_READBACK',
 shift_id:shift,owner_id:owner,plan_fingerprint:fingerprint,
 snapshot_sha256:snapshot,items:[],execution_authorized:false,
 installation_authorized:false,production_changed:false});
const issue={
 number:185,state:'open',html_url:source(185),
 repository_url:'https://api.github.com/repos/maloney2323/Reality',
 body:'Source-backed original job still needs specific, proven work.',
 title:'Full operational loop',updated_at:'2026-11-13T23:00:00Z'
};
const receiptId='12345678-1234-1234-1234-123456789abc';
const receipt='supabase:weekly_employee_investigation_receipts_v1:'+receiptId;
test('signed worker performs GitHub source investigation, writes and reads durable receipt once',async()=>{
 let items=[],writes=0,provider=0;
 const callRpc=async(db,name,args)=>{
  if(name==='reality_read_current_shift_weekly_investigations_v1')
   return {...baseRead(),items:[...items]};
  assert.equal(name,'reality_record_current_shift_weekly_investigation_v1');
  writes++;
  assert.equal(args.p_issue_number,185);
  assert.equal(args.p_employee,'Riley');
  assert.equal(args.p_investigation_status,
   'CURRENT_SOURCE_INSPECTED_EXACT_TASK_REQUIRES_TEST');
  items=[{source_ref:source(185),issue_number:185,employee:'Riley',
   provider_evidence_sha256:args.p_provider_evidence_sha256,
   investigation_receipt_ref:receipt}];
  return {status:'WEEKLY_EMPLOYEE_PROVIDER_INVESTIGATION_DURABLY_RECORDED',
   source_ref:source(185),issue_number:185,employee:'Riley',
   investigation_status:args.p_investigation_status,
   investigation_receipt_ref:receipt,executable_original_admitted:false,
   installation_authorized:false,production_changed:false};
 };
 const fetchImpl=async url=>{
  provider++;
  assert.match(url,/\/issues\/185$/);
  return {ok:true,json:async()=>issue};
 };
 const r=await runCurrentShiftWeeklyInvestigations({
  db:{},graph,intake,fetchImpl,callRpc});
 assert.equal(r.status,'WEEKLY_EMPLOYEE_SOURCE_INVESTIGATIONS_INDEPENDENTLY_RECORDED');
 assert.equal(r.just_investigated,1);
 assert.equal(r.source_receipts[0].investigation_receipt_ref,receipt);
 assert.equal(r.executable_original_admitted,false);
 assert.equal(writes,1);assert.equal(provider,1);
 const again=await runCurrentShiftWeeklyInvestigations({
  db:{},graph,intake,fetchImpl,callRpc});
 assert.equal(again.status,'WEEKLY_ASSIGNED_SOURCE_INVESTIGATIONS_ALREADY_INSPECTED');
 assert.equal(again.just_investigated,0);
 assert.equal(writes,1);assert.equal(provider,1);
});
test('pinned provider CI failure is investigated but never treated as a current repaired job',async()=>{
 const t=item(188,'CURRENT_FAILURE_REPRODUCTION_REQUIRED');
 const i={...intake,weekly_sources:[t]};
 let stores=0,lastStatus;
 const id=41177409146;
 const fetchImpl=async url=>({
  ok:true,json:async()=>url.endsWith('/issues/188')?{
   ...issue,number:188,html_url:source(188),body:
   'Actual historical run: https://github.com/maloney2323/Reality/actions/runs/'+id
  }:{
   id,status:'completed',conclusion:'failure',
   html_url:'https://github.com/maloney2323/Reality/actions/runs/'+id,
   head_repository:{full_name:'maloney2323/Reality'},head_sha:'1'.repeat(40),
   created_at:'2026-11-01T00:00:00Z'
  }
 });
 const callRpc=async(db,name,args)=>{
  if(name==='reality_read_current_shift_weekly_investigations_v1')
   return {...baseRead(),items:stores?[{source_ref:source(188),
    investigation_receipt_ref:receipt,
    provider_evidence_sha256:lastStatus}]:[]};
  stores++;lastStatus=args.p_provider_evidence_sha256;
  assert.equal(args.p_evidence_run_id,id);
  assert.equal(args.p_evidence_run_conclusion,'HISTORICAL_FAILURE');
  assert.equal(args.p_investigation_status,
   'HISTORICAL_PROVIDER_FAILURE_VERIFIED_FRESH_REPRODUCTION_REQUIRED');
  return {status:'WEEKLY_EMPLOYEE_PROVIDER_INVESTIGATION_DURABLY_RECORDED',
   source_ref:source(188),issue_number:188,employee:'Riley',
   investigation_status:args.p_investigation_status,
   investigation_receipt_ref:receipt,executable_original_admitted:false,
   installation_authorized:false,production_changed:false};
 };
 const result=await runCurrentShiftWeeklyInvestigations({
  db:{},graph,intake:i,callRpc,fetchImpl});
 assert.equal(result.just_investigated,1);
 assert.equal(result.executable_original_admitted,false);
});
test('forged or duplicated scope and mismatched provider must fail before recording work',async()=>{
 await assert.rejects(()=>runCurrentShiftWeeklyInvestigations({
  db:{},graph,intake:{...intake,original_jobs_created:true},
  callRpc:async()=>{throw Error('unexpected')},fetchImpl:async()=>{throw Error('unexpected')}
 }),/EXISTING_SIGNED_SHIFT_AND_SOURCE_INTAKE_REQUIRED/);
 let written=false;
 const callRpc=async(db,name,args)=>{
  if(name==='reality_read_current_shift_weekly_investigations_v1')
   return baseRead();
  written=true;throw Error('FORBIDDEN');
 };
 const result=await runCurrentShiftWeeklyInvestigations({
  db:{},graph,intake,callRpc,
  fetchImpl:async()=>({ok:true,json:async()=>({...issue,
   html_url:'https://github.com/attacker/other/issues/185'})})});
 assert.equal(result.just_investigated,0);
 assert.equal(written,false);
 assert.equal(result.status,'WEEKLY_EMPLOYEE_SOURCE_INVESTIGATIONS_UNVERIFIED');
});
test('worker wires actual read-only investigation, not just a category projection',()=>{
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261113_worker_active_weekly_investigations_v1.sql',
  import.meta.url),'utf8');
 assert.match(worker,/await runCurrentShiftWeeklyInvestigations\(/);
 assert.match(worker,/weekly_employee_source_investigations:weeklyEmployeeInvestigations/);
 assert.match(worker,/WEEKLY_EMPLOYEE_PROVIDER_INVESTIGATIONS_EXECUTED_AND_RECEIPTED/);
 assert.match(sql,/WEEKLY_INVESTIGATION_EXACT_UNSETTLED_ASSIGNMENT_REQUIRED/);
 assert.match(sql,/on conflict\(shift_id,snapshot_sha256,issue_number\) do nothing/);
 assert.match(sql,/WEEKLY_EMPLOYEE_PROVIDER_INVESTIGATION_DURABLY_RECORDED/);
 assert.doesNotMatch(sql,/grant execute.*to authenticated/i);
});

test('owner Home distinguishes durable worker investigations from unexecuted work plans',()=>{
 const api=readFileSync(new URL('../api/reality/personal-employee-roster.js',
  import.meta.url),'utf8');
 const home=readFileSync(new URL('../reality-home-employee-brief-v1.js',
  import.meta.url),'utf8');
 assert.match(api,/reality_read_current_shift_weekly_investigations_v1/);
 assert.match(api,/SIGNED_WORKER_EMPLOYEE_INVESTIGATIONS_INDEPENDENTLY_RECEIPTED/);
 assert.match(api,/checked\.owner_id===session\.user_id/);
 assert.match(api,/checked\.snapshot_sha256===verifiedSource\.source_sha256/);
 assert.match(home,/weekly_employee_investigation_receipts/);
 assert.match(home,/independently receipted/);
 assert.match(home,/doneByEmployee/);
 assert.match(home,/new_executable_jobs_authorized===0/);
});

test('owner-signed SOURCE_ADMITTED original appears separately from completed investigations',()=>{
 const api=readFileSync(new URL('../api/reality/personal-employee-roster.js',
  import.meta.url),'utf8');
 const home=readFileSync(new URL('../reality-home-employee-brief-v1.js',
  import.meta.url),'utf8');
 assert.match(api,/reality_read_current_shift_execution_graph_v1/);
 assert.match(api,/CURRENT_OWNER_SHIFT_ENGINEERING_ORIGINALS_SOURCE_BOUND/);
 assert.match(api,/graph\.owner_id===session\.user_id/);
 assert.match(api,/graph\.execution_scope_from_owner_warrant_only===true/);
 assert.match(api,/independent_source_proof_verified===true/);
 assert.match(home,/current_shift_engineering_originals/);
 assert.match(home,/awaiting model draft and tests/);
 assert.match(home,/work not yet installed or settled/);
 assert.doesNotMatch(home,/work has been completed automatically/);
});
