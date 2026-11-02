import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifyReconciliationProviderEvidence as verify} from '../src/reality-original-provider-relationship-v1.js';

const run={id:41390537103,status:'completed',conclusion:'failure',
 head_branch:'feature/reality-general-capability-engine-20261101',
 head_repository:{full_name:'maloney2323/Reality'}};
const source={run_id:run.id,run_status:run.status,run_conclusion:run.conclusion,
 repository:'maloney2323/Reality',independent_provider_readback:true};
const jobs={jobs:[
 {name:'resume_original_job',status:'completed',conclusion:'success',run_id:run.id},
 {name:'record_independent_original_settlement',status:'completed',conclusion:'success',run_id:run.id},
 {name:'detect-real-frozen-capability-deficits',status:'completed',conclusion:'failure',run_id:run.id}
]};
const artifacts={artifacts:[{name:'reality-original-final-settlement-'+run.id,
 expired:false,digest:'sha256:'+'a'.repeat(64)}]};
test('a failing overall run is accepted only when both original jobs are successful, another job failed, and artifact is independent',()=>{
 const out=verify(source,run,jobs,artifacts);
 assert.equal(out.resume_job_success,true);
 assert.equal(out.settlement_job_success,true);
 assert.equal(out.unrelated_job_failure_verified,true);
 assert.equal(out.settlement_artifact_digest,'a'.repeat(64));
 assert.equal(out.run_conclusion,'failure');
 assert.equal(Object.isFrozen(out),true);
});
test('missing or failed original settlement jobs are refused even when overall run is completed',()=>{
 for(const bad of [
  {jobs:jobs.jobs.filter(j=>j.name!=='record_independent_original_settlement')},
  {jobs:jobs.jobs.map(j=>j.name==='resume_original_job'?{...j,conclusion:'failure'}:j)},
  {jobs:jobs.jobs.map(j=>j.name==='record_independent_original_settlement'?{...j,run_id:12}:j)},
  {jobs:jobs.jobs.filter(j=>j.name!=='detect-real-frozen-capability-deficits')}
 ])assert.throws(()=>verify(source,run,bad,artifacts),/UNVERIFIED/);
});
test('wrong or expired artifact, wrong branch, repo and provider identifiers are rejected',()=>{
 for(const bad of [
  {artifacts:[{...artifacts.artifacts[0],expired:true}]},
  {artifacts:[{...artifacts.artifacts[0],digest:'sha256:'+'x'.repeat(64)}]},
  {artifacts:[]}
 ])assert.throws(()=>verify(source,run,jobs,bad),/UNVERIFIED/);
 assert.throws(()=>verify(source,{...run,head_branch:'main'},jobs,artifacts));
 assert.throws(()=>verify(source,{...run,id:123},jobs,artifacts));
 assert.throws(()=>verify(source,{...run,head_repository:{full_name:'other/repo'}},jobs,artifacts));
});
test('original worker passes provider-certified relationship to the sandbox without changing execution permissions',()=>{
 const code=readFileSync(new URL('../scripts/reality-genuine-original-resume-v1.mjs',import.meta.url),'utf8');
 assert.match(code,/verifyReconciliationProviderEvidence\(/);
 assert.match(code,/evaluationInput\.provider=verifyReconciliationProviderEvidence/);
 assert.match(code,/github\('\/actions\/runs\/'\+runId\+'\/jobs\?per_page=100'\)/);
 assert.match(code,/github\('\/actions\/runs\/'\+runId\+'\/artifacts\?per_page=100'\)/);
 assert.match(code,/--network','none'/);
 assert.match(code,/--read-only/);
 assert.match(code,/original_claim/);
});
