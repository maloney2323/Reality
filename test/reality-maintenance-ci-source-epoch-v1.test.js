import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {attestOneSignedMaintenanceCiSourceEpoch} from '../src/reality-signed-maintenance-ci-source-epoch-v1.js';
import {shiftRpc} from '../src/reality-governed-shift-boundary-v1.js';
const shift='22222222-3333-4444-8555-666666666666';
const owner='11111111-2222-4333-8444-555555555555';
const origin='33333333-4444-4333-8444-555555555555';
const maintenance='44444444-5555-4333-8444-555555555555';
const worker='55555555-6666-4333-8444-555555555555';
const source='https://github.com/maloney2323/Reality/pull/307';
const hash=c=>'sha256:'+c.repeat(64);
const env={VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'sandbox'};
const db={strictSecrets:true,project:'sandbox',secretKey:'test-only',url:'https://db.example'};
const preflight={status:'SIGNED_MAINTENANCE_CI_PREFLIGHT_NEEDS_SOURCE_ATTESTATION',
 owner_id:owner,shift_id:shift,origin_shift_id:origin,maintenance_id:maintenance,
 source_ref:source,independent_review_receipt_sha256:hash('a'),
 independent_failure_baseline_receipt_sha256:hash('b'),
 historical_source_sha256:hash('c'),source_current_epoch_verified:false,
 executable_frozen_ci_red_verified:false,repair_executed:false,
 original_job_completed:false,installation_authorized:false,production_changed:false};
function setup(sha=hash('c'),state='SOURCE_EPOCH_ATTESTED_EXECUTABLE_RED_REQUIRED'){
 const calls=[];let reads=0;
 return {calls,get reads(){return reads},readSource:async()=>{reads++;return{
  source_ref:source,provider_proof_sha256:sha,checked_at:new Date().toISOString()}},
 call:async(_db,method,payload)=>{calls.push({method,payload});return {
  status:state,owner_id:owner,shift_id:shift,origin_shift_id:origin,
  maintenance_id:maintenance,worker_run_id:worker,source_ref:source,
  historical_baseline_receipt_sha256:hash('b'),historical_source_sha256:hash('c'),
  current_provider_sha256:sha,source_epoch_receipt_sha256:hash('d'),
  source_current_epoch_verified:state==='SOURCE_EPOCH_ATTESTED_EXECUTABLE_RED_REQUIRED',
  independent_frozen_ci_red_verified:false,repair_executed:false,
  original_job_completed:false,installation_authorized:false,production_changed:false
 }}};
}
test('signed maintenance source checked twice and durable source epoch recorded',async()=>{
 const x=setup();const y=await attestOneSignedMaintenanceCiSourceEpoch({
 db,env,shiftId:shift,workerRunId:worker,preflight,
 call:x.call,readSource:x.readSource});
 assert.equal(x.reads,2);assert.equal(x.calls.length,1);
 assert.equal(x.calls[0].method,'reality_record_signed_maintenance_ci_source_epoch_v1');
 assert.equal(x.calls[0].payload.p_maintenance_id,maintenance);
 assert.equal(y.source_current_epoch_verified,true);
 assert.equal(y.independent_frozen_ci_red_verified,false);
 assert.equal(y.original_job_completed,false);
});
test('source epoch change is durably detected without CI-red claim',async()=>{
 const x=setup(hash('e'),'SOURCE_EPOCH_CHANGED_REQUALIFICATION_REQUIRED');
 const y=await attestOneSignedMaintenanceCiSourceEpoch({
 db,env,shiftId:shift,workerRunId:worker,preflight,call:x.call,readSource:x.readSource});
 assert.equal(y.source_current_epoch_verified,false);
 assert.equal(y.status,'SOURCE_EPOCH_CHANGED_REQUALIFICATION_REQUIRED');
});
test('unstable source and no signed scope fail without writes',async()=>{
 const x=setup();let k=0;
 const r=await attestOneSignedMaintenanceCiSourceEpoch({
 db,env,shiftId:shift,workerRunId:worker,preflight,call:x.call,
 readSource:async()=>({source_ref:source,checked_at:new Date().toISOString(),
 provider_proof_sha256:hash(++k===1?'c':'e')})});
 assert.equal(r.status,'SIGNED_MAINTENANCE_CI_PROVIDER_EPOCH_NOT_STABLE');
 assert.equal(x.calls.length,0);
 const no=await attestOneSignedMaintenanceCiSourceEpoch({
 db,env,shiftId:shift,workerRunId:worker,
 preflight:{status:'NO_SIGNED_MAINTENANCE_FROZEN_CI_SCOPE'},
 call:x.call,readSource:x.readSource});
 assert.equal(no.maintenance_source_attestation_attempted,false);
 assert.equal(x.calls.length,0);
});
test('forged approval and forged completed receipt are rejected',async()=>{
 const x=setup();
 await assert.rejects(attestOneSignedMaintenanceCiSourceEpoch({
 db,env,shiftId:shift,workerRunId:worker,
 preflight:{...preflight,installation_authorized:true},
 call:x.call,readSource:x.readSource}),/EXACT_SIGNED_OWNER_BASELINE_UNTRUSTED/);
 assert.equal(x.calls.length,0);
 const bad=setup();
 await assert.rejects(attestOneSignedMaintenanceCiSourceEpoch({
 db,env,shiftId:shift,workerRunId:worker,preflight,
 call:async(...a)=>({...await bad.call(...a),original_job_completed:true}),
 readSource:bad.readSource}),/DURABLE_SOURCE_EPOCH_RECEIPT_UNTRUSTED/);
});
test('signed transport allowlists one source epoch RPC, denies installation',async()=>{
 const r=await shiftRpc(db,'reality_record_signed_maintenance_ci_source_epoch_v1',{},{
 fetchImpl:async(url)=>{assert.equal(url,db.url+
 '/rest/v1/rpc/reality_record_signed_maintenance_ci_source_epoch_v1');
 return{ok:true,json:async()=>({status:'TEST'})}}});
 assert.equal(r.status,'TEST');
 await assert.rejects(shiftRpc(db,'reality_maintenance_unrestricted_install_v1',{},{
 fetchImpl:async()=>{throw Error('BAD')}}),/SHIFT_RPC_NOT_ALLOWLISTED/);
});
test('existing signed worker actually calls and returns source epoch result',()=>{
 const s=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(s,/attestOneSignedMaintenanceCiSourceEpoch\(/);
 assert.match(s,/preflight:signedMaintenanceCiPreflight/);
 assert.match(s,/workerRunId:actualWorkerRunId/);
 assert.match(s,/signed_maintenance_ci_source_epoch:maintenanceCiSourceEpoch/);
});
test('database checks actual signed worker, exact warrant, reviewer and no install',()=>{
 const s=readFileSync(new URL('../supabase/migrations/20261119173000_signed_maintenance_ci_source_epoch_v1.sql',import.meta.url),'utf8');
 for(const x of ["w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'",
 "w.state='ACTIVE'","run.status='STARTED'",
 "j.handling_state='FAILURE_BASELINE_REPRODUCED_NEEDS_CI_RED'",
 "scope->>'maintenance_id'=j.incident_id::text",
 "j.independent_frozen_test_receipt_sha256 IS NULL",
 "j.original_customer_work_id IS NULL",
 "j.baseline_worker_run_id<>p_worker_run_id",
 "FROM PUBLIC,anon,authenticated","TO service_role"])
 assert.ok(s.includes(x),x);
 assert.doesNotMatch(s,/cron\.schedule|net\.http_post/i);
});
