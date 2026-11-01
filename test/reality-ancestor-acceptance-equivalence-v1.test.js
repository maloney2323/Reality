import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createIndependentInstalledWorkVerifier}
 from '../src/reality-general-installed-work-verifier-v1.0.js';

const installed='a'.repeat(40),ancestor='b'.repeat(40);
const root='https://api.github.com/repos/maloney2323/Reality';
const branch='feature/reality-home-repair-chat-20261031';
const original='work:'+'c'.repeat(32);
const frozen='test/reality-frozen-regressions/reality-general-execution-receipt-v1.test.js';
const frozenText='// independently frozen customer acceptance\n';
const frozenSha=createHash('sha256').update(frozenText).digest('hex');
const path='.github/workflows/reality-real-gap-acceptance-before-model-v1.yml';
const required=[
 '.github/workflows/reality-continuity-spine-v2.yml',
 '.github/workflows/reality-continuous-reliability-v0.1.yml',
 '.github/workflows/reality-install-to-settlement-v1.yml',
];
const run={id:12345,path,head_sha:ancestor,
 event:'push',head_repository:{full_name:'maloney2323/Reality'},
 conclusion:'success',status:'completed'};
const job={id:345,run_id:12345,head_sha:ancestor,
 name:'independent-original-customer-acceptance',
 status:'completed',conclusion:'success',steps:[
  {name:'Frozen same-work missing capability acceptance',conclusion:'success'},
  {name:'Regression: governance and exact-owner installation gates',conclusion:'success'},
 ]};
const fixtureNames=[
 'test/reality-continuity-runtime-v0.1.test.js',
 'test/reality-market-100-turn-endurance-v0.1.test.js',
 'test/reality-universe-postgres-continuity-v0.2.test.js',
];
function fake({badFile=false,missingGreen=false,notAncestor=false}={}){
 const calls=[];
 const fetchImpl=async(uri,{method}={})=>{
  assert.equal(method,'GET');
  const u=new URL(uri);
  assert.equal(u.origin,new URL(root).origin);
  const p=u.pathname.replace('/repos/maloney2323/Reality','');
  calls.push(p);
  let result;
  if(p.includes('/contents/')){
   result={encoding:'base64',content:Buffer.from(frozenText).toString('base64')};
  }else if(p.startsWith('/actions/workflows/')){
   result={workflow_runs:[run]};
  }else if(p.startsWith('/compare/')){
   result={status:notAncestor?'diverged':'ahead',ahead_by:3,behind_by:0,
    files:fixtureNames.map((filename,i)=>({filename:i===0&&badFile?
     'src/reality-extensions/unsafe.mjs':filename,status:'modified'}))};
  }else if(p==='/actions/runs'){
   result={workflow_runs:required.filter((_,i)=>!missingGreen||i!==0).map(
    (path,i)=>({id:900+i,path,head_sha:installed,
     head_repository:{full_name:'maloney2323/Reality'},
     status:'completed',conclusion:'success'}))};
  }else if(p==='/actions/runs/12345/jobs'){
   result={jobs:[job]};
  }else throw Error('Unexpected GitHub endpoint: '+p);
  return {ok:true,status:200,json:async()=>result};
 };
 return {verifier:createIndependentInstalledWorkVerifier({fetchImpl}),calls};
}
async function run(f){return f.verifier.observeOriginalRun({
 installedCommitSha:installed,installedBranch:branch,originalWorkId:original,
 expectedFrozenTestPath:frozen,expectedFrozenSha:frozenSha,
});}
test('only unchanged runtime source plus independently green installed CI can reconcile earlier frozen run',async()=>{
 const f=fake(),value=await run(f);
 assert.equal(value.complete,true);
 assert.equal(value.installed_commit_sha,installed);
 assert.equal(value.verified_acceptance_commit_sha,ancestor);
 assert.equal(value.frozen_test_provenance,'ANCESTOR_SOURCE_EQUIVALENCE_WITH_CURRENT_CI');
 assert.equal(value.source_equivalence_verified,true);
 assert.ok(f.calls.some(p=>p.includes('/compare/')));
 assert.ok(f.calls.includes('/actions/runs'));
});
test('any changed installed extension, missing current CI, or nonancestor forbids equivalence',async()=>{
 for(const scenario of [{badFile:true},{missingGreen:true},{notAncestor:true}]){
  const f=fake(scenario),value=await run(f);
  assert.equal(value.complete,false);
  assert.equal(value.status,'AWAITING_INDEPENDENT_INSTALLED_ACCEPTANCE');
 }
});
