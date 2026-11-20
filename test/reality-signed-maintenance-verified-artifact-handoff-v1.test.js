import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileSignedVerifiedMaintenanceArtifact as reconcile}
 from '../src/reality-signed-maintenance-verified-artifact-handoff-v1.js';
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const worker='7f75b2f3-61e5-4a10-a397-faa9a373d1c1';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const maintenance='05d1e1a9-8f9e-43a5-94ba-acd367cc2611';
const commit='b8b03379360c93fa429264b70b51e382f6627f92';
const hash='sha256:'+'a'.repeat(64);
const db={project:'hvkfreoagbrphwghjajw',
 url:'https://hvkfreoagbrphwghjajw.supabase.co',
 secretKey:'signed_dummy_service_key_not_a_real_secret',strictSecrets:true};
const env={VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:db.project,
 VERCEL_GIT_COMMIT_SHA:commit};
const good={ok:true,source_read_only:true,model_generated:false,
 repair_executed:false,original_job_completed:false,
 installation_authorized:false,production_changed:false,new_shift_started:false,
 status:'EXACT_MAINTENANCE_SOURCE_REPAIR_ARTIFACT_RECORDED',
 owner_id:owner,shift_id:shift,maintenance_id:maintenance,
 source_ref:'https://github.com/maloney2323/Reality/pull/308',
 candidate_commit_sha:commit,source_blob_sha:'f'.repeat(40),
 review_receipt_sha256:hash,case_ci_receipt_sha256:hash,
 github_artifact_digest:hash,github_run_id:44779313713,
 github_artifact_id:14651115621,
 exact_artifact_review_verified:true,owner_approval_ready:false,
 install_target_verified:false,repair_installed:false};
const fetchFor=(d,ok=true)=>(url,args)=>{
 assert.equal(url,db.url+'/functions/v1/reality-signed-maintenance-repair-source-broker-v1');
 assert.equal(args.method,'POST');assert.equal(args.redirect,'error');
 assert.equal(args.headers.authorization,'Bearer '+db.secretKey);
 assert.deepEqual(JSON.parse(args.body),{mode:'artifact',shift_id:shift,
  worker_run_id:worker,release_sha:commit});
 return Promise.resolve({ok,json:async()=>d});
};
test('independent source repair enters only the reviewable artifact stage',async()=>{
 const out=await reconcile({db,env,shiftId:shift,workerRunId:worker,
  fetchImpl:fetchFor(good)});
 assert.equal(out.verified_repair_artifact,true);
 assert.equal(out.candidate_commit_sha,commit);
 assert.equal(out.review_receipt_sha256,hash);
 assert.equal(out.owner_approval_ready,false);
 assert.equal(out.installation_authorized,false);
 assert.equal(out.repair_installed,false);
 assert.equal(out.original_job_completed,false);
 assert.equal(out.new_shift_started,false);
});
test('no signed case cannot manufacture a tested repair artifact',async()=>{
 const out=await reconcile({db,env,shiftId:shift,workerRunId:worker,
  fetchImpl:fetchFor({...good,status:'NO_UNRECONCILED_VERIFIED_MAINTENANCE_ARTIFACT'})});
 assert.equal(out.verified_repair_artifact,false);
 assert.equal(out.installation_authorized,false);
});
test('a forged installation or approval flag fails closed',async()=>{
 for(const mutation of [
  {installation_authorized:true},{repair_executed:true},
  {repair_installed:true},{owner_approval_ready:true},
  {production_changed:true},{original_job_completed:true},
  {exact_artifact_review_verified:false},{candidate_commit_sha:'c'.repeat(40)}
 ]){
  await assert.rejects(()=>reconcile({db,env,shiftId:shift,workerRunId:worker,
   fetchImpl:fetchFor({...good,...mutation})}),/SIGNED_REPAIR_ARTIFACT_/);
 }
});
test('missing trusted worker scope rejects before any network request',async()=>{
 let called=false;
 await assert.rejects(()=>reconcile({db,env:{...env,VERCEL_ENV:'production'},
  shiftId:shift,workerRunId:worker,fetchImpl:()=>{called=true}}),
  /SIGNED_REPAIR_ARTIFACT_EXACT_SIGNED_EXISTING_WORKER_REQUIRED/);
 assert.equal(called,false);
});
test('provider transport failure is not proof of artifact or installation',async()=>{
 const out=await reconcile({db,env,shiftId:shift,workerRunId:worker,
  fetchImpl:()=>Promise.reject(Error('provider offline'))});
 assert.equal(out.verified_repair_artifact,false);
 assert.equal(out.installation_authorized,false);
 assert.equal(out.original_job_completed,false);
});
