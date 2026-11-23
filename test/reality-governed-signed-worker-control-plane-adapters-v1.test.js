import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrustedSignedWorkerReleaseControlPlaneAdapters as create}
 from '../src/reality-governed-signed-worker-control-plane-adapters-v1.js';
const sha='a'.repeat(40),oldSha='b'.repeat(40);
const project='abcdefghijklmnopqrst';
const url='https://'+project+'.supabase.co/';
const alias='reality-governed-worker-preview.vercel.app';
const oldHost='reality-git-maintenance-preview.vercel.app';
const deploymentId='dpl_abcd1234567890',oldDeployment='dpl_bcde1234567890';
const branch='feature/qualified-signed-shift';
const env={
 VERCEL_ENV:'preview',
 REALITY_GOVERNED_RELEASE_SWITCH_TRIGGER_ENABLED:'true',
 REALITY_SIGNED_CAPABILITY_DELIVERY_ENABLED:'true',
 REALITY_RELEASE_CONTROL_DB_PROJECT_REF:project,
 REALITY_VERIFIED_GITHUB_REPOSITORY:'example-org/example-repo',
 REALITY_VERIFIED_VERCEL_PROJECT_ID:'prj_testrelease12345',
 REALITY_VERIFIED_VERCEL_TEAM_ID:'team_testrelease12345',
 REALITY_VERIFIED_VERCEL_RELEASE_API_TOKEN:'x'.repeat(36),
 REALITY_SIGNED_WORKER_CRON_JOB_ID:'7',
 REALITY_SIGNED_WORKER_STABLE_ALIAS:alias,
 REALITY_SIGNED_WORKER_TARGET_DEPLOYMENT_ID:deploymentId,
 REALITY_SIGNED_WORKER_TARGET_RELEASE_SHA:sha,
 REALITY_SIGNED_WORKER_TARGET_RELEASE_REF:branch
};
const db={strictSecrets:true,secretKey:'z'.repeat(36),url,project};
const schedule={status:'GOVERNED_RELEASE_CRON_SCHEDULE_READ_ONLY',
 job_id:7,provider:'SUPABASE_PG_CRON',active:true,host:oldHost,
 method:'POST',endpoint_path:'/api/reality/governed-employee-shift-worker',
 schedule:'*/5 * * * *',credential_values_exposed:false};
