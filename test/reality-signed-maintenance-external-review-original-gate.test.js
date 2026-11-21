import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {independentlyReviewOneStagedMaintenanceRegression}
 from '../src/reality-signed-maintenance-external-review-v1.js';
import {shiftRpc} from '../src/reality-governed-shift-boundary-v1.js';
const source='https://github.com/maloney2323/Reality/pull/307';
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const worker='22222222-4444-4777-8888-333333333333';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const maintenance='b7181e5b-a01c-4cb2-b191-10dea9dbe04f';
const hash=c=>'sha256:'+c.repeat(64);
const staged={status:'SIGNED_EXTERNAL_REGRESSION_NEEDS_INDEPENDENT_GITHUB_RECHECK',
 owner_id:owner,shift_id:shift,maintenance_id:maintenance,source_ref:source,
 assignee:'Riley',reviewer:'Quinn',staging_receipt_sha256:hash('a'),
 source_epoch_receipt_sha256:hash('b'),current_provider_sha256:hash('c'),
 external_test_pr_number:364,github_run_id:44561354607,
 github_run_url:'https://github.com/maloney2323/Reality/actions/runs/44561354607',
 github_red_job_id:135691190540,github_green_job_id:135691191518,
 github_head_sha:'5dee4129d4f29fedc9f4529bd4c125c3383c02ed',
 historical_source_commit_sha:'5b704437e1527673deae0484f67be5c7afe36563',
 corrected_source_commit_sha:'2b10a5a943bfdf250b6838a3f4c03f40191e7de8',
 frozen_test_blob_sha:'2d1572bb9be8e72456d8910f3251c03cd8291960',
 frozen_workflow_blob_sha:'9c9caf1764f86d9ec5e7f97ba22b55cb529a579d',
 read_only:true,independent_maintenance_ci_red_attested:false,
 original_job_completed:false,installation_authorized:false,
 production_changed:false};
