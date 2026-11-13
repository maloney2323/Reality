import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {probeRealityNative263GithubWriteTransport} from
 '../src/reality-native263-github-write-canary-bridge-v1.js';
const SHIFT='9460cfff-937a-4105-9093-2e41ab39a950';
const ORIGINAL='work:873a6e74fd14c6beacc9042dd8021dfc';
const ISSUE='https://github.com/maloney2323/Reality/issues/263';
const db={strictSecrets:true,project:'hvkfreoagbrphwghjajw',
 url:'https://hvkfreoagbrphwghjajw.supabase.co',
 secretKey:'test_service_role_secret_key_not_for_real_use'};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:db.project};
const graph={status:'UNIFIED_OWNER_JOB_CONTROL_READY',
 shift_id:SHIFT,installation_authorized:false,production_changed:false,
 jobs:[{original_work_id:ORIGINAL,source_ref:ISSUE,
  original_kind:'REAL_ENGINEERING_REPAIR_ORIGINAL',
  phase:'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL',
  independent_source_proof_verified:true}]};
const nativePreflight={
 status:'NATIVE_263_EXISTING_SOURCE_TRANSPORT_PREFLIGHT_VERIFIED',
 original_work_id:ORIGINAL,existing_file_baseline_verified:true,
 frozen_candidate_verified:true,installation_authorized:false,
 owner_approval_ready:false};
const base={original_work_id:ORIGINAL,shift_id:SHIFT,
 installation_authorized:false,original_job_completed:false,
 production_changed:false,source_code_installed:false,
 code_installed:false,new_shift_created:false,
 code_write_permission_verification_only:true};
const verified={...base,status:'NATIVE263_CONTENTS_WRITE_TRANSPORT_VERIFIED',
 canary_state:'VERIFIED',canary_write_verified:true,
 provider_http_status:201,
 provider_commit_sha:'a'.repeat(40)};
