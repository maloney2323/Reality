import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {validateSourceBoundGenerationEvidence,prepareOriginalModelTicket}
 from '../scripts/reality-source-bound-model-ticket-worker-v1.mjs';
const queue=randomUUID(),work='work:'+'b'.repeat(32),
 sha='a'.repeat(40),frozen='f'.repeat(64);
const request={queue_id:queue,original_work_id:work,issue_number:178,
 schema:'reality-isolated-build-request-v1'};
const receipt={status:'EXACT_SOURCE_BOUND_GENERATION_ADMITTED',
 queue_id:queue,claim_id:randomUUID(),original_work_id:work,
 issue_number:178,baseline_source_sha:sha,
 frozen_test_sha256:frozen,failed_run_id:40962921090,
 expected_source_path:'src/reality-extensions/reality-ci-failure-evidence.mjs',
 frozen_test_path:'test/reality-frozen-regressions/first-reality-ci-evidence-gap.test.js',
 installation_authorized:false,job_completed:false,production_changed:false};
test('only an atomic owner-approved source receipt admits a non-executable model ticket',()=>{
 const ticket=validateSourceBoundGenerationEvidence(request,receipt);
 assert.equal(ticket.original_work_id,work);
 assert.equal(ticket.baseline_source_sha,sha);
 assert.equal(ticket.installation_authorized,false);
 assert.equal(ticket.original_job_completed,false);
 for(const patch of [
  {claim_id:'wrong'}, {installation_authorized:true},
  {job_completed:true}, {original_work_id:'work:'+'a'.repeat(32)},
  {expected_source_path:'../../dangerous.mjs'},
  {failed_run_id:0},
 ]){
  assert.throws(()=>validateSourceBoundGenerationEvidence(request,
   {...receipt,...patch}),/REALITY_SOURCE_BOUND_MODEL_INDEPENDENT_OWNER_WORK_PROVIDER_RECEIPT_INVALID/);
 }
});
test('a public request cannot run a model if GitHub identity or service credential is missing',async()=>{
 let requested=0;
 const env={GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'push',
  GITHUB_REPOSITORY:'maloney2323/Reality',
  GITHUB_REF:'refs/heads/feature/reality-closed-loop-worker-20261031',
  GITHUB_SHA:sha,REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
  REALITY_PERSONAL_CHAT_SUPABASE_URL:'https://hvkfreoagbrphwghjajw.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY:''};
 await assert.rejects(prepareOriginalModelTicket({
  env,checkoutSha:sha,request,
  changed:['reality-requests/'+queue+'.json'],
  fetchImpl:async()=>{requested++;throw Error('UNEXPECTED');},
 }),/REALITY_SOURCE_BOUND_MODEL_PINNED_ISOLATED_GITHUB_WORKER_REQUIRED/);
 assert.equal(requested,0);
});