const db={project:'proj',strictSecrets:true,secretKey:'test-secret',url:'https://db.example'};
const env={VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'proj'};
function fixture({sourceDrift=false,githubMismatch=false}={}){
 const calls=[],got=[];
 const red={id:135691190540,name:'historical-independent-red',
  status:'completed',conclusion:'failure',steps:[
   {name:'Historical code fails frozen owner-warrant and draft-source regression',conclusion:'failure'}]};
 const green={id:135691191518,name:'repaired-independent-green',
  status:'completed',conclusion:'success',steps:[
   {name:'Repaired code passes exact same frozen regression',conclusion:'success'}]};
 const replies=[
  {number:364,head:{sha:staged.github_head_sha},
   base:{repo:{full_name:'maloney2323/Reality'}}},
  {id:staged.github_run_id,head_sha:staged.github_head_sha,
   html_url:staged.github_run_url,status:'completed',conclusion:'failure',
   event:'pull_request',
   path:'.github/workflows/reality-maintenance-prreview-frozen-regression.yml'},
  {jobs:[red,green]},
  {sha:staged.frozen_test_blob_sha,path:
   'test/reality-maintenance-prreview-executable-regression.test.js'},
  {sha:staged.frozen_workflow_blob_sha,
   path:'.github/workflows/reality-maintenance-prreview-frozen-regression.yml',
   encoding:'base64',content:Buffer.from([
    'ref: '+staged.historical_source_commit_sha,
    'ref: '+staged.corrected_source_commit_sha].join('\n')).toString('base64')}
 ];
 if(githubMismatch)replies[1].conclusion='success';
 return {calls,got,fetchImpl:async(url)=>{
    got.push(url);const idx=got.length-1;
    if(idx>=replies.length)throw Error('EXTRA_FETCH');
    return {ok:true,json:async()=>replies[idx]};
  },
  readSource:async()=>({source_ref:source,
   provider_proof_sha256:sourceDrift?hash('d'):hash('c'),
   checked_at:new Date().toISOString()}),
  call:async(_db,method,payload)=>{
   calls.push({method,payload});
   if(method==='reality_read_next_signed_maintenance_external_review_v1')
    return {...staged};
   assert.equal(method,'reality_record_signed_maintenance_external_review_v1');
   assert.equal(payload.p_maintenance_id,maintenance);
   assert.equal(payload.p_shift_id,shift);
   assert.equal(payload.p_worker_run_id,worker);
   return {status:'SIGNED_EXTERNAL_HISTORICAL_REGRESSION_REVIEW_RECORDED_CASE_RED_STILL_REQUIRED',
    owner_id:owner,shift_id:shift,maintenance_id:maintenance,reviewer:'Quinn',
    staging_receipt_sha256:hash('a'),
    review_receipt_sha256:hash('e'),
    next_action:'CASE_SPECIFIC_INDEPENDENT_FROZEN_CI_RED_REQUIRED',
    independent_maintenance_ci_red_attested:false,original_job_completed:false,
    installation_authorized:false,repair_executed:false,production_changed:false};
  }};
}
test('Quinn signed worker independently validates exact real GitHub PR/run/steps/source and saves immutable review',async()=>{
 const f=fixture();const out=await independentlyReviewOneStagedMaintenanceRegression({
  db,env,shiftId:shift,workerRunId:worker,...f
 });
 assert.equal(f.got.length,5);
 assert.equal(f.calls.length,2);
 assert.match(f.calls[1].payload.p_independent_provider_digest,/^sha256:[a-f0-9]{64}$/);
 assert.equal(out.review_receipt_sha256,hash('e'));
 assert.equal(out.independent_maintenance_ci_red_attested,false);
 assert.equal(out.original_job_completed,false);
 assert.equal(out.installation_authorized,false);
});
test('GitHub workflow mismatch does not record false case-specific CI RED',async()=>{
 const f=fixture({githubMismatch:true});
 const out=await independentlyReviewOneStagedMaintenanceRegression({
  db,env,shiftId:shift,workerRunId:worker,...f});
 assert.equal(out.status,'SIGNED_EXTERNAL_REVIEW_GITHUB_PROOF_MISMATCH');
 assert.equal(f.calls.length,1);
 assert.equal(out.original_job_completed,false);
});
test('provider source drift keeps same job unresolved without recording review',async()=>{
 const f=fixture({sourceDrift:true});
 const out=await independentlyReviewOneStagedMaintenanceRegression({
  db,env,shiftId:shift,workerRunId:worker,...f});
 assert.equal(out.status,'SIGNED_EXTERNAL_REVIEW_SOURCE_DRIFT_REQUALIFICATION_REQUIRED');
 assert.equal(f.calls.length,1);
});
test('service boundary and non-case-specific historical evidence are enforced',async()=>{
 const f=fixture();
 await assert.rejects(independentlyReviewOneStagedMaintenanceRegression({
  db,env,shiftId:shift,workerRunId:worker,
  call:async()=>({...staged,installation_authorized:true}),
  fetchImpl:f.fetchImpl,readSource:f.readSource}),/SIGNED_SCOPE_OR_PROOF_UNTRUSTED/);
});
test('SQL ties signed independent review and existing original to same owner, warrant, source and never installs',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261119174500_signed_maintenance_external_review_and_original_gate_v1.sql',import.meta.url),'utf8');
 for(const s of [
  'owner_maintenance_external_regression_evidence_v1',
  'owner_maintenance_external_regression_signed_reviews_v1',
  "w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'",
  "run.status='STARTED'",
  "scope->>'maintenance_id'=m.incident_id::text",
  "m.independent_frozen_test_receipt_sha256 IS NULL",
  "HISTORICAL_GUARD_REGRESSION_VERIFIED_NOT_MAINTENANCE_CASE_SPECIFIC_RED",
  "riley_pr_review_originals_v1",
  "f.original_work_id=v.original_work_id",
  "EXISTING_ORIGINAL_NOT_AUTHORIZED_BY_MAINTENANCE_SHIFT",
  "signed_external_review_receipt_sha256",
  "independent_final_receipt_verified",
  "FROM PUBLIC,anon,authenticated",
  "TO service_role"
 ]) assert.ok(sql.includes(s),s);
 assert.doesNotMatch(sql,/\bUPDATE reality_internal|\bDELETE FROM|cron\.schedule|net\.http_post/i);
});
test('existing signed worker uses review and original final gate without new shift or approval',()=>{
 const s=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(s,/independentlyReviewOneStagedMaintenanceRegression\(/);
 assert.match(s,/workerRunId:actualWorkerRunId/);
 assert.match(s,/reality_read_same_original_postmaintenance_gate_v1/);
 assert.match(s,/signed_external_maintenance_review:signedExternalMaintenanceReview/);
 assert.match(s,/same_original_postmaintenance_gate:sameOriginalPostmaintenanceGate/);
 const b=readFileSync(new URL('../src/reality-governed-shift-boundary-v1.js',import.meta.url),'utf8');
 assert.match(b,/read_next_signed_maintenance_external_review_v1/);
 assert.match(b,/record_signed_maintenance_external_review_v1/);
 assert.match(b,/read_same_original_postmaintenance_gate_v1/);
});
test('RPC service allowlist cannot submit installation or fake receipt',async()=>{
 await assert.rejects(shiftRpc(db,'reality_autoapprove_original_install_v1',{},{
  fetchImpl:async()=>{throw Error('should not reach')} }),/SHIFT_RPC_NOT_ALLOWLISTED/);
});
