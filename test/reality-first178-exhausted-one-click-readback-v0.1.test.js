import test from 'node:test';
import assert from 'node:assert/strict';
import {original178OwnerApprovalView}
 from '../src/reality-first178-live-owner-completion-v0.1.js';
const owner='11111111-1111-4111-8111-111111111111';
const cid='22222222-2222-4222-8222-222222222222';
const queueId='33333333-3333-4333-8333-333333333333';
const work='work:9b9578b3c65427589c4c6da68fe0fc87';
const goal='original:first178';
const receipt='e12b7582-d148-5b64-98ff-bc18f8990054';
const hash='e224238d7460ee04851b4884d965025e25ce4ec0bb75cf9cc77da5d865daf9d5';
test('original #178 exhausted one-click job proves immutable repairable journal without reopening original claim',async()=>{
 let restored=0;let writings=0;
 const scope={owner_id:owner,original_work_id:work,goal_id:goal};
 const queue={queue_id:queueId,phase:'ESCALATED',
  original_work_id:work,goal_id:goal,
  report:{state:'ESCALATED',checkpoint_receipt_id:receipt,
   checkpoint_hash:hash,original_work_id:work,
   installation_authorized:false,job_completed:false}};
 const view=await original178OwnerApprovalView({
  session:{user_id:owner},env:{VERCEL_ENV:'preview',
   VERCEL_GIT_COMMIT_REF:'feature/first178-live-single-claim-execution-20261029'},
  resolve:async()=>({issue_number:178,conversation_id:cid,
   original_work_id:work,goal_id:goal,queue_id:queueId}),
  scopeReader:async()=>scope,
  dbReader:()=>({}),
  call:async(_db,func)=>{assert.equal(func,'reality_read_governed_build_v1');writings++;return queue},
  checkpointFactory:()=>({readLatestCheckpoint:async()=>{
   restored++;
   return {verified:true,original_work_id:work,checkpoint_hash:hash,
    continuity_receipt_id:receipt,
    state:{phase:'ESCALATED',attempt_count:3,attempt_limit:3,
     independent_failure:{classification:{retry_source_without_dependency:true}}}};
  }}),
 });
 assert.equal(restored,1);
 assert.equal(writings,1);
 assert.equal(view.status,'GOVERNED_RECOVERY_READY');
 assert.equal(view.additional_attempts,2);
 assert.equal(view.attempts_used,3);
 assert.equal(view.checkpoint_receipt_id,receipt);
 assert.equal(view.original_job_completed,false);
 assert.equal(view.installation_authorized,false);
 assert.equal(view.original_claim_preserved,true);
 assert.equal(view.autonomous_recovery_eligible,true);
});
test('unverified exhausted database report fails closed rather than offering another run',async()=>{
 const scope={owner_id:owner,original_work_id:work,goal_id:goal};
 await assert.rejects(original178OwnerApprovalView({
  session:{user_id:owner},env:{VERCEL_ENV:'preview',
   VERCEL_GIT_COMMIT_REF:'feature/first178-live-single-claim-execution-20261029'},
  resolve:async()=>({issue_number:178,conversation_id:cid,
   original_work_id:work,goal_id:goal,queue_id:queueId}),
  scopeReader:async()=>scope,dbReader:()=>({}),
  call:async()=>({queue_id:queueId,original_work_id:work,goal_id:goal,
   phase:'ESCALATED',report:{state:'ESCALATED',
   checkpoint_receipt_id:receipt,checkpoint_hash:'f'.repeat(64),
   original_work_id:work,installation_authorized:true,job_completed:false}}),
 }),/FIRST178_LIVE_OWNER_COMPLETION_ESCALATED_QUEUE_DURABLE_RECEIPT_UNVERIFIED/);
});


test('real fifth-attempt failure offers one source-linked second recovery, no installation',async()=>{
 const digest='f'.repeat(64),lastReceipt='88888888-8888-4888-8888-888888888888';
 const d=await original178OwnerApprovalView({
  session:{user_id:owner},env:{VERCEL_ENV:'preview',
   VERCEL_GIT_COMMIT_REF:'feature/first178-live-single-claim-execution-20261029'},
  resolve:async()=>({issue_number:178,conversation_id:cid,
   original_work_id:work,goal_id:goal,queue_id:queueId}),
  scopeReader:async()=>({owner_id:owner,goal_id:goal,original_work_id:work}),
  dbReader:()=>({}),
  call:async()=>({queue_id:queueId,original_work_id:work,goal_id:goal,
   phase:'ESCALATED',report:{state:'ESCALATED',
    checkpoint_receipt_id:lastReceipt,checkpoint_hash:digest,
    original_work_id:work,installation_authorized:false,job_completed:false}}),
  checkpointFactory:()=>({readLatestCheckpoint:async()=>({
   verified:true,original_work_id:work,checkpoint_hash:digest,
   continuity_receipt_id:lastReceipt,state:{phase:'ESCALATED',
    attempt_count:5,attempt_limit:5,
    recovery_authorization:{verified:true},
    independent_failure:{classification:{retry_source_without_dependency:true}}}
  })}),
 });
 assert.equal(d.status,'GOVERNED_RECOVERY_READY');
 assert.equal(d.attempts_used,5);
 assert.equal(d.attempt_limit,7);
 assert.equal(d.additional_attempts,2);
 assert.equal(d.installation_authorized,false);
});


test('seven preserved failures trigger one final bounded draft repair on same job',async()=>{
 const digest='b'.repeat(64),lastReceipt='372ed47b-13b0-567d-b2b8-fbc691208e18';
 const d=await original178OwnerApprovalView({
  session:{user_id:owner},env:{VERCEL_ENV:'preview',
   VERCEL_GIT_COMMIT_REF:'feature/first178-live-single-claim-execution-20261029'},
  resolve:async()=>({issue_number:178,conversation_id:cid,
   original_work_id:work,goal_id:goal,queue_id:queueId}),
  scopeReader:async()=>({owner_id:owner,goal_id:goal,original_work_id:work}),
  dbReader:()=>({}),
  call:async()=>({queue_id:queueId,original_work_id:work,goal_id:goal,
   phase:'ESCALATED',report:{state:'ESCALATED',
    checkpoint_receipt_id:lastReceipt,checkpoint_hash:digest,
    original_work_id:work,installation_authorized:false,job_completed:false}}),
  checkpointFactory:()=>({readLatestCheckpoint:async()=>({
   verified:true,original_work_id:work,checkpoint_hash:digest,
   continuity_receipt_id:lastReceipt,state:{phase:'ESCALATED',
    attempt_count:7,attempt_limit:7,
    recovery_authorization:{verified:true},
    recovery_continuation_authorization:{verified:true},
    independent_failure:{classification:{retry_source_without_dependency:true}}}
  })}),
 });
 assert.equal(d.status,'GOVERNED_RECOVERY_READY');
 assert.equal(d.attempt_limit,8);
 assert.equal(d.attempts_used,7);
 assert.equal(d.additional_attempts,1);
 assert.equal(d.autonomous_recovery_eligible,true);
 assert.equal(d.original_claim_preserved,true);
 assert.equal(d.installation_authorized,false);
 assert.equal(d.original_job_completed,false);
});
