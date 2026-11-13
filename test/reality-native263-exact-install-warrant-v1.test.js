import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stageRealityNative263ExactInstallWarrant} from
 '../src/reality-native263-exact-install-warrant-bridge-v1.js';
const SHIFT='9460cfff-937a-4105-9093-2e41ab39a950';
const OWNER='85eeae0b-2988-43c4-b20c-590fb51da70d';
const ORIGINAL='work:873a6e74fd14c6beacc9042dd8021dfc';
const HASH='sha256:459e2bbe9a9d9c7037c87542a9cdbebf06f77a6d368d72769c79fdbef7947f48';
const db={url:'https://hvkfreoagbrphwghjajw.supabase.co',
 project:'hvkfreoagbrphwghjajw',strictSecrets:true,
 secretKey:'test_service_role_key_for_isolated_native_contract'};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:db.project};
const graph={status:'UNIFIED_OWNER_JOB_CONTROL_READY',
 owner_id:OWNER,shift_id:SHIFT,
 installation_authorized:false,production_changed:false,
 jobs:[{original_work_id:ORIGINAL,source_ref:'https://github.com/maloney2323/Reality/issues/263',
  original_kind:'REAL_ENGINEERING_REPAIR_ORIGINAL',
  phase:'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL',
  independent_source_proof_verified:true}]};
const preflight={status:'NATIVE_263_EXISTING_SOURCE_TRANSPORT_PREFLIGHT_VERIFIED',
 original_work_id:ORIGINAL,candidate_artifact_sha256:HASH,
 existing_file_baseline_verified:true,frozen_candidate_verified:true,
 owner_approval_ready:false};
const contentsProbe={status:'NATIVE263_CONTENTS_WRITE_TRANSPORT_VERIFIED',
 original_work_id:ORIGINAL,canary_write_verified:true,
 provider_http_status:201,installation_authorized:false};
const receipt={status:'EXACT_NATIVE263_INSTALL_WARRANT_STAGED_PREAPPROVAL',
 original_work_id:ORIGINAL,shift_id:SHIFT,owner_id:OWNER,
 candidate_artifact_sha256:HASH,
 source_ref:'https://github.com/maloney2323/Reality/issues/263',
 github_contents_permission_independently_verified:true,
 owner_approval_ready:false,installation_authorized:false,
 original_job_completed:false,production_changed:false,
 automatic_deployment_verified:false,
 postinstall_original_resumption_verified:false,
 state:'STAGED_UNAPPROVED',
 exact_target_branch:'reality/isolated-openai-governance-gateway-20261108',
 existing_file_path:'src/reality-riley-service-original-runtime-v1.js'};
test('warrant staging is idempotent, same-original, owner-governed and read-only',async()=>{
 let called=0;
 const result=await stageRealityNative263ExactInstallWarrant({
  db,env,graph,preflight,contentsProbe,
  fetchImpl:async(url,opts)=>{
   called++;
   assert.equal(opts.method,'POST');
   assert.equal(url,db.url+'/rest/v1/rpc/reality_stage_native263_exact_install_warrant_v1');
   assert.equal(opts.body,'{}');
   assert.equal(opts.headers.authorization,'Bearer '+db.secretKey);
   return {ok:true,json:async()=>receipt};
  }});
 assert.equal(called,1);
 assert.equal(result.status,'EXACT_NATIVE263_OWNER_WARRANT_STAGED_INSTALL_BLOCKED');
 assert.equal(result.original_work_id,ORIGINAL);
 assert.equal(result.candidate_artifact_sha256,HASH);
 assert.equal(result.real_reality_github_contents_write_verified,true);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.owner_approval_ready,false);
 assert.equal(result.automated_deployment_verified,false);
 assert.equal(result.same_original_continuation_verified,false);
 assert.equal(result.original_job_completed,false);
});
test('wrong original, changed candidate, missing provider write or production environment cannot stage',async()=>{
 for(const bad of [
  {graph:{...graph,owner_id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'}},
  {graph:{...graph,installation_authorized:true}},
  {graph:{...graph,jobs:[{...graph.jobs[0],phase:'SETTLED'}]}},
  {preflight:{...preflight,candidate_artifact_sha256:'sha256:'+'0'.repeat(64)}},
  {contentsProbe:{...contentsProbe,canary_write_verified:false}},
  {contentsProbe:{...contentsProbe,provider_http_status:403}},
  {env:{...env,VERCEL_ENV:'production'}}
 ]){
  await assert.rejects(()=>stageRealityNative263ExactInstallWarrant({
   db,env,graph,preflight,contentsProbe,...bad,
   fetchImpl:()=>{throw Error('must not call DB')}
  }),/NATIVE263_WARRANT_EXACT_CURRENT_OWNER_SOURCE_AND_REAL_GITHUB_PROOF_REQUIRED/);
 }
});
test('untrusted DB response never becomes installation or approval',async()=>{
 for(const altered of [
  {...receipt,installation_authorized:true},
  {...receipt,owner_approval_ready:true},
  {...receipt,automatic_deployment_verified:true},
  {...receipt,original_job_completed:true},
  {...receipt,candidate_artifact_sha256:'sha256:'+'0'.repeat(64)}
 ]){
  await assert.rejects(()=>stageRealityNative263ExactInstallWarrant({
   db,env,graph,preflight,contentsProbe,
   fetchImpl:async()=>({ok:true,json:async()=>altered})
  }),/NATIVE263_WARRANT_DURABLE_PREAPPROVAL_LEDGER_READBACK_UNVERIFIED/);
 }
});
test('SQL warrant binds immutable source, exact shift and never grants install',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261112000004_native263_exact_install_warrant_stage_v1.sql',
  import.meta.url),'utf8');
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',
  import.meta.url),'utf8');
 assert.match(sql,/state text not null default 'STAGED_UNAPPROVED'/);
 assert.match(sql,/native263_contents_canary_probes_v2/);
 assert.match(sql,/WRITE_READBACK_VERIFIED/);
 assert.match(sql,/reviewed_candidate_proofs_v1/);
 assert.match(sql,/reality_stage_native263_exact_install_warrant_v1/);
 assert.match(sql,/service_role/);
 assert.match(sql,/reality_read_native263_exact_install_warrant_v1/);
 assert.match(sql,/owner_approval_ready',false/);
 assert.match(sql,/automatic_deployment_verified',false/);
 assert.match(sql,/postinstall_original_resumption_verified',false/);
 assert.doesNotMatch(sql,/create or replace function public\.reality_owner_approve_native263/);
 assert.doesNotMatch(sql,/update reality_internal\.riley_unattended_repair_originals_v1/);
 assert.match(worker,/stageRealityNative263ExactInstallWarrant/);
 assert.match(worker,/native_exact_install_warrant:nativeExactInstallWarrant/);
});
