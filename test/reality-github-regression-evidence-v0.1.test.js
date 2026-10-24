import test from 'node:test';
import assert from 'node:assert/strict';
import {
 FROZEN_GITHUB_CASE,evaluateGithubRegressionEvidence,readGithubRegressionEvidence,
} from '../src/reality-github-regression-evidence-v0.1.js';
const workflow=395257693,repo='maloney2323/Reality';
const name=FROZEN_GITHUB_CASE.testName;
const before={
 id:40120398452,status:'completed',conclusion:'failure',
 head_sha:'18a74fe51bab49131e257c4c7871a672345d7b7e',
 workflow_id:workflow,event:'pull_request',repository:{full_name:repo},
};
const after={
 id:40140138344,status:'completed',conclusion:'success',
 head_sha:'731c40581afa70b6b2a3eae38f2c9e6ca9ac10b3',
 workflow_id:workflow,event:'pull_request',repository:{full_name:repo},
};
const beforeLog='2026-10-24T18:22:36.1159978Z not ok 14 - '+name+'\n# fail 1';
const afterLog='2026-10-24T22:48:59.5136539Z ok 21 - '+name+'\n# fail 0';
const snapshot=()=>evaluateGithubRegressionEvidence({
 before,after,beforeLog,afterLog,observedAt:'2026-10-24T22:49:00.000Z',
});
test('identical historic test fails then passes in real GitHub run metadata',()=>{
 const r=snapshot();
 assert.equal(r.verified_historical_regression,true);
 assert.equal(r.before.workflow_conclusion,'failure');
 assert.equal(r.before.target_test_result,'FAILED');
 assert.equal(r.after.workflow_conclusion,'success');
 assert.equal(r.after.target_test_result,'PASSED');
 assert.equal(r.same_test_verification,true);
 assert.equal(r.independently_observed_external_workflow_results,true);
 assert.match(r.receipt_hash,/^[a-f0-9]{64}$/);
});
test('avoid promotion of CI regression to fake autonomous proof',()=>{
 const r=snapshot();
 assert.equal(r.autonomously_discovered_or_repaired_by_reality,false);
 assert.equal(r.model_vs_reality_comparison_complete,false);
 assert.equal(r.independent_proof_of_causal_fix,false);
 assert.equal(r.number_of_measured_human_interventions,null);
 assert.equal(r.supervision_minutes_saved,null);
 assert.equal(r.model_self_report_claims_evaluated,0);
 assert.equal(r.actual_model_tokens,null);
 assert.equal(r.production_deployment_changed,false);
});
test('wrong test or wrong source cannot be counted',()=>{
 assert.throws(()=>evaluateGithubRegressionEvidence({before,after,beforeLog:'not ok 14 - unrelated test',afterLog}),/GITHUB_IDENTICAL_TEST_BEFORE_AFTER_NOT_ATTESTED/);
 assert.throws(()=>evaluateGithubRegressionEvidence({before,after,beforeLog,afterLog:'ok 21 - unrelated test'}),/GITHUB_IDENTICAL_TEST_BEFORE_AFTER_NOT_ATTESTED/);
 assert.throws(()=>evaluateGithubRegressionEvidence({before:{...before,repository:{full_name:'some-other-org/Reality'}},after,beforeLog,afterLog}),/GITHUB_REPOSITORY_MISMATCH/);
 assert.throws(()=>evaluateGithubRegressionEvidence({before,after:{...after,workflow_id:111},beforeLog,afterLog}),/GITHUB_WORKFLOW_ID_CHANGED/);
});
test('missing completion or same sha cannot be called regression proof',()=>{
 assert.throws(()=>evaluateGithubRegressionEvidence({before,after:{...after,status:'in_progress'},beforeLog,afterLog}),/GITHUB_RUN_UNRESOLVED/);
 assert.throws(()=>evaluateGithubRegressionEvidence({before,after:{...after,head_sha:before.head_sha},beforeLog,afterLog}),/GITHUB_NO_NEW_REVISION/);
});
test('live bridge only performs fixed read-only GitHub REST calls',async()=>{
 const urls=[];
 const expected={
  '/actions/runs/40120398452':before,
  '/actions/runs/40140138344':after,
  '/actions/runs/40120398452/jobs?per_page=50':{jobs:[{id:1001,name:'contract-tests',status:'completed',conclusion:'failure'}]},
  '/actions/runs/40140138344/jobs?per_page=50':{jobs:[{id:1002,name:'contract-tests',status:'completed',conclusion:'success'}]},
  '/actions/jobs/1001/logs':beforeLog,
  '/actions/jobs/1002/logs':afterLog,
 };
 const result=await readGithubRegressionEvidence({
  token:'unit-fixture-token',
  fetchImpl:async (url,opts)=>{
   assert.equal(opts.method,'GET');
   assert.ok(!opts.body);
   assert.match(url,/^https:\/\/api\.github\.com\/repos\/maloney2323\/Reality\//);
   urls.push(url);
   const suffix=url.split(repo)[1];
   const payload=expected[suffix];
   assert.notEqual(payload,undefined,'unexpected '+suffix);
   return {ok:true,status:200,json:async()=>payload,text:async()=>payload};
  },
 });
 assert.equal(result.verified_historical_regression,true);
 assert.equal(urls.length,6);
});
test('GitHub request errors fail closed, not converted to clean or zero-error reports',async()=>{
 await assert.rejects(()=>readGithubRegressionEvidence({
  token:'unit-fixture-token',
  fetchImpl:async()=>({ok:false,status:403}),
 }),/GITHUB_EXTERNAL_READBACK_FAILED_403/);
 await assert.rejects(()=>readGithubRegressionEvidence({token:''}),/GITHUB_READ_ONLY_TOKEN_REQUIRED/);
});
