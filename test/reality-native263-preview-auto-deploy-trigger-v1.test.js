import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {executeNative263GovernedPreviewAutoDeployTrigger} from
 '../src/reality-native263-preview-auto-deploy-trigger-bridge-v1.js';
const SHIFT='9460cfff-937a-4105-9093-2e41ab39a950';
const WORK='work:873a6e74fd14c6beacc9042dd8021dfc';
const db={url:'https://hvkfreoagbrphwghjajw.supabase.co',
 project:'hvkfreoagbrphwghjajw',strictSecrets:true,
 secretKey:'fake-unit-test-service-key-with-length'};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:db.project};
const graph={status:'UNIFIED_OWNER_JOB_CONTROL_READY',
 shift_id:SHIFT,installation_authorized:false,production_changed:false,
 jobs:[{original_work_id:WORK,
  phase:'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL',
  independent_source_proof_verified:true}]};
const sourcePreflight={
 status:'NATIVE_263_EXISTING_SOURCE_TRANSPORT_PREFLIGHT_VERIFIED',
 original_work_id:WORK,existing_file_baseline_verified:true
};
const installWarrant={
 status:'EXACT_NATIVE263_OWNER_WARRANT_STAGED_INSTALL_BLOCKED',
 original_work_id:WORK,installation_authorized:false,
 owner_approval_ready:false};
const liveInstallerFence={
 status:'NATIVE263_EXACT_OWNER_APPROVAL_SERVICE_FENCE_LIVE_VERIFIED',
 installation_authorized:false,source_installed:false};
const base={original_work_id:WORK,shift_id:SHIFT,
 installation_authorized:false,source_installed:false,
 original_job_completed:false,production_changed:false};
test('trusted worker sends one exact inert broker request and preserves owner gate',async()=>{
 let calls=0;
 const result=await executeNative263GovernedPreviewAutoDeployTrigger({
  db,env,graph,sourcePreflight,installWarrant,liveInstallerFence,
  fetchImpl:async(url,opts)=>{
   calls++;
   assert.equal(url,db.url+
    '/functions/v1/reality-native263-preview-auto-deploy-trigger-v1');
   assert.equal(opts.method,'POST');
   assert.equal(opts.headers.authorization,'Bearer '+db.secretKey);
   assert.equal(opts.body,
    '{"version":1,"action":"probe_existing_preview_auto_deploy"}');
   return {ok:true,json:async()=>({
    ...base,status:'REALITY_GOVERNED_PREVIEW_GIT_PUSH_VERIFIED',
    git_write_verified:true,github_http_status:201,
    github_commit_sha:'a'.repeat(40)
   })};
  }
 });
 assert.equal(calls,1);
 assert.equal(result.github_push_verified,true);
 assert.equal(result.github_commit_sha,'a'.repeat(40));
 assert.equal(result.actual_vercel_deployment_verified,false);
 assert.equal(result.original_job_completed,false);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.source_installed,false);
});
test('fail closed if original, verified source or approval fence has drifted',async()=>{
 for(const override of [
  {graph:{...graph,shift_id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'}},
  {graph:{...graph,installation_authorized:true}},
  {graph:{...graph,jobs:[]}},
  {sourcePreflight:{...sourcePreflight,existing_file_baseline_verified:false}},
  {installWarrant:{...installWarrant,owner_approval_ready:true}},
  {liveInstallerFence:{...liveInstallerFence,source_installed:true}},
  {env:{...env,VERCEL_ENV:'production'}},
 ]){
  await assert.rejects(()=>executeNative263GovernedPreviewAutoDeployTrigger({
   db,env,graph,sourcePreflight,installWarrant,liveInstallerFence,
   ...override,fetchImpl:()=>{throw Error('must never call broker')}
  }),/NATIVE263_AUTO_DEPLOY_PROBE_SAME_ORIGINAL_PREAPPROVAL_AND_SOURCE_SCOPE_REQUIRED/);
 }
});
test('broker cannot claim deployment success or source install based on git push',async()=>{
 for(const changed of [
  {installation_authorized:true},
  {source_installed:true},
  {production_changed:true},
  {original_job_completed:true},
  {original_work_id:'work:'+'0'.repeat(32)},
  {git_write_verified:true,github_commit_sha:null}
 ]){
  await assert.rejects(()=>executeNative263GovernedPreviewAutoDeployTrigger({
   db,env,graph,sourcePreflight,installWarrant,liveInstallerFence,
   fetchImpl:async()=>({ok:true,json:async()=>({
    ...base,status:'REALITY_GOVERNED_PREVIEW_GIT_PUSH_VERIFIED',
    git_write_verified:false,github_commit_sha:null,...changed
   })})
  }),/NATIVE263_AUTO_DEPLOY_PROBE_(BROKER_ORIGINAL_SCOPE_OR_EFFECT_CLAIM_INVALID|VERIFIED_GIT_PUSH_REQUIRES_EXACT_PROVIDER_COMMIT)/);
 }
});
test('one-time SQL claim and Edge restrict to inert active preview file',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261112000006_native263_active_preview_auto_deploy_probe_v1.sql',
  import.meta.url),'utf8');
 const edge=readFileSync(new URL(
  '../supabase/functions/reality-native263-preview-auto-deploy-trigger-v1/index.ts',
  import.meta.url),'utf8');
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',
  import.meta.url),'utf8');
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/on conflict do nothing returning/);
 assert.match(sql,/and state='CLAIMED'/);
 assert.match(sql,/STAGED_UNAPPROVED/);
 assert.match(sql,/native263_contents_canary_probes_v2/);
 assert.match(sql,/riley_unattended_repair_originals_v1/);
 assert.match(sql,/EXACT_INERT_ACTIVE_PREVIEW_DEPLOY_PROBE_CLAIMED/);
 assert.match(sql,/EXISTING_ACTIVE_PREVIEW_PROBE_FENCED_NO_REPOST/);
 assert.match(sql,/grant execute on function public.reality_claim_native263_preview_auto_deploy_probe_v1/);
 assert.match(sql,/grant execute on function public.reality_record_native263_preview_auto_deploy_probe_v1/);
 assert.match(edge,/const BRANCH='reality\/isolated-openai-governance-gateway-20261108'/);
 assert.match(edge,/const PATH='evidence\/native263-active-preview-auto-deploy-probe-20261112.json'/);
 assert.match(edge,/const SOURCE='src\/reality-riley-service-original-runtime-v1.js'/);
 assert.match(edge,/SOURCE_BLOB='aaf22a1f69a2c3e91e18641cf1ef40d16a563bc0'/);
 assert.match(edge,/method==='PUT'&&path==='\/contents\/'\+PATH/);
 assert.match(edge,/EXISTING_ACTIVE_PREVIEW_PROBE_FENCED_NO_REPOST/);
 assert.match(edge,/GITHUB_COMMIT_READBACK_VERIFIED/);
 assert.match(edge,/automatic_vercel_deployment_verified:false/);
 assert.match(edge,/original_job_completed:false,production_changed:false/);
 assert.match(worker,/executeNative263GovernedPreviewAutoDeployTrigger/);
 assert.match(worker,/native_preview_auto_deploy_probe:nativePreviewAutoDeployProbe/);
});
