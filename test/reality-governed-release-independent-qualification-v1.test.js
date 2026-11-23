import test from 'node:test';
import assert from 'node:assert/strict';
import {qualifyCurrentIsolatedSignedWorkerRelease as qualify}
 from '../src/reality-governed-release-independent-qualification-v1.js';

const sha='a'.repeat(40),branch='feature/final-loop-qualified';
const project='abcdefghijklmnopqrst',parent='bcdefghijklmnopqrstu';
const env={
 VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_SHA:sha,
 VERCEL_GIT_COMMIT_REF:branch,
 REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED:'true',
 REALITY_FINAL_LOOP_PR_SOURCE_PLAN_STAGING_ENABLED:'true',
 REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED:'true',
 REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF:project,
 REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF:parent,
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
 REALITY_FINAL_LOOP_CHILD_APPROVAL_PREPARATION_ENABLED:'true',
 REALITY_RELEASE_CONTROL_PARENT_BENCHMARK_PROJECT_REF:parent,
 REALITY_SIGNED_WORKER_TARGET_RELEASE_SHA:sha,
 REALITY_SIGNED_WORKER_TARGET_RELEASE_REF:branch,
 REALITY_SIGNED_WORKER_RELEASE_OWNER_ID:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
 REALITY_SIGNED_WORKER_RELEASE_SHIFT_ID:'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
 REALITY_SIGNED_WORKER_TARGET_DEPLOYMENT_ID:'dpl_verified1234',
 REALITY_SIGNED_WORKER_TARGET_CAPABILITY_KEY:'PREPARE_FINAL_LOOP_CHILD_OWNER_PACKET',
 REALITY_SIGNED_WORKER_RELEASE_CI_RUN_ID:'2004',
 REALITY_VERIFIED_GITHUB_REPOSITORY:'org/repo',
 REALITY_RELEASE_CONTROL_SUPABASE_MANAGEMENT_TOKEN:'s'.repeat(32),
 REALITY_RELEASE_CONTROL_GITHUB_READ_TOKEN:'g'.repeat(32),
 REALITY_VERIFIED_VERCEL_RELEASE_API_TOKEN:'v'.repeat(32),
 REALITY_VERIFIED_VERCEL_TEAM_ID:'team_verified1234',
 REALITY_VERIFIED_VERCEL_PROJECT_ID:'prj_verified1234',
 REALITY_SIGNED_WORKER_STABLE_ALIAS:'governed-release-preview.vercel.app'
};
function fixture({e={},branches=null,ci=null,deploy=null}={}){
 const calls=[];
 const b=branches??[
  {name:'new-preview',project_ref:project,parent_project_ref:parent,
   is_default:false,preview_project_status:'ACTIVE_HEALTHY',
   status:'FUNCTIONS_DEPLOYED'}];
 const c=ci??{id:2004,head_sha:sha,head_branch:branch,
  name:'Reality Final Loop Engine lifecycle acceptance',
  path:'.github/workflows/reality-final-loop-engine-v1-ci.yml',
  status:'completed',conclusion:'success',event:'push'};
 const d=deploy??{id:'dpl_verified1234',project:{id:'prj_verified1234'},
  state:'READY',target:null,
  meta:{githubCommitSha:sha,githubCommitRef:branch,
   githubOrg:'org',githubRepo:'repo'}};
 const fetchImpl=async url=>{
  calls.push(String(url));
  return {ok:true,json:async()=>{
   if(String(url).includes('api.supabase.com'))return b;
   if(String(url).includes('api.github.com'))return c;
   if(String(url).includes('api.vercel.com'))return d;
   throw Error('unknown provider');
  }};
 };
 return {result:qualify({env:{...env,...e},dbProject:project,fetchImpl}),
  calls};
}
test('isolated release needs real Supabase branch, matching CI, matching Vercel',async()=>{
 const f=fixture();
 const r=await f.result;
 assert.equal(r.status,'QUALIFIED_EXACT_ISOLATED_SIGNED_WORKER_RELEASE_READ_ONLY');
 assert.equal(r.candidate.isolated_database_independently_verified,true);
 assert.equal(r.candidate.source_staging_only,false);
 assert.equal(r.candidate.owner_packet_handler_registered,true);
 assert.equal(r.ci.independently_verified,true);
 assert.equal(f.calls.length,3);
 assert.equal(r.release_activated,false);
 assert.equal(r.owner_approval_granted,false);
});
test('live shared benchmark or staging-only preview cannot qualify',async()=>{
 const staging=await fixture({e:{REALITY_FINAL_LOOP_PREVIEW_SOURCE_PLAN_WAKE_ONLY:'true'}}).result;
 assert.equal(staging.status,'QUALIFIED_NORMAL_SIGNED_WORKER_RUNTIME_NOT_PRESENT');
 const wrong=await fixture({e:{REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF:parent}}).result;
 assert.equal(wrong.status,'PINNED_RELEASE_OR_PROVIDER_PROOF_CONFIG_MISSING');
});
test('missing or default-only Supabase branch fails before CI and Vercel',async()=>{
 const f=fixture({branches:[{project_ref:parent,parent_project_ref:parent,
  is_default:true,preview_project_status:'ACTIVE_HEALTHY',
  status:'FUNCTIONS_DEPLOYED'}]});
 const r=await f.result;
 assert.equal(r.status,'ISOLATED_SUPABASE_DEVELOPMENT_BRANCH_NOT_VERIFIED');
 assert.equal(f.calls.length,1);
});
test('a passing CI run on another commit cannot qualify a release',async()=>{
 const f=fixture({ci:{id:2004,head_sha:'b'.repeat(40),head_branch:branch,
  name:'Reality Final Loop Engine lifecycle acceptance',
  path:'.github/workflows/reality-final-loop-engine-v1-ci.yml',
  status:'completed',conclusion:'success',event:'push'}});
 const r=await f.result;
 assert.equal(r.status,'INDEPENDENT_EXACT_RELEASE_CI_NOT_PASSED');
 assert.equal(f.calls.length,2);
});
test('Vercel READY on a different commit is not sufficient',async()=>{
 const f=fixture({deploy:{id:'dpl_verified1234',
  project:{id:'prj_verified1234'},state:'READY',target:null,
  meta:{githubCommitSha:'b'.repeat(40),githubCommitRef:branch,
   githubOrg:'org',githubRepo:'repo'}}});
 const r=await f.result;
 assert.equal(r.status,'VERCEL_RELEASE_COMMIT_OR_PROJECT_IDENTITY_MISMATCH');
 assert.equal(f.calls.length,3);
});
