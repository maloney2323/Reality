import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectCurrentRileyPrReviewSourceReadiness as inspect,
 shouldFenceRileyPrClaimForObservedIncompatibility as shouldFence}
 from '../src/reality-riley-authorized-pr-review-job-v1.js';
import {inspectLargePrSourceForBoundedReview}
 from '../src/reality-pr-large-source-qualification-v1.js';
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
test('signed worker may suppress only safely incompatible pre-provider source claims',async()=>{
 const r=await inspect({graph,env,fetchImpl:async(url)=>{
  const id=Number(/\/pulls\/(\d+)$/.exec(url)[1]);
  return {ok:true,json:async()=>({
   number:id,html_url:ref(id),state:'open',draft:true,
   changed_files:id===307?34:304,head:{sha:'f'.repeat(40)}
  })};
 }});
 assert.equal(shouldFence({graph,inspection:r}),true);
 assert.equal(shouldFence({graph:{...graph,owner_id:shift},inspection:r}),false);
 assert.equal(shouldFence({graph:{...graph,jobs:[{
  ...graph.jobs[0],phase:'PUBLISHING'},graph.jobs[1]]},inspection:r}),false);
 assert.equal(shouldFence({graph:{...graph,jobs:[{
  ...graph.jobs[0],phase:'PREPARED'},graph.jobs[1]]},inspection:r}),false);
 assert.equal(shouldFence({graph:{...graph,jobs:[
  {...graph.jobs[0],source_proof_sha256:sha('c')},graph.jobs[1]]},inspection:r}),true);
 assert.equal(shouldFence({graph,inspection:{...r,source_diagnostics:[
  r.source_diagnostics[0]
 ]}}),false);
 assert.equal(shouldFence({graph,inspection:{...r,source_diagnostics:[
  {...r.source_diagnostics[0],current_provider_metadata_read:false},
  r.source_diagnostics[1]
 ]}}),false);
 assert.equal(r.worker_claim_consumed,false);
});
test('unrelated source eligible for native bounded review is not starved',async()=>{
 const r=await inspect({graph,env,fetchImpl:async(url)=>{
  const id=Number(/\/pulls\/(\d+)$/.exec(url)[1]);
  return {ok:true,json:async()=>({
   number:id,html_url:ref(id),state:'open',
   draft:id===307,changed_files:id===307?34:3,
   head:{sha:'f'.repeat(40)}
  })};
 }});
 const g={...graph,jobs:[
  graph.jobs[0],{...graph.jobs[1],original_work_id:'work:'+'2'.repeat(32),phase:'CLAIMED'}
 ]};
 assert.equal(shouldFence({graph:g,inspection:r}),false);
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
 assert.match(code,/shouldFenceRileyPrClaimForObservedIncompatibility/);
 assert.match(code,/PR_REVIEW_SIGNED_SOURCES_INCOMPATIBLE_NO_CLAIM_OR_RETRY/);
 assert.match(code,/runAuthorizedRileyPrReview/);
 assert.match(code,/final_loop_engine_shadow:finalLoopEngineShadow/);
});

const fullSourceEnv={...env,
 REALITY_FINAL_LOOP_LARGE_PR_QUALIFICATION_SHADOW_ENABLED:'true'};
