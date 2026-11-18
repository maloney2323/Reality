import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shiftRpc} from '../src/reality-governed-shift-boundary-v1.js';
import {advanceOneSignedInternalMaintenanceJob}
 from '../src/reality-signed-internal-maintenance-worker-v1.js';
const owner='11111111-2222-4333-8444-555555555555';
const shift='22222222-3333-4444-8555-666666666666';
const origin='33333333-4444-4555-8666-777777777777';
const incident='44444444-5555-4666-8777-888888888888';
const run='55555555-6666-4777-8888-999999999999';
const claimId='66666666-7777-4888-8999-aaaaaaaaaaaa';
const hash=s=>'sha256:'+s.repeat(64);
const ref='https://github.com/maloney2323/Reality/pull/308';
const db={strictSecrets:true,secretKey:'test-only',url:'https://fixture.supabase.co',project:'sandbox'};
const env={VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'sandbox'};
const claim={status:'SIGNED_INTERNAL_MAINTENANCE_CLAIMED',
 owner_id:owner,maintenance_id:incident,origin_shift_id:origin,
 claim_shift_id:shift,worker_run_id:run,claim_id:claimId,
 kind:'EMPLOYEE_QUALIFICATION_HANDOFF_STALLED',
 assignee:'Riley',independent_reviewer:'Quinn',source_ref:ref,
 prior_source_sha256:hash('a'),independent_review_receipt_sha256:hash('b'),
 new_customer_work_created:false,customer_job_completed:false,
 repair_executed:false,installation_authorized:false,production_changed:false};
const rolesBuilder=()=>({roles:[{employee_name:'Riley'},
 {employee_name:'Quinn'}]});
function setup(claimed=claim){
 const calls=[];
 const call=async(_db,method,args)=>{
  calls.push({method,args});
  if(method==='reality_claim_signed_internal_maintenance_v1')return claimed;
  if(method==='reality_record_signed_internal_maintenance_recheck_v1')
   return {status:'INTERNAL_MAINTENANCE_SOURCE_REOBSERVED',
    maintenance_id:incident,owner_id:owner,source_ref:ref,assignee:'Riley',
    source_readback_receipt_sha256:hash('c'),
    next_action:'REPRODUCE_EXACT_ADMISSION_HANDOFF_CAUSE_BEFORE_SOFTWARE_REPAIR',
    independent_frozen_test_completed:false,new_customer_work_created:false,
    customer_job_completed:false,repair_executed:false,
    installation_authorized:false,production_changed:false};
  throw Error('FORBIDDEN_RPC_'+method);
 };
 return {calls,call};
}
const source=()=>({source_ref:ref,provider_proof_sha256:hash('d'),
 checked_at:'2026-11-17T23:58:00Z'});
