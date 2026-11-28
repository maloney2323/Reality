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
 assert.match(source,/original\.sha!==c\.source_blob_sha/);
 assert.match(source,/await digest\(patched\)!==c\.proposed_sha256/);
 assert.match(source,/independent-corrective-frozen/);
 assert.match(source,/reality\/riley\/auto-corrective-/);
 assert.match(sql,/j\.phase='SOURCE_ADMITTED'/);
 assert.match(sql,/w\.state='ACTIVE'/);
 assert.match(sql,/riley_auto_corrective_ci_proofs_v1 enable row level security/);
 assert.match(sql,/original_job_completed boolean not null default false check\(not original_job_completed\)/);
 assert.match(worker,/const correctiveCiPromise=[\s\S]*?selectCorrectiveCiCapability\(\{[\s\S]*?expectedScope:selected.expectedScope/);
 assert.match(worker,/riley_auto_corrective_independent_ci:correctiveCiResult/);
 assert.doesNotMatch(source,/process\.env\.REALITY_GITHUB_TOKEN/);
});


test('isolated worker tolerates unrelated preview commits but must recheck exact source bytes',()=>{
 const source=readFileSync(new URL(
  '../supabase/functions/reality-riley-auto-corrective-ci-v1/index.ts',
  import.meta.url),'utf8');
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261114_riley_auto_corrective_staged_provider_receipt_v1.sql',
  import.meta.url),'utf8');
 assert.match(source,/const liveSource=await source\(token,TARGET,current\.object\.sha\)/);
 assert.match(source,/liveSource\.sha!==c\.source_blob_sha/);
 assert.doesNotMatch(source,/TRUSTED_PREVIEW_BASE_BRANCH_DRIFT/);
 assert.match(source,/reality_record_riley_auto_corrective_staging_v1/);
 assert.match(source,/SAME_ORIGINAL_CORRECTIVE_CANDIDATE_STAGED_READBACK/);
 assert.match(sql,/candidate_staged_commit_sha/);
 assert.match(sql,/rev\.owner_id=\(g->>'owner_id'\)::uuid/);
 assert.match(sql,/j\.phase='SOURCE_ADMITTED'/);
 assert.match(sql,/'installation_authorized',false/);
 assert.match(sql,/'original_job_completed',false/);
});
test('owner Chat status shows staged CI candidate separately from actual test verdict',()=>{
 const ui=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261114_owner_chat_staged_candidate_readback_v3.sql',
  import.meta.url),'utf8');
 assert.match(sql,/CORRECTIVE_CANDIDATE_STAGED_INDEPENDENT_CI_PENDING/);
 assert.match(sql,/corrective_candidate_branch/);
 assert.match(sql,/p\.conclusion='success'/);
 assert.match(ui,/CORRECTIVE_CANDIDATE_STAGED_INDEPENDENT_CI_PENDING/);
 assert.match(ui,/View isolated candidate on GitHub/);
 assert.match(ui,/independent CI verdict pending/);
});


import {selectCorrectiveCiCapability} from '../src/reality-evidence-driven-capability-router-v1.js';
test('same registered corrective CI capability selects exact original or retry evidence',async()=>{
 const owner='11111111-1111-4111-8111-111111111111';
 const shift='22222222-2222-4222-8222-222222222222';
 const attempt='33333333-3333-4333-8333-333333333333';
 const wake={status:'SHIFT_WORKER_PULSE_DURABLY_RECORDED',shift_id:shift,
  installation_authorized:false,production_changed:false};
 const base={owner_id:owner,shift_id:shift,original_work_id:'work:'+'a'.repeat(32),
  source_commit_sha:'b'.repeat(40),proposed_sha256:'sha256:'+'c'.repeat(64),
  model_response_id:'resp_fixture123',original_job_completed:false,
  installation_authorized:false,production_changed:false};
 const keys=['RUN_INDEPENDENT_CORRECTIVE_CI'];
 for(const candidate of [
  {...base,status:'EXACT_SAME_SHIFT_CORRECTIVE_DRAFT_READY_FOR_CI'},
  {...base,status:'SAME_ORIGINAL_RECOVERY_CANDIDATE_READY_FOR_CI',attempt_id:attempt,attempt_number:2}
 ]){
  const input={wake,candidate,registeredActionKeys:keys};
  const selected=selectCorrectiveCiCapability(input);
  assert.equal(selected.key,keys[0]);
  assert.equal(selected.version,candidate.attempt_id?2:1);
  assert.equal(selected.expectedScope.proposed_sha256,base.proposed_sha256);
  for(const invalid of [
   {registeredActionKeys:[]},{candidate:{...candidate,shift_id:owner}},
   {candidate:{...candidate,proposed_sha256:'invalid'}},
   {candidate:{...candidate,installation_authorized:true}},
   {candidate:{...candidate,original_job_completed:true}}
  ])assert.equal(selectCorrectiveCiCapability({...input,...invalid}),null);
  let calls=0;
  const result=await continueRileyCorrectiveModelIntoIndependentCI({db,env,
   version:selected.version,expectedScope:selected.expectedScope,
   fetchImpl:async(_url,request)=>{
    calls++;
    assert.deepEqual(JSON.parse(request.body).expected_scope,selected.expectedScope);
    return {ok:true,json:async()=>({status:'CORRECTIVE_CANDIDATE_STAGED_AWAITING_INDEPENDENT_CI',
     original_work_id:base.original_work_id,original_job_completed:false,
     installation_authorized:false,production_changed:false})};
   }});
  assert.equal(calls,1);
  assert.equal(result.status,'CORRECTIVE_CANDIDATE_STAGED_AWAITING_INDEPENDENT_CI');
 }
 const source=readFileSync(new URL('../supabase/functions/reality-riley-auto-corrective-ci-v1/index.ts',import.meta.url),'utf8');
 const fence=source.indexOf("refuse('SELECTED_SCOPE_CHANGED_NO_PROVIDER_EFFECT')");
 assert.ok(fence>source.lastIndexOf('validClaim(c,recovery);')&&fence<source.lastIndexOf('return await stageOrObserve('));
 assert.match(source,/fields.some\(k=>!Object.hasOwn\(expected,k\)\|\|expected\[k\]!==c\[k\]\)/);
});
