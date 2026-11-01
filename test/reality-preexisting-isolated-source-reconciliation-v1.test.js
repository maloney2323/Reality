import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createIndependentInstalledWorkVerifier}
 from '../src/reality-general-installed-work-verifier-v1.0.js';

const sha=x=>createHash('sha256').update(x).digest('hex');
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
const branch='feature/reality-home-repair-chat-20261031';
const commit='a'.repeat(40),work='work:'+'b'.repeat(32);
const source=[{path:'src/reality-extensions/exact.mjs',content:'export const correct = true;'},
 {path:'test/reality-extensions/exact.test.mjs',content:'import test from "node:test"; test("ok",()=>{});'}];
const artifact=sha(JSON.stringify(stable(source)));
const frozen='test/reality-frozen-regressions/exact.test.js';
const frozenBytes='import test from "node:test"; test("original",()=>{});';
const acceptedWorkflow='.github/workflows/reality-real-gap-acceptance-before-model-v1.yml';
function fixture({tamper=false,missingRun=false,moveHead=false}={}){
 const requests=[];
 const fetchImpl=async address=>{
  const url=new URL(address);const path=url.pathname;
  requests.push(path);
  const run={id:911,head_sha:commit,event:'push',path:acceptedWorkflow,
   head_repository:{full_name:'maloney2323/Reality'},status:'completed',conclusion:'success'};
  const job={id:922,run_id:911,head_sha:commit,
   status:'completed',conclusion:'success',name:'independent-original-customer-acceptance',
   steps:['Frozen same-work missing capability acceptance',
    'Regression: governance and exact-owner installation gates'].map(name=>({name,conclusion:'success'}))};
  let response;
  if(path.endsWith('/git/commits/'+commit))response={parents:[]};
  else if(path.endsWith('/git/ref/heads/'+branch))
   response={object:{sha:moveHead?'c'.repeat(40):commit}};
  else if(path.endsWith('/contents/'+frozen))
   response={encoding:'base64',content:Buffer.from(frozenBytes).toString('base64')};
  else if(path.includes('/contents/')){
   const found=source.find(x=>path.endsWith('/contents/'+x.path));
   response={encoding:'base64',content:Buffer.from(tamper?'wrong':found?.content||'').toString('base64')};
  }else if(path.endsWith('/actions/workflows/reality-real-gap-acceptance-before-model-v1.yml/runs'))
   response={workflow_runs:missingRun?[]:[run]};
  else if(path.endsWith('/actions/runs/911/jobs'))response={jobs:[job]};
  else throw Error('Unexpected provider request '+path);
  return {ok:true,status:200,json:async()=>response};
 };
 const verifier=createIndependentInstalledWorkVerifier({
  env:{REALITY_BUILDER_DISPATCH_GITHUB_TOKEN:'read-only-test-token-1234567890'},fetchImpl});
 const installed={kind:'ISOLATED_GITHUB_SOURCE_INSTALLED',original_work_id:work,
  artifact_hash:artifact,installed_commit_sha:commit,installed_branch:branch,
  provider_bytes_readback_verified:true,production_changed:false};
 return {verifier,installed,requests};
}
function args(f){return {installed:f.installed,
 candidate:{files:source},originalWorkId:work,expectedReviewSha:commit,
 expectedFrozenTestPath:frozen,expectedFrozenSha:sha(frozenBytes)};}
test('post-approval reconciliation verifies pre-existing exact bytes AND original run',async()=>{
 const f=fixture();
 const result=await f.verifier.inspectPreexistingAtReviewCommit(args(f));
 assert.equal(result.verified,true);
 assert.equal(result.source_preexisted_owner_installation_approval,true);
 assert.equal(result.original_acceptance_run_id,911);
 assert.ok(f.requests.some(x=>x.endsWith('/actions/runs/911/jobs')));
});
test('tampered files, changed branch head, missing acceptance fail closed',async()=>{
 for(const change of [{tamper:true},{moveHead:true},{missingRun:true}]){
  const f=fixture(change);
  await assert.rejects(f.verifier.inspectPreexistingAtReviewCommit(args(f)),
   /REAL_INSTALLED_WORK_/);
 }
});
test('pre-existing reconciliation is not ordinary post-approval installation lineage',async()=>{
 const f=fixture();
 await assert.rejects(f.verifier.inspectInstalled({
  installed:f.installed,candidate:{files:source},
  expectedBaseSha:commit,originalWorkId:work,
 }),/REAL_INSTALLED_WORK_INDEPENDENT_INSTALL_PARENT_MISMATCH/);
});
