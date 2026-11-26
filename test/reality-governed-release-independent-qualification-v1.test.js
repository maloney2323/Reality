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
  return {ok:true,status:200,json:async()=>{
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
 assert.match(r.provider_release_proof_sha256,/^sha256:[a-f0-9]{64}$/);
 assert.match(r.independent_isolation_proof_sha256,/^sha256:[a-f0-9]{64}$/);
 const again=await fixture().result;
 assert.equal(again.provider_release_proof_sha256,r.provider_release_proof_sha256);
 assert.equal(again.independent_isolation_proof_sha256,r.independent_isolation_proof_sha256);
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
 assert.equal(r.provider_failure.http_status,200);
 assert.deepEqual(r.provider_failure.mismatched_fields,['release_sha']);
 assert.equal(r.provider_failure.identity_matches,false);
 assert.equal(f.calls.length,3);
});

test('canonical benchmark qualification is a distinct topology, requires same current shift and independent gateway pass',async()=>{
 const owner=env.REALITY_SIGNED_WORKER_RELEASE_OWNER_ID,shift=env.REALITY_SIGNED_WORKER_RELEASE_SHIFT_ID;
 const gatewayPath='.github/workflows/reality-gateway-proof.yml';
 const e={...env,REALITY_RELEASE_CONTROL_RUNTIME_TOPOLOGY:'CANONICAL_BENCHMARK_PREVIEW',
  REALITY_RELEASE_CONTROL_DB_PROJECT_REF:parent,REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:parent,
  REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED:'false',REALITY_FINAL_LOOP_SHARED_BENCHMARK_STAGING_ENABLED:'true',
  REALITY_FINAL_LOOP_SHARED_BENCHMARK_OWNER_ID:owner,REALITY_FINAL_LOOP_SHARED_BENCHMARK_SHIFT_ID:shift,
  REALITY_FINAL_LOOP_SHARED_CONTINUITY_GUARD_ENABLED:'true',VERCEL_DEPLOYMENT_ID:env.REALITY_SIGNED_WORKER_TARGET_DEPLOYMENT_ID,
  REALITY_SIGNED_WORKER_RELEASE_GATEWAY_CI_RUN_ID:'2005',REALITY_SIGNED_WORKER_RELEASE_GATEWAY_CI_WORKFLOW_PATH:gatewayPath};
 const direction={status:'GOVERNED_RELEASE_DIRECTION_DRIFT_OBSERVED',read_only:true,release_activated:false,production_changed:false,
  authoritative_database:parent,owner_id:owner,shift_id:shift,configured_target_release_sha:sha,configured_target_release_ref:branch,
  scheduled_host:env.REALITY_SIGNED_WORKER_STABLE_ALIAS,cron_job_id:7,continuity_root_id:shift,continuity_revision:3,
  plan_fingerprint:'sha256:'+'1'.repeat(64),continuity_head_sha256:'sha256:'+'2'.repeat(64),qualifier_receipt_sha256:'sha256:'+'3'.repeat(64),
  original_work_id:'work:'+'4'.repeat(32),source_ref:'https://github.com/maloney2323/Reality/pull/307'};
 const calls=[];let gatewayPass=true;let branchStatus='FUNCTIONS_DEPLOYED';
 const transportCap='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM';
 const fetchImpl=async url=>{
  calls.push(String(url));
  let data;
  if(String(url).includes('api.supabase.com'))data=[{project_ref:project,parent_project_ref:parent,is_default:false,preview_project_status:'ACTIVE_HEALTHY',status:branchStatus}];
  else if(String(url).endsWith('/2004'))data={id:2004,head_sha:sha,head_branch:branch,name:'Reality Final Loop Engine lifecycle acceptance',
   path:'.github/workflows/reality-final-loop-engine-v1-ci.yml',status:'completed',conclusion:'success',event:'push'};
  else if(String(url).endsWith('/2005'))data={id:2005,head_sha:sha,head_branch:branch,name:'Reality — Isolated governed OpenAI gateway proof',
   path:gatewayPath,status:'completed',conclusion:gatewayPass?'success':'failure',event:'push'};
  else data={id:env.REALITY_SIGNED_WORKER_TARGET_DEPLOYMENT_ID,project:{id:env.REALITY_VERIFIED_VERCEL_PROJECT_ID},state:'READY',target:null,
   meta:{githubCommitSha:sha,githubCommitRef:branch,githubOrg:'org',githubRepo:'repo'}};
  return {ok:true,json:async()=>data};
 };
 const run=extra=>qualify({env:e,dbProject:parent,direction,fetchImpl,...extra});
 const result=await run();
 assert.equal(result.status,'QUALIFIED_EXACT_CANONICAL_SIGNED_WORKER_RELEASE_READ_ONLY');
 assert.equal(result.candidate.isolated_database_independently_verified,false);
 assert.equal(result.candidate.runtime_scope.runtime_database_project_ref,parent);
 assert.equal(result.candidate.runtime_scope.qualification_database_project_ref,project);
 assert.equal(result.candidate.runtime_scope.original_work_id,direction.original_work_id);
 assert.equal(result.release_activated,false);
 gatewayPass=false;
 assert.equal((await run()).status,'INDEPENDENT_GATEWAY_CI_NOT_PASSED');
 assert.equal((await run({direction:{...direction,shift_id:owner}})).status,'CANONICAL_RUNTIME_SAME_SHIFT_OR_GATEWAY_CONFIG_NOT_VERIFIED');
 gatewayPass=true;
 const transportEnv={...e,REALITY_SIGNED_WORKER_TARGET_CAPABILITY_KEY:transportCap,
  REALITY_FINAL_LOOP_REVIEW_TRANSPORT_ROLE:'CANONICAL'};
 const transportDirection={...direction,next_qualified_action:transportCap};
 const transportDb={project:parent,strictSecrets:true};
 const transportRun=extra=>run({env:transportEnv,direction:transportDirection,db:transportDb,...extra});
 assert.equal((await transportRun({direction})).status,'CANONICAL_RUNTIME_SAME_SHIFT_OR_GATEWAY_CONFIG_NOT_VERIFIED');
 assert.equal((await transportRun()).status,'ISOLATED_REVIEW_DEPLOYMENT_NOT_PINNED');
 const peerEnv={...transportEnv,REALITY_FINAL_LOOP_REVIEW_ISOLATED_DEPLOYMENT_ID:'dpl_peer12345678',
  REALITY_FINAL_LOOP_REVIEW_ISOLATED_HOST:'isolated-pinned-test.vercel.app'};
 assert.equal((await transportRun({env:peerEnv})).status,'ISOLATED_REVIEW_DEPLOYMENT_IDENTITY_MISMATCH');
 branchStatus='MIGRATIONS_FAILED';
 assert.equal((await run()).status,'ISOLATED_SUPABASE_DEVELOPMENT_BRANCH_NOT_VERIFIED');
 assert.equal((await transportRun()).status,'ISOLATED_REVIEW_DEPLOYMENT_NOT_PINNED');
 assert.equal((await transportRun({env:{...peerEnv,REALITY_FINAL_LOOP_REVIEW_TRANSPORT_PROBE_ONLY:'true'}})).status,
  'REVIEW_TRANSPORT_DIAGNOSTIC_ONLY_NOT_RELEASE_CAPACITY');
 assert.equal((await transportRun({env:peerEnv})).status,'ISOLATED_REVIEW_DEPLOYMENT_IDENTITY_MISMATCH');
});

test('qualification reports rejected provider access without treating it as proof or leaking response bodies',async()=>{
 let calls=0;
 const r=await qualify({env,dbProject:project,fetchImpl:async()=>{
  calls++;return {ok:false,status:403,json:async()=>{throw Error('SECRET_PROVIDER_BODY')}};
 }});
 assert.equal(calls,1);
 assert.equal(r.status,'INDEPENDENT_SUPABASE_BRANCH_ANCESTRY_READ_UNAVAILABLE');
 assert.equal(r.provider_failure.operation,'SUPABASE_BRANCH_READ');
 assert.equal(r.provider_failure.http_status,403);
 assert.equal(r.provider_failure.access_denied,true);
 assert.equal(r.provider_failure.next_governed_action,'VERIFY_PROVIDER_TOKEN_SCOPE_AND_RESOURCE_ACCESS');
 assert.equal(r.owner_approval_granted,false);
 assert.equal(r.release_activated,false);
 assert.equal(JSON.stringify(r).includes('SECRET'),false);
});
