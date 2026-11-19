import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {executeOneRegisteredMaintenanceAction as execute}
 from '../src/reality-signed-maintenance-source-requalification-executor-v1.js';

const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const maintenance='05d1e1a9-8f9e-43a5-94ba-acd367cc2611';
const run='11111111-2222-4333-8444-555555555555';
const source='https://github.com/maloney2323/Reality/pull/308';
const hash=n=>'sha256:'+n.repeat(64);
const epoch=hash('a'),fresh=hash('b'),receipt=hash('c');
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw'};
const db={strictSecrets:true,secretKey:'mock-service-secret',
 project:'hvkfreoagbrphwghjajw'};
const claim={
 status:'SIGNED_MAINTENANCE_EXECUTOR_DURABLY_CLAIMED',
 maintenance_id:maintenance,shift_id:shift,worker_run_id:run,
 source_ref:source,source_epoch_receipt_sha256:epoch,
 next_action:'REQUALIFY_CHANGED_MAINTENANCE_SOURCE_BEFORE_CI',
 claim_attempt:1,lease_expires_at:new Date(Date.now()+600000).toISOString(),
 handoff_executed:false,independent_frozen_ci_red_verified:false,
 original_job_completed:false,installation_authorized:false,
 production_changed:false};
const recorded={
 status:'SIGNED_MAINTENANCE_SOURCE_REQUALIFIED_CI_RED_STILL_REQUIRED',
 maintenance_id:maintenance,shift_id:shift,source_ref:source,
 historical_epoch_receipt_sha256:epoch,
 verified_current_source_sha256:fresh,
 source_requalification_receipt_sha256:receipt,
 independent_signed_worker_run_id:run,source_requalified:true,
 frozen_ci_red_verified:false,repair_executed:false,
 original_job_completed:false,installation_authorized:false,
 production_changed:false};
