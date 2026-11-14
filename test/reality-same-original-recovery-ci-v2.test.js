import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {continueRileyCorrectiveModelIntoIndependentCI}
 from '../src/reality-riley-auto-corrective-ci-bridge-v1.js';
const broker=readFileSync(new URL(
 '../supabase/functions/reality-riley-auto-corrective-ci-v1/index.ts',
 import.meta.url),'utf8');
const BRANCH='reality/test-independent-recovery-preview';
const WORK='work:'+'a'.repeat(32);
const ATTEMPT='11111111-2222-4333-8444-555555555555';
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw',
 VERCEL_GIT_COMMIT_REF:BRANCH,VERCEL_GIT_COMMIT_SHA:'c'.repeat(40)};
const db={strictSecrets:true,project:'hvkfreoagbrphwghjajw',
 url:'https://hvkfreoagbrphwghjajw.supabase.co',
 secretKey:'test-only-isolated-secret-credential'};
const base={original_job_completed:false,installation_authorized:false,
 production_changed:false};
function harness(reply){
 const calls=[];
 const fetchImpl=async(url,opts)=>{
  calls.push({url,opts});
  return {ok:true,json:async()=>reply};
 };
 return {fetchImpl,calls};
}
test('version 2 uses the EXISTING authenticated corrective CI broker, no new worker or job',async()=>{
 const h=harness({...base,status:'NO_UNTESTED_SAME_ORIGINAL_RECOVERY_CANDIDATE'});
 const r=await continueRileyCorrectiveModelIntoIndependentCI({
  db,env,fetchImpl:h.fetchImpl,version:2});
 assert.equal(r.status,'NO_UNTESTED_SAME_ORIGINAL_RECOVERY_CANDIDATE');
 assert.equal(r.new_shift_started,false);
 assert.equal(r.original_job_completed,false);
 assert.equal(h.calls.length,1);
 assert.match(h.calls[0].url,/\/functions\/v1\/reality-riley-auto-corrective-ci-v1$/);
 assert.equal(h.calls[0].opts.headers.authorization,'Bearer '+db.secretKey);
 assert.deepEqual(JSON.parse(h.calls[0].opts.body),{
  action:'stage_or_check',base_branch:BRANCH,
  base_sha:env.VERCEL_GIT_COMMIT_SHA,version:2});
});
test('frozen exact failed CI is evidence, never installation authority',async()=>{
 const h=harness({...base,
  status:'CORRECTIVE_CI_REJECTED_ORIGINAL_REMAINS_OPEN',
  original_work_id:WORK,attempt_id:ATTEMPT,attempt_number:2,
  independent_ci_verified:true,
  independent_run_url:'https://github.com/maloney2323/Reality/actions/runs/43597941179'});
 const r=await continueRileyCorrectiveModelIntoIndependentCI({
  db,env,fetchImpl:h.fetchImpl,version:2});
 assert.equal(r.status,'CORRECTIVE_CI_REJECTED_ORIGINAL_REMAINS_OPEN');
 assert.equal(r.independent_ci_verified,true);
 assert.equal(r.attempt_id,ATTEMPT);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.installation_authorized,false);
 assert.equal(r.production_changed,false);
});
test('a forged independent run URL cannot be treated as verified CI',async()=>{
 const h=harness({...base,
  status:'CORRECTIVE_CI_PASSED_EXACT_INSTALL_REVIEW_REQUIRED',
  original_work_id:WORK,attempt_id:ATTEMPT,attempt_number:2,
  independent_ci_verified:true,
  independent_run_url:'https://untrusted.example/actions/runs/42'});
 const r=await continueRileyCorrectiveModelIntoIndependentCI({
  db,env,fetchImpl:h.fetchImpl,version:2});
 assert.equal(r.status,'ISOLATED_CORRECTIVE_CI_INDEPENDENT_PROOF_INVALID');
 assert.equal(r.original_job_completed,false);
 assert.equal(r.installation_authorized,false);
});
test('isolated broker restricts v2 model candidate to a unique frozen owner-job branch and evidence',()=>{
 assert.match(broker,/reality_read_next_same_original_recovery_candidate_v2/);
 assert.match(broker,/reality_record_same_original_recovery_staging_v2/);
 assert.match(broker,/reality_record_same_original_recovery_ci_v2/);
 assert.match(broker,/recovery\?'-a'\+c\.attempt_number:''/);
 assert.match(broker,/c\.attempt_id/);
 assert.match(broker,/draft:true/);
 assert.match(broker,/prFailureRuns=\[\.\.\.byId\.values\(\)\]\.filter/);
 assert.match(broker,/r\.event==='pull_request'&&r\.conclusion==='failure'/);
 assert.match(broker,/matched&&matched\.conclusion!=='failure'/);
 assert.match(broker,/TRUSTED_ORIGINAL_FROZEN_TEST_COMMAND_MISSING/);
 assert.match(broker,/r\.name===WORKFLOW_NAME&&r\.path===WORKFLOW/);
 assert.match(broker,/Independent original-job continuity and governed handoff acceptance/);
 assert.match(broker,/current\.object\?\.sha/);
 assert.match(broker,/source_blob_sha/);
 assert.match(broker,/proposed_sha256/);
 assert.match(broker,/reality_record_riley_auto_corrective_ci_v1/);
});
test('service-only CI receipt is bound to same original and its staged SHA, not hardcoded historical jobs',()=>{
 const sql=readFileSync(new URL(
 '../supabase/migrations/20261114_same_original_recovery_ci_continuation_v2.sql',
 import.meta.url),'utf8');
 const worker=readFileSync(new URL(
 '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(sql,/riley_same_original_recovery_attempts_v2/);
 assert.match(sql,/r\.candidate_staged_commit_sha<>p_tested_commit_sha/);
 assert.match(sql,/reality_read_current_shift_execution_graph_v1/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.doesNotMatch(sql,/grant execute[^;]*to authenticated/gi);
 assert.doesNotMatch(sql,/issues\/185|issues\/263/);
 assert.match(worker,/version:2/);
 assert.match(worker,/SAME_ORIGINAL_RECOVERY_CI_ELIGIBILITY/);
 assert.match(worker,/classifyCorrectiveProofTick\(retryCi\)/);
 assert.match(worker,/independent_ci_verified:classification\.proof_verified/);
 const workflow=readFileSync(new URL(
 '../.github/workflows/reality-riley-auto-corrective-candidate-proof.yml',
 import.meta.url),'utf8');
 assert.match(workflow,/reality\/\*\*/);
 assert.match(workflow,/independent-corrective-frozen/);
 assert.match(workflow,/node --test/);
});

test('v2 cannot accept provider-claimed installation or silently change protocol version',async()=>{
 const forged=harness({...base,
  status:'CORRECTIVE_CI_PASSED_EXACT_INSTALL_REVIEW_REQUIRED',
  original_work_id:WORK,attempt_id:ATTEMPT,attempt_number:2,
  independent_ci_verified:true,
  independent_run_url:'https://github.com/maloney2323/Reality/actions/runs/43597941179',
  installation_authorized:true});
 const rejected=await continueRileyCorrectiveModelIntoIndependentCI({
  db,env,fetchImpl:forged.fetchImpl,version:2});
 assert.equal(rejected.status,'ISOLATED_CORRECTIVE_CI_PROVIDER_READBACK_UNVERIFIED');
 assert.equal(rejected.installation_authorized,false);
 const transport=harness({...base,status:'NO_UNTESTED_SAME_ORIGINAL_RECOVERY_CANDIDATE'});
 const wrongVersion=await continueRileyCorrectiveModelIntoIndependentCI({
  db,env,fetchImpl:transport.fetchImpl,version:3});
 assert.equal(wrongVersion.status,'ISOLATED_CORRECTIVE_CI_PROTOCOL_VERSION_INVALID');
 assert.equal(transport.calls.length,0);
});
