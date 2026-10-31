import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyApprovedBackgroundReadiness}
 from '../src/reality-approved-repair-background-readiness-v1.0.js';
const repo='maloney2323/Reality',branch='feature/reality-closed-loop-worker-20261031';
const path='.github/workflows/reality-owner-approved-continuation-readiness-v1.yml';
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:branch,
 REALITY_BUILDER_DISPATCH_GITHUB_TOKEN:'test-only-credential-not-authority'};
const run=(conclusion='success')=>({id:41219689804,run_number:5,
 path,event:'push',head_branch:branch,head_repository:{full_name:repo},
 status:'completed',conclusion});
test('no configured dispatcher means no irrevocable owner approval prerequisite',async()=>{
 let fetchCalls=0;
 const read=await verifyApprovedBackgroundReadiness({
  env:{...env,REALITY_BUILDER_DISPATCH_GITHUB_TOKEN:''},
  fetchImpl:async()=>{fetchCalls++;throw Error('should not query');}});
 assert.equal(read.ready,false);
 assert.equal(read.code,'GITHUB_BACKGROUND_DISPATCH_CREDENTIAL_UNAVAILABLE');
 assert.equal(read.installation_authorized,false);
 assert.equal(fetchCalls,0);
});
test('only a successful exact branch Actions prerequisite qualifies as ready',async()=>{
 const results=[];
 for(const runs of [[run('failure')],[run('success')],[
  {...run('success'),head_branch:'main'}],[],[run('success'),{
   ...run('failure'),id:41219689805,run_number:6}]]){
  const s=await verifyApprovedBackgroundReadiness({
   env,fetchImpl:async(url,options)=>{
    assert.match(url,/reality-owner-approved-continuation-readiness-v1.yml/);
    assert.equal(options.method,'GET');
    return {ok:true,json:async()=>({workflow_runs:runs})};
   }});
  results.push(s.ready);
  assert.equal(s.installation_authorized,false);
  assert.equal(s.original_job_completed,false);
 }
 assert.deepEqual(results,[false,true,false,false,false]);
});
test('inaccessible Github and a foreign environment fail closed',async()=>{
 const down=await verifyApprovedBackgroundReadiness({env,
  fetchImpl:async()=>({ok:false,status:403})});
 assert.equal(down.ready,false);
 const foreign=await verifyApprovedBackgroundReadiness({
  env:{...env,VERCEL_ENV:'production'},fetchImpl:async()=>{throw Error('NO');}});
 assert.equal(foreign.ready,false);
});
