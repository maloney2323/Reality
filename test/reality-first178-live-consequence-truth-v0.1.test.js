import test from 'node:test';
import assert from 'node:assert/strict';
import {runOriginal178OneApproval}
 from '../src/reality-first178-live-owner-completion-v0.1.js';

// This is the actual live #178 adapter, not the synthetic constitutional
// driver. A passing frozen GitHub test MUST NOT become an invented registry,
// resumed customer execution, independent observation or settled outcome.
test('frozen CI never attests original-job registration, execution or settlement',async()=>{
 const originalFetch=globalThis.fetch;
 const owner='11111111-1111-4111-8111-111111111111';
 const conversation='22222222-2222-4222-8222-222222222222';
 const queueId='33333333-3333-4333-8333-333333333333';
 const work='work:'+'9'.repeat(32);
 const artifact='a'.repeat(64);
 const candidate={artifact_hash:artifact};
 const state={phase:'AWAITING_OWNER_APPROVAL',head_hash:'b'.repeat(64),
  candidate,promotion_authorization:{consumed_once:true,
   evidence_ref:'db:real-human-approval'}};
 const queue={phase:'AWAITING_OWNER_APPROVAL',queue_id:queueId,
  original_work_id:work,goal_id:'goal:owner-confirmed',report:{}};
 let providerReadbacks=0;
 try{
  globalThis.fetch=async url=>{
   assert.equal(url,'https://api.github.com/repos/maloney2323/Reality');
   return {ok:true,json:async()=>({
    full_name:'maloney2323/Reality',permissions:{push:true}})};
  };
  const result=await runOriginal178OneApproval({
   session:{user_id:owner},ownerAction:null,
   env:{VERCEL_ENV:'preview',
    VERCEL_GIT_COMMIT_REF:'feature/first178-live-single-claim-execution-20261029',
    VERCEL_GIT_COMMIT_SHA:'c'.repeat(40),
    REALITY_FIRST178_GITHUB_INSTALL_TOKEN:'scoped-preview-test-token-with-proper-length'},
   resolve:async()=>({issue_number:178,conversation_id:conversation,
    original_work_id:work,goal_id:queue.goal_id,queue_id:queueId}),
   scopeReader:async()=>({owner_id:owner,original_work_id:work,
    goal_id:queue.goal_id,continuity_root_id:'root',worldline_id:'world'}),
   dbReader:()=>({}),
   call:async(_db,name)=>{
    assert.equal(name,'reality_read_governed_build_v1');
    return queue;
   },
   checkpointFactory:()=>({readLatestCheckpoint:async()=>({
    verified:true,original_work_id:work,continuity_receipt_id:conversation,
    state})}),
   githubFactory:()=>({
    writeAndReadback:async()=>({artifact_hash:artifact,
     original_work_id:work,production_changed:false,
     installed_commit_sha:'d'.repeat(40)}),
    observeFrozenAcceptance:async()=>{
     providerReadbacks++;
     return {verified:true,status:'FROZEN_ACCEPTANCE_VERIFIED',
      provider_run_id:9876,provider_frozen_job_id:1234,
      installed_commit_sha:'d'.repeat(40)};
    },
   }),
   completion:async({adapters})=>{
    const forged={kind:'ORIGINAL_JOB_SETTLED',owner_id:owner,
     goal_id:queue.goal_id,original_work_id:work,artifact_hash:artifact,
     evidence_ref:'github:actions:run:9876:ORIGINAL_JOB_SETTLED',
     evidence_hash:'constructed-from-frozen-ci'};
    const check=await adapters.verifyIndependentReceipt({
     receipt:forged,scope_hash:'source-linked-scope',candidate_hash:artifact});
    assert.equal(check.verified,false);
    await assert.rejects(adapters.registerAndReobserve(),
     /FIRST178_LIVE_OWNER_COMPLETION_PROMOTION_CHECKPOINT_NOT_DURABLY_READ_BACK/);
    await assert.rejects(adapters.resumeOriginalWork(),
     /FIRST178_LIVE_OWNER_COMPLETION_ACTUAL_REGISTRATION_RECEIPT_REQUIRED/);
    await assert.rejects(adapters.settleAndReobserve(),
     /FIRST178_LIVE_OWNER_COMPLETION_ACTUAL_REGISTRATION_RECEIPT_REQUIRED/);
    return {status:'INDEPENDENT_CONSEQUENCES_NOT_YET_PROVEN',
     original_job_completed:false};
   },
  });
  assert.equal(result.original_job_completed,false);
  assert.equal(providerReadbacks,1);
 }finally{globalThis.fetch=originalFetch;}
});
