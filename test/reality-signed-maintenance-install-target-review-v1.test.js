import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {independentlyReviewSignedMaintenanceInstallTarget as review}
 from '../src/reality-signed-maintenance-verified-artifact-handoff-v1.js';
const db={project:'benchmark',strictSecrets:true,
 url:'https://benchmark.supabase.co',
 secretKey:'isolated-worker-service-key-abcdef'};
const env={VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'benchmark',
 VERCEL_GIT_COMMIT_SHA:'a'.repeat(40)};
const shiftId='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const workerRunId='22222222-2222-4222-8222-222222222222';
const maintenanceId='05d1e1a9-8f9e-43a5-94ba-acd367cc2611';
const ownerId='11111111-1111-4111-8111-111111111111';
const verified={ok:true,source_read_only:true,model_generated:false,
 independent_frozen_red_verified:false,independent_ci_verified:false,
 status:'EXACT_SIGNED_MAINTENANCE_INSTALL_TARGET_INDEPENDENTLY_REVIEWED',
 shift_id:shiftId,maintenance_id:maintenanceId,owner_id:ownerId,
 candidate_commit_sha:'b'.repeat(40),candidate_source_blob_sha:'c'.repeat(40),
 target_branch:'reality/chat-direct-work-handoff-20261115',
 target_head_sha:'d'.repeat(40),target_existing_blob_sha:'e'.repeat(40),
 target_review_receipt_sha256:'sha256:'+'f'.repeat(64),
 install_target_verified:true,owner_approval_ready:false,
 installation_authorized:false,repair_executed:false,repair_installed:false,
 original_job_completed:false,production_changed:false,new_shift_started:false};
function harness(receipt=verified,{ok=true}={}){
 const calls=[];
 return {calls,fetchImpl:async(url,opt)=>{
  calls.push({url,opt});
  assert.equal(url,'https://benchmark.supabase.co/functions/v1/reality-signed-maintenance-repair-source-broker-v1');
  assert.equal(opt.method,'POST');
  assert.equal(opt.redirect,'error');
  assert.equal(opt.headers.apikey,db.secretKey);
  assert.equal(opt.headers.authorization,'Bearer '+db.secretKey);
  assert.ok(opt.signal instanceof AbortSignal);
  const b=JSON.parse(opt.body);
  assert.deepEqual(b,{mode:'target',shift_id:shiftId,worker_run_id:workerRunId,
   release_sha:env.VERCEL_GIT_COMMIT_SHA});
  return {ok,json:async()=>receipt};
 }};
}
test('existing signed worker independently reconciles broker target receipt without install or owner approval',async()=>{
 const h=harness();
 const r=await review({db,env,shiftId,workerRunId,fetchImpl:h.fetchImpl});
 assert.equal(r.status,verified.status);
 assert.equal(r.install_target_verified,true);
 assert.equal(r.owner_approval_ready,false);
 assert.equal(r.installation_authorized,false);
 assert.equal(r.repair_installed,false);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.target_review_receipt_sha256,verified.target_review_receipt_sha256);
 assert.equal(h.calls.length,1);
});
test('source drift and missing work both fail closed, with no installation',async()=>{
 for(const status of [
  'SIGNED_MAINTENANCE_INSTALL_TARGET_SOURCE_DRIFT_REQUALIFICATION_REQUIRED',
  'SIGNED_MAINTENANCE_INSTALL_TARGET_PROVIDER_PROOF_UNAVAILABLE',
  'NO_SIGNED_MAINTENANCE_INSTALL_TARGET_REVIEW_DUE']){
  const h=harness({...verified,status,maintenance_id:maintenanceId});
  const r=await review({db,env,shiftId,workerRunId,fetchImpl:h.fetchImpl});
  assert.equal(r.status,status);
  assert.equal(r.install_target_verified,false);
  assert.equal(r.original_job_completed,false);
  assert.equal(r.installation_authorized,false);
 }
});
test('forged install approval, wrong owner scope or unsigned broker verdict fail closed',async()=>{
 for(const bad of [
  {installation_authorized:true},{repair_installed:true},
  {owner_approval_ready:true},{source_read_only:false},
  {target_branch:'main'},{shift_id:'00000000-0000-4000-8000-000000000000'},
  {target_review_receipt_sha256:'not-a-receipt'}]){
  const h=harness({...verified,...bad});
  await assert.rejects(
   review({db,env,shiftId,workerRunId,fetchImpl:h.fetchImpl}),
   /SIGNED_REPAIR_ARTIFACT_INSTALL_TARGET_(?:BROKER_AUTHORITY_INVALID|SIGNED_RECEIPT_INVALID)/);
 }
});
test('unsigned environment and provider outage cannot grant work authority',async()=>{
 let calls=0;
 await assert.rejects(review({db,env:{...env,VERCEL_ENV:'production'},
  shiftId,workerRunId,fetchImpl:async()=>{calls++;}}),
  /SIGNED_REPAIR_ARTIFACT_INSTALL_TARGET_SIGNED_OWNER_SCOPE_REQUIRED/);
 assert.equal(calls,0);
 const h=harness({...verified},{ok:false});
 const r=await review({db,env,shiftId,workerRunId,fetchImpl:h.fetchImpl});
 assert.equal(r.install_target_verified,false);
 assert.equal(r.original_job_completed,false);
});
test('the signed worker and EXISTING broker use one owner-bound artifact receipt, not a new engine',()=>{
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const broker=readFileSync(new URL('../supabase/functions/reality-signed-maintenance-repair-source-broker-v1/index.ts',import.meta.url),'utf8');
 const sql=readFileSync(new URL('../supabase/migrations/20261120202000_signed_maintenance_artifact_install_target_review_v1.sql',import.meta.url),'utf8');
 assert.match(worker,/SIGNED_MAINTENANCE_INDEPENDENT_INSTALL_TARGET_REVIEW/);
 assert.match(worker,/signed_maintenance_install_target_review:signedMaintenanceInstallTargetReview/);
 assert.match(broker,/if\(b\?\.mode==='target'\)/);
 assert.match(broker,/reality_read_signed_maintenance_install_target_review_v1/);
 assert.match(broker,/reality_record_signed_maintenance_install_target_review_v1/);
 assert.match(broker,/verifiedGithubBlob\(c,x\.source_path,x\.candidate_commit_sha\)/);
 assert.match(broker,/const second=await github/);
 assert.match(sql,/target_review_worker_run_id <> observed_worker_run_id/);
 assert.match(sql,/w\.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'/);
 assert.match(sql,/'owner_approval_ready',false/);
 assert.doesNotMatch(sql,/cron\.schedule|net\.http_post/);
});
