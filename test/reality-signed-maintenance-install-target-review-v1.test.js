import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {independentlyReviewSignedMaintenanceInstallTarget}
 from '../src/reality-signed-maintenance-verified-artifact-handoff-v1.js';

const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const worker='88888888-4444-4888-8888-888888888888';
const other='55555555-4444-4555-8555-555555555555';
const maintenance='05d1e1a9-8f9e-43a5-94ba-acd367cc2611';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const branch='reality/chat-direct-work-handoff-20261115';
const path='src/reality-qualified-source-requalification-v1.js';
const digest=x=>'sha256:'+x.repeat(64);
const sha=x=>x.repeat(40);
const db={project:'testproject',strictSecrets:true,
 url:'https://testproject.supabase.co',secretKey:'test-value'};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'testproject',
 REALITY_GITHUB_TOKEN:'test-github-token-abcdefghijklmnopqrstuvwxyz'};
const scope={
 status:'SIGNED_MAINTENANCE_EXACT_INSTALL_TARGET_REVIEW_DUE',
 maintenance_id:maintenance,owner_id:owner,shift_id:shift,
 origin_shift_id:'33333333-4444-4333-8333-333333333333',
 source_ref:'https://github.com/maloney2323/Reality/pull/308',
 source_path:path,candidate_commit_sha:sha('a'),
 candidate_source_blob_sha:sha('b'),historical_source_blob_sha:sha('c'),
 case_ci_receipt_sha256:digest('d'),
 artifact_receipt_sha256:digest('e'),
 github_artifact_digest:digest('f'),
 artifact_worker_run_id:other,reviewer_worker_run_id:worker,
 target_branch:branch,target_source_checked:false,
 owner_approval_ready:false,installation_authorized:false,
 original_job_completed:false,production_changed:false,
 new_shift_started:false
};
const saved={
 status:'EXACT_SIGNED_MAINTENANCE_INSTALL_TARGET_INDEPENDENTLY_REVIEWED',
 maintenance_id:maintenance,owner_id:owner,shift_id:shift,
 source_ref:scope.source_ref,candidate_commit_sha:scope.candidate_commit_sha,
 candidate_source_blob_sha:scope.candidate_source_blob_sha,
 target_branch:branch,target_head_sha:sha('d'),
 target_existing_blob_sha:scope.historical_source_blob_sha,
 target_review_receipt_sha256:digest('9'),
 owner_approval_ready:false,installation_authorized:false,
 repair_installed:false,original_job_completed:false,
 production_changed:false,new_shift_started:false
};
function f({target=sha('c'),candidate=sha('b'),responseScope=scope}={}){
 const calls=[],urls=[];
 return {calls,urls,call:async(_db,method,params)=>{
  calls.push([method,params]);
  if(method==='reality_read_signed_maintenance_install_target_review_v1')
   return responseScope;
  assert.equal(method,'reality_record_signed_maintenance_install_target_review_v1');
  assert.equal(params.p_shift_id,shift);
  assert.equal(params.p_maintenance_id,maintenance);
  assert.equal(params.p_candidate_blob_sha,sha('b'));
  assert.equal(params.p_target_branch,branch);
  assert.equal(params.p_target_existing_blob_sha,sha('c'));
  assert.equal(params.p_target_head_sha,sha('d'));
  return saved;
 },fetchImpl:async(url,opts)=>{
  urls.push(url);
  assert.equal(opts.redirect,'error');
  assert.equal(opts.method,'GET');
  assert.ok(opts.signal instanceof AbortSignal);
  assert.match(opts.headers.authorization,/^Bearer test-github-token/);
  if(url.includes('/git/ref/heads/'))return {ok:true,json:async()=>({
   ref:'refs/heads/'+branch,object:{sha:sha('d')}})};
  if(url.includes('?ref='+scope.candidate_commit_sha))
   return {ok:true,json:async()=>({path,sha:candidate})};
  if(url.includes('?ref='+branch))
   return {ok:true,json:async()=>({path,sha:target})};
  throw Error('UNEXPECTED_GITHUB_READ');
 }};
}
test('different signed worker independently verifies candidate + exact rollback target and persists receipt',async()=>{
 const x=f();
 const result=await independentlyReviewSignedMaintenanceInstallTarget({
  db,env,shiftId:shift,workerRunId:worker,...x
 });
 assert.equal(result.status,saved.status);
 assert.equal(result.install_target_verified,true);
 assert.equal(result.original_artifact_receipt_sha256,scope.artifact_receipt_sha256);
 assert.equal(result.owner_approval_ready,false);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.original_job_completed,false);
 assert.equal(x.urls.length,3);
 assert.equal(x.calls.length,2);
});
test('a drifted install target is BLOCKED without a write, new shift or side effect',async()=>{
 const x=f({target:sha('1')});
 const out=await independentlyReviewSignedMaintenanceInstallTarget({
  db,env,shiftId:shift,workerRunId:worker,...x
 });
 assert.equal(out.status,'SIGNED_MAINTENANCE_INSTALL_TARGET_SOURCE_DRIFT_REQUALIFICATION_REQUIRED');
 assert.equal(out.install_target_verified,false);
 assert.equal(out.installation_authorized,false);
 assert.equal(out.original_job_completed,false);
 assert.equal(x.calls.length,1);
});
test('missing separate signed reviewer, wrong owner scope, or forged approval fails closed',async()=>{
 for(const change of [
  {artifact_worker_run_id:worker},
  {shift_id:other},
  {owner_approval_ready:true},
  {candidate_source_blob_sha:'unverified'},
  {target_branch:'main'},
  {installation_authorized:true}
 ]){
  const x=f({responseScope:{...scope,...change}});
  await assert.rejects(independentlyReviewSignedMaintenanceInstallTarget({
   db,env,shiftId:shift,workerRunId:worker,...x
  }),/SIGNED_REPAIR_ARTIFACT_INSTALL_TARGET_EXACT_ARTIFACT_AND_OWNER_WARRANT_UNVERIFIED/);
  assert.equal(x.urls.length,0);
  assert.equal(x.calls.length,1);
 }
});
test('absent eligibility returns safely and cannot transform no-work into completion',async()=>{
 const x=f({responseScope:{
  status:'NO_SIGNED_MAINTENANCE_INSTALL_TARGET_REVIEW_DUE',
  installation_authorized:false,repair_installed:false,
  original_job_completed:false,production_changed:false}});
 const out=await independentlyReviewSignedMaintenanceInstallTarget({
  db,env,shiftId:shift,workerRunId:worker,...x
 });
 assert.equal(out.install_target_verified,false);
 assert.equal(out.original_job_completed,false);
 assert.equal(x.urls.length,0);
 assert.equal(x.calls.length,1);
});
test('existing signed worker advances the SAME shift and never treats review as installation',()=>{
 const w=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(w,/SIGNED_MAINTENANCE_INDEPENDENT_INSTALL_TARGET_REVIEW/);
 assert.match(w,/await independentlyReviewSignedMaintenanceInstallTarget/);
 assert.match(w,/shiftId:wakeReceipt.shift_id/);
 assert.match(w,/workerRunId:actualWorkerRunId/);
 assert.match(w,/signed_maintenance_install_target_review:signedMaintenanceInstallTargetReview/);
 assert.match(w,/install_target_verified:false,owner_approval_ready:false/);
});
test('owner and warrant database gates preserve immutable artifact, CI and no install authority',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261120202000_signed_maintenance_artifact_install_target_review_v1.sql',
  import.meta.url),'utf8');
 for(const required of [
  'owner_maintenance_verified_artifact_handoffs_v1',
  "current_user<>'service_role'",
  'observed_worker_run_id<>p_worker_run_id',
  "w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'",
  'source_case_ci_receipt_sha256',
  'source_epoch_frozen_red_verified=true',
  'code_correction_green_verified=true',
  'target_review_receipt_sha256 IS NULL',
  "p_target_branch<>'reality/chat-direct-work-handoff-20261115'",
  "scope->>'historical_source_blob_sha'<>p_target_existing_blob_sha",
  'target_review_worker_run_id=p_worker_run_id',
  'original_job_completed',"'owner_approval_ready',false",
  'FROM PUBLIC,anon,authenticated','TO service_role'
 ])assert.ok(sql.includes(required),required);
 assert.doesNotMatch(sql,/cron\.schedule|net\.http_post|UPDATE reality_internal\.governed_employee_shifts_v1|INSERT INTO reality_internal\.governed_employee_shifts_v1/i);
});