test('Reality employee handles prior-shift maintenance with independent provider recheck',async()=>{
 const f=setup();let observations=0;
 const x=await advanceOneSignedInternalMaintenanceJob({
  db,env,shiftId:shift,workerRunId:run,
  call:f.call,rolesBuilder,
  readSource:async()=>{observations++;return source()},
  fetchImpl:async()=>{throw Error('UNEXPECTED_PROVIDER')}
 });
 assert.equal(observations,2);
 assert.equal(f.calls[0].method,'reality_claim_signed_internal_maintenance_v1');
 assert.deepEqual(f.calls[0].args,{p_shift_id:shift,p_worker_run_id:run});
 assert.equal(f.calls[1].method,'reality_record_signed_internal_maintenance_recheck_v1');
 assert.equal(x.source_reobservation_completed,true);
 assert.equal(x.same_internal_work_preserved,true);
 assert.equal(x.originating_shift_id,origin);
 assert.equal(x.shift_id,shift);
 assert.equal(x.source_epoch_changed,true);
 assert.equal(x.customer_job_completed,false);
 assert.equal(x.independent_frozen_test_completed,false);
 assert.equal(x.repair_executed,false);
 assert.equal(x.installation_authorized,false);
});
test('missing shift-authorization produces no maintenance claim',async()=>{
 const f=setup({status:'NO_AUTHORIZED_INTERNAL_MAINTENANCE_JOB_READY',
  new_customer_work_created:false,customer_job_completed:false,
  repair_executed:false,installation_authorized:false,
  production_changed:false});
 const x=await advanceOneSignedInternalMaintenanceJob({
  db,env,shiftId:shift,workerRunId:run,call:f.call,
  rolesBuilder,readSource:async()=>{throw Error('SHOULD_NOT_READ')},
  fetchImpl:async()=>{throw Error('SHOULD_NOT_FETCH')}
 });
 assert.equal(x.maintenance_job_claimed,false);
 assert.equal(f.calls.length,1);
});
test('unverified provider and changing source cannot be counted as repair',async()=>{
 let count=0;const f=setup();
 const x=await advanceOneSignedInternalMaintenanceJob({
  db,env,shiftId:shift,workerRunId:run,call:f.call,rolesBuilder,
  readSource:async()=>({...source(),
   provider_proof_sha256:hash(++count===1?'d':'e')}),
  fetchImpl:async()=>{throw Error('UNEXPECTED')}
 });
 assert.equal(x.status,'SIGNED_INTERNAL_MAINTENANCE_UNSTABLE_SOURCE');
 assert.equal(x.repair_executed,false);
 assert.equal(f.calls.length,1);
});
test('model-forged approval and customer settlement cannot pass exact reviewer claim',async()=>{
 const f=setup({...claim,installation_authorized:true});
 await assert.rejects(advanceOneSignedInternalMaintenanceJob({
  db,env,shiftId:shift,workerRunId:run,call:f.call,rolesBuilder,
  readSource:async()=>{throw Error('SHOULD_NOT_READ')},
  fetchImpl:async()=>{throw Error('SHOULD_NOT_FETCH')}
 }),/SIGNED_INTERNAL_MAINTENANCE_OWNER_INCIDENT_AND_PROOF_BOUND_CLAIM_INVALID/);
 assert.equal(f.calls.length,1);
});
test('maintenance RPCs are bound to shared signed transport, unknown RPC denied',async()=>{
 for(const name of ['reality_claim_signed_internal_maintenance_v1',
  'reality_record_signed_internal_maintenance_recheck_v1']){
  const x=await shiftRpc(db,name,{p_shift_id:shift},{
   fetchImpl:async(url,opts)=>{
    assert.equal(url,db.url+'/rest/v1/rpc/'+name);
    assert.equal(opts.method,'POST');
    return{ok:true,json:async()=>({status:'TEST_TRANSPORT'})};
   }
  });
  assert.equal(x.status,'TEST_TRANSPORT');
 }
 await assert.rejects(shiftRpc(db,'reality_fake_install_unrestricted_v1',{},
  {fetchImpl:async()=>{throw Error('SHOULD_NOT_FETCH')}}),
  /SHIFT_RPC_NOT_ALLOWLISTED/);
});
test('maintenance claim is owner/shift/signed-run bound and preserves failed attempts',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261117_signed_internal_maintenance_worker_claim_v17.sql',
  import.meta.url),'utf8');
 assert.match(sql,/join reality_internal\.signed_worker_actual_runs_v1 run/);
 assert.match(sql,/run\.status='STARTED'/);
 assert.match(sql,/s\.owner_id=m\.owner_id/);
 assert.match(sql,/s\.closed_at is null/);
 assert.match(sql,/s\.planned_end_at>clock_timestamp\(\)/);
 assert.match(sql,/for update of m skip locked/);
 assert.match(sql,/claim_attempts between 0 and 2/);
 assert.match(sql,/claim_failure_history=m\.claim_failure_history\|\|/);
 assert.match(sql,/independent_source_observation_receipt_sha256/);
 assert.match(sql,/reconcile_stale_internal_maintenance_claims_v1/);
 assert.match(sql,/jobname='reality-governed-wake-watchdog-v1'/);
 assert.doesNotMatch(sql,/cron\.schedule\(|insert into reality_internal\.governed_employee_shifts_v1/);
 assert.doesNotMatch(sql,/grant execute[^;]+to (anon|authenticated)/is);
});
test('signed shift worker actually invokes maintenance lane, not just static job cards',()=>{
 const code=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(code,/advanceOneSignedInternalMaintenanceJob\(\{/);
 assert.match(code,/signed_internal_maintenance_work:internalMaintenanceWork/);
 assert.match(code,/workerRunId:actualWorkerRunId/);
 assert.match(code,/NO_ACTIVE_OWNER_SHIFT_FOR_INTERNAL_MAINTENANCE/);
});
