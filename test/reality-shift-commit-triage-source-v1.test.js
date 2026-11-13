import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyCurrentShiftCommitTriageSource}
 from '../src/reality-shift-commit-triage-source-v1.js';
const shift='9460cfff-937a-4105-9093-2e41ab39a950';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const sha='939914571be04ba519e2d644fe5e7c37e57c734d';
const src=n=>'https://github.com/maloney2323/Reality/issues/'+n;
const commitUrl='https://github.com/maloney2323/Reality/commit/'+sha;
const issue62={
 number:62,state:'open',html_url:src(62),
 repository_url:'https://api.github.com/repos/maloney2323/Reality',
 title:'Review needed: commit 9399145 lacks issue reference',
 body:'Commit [9399145]('+commitUrl+') does not reference a tracked issue.\n'+
  'Please associate this commit with an appropriate issue, or confirm no issue is needed.'
};
const issue185={...issue62,number:185,html_url:src(185),
 title:'Reality full self-repair loop — real work, owner approval in UI, independently verified receipts',
 body:'Connect the governed full self-repair workflow. No frozen defect supplied.'};
const commit={sha,html_url:commitUrl,commit:{
 message:'Upgrade Reality work discovery and autonomous capability foundation v1'
},files:[{filename:'src/reality-work-discovery-foundation-v1.0.js',status:'added'}]};
const job=(n,index)=>({
 source_step_index:index,source_ref:src(n),
 source_proof_sha256:'sha256:'+(n===62?'a':'b').repeat(64),
 original_kind:'SOURCE_REVIEW_NOT_YET_AN_EXECUTABLE_ORIGINAL',
 phase:'NOT_ADMITTED',original_work_id:null,
 independent_source_proof_verified:true
});
const graph=()=>({status:'UNIFIED_OWNER_JOB_CONTROL_READY',
 shift_id:shift,owner_id:owner,plan_fingerprint:'sha256:'+'f'.repeat(64),
 jobs:[job(185,3),job(62,5)]});
const mock=({badIssue=null,badCommit=null}={})=>{
 const urls=[];
 const fetchImpl=async url=>{
  urls.push(url);
  const item=url.endsWith('/issues/185')?issue185:
   url.endsWith('/issues/62')?(badIssue||issue62):
   url.endsWith('/commits/'+sha)?(badCommit||commit):null;
  return {ok:!!item,json:async()=>item};
 };
 return {fetchImpl,urls};
};
test('real pinned shift #62 independently verifies the issue plus commit, not the broad #185 objective',async()=>{
 const m=mock();
 const x=await verifyCurrentShiftCommitTriageSource({graph:graph(),fetchImpl:m.fetchImpl});
 assert.equal(x.status,'INDEPENDENT_COMMIT_REFERENCE_TRIAGE_SOURCE_VERIFIED');
 assert.equal(x.shift_id,shift);
 assert.equal(x.source_ref,src(62));
 assert.equal(x.source_step_index,5);
 assert.equal(x.commit_sha,sha);
 assert.equal(x.independent_provider_readback_verified,true);
 assert.equal(x.original_job_admitted,false);
 assert.equal(x.original_job_completed,false);
 assert.equal(x.installation_authorized,false);
 assert.equal(x.production_changed,false);
 assert.deepEqual(m.urls.map(x=>new URL(x).pathname),[
  '/repos/maloney2323/Reality/issues/185',
  '/repos/maloney2323/Reality/issues/62',
  '/repos/maloney2323/Reality/commits/'+sha
 ]);
});
test('source missing, unsettled identity absent and unverified observations create no authority',async()=>{
 for(const change of [
  {jobs:[]},
  {jobs:[{...job(62,5),phase:'SETTLED'}]},
  {jobs:[{...job(62,5),independent_source_proof_verified:false}]},
  {jobs:[{...job(62,5),original_work_id:'work:'+'e'.repeat(32)}]}
 ]){
  const m=mock();
  const x=await verifyCurrentShiftCommitTriageSource({
   graph:{...graph(),...change},fetchImpl:m.fetchImpl});
  assert.equal(x.status,'NO_INDEPENDENTLY_VERIFIED_COMMIT_TRIAGE_SOURCE');
  assert.equal(x.original_job_admitted,false);
  assert.equal(m.urls.length,0);
 }
});
test('tampered owner or provider issue/commit identity fails closed before any admission',async()=>{
 for(const change of [
  {graph:{...graph(),owner_id:'bad'}},
  {badIssue:{...issue62,repository_url:'https://api.github.com/repos/another/repo'}},
  {badIssue:{...issue62,html_url:src(999)}},
  {badIssue:{...issue62,body:issue62.body+'\n'+commitUrl.replace(sha,'c'.repeat(40))}},
  {badCommit:{...commit,sha:'b'.repeat(40)}},
  {badCommit:{...commit,files:[{filename:'../secret',status:'modified'}]}}
 ]){
  const m=mock(change);
  await assert.rejects(()=>verifyCurrentShiftCommitTriageSource({
   graph:change.graph||graph(),fetchImpl:m.fetchImpl
  }),/SHIFT_COMMIT_TRIAGE_/);
 }
});
test('general improvement objectives are not misclassified as commit triage',async()=>{
 const m=mock();
 const x=await verifyCurrentShiftCommitTriageSource({
  graph:{...graph(),jobs:[job(185,3)]},fetchImpl:m.fetchImpl});
 assert.equal(x.status,'NO_INDEPENDENTLY_VERIFIED_COMMIT_TRIAGE_SOURCE');
 assert.equal(x.original_job_admitted,false);
 assert.equal(x.installation_authorized,false);
 assert.equal(m.urls.length,1);
});
