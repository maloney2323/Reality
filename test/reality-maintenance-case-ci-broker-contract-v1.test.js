import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {executeOneRegisteredMaintenanceCiWake as execute}
 from '../src/reality-signed-maintenance-case-ci-executor-v1.js';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const maint='b7181e5b-a01c-4cb2-b191-10dea9dbe04f';
const run='11111111-2222-4333-8444-555555555555';
const source='https://github.com/maloney2323/Reality/pull/307';
const hash='sha256:'+'a'.repeat(64);
const commit='b'.repeat(40);
const db={strictSecrets:true,project:'hvkfreoagbrphwghjajw',
 url:'https://hvkfreoagbrphwghjajw.supabase.co',
 secretKey:'mock-secret-never-actually-sent'};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw'};
const claim={status:'SIGNED_MAINTENANCE_EXECUTOR_DURABLY_CLAIMED',
 maintenance_id:maint,shift_id:shift,worker_run_id:run,
 source_ref:source,source_epoch_receipt_sha256:hash,
 next_action:'RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED',
 claim_attempt:1,lease_expires_at:new Date(Date.now()+600000).toISOString(),
 handoff_executed:false,independent_frozen_ci_red_verified:false,
 original_job_completed:false,installation_authorized:false,
 production_changed:false};
const receipt={ok:true,
 status:'SIGNED_MAINTENANCE_CASE_CI_DISPATCH_CONFIRMED_RED_NOT_VERIFIED',
 maintenance_id:maint,shift_id:shift,source_ref:source,
 github_trigger_commit_sha:commit,ci_dispatch_receipt_sha256:hash,
 frozen_ci_red_verified:false,repair_executed:false,
 original_job_completed:false,installation_authorized:false,
 production_changed:false};
