import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {executeExactlyPreparedRileyReviewViaReality}
 from '../src/reality-riley-governed-pr-provider-bridge-v1.js';
const SHIFT='9460cfff-937a-4105-9093-2e41ab39a950';
const WORK='work:94fc872f8ba9062f968920c59218c3ca';
const SOURCE='https://github.com/maloney2323/Reality/pull/57';
const env={VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'isolated'};
const db={url:'https://isolated.supabase.co',project:'isolated',strictSecrets:true,
 secretKey:'testing-service-credential-valid-length'};
const graph={status:'UNIFIED_OWNER_JOB_CONTROL_READY',
 shift_id:SHIFT,installation_authorized:false,production_changed:false,
 jobs:[{original_work_id:WORK,source_ref:SOURCE,
  original_kind:'REAL_PR_REVIEW_ORIGINAL',
  phase:'PREPARED',independent_source_proof_verified:true}]};
function fixture(outcome){
 const requests=[];
 const fetchImpl=async(url,options)=>{
  requests.push({url,method:options.method,body:options.body});
  return {ok:true,json:async()=>outcome};
 };
 return {requests,fetchImpl};
}
test('bridge calls Reality-owned service provider, not model or GitHub, with no client-selected job',async()=>{
 const f=fixture({status:'BROKER_GITHUB_WRITER_NOT_CONFIGURED',
  installation_authorized:false,original_job_completed:false,
  production_changed:false,new_shift_created:false,code_installed:false});
 const result=await executeExactlyPreparedRileyReviewViaReality({
  db,env,graph,fetchImpl:f.fetchImpl});
 assert.equal(result.status,'BROKER_GITHUB_WRITER_NOT_CONFIGURED');
 assert.equal(result.original_job_completed,false);
 assert.equal(f.requests.length,1);
 assert.equal(f.requests[0].url,
  'https://isolated.supabase.co/functions/v1/reality-governed-pr-review-publisher-v1');
 assert.equal(f.requests[0].method,'POST');
 assert.equal(f.requests[0].body,'{"version":1}');
 assert.doesNotMatch(f.requests[0].body,/original|owner|token|github|repo/);
});
test('provider-verified settled receipt can advance exactly original PR review',async()=>{
 const f=fixture({status:'EXACT_GOVERNED_PR_REVIEW_PROVIDER_SETTLED',
  original_work_id:WORK,shift_id:SHIFT,original_job_completed:true,
  independent_provider_readback_verified:true,
  provider_comment_url:'https://github.com/maloney2323/Reality/pull/57#issuecomment-12345',
  settlement_receipt_ref:'supabase:riley_pr_review_originals_v1:cccccccc-3333-4444-8555-ffffffffffff',
  installation_authorized:false,production_changed:false,
  new_shift_created:false,code_installed:false});
 const r=await executeExactlyPreparedRileyReviewViaReality({
  db,env,graph,fetchImpl:f.fetchImpl});
 assert.equal(r.status,'EXACT_PR_REVIEW_ORIGINAL_INDEPENDENTLY_SETTLED');
 assert.equal(r.original_work_id,WORK);
 assert.equal(r.independently_verified_original_receipt,true);
 assert.equal(r.original_job_completed,true);
 assert.equal(r.installation_authorized,false);
 assert.equal(r.production_changed,false);
});
test('forged settlement and cross-shift scope fail closed',async()=>{
 for(const bad of [{...graph,shift_id:'99999999-0000-4000-8000-000000000000'},
  {...graph,installation_authorized:true}]){
  await assert.rejects(()=>executeExactlyPreparedRileyReviewViaReality({
   db,env,graph:bad,fetchImpl:async()=>{throw Error('must not call provider')}
  }),/REALITY_GOVERNED_PR_PROVIDER_VERIFIED_ORIGINAL_GRAPH_REQUIRED/);
 }
 const f=fixture({status:'EXACT_GOVERNED_PR_REVIEW_PROVIDER_SETTLED',
  original_work_id:'work:'+'a'.repeat(32),shift_id:SHIFT,
  original_job_completed:true,independent_provider_readback_verified:true,
  provider_comment_url:'https://github.com/maloney2323/Reality/pull/57#issuecomment-1',
  settlement_receipt_ref:'supabase:riley_pr_review_originals_v1:cccccccc-3333-4444-8555-ffffffffffff',
  installation_authorized:false,production_changed:false,
  new_shift_created:false,code_installed:false});
 await assert.rejects(()=>executeExactlyPreparedRileyReviewViaReality({
  db,env,graph,fetchImpl:f.fetchImpl}),/BROKER_SETTLEMENT_PROVIDER_OR_ORIGINAL_IDENTITY_INVALID/);
});
test('missing broker token preserves prepared original without new provider writes',()=>{
 const edge=readFileSync(new URL(
  '../supabase/functions/reality-governed-pr-review-publisher-v1/index.ts',
  import.meta.url),'utf8');
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',
  import.meta.url),'utf8');
 assert.match(edge,/REALITY_GITHUB_BROKER_TOKEN/);
 assert.match(edge,/BROKER_GITHUB_WRITER_NOT_CONFIGURED/);
 assert.match(edge,/c\.phase==='PUBLISHING'/);
 assert.match(edge,/PREPARED/);
 assert.match(edge,/reality_claim_authorized_riley_pr_review_v1/);
 assert.match(edge,/reality_mark_authorized_riley_pr_publish_v1/);
 assert.match(edge,/reality_settle_authorized_riley_pr_review_v1/);
 assert.match(edge,/GITHUB_COMMENT_COVERAGE_INCOMPLETE/);
 assert.match(edge,/PROVIDER_EFFECTS_RECONCILIATION_REQUIRED/);
 assert.match(edge,/independent_provider_readback_verified/);
 assert.match(edge,/original_job_completed:false/);
 assert.match(worker,/executeExactlyPreparedRileyReviewViaReality/);
 assert.match(worker,/riley_governed_pr_write_broker/);
 assert.doesNotMatch(edge,/eval\(|new Function\(|Deno\.env\.get\('REALITY_GITHUB_TOKEN'\)/);
});

