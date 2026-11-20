// This frozen executable regression is for the PR #308 maintenance execution
// handoff: a signed source-requalification receipt must lead into the existing
// warranted CI stage on the SAME shift, not strand its maintenance identity.
// Run these unchanged bytes against pre-fix commit e9177227... (RED) and the
// candidate commit (GREEN). Do not equate this with PR #308's original source
// epoch failure being independently reproduced or any code installation.
import test from 'node:test';
import assert from 'node:assert/strict';
import {executeOneRegisteredMaintenanceCiWake} from
 '../../src/reality-signed-maintenance-case-ci-executor-v1.js';
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const incident='05d1e1a9-8f9e-43a5-94ba-acd367cc2611';
const source='https://github.com/maloney2323/Reality/pull/308';
const originalRun='20169376-d4f4-4bfc-a519-42f902e13f35';
const nextRun='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const h=x=>'sha256:'+x.repeat(64);
const epoch=h('a');
const sourceProof='sha256:12453faf76772833bed4b807d859005f9e1da9948d3ed76d6097ab0e3aea7ca2';
const requalificationReceipt='sha256:b01ee8b8d8351f9dba990a7deb48a305ba5b91d2768ffaffecbb56fa38dea1cf';
const db={strictSecrets:true,project:'hvkfreoagbrphwghjajw',
 url:'https://hvkfreoagbrphwghjajw.supabase.co',
 secretKey:'frozen-fixture-inert-owner-scope-only'};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:db.project};
const empty={status:'NO_UNCLAIMED_AUTHORIZED_MAINTENANCE_EXECUTOR',
 repair_executed:false,original_job_completed:false,
 installation_authorized:false,production_changed:false};
const preflight={status:'SIGNED_REQUALIFIED_MAINTENANCE_CI_NEEDS_FRESH_SOURCE',
 shift_id:shift,owner_id:owner,maintenance_id:incident,source_ref:source,
 source_epoch_receipt_sha256:epoch,
 source_requalification_receipt_sha256:requalificationReceipt,
 requalified_provider_sha256:sourceProof,
 original_requalification_worker_run_id:originalRun,
 claim_consumed:false,frozen_ci_red_verified:false,repair_executed:false,
 original_job_completed:false,installation_authorized:false,
 production_changed:false};
const claimed={
 status:'SIGNED_MAINTENANCE_EXECUTOR_DURABLY_CLAIMED',
 shift_id:shift,worker_run_id:nextRun,maintenance_id:incident,
 source_ref:source,source_epoch_receipt_sha256:epoch,
 source_requalification_receipt_sha256:requalificationReceipt,
 requalified_provider_sha256:sourceProof,
 next_action:'RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED',
 claim_attempt:1,lease_expires_at:new Date(Date.now()+300000).toISOString(),
 handoff_executed:false,independent_frozen_ci_red_verified:false,
 original_job_completed:false,installation_authorized:false,
 production_changed:false};
const delivered={ok:true,
 status:'SIGNED_MAINTENANCE_CASE_CI_DISPATCH_CONFIRMED_RED_NOT_VERIFIED',
 shift_id:shift,maintenance_id:incident,source_ref:source,
 github_trigger_commit_sha:'b'.repeat(40),
 ci_dispatch_receipt_sha256:h('c'),
 frozen_ci_red_verified:false,repair_executed:false,
 original_job_completed:false,installation_authorized:false,
 production_changed:false};
test('PR308 previously requalified signed maintenance must advance to exact CI on same shift',async()=>{
 const calls=[],reads=[],posts=[];
 const result=await executeOneRegisteredMaintenanceCiWake({
  db,env,shiftId:shift,workerRunId:nextRun,
  call:async(_db,name,args)=>{
   calls.push({name,args});
   if(name==='reality_claim_registered_maintenance_action_v2')
    return empty;
   if(name==='reality_read_requalified_maintenance_ci_preflight_v1')
    return preflight;
   if(name==='reality_promote_requalified_maintenance_to_ci_claim_v1')
    return claimed;
   throw Error('FROZEN_UNAUTHORIZED_RPC_'+name);
  },
  readSource:async ref=>{
   reads.push(ref);
   return {source_ref:ref,provider_proof_sha256:sourceProof,
    checked_at:new Date().toISOString()};
  },
  fetchImpl:async(url,options)=>{
   posts.push({url,options});
   return {ok:true,json:async()=>delivered};
  }
 });
 assert.equal(result.case_ci_dispatch_confirmed,true,
  'frozen PR308 regression: a completed requalification must not strand CI');
 assert.equal(result.status,delivered.status);
 assert.equal(result.shift_id,shift);
 assert.equal(result.maintenance_id,incident);
 assert.equal(result.original_job_completed,false);
 assert.equal(result.repair_executed,false);
 assert.equal(result.case_ci_red_verified,false);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.production_changed,false);
 assert.deepEqual(calls.map(x=>x.name),[
  'reality_claim_registered_maintenance_action_v2',
  'reality_read_requalified_maintenance_ci_preflight_v1',
  'reality_promote_requalified_maintenance_to_ci_claim_v1']);
 assert.equal(calls[2].args.p_maintenance_id,incident);
 assert.equal(calls[2].args.p_provider_sha256,sourceProof);
 assert.deepEqual(reads,[source,source]);
 assert.equal(posts.length,1);
 assert.deepEqual(JSON.parse(posts[0].options.body),
  {shift_id:shift,maintenance_id:incident,worker_run_id:nextRun});
});
