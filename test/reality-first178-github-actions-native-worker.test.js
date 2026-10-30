import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyGitHubFirst178Run,runGitHubFirst178Recovery,verifyScopedVercelSandboxAccess}
 from '../scripts/reality-run-first178-github-worker.mjs';
const branch='feature/first178-live-single-claim-execution-20261029';
const sha='a'.repeat(40);
const work='work:9b9578b3c65427589c4c6da68fe0fc87';
const db='hvkfreoagbrphwghjajw';
const env={
 GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'workflow_dispatch',
 GITHUB_REPOSITORY:'maloney2323/Reality',
 GITHUB_REF:'refs/heads/'+branch,GITHUB_SHA:sha,
 REALITY_FIRST178_EXECUTOR:'GITHUB_ACTIONS',
 VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:branch,VERCEL_GIT_COMMIT_SHA:sha,
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:db,
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:db,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:db,
 REALITY_PERSONAL_CHAT_SUPABASE_URL:'https://'+db+'.supabase.co',
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:'https://'+db+'.supabase.co',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 SUPABASE_SECRET_KEY:'a'.repeat(42),
 REALITY_STANDALONE_OPENAI_API_KEY:'b'.repeat(42),
 VERCEL_TOKEN:'c'.repeat(42),VERCEL_TEAM_ID:'team_'+'d'.repeat(20),
 VERCEL_PROJECT_ID:'prj_5A3b0WG9IuvzyEUBw9tD9v8jcha8',
 REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY:'sb_publishable_'+'e'.repeat(30),
 REALITY_CHAT_RECEIPT_HMAC_KEY:'f'.repeat(42),
 REALITY_FIRST178_GITHUB_READ_TOKEN:'g'.repeat(42),
 REALITY_SEMANTIC_REVIEW_MODEL:'gpt-5.6-luna',
};
const valid={verified_server_dispatch:true,status:'AWAITING_OWNER_APPROVAL',
 original_work_id:work,original_job_completed:false,installed:false,
 production_changed:false,queue_id:'f'.repeat(8)+'-aaaa-4aaa-8aaa-'+'f'.repeat(12),
 checkpoint_receipt_id:'b'.repeat(8)+'-bbbb-4bbb-8bbb-'+'b'.repeat(12)};
test('GitHub-native original worker checks exact branch and HEAD before DB mutation',()=>{
 assert.equal(verifyGitHubFirst178Run(env,sha).original_work_id,work);
 for(const bad of [
  {GITHUB_REPOSITORY:'attacker/Reality'},
  {GITHUB_REF:'refs/heads/main'},
  {GITHUB_ACTIONS:'false'},
  {GITHUB_EVENT_NAME:'push'},
  {VERCEL_GIT_COMMIT_SHA:'b'.repeat(40)},
  {REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'foreign'},
  {VERCEL_PROJECT_ID:'prj_foreign'},
  {SUPABASE_SECRET_KEY:''},
  {REALITY_STANDALONE_OPENAI_API_KEY:''},
  {VERCEL_TOKEN:''},
  {REALITY_CHAT_RECEIPT_HMAC_KEY:''},
  {REALITY_FIRST178_GITHUB_READ_TOKEN:''},
 ]){
  assert.throws(()=>verifyGitHubFirst178Run({...env,...bad},sha),
    /^Error: REALITY_FIRST178_GITHUB_WORKER_/);
 }
 assert.throws(()=>verifyGitHubFirst178Run(env,'b'.repeat(40)),
  /EXACT_WORKFLOW_REPOSITORY_BRANCH_COMMIT_REQUIRED/);
});
test('GitHub invokes existing direct-dispatch+DB-handoff path once; no installation',async()=>{
 let calls=0;
 const r=await runGitHubFirst178Recovery({env,checkoutSha:sha,
  verifyProvider:async()=>true,
  dispatch:async ({env:observed})=>{
   calls++;assert.equal(observed,env);return valid;
  },
 });
 assert.equal(calls,1);
 assert.equal(r.status,'AWAITING_OWNER_APPROVAL');
 assert.equal(r.approval_1_required,true);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.production_changed,false);
 assert.equal(r.original_work_id,work);
});
test('independent sandbox failure cannot become completion or green GitHub action',async()=>{
 for(const outcome of [
  {...valid,status:'ESCALATED'},
  {...valid,status:'EXECUTION_UNRESOLVED'},
  {...valid,verified_server_dispatch:false},
  {...valid,installed:true},
  {...valid,original_job_completed:true},
  {...valid,original_work_id:'work:'+'c'.repeat(32)},
  {...valid,production_changed:true},
 ]){
  await assert.rejects(runGitHubFirst178Recovery({env,checkoutSha:sha,
  verifyProvider:async()=>true,
   dispatch:async()=>outcome}),
  /REALITY_FIRST178_GITHUB_WORKER_/);
 }
});
test('wrong branch or missing secrets never calls privileged dispatcher',async()=>{
 for(const x of [
  {...env,GITHUB_REF:'refs/heads/main'},
  {...env,SUPABASE_SECRET_KEY:''},
 ]){
  let calls=0;
  await assert.rejects(runGitHubFirst178Recovery({env:x,checkoutSha:sha,
   verifyProvider:async()=>true,
   dispatch:async()=>{calls++;return valid;}}),
  /REALITY_FIRST178_GITHUB_WORKER_/);
  assert.equal(calls,0);
 }
});

test('Vercel Sandbox project credential is checked via read-only management API',async()=>{
 let calls=0;
 const ok=await verifyScopedVercelSandboxAccess({env,
  fetchImpl:async (url,options)=>{
   calls++;
   assert.match(url,/^https:\/\/api\.vercel\.com\/v9\/projects\/prj_/);
   assert.equal(options.method,'GET');
   assert.equal(options.headers.authorization,'Bearer '+env.VERCEL_TOKEN);
   return {ok:true,json:async()=>({id:env.VERCEL_PROJECT_ID,name:'reality'})};
  },
 });
 assert.equal(ok,true);
 assert.equal(calls,1);
 for(const badResponse of [
  {ok:false},
  {ok:true,json:async()=>({id:'prj_foreign',name:'reality'})},
 ]){
  await assert.rejects(
   verifyScopedVercelSandboxAccess({env,fetchImpl:async()=>badResponse}),
   /REALITY_FIRST178_GITHUB_WORKER_SANDBOX_PROVIDER_/);
 }
});
test('read-only sandbox preflight failure does not consume the original #178 claim',async()=>{
 let called=0;
 await assert.rejects(runGitHubFirst178Recovery({env,checkoutSha:sha,
  verifyProvider:async()=>{throw Error('TOKEN_REJECTED')},
  dispatch:async()=>{called++;return valid;},
 }),/TOKEN_REJECTED/);
 assert.equal(called,0);
});
