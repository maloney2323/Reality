import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {computeShiftFingerprint,assertShiftReceipt,assertShiftReadback,shiftRpc} from '../src/reality-governed-shift-boundary-v1.js';
import {buildRealityWorkdayOpportunityBrief} from '../src/reality-workday-opportunity-brief-v1.js';
import {buildRealityEightHourShiftDraft} from '../src/reality-eight-hour-shift-plan-v1.js';
import {findEmployeeShiftCapabilityHandoffs} from '../src/reality-employee-shift-capability-handoff-v1.js';
import {processGovernedEmployeeShiftTick} from '../src/reality-governed-employee-shift-worker-v1.js';

const root='https://github.com/maloney2323/Reality/';
const id='11111111-2222-4333-8444-555555555555';
const sha='a'.repeat(64),fingerprint='sha256:'+sha;
const makeItem=(a,type,path)=>({
 finding_id:'catalog:'+a.repeat(32),finding_type:type,
 source:type==='OPEN_ISSUE'?'github_issues':'github_pull_requests',
 state:type==='OPEN_ISSUE'?'TRACKED_NEEDS_REVIEW':'OPEN_AWAITING_REVIEW',
 title:'Reality source-backed work '+a,category:'reliability',
 evidence_refs:[root+path],
 value_assessment:{triage_score:90},
 execution_work_item:null,authorization_required:false
});
const inputs=[
 makeItem('a','OPEN_ISSUE','issues/201'),
 makeItem('b','OPEN_ISSUE','issues/188'),
 makeItem('c','OPEN_PULL_REQUEST','pull/229')
];
function draft(){
 const catalog={version:'reality-work-catalog-v0.1',status:'OBSERVED',
 observed_at:'2026-11-04T12:00:00Z',authority:'NONE_GRANTED',
 execution_enabled:false,items:inputs,source_coverage:{
 issues:'checked',pull_requests:'checked',actions:'checked',commits:'checked',
 customer_feedback:'not_connected',business_operations:'not_connected',
 external_research:'not_connected'}};
 return buildRealityEightHourShiftDraft(buildRealityWorkdayOpportunityBrief(catalog));
}
test('eight-hour owner approval fingerprint is stable and tied to exact source selection',()=>{
 const plan=draft();
 const current=computeShiftFingerprint(plan);
 assert.match(current,/^sha256:[a-f0-9]{64}$/);
 assert.equal(computeShiftFingerprint(plan),current);
 const different={...plan,slots:[...plan.slots]};
 different.slots[1]={...different.slots[1],
  candidate:{...different.slots[1].candidate,
   source_url:root+'issues/999999'}};
 assert.notEqual(computeShiftFingerprint(different),current);
 assert.throws(()=>computeShiftFingerprint({...plan,job_started:true}),
  /SHIFT_FINGERPRINT_UNVERIFIED_PLAN/);
});
test('owner approval receipt and readback are fail-closed',()=>{
 assert.equal(assertShiftReceipt({
  status:'SHIFT_DURABLY_AUTHORIZED',shift_id:id,
  owner_scope_verified:true,installation_authorized:false,
  production_changed:false}).shift_id,id);
 assert.throws(()=>assertShiftReceipt({
  status:'SHIFT_DURABLY_AUTHORIZED',shift_id:id,
  owner_scope_verified:true,installation_authorized:true,
  production_changed:false}),/UNTRUSTED/);
 const steps=Array.from({length:8},(_,i)=>({
  step_index:i+1,stage:'STAGE',state:'QUEUED',
  source_ref:null,proof_sha256:null}));
 const read={
  status:'OWNER_SCOPED_EMPLOYEE_SHIFT_READBACK',
  work_installation_authorized_by_read:false,
  verified_human_hours_saved:null,production_changed:false,
  shifts:[{shift_id:id,plan_fingerprint:fingerprint,
   status:'QUEUED',steps}]
 };
 assert.equal(assertShiftReadback(read),read);
 assert.throws(()=>assertShiftReadback({
  ...read,verified_human_hours_saved:8}),/INVALID/);
 assert.throws(()=>assertShiftReadback({...read,shifts:[
  {...read.shifts[0],steps:[...steps.slice(0,2),
   {...steps[2],state:'OWNER_INSTALL_AUTO_APPROVED'},...steps.slice(3)]}]}),
   /INVALID/);
});
test('exact shift-bound verified capability is offered for existing Reality Chat only',()=>{
 const work='work:'+'b'.repeat(32);
 const q={
  original_work_id:work,phase:'AWAITING_OWNER_APPROVAL',
  capability_id:'reality-ci-failure-evidence',
  approval:null,
  source_paths:[
   'src/reality-extensions/reality-ci-failure-evidence.mjs',
   'test/reality-extensions/reality-ci-failure-evidence.test.js'],
  qualification:{status:'AWAITING_OWNER_APPROVAL',
   installation_authorized:false,original_job_completed:false,
   artifact_sha256:sha}
 };
 const loop={status:'OWNER_GOVERNED_LOOP_READBACK',jobs:[{
  source_issue_number:201,original_work_id:work,
  candidate_verified:true,owner_install_approved:false,
  independently_settled:false,environment:'ISOLATED_PREVIEW'}],
  owner_installation_authorized_by_read:false,
  external_action_performed:false,production_changed:false};
 const ownerShifts=[{shift_id:id,status:'AWAITING_EXACT_ORIGINAL_WORK',
  steps:[{step_index:2,source_ref:root+'issues/201'}]}];
 const found=findEmployeeShiftCapabilityHandoffs({ownerShifts,qualified:[q],loop});
 assert.equal(found.length,1);
 assert.equal(found[0].original_work_id,work);
 assert.equal(found[0].approval_action,
  'OPEN_EXISTING_REALITY_CHAT_EXACT_UPGRADE_APPROVAL');
 assert.equal(found[0].installation_approved,false);
 assert.equal(found[0].automatic_installation_without_owner,false);
 assert.equal(findEmployeeShiftCapabilityHandoffs({
  ownerShifts,qualified:[{...q,qualification:{
    ...q.qualification,installation_authorized:true}}],loop}).length,0);
 assert.equal(findEmployeeShiftCapabilityHandoffs({
  ownerShifts,qualified:[q],loop:{...loop,
   jobs:[{...loop.jobs[0],source_issue_number:188}]}}).length,0);
 assert.throws(()=>findEmployeeShiftCapabilityHandoffs({
  ownerShifts,qualified:[q],loop:{...loop,production_changed:true}}),
  /OWNER_SOURCE_UNTRUSTED/);
});
test('one worker tick performs only authenticated database readbacks and a real Github source GET',async()=>{
 const calls=[];
 const db={url:'https://example.supabase.co',secretKey:'service-not-a-real-secret'};
 const respond=(body)=>({ok:true,status:200,
  json:async()=>body});
 const fetchImpl=async(url,options)=>{
  calls.push({url,options});
  if(url.endsWith('/rpc/reality_close_employee_shift_v1'))
   return respond({status:'NO_SHIFT_DUE_FOR_CLOSE'});
  if(url.endsWith('/rpc/reality_reconcile_employee_shift_original_v1'))
   return respond({status:'NO_SHIFT_AWAITING_EXACT_WORK'});
  if(url.endsWith('/rpc/reality_claim_employee_shift_step_v1'))
   return respond({status:'READ_ONLY_STEP_CLAIMED',
    shift_id:id,claim_id:id,owner_id:id,
    step_index:2,stage:'VERIFY_OPEN_ISSUE',
    source_ref:root+'issues/201',no_external_write_authority:true});
  if(url==='https://api.github.com/repos/maloney2323/Reality/issues/201')
   return respond({id:201,html_url:root+'issues/201',state:'open'});
  if(url.endsWith('/rpc/reality_settle_employee_shift_step_v1')){
   const proof=JSON.parse(options.body).p_proof;
   assert.equal(proof.source_url,root+'issues/201');
   assert.equal(proof.kind,'GITHUB_SOURCE_READBACK');
   assert.equal(proof.provider_status,'OPEN_ISSUE');
   assert.equal(proof.read_only,true);
   assert.equal(proof.production_changed,false);
   return respond({status:'READ_ONLY_PROVIDER_EVIDENCE_RECORDED',
    step_index:2,proof_sha256:fingerprint,production_changed:false,
    original_job_completed:false,human_hours_saved:null});
  }
  throw Error('UNEXPECTED_CALL_'+url);
 };
 const result=await processGovernedEmployeeShiftTick(db,{fetchImpl});
 assert.equal(result.status,'READ_ONLY_SHIFT_STEP_SETTLED');
 assert.equal(result.installation_authorized,false);
 assert.equal(result.job_completed,false);
 assert.equal(result.verified_human_hours_saved,null);
 assert.equal(calls.length,5);
 assert.equal(calls.filter(x=>x.url.startsWith('https://api.github.com/')).length,1);
 assert.equal(calls.find(x=>x.url.includes('/issues/201')).options.method,'GET');
 assert.ok(calls.every(x=>!x.url.includes('install')&&!x.url.includes('github.com/repos/maloney2323/Reality/dispatches')));
});
test('worker stops at exact authorization gate; never grants installation authority',async()=>{
 const db={url:'https://example.supabase.co',secretKey:'stub'};
 const urls=[];
 const fetchImpl=async(url)=>{
  urls.push(url);
  const status=url.endsWith('close_employee_shift_v1')?
   'NO_SHIFT_DUE_FOR_CLOSE':
   url.endsWith('reconcile_employee_shift_original_v1')?
    'EXACT_ORIGINAL_JOB_NOT_INDEPENDENTLY_SETTLED':
    'EXACT_ORIGINAL_JOB_AUTHORITY_REQUIRED';
  return {ok:true,json:async()=>({status,shift_id:id})};
 };
 const result=await processGovernedEmployeeShiftTick(db,{fetchImpl});
 assert.equal(result.status,'EXACT_ORIGINAL_JOB_AUTHORITY_REQUIRED');
 assert.equal(result.installation_authorized,false);
 assert.equal(result.job_completed,false);
 assert.equal(urls.length,3);
});
test('migration preserves owner, replay, lease and independent receipt boundaries',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261104_governed_employee_shift_queue_v1.sql',
  import.meta.url),'utf8');
 const ui=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const browser=readFileSync(new URL(
  '../reality-eight-hour-shift-plan-v1.js',import.meta.url),'utf8');
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 for(const name of [
  'reality_authorize_employee_shift_v1',
  'reality_read_owner_employee_shifts_v1',
  'reality_claim_employee_shift_step_v1',
  'reality_settle_employee_shift_step_v1',
  'reality_close_employee_shift_v1',
  'reality_reconcile_employee_shift_original_v1'
 ])assert.match(sql,new RegExp(name));
 assert.match(sql,/for update skip locked/);
 assert.match(sql,/unique\(owner_id,plan_fingerprint,planned_start_at\)/);
 assert.match(sql,/claim_expires_at/);
 assert.match(sql,/if current_user<>'service_role'/);
 assert.match(sql,/genuine_independent_final_receipts_v1/);
 assert.match(sql,/r.verified_at>=s.authorized_at/);
 assert.match(sql,/revoke all on function public.reality_authorize_employee_shift_v1/);
 assert.match(sql,/grant execute on function public.reality_authorize_employee_shift_v1/);
 assert.match(ui,/id="realityAuthorizeEmployeeShift"/);
 assert.match(ui,/id="realityChatShiftHandoff"/);
 assert.match(browser,/AUTHORIZE_EXACT_EMPLOYEE_SHIFT/);
 assert.match(browser,/EXACT_VERIFIED_CAPABILITY_APPROVAL_READY_IN_REALITY_CHAT/);
 assert.doesNotMatch(browser,/OWNER_APPROVE_EXACT_VERIFIED_ISOLATED_CAPABILITY/);
 assert.match(worker,/REALITY_EMPLOYEE_SHIFT_WORKER_TOKEN/);
 assert.match(worker,/timingSafeEqual/);
 assert.doesNotMatch(worker,/owner_approve_qualified_preview|github.*dispatches/i);
});
