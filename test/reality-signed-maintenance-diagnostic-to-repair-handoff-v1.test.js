import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {advanceSignedExistingMaintenanceRepairHandoff}
 from '../src/reality-signed-maintenance-repair-handoff-v1.js';
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const run='77da260f-5768-432a-97bf-1127b4126f7d';
const incident='b7181e5b-a01c-4cb2-b191-10dea9dbe04f';
const original='work:315562fe1bd66b30a48bb9be4f1d162a';
const hash=x=>'sha256:'+x.repeat(64);
const db={strictSecrets:true,secretKey:'example-TEST-ONLY-not-real',
 project:'hvkfreoagbrphwghjajw',url:'https://example.test'};
const env={VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:db.project};
const receipt={
 status:'EXISTING_SIGNED_MAINTENANCE_REPAIR_WORK_ADMITTED',
 owner_id:owner,shift_id:shift,maintenance_id:incident,
 source_ref:'https://github.com/maloney2323/Reality/pull/307',
 existing_original_work_id:original,
 handoff_receipt_sha256:hash('a'),
 independent_baseline_receipt_sha256:hash('b'),
 independent_diagnostic_receipt_sha256:hash('c'),
 source_epoch_receipt_sha256:hash('d'),
 next_action:'GENERATE_AND_INDEPENDENTLY_TEST_CASE_SPECIFIC_FROZEN_RED',
 work_order_created:true,frozen_ci_red_verified:false,
 repair_executed:false,original_job_completed:false,
 installation_authorized:false,production_changed:false,
 new_shift_started:false
};
test('the signed worker admits real existing maintenance repair work without inventing successful execution',async()=>{
 const calls=[];
 const x=await advanceSignedExistingMaintenanceRepairHandoff({
  db,env,shiftId:shift,workerRunId:run,
  call:async(_db,method,args)=>{
   calls.push({method,args});return receipt;
  },
  fetchImpl:async()=>{throw Error('NO_PROVIDER_CALL_ALLOWED')}
 });
 assert.equal(x.status,'EXISTING_SIGNED_MAINTENANCE_REPAIR_WORK_ADMITTED');
 assert.equal(x.existing_original_work_id,original);
 assert.equal(x.existing_owner_shift_preserved,true);
 assert.equal(x.repair_executed,false);
 assert.equal(x.independently_tested_repair,false);
 assert.equal(x.original_job_completed,false);
 assert.deepEqual(calls,[{
  method:'reality_admit_existing_signed_maintenance_repair_handoff_v1',
  args:{p_shift_id:shift,p_worker_run_id:run}
 }]);
});
test('a separate maintenance incident need not manufacture an unrelated customer original',async()=>{
 const r=await advanceSignedExistingMaintenanceRepairHandoff({
  db,env,shiftId:shift,workerRunId:run,
  call:async()=>({...receipt,maintenance_id:'05d1e1a9-8f9e-43a5-94ba-acd367cc2611',
   source_ref:'https://github.com/maloney2323/Reality/pull/308',
   existing_original_work_id:null})
 });
 assert.equal(r.existing_original_work_id,null);
 assert.equal(r.customer_original_created,false);
 assert.equal(r.new_shift_started,false);
});
test('an already consumed source-bound work order is not sent twice',async()=>{
 let calls=0;
 const r=await advanceSignedExistingMaintenanceRepairHandoff({
  db,env,shiftId:shift,workerRunId:run,
  call:async()=>{calls++;return {
   status:'NO_NEW_SIGNED_MAINTENANCE_REPAIR_HANDOFF_ELIGIBLE',
   work_order_created:false,frozen_ci_red_verified:false,
   repair_executed:false,original_job_completed:false,
   installation_authorized:false,production_changed:false,
   new_shift_started:false
  }}
 });
 assert.equal(calls,1);
 assert.equal(r.work_order_created,false);
 assert.equal(r.repair_executed,false);
});
test('a forged installation, wrong shift, or false customer receipt fails closed',async()=>{
 for(const fake of [
  {...receipt,installation_authorized:true},
  {...receipt,original_job_completed:true},
  {...receipt,shift_id:'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'},
  {...receipt,next_action:'INSTALL_WITHOUT_TEST'},
  {...receipt,independent_diagnostic_receipt_sha256:null},
  {...receipt,new_shift_started:true},
 ]){
  await assert.rejects(
   advanceSignedExistingMaintenanceRepairHandoff({
    db,env,shiftId:shift,workerRunId:run,
    call:async()=>fake
   }),/SIGNED_MAINTENANCE_REPAIR_HANDOFF_EXACT_SOURCE_BOUND_REPAIR_ORDER_RECEIPT_INVALID/);
 }
});
test('SQL always checks the original signed warrant, worker, frozen baseline, and CI diagnostic',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261120124000_signed_existing_maintenance_repair_handoff_v1.sql',
  import.meta.url),'utf8');
 for(const requirement of [
  "current_user<>'service_role'","w.state='ACTIVE'",
  "w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'",
  "m.claimed_shift_id=s.shift_id",
  "c.ci_independent_diagnostic_receipt_sha256",
  "m.independent_frozen_test_receipt_sha256 is null",
  "run.status='STARTED'",
  "pulse.last_worker_status='WAKE_RECEIVED'",
  "c.requalification_receipt_sha256",
  "on conflict(maintenance_id) do nothing",
  "for update of m skip locked",
  "revoke all on function"
 ])assert.ok(sql.includes(requirement),requirement);
 assert.doesNotMatch(sql,/insert into reality_internal\.governed_employee_shifts_v1/);
 assert.doesNotMatch(sql,/update reality_internal\.owner_internal_maintenance_jobs_v1/);
 assert.doesNotMatch(sql,/net\.http_post/);
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(worker,/advanceSignedExistingMaintenanceRepairHandoff\(\{/);
 assert.match(worker,/workerRunId:actualWorkerRunId/);
 assert.match(worker,/signed_maintenance_diagnostic_to_repair_handoff:signedMaintenanceRepairHandoff/);
});
