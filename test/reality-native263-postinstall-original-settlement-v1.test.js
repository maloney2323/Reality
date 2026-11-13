import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifyNative263ApprovedInstallToOriginalReceipt} from
 '../src/reality-native263-postinstall-original-settlement-bridge-v1.js';
const WORK='work:873a6e74fd14c6beacc9042dd8021dfc';
const SHIFT='9460cfff-937a-4105-9093-2e41ab39a950';
const OWNER='85eeae0b-2988-43c4-b20c-590fb51da70d';
const BRANCH='reality/isolated-openai-governance-gateway-20261108';
const HASH='sha256:459e2bbe9a9d9c7037c87542a9cdbebf06f77a6d368d72769c79fdbef7947f48';
const PREVIEW_SHA='a'.repeat(40),INSTALLED_SHA='b'.repeat(40);
const db={url:'https://hvkfreoagbrphwghjajw.supabase.co',
 project:'hvkfreoagbrphwghjajw',strictSecrets:true,
 secretKey:'fake-signed-worker-test-db-service-token'};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:db.project,
 VERCEL_GIT_COMMIT_REF:BRANCH,VERCEL_GIT_COMMIT_SHA:PREVIEW_SHA};
const ctx={
 status:'NATIVE263_ORIGINAL_POSTINSTALL_READONLY_CONTEXT',
 original_work_id:WORK,owner_id:OWNER,shift_id:SHIFT,
 candidate_artifact_sha256:HASH,
 candidate_commit_sha:'e44ee294f21c73803a2bcdb5a9cb487f0f80fc85',
 target_branch:BRANCH,
 target_path:'src/reality-riley-service-original-runtime-v1.js',
 expected_installed_blob_sha:'dda8e71d44cca6745312bcbd000089d5a0b01d54',
 state:'STAGED_UNAPPROVED',
 original_phase:'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL',
 original_installed:false,installed_commit_sha:null,
 approval_receipt_id:null,owner_approved_at:null,
 owner_approval_ready:false,original_final_receipt_id:null,
 production_changed:false
};
const fake=(context,broker)=>{
 const calls=[];
 const fetchImpl=async(url,options)=>{
  calls.push({url,options});
  if(url.endsWith('/reality_read_native263_postinstall_context_v1'))
   return {ok:true,json:async()=>context};
  if(url.endsWith('/reality-native263-postinstall-verifier-v1'))
   return {ok:true,json:async()=>broker};
  throw Error('UNEXPECTED_NETWORK_RESOURCE');
 };
 return {calls,fetchImpl};
};
test('staged original preflights release WITHOUT an approval or installed source',async()=>{
 const {calls,fetchImpl}=fake(ctx,{
  status:'NATIVE263_EXACT_OWNER_APPROVAL_NOW_READY',
  original_work_id:WORK,shift_id:SHIFT,
  owner_approval_ready:true,approval_recorded:false,
  installation_authorized:false,original_job_completed:false,
  actual_original_settlement_recorded:false,
  independently_verified_release_commit_sha:PREVIEW_SHA,
  production_changed:false
 });
 const result=await verifyNative263ApprovedInstallToOriginalReceipt({
  db,env,fetchImpl});
 assert.equal(calls.length,2);
 assert.equal(calls[1].options.body,JSON.stringify({
  version:1,action:'verify_release_path',deployed_sha:PREVIEW_SHA}));
 assert.equal(result.status,'NATIVE263_OWNER_APPROVAL_RELEASE_PROTOCOL_VERIFIED');
 assert.equal(result.original_job_completed,false);
 assert.equal(result.owner_approval_ready,true);
});
test('release cannot arm without verified Vercel commit identity',async()=>{
 const {calls,fetchImpl}=fake(ctx,null);
 const result=await verifyNative263ApprovedInstallToOriginalReceipt({
  db,env:{...env,VERCEL_GIT_COMMIT_SHA:''},fetchImpl});
 assert.equal(result.status,'NATIVE263_VERIFIED_VERCEL_GIT_DEPLOYMENT_IDENTITY_REQUIRED');
 assert.equal(calls.length,1);
});
test('already released owner approval cannot be re-armed on periodic wake',async()=>{
 const {calls,fetchImpl}=fake({...ctx,owner_approval_ready:true},null);
 const result=await verifyNative263ApprovedInstallToOriginalReceipt({
  db,env,fetchImpl});
 assert.equal(result.status,'NATIVE263_EXACT_OWNER_APPROVAL_READY_IN_REALITY_CHAT');
 assert.equal(calls.length,1);
});
test('installed source remains blocked until the worker runs the exact installed preview',async()=>{
 const {calls,fetchImpl}=fake({...ctx,
  state:'SOURCE_INSTALLED',approval_receipt_id:'c'.repeat(8)+'-1111-4111-8111-'+'d'.repeat(12),
  owner_approved_at:'2026-11-13T03:00:00Z',installed_commit_sha:INSTALLED_SHA
 },null);
 const result=await verifyNative263ApprovedInstallToOriginalReceipt({
  db,env,fetchImpl});
 assert.equal(calls.length,1);
 assert.equal(result.status,'NATIVE263_WAIT_FOR_AUTOMATIC_EXACT_INSTALLED_PREVIEW');
 assert.equal(result.current_preview_commit_sha,PREVIEW_SHA);
 assert.equal(result.expected_installed_commit_sha,INSTALLED_SHA);
});
test('two distinct independent successful provider runs can settle SAME original',async()=>{
 const context={...ctx,state:'SOURCE_INSTALLED',
  installed_commit_sha:INSTALLED_SHA,
  approval_receipt_id:'11111111-2222-4333-8444-555555555555',
  owner_approved_at:'2026-11-13T03:00:00Z'};
 const proof={
  status:'NATIVE263_ORIGINAL_INDEPENDENT_FINAL_RECEIPT_RECORDED',
  original_work_id:WORK,shift_id:SHIFT,installed_commit_sha:INSTALLED_SHA,
  independent_main_ci_run_id:43359999999,
  independent_original_acceptance_run_id:43359999998,
  original_final_receipt_id:'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  final_receipt_sha256:'sha256:'+'c'.repeat(64),
  original_job_completed:true,production_changed:false
 };
 const {calls,fetchImpl}=fake(context,proof);
 const result=await verifyNative263ApprovedInstallToOriginalReceipt({
  db,env:{...env,VERCEL_GIT_COMMIT_SHA:INSTALLED_SHA},fetchImpl});
 assert.equal(calls.length,2);
 assert.equal(calls[1].options.body,JSON.stringify({
  version:1,action:'verify_postinstall_original',deployed_sha:INSTALLED_SHA}));
 assert.equal(result.status,'NATIVE263_SAME_ORIGINAL_INDEPENDENT_FINAL_RECEIPT_VERIFIED');
 assert.equal(result.original_final_receipt_id,proof.original_final_receipt_id);
 assert.equal(result.original_job_completed,true);
 assert.notEqual(result.independent_main_ci_run_id,
  result.independent_original_acceptance_run_id);
});
test('false receipt or same CI runs never become a completed original',async()=>{
 for(const changed of [
  {independent_original_acceptance_run_id:43359999999},
  {original_job_completed:false},
  {original_final_receipt_id:'bad'},
  {installed_commit_sha:PREVIEW_SHA},
  {production_changed:true}
 ]){
  const {fetchImpl}=fake({...ctx,state:'SOURCE_INSTALLED',
   installed_commit_sha:INSTALLED_SHA,owner_approved_at:'2026-11-13T03:00:00Z',
   approval_receipt_id:'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'},{
    status:'NATIVE263_ORIGINAL_INDEPENDENT_FINAL_RECEIPT_RECORDED',
    original_work_id:WORK,shift_id:SHIFT,installed_commit_sha:INSTALLED_SHA,
    original_job_completed:true,production_changed:false,
    independent_main_ci_run_id:43359999999,
    independent_original_acceptance_run_id:43359999998,
    final_receipt_sha256:'sha256:'+'a'.repeat(64),
    original_final_receipt_id:'11111111-2222-4333-8444-555555555555',
    ...changed
   });
  if(changed.production_changed===true)
   await assert.rejects(()=>verifyNative263ApprovedInstallToOriginalReceipt({
    db,env:{...env,VERCEL_GIT_COMMIT_SHA:INSTALLED_SHA},fetchImpl
   }),/NATIVE263_FINAL_WORKER_PROVIDER_READBACK_ORIGINAL_DRIFT/);
  else{
   const result=await verifyNative263ApprovedInstallToOriginalReceipt({
    db,env:{...env,VERCEL_GIT_COMMIT_SHA:INSTALLED_SHA},fetchImpl
   });
   assert.equal(result.original_job_completed,false);
  }
 }
});
test('settlement SQL persists exact original and separate independent CI runs atomically',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261112000008_native263_independent_postinstall_settlement_v1.sql',import.meta.url),'utf8');
 const broker=readFileSync(new URL(
  '../supabase/functions/reality-native263-postinstall-verifier-v1/index.ts',import.meta.url),'utf8');
 const workflow=readFileSync(new URL(
  '../.github/workflows/reality-native263-postinstall-original-acceptance-v1.yml',import.meta.url),'utf8');
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/p_installed_provider_run_id=p_original_execution_run_id/);
 assert.match(sql,/c.state<>'SOURCE_INSTALLED'/);
 assert.match(sql,/reality_internal.riley_native_exact_install_approvals_v1/);
 assert.match(sql,/insert into reality_internal.riley_native_independent_final_receipts_v1/);
 assert.match(sql,/original_execution_independently_verified/);
 assert.match(sql,/original_settlement_receipt_ref/);
 assert.match(sql,/phase='SETTLED',installed=true/);
 assert.match(sql,/state='ORIGINAL_SETTLED'/);
 assert.match(sql,/NATIVE263_ORIGINAL_INDEPENDENT_FINAL_RECEIPT_RECORDED/);
 assert.match(sql,/same_original_continuation_and_receipt_verified=true/);
 assert.doesNotMatch(sql,/grant execute on function public\.reality_settle_native263_original_after_independent_provider_v1[^;]*to authenticated/);
 assert.match(broker,/Reality-Native263-Independent-CI-Receipt-Verifier/);
 assert.match(broker,/event==='push'/);
 assert.match(broker,/conclusion==='success'/);
 assert.match(broker,/const ACCEPT_NAME='Reality · #263 independent post-install original acceptance'/);
 assert.match(broker,/const WORKFLOW_BLOB='0b3b5ed4057c6f502f22a4489913fe7ef21c7e5d'/);
 assert.match(broker,/run\.head_sha!==CANDIDATE/);
 assert.match(broker,/mainCi===originalCi/);
 assert.match(broker,/reality_settle_native263_original_after_independent_provider_v1/);
 assert.match(broker,/NATIVE263_ORIGINAL_INDEPENDENT_FINAL_RECEIPT_RECORDED/);
 assert.match(workflow,/paths:/);
 assert.match(workflow,/src\/reality-riley-service-original-runtime-v1\.js/);
 assert.match(workflow,/test\/reality-riley-service-original-runtime-v1\.test\.js/);
 assert.match(workflow,/riley-live-original-shift-dispatch\.test\.js/);
 assert.match(workflow,/sha256sum --check/);
 assert.match(worker,/verifyNative263ApprovedInstallToOriginalReceipt/);
 assert.match(worker,/native_same_original_postinstall_receipt:nativePostinstallOriginalProof/);
});