test('signed current native shift requests one strictly inert broker operation',async()=>{
 const requests=[];
 const r=await probeRealityNative263GithubWriteTransport({
  db,env,graph,nativePreflight,fetchImpl:async(url,opt)=>{
   requests.push({url,opt});
   return {ok:true,json:async()=>verified};
  }});
 assert.equal(requests.length,1);
 assert.equal(requests[0].url,db.url+
  '/functions/v1/reality-governed-pr-review-publisher-v1');
 assert.equal(requests[0].opt.method,'POST');
 assert.equal(requests[0].opt.body,
  '{"version":3,"action":"native_263_contents_canary"}');
 assert.equal(requests[0].opt.headers.authorization,'Bearer '+db.secretKey);
 assert.equal(r.canary_write_verified,true);
 assert.equal(r.provider_http_status,201);
 assert.equal(r.github_contents_credential_capable_for_inert_canary,true);
 assert.equal(r.installation_authorized,false);
 assert.equal(r.owner_approval_ready,false);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.source_code_installed,false);
 assert.equal(r.native_existing_file_installation_verified,false);
 assert.equal(r.postinstall_same_original_settlement_verified,false);
});
test('definitive Contents permission HTTP 403 never becomes an installation',async()=>{
 const r=await probeRealityNative263GithubWriteTransport({
  db,env,graph,nativePreflight,
  fetchImpl:async()=>({ok:true,json:async()=>({
   ...base,status:'NATIVE263_GITHUB_CONTENTS_WRITE_HTTP_403',
   canary_state:'BLOCKED',canary_write_verified:false,
   provider_http_status:403,provider_commit_sha:null
  })})
 });
 assert.equal(r.status,'NATIVE263_GITHUB_CONTENTS_WRITE_HTTP_403');
 assert.equal(r.provider_http_status,403);
 assert.equal(r.canary_write_verified,false);
 assert.equal(r.installation_authorized,false);
 assert.equal(r.source_code_installed,false);
});
test('never dispatch canary if original, shift, or owner approval state drifts',async()=>{
 for(const overrides of [
  {graph:{...graph,shift_id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'}},
  {graph:{...graph,installation_authorized:true}},
  {graph:{...graph,jobs:[{...graph.jobs[0],phase:'SETTLED'}]}},
  {nativePreflight:{...nativePreflight,owner_approval_ready:true}},
  {nativePreflight:{...nativePreflight,frozen_candidate_verified:false}},
  {env:{...env,VERCEL_ENV:'production'}}
 ]){
  await assert.rejects(()=>probeRealityNative263GithubWriteTransport({
   db,env,graph,nativePreflight,...overrides,
   fetchImpl:async()=>{throw Error('must not reach service broker')}
  }),/NATIVE263_WRITE_CANARY_OWNER_OR_NATIVE_PREFLIGHT_SCOPE_CHANGED/);
 }
});
test('broker cannot mint claimed write verification from a false receipt',async()=>{
 for(const wrong of [
  {...verified,installation_authorized:true},
  {...verified,original_work_id:'work:'+'0'.repeat(32)},
  {...verified,canary_write_verified:false},
  {...verified,provider_http_status:403},
  {...verified,source_code_installed:true}
 ]){
  await assert.rejects(()=>probeRealityNative263GithubWriteTransport({
   db,env,graph,nativePreflight,
   fetchImpl:async()=>({ok:true,json:async()=>wrong})
  }),/NATIVE263_WRITE_CANARY_(BROKER_FALSE_INSTALL_OR_SETTLEMENT_CLAIM|BROKER_CANARY_ORIGINAL_OR_PROOF_SCOPE_MISMATCH|GITHUB_CANARY_INDEPENDENT_PROVIDER_READBACK_NOT_PROVEN)/);
 }
});
test('canary is fenced in SQL and cannot write to #263 or production',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261112000002_native263_contents_probe_v1.sql',
  import.meta.url),'utf8');
 const edge=readFileSync(new URL(
  '../supabase/functions/reality-governed-pr-review-publisher-v1/index.ts',
  import.meta.url),'utf8');
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',
  import.meta.url),'utf8');
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/reality_read_current_shift_execution_graph_v1/);
 assert.match(sql,/phase'='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL'|phase'='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL'/);
 assert.match(sql,/on conflict do nothing returning/);
 assert.match(sql,/and state='CLAIMED'/);
 assert.match(sql,/provider_commit_sha/);
 assert.match(sql,/PROVIDER_EFFECT_UNVERIFIED/);
 assert.match(sql,/revoke all on function public.reality_claim_native263_contents_canary_v1/);
 assert.match(sql,/grant execute on function public.reality_claim_native263_contents_canary_v1/);
 assert.match(edge,/native_263_contents_canary/);
 assert.match(edge,/reality_claim_native263_contents_canary_v1/);
 assert.match(edge,/reality_record_native263_contents_canary_v1/);
 assert.match(edge,/CANARY_BASE='dd628609639e37f85c5151986d4f5eb691bddf03'/);
 assert.match(edge,/CANARY_FILE='evidence\/native263-broker-contents-write-canary-20261112.json'/);
 assert.match(edge,/method==='PUT'&&path===fileWrite/);
 assert.match(edge,/canary_write_verified:result_status==='WRITE_READBACK_VERIFIED'/);
 assert.match(edge,/original_job_completed:false,production_changed:false/);
 assert.match(worker,/native_github_contents_write_canary:nativeGithubWriteCanary/);
 assert.match(worker,/probeRealityNative263GithubWriteTransport/);
 const probe=edge.slice(edge.indexOf('// An inert, non-installing one-use'),
  edge.indexOf('Deno.serve(async req=>'));
 assert.doesNotMatch(probe,/method:'(?:PATCH|DELETE)'/);
 assert.doesNotMatch(probe,/\/contents\/src\/reality-riley-service-original-runtime-v1\.js/);
});
