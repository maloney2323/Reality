import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {wakeExistingRileyCapabilityJob} from '../src/reality-employee-shared-capability-wake-v1.js';
import {processGovernedEmployeeShiftTick}
 from '../src/reality-governed-employee-shift-worker-v1.js';
const ID='11111111-2222-4333-8444-555555555555';
const TRIGGER='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const EVENT='99999999-8888-4777-8666-555555555555';
const WORK='work:'+'f'.repeat(32);
const ISSUE='https://github.com/maloney2323/Reality/issues/263';
const PROOF='sha256:'+'a'.repeat(64);
const recon={
 status:'EXACT_ORIGINAL_JOB_NOT_INDEPENDENTLY_SETTLED',
 governed_existing_work_status:'EXISTING_AUTHORIZED_ORIGINAL_REUSED_READ_ONLY',
 shift_id:ID,governed_trigger_id:TRIGGER,
 governed_original_work_id:WORK,
 shift_observation_source_ref:ISSUE,
 shift_observation_proof_sha256:PROOF,
 governed_cycle_dispatched_by_shift:false,
 model_invoked_by_shift:false,new_customer_job_created:false,
 installation_authorized:false,production_changed:false
};
const ready={
 status:'EXACT_SHIFT_CAPABILITY_WAKE_ELIGIBLE',
 shift_id:ID,original_work_id:WORK,trigger_id:TRIGGER,
 source_event_id:EVENT,source_ref:ISSUE,source_proof_sha256:PROOF,
 existing_job_only:true,installation_authorized:false,
 original_job_completed:false,production_changed:false
};
function fixture(reply=ready){
 const reads=[],wakes=[];
 return {
  reads,wakes,
  args:{db:{url:'https://isolated.example',secretKey:'mock-key'},
   reconciliation:recon,
   read:async q=>{reads.push(q);return reply},
   dispatch:async x=>{
    wakes.push(x);
    return {dispatched:true,existing:false,
     ...x,worker_commit_sha:'b'.repeat(40),
     installation_authorized:false,production_changed:false};
   }}
 };
}
test('wake only pre-existing owner-scoped Reality job after second independent readback',async()=>{
 const f=fixture();
 const result=await wakeExistingRileyCapabilityJob(f.args);
 assert.equal(result.status,'EXISTING_REALITY_CAPABILITY_WAKE_RECORDED');
 assert.equal(result.original_work_id,WORK);
 assert.equal(result.provider_commit_sha,'b'.repeat(40));
 assert.equal(result.worker_execution_acknowledged,false);
 assert.equal(result.original_job_completed,false);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.production_changed,false);
 assert.equal(result.model_invoked,false);
 assert.equal(f.reads.length,1);
 assert.equal(f.reads[0].original_work_id,WORK);
 assert.equal(f.wakes.length,1);
 assert.deepEqual(f.wakes[0],{
  trigger_id:TRIGGER,source_event_id:EVENT,original_work_id:WORK
 });
});
test('no eligible exact work or queue phase never sends a worker wake',async()=>{
 for(const x of [
  {...recon,status:'NO_SHIFT_AWAITING_EXACT_WORK'},
  {...recon,governed_existing_work_status:'NO_ELIGIBLE_ORIGINAL_JOB_FROM_SHIFT_OBSERVATION'}
 ]){
  const f=fixture();
  const r=await wakeExistingRileyCapabilityJob({...f.args,reconciliation:x});
  assert.equal(r.status,'NO_EXACT_ACTIVE_ORIGINAL_JOB_TO_WAKE');
  assert.equal(f.reads.length,0);assert.equal(f.wakes.length,0);
 }
 const g=fixture({status:'NO_ELIGIBLE_SHIFT_CAPABILITY_WAKE'});
 const response=await wakeExistingRileyCapabilityJob(g.args);
 assert.equal(response.status,'EXISTING_JOB_NOT_READY_FOR_NEW_WAKE');
 assert.equal(g.wakes.length,0);
});
test('stale, foreign, unapproved and already-settled readbacks cannot authorize wake',async()=>{
 const bad=[
  {original_work_id:'work:'+'e'.repeat(32)},
  {trigger_id:'bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee'},
  {shift_id:'bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee'},
  {source_event_id:null},{source_ref:ISSUE.replace('263','201')},
  {source_proof_sha256:'sha256:'+'b'.repeat(64)},
  {installation_authorized:true},{production_changed:true},
  {original_job_completed:true},{existing_job_only:false}
 ];
 for(const b of bad){
  const f=fixture({...ready,...b});
  await assert.rejects(wakeExistingRileyCapabilityJob(f.args),
   /RILEY_SHARED_WAKE_INDEPENDENT_PREWAKE_READBACK_MISMATCH/);
  assert.equal(f.wakes.length,0);
 }
 for(const b of [
  {installation_authorized:true},{production_changed:true},
  {governed_trigger_id:'not-a-uuid'},
  {shift_observation_source_ref:'https://other.invalid/issues/1'},
  {model_invoked_by_shift:true}
 ]){
  const f=fixture();
  await assert.rejects(wakeExistingRileyCapabilityJob({
   ...f.args,reconciliation:{...recon,...b}
  }),/RILEY_SHARED_WAKE_RECONCILED_SCOPE_UNTRUSTED/);
  assert.equal(f.reads.length,0);assert.equal(f.wakes.length,0);
 }
});
test('unacknowledged or malformed provider commit is never an executed job',async()=>{
 const f=fixture();
 const r=await wakeExistingRileyCapabilityJob({
  ...f.args,dispatch:async x=>({
   dispatched:true,existing:true,...x,worker_ref_sha:'c'.repeat(40),
   installation_authorized:false,production_changed:false
  })
 });
 assert.equal(r.dispatch_existing_idempotent,true);
 assert.equal(r.worker_execution_acknowledged,false);
 const bad=fixture();
 await assert.rejects(wakeExistingRileyCapabilityJob({
  ...bad.args,dispatch:async()=>({dispatched:false})
 }),/RILEY_SHARED_WAKE_WAKE_PROVIDER_RECEIPT_UNVERIFIED/);
});
test('shift tick preserves source work and reports exact wake independently',async()=>{
 const seen=[];
 const fetchImpl=async(url)=>{
  const name=url.split('/rpc/')[1];
  seen.push(name);
  const data=name==='reality_close_employee_shift_v1'?
   {status:'NO_SHIFT_DUE_FOR_CLOSE'}:
   name==='reality_reconcile_employee_shift_original_v1'?recon:
   name==='reality_claim_employee_shift_step_v1'?{
    status:'EXACT_ORIGINAL_JOB_AUTHORITY_REQUIRED',shift_id:ID
   }:null;
  if(!data)throw Error('UNEXPECTED_RPC_'+name);
  return {ok:true,json:async()=>data};
 };
 const got=await processGovernedEmployeeShiftTick(
  {url:'https://isolated.example',secretKey:'mock-key'},{
   fetchImpl,wakeCapability:async ({reconciliation})=>{
    assert.deepEqual(reconciliation,recon);
    return {status:'EXISTING_REALITY_CAPABILITY_WAKE_RECORDED',
     worker_execution_acknowledged:false,installation_authorized:false,
     original_job_completed:false,production_changed:false};
   }
 });
 assert.equal(got.status,'EXACT_ORIGINAL_JOB_AUTHORITY_REQUIRED');
 assert.equal(got.capability_wake.status,'EXISTING_REALITY_CAPABILITY_WAKE_RECORDED');
 assert.equal(got.job_completed,false);assert.equal(got.installation_authorized,false);
 assert.deepEqual(seen,['reality_close_employee_shift_v1',
  'reality_reconcile_employee_shift_original_v1',
  'reality_claim_employee_shift_step_v1']);
});
test('uncertain wake does not terminate permitted shift work or claim completion',async()=>{
 const fetchImpl=async url=>({ok:true,json:async()=>(
  url.endsWith('close_employee_shift_v1')?
   {status:'NO_SHIFT_DUE_FOR_CLOSE'}:
   url.endsWith('reconcile_employee_shift_original_v1')?recon:
   {status:'EXACT_ORIGINAL_JOB_AUTHORITY_REQUIRED',shift_id:ID}
 )});
 const got=await processGovernedEmployeeShiftTick({},{
  fetchImpl,wakeCapability:async()=>{throw Error('NETWORK_UNCERTAIN');}
 });
 assert.equal(got.status,'EXACT_ORIGINAL_JOB_AUTHORITY_REQUIRED');
 assert.equal(got.capability_wake.status,'EXACT_CAPABILITY_WAKE_REQUIRES_RECONCILIATION');
 assert.equal(got.capability_wake.reason_code,'TRUSTED_WAKE_READBACK_UNAVAILABLE');
 assert.equal(got.capability_wake.worker_execution_acknowledged,false);
 assert.equal(got.installation_authorized,false);
});
test('wake gate is service-only and read-only in isolated database migration',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261106020000_riley_shift_capability_wake_gate_v1.sql',
  import.meta.url),'utf8');
 assert.match(sql,/security invoker/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/grant execute on function public.reality_read_shift_capability_wake_v1/);
 assert.match(sql,/from public,anon,authenticated/);
 assert.match(sql,/genuine_independent_final_receipts_v1/);
 assert.match(sql,/q.phase in/);
 assert.match(sql,/goal_publication_epochs/);
 assert.match(sql,/source_proof_sha256/);
 assert.match(sql,/owner_authorized_investigation/);
 assert.match(sql,/owner_authorized_installation/);
 assert.doesNotMatch(sql,/\b(insert|update|delete)\s+(?:into|reality_internal|public)/i);
 const rpc=readFileSync(new URL(
  '../src/reality-governed-shift-boundary-v1.js',
  import.meta.url),'utf8');
 assert.match(rpc,/read_shift_capability_wake_v1/);
 const worker=readFileSync(new URL(
  '../src/reality-governed-employee-shift-worker-v1.js',
  import.meta.url),'utf8');
 assert.match(worker,/wakeExistingRileyCapabilityJob/);
 assert.match(worker,/EXACT_CAPABILITY_WAKE_REQUIRES_RECONCILIATION/);
});
