import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureIndependentOriginalAcceptance}
 from '../src/reality-governed-installed-acceptance-wakeup-v1.js';
const SHA='b'.repeat(40);
const BRANCH='feature/reality-closed-loop-worker-20261031';
const WORK='work:9b9578b3c65427589c4c6da68fe0fc87';
const env={GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'workflow_dispatch',
 GITHUB_REPOSITORY:'maloney2323/Reality',
 GITHUB_REF:'refs/heads/feature/reality-background-continuation-20261031',
 VERCEL_ENV:'preview',
 REALITY_BUILDER_DISPATCH_GITHUB_TOKEN:'ephemeral-synthetic-not-a-real-token'};
const opts={env,originalWorkId:WORK,installedCommitSha:SHA,installedBranch:BRANCH};
const existing={id:700001,event:'workflow_dispatch',head_sha:SHA,
 head_branch:BRANCH,head_repository:{full_name:'maloney2323/Reality'},
 path:'.github/workflows/reality-source-bound-installed-acceptance-v1.yml'};
test('atomically approved installed source dispatches only the independent frozen test',async()=>{
 const calls=[];
 const observed=await ensureIndependentOriginalAcceptance({
  ...opts,fetchImpl:async(url,req)=>{
   calls.push({url,req});
   if(req.method==='GET')return {ok:true,json:async()=>({workflow_runs:[]})};
   assert.equal(req.method,'POST');
   assert.ok(url.endsWith('/dispatches'));
   assert.deepEqual(JSON.parse(req.body),{ref:BRANCH,inputs:{
    original_work_id:WORK,installed_commit_sha:SHA}});
   return {status:204};
  },
 });
 assert.equal(observed.status,'INDEPENDENT_ACCEPTANCE_TRIGGER_ACCEPTED');
 assert.equal(observed.original_job_completed,false);
 assert.equal(observed.production_changed,false);
 assert.equal(calls.length,2);
 assert.equal(calls[0].req.headers.authorization,'Bearer '+env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN);
});
test('an existing exact acceptance run is reused instead of issuing duplicate',async()=>{
 let writes=0;
 const observed=await ensureIndependentOriginalAcceptance({
  ...opts,fetchImpl:async(_url,req)=>{
   if(req.method==='POST')writes++;
   return {ok:true,json:async()=>({workflow_runs:[existing]})};
  },
 });
 assert.equal(observed.status,'INDEPENDENT_ACCEPTANCE_ALREADY_RUNNING_OR_RECORDED');
 assert.equal(observed.run_id,existing.id);
 assert.equal(writes,0);
});
test('no owner approved isolated worker context can start acceptance',async()=>{
 for(const invalid of [
  {...opts,env:{...env,GITHUB_EVENT_NAME:'schedule'}},
  {...opts,env:{...env,GITHUB_REF:'refs/heads/main'}},
  {...opts,env:{...env,REALITY_BUILDER_DISPATCH_GITHUB_TOKEN:null}},
  {...opts,originalWorkId:'work:'+'f'.repeat(32)},
  {...opts,installedCommitSha:'not-an-installed-commit'},
  {...opts,installedBranch:'main'},
 ]){
  let calls=0;
  await assert.rejects(ensureIndependentOriginalAcceptance({
   ...invalid,fetchImpl:async()=>{calls++;throw Error('UNAUTHORIZED_HTTP');},
  }),/REALITY_GOVERNED_ACCEPTANCE_WAKE_/);
  assert.equal(calls,0);
 }
});
