import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {wakeExistingRileyShiftCapabilityBatch}
 from '../src/reality-riley-existing-multi-job-wake-v1.js';
import {processGovernedEmployeeShiftTick}
 from '../src/reality-governed-employee-shift-worker-v1.js';
const OWNER='11111111-2222-4333-8444-555555555555';
const SHIFT='22222222-3333-4444-8555-666666666666';
const TRIGGER1='33333333-4444-4555-8666-777777777777';
const TRIGGER2='44444444-5555-4666-8777-888888888888';
const EVENT1='55555555-6666-4777-8888-999999999999';
const EVENT2='66666666-7777-4888-8999-aaaaaaaaaaaa';
const WORK1='work:'+'a'.repeat(32);
const WORK2='work:'+'b'.repeat(32);
const SHA='sha256:'+'c'.repeat(64);
const SOURCE1='https://github.com/maloney2323/Reality/issues/263';
const SOURCE2='https://github.com/maloney2323/Reality/issues/185';
const NOW=new Date('2026-11-06T18:00:00Z');
const reconciled={status:'EXACT_ORIGINAL_JOB_NOT_INDEPENDENTLY_SETTLED',
 governed_existing_work_status:'AMBIGUOUS_ORIGINAL_SCOPE_NO_AUTOMATIC_SELECTION',
 shift_id:SHIFT,governed_cycle_dispatched_by_shift:false,
 model_invoked_by_shift:false,new_customer_job_created:false,
 installation_authorized:false,production_changed:false};
