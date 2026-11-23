import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectCurrentRileyPrReviewSourceReadiness as inspect}
 from '../src/reality-riley-authorized-pr-review-job-v1.js';
const owner='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const shift='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const ref=n=>'https://github.com/maloney2323/Reality/pull/'+n;
const sha=n=>'sha256:'+n.repeat(64);
const graph={
 status:'UNIFIED_OWNER_JOB_CONTROL_READY',owner_id:owner,shift_id:shift,
 jobs:[{
  source_ref:ref(307),original_work_id:'work:'+'1'.repeat(32),
  source_proof_sha256:sha('a'),original_kind:'REAL_PR_REVIEW_ORIGINAL',
  independent_source_proof_verified:true,phase:'BLOCKED',
  next_governed_action:'READ_CURRENT_PR_REVIEW_PROVIDER_EFFECT'
 },{
  source_ref:ref(308),original_work_id:null,
  source_proof_sha256:sha('b'),original_kind:'REAL_PR_REVIEW_ORIGINAL',
  independent_source_proof_verified:true,phase:'NOT_ADMITTED',
  next_governed_action:'ADMIT_ONE_VERIFIED_PR_REVIEW'
 }]
};
const env={VERCEL_ENV:'preview',REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED:'true'};
const provider=(draft=true)=>async (url,options)=>{
 assert.equal(options.method,'GET');
 assert.equal(options.body,undefined);
 const id=Number(/\/pulls\/(\d+)$/.exec(url)[1]);
 return {ok:true,status:200,json:async()=>({
  number:id,html_url:ref(id),state:'open',draft,
  changed_files:2,head:{sha:'a'.repeat(40)}
 })};
};
test('two signed draft PR sources are classified as incompatibilities with no claim or write',async()=>{
 let calls=0;
 const r=await inspect({graph,env,fetchImpl:async(...args)=>{
  calls++;return provider(true)(...args);
 }});
 assert.equal(calls,2);
 assert.equal(r.status,'SIGNED_PR_SOURCE_COMPATIBILITY_OBSERVED_READ_ONLY');
 assert.equal(r.draft_incompatible_count,2);
 assert.equal(r.source_diagnostics[0].native_phase,'BLOCKED');
 assert.equal(r.source_diagnostics[1].native_phase,'NOT_ADMITTED');
 assert.equal(r.source_diagnostics[0].eligibility_status,
  'SOURCE_PR_DRAFT_INCOMPATIBLE_WITH_EXISTING_REVIEW_EXECUTOR');
 assert.equal(r.next_read_only_governed_step,'REQUALIFY_EXACT_SOURCE_ELIGIBILITY_WITHOUT_REPLAY');
 assert.equal(r.worker_claim_consumed,false);
 assert.equal(r.review_generated,false);
 assert.equal(r.github_comment_published,false);
 assert.equal(r.original_job_completed,false);
});
test('nondraft is still only metadata preflight, not execution authority',async()=>{
 const r=await inspect({graph,env,fetchImpl:provider(false)});
 assert.equal(r.draft_incompatible_count,0);
 assert.equal(r.source_diagnostics[0].eligibility_status,
  'SOURCE_PR_OPEN_NON_DRAFT_PATCH_PREFLIGHT_STILL_REQUIRED');
 assert.equal(r.source_diagnostics[0].existing_executor_can_start_from_this_observation,false);
 assert.equal(r.worker_claim_consumed,false);
});
test('live-shaped draft PRs with 34 and 304 files preserve both independent blockers',async()=>{
 const r=await inspect({graph,env,fetchImpl:async(url,options)=>{
  assert.equal(options.method,'GET');
  const id=Number(/\/pulls\/(\d+)$/.exec(url)[1]);
  return {ok:true,json:async()=>({
   number:id,html_url:ref(id),state:'open',draft:true,
   changed_files:id===307?34:304,
   head:{sha:'f'.repeat(40)}
  })};
 }});
 assert.equal(r.source_count,2);
 assert.equal(r.draft_incompatible_count,2);
 assert.equal(r.oversized_changeset_count,2);
 assert.equal(r.blocked_original_count,1);
 assert.deepEqual(r.source_diagnostics.map(x=>x.current_github_changed_file_count),[34,304]);
 assert.ok(r.source_diagnostics.every(x=>
  x.eligibility_blockers.includes('DRAFT_SOURCE_NOT_ACCEPTED_BY_NATIVE_REVIEW_EXECUTOR')&&
  x.eligibility_blockers.includes('CHANGED_FILE_COUNT_EXCEEDS_NATIVE_BOUNDED_REVIEW')&&
  x.source_requalification_required===true));
 assert.equal(r.source_diagnostics[0].eligibility_blockers.includes(
  'EXISTING_ORIGINAL_BLOCKED_REQUIRES_DURABLE_RECONCILIATION'),true);
 assert.equal(r.source_diagnostics[1].eligibility_blockers.includes(
  'SOURCE_NOT_ADMITTED_AS_ORIGINAL'),true);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.worker_claim_consumed,false);
});
test('removing draft status alone cannot make oversized PR eligible',async()=>{
 const r=await inspect({graph,env,fetchImpl:async(url)=>{
  const id=Number(/\/pulls\/(\d+)$/.exec(url)[1]);
  return {ok:true,json:async()=>({
   number:id,html_url:ref(id),state:'open',draft:false,
   changed_files:id===307?34:304,head:{sha:'f'.repeat(40)}
  })};
 }});
 assert.equal(r.draft_incompatible_count,0);
 assert.equal(r.oversized_changeset_count,2);
 assert.equal(r.source_diagnostics[0].eligibility_status,
  'SOURCE_PR_TOO_LARGE_FOR_NATIVE_BOUNDED_REVIEW');
 assert.equal(r.source_diagnostics[1].existing_executor_can_start_from_this_observation,false);
});
test('disabled or foreign signed scope makes no provider calls',async()=>{
 for(const options of [
  {graph,env:{...env,REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED:'false'}},
  {graph,env:{...env,VERCEL_ENV:'production'}},
  {graph:{...graph,owner_id:'foreign'},env}
 ]){
  let calls=0;
  const r=await inspect({...options,fetchImpl:async()=>{
   calls++;throw Error('UNEXPECTED_NETWORK');
  }});
  assert.equal(calls,0);
  assert.equal(r.status,'SIGNED_PR_SOURCE_PREVIEW_OR_SCOPE_UNVERIFIED');
  assert.equal(r.original_job_completed,false);
 }
});
test('provider mismatch or outage cannot become an actionable job',async()=>{
 const r=await inspect({graph,env,fetchImpl:async()=>({
  ok:true,json:async()=>({number:999,html_url:ref(999),
   state:'open',draft:false,head:{sha:'b'.repeat(40)}})
 })});
 assert.equal(r.source_diagnostics[0].eligibility_status,
  'GITHUB_PR_CURRENT_METADATA_UNVERIFIED');
 assert.equal(r.original_job_completed,false);
 const failed=await inspect({graph,env,fetchImpl:async()=>{
  throw Error('NETWORK_FAILURE');
 }});
 assert.equal(failed.source_diagnostics[0].eligibility_status,
  'GITHUB_PR_CURRENT_METADATA_UNVERIFIED');
 assert.equal(failed.next_read_only_governed_step,
  'REQUALIFY_EXACT_SOURCE_ELIGIBILITY_WITHOUT_REPLAY');
});
test('signed worker reports eligibility separately from native executor and settlement',()=>{
 const code=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',
  import.meta.url),'utf8');
 assert.match(code,/inspectCurrentRileyPrReviewSourceReadiness/);
 assert.match(code,/riley_pr_source_readiness:rileyPrSourceReadiness/);
 assert.match(code,/runAuthorizedRileyPrReview/);
 assert.match(code,/final_loop_engine_shadow:finalLoopEngineShadow/);
});
