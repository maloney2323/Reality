import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {continueRileyCorrectiveModelIntoIndependentCI}
 from '../src/reality-riley-auto-corrective-ci-bridge-v1.js';

const db={url:'https://preview.supabase.co',secretKey:'isolated-service-key-never-exported-to-browser',
 strictSecrets:true,project:'preview'};
const env={VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'preview',
 VERCEL_GIT_COMMIT_REF:'reality/reviewed-isolated-preview',
 VERCEL_GIT_COMMIT_SHA:'a'.repeat(40)};
test('existing isolated Reality worker automatically calls protected CI broker, never a browser or GitHub token',async()=>{
 let count=0;
 const result=await continueRileyCorrectiveModelIntoIndependentCI({db,env,
  fetchImpl:async(url,request)=>{
   count++;
   assert.equal(url,db.url+'/functions/v1/reality-riley-auto-corrective-ci-v1');
   assert.equal(request.method,'POST');
   assert.equal(request.headers.apikey,db.secretKey);
   assert.equal(request.headers.authorization,'Bearer '+db.secretKey);
   assert.equal(JSON.parse(request.body).base_sha,env.VERCEL_GIT_COMMIT_SHA);
   assert.deepEqual(Object.keys(JSON.parse(request.body)).sort(),[
    'action','base_branch','base_sha','version']);
   return {ok:true,json:async()=>({
    status:'CORRECTIVE_CANDIDATE_STAGED_AWAITING_INDEPENDENT_CI',
    original_job_completed:false,installation_authorized:false,
    production_changed:false,independent_ci_verified:false
   })};
  }});
 assert.equal(count,1);
 assert.equal(result.status,'CORRECTIVE_CANDIDATE_STAGED_AWAITING_INDEPENDENT_CI');
 assert.equal(result.installation_authorized,false);
 assert.equal(result.original_job_completed,false);
 assert.equal(result.new_shift_started,false);
});
test('nonpreview or invalid branch performs no broker call',async()=>{
 let count=0;
 for(const overrides of [
  {VERCEL_ENV:'production'},
  {VERCEL_GIT_COMMIT_REF:'main'},
  {VERCEL_GIT_COMMIT_SHA:'invalid'},
  {VERCEL_GIT_COMMIT_REF:'reality/riley/fake-branch'}
 ]){
  const result=await continueRileyCorrectiveModelIntoIndependentCI({
   db,env:{...env,...overrides},
   fetchImpl:async()=>{count++;throw Error('FORBIDDEN')}});
  assert.equal(result.installation_authorized,false);
  assert.equal(result.original_job_completed,false);
 }
 assert.equal(count,0);
});
test('unverified provider CI cannot masquerade as a success receipt',async()=>{
 const result=await continueRileyCorrectiveModelIntoIndependentCI({
  db,env,fetchImpl:async()=>({ok:true,json:async()=>({
   status:'CORRECTIVE_CI_PASSED_EXACT_INSTALL_REVIEW_REQUIRED',
   independent_ci_verified:true,original_job_completed:false,
   installation_authorized:false,production_changed:false})})
 });
 assert.equal(result.status,'ISOLATED_CORRECTIVE_CI_INDEPENDENT_PROOF_INVALID');
});
test('exact source-bound Edge function has service-only access, frozen CI and separate approval',()=>{
 const source=readFileSync(new URL(
  '../supabase/functions/reality-riley-auto-corrective-ci-v1/index.ts',
  import.meta.url),'utf8');
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261114_riley_auto_corrective_candidate_ci_v1.sql',
  import.meta.url),'utf8');
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(source,/SUPABASE_SERVICE_ROLE_KEY/);
 assert.match(source,/REALITY_GITHUB_BROKER_TOKEN/);
 assert.match(source,/source\.sha!==c\.source_blob_sha/);
 assert.match(source,/await digest\(patched\)!==c\.proposed_sha256/);
 assert.match(source,/independent-corrective-frozen/);
 assert.match(source,/reality\/riley\/auto-corrective-/);
 assert.match(sql,/j\.phase='SOURCE_ADMITTED'/);
 assert.match(sql,/w\.state='ACTIVE'/);
 assert.match(sql,/riley_auto_corrective_ci_proofs_v1 enable row level security/);
 assert.match(sql,/original_job_completed boolean not null default false check\(not original_job_completed\)/);
 assert.match(worker,/const correctiveCiPromise=continueRileyCorrectiveModelIntoIndependentCI/);
 assert.match(worker,/riley_auto_corrective_independent_ci:correctiveCiResult/);
 assert.doesNotMatch(source,/process\.env\.REALITY_GITHUB_TOKEN/);
});