const fullFiles=n=>Array.from({length:n},(_,i)=>({
 filename:'src/review-file-'+String(i).padStart(4,'0')+'.js',
 status:'modified',sha:'c'.repeat(40),additions:1,deletions:2
 // No patch: inventory evidence must NOT be labeled patch-review coverage.
}));
function wholePrProvider({counts={307:34,308:304},drift=0,truncate=false,
 duplicate=false,badSha=false}={}){
 const reads={};
 return async (url,options)=>{
  assert.equal(options.method,'GET');
  assert.equal(options.body,undefined);
  const match=/\/pulls\/(307|308)(?:\/files\?per_page=100&page=(\d+))?$/.exec(url);
  assert.ok(match,'allowed read-only PR resource');
  const id=Number(match[1]),count=counts[id];
  const files=fullFiles(count);
  if(match[2]){
   const page=Number(match[2]);
   const pageFiles=files.slice((page-1)*100,page*100);
   if(duplicate&&page===1)pageFiles[1]={...pageFiles[0]};
   if(badSha&&page===1)pageFiles[0]={...pageFiles[0],sha:'bad'};
   if(truncate&&page===Math.ceil(count/100))pageFiles.pop();
   return {ok:true,json:async()=>pageFiles};
  }
  reads[id]=(reads[id]||0)+1;
  const head=drift&&reads[id]>1?'b'.repeat(40):'a'.repeat(40);
  return {ok:true,json:async()=>({
   number:id,html_url:ref(id),state:'open',draft:true,
   changed_files:count,head:{sha:head},base:{sha:'d'.repeat(40)}
  })};
 };
}
test('complete 34/304-file inventories generate bounded proposed scopes but no review or admission',async()=>{
 const r=await inspect({graph,env:fullSourceEnv,fetchImpl:wholePrProvider()});
 assert.equal(r.status,'SIGNED_PR_SOURCE_COMPATIBILITY_OBSERVED_READ_ONLY');
 const [a,b]=r.source_diagnostics.map(x=>x.large_source_qualification);
 for(const [p,n,groups] of [[a,34,5],[b,304,38]]){
  assert.equal(p.source_manifest_complete,true);
  assert.equal(p.manifest_file_count,n);
  assert.equal(p.bounded_scope_count,groups);
  assert.equal(p.bounded_scopes.reduce((sum,x)=>sum+x.file_count,0),n);
  assert.ok(p.bounded_scopes.every(x=>
   x.file_count<=8&&x.native_child_original_admitted===false&&
   x.independent_review_verified===false&&
   x.full_patch_evidence_verified===false&&
   x.child_execution_authorized===false));
  const allPaths=p.bounded_scopes.flatMap(x=>x.files.map(f=>f.path));
  assert.equal(new Set(allPaths).size,n);
  assert.equal(p.parent_obligation_remains_open,true);
  assert.equal(p.native_admission_unchanged,true);
  assert.equal(p.patch_coverage_verified,false);
  assert.equal(p.cross_scope_review_verified,false);
  assert.equal(p.draft_review_authority_verified,false);
  assert.equal(p.worker_claim_consumed,false);
  assert.equal(p.original_job_completed,false);
 }
 assert.equal(a.native_phase,'BLOCKED');
 assert.equal(b.native_phase,'NOT_ADMITTED');
 assert.equal(b.original_work_id,null);
 assert.equal(shouldFence({graph,inspection:r}),true);
});
test('manifest read is deterministic and pinned to the complete live base/head',async()=>{
 const options={job:graph.jobs[0],ownerId:owner,shiftId:shift,
  metadata:{number:307,html_url:ref(307),state:'open',draft:true,
   changed_files:34,head:{sha:'a'.repeat(40)},base:{sha:'d'.repeat(40)}},
  env:fullSourceEnv,fetchImpl:wholePrProvider()};
 const a=await inspectLargePrSourceForBoundedReview(options);
 const b=await inspectLargePrSourceForBoundedReview(options);
 assert.equal(a.source_manifest_sha256,b.source_manifest_sha256);
 assert.deepEqual(a.bounded_scopes.map(x=>x.proposed_scope_sha256),
  b.bounded_scopes.map(x=>x.proposed_scope_sha256));
 assert.equal(a.status,'FULL_DRAFT_MANIFEST_READ_REVIEW_AUTHORITY_PENDING');
 assert.equal(a.model_invoked,false);
 assert.equal(a.github_write_performed,false);
});
test('truncated provider pages, duplicate files, missing blob SHA and head drift all fail closed',async()=>{
 const metadata={number:308,html_url:ref(308),state:'open',draft:true,
  changed_files:304,head:{sha:'a'.repeat(40)},base:{sha:'d'.repeat(40)}};
 for(const variant of [
  {truncate:true},{duplicate:true},{badSha:true},{drift:1}
 ]){
  const r=await inspectLargePrSourceForBoundedReview({
   job:graph.jobs[1],ownerId:owner,shiftId:shift,
   metadata,env:fullSourceEnv,fetchImpl:wholePrProvider(variant)
  });
  assert.equal(r.source_manifest_complete,false);
  assert.equal(r.bounded_scope_count,0);
  assert.equal(r.worker_claim_consumed,false);
  assert.equal(r.original_job_completed,false);
 }
});
test('large PR outside hard manifest bound remains unqualified instead of sampling',async()=>{
 const r=await inspectLargePrSourceForBoundedReview({
  job:graph.jobs[1],ownerId:owner,shiftId:shift,
  metadata:{number:308,html_url:ref(308),state:'open',draft:false,
   changed_files:501,head:{sha:'a'.repeat(40)},base:{sha:'d'.repeat(40)}},
  env:fullSourceEnv,fetchImpl:async()=>{throw Error('MUST_NOT_FETCH');}
 });
 assert.equal(r.status,'LARGE_PR_FULL_SOURCE_QUALIFICATION_UNVERIFIED');
 assert.equal(r.source_manifest_complete,false);
 assert.equal(r.bounded_scope_count,0);
});
test('qualification gate disabled never reads any extra file pages',async()=>{
 const calls=[];
 const r=await inspect({graph,env,fetchImpl:async(url,options)=>{
  calls.push(url);
  return wholePrProvider() (url,options);
 }});
 assert.equal(r.source_diagnostics[0].large_source_qualification,null);
 assert.equal(r.source_diagnostics[1].large_source_qualification,null);
 assert.equal(calls.length,2);
 assert.ok(calls.every(x=>!/\/files\?/.test(x)));
});