function fixture({config={},cron=schedule,wrongProject=false,
 wrongSha=false,failWrite=false}={}){
 const calls=[];
 const fetchImpl=async(address,options)=>{
  const url=String(address),method=options.method;
  calls.push({url,method,body:options.body});
  if(url.includes('/rest/v1/rpc/reality_read_governed_worker_release_schedule_v1'))
   return {ok:true,json:async()=>cron};
  if(url.includes('/rest/v1/rpc/reality_claim_governed_signed_worker_release_v1'))
   return {ok:true,json:async()=>({status:'EXACT_SIGNED_CAPABILITY_DELIVERY_CLAIMED'})};
  if(url.includes('/v4/aliases/'))
   return {ok:true,json:async()=>({alias:decodeURIComponent(url.split('/v4/aliases/')[1].split('?')[0]),
    deploymentId:url.includes(encodeURIComponent(oldHost))?oldDeployment:deploymentId,
    projectId:wrongProject?'prj_otherrelease99999':env.REALITY_VERIFIED_VERCEL_PROJECT_ID})};
  if(url.includes('/v13/deployments/')){
   const old=url.includes(oldDeployment);
   return {ok:true,json:async()=>({id:old?oldDeployment:deploymentId,
    project:{id:env.REALITY_VERIFIED_VERCEL_PROJECT_ID},
    state:'READY',target:null,
    meta:{githubOrg:'example-org',githubRepo:'example-repo',
     githubCommitSha:old?oldSha:wrongSha?oldSha:sha,
     githubCommitRef:old?'repair/older-worker':branch}})};
  }
  if(method==='POST'&&url.includes('/v2/deployments/')){
   if(failWrite)throw Error('ambiguous provider timeout');
   return {ok:true,json:async()=>({alias})};
  }
  throw Error('UNEXPECTED_PROVIDER_ROUTE');
 };
 return {adapter:create({env:{...env,...config},db,fetchImpl}),
  calls,fetchImpl};
}
test('missing server credential or exact trusted project fails before network calls',()=>{
 const f=fixture({config:{REALITY_VERIFIED_VERCEL_RELEASE_API_TOKEN:''}});
 assert.equal(f.adapter.ready,false);
 assert.equal(f.adapter.status,'RELEASE_CONTROL_TRUSTED_PROVIDER_CONFIG_NOT_READY');
 assert.equal(f.calls.length,0);
});
test('read-only scheduled worker verification uses DB and current Vercel identity',async()=>{
 const f=fixture();
 const v=await f.adapter.readSchedule();
 assert.equal(v.status,'GOVERNED_SCHEDULE_INDEPENDENTLY_READ');
 assert.equal(v.host,oldHost);
 assert.equal(v.branch_automanaged,true);
 assert.equal(v.dedicated_stable_release_alias,false);
 assert.equal(v.signed_worker_target_verified,true);
 assert.equal(f.calls.filter(x=>x.method==='POST').length,1);
 assert.ok(f.calls.every(x=>!x.url.includes(db.secretKey)));
});
test('a mismatched Vercel project cannot certify the scheduler',async()=>{
 const f=fixture({wrongProject:true});
 await assert.rejects(()=>f.adapter.readSchedule(),/RELEASE_ALIAS_PROJECT_BINDING_UNVERIFIED/);
 assert.equal(f.calls.filter(x=>x.url.includes('/v2/deployments/')).length,0);
});
test('one-use claim is DB service only and rejects a different release',async()=>{
 const f=fixture();
 const a={owner_id:'a'.repeat(8)+'-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
  shift_id:'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
  release_sha:sha,release_ref:branch,
  capability_key:'PREPARE_FINAL_LOOP_CHILD_OWNER_PACKET',
  scheduled_alias:alias,
  previous_release_sha:oldSha,previous_release_ref:'repair/older-worker',
  independent_ci_run_id:2001};
 assert.equal((await f.adapter.claimApprovedRelease(a)).status,
  'EXACT_SIGNED_CAPABILITY_DELIVERY_CLAIMED');
 await assert.rejects(()=>f.adapter.claimApprovedRelease({...a,release_sha:oldSha}),
  /RELEASE_OWNER_CLAIM_EXACT_INPUT_UNVERIFIED/);
 assert.equal(f.calls.filter(x=>x.url.includes('reality_claim_governed')).length,1);
});
test('approved provider assignment checks deployment SHA before exactly one POST',async()=>{
 const f=fixture();
 const args={alias,release_sha:sha,release_ref:branch,
  owner_id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
  shift_id:'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
  capability_key:'PREPARE_FINAL_LOOP_CHILD_OWNER_PACKET',
  claim_id:'cccccccc-cccc-4ccc-cccc-cccccccccccc'};
 const r=await f.adapter.assignAlias(args);
 assert.equal(r.release_sha,sha);
 assert.equal(f.calls.filter(x=>x.url.includes('/v2/deployments/')).length,1);
 const broken=fixture({wrongSha:true});
 await assert.rejects(()=>broken.adapter.assignAlias(args),
  /RELEASE_PROVIDER_PINNED_DEPLOYMENT_DRIFT/);
 assert.equal(broken.calls.filter(x=>x.url.includes('/v2/deployments/')).length,0);
});
test('ambiguous provider result is never automatically retried',async()=>{
 const f=fixture({failWrite:true});
 await assert.rejects(()=>f.adapter.assignAlias({
  alias,release_sha:sha,release_ref:branch,
  owner_id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
  shift_id:'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
  capability_key:'PREPARE_FINAL_LOOP_CHILD_OWNER_PACKET',
  claim_id:'cccccccc-cccc-4ccc-cccc-cccccccccccc'
 }),/ambiguous provider timeout/);
 assert.equal(f.calls.filter(x=>x.url.includes('/v2/deployments/')).length,1);
});