const candidates=[
 {owner_id:OWNER,shift_id:SHIFT,original_work_id:WORK1,trigger_id:TRIGGER1,
  source_event_id:EVENT1,source_ref:SOURCE1,source_proof_sha256:SHA,
  source_step_index:2,current_owner_scope_verified:true,
  independently_settled:false,installation_authorized:false,production_changed:false},
 {owner_id:OWNER,shift_id:SHIFT,original_work_id:WORK2,trigger_id:TRIGGER2,
  source_event_id:EVENT2,source_ref:SOURCE2,source_proof_sha256:SHA,
  source_step_index:3,current_owner_scope_verified:true,
  independently_settled:false,installation_authorized:false,production_changed:false}
];
function shift(){
 return {status:'OWNER_SCOPED_EMPLOYEE_SHIFT_READBACK',
  work_installation_authorized_by_read:false,production_changed:false,
  verified_human_hours_saved:null,
  shifts:[{shift_id:SHIFT,status:'AWAITING_EXACT_ORIGINAL_WORK',
   plan_fingerprint:SHA,planned_start_at:'2026-11-06T17:00:00Z',
   planned_end_at:'2026-11-07T01:00:00Z',
   steps:Array.from({length:8},(_,i)=>({
    step_index:i+1,state:i===1||i===2?'SOURCE_CHECKED':
     i===5?'AWAITING_EXACT_WORK':'QUEUED',
    source_ref:i===1?SOURCE1:i===2?SOURCE2:null,
    proof_sha256:i===1||i===2?SHA:null
   }))}]};
}
function ledger(){
 return {status:'OWNER_GOVERNED_LOOP_READBACK',
  owner_installation_authorized_by_read:false,
  external_action_performed:false,production_changed:false,
  jobs:candidates.map((c,i)=>({original_work_id:c.original_work_id,
   source_issue_number:i===0?263:185,environment:'ISOLATED_PREVIEW',
   independently_settled:false,owner_install_approved:false,
   phase:'PENDING_FROZEN_REPRODUCTION'}))};
}
function gate(c){return {
 status:'EXACT_SHIFT_CAPABILITY_WAKE_ELIGIBLE',
 shift_id:SHIFT,original_work_id:c.original_work_id,
 trigger_id:c.trigger_id,source_event_id:c.source_event_id,
 source_ref:c.source_ref,source_proof_sha256:c.source_proof_sha256,
 existing_job_only:true,installation_authorized:false,
 original_job_completed:false,production_changed:false
};}
function fixture({badGate=false,ambiguous=false}={}){
 const calls=[],wakes=[];
 const callRpc=async({name,args})=>{
  calls.push([name,args]);
  if(name==='reality_read_eligible_shift_originals_v1')
   return ambiguous?{status:'AMBIGUOUS_SHIFT_TOO_MANY_ORIGINALS'}:{
    status:'EXISTING_SHIFT_ORIGINALS_INDEPENDENTLY_RECONCILED',
    shift_id:SHIFT,execution_authorized:false,installation_authorized:false,
    production_changed:false,candidate_count:2,candidates};
  if(name==='reality_read_owner_employee_shifts_v1')return shift();
  if(name==='reality_read_owner_genuine_loop_v1')return ledger();
  if(name==='reality_read_shift_capability_wake_v1'){
   const c=candidates.find(x=>x.original_work_id===args.p_original_work_id);
   const result=gate(c);
   if(badGate&&c===candidates[1])
    return {...result,source_proof_sha256:'sha256:'+'d'.repeat(64)};
   return result;
  }
  throw Error('UNEXPECTED_RPC_'+name);
 };
 return {calls,wakes,callRpc,dispatch:async x=>{
  wakes.push(x);return {...x,dispatched:true,existing:false,
   installation_authorized:false,production_changed:false};
 }};
}
test('two independently checked owner jobs wake existing Reality engine, not execute',async()=>{
 const f=fixture();
 const out=await wakeExistingRileyShiftCapabilityBatch({
  db:{},reconciliation:reconciled,callRpc:f.callRpc,
  dispatch:f.dispatch,now:()=>NOW});
 assert.equal(out.status,'EXISTING_MULTI_JOB_CAPABILITY_WAKES_RECORDED');
 assert.equal(out.eligible_count,2);
 assert.equal(out.dispatched_count,2);
 assert.deepEqual(f.wakes.map(x=>x.original_work_id),[WORK1,WORK2]);
 assert.equal(out.worker_execution_acknowledged,false);
 assert.equal(out.full_shift_proven,false);
 assert.equal(out.original_job_completed,false);
 assert.equal(out.installation_authorized,false);
 assert.equal(out.model_invoked_by_shift,false);
 assert.equal(out.production_changed,false);
 assert.equal(f.calls.filter(x=>x[0]==='reality_read_shift_capability_wake_v1').length,2);
 assert.equal(f.calls.filter(x=>x[0]==='reality_claim_exact_shift_original_v1').length,0);
});
test('one stale second gate vetoes entire batch before any provider write',async()=>{
 const f=fixture({badGate:true});
 await assert.rejects(wakeExistingRileyShiftCapabilityBatch({
  db:{},reconciliation:reconciled,callRpc:f.callRpc,
  dispatch:f.dispatch,now:()=>NOW
 }),/RILEY_MULTI_WAKE_EXACT_INDEPENDENT_WAKE_READBACK_REQUIRED/);
 assert.equal(f.wakes.length,0);
});
test('ambiguous over-capacity and untrusted reconciliation fail closed',async()=>{
 const f=fixture({ambiguous:true});
 const out=await wakeExistingRileyShiftCapabilityBatch({
  db:{},reconciliation:reconciled,callRpc:f.callRpc,
  dispatch:f.dispatch,now:()=>NOW});
 assert.equal(out.status,'TOO_MANY_ORIGINALS_NO_AUTOMATIC_SELECTION');
 assert.equal(f.wakes.length,0);
 await assert.rejects(wakeExistingRileyShiftCapabilityBatch({
  db:{},reconciliation:{...reconciled,installation_authorized:true},
  callRpc:f.callRpc,dispatch:f.dispatch
 }),/RILEY_MULTI_WAKE_EXACT_SHIFT_AND_SERVICE_ADAPTERS_REQUIRED/);
 assert.equal(f.wakes.length,0);
});
test('live shift worker routes ambiguous originals into batch, not unsafe single selection',async()=>{
 const f=fixture(),names=[];
 const worker=await processGovernedEmployeeShiftTick({url:'mock',secretKey:'mock'},{
  wakeMultiple:async args=>{
   assert.deepEqual(args.reconciliation,reconciled);
   return wakeExistingRileyShiftCapabilityBatch({
    ...args,callRpc:f.callRpc,dispatch:f.dispatch,now:()=>NOW});
  },
  wakeCapability:async()=>{throw Error('MUST_NOT_SELECT_ONE')},
  fetchImpl:async url=>{
   const name=url.split('/rpc/')[1];names.push(name);
   const response=name==='reality_close_employee_shift_v1'?
    {status:'NO_SHIFT_DUE_FOR_CLOSE'}:
    name==='reality_reconcile_employee_shift_original_v1'?reconciled:
    {status:'EXACT_ORIGINAL_JOB_AUTHORITY_REQUIRED',shift_id:SHIFT};
   return {ok:true,json:async()=>response};
  }
 });
 assert.equal(worker.status,'EXACT_ORIGINAL_JOB_AUTHORITY_REQUIRED');
 assert.equal(worker.capability_wake.status,'EXISTING_MULTI_JOB_CAPABILITY_WAKES_RECORDED');
 assert.equal(worker.capability_wake.worker_execution_acknowledged,false);
 assert.equal(worker.job_completed,false);
 assert.equal(worker.installation_authorized,false);
 assert.deepEqual(names,[
  'reality_close_employee_shift_v1',
  'reality_reconcile_employee_shift_original_v1',
  'reality_claim_employee_shift_step_v1']);
});
test('worker and source cannot claim that a GitHub trigger is a finished repair',()=>{
 const source=readFileSync(new URL('../src/reality-riley-existing-multi-job-wake-v1.js',
  import.meta.url),'utf8');
 const worker=readFileSync(new URL('../src/reality-governed-employee-shift-worker-v1.js',
  import.meta.url),'utf8');
 assert.match(worker,/wakeExistingRileyShiftCapabilityBatch/);
 assert.match(source,/reality_read_eligible_shift_originals_v1/);
 assert.match(source,/reality_read_shift_capability_wake_v1/);
 assert.match(source,/verifyRileyMultiJobEligibility/);
 assert.doesNotMatch(source,/reality_claim_exact_shift_original_v1/);
 assert.doesNotMatch(source,/installRiley|merge_pull_request/);
});