function fixture({proposal=claim,readHash=fresh,secondHash=readHash,
 readError=false,verified=recorded, failure=null}={}){
 const calls=[],reads=[];
 return {calls,reads,
  call:async(_db,name,args)=>{
   calls.push({name,args});
   if(name==='reality_claim_registered_maintenance_action_v2')
    return proposal;
   if(name==='reality_record_signed_maintenance_source_requalification_v1')
    return verified;
   if(name==='reality_record_signed_maintenance_executor_failure_v1')
    return failure||{
     status:'MAINTENANCE_FAILURE_RECORDED_RETRYABLE',
     maintenance_id:maintenance,shift_id:shift,attempt_count:1,
     repair_executed:false,original_job_completed:false,production_changed:false};
   throw Error('UNEXPECTED_RPC_'+name);
  },
  readSource:async(ref)=>{
   reads.push(ref);
   if(readError)throw Error('PROVIDER_DOWN');
   return {source_ref:ref,provider_proof_sha256:
    reads.length===1?readHash:secondHash,
    checked_at:new Date().toISOString()};
  }
 };
}
test('the existing authorized shift runs a real requalification and persists a signed source receipt',async()=>{
 const f=fixture();
 const result=await execute({db,env,shiftId:shift,workerRunId:run,...f});
 assert.equal(result.status,'SIGNED_MAINTENANCE_SOURCE_REQUALIFIED_CI_RED_STILL_REQUIRED');
 assert.equal(result.shift_id,shift);
 assert.equal(result.maintenance_id,maintenance);
 assert.equal(result.source_requalification_receipt_sha256,receipt);
 assert.equal(result.source_requalified,true);
 assert.equal(result.claim_consumed,true);
 assert.equal(result.repair_executed,false);
 assert.equal(result.frozen_ci_red_verified,false);
 assert.equal(result.original_job_completed,false);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.production_changed,false);
 assert.deepEqual(f.reads,[source,source]);
 assert.deepEqual(f.calls.map(x=>x.name),[
  'reality_claim_registered_maintenance_action_v2',
  'reality_record_signed_maintenance_source_requalification_v1']);
 assert.equal(f.calls[0].args.p_registered_action,
  'REQUALIFY_CHANGED_MAINTENANCE_SOURCE_BEFORE_CI');
 assert.equal(f.calls[1].args.p_provider_sha256,fresh);
 assert.equal(f.calls[1].args.p_maintenance_id,maintenance);
});
test('case-specific CI RED missing an executor is NOT claimed and NEVER consumes retries',async()=>{
 const unready={
  status:'SIGNED_MAINTENANCE_ACTION_NOT_YET_EXECUTABLE',
  maintenance_id:'b7181e5b-a01c-4cb2-b191-10dea9dbe04f',
  shift_id:shift,next_action:'RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED',
  claimed:false,retry_consumed:false,
  repair_executed:false,original_job_completed:false,
  installation_authorized:false,production_changed:false};
 const f=fixture({proposal:unready});
 const result=await execute({db,env,shiftId:shift,workerRunId:run,...f});
 assert.equal(result.status,unready.status);
 assert.equal(result.claim_consumed,false);
 assert.equal(result.next_action,unready.next_action);
 assert.equal(result.repair_executed,false);
 assert.deepEqual(f.reads,[]);
 assert.deepEqual(f.calls.map(x=>x.name),
  ['reality_claim_registered_maintenance_action_v2']);
});
test('provider outage records an exact bounded retry instead of inventing repair',async()=>{
 const f=fixture({readError:true});
 const result=await execute({db,env,shiftId:shift,workerRunId:run,...f});
 assert.equal(result.status,'SOURCE_REQUALIFICATION_RETRYABLE_FAILURE');
 assert.equal(result.repair_executed,false);
 assert.equal(result.original_job_completed,false);
 assert.equal(f.calls[1].name,'reality_record_signed_maintenance_executor_failure_v1');
 assert.equal(f.calls[1].args.p_error_code,'SOURCE_PROVIDER_READBACK_UNAVAILABLE');
});
test('two disagreeing provider reads never create a requalification or repair receipt',async()=>{
 const f=fixture({secondHash:hash('d')});
 const result=await execute({db,env,shiftId:shift,workerRunId:run,...f});
 assert.equal(result.status,'SOURCE_REQUALIFICATION_RETRYABLE_FAILURE');
 assert.equal(result.repair_executed,false);
 assert.equal(f.calls[1].args.p_error_code,'SOURCE_CHANGED_DURING_REQUALIFICATION');
 assert.equal(f.calls.some(x=>x.name.includes('record_signed_maintenance_source_requalification')),
  false);
});
test('foreign/missing claim or untrusted durable receipt cannot authorize the worker',async()=>{
 const forged=fixture({proposal:{...claim,worker_run_id:
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}});
 await assert.rejects(execute({db,env,shiftId:shift,workerRunId:run,...forged}),
  /CLAIM_NOT_EXACT_OWNER_WARRANTED_ACTION/);
 assert.equal(forged.reads.length,0);
 const invalid=fixture({verified:{...recorded,
  repair_executed:true}});
 await assert.rejects(execute({db,env,shiftId:shift,workerRunId:run,...invalid}),
  /DURABLE_SOURCE_REQUALIFICATION_PROOF_UNTRUSTED/);
 await assert.rejects(execute({db,env:{...env,VERCEL_ENV:'production'},
   shiftId:shift,workerRunId:run,...fixture()}),
  /EXACT_SIGNED_PREVIEW_SCOPE_REQUIRED/);
});
test('worker is actually wired to registered action and SQL cannot report code repair from source only',()=>{
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261119234000_registered_signed_maintenance_source_executor_v1.sql',
  import.meta.url),'utf8');
 assert.match(worker,/executeOneRegisteredMaintenanceAction\(\{/);
 assert.match(worker,/REALITY_MAINTENANCE_EXECUTOR_CONNECTED/);
 const trustedRpc=readFileSync(new URL(
  '../src/reality-governed-shift-boundary-v1.js',import.meta.url),'utf8');
 assert.match(trustedRpc,/claim_registered_maintenance_action_v2/);
 assert.match(trustedRpc,/record_signed_maintenance_source_requalification_v1/);

 assert.doesNotMatch(worker,/p_error_code:'EXECUTOR_NOT_CONNECTED'/);
 assert.match(sql,/reality_claim_signed_maintenance_executor_v1\(/);
 assert.match(sql,/v_next_action<>p_registered_action/);
 assert.match(sql,/retry_consumed',false/);
 assert.match(sql,/source_requalification_receipt_sha256/);
 assert.match(sql,/source_requalified',true,'frozen_ci_red_verified',false/);
 assert.match(sql,/revoke all on function public.reality_claim_registered_maintenance_action_v2/);
 assert.doesNotMatch(sql,/update reality_internal.owner_internal_maintenance_jobs_v1\s+set phase='INTERNAL_REPAIR_VERIFIED_CLOSED'/);
});
