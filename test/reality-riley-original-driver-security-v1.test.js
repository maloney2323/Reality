// Security contract for the isolated #263 shift-to-original-executor bridge.
import test from 'node:test';
import assert from 'node:assert/strict';
import {processGovernedEmployeeShiftTick}
 from '../src/reality-governed-employee-shift-worker-v1.js';

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
 shift_id:SHIFT,original_work_id:WORK,
 worker_execution_acknowledged:false,original_job_completed:false,
 installation_authorized:false,production_changed:false};
const outcome={status:'SHIFT_TICK_OUTCOMES_RECORDED_RECHECK_MORE_AUTHORIZED_WORK',
 shift_id:SHIFT,attempted:1,independently_settled:0,
 outcomes:[{original_work_id:WORK,status:'SAME_ORIGINAL_JOB_SHARED_REPAIR_HANDOFF',
  original_job_settled:false}],
 shift_finished:false,full_shift_proven:false,
 installation_authorized:false,production_changed:false};
function rpcMock(reconciled=reconciliation,claim='EXACT_ORIGINAL_JOB_AUTHORITY_REQUIRED'){
 return async url=>({ok:true,json:async()=>url.includes('close_employee_shift')?
  {status:'NO_SHIFT_DUE_FOR_CLOSE'}:url.includes('reconcile_employee_shift_original')?
  reconciled:{status:claim,shift_id:SHIFT}});
}
const db={url:'https://isolated.example',secretKey:'stub'};
test('no trusted live driver stays visibly blocked without claiming a completed repair',async()=>{
 const r=await processGovernedEmployeeShiftTick(db,{
  fetchImpl:rpcMock(),wakeCapability:async()=>wake
 });
 assert.equal(r.status,'EXACT_ORIGINAL_JOB_AUTHORITY_REQUIRED');
 assert.equal(r.original_job_driver.status,'TRUSTED_ORIGINAL_DRIVER_NOT_CONNECTED');
 assert.equal(r.original_job_driver.attempted,0);
 assert.equal(r.job_completed,false);
 assert.equal(r.installation_authorized,false);
});
test('the executable driver never receives authority from a wake or source read alone',async()=>{
 let called=0;
 for(const [reconciled,claimed,receivedWake] of [
  [{...reconciliation,installation_authorized:true},undefined,wake],
  [{...reconciliation,governed_cycle_dispatched_by_shift:true},undefined,wake],
  [{...reconciliation,shift_observation_proof_sha256:'bad'},undefined,wake],
  [{...reconciliation,governed_trigger_id:'bad'},undefined,wake],
  [reconciliation,'NO_DUE_AUTHORIZED_SHIFT',wake],
  [reconciliation,undefined,{...wake,worker_execution_acknowledged:true}],
  [reconciliation,undefined,{...wake,original_job_completed:true}],
  [reconciliation,undefined,{...wake,shift_id:'33333333-4444-4555-8666-777777777777'}]
 ]){
  const r=await processGovernedEmployeeShiftTick(db,{
   fetchImpl:rpcMock(reconciled,claimed),
   wakeCapability:async()=>receivedWake,
   executeQualifiedOriginals:async()=>{called++;return outcome}
  });
  assert.equal(r.job_completed,false);
  assert.equal(r.original_job_driver,null);
 }
 assert.equal(called,0);
});
test('the worker rejects fabricated executor receipts and never relabels unverified work as settled',async()=>{
 for(const bad of [
  {...outcome,shift_id:'33333333-4444-4555-8666-777777777777'},
  {...outcome,installation_authorized:true},
  {...outcome,independently_settled:2},
  {...outcome,outcomes:[{...outcome.outcomes[0],original_job_settled:true}]},
  {...outcome,shift_finished:true},
  {...outcome,outcomes:[{original_work_id:'work:'+'b'.repeat(32)}]},
  {...outcome,outcomes:[outcome.outcomes[0],outcome.outcomes[0]]},
  {...outcome,status:'REPAIR_INSTALLED'},
 ]){
  await assert.rejects(processGovernedEmployeeShiftTick(db,{
   fetchImpl:rpcMock(),wakeCapability:async()=>wake,
   executeQualifiedOriginals:async()=>bad
  }),/SHIFT_ORIGINAL_DRIVER_INDEPENDENT_OUTCOME_UNVERIFIED/);
 }
});
