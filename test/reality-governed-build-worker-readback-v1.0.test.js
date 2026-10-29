import test from 'node:test';
import assert from 'node:assert/strict';
import {observeGovernedBuildWorker}
 from '../src/reality-governed-build-worker-readback-v1.0.js';
const queueId='00000000-0000-4000-8000-000000000003';
const sha='a'.repeat(40);
const queue={queue_id:queueId,dispatch_commit_sha:sha,
 request_path:'reality-requests/'+queueId+'.json'};
const worker='reality/worker/foundational-build-queue-v1';
const path='.github/workflows/reality-governed-build-worker-v1.yml';
const env={VERCEL_ENV:'preview',
 REALITY_BUILDER_DISPATCH_GITHUB_TOKEN:'test-read-only-worker-credential-not-real'};
const run=(overrides={})=>({id:123,head_sha:sha,
 head_branch:worker,event:'push',path,status:'completed',conclusion:'success',
 html_url:'https://github.com/maloney2323/Reality/actions/runs/123',
 ...overrides});
function fake(runs){
 let calls=[];
 return {calls,fetchImpl:async(url,opts)=>{
  calls.push({url,opts});
  return {ok:true,json:async()=>({workflow_runs:runs})};
 }};
}
test('exact dispatch GitHub run success is only read-only discovery, not an upgrade',async()=>{
 const h=fake([run()]);
 const observed=await observeGovernedBuildWorker({queue,env,fetchImpl:h.fetchImpl});
 assert.equal(observed.state,'DISCOVERY_WORKER_SUCCESS_OBSERVED');
 assert.equal(observed.worker_run_ref,'https://github.com/maloney2323/Reality/actions/runs/123');
 assert.equal(observed.exact_dispatch_sha,sha);
 for(const field of ['independent_gap_verified','model_generated','sandbox_verified',
  'installation_authorized','capability_installed','original_job_resumed',
  'original_job_settled','production_changed'])
  assert.equal(observed[field],false);
 assert.equal(h.calls.length,1);
 assert.match(h.calls[0].url,/head_sha=a{40}/);
 assert.equal(h.calls[0].opts.method,'GET');
 assert.ok(!h.calls[0].opts.body);
});
test('queued and failed runs never become verified missing-capability receipts',async()=>{
 for(const entry of [run({status:'queued',conclusion:null}),
  run({status:'completed',conclusion:'failure'})]){
  const h=fake([entry]);
  const observed=await observeGovernedBuildWorker({queue,env,fetchImpl:h.fetchImpl});
  assert.notEqual(observed.state,'DISCOVERY_WORKER_SUCCESS_OBSERVED');
  assert.equal(observed.independent_gap_verified,false);
  assert.equal(observed.capability_installed,false);
 }
});
test('wrong source commit, branch, workflow, event and URL cannot pass readback',async()=>{
 for(const forged of [run({head_sha:'b'.repeat(40)}),
  run({head_branch:'main'}),run({path:'other.yml'}),
  run({event:'workflow_dispatch'}),run({html_url:'https://evil.example/123'})]){
  const h=fake([forged]);
  const observed=await observeGovernedBuildWorker({queue,env,fetchImpl:h.fetchImpl});
  assert.equal(observed.state,'WORKER_RUN_NOT_OBSERVED');
 }
});
test('multiple apparent matching runs and unverified dispatch fail closed',async()=>{
 assert.equal((await observeGovernedBuildWorker({
  queue,env,fetchImpl:fake([run(),run({id:124,html_url:'https://github.com/maloney2323/Reality/actions/runs/124'})]).fetchImpl,
 })).state,'WORKER_RUN_AMBIGUOUS');
 const h=fake([run()]);
 const invalid=await observeGovernedBuildWorker({
  queue:{...queue,request_path:'reality-requests/forged.json'},
  env,fetchImpl:h.fetchImpl,
 });
 assert.equal(invalid.state,'DISPATCH_RECEIPT_NOT_VERIFIED');
 assert.equal(h.calls.length,0);
});
test('production, missing token and provider failures do not trigger side effects',async()=>{
 const h=fake([run()]);
 assert.equal((await observeGovernedBuildWorker({queue,
  env:{...env,VERCEL_ENV:'production'},fetchImpl:h.fetchImpl})).state,'PREVIEW_ONLY');
 assert.equal((await observeGovernedBuildWorker({queue,
  env:{VERCEL_ENV:'preview'},fetchImpl:h.fetchImpl})).state,
  'WORKER_READ_CREDENTIAL_UNAVAILABLE');
 assert.equal(h.calls.length,0);
 assert.equal((await observeGovernedBuildWorker({queue,env,
  fetchImpl:async()=>{throw Error('provider down');}})).state,
  'WORKER_PROVIDER_READBACK_UNAVAILABLE');
});
