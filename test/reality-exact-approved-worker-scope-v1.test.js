import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createExactApprovedWorkerScope}
 from '../src/reality-exact-approved-worker-scope-v1.js';
const lease={reservation_id:randomUUID(),lease_id:randomUUID(),
 owner_id:randomUUID(),conversation_id:randomUUID(),
 original_work_id:'work:'+'a'.repeat(32),candidate_hash:'b'.repeat(64),
 issue_number:178,install_branch:'feature/reality-closed-loop-worker-20261031'};
const request={reservation_id:lease.reservation_id,
 original_work_id:lease.original_work_id,candidate_hash:lease.candidate_hash,
 issue_number:178,install_branch:lease.install_branch};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_SUPABASE_URL:'https://hvkfreoagbrphwghjajw.supabase.co',
 SUPABASE_SERVICE_ROLE_KEY:'unit-test-service-token-never-a-real-secret',
 VERCEL_GIT_COMMIT_REF:lease.install_branch};
const scope={status:'CURRENT_OWNER_GOAL_AND_WORK_VERIFIED',
 ...lease,original_work_event_id:randomUUID(),
 goal_transition_event_id:randomUUID(),goal_id:'user-goal:'+'e'.repeat(32),
 review_commit_sha:'c'.repeat(40),frozen_test_sha256:'d'.repeat(64),
 original_failed_run_id:1234,production_changed:false,
 installation_performed:false,settlement_recorded:false};
const proof={independently_verified:true,issue_number:178,
 candidate_artifact_sha256:lease.candidate_hash,
 original_failed_run_id:scope.original_failed_run_id,
 original_source_sha:'f'.repeat(40),
 frozen_test_sha256:scope.frozen_test_sha256,
 original_job_completed:false,installation_authorized:false};
const setup=(scopeValue=scope,proofValue=proof)=>{
 let calls=0;
 return {calls:()=>calls,work:createExactApprovedWorkerScope({
  env,request,lease,
  fetchImpl:async(url,options)=>{
   calls++;
   assert.match(url,/reality_read_exact_approved_worker_scope_v1$/);
   assert.equal(options.method,'POST');
   assert.equal(options.headers.authorization,'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY);
   assert.deepEqual(JSON.parse(options.body),{
    p_reservation_id:lease.reservation_id,p_lease_id:lease.lease_id,
    p_install_branch:lease.install_branch});
   return {ok:true,json:async()=>typeof scopeValue==='function'?
    scopeValue():scopeValue};
  },
  readCandidate:async args=>{
   assert.equal(args.issueNumber,178);
   assert.equal(args.sourceCommitSha,scope.review_commit_sha);
   return proofValue;
  },
 })};
};
test('fresh original owner, signed lease and goal epoch rechecked on each continuation',async()=>{
 const t=setup();const adapters=await t.work;
 const pending=await adapters.listWork();
 assert.equal(pending.jobs.length,1);
 assert.equal(pending.jobs[0].original_work_id,lease.original_work_id);
 assert.equal(pending.jobs[0].source_receipt_id,scope.original_work_event_id);
 assert.equal(pending.jobs[0].frozen_test_sha256,scope.frozen_test_sha256);
 const goal=await adapters.readGoal({conversationId:lease.conversation_id});
 assert.equal(goal.state.active_goal_id,scope.goal_id);
 assert.equal(goal.state.active_goal.last_transition_receipt_id,
  scope.goal_transition_event_id);
 assert.equal((await adapters.readCandidate({issueNumber:178})).candidate_artifact_sha256,
  lease.candidate_hash);
 assert.equal(t.calls(),4,'no once-for-all static goal snapshot');
});
test('changed goal epoch rejects resumed job instead of trusting cached scope',async()=>{
 const t=setup();const adapters=await t.work;
 const goal=await adapters.readGoal({conversationId:lease.conversation_id});
 assert.equal(goal.state.active_goal.goal_id,scope.goal_id);
 await assert.rejects(adapters.readGoal({conversationId:randomUUID()}),
  /ORIGINAL_CONVERSATION_CHANGED/);
});
test('unmatched independent source, wrong candidate or wrong signed lease fail closed',async()=>{
 await assert.rejects(setup(scope,{...proof,candidate_artifact_sha256:'0'.repeat(64)}).work,
  /INDEPENDENT_CANDIDATE_OR_ORIGINAL_MISMATCH/);
 let reads=0;
 await assert.rejects(setup(()=>++reads===1?scope:
    {...scope,goal_transition_event_id:randomUUID()}).work
  .then(async a=>a.listWork()),
  /GOAL_OR_ORIGINAL_WORK_RECONCILIATION_CHANGED/);
 await assert.rejects(createExactApprovedWorkerScope({
  env,request,lease:{...lease,original_work_id:'work:'+'0'.repeat(32)},
  fetchImpl:async()=>{throw Error('MUST_NOT_READ');},
 }),/EXACT_SIGNED_LEASE_REQUIRED/);
});
test('missing DB verified authority cannot be replaced by user input or local projection',async()=>{
 await assert.rejects(setup({...scope,status:'NOT_VERIFIED'}).work,
  /FRESH_OWNER_GOAL_SCOPE_MISMATCH/);
 await assert.rejects(setup({...scope,owner_id:randomUUID()}).work,
  /FRESH_OWNER_GOAL_SCOPE_MISMATCH/);
});
