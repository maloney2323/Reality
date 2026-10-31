import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createIndependentInstalledWorkVerifier}
 from '../src/reality-general-installed-work-verifier-v1.0.js';
const SHA='a'.repeat(40),BASE='b'.repeat(40),BRANCH='feature/reality-install-to-settlement-20261031';
const WORK='work:'+'c'.repeat(32), FROZEN='test/reality-frozen-regressions/reality-general-execution-receipt-v1.test.js';
const FROZEN_BYTES='import test from "node:test"; test("frozen",()=>{});';
const frozenHash=createHash('sha256').update(FROZEN_BYTES).digest('hex');
const FILES=[{path:'src/reality-extensions/fix.mjs',content:'export const fix=true;'},
 {path:'test/reality-extensions/fix.test.mjs',content:'export {fix} from "../../src/reality-extensions/fix.mjs";'}];
const stable=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(stable):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]));
const hash=x=>createHash('sha256').update(JSON.stringify(stable(x))).digest('hex');
const installed={kind:'ISOLATED_GITHUB_SOURCE_INSTALLED',original_work_id:WORK,
 installed_commit_sha:SHA,installed_branch:BRANCH,
 artifact_hash:hash(FILES),provider_bytes_readback_verified:true,production_changed:false};
const run={id:567,status:'completed',conclusion:'success',event:'push',
 head_sha:SHA,head_repository:{full_name:'maloney2323/Reality'},
 path:'.github/workflows/reality-real-gap-acceptance-before-model-v1.yml'};
const jobs={jobs:[{id:89,run_id:567,head_sha:SHA,status:'completed',
 conclusion:'success',name:'independent-original-customer-acceptance',
 steps:[
  {name:'Frozen same-work missing capability acceptance',conclusion:'success'},
  {name:'Regression: governance and exact-owner installation gates',conclusion:'success'},
 ]}]};
function fake({runOverride={},jobOverride={},branchHead=SHA,sourceChanged=false,
 frozenChanged=false,missingRun=false}={}){
 const calls=[];
 const fetchImpl=async(url,{method}={})=>{
  assert.equal(method,'GET');
  const path=new URL(url).pathname+new URL(url).search;
  calls.push(path);
  let value;
  if(path==='/git/commits/'+SHA)value={parents:[{sha:BASE}]};
  else if(path==='/git/ref/heads/'+BRANCH)value={object:{sha:branchHead}};
  else if(path.startsWith('/contents/')){
   const filename=path.slice('/contents/'.length).split('?')[0];
   const file=FILES.find(x=>x.path===filename);
   const content=filename===FROZEN?(frozenChanged?'changed':FROZEN_BYTES):
    sourceChanged?'modified':file?.content;
   value={encoding:'base64',content:Buffer.from(content||'').toString('base64')};
  }else if(path.startsWith('/actions/workflows/'))value={workflow_runs:missingRun?[]:[{...run,...runOverride}]};
  else if(path==='/actions/runs/567/jobs?per_page=100')value=
   {jobs:[{...jobs.jobs[0],...jobOverride}]};
  else throw Error('MOCK_UNEXPECTED '+path);
  return {ok:true,json:async()=>value};
 };
 return {fetchImpl,calls};
}
test('source exact installed bytes and original independently passed GitHub steps establish same work',async()=>{
 const f=fake(),v=createIndependentInstalledWorkVerifier({fetchImpl:f.fetchImpl});
 const observed=await v.inspectInstalled({installed,candidate:{files:FILES},
  expectedBaseSha:BASE,originalWorkId:WORK});
 assert.equal(observed.verified,true);
 const outcome=await v.observeOriginalRun({installedCommitSha:SHA,
  installedBranch:BRANCH,originalWorkId:WORK,
  expectedFrozenTestPath:FROZEN,expectedFrozenSha:frozenHash});
 assert.equal(outcome.status,'VERIFIED_ORIGINAL_INSTALLED_WORK');
 assert.equal(outcome.original_frozen_tests_passed,true);
 assert.equal(outcome.governance_tests_passed,true);
 assert.equal(outcome.provider_run_id,567);
 assert.match(outcome.evidence_hash,/^[a-f0-9]{64}$/);
 assert.equal(outcome.production_changed,false);
});
test('missing or still-running run is pending, never settled',async()=>{
 for(const opts of [{missingRun:true},{runOverride:{status:'in_progress',conclusion:null}}]){
  const f=fake(opts),v=createIndependentInstalledWorkVerifier({fetchImpl:f.fetchImpl});
  const out=await v.observeOriginalRun({installedCommitSha:SHA,installedBranch:BRANCH,
   originalWorkId:WORK,expectedFrozenTestPath:FROZEN,expectedFrozenSha:frozenHash});
  assert.equal(out.complete,false);assert.equal(out.production_changed,false);
 }
});
test('branch advance, source drift, frozen change, failed job and missing governance step block',async()=>{
 for(const opts of [{branchHead:'e'.repeat(40)},{sourceChanged:true}]){
  const f=fake(opts),v=createIndependentInstalledWorkVerifier({fetchImpl:f.fetchImpl});
  await assert.rejects(v.inspectInstalled({installed,candidate:{files:FILES},
   expectedBaseSha:BASE,originalWorkId:WORK}),/REAL_INSTALLED_WORK_/);
 }
 for(const opts of [{frozenChanged:true},{runOverride:{conclusion:'failure'}},
  {jobOverride:{steps:[jobs.jobs[0].steps[0]]}},
  {jobOverride:{head_sha:'f'.repeat(40)}}]){
  const f=fake(opts),v=createIndependentInstalledWorkVerifier({fetchImpl:f.fetchImpl});
  await assert.rejects(v.observeOriginalRun({installedCommitSha:SHA,installedBranch:BRANCH,
   originalWorkId:WORK,expectedFrozenTestPath:FROZEN,expectedFrozenSha:frozenHash}),/REAL_INSTALLED_WORK_/);
 }
});