test('uncertain GitHub publication remains Reality-broker readback-only on future wakes',async()=>{
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const code=worker.slice(worker.indexOf('let governedPrProvider'),worker.indexOf('// Admit the ACTUAL'));
 assert.match(code,/PR_REVIEW_GITHUB_WRITER_CREDENTIAL_MISSING/);
 assert.match(code,/PR_REVIEW_PUBLISH_EFFECT_UNCERTAIN_READBACK_ONLY/);
 assert.match(code,/executeExactlyPreparedRileyReviewViaReality/);
 const f=fixture({status:'PUBLISHING_WITH_UNKNOWN_EFFECT_READBACK_ONLY',
  installation_authorized:false,original_job_completed:false,
  production_changed:false,new_shift_created:false,code_installed:false});
 const result=await executeExactlyPreparedRileyReviewViaReality({
  db,env,graph:{...graph,jobs:[{...graph.jobs[0],phase:'PUBLISHING'}]},
  fetchImpl:f.fetchImpl});
 assert.equal(result.status,'PUBLISHING_WITH_UNKNOWN_EFFECT_READBACK_ONLY');
 assert.equal(result.original_job_completed,false);
 assert.equal(f.requests.length,1);
 assert.equal(f.requests[0].body,'{"version":1}');
 const broker=readFileSync(new URL(
  '../supabase/functions/reality-governed-pr-review-publisher-v1/index.ts',
  import.meta.url),'utf8');
 assert.match(broker,/if\(c\.phase==='PUBLISHING'\)/);
 assert.match(broker,/PUBLISHING_WITH_UNKNOWN_EFFECT_READBACK_ONLY/);
 assert.match(broker,/reality_mark_authorized_riley_pr_publish_v1/);
});

test('definitive Github HTTP rejection is evidence, not a grant to replay the original effect',async()=>{
 const edge=readFileSync(new URL(
  '../supabase/functions/reality-governed-pr-review-publisher-v1/index.ts',
  import.meta.url),'utf8');
 assert.match(edge,/REALITY_PR57_POST_HTTP_REJECTED/);
 assert.match(edge,/GITHUB_POST_HTTP_REJECTED_/);
 assert.match(edge,/GITHUB_POST_DEFINITIVELY_REJECTED_HTTP_/);
 assert.match(edge,/POST_UNCERTAIN_RECONCILE_BY_READBACK_ONLY/);
 assert.match(edge,/c\.phase==='PUBLISHING'/);
 assert.match(edge,/PUBLISHING_WITH_UNKNOWN_EFFECT_READBACK_ONLY/);
 const f=fixture({status:'GITHUB_POST_DEFINITIVELY_REJECTED_HTTP_403_FENCE_PRESERVED',
  original_work_id:WORK,shift_id:SHIFT,original_job_completed:false,
  installation_authorized:false,production_changed:false,
  new_shift_created:false,code_installed:false});
 const r=await executeExactlyPreparedRileyReviewViaReality({
  db,env,graph,fetchImpl:f.fetchImpl
 });
 assert.equal(r.status,'GITHUB_POST_DEFINITIVELY_REJECTED_HTTP_403_FENCE_PRESERVED');
 assert.equal(r.original_job_completed,false);
 assert.equal(r.installation_authorized,false);
 assert.equal(r.production_changed,false);
 assert.equal(f.requests.length,1);
});
