import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {executeApprovedContinuation}
 from '../scripts/reality-approved-repair-background-worker-v1.mjs';
const branch='feature/reality-closed-loop-worker-20261031';
const sha='a'.repeat(40),reservation=randomUUID();
const request={reservation_id:reservation,
 original_work_id:'work:'+'b'.repeat(32),candidate_hash:'c'.repeat(64),
 issue_number:178,install_branch:branch};
const env={GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'push',
 GITHUB_REPOSITORY:'maloney2323/Reality',
 GITHUB_REF:'refs/heads/feature/reality-background-continuation-20261031',
 GITHUB_SHA:sha,REALITY_BACKGROUND_REPAIR_WORKER_ENABLED:'true',
 VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:'hvkfreoagbrphwghjajw',
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:'hvkfreoagbrphwghjajw',
 REALITY_PERSONAL_CHAT_SUPABASE_URL:'https://hvkfreoagbrphwghjajw.supabase.co',
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:'https://hvkfreoagbrphwghjajw.supabase.co',
 REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY:'sb_publishable_localtest',
 REALITY_CHAT_RECEIPT_HMAC_KEY:'localtest-temporary-placeholder',
 SUPABASE_SERVICE_ROLE_KEY:'localtest-placeholder-value-for-validation',
 REALITY_BUILDER_DISPATCH_GITHUB_TOKEN:'localtest-placeholder-value-for-validation'};
test('no pre-existing owner approval means no installation',async()=>{
 let calls=0;
 const result=await executeApprovedContinuation({env,request,checkoutSha:sha,
  call:async()=>({status:'NO_APPROVED_WORK'}),
  serviceFactory:()=>{calls++;throw Error('UNEXPECTED')}});
 assert.equal(result.original_job_completed,false);
 assert.equal(calls,0);
});
test('unmatched Supabase approval cannot select another job',async()=>{
 let calls=0;
 const result={status:'EXACT_OWNER_APPROVED_WORK_LEASED',
  reservation_id:reservation,lease_id:randomUUID(),owner_id:randomUUID(),
  conversation_id:randomUUID(),original_work_id:'work:'+'f'.repeat(32),
  candidate_hash:request.candidate_hash,install_branch:branch,issue_number:178};
 await assert.rejects(executeApprovedContinuation({env,request,checkoutSha:sha,
  call:async()=>result,serviceFactory:()=>{calls++;}}),
  /ATOMIC_OWNER_APPROVED_LEASE_SCOPE_MISMATCH/);
 assert.equal(calls,0);
});