function fixture({lease=claim,reply=receipt,responseOk=true}={}){
 const calls=[],requests=[];
 return {calls,requests,
  call:async(_db,name,args)=>{
   calls.push({name,args});
   if(name==='reality_claim_registered_maintenance_action_v2')return lease;
   if(name==='reality_record_signed_maintenance_executor_failure_v1')
    return {status:'MAINTENANCE_FAILURE_RECORDED_RETRYABLE',
     maintenance_id:maint,shift_id:shift,attempt_count:1,
     repair_executed:false,original_job_completed:false,
     production_changed:false};
   throw Error('UNEXPECTED_CI_RPC_'+name);
  },
  fetchImpl:async(url,opts)=>{requests.push({url,opts});
   return {ok:responseOk,json:async()=>reply};}
 };
}
test('one warrant-bound CI action reaches the trusted GitHub broker and returns only a dispatch receipt',async()=>{
 const f=fixture();
 const r=await execute({db,env,shiftId:shift,workerRunId:run,...f});
 assert.equal(r.status,receipt.status);
 assert.equal(r.case_ci_dispatch_confirmed,true);
 assert.equal(r.case_ci_red_verified,false);
 assert.equal(r.repair_executed,false);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.installation_authorized,false);
 assert.equal(r.production_changed,false);
 assert.equal(r.shift_id,shift);
 assert.equal(r.github_trigger_commit_sha,commit);
 assert.equal(f.calls.length,1);
 assert.equal(f.calls[0].args.p_registered_action,
  'RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED');
 assert.equal(f.requests.length,1);
 assert.match(f.requests[0].url,/\/functions\/v1\/reality-signed-maintenance-case-ci-broker-v1$/);
 assert.deepEqual(JSON.parse(f.requests[0].opts.body),
  {shift_id:shift,maintenance_id:maint,worker_run_id:run});
 assert.equal(f.requests[0].opts.method,'POST');
});
test('source requalification still takes precedence; no unsupported claim or external POST',async()=>{
 const no={status:'SIGNED_MAINTENANCE_ACTION_NOT_YET_EXECUTABLE',
  next_action:'REQUALIFY_CHANGED_MAINTENANCE_SOURCE_BEFORE_CI',
  repair_executed:false,original_job_completed:false,
  installation_authorized:false,production_changed:false};
 const f=fixture({lease:no});
 const r=await execute({db,env,shiftId:shift,workerRunId:run,...f});
 assert.equal(r.claim_consumed,false);
 assert.equal(r.repair_executed,false);
 assert.equal(f.requests.length,0);
});
test('unverified broker result fails closed and records a bounded retry, not a repair',async()=>{
 const f=fixture({reply:{...receipt,frozen_ci_red_verified:true}});
 const r=await execute({db,env,shiftId:shift,workerRunId:run,...f});
 assert.equal(r.status,'MAINTENANCE_FAILURE_RECORDED_RETRYABLE');
 assert.equal(r.case_ci_red_verified,false);
 assert.equal(r.repair_executed,false);
 assert.equal(f.calls[1].name,
  'reality_record_signed_maintenance_executor_failure_v1');
 assert.equal(f.calls[1].args.p_error_code,'MAINTENANCE_CI_DELIVERY_UNVERIFIED');
});
test('foreign lease and production execution are rejected before CI submission',async()=>{
 const f=fixture({lease:{...claim,worker_run_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}});
 await assert.rejects(execute({db,env,shiftId:shift,workerRunId:run,...f}),
  /EXACT_OWNER_SIGNED_CI_CLAIM_NOT_VERIFIED/);
 assert.equal(f.requests.length,0);
 await assert.rejects(execute({db,env:{...env,VERCEL_ENV:'production'},
  shiftId:shift,workerRunId:run,...fixture()}),
 /EXACT_SIGNED_SHIFT_AND_SERVICE_REQUIRED/);
});
test('CI broker, workflow and DB close no customer original and cannot invent a frozen RED',()=>{
 const sql=read('supabase/migrations/20261119235500_signed_maintenance_case_ci_dispatch_v1.sql');
 const broker=read('supabase/functions/reality-signed-maintenance-case-ci-broker-v1/index.ts');
 const worker=read('api/reality/governed-employee-shift-worker.js');
 const runner=read('scripts/reality-maintenance-signed-case-ci-runner-v1.mjs');
 const workflow=read('.github/workflows/reality-registered-signed-maintenance-executor-v1.yml');
 assert.match(sql,/independent_frozen_test_receipt_sha256 is null/);
 assert.match(sql,/reality_read_signed_maintenance_ci_dispatch_scope_v1/);
 assert.match(sql,/reality_record_signed_maintenance_ci_dispatch_v1/);
 assert.match(sql,/red_verified',false/);
 assert.doesNotMatch(sql,/update reality_internal\.owner_internal_maintenance_jobs_v1\s+set/);
 assert.match(broker,/REALITY_GITHUB_BROKER_TOKEN/);
 assert.match(broker,/reality_read_signed_maintenance_ci_dispatch_scope_v1/);
 assert.match(broker,/reality_record_signed_maintenance_ci_dispatch_v1/);
 assert.match(broker,/reality-maintenance-ci-triggers\//);
 assert.doesNotMatch(broker,/installation_authorized:true/);
 assert.match(worker,/executeOneRegisteredMaintenanceCiWake\(\{/);
 assert.match(workflow,/reality-maintenance-ci-triggers\/\*\*/);
 assert.match(workflow,/permissions:\s*\n\s*contents: read/);
 assert.match(runner,/case_specific_original_failure_reproduced:false/);
 assert.match(runner,/executable_frozen_ci_red_verified:false/);
 assert.match(runner,/original_job_completed:false/);
 assert.match(runner,/production_changed:false/);
});

test('same authorized PR #308 advances from completed source requalification to signed CI',async()=>{
 const stageId='05d1e1a9-8f9e-43a5-94ba-acd367cc2611';
 const ref='https://github.com/maloney2323/Reality/pull/308';
 const sourceReceipt='sha256:'+'c'.repeat(64);
 const currentSource='sha256:'+'d'.repeat(64);
 const oldRun='aaaaaaa0-0000-4000-8000-000000000001';
 const no={status:'NO_UNCLAIMED_AUTHORIZED_MAINTENANCE_EXECUTOR',
  original_job_completed:false,repair_executed:false,
  installation_authorized:false,production_changed:false};
 const stage={status:'SIGNED_REQUALIFIED_MAINTENANCE_CI_NEEDS_FRESH_SOURCE',
  maintenance_id:stageId,shift_id:shift,
  owner_id:'85eeae0b-2988-43c4-b20c-590fb51da70d',
  original_requalification_worker_run_id:oldRun,source_ref:ref,
  source_epoch_receipt_sha256:hash,
  source_requalification_receipt_sha256:sourceReceipt,
  requalified_provider_sha256:currentSource,
  claim_consumed:false,frozen_ci_red_verified:false,repair_executed:false,
  original_job_completed:false,installation_authorized:false,
  production_changed:false};
 const lease={...claim,maintenance_id:stageId,source_ref:ref,
  source_requalification_receipt_sha256:sourceReceipt,
  requalified_provider_sha256:currentSource};
 const resultReceipt={...receipt,maintenance_id:stageId,source_ref:ref};
 const calls=[],requests=[],reads=[];
 const call=async(_db,name,args)=>{
  calls.push({name,args});
  if(name==='reality_claim_registered_maintenance_action_v2')return no;
  if(name==='reality_read_requalified_maintenance_ci_preflight_v1')return stage;
  if(name==='reality_promote_requalified_maintenance_to_ci_claim_v1')
   return lease;
  throw Error('UNEXPECTED_REQUAL_CI_RPC_'+name);
 };
 const readSource=async value=>{
  reads.push(value);
  return {source_ref:ref,provider_proof_sha256:currentSource,
   checked_at:new Date().toISOString()};
 };
 const fetchImpl=async (url,opts)=>{
  requests.push({url,opts});
  return {ok:true,json:async()=>({...resultReceipt})};
 };
 const result=await execute({db,env,shiftId:shift,workerRunId:run,
  call,readSource,fetchImpl});
 assert.equal(result.case_ci_dispatch_confirmed,true);
 assert.equal(result.repair_executed,false);
 assert.equal(result.original_job_completed,false);
 assert.equal(result.maintenance_id,stageId);
 assert.deepEqual(reads,[ref,ref]);
 assert.deepEqual(calls.map(c=>c.name),[
  'reality_claim_registered_maintenance_action_v2',
  'reality_read_requalified_maintenance_ci_preflight_v1',
  'reality_promote_requalified_maintenance_to_ci_claim_v1']);
 assert.equal(calls[2].args.p_provider_sha256,currentSource);
 assert.equal(requests.length,1);
 assert.equal(JSON.parse(requests[0].opts.body).maintenance_id,stageId);
});
test('source drift after a legitimate requalification preserves the old receipt and spends zero retries',async()=>{
 const no={status:'NO_UNCLAIMED_AUTHORIZED_MAINTENANCE_EXECUTOR',
  original_job_completed:false,repair_executed:false,
  installation_authorized:false,production_changed:false};
 const pre={status:'SIGNED_REQUALIFIED_MAINTENANCE_CI_NEEDS_FRESH_SOURCE',
  maintenance_id:'05d1e1a9-8f9e-43a5-94ba-acd367cc2611',shift_id:shift,
  owner_id:'85eeae0b-2988-43c4-b20c-590fb51da70d',
  original_requalification_worker_run_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  source_ref:'https://github.com/maloney2323/Reality/pull/308',
  source_epoch_receipt_sha256:hash,
  source_requalification_receipt_sha256:hash,
  requalified_provider_sha256:hash,
  claim_consumed:false,frozen_ci_red_verified:false,repair_executed:false,
  original_job_completed:false,installation_authorized:false,
  production_changed:false};
 const calls=[],requests=[];
 const result=await execute({db,env,shiftId:shift,workerRunId:run,
  call:async(_db,name)=>{
   calls.push(name);
   if(name==='reality_claim_registered_maintenance_action_v2')return no;
   if(name==='reality_read_requalified_maintenance_ci_preflight_v1')return pre;
   throw Error('SHOULD_NOT_PROMOTE_DRIFTED_SOURCE');
  },
  readSource:async()=>({
   source_ref:pre.source_ref,
   provider_proof_sha256:'sha256:'+'f'.repeat(64),
   checked_at:new Date().toISOString()
  }),
  fetchImpl:async(url)=>{requests.push(url);throw Error('NO_TRANSPORT');}
 });
 assert.equal(result.status,'REQUALIFIED_CI_PROVIDER_SOURCE_CHANGED_AFTER_RECEIPT');
 assert.equal(result.claim_consumed,false);
 assert.equal(result.repair_executed,false);
 assert.equal(result.original_job_completed,false);
 assert.deepEqual(calls,[
  'reality_claim_registered_maintenance_action_v2',
  'reality_read_requalified_maintenance_ci_preflight_v1']);
 assert.deepEqual(requests,[]);
});
test('same incident stage transition retains first receipt and signed owner in SQL',()=>{
 const fs=read('supabase/migrations/20261120001000_signed_maintenance_requalified_ci_continuation_v1.sql');
 const boundary=read('src/reality-governed-shift-boundary-v1.js');
 const worker=read('api/reality/governed-employee-shift-worker.js');
 assert.match(fs,/requalification_worker_run_id/);
 assert.match(fs,/requalification_receipt_sha256/);
 assert.match(fs,/worker_run_id=p_worker_run_id,attempt_count=1/);
 assert.match(fs,/reality_read_requalified_maintenance_ci_preflight_v1/);
 assert.match(fs,/reality_promote_requalified_maintenance_to_ci_claim_v1/);
 assert.match(fs,/w\.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'/);
 assert.match(fs,/MAINTENANCE_SOURCE_CHANGED_AFTER_REQUALIFICATION/);
 assert.match(boundary,/read_requalified_maintenance_ci_preflight_v1/);
 assert.match(boundary,/promote_requalified_maintenance_to_ci_claim_v1/);
 assert.match(worker,/NO_UNCLAIMED_AUTHORIZED_MAINTENANCE_EXECUTOR/);
 assert.doesNotMatch(fs,/grant execute[^;]*to (anon|authenticated)/i);
});
