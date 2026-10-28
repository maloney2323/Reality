import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyIndependentUpgradeDraftCI}
 from '../src/reality-independent-upgrade-ci-readback-v0.1.js';

const repo='maloney2323/Reality';
const sha='a'.repeat(40),baseSha='b'.repeat(40);
const branch='reality/build/build-'+'c'.repeat(32);
const root='https://api.github.com/repos/'+repo;
const names=['Governed Autonomous Self-Upgrading Provider v0.1',
 'Reality Governed Execution Engine v0.1'];
const opts={originalWorkId:'work:'+'d'.repeat(32),prNumber:150,
 expectedHeadSha:sha,expectedBranch:branch,pinnedBaseSha:baseSha,
 requiredRunIds:[181,182]};
function fixtures(){
 const pr={number:150,state:'open',draft:true,merged:false,
  html_url:'https://github.com/'+repo+'/pull/150',
  head:{sha,ref:branch,repo:{full_name:repo}},
  base:{sha:baseSha,ref:'experiment/reality-live-durable-adversarial-20261025',
   repo:{full_name:repo}},
  created_at:'2026-10-27T22:00:00Z'};
 const run=id=>({id,name:names[id-181],workflow_id:500+id,
  status:'completed',conclusion:'success',event:'pull_request',
  repository:{full_name:repo},head_repository:{full_name:repo},
  head_sha:sha,head_branch:branch,
  html_url:'https://github.com/'+repo+'/actions/runs/'+id,
  created_at:'2026-10-27T22:01:00Z'});
 const data=new Map([
  [root+'/pulls/150',pr],
  [root+'/actions/runs/181',run(181)],
  [root+'/actions/runs/182',run(182)]
 ]);
 const calls=[];
 const fetchImpl=async(url,options={})=>{
  calls.push({url,method:options.method});
  return {ok:data.has(url),json:async()=>data.get(url)||{}};
 };
 return {data,calls,fetchImpl,pr,run};
}
test('exact verified draft PR plus two independent green workflows stays non-authorizing',async()=>{
 const f=fixtures();
 const result=await verifyIndependentUpgradeDraftCI({...opts,fetchImpl:f.fetchImpl});
 assert.equal(result.state,'EXACT_DRAFT_PR_CI_VERIFIED_PROMOTION_STILL_BLOCKED');
 assert.equal(result.independent_github_readback,true);
 assert.equal(result.promotion_authorized,false);
 assert.equal(result.capability_installed,false);
 assert.equal(result.original_job_resumed,false);
 assert.equal(result.original_job_completed,false);
 assert.equal(result.github_write_performed,false);
 assert.deepEqual(f.calls.map(c=>c.method),['GET','GET','GET']);
 assert.equal(result.required_workflows.length,2);
 assert.ok(result.required_workflows.every(x=>x.head_sha===sha));
});
test('only immutable, exact PR and two distinct run IDs are admissible',async()=>{
 const f=fixtures();
 for(const bad of [
  {...opts,requiredRunIds:[]}, {...opts,requiredRunIds:[181,181]},
  {...opts,requiredRunIds:[181]}, {...opts,prNumber:0},
  {...opts,expectedHeadSha:'other'}, {...opts,expectedBranch:'main'},
  {...opts,originalWorkId:'work:forged'},
 ])await assert.rejects(
  verifyIndependentUpgradeDraftCI({...bad,fetchImpl:f.fetchImpl}),
  /UPGRADE_CI_TRUSTED_EXACT_PR_AND_RUN_SCOPE_REQUIRED/
 );
 assert.equal(f.calls.length,0);
});
test('reject an altered or already merged PR before checking any CI run',async()=>{
 for(const mutation of [
  p=>p.draft=false,p=>p.merged=true,p=>p.state='closed',
  p=>p.head.sha='f'.repeat(40),p=>p.head.ref='main',
  p=>p.base.sha='e'.repeat(40),
  p=>p.base.repo.full_name='attacker/repo',
  p=>p.head.repo.full_name='attacker/repo',
 ]){const f=fixtures();mutation(f.pr);
  await assert.rejects(verifyIndependentUpgradeDraftCI({...opts,fetchImpl:f.fetchImpl}),
   /UPGRADE_CI_DRAFT_PR_CHANGED_OR_UNVERIFIED/);
  assert.equal(f.calls.length,1);
 }
});
test('reject failed, stale, misidentified, or different-commit workflow runs',async()=>{
 for(const mutate of [
  r=>r.conclusion='failure',r=>r.status='in_progress',
  r=>r.head_sha='f'.repeat(40),r=>r.head_branch='main',
  r=>r.name='Unknown Workflow',r=>r.event='workflow_dispatch',
  r=>r.repository.full_name='attacker/repo',
  r=>r.head_repository.full_name='attacker/repo',
  r=>r.created_at='2026-10-27T21:59:59Z',
 ]){const f=fixtures();mutate(f.data.get(root+'/actions/runs/182'));
  await assert.rejects(
   verifyIndependentUpgradeDraftCI({...opts,fetchImpl:f.fetchImpl}),
   /UPGRADE_CI_RUN_NOT_EXACT_GREEN_PR_COMMIT/);
  assert.ok(f.calls.every(c=>c.method==='GET'));
 }
});
test('reject copied single workflow identity and provider read failures',async()=>{
 const f=fixtures();
 f.data.get(root+'/actions/runs/182').name=names[0];
 await assert.rejects(verifyIndependentUpgradeDraftCI({...opts,fetchImpl:f.fetchImpl}),
  /UPGRADE_CI_RUN_NOT_EXACT_GREEN_PR_COMMIT/);
 f.data.delete(root+'/actions/runs/182');
 await assert.rejects(verifyIndependentUpgradeDraftCI({...opts,fetchImpl:f.fetchImpl}),
  /UPGRADE_CI_PROVIDER_READBACK_UNAVAILABLE/);
});
