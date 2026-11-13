import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectNative263ExistingFileInstallTransport} from
 '../src/reality-native-263-install-preflight-bridge-v1.js';
const SHIFT='9460cfff-937a-4105-9093-2e41ab39a950';
const ORIGINAL='work:873a6e74fd14c6beacc9042dd8021dfc';
const ISSUE='https://github.com/maloney2323/Reality/issues/263';
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw'};
const db={url:'https://hvkfreoagbrphwghjajw.supabase.co',
 project:'hvkfreoagbrphwghjajw',strictSecrets:true,
 secretKey:'test-service-role-key-with-sufficient-length'};
const graph={status:'UNIFIED_OWNER_JOB_CONTROL_READY',
 shift_id:SHIFT,installation_authorized:false,production_changed:false,
 jobs:[{original_kind:'REAL_ENGINEERING_REPAIR_ORIGINAL',
 original_work_id:ORIGINAL,source_ref:ISSUE,
 phase:'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL',
 independent_source_proof_verified:true}]};
const receipt=()=>({
 status:'NATIVE_263_EXISTING_SOURCE_TRANSPORT_PREFLIGHT_VERIFIED',
 source:'INDEPENDENT_REALITY_PROVIDER_AND_FROZEN_OWNER_LEDGER',
 original_work_id:ORIGINAL,shift_id:SHIFT,source_ref:ISSUE,
 preview_branch:'reality/isolated-openai-governance-gateway-20261108',
 preview_baseline_commit_sha:'c070aa410e7b96b6631db6193acbbb3e4cf5b40c',
 preview_existing_file_blob_sha:'aaf22a1f69a2c3e91e18641cf1ef40d16a563bc0',
 candidate_commit_sha:'e44ee294f21c73803a2bcdb5a9cb487f0f80fc85',
 candidate_file_blob_sha:'dda8e71d44cca6745312bcbd000089d5a0b01d54',
 candidate_artifact_sha256:'sha256:459e2bbe9a9d9c7037c87542a9cdbebf06f77a6d368d72769c79fdbef7947f48',
 independent_ci_run_id:42525028367,exact_existing_file_update_required:true,
 source_and_frozen_tests_verified:true,code_write_permission_verified:false,
 native_approval_bridge_verified:false,preview_deployment_automation_verified:false,
 post_install_same_original_settlement_verified:false,owner_approval_ready:false,
 installation_authorized:false,original_job_completed:false,
 production_changed:false,new_shift_created:false,code_installed:false});
test('Reality worker uses service-only broker for exact current #263 preinstall proof',async()=>{
 let count=0;
 const result=await inspectNative263ExistingFileInstallTransport({
  db,graph,env,fetchImpl:async(url,opt)=>{
   count++;
   assert.equal(url,db.url+'/functions/v1/reality-governed-pr-review-publisher-v1');
   assert.equal(opt.method,'POST');
   assert.equal(opt.body,'{"version":2,"action":"native_263_install_preflight"}');
   assert.equal(opt.headers.apikey,db.secretKey);
   assert.equal(opt.headers.authorization,'Bearer '+db.secretKey);
   return {ok:true,json:async()=>receipt()};
  }});
 assert.equal(count,1);
 assert.equal(result.status,'NATIVE_263_EXISTING_SOURCE_TRANSPORT_PREFLIGHT_VERIFIED');
 assert.equal(result.existing_file_baseline_verified,true);
 assert.equal(result.frozen_candidate_verified,true);
 assert.equal(result.github_readonly_delivery_preflight_verified,true);
 assert.equal(result.provider_code_write_verified,false);
 assert.equal(result.provider_deploy_verified,false);
 assert.equal(result.native_approval_bridge_verified,false);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.original_job_completed,false);
 assert.equal(result.owner_approval_ready,false);
});
test('wrong owner shift or already-authorized install does not reach provider',async()=>{
 for(const bad of [{...graph,shift_id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'},
  {...graph,installation_authorized:true},
  {...graph,jobs:graph.jobs.map(j=>({...j,original_work_id:'work:'+'0'.repeat(32)}))}]){
  await assert.rejects(()=>inspectNative263ExistingFileInstallTransport({
   db,graph:bad,env,fetchImpl:()=>{throw Error('must not reach provider')}
  }),/REALITY_NATIVE263_PREFLIGHT_SAME_OWNER_PREVIEW_SCOPE_NOT_VERIFIED/);
 }
});
test('false provider claims of granted installation or deployment fail closed',async()=>{
 for(const changed of [
  {installation_authorized:true},
  {preview_deployment_automation_verified:true},
  {code_write_permission_verified:true},
  {candidate_file_blob_sha:'b'.repeat(40)},
  {source_and_frozen_tests_verified:false}
 ]){
  await assert.rejects(()=>inspectNative263ExistingFileInstallTransport({
   db,graph,env,fetchImpl:async()=>({
    ok:true,json:async()=>({...receipt(),...changed})
   })
  }),/BROKER_INDEPENDENT_EFFECT_AND_AUTHORITY_SCOPE_CHANGED|EXACT_NATIVE_INSTALL_PROOF_FIELDS_MISMATCH/);
 }
});
test('provider readback failures never become a success or installation',async()=>{
 const x=await inspectNative263ExistingFileInstallTransport({
  db,graph,env,fetchImpl:async()=>({ok:false,json:async()=>({
   status:'NATIVE_PREVIEW_GITHUB_READBACK_UNAVAILABLE',
   installation_authorized:false,original_job_completed:false,
   production_changed:false,new_shift_created:false,code_installed:false
  })})});
 assert.equal(x.status,'NATIVE_PREVIEW_GITHUB_READBACK_UNAVAILABLE');
 assert.equal(x.original_job_completed,false);
 assert.equal(x.installation_authorized,false);
});
test('Reality Edge preflight is read-only, scoped to owner ledger and frozen source',()=>{
 const edge=readFileSync(new URL(
  '../supabase/functions/reality-governed-pr-review-publisher-v1/index.ts',
  import.meta.url),'utf8');
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',
  import.meta.url),'utf8');
 const p=edge.slice(edge.indexOf('async function nativeInstallPreflight('),
  edge.indexOf('Deno.serve(async req=>'));
 const get=edge.slice(edge.indexOf('async function nativeGithubRead('),
  edge.indexOf('async function nativeInstallPreflight('));
 assert.match(edge,/native_263_install_preflight/);
 assert.match(p,/reality_read_current_shift_execution_graph_v1/);
 assert.match(p,/reality_read_owner_native_reviewed_patch_v1/);
 assert.match(p,/NATIVE_263_EXISTING_SOURCE_TRANSPORT_PREFLIGHT_VERIFIED/);
 assert.match(p,/NATIVE_TARGET_BLOB_SHA/);
 assert.match(p,/NATIVE_CANDIDATE_BYTES_SHA/);
 assert.match(p,/independent_ci_run_id:42525028367/);
 assert.match(p,/owner_approval_ready:false/);
 assert.match(p,/code_write_permission_verified:false/);
 assert.match(p,/post_install_same_original_settlement_verified:false/);
 assert.match(get,/method:'GET'/);
 assert.doesNotMatch(p,/reality_mark_general_repair_installed|reality_settle_authorized/);
 assert.doesNotMatch(get,/method:'(?:PUT|PATCH|POST|DELETE)'/);
 assert.match(worker,/inspectNative263ExistingFileInstallTransport/);
 assert.match(worker,/native_existing_file_install_preflight:nativeExistingFilePreflight/);
});
