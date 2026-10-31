import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {executeApprovedContinuation,signedOriginalWorkLease,verifyApprovedWorkerEnvironment}
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

test('GitHub-signed worker gets no service key without an atomically approved original job',async()=>{
 const signedEnv={...env,ACTIONS_ID_TOKEN_REQUEST_URL:'https://pipelines.actions.githubusercontent.com/test',
  ACTIONS_ID_TOKEN_REQUEST_TOKEN:'synthetic-actions-issuer',
  SUPABASE_SERVICE_ROLE_KEY:''};
 const urls=[];
 const result=await signedOriginalWorkLease({
  env:signedEnv,request,checkoutSha:sha,
  fetchImpl:async(url,opts)=>{
   urls.push(String(url));
   if(String(url).startsWith('https://pipelines.actions.githubusercontent.com/'))
    return {ok:true,json:async()=>({value:'x'.repeat(350)})};
   assert.match(url,/supabase.co\/functions\/v1\/reality-approved-worker-oidc-lease/);
   assert.equal(opts.method,'POST');
   assert.ok(opts.headers.authorization.startsWith('Bearer '));
   return {ok:true,json:async()=>({ok:true,
    status:'NO_ATOMICALLY_APPROVED_WORK',
    service_credential_returned:false,owner_approval_used:false,
    installation_performed:false,original_job_completed:false,
    production_changed:false})};
  },
 });
 assert.equal(result.status,'NO_ATOMICALLY_APPROVED_WORK');
 assert.equal(result.serviceKey,undefined);
 assert.equal(urls.length,2);
});
test('only signed exact existing lease can provide an in-memory worker key',async()=>{
 const signedEnv={...env,ACTIONS_ID_TOKEN_REQUEST_URL:'https://pipelines.actions.githubusercontent.com/test',
  ACTIONS_ID_TOKEN_REQUEST_TOKEN:'synthetic-actions-issuer',
  SUPABASE_SERVICE_ROLE_KEY:''};
 const leased={
  status:'EXACT_OWNER_APPROVED_WORK_LEASED',
  lease_id:randomUUID(),reservation_id:reservation,
  owner_id:randomUUID(),conversation_id:randomUUID(),
  original_work_id:request.original_work_id,
  candidate_hash:request.candidate_hash,
  install_branch:request.install_branch,issue_number:178,attempts:1,
 };
 const run=async bridge=>signedOriginalWorkLease({
  env:signedEnv,request,checkoutSha:sha,
  fetchImpl:async url=>
   String(url).startsWith('https://pipelines.actions.githubusercontent.com/')?
    {ok:true,json:async()=>({value:'x'.repeat(350)})}:
    {ok:true,json:async()=>bridge},
 });
 const exact=await run({ok:true,status:'EXACT_OWNER_APPROVED_WORK_LEASED',
  lease:leased,service_credential_returned:true,
  service_role_key:'synthetic-only-in-memory-credential-value-for-test',
  original_job_completed:false,production_changed:false});
 assert.equal(exact.status,'EXACT_OWNER_APPROVED_WORK_LEASED');
 assert.equal(exact.leasedWork.lease_id,leased.lease_id);
 assert.equal(exact.serviceKey,'synthetic-only-in-memory-credential-value-for-test');
 await assert.rejects(run({ok:true,status:'EXACT_OWNER_APPROVED_WORK_LEASED',
  lease:{...leased,original_work_id:'work:'+'f'.repeat(32)},
  service_credential_returned:true,
  service_role_key:'synthetic-only-in-memory-credential-value-for-test',
  original_job_completed:false,production_changed:false}),
  /ATOMIC|SCOPE_MISMATCH/);
 await assert.rejects(signedOriginalWorkLease({
  env:{...signedEnv,ACTIONS_ID_TOKEN_REQUEST_TOKEN:''},request,checkoutSha:sha,
  fetchImpl:async()=>{throw Error('SIGNED_IDENTITY_BYPASS')},
 }),/SIGNED_GITHUB_WORKFLOW_IDENTITY_REQUIRED/);
});
test('already verified one-time OIDC lease resumes exact approved job without second database claim',async()=>{
 const lease={status:'EXACT_OWNER_APPROVED_WORK_LEASED',
  reservation_id:reservation,lease_id:randomUUID(),owner_id:randomUUID(),
  conversation_id:randomUUID(),original_work_id:request.original_work_id,
  candidate_hash:request.candidate_hash,issue_number:request.issue_number,
  install_branch:request.install_branch,attempts:1};
 const calls=[];
 const result=await executeApprovedContinuation({
  env,request,checkoutSha:sha,leasedWork:lease,maxChecks:1,
  call:async (_env,name,arg)=>{
   calls.push(name);
   assert.equal(name,'reality_reconcile_approved_repair_continuation_v1');
   assert.equal(arg.p_reservation_id,reservation);
   return {status:'SETTLED',original_work_id:request.original_work_id,
    original_job_completed:true,production_changed:false};
  },
  serviceFactory:({session,env:runtime})=>{
   assert.equal(session.user_id,lease.owner_id);
   assert.equal(session.config.key,runtime.SUPABASE_SERVICE_ROLE_KEY);
   assert.equal(session.config.url,runtime.REALITY_PERSONAL_CHAT_SUPABASE_URL);
   return {continueAfterInstall:async()=>({
    status:'ORIGINAL_JOB_INDEPENDENTLY_SETTLED',
    original_work_id:request.original_work_id,
    independent_readback_verified:true,
    original_job_completed:true,production_changed:false,
    settlement_receipt_ref:'supabase:universe_events:'+randomUUID(),
   })};
  },
 });
 assert.equal(result.status,'ORIGINAL_JOB_INDEPENDENTLY_SETTLED');
 assert.equal(result.original_job_completed,true);
 assert.deepEqual(calls,['reality_reconcile_approved_repair_continuation_v1']);
});

test('governed scheduler dispatch can reach ONLY the existing approved worker contract',()=>{
 const signedDispatch={...env,GITHUB_EVENT_NAME:'workflow_dispatch'};
 assert.equal(verifyApprovedWorkerEnvironment(signedDispatch,request,sha),true);
 for(const invalid of [
  {...signedDispatch,GITHUB_REF:'refs/heads/main'},
  {...signedDispatch,GITHUB_REPOSITORY:'somebody/Reality'},
  {...signedDispatch,REALITY_BACKGROUND_REPAIR_WORKER_ENABLED:'false'},
  {...signedDispatch,SUPABASE_SERVICE_ROLE_KEY:undefined},
  {...signedDispatch,GITHUB_SHA:'f'.repeat(40)},
  {...signedDispatch,GITHUB_EVENT_NAME:'schedule'},
 ]){
  assert.throws(()=>verifyApprovedWorkerEnvironment(invalid,request,sha),
   /REALITY_APPROVED_BACKGROUND_EXACT_ISOLATED_ACTIONS_IDENTITY_AND_SERVICE_CONFIG_REQUIRED/);
 }
 assert.throws(()=>verifyApprovedWorkerEnvironment(signedDispatch,
  {...request,candidate_hash:'not-a-verified-artifact'},sha),
 /REALITY_APPROVED_BACKGROUND_INERT_REQUEST_INVALID/);
});
