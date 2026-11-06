// Frozen #263 contract: a source-backed, already-qualified original must
// reach a server-controlled Reality original-job driver after the shift
// worker reaches step 6. This test must fail on the baseline before Riley
// proposes a patch. No model owns, claims, installs or settles original work.
import test from 'node:test';
import assert from 'node:assert/strict';
import {processGovernedEmployeeShiftTick}
 from '../../src/reality-governed-employee-shift-worker-v1.js';
const SHIFT='22222222-3333-4444-8555-666666666666';
const WORK='work:'+'a'.repeat(32);
const reconciliation={
 status:'EXACT_ORIGINAL_JOB_NOT_INDEPENDENTLY_SETTLED',
 governed_existing_work_status:'EXISTING_AUTHORIZED_ORIGINAL_REUSED_READ_ONLY',
 shift_id:SHIFT,governed_original_work_id:WORK,
 governed_trigger_id:'33333333-4444-4555-8666-777777777777',
 shift_observation_source_ref:'https://github.com/maloney2323/Reality/issues/263',
 shift_observation_proof_sha256:'sha256:'+'f'.repeat(64),
 governed_cycle_dispatched_by_shift:false,model_invoked_by_shift:false,
 new_customer_job_created:false,installation_authorized:false,
 production_changed:false
};
const wake={status:'EXISTING_REALITY_CAPABILITY_WAKE_RECORDED',
 original_work_id:WORK,shift_id:SHIFT,worker_execution_acknowledged:false,
 installation_authorized:false,original_job_completed:false,
 production_changed:false};
const originalOutcome={
 status:'SHIFT_TICK_OUTCOMES_RECORDED_RECHECK_MORE_AUTHORIZED_WORK',
 shift_id:SHIFT,attempted:1,independently_settled:0,
 outcomes:[{original_work_id:WORK,
  status:'SAME_ORIGINAL_JOB_SHARED_REPAIR_HANDOFF',
  original_job_settled:false}],
 shift_finished:false,full_shift_proven:false,
 installation_authorized:false,production_changed:false
};
function fakeDb({reconciled=reconciliation,claimed=true}={}){
 const names=[];
 const fetchImpl=async url=>{
  const name=url.split('/rpc/')[1];
  names.push(name);
  const body=name==='reality_close_employee_shift_v1'?
   {status:'NO_SHIFT_DUE_FOR_CLOSE'}:
   name==='reality_reconcile_employee_shift_original_v1'?reconciled:
   {status:claimed?'EXACT_ORIGINAL_JOB_AUTHORITY_REQUIRED':
    'NO_DUE_AUTHORIZED_SHIFT',shift_id:SHIFT};
  return {ok:true,json:async()=>body};
 };
 return {fetchImpl,names};
}
test('a qualified step-six shift reaches trusted original-job handoff, not just a wake',async()=>{
 const f=fakeDb(),driver=[];
 const result=await processGovernedEmployeeShiftTick({
  url:'https://isolated.example',secretKey:'test-only'
 },{
  fetchImpl:f.fetchImpl,
  wakeCapability:async()=>wake,
  executeQualifiedOriginals:async args=>{
   driver.push(args);
   return originalOutcome;
  }
 });
 assert.equal(result.status,'EXACT_ORIGINAL_JOB_AUTHORITY_REQUIRED');
 assert.equal(driver.length,1,
  'The existing server-controlled executor must be reached after exact step 6.');
 assert.equal(driver[0].shift_id,SHIFT);
 assert.equal(driver[0].original_work_id,WORK);
 assert.equal(driver[0].read_only,false);
 assert.equal(driver[0].preflight_only,false);
 assert.equal(result.original_job_driver.status,
  'SHIFT_TICK_OUTCOMES_RECORDED_RECHECK_MORE_AUTHORIZED_WORK');
 assert.equal(result.original_job_driver.independently_settled,0);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.job_completed,false);
});
test('read-only, stale, unqualified or unknown shift never calls original driver',async()=>{
 for(const candidate of [
  {reconciled:{status:'NO_SHIFT_AWAITING_EXACT_WORK'}},
  {reconciled:{...reconciliation,
    governed_existing_work_status:'NO_ELIGIBLE_ORIGINAL_JOB_FROM_SHIFT_OBSERVATION'}},
  {claimed:false}
 ]){
  const f=fakeDb(candidate);let called=0;
  const result=await processGovernedEmployeeShiftTick({url:'stub',secretKey:'stub'},{
   fetchImpl:f.fetchImpl,
   wakeCapability:async()=>candidate.reconciled?.status==='NO_SHIFT_AWAITING_EXACT_WORK'?
    null:{status:'NO_EXACT_ACTIVE_ORIGINAL_JOB_TO_WAKE',
    original_job_completed:false,installation_authorized:false,production_changed:false},
   executeQualifiedOriginals:async()=>{called++;return originalOutcome}
  });
  assert.equal(called,0);
  assert.equal(result.job_completed,false);
 }
});
test('only exact independent source wake and original identity may reach driver',async()=>{
 const f=fakeDb(),executed=[];
 const result=await processGovernedEmployeeShiftTick({url:'stub',secretKey:'stub'},{
  fetchImpl:f.fetchImpl,
  wakeCapability:async()=>({...wake,original_work_id:'work:'+'b'.repeat(32)}),
  executeQualifiedOriginals:async args=>{executed.push(args);return originalOutcome}
 });
 assert.equal(executed.length,0);
 assert.equal(result.job_completed,false);
 assert.equal(result.installation_authorized,false);
});
