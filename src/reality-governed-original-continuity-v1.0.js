// Governed continuity gate between owner-authorized ORIGINAL work,
// durable discovery queue and independent isolated worker readback.
// This is a verifier, not an installer, scheduler or authorization source.
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {observeGovernedBuildWorker}
 from './reality-governed-build-worker-readback-v1.0.js';

export const GOVERNED_ORIGINAL_CONTINUITY_VERSION=
 'reality-governed-original-continuity-v1';
const WORK=/^work:[a-f0-9]{32}$/;
const SHA=/^[a-f0-9]{40}$/;
const PHASES=new Set(['QUEUED_DISCOVERY','CLAIMED_DISCOVERY',
 'BLOCKED_MISSING_EVIDENCE','BLOCKED_OWNER_AUTHORITY','BUILD_TICKET_VERIFIED',
 'AWAITING_SANDBOX','SANDBOX_REJECTED','AWAITING_OWNER_APPROVAL',
 'FAILED','ESCALATED','CANCELLED','SETTLED','SETTLED_ISOLATED']);
const fail=code=>{throw Error('GOVERNED_ORIGINAL_CONTINUITY_'+code)};
const receipt=(decision,work,queue,worker=null)=>Object.freeze({
 version:GOVERNED_ORIGINAL_CONTINUITY_VERSION,
 decision,original_work_id:work.original_work_id,
 queue_id:queue.queue_id,queue_phase:queue.phase,
 worker_observation:worker,
 dispatch_allowed:decision==='SAFE_FIRST_DISPATCH',
 worker_dispatch_started:false,
 investigation_authorized:true,installation_authorized:false,
 original_job_completed:false,production_changed:false,
 new_customer_job_created:false,
});

// Never confuse this historical discovery worker with the independently
// verified install / original-job-resume / final-settlement controller.
export async function verifyGovernedOriginalContinuity({
 session,work,goal,queue,env=process.env,
 observeWorker=observeGovernedBuildWorker,
}={}){
 if(env.VERCEL_ENV!=='preview'||!validUuid(session?.user_id)||
    !validUuid(work?.original_conversation_id)||
    !validUuid(work?.source_receipt_id)||
    !WORK.test(String(work?.original_work_id||''))||
    goal?.principal_id!==session.user_id||
    goal?.conversation_id!==work.original_conversation_id||
    goal?.state?.active_goal_id!==work.goal_id||
    goal?.state?.active_goal?.goal_id!==work.goal_id||
    goal?.state?.active_goal?.status!=='ACTIVE'||
    goal?.state?.active_goal?.user_confirmed!==true||
    !validUuid(goal.state.active_goal.last_transition_receipt_id))
  fail('FRESH_OWNER_ORIGINAL_GOAL_REQUIRED');
 if(!validUuid(queue?.queue_id)||
    queue.original_work_id!==work.original_work_id||
    queue.goal_id!==work.goal_id||
    queue.installation_authorized!==false||
    queue.job_completed!==false||
    !PHASES.has(queue.phase))
  fail('EXACT_DURABLE_QUEUE_READBACK_REQUIRED');
 if(queue.preview_release_sha!=null&&
    !SHA.test(queue.preview_release_sha))
  fail('QUEUE_RELEASE_ATTESTATION_INVALID');
 const commit=queue.dispatch_commit_sha;
 const path=queue.request_path;
 if((commit!=null&&!SHA.test(commit))||
    (path!=null&&path!=='reality-requests/'+queue.queue_id+'.json')||
    (commit==null)!==(path==null))
  return receipt('DISPATCH_RECEIPT_RECONCILIATION_REQUIRED',work,queue);
 if(['CANCELLED','FAILED','ESCALATED','SANDBOX_REJECTED',
      'BLOCKED_OWNER_AUTHORITY','BLOCKED_MISSING_EVIDENCE'].includes(queue.phase))
  return receipt('EXISTING_JOB_BLOCKED_NO_REPLAY',work,queue);
 if(['SETTLED','SETTLED_ISOLATED'].includes(queue.phase))
  return receipt('SETTLEMENT_REQUIRES_INDEPENDENT_FINAL_RECEIPT',work,queue);
 if(commit==null){
  // Only a durable, still-queued, exact original can receive its FIRST
  // idempotent request. An already claimed or progressed job is never reset.
  return receipt(queue.phase==='QUEUED_DISCOVERY'?
   'SAFE_FIRST_DISPATCH':'PREVIOUS_EXECUTION_RECONCILIATION_REQUIRED',work,queue);
 }
 const worker=await observeWorker({queue,env});
 if(!worker||worker.production_changed!==false||
    worker.installation_authorized!==false||
    worker.original_job_settled!==false)
  fail('WORKER_INDEPENDENT_READBACK_INVALID');
 const states={
  DISCOVERY_WORKER_SUCCESS_OBSERVED:'DISCOVERY_EXECUTED_NOT_FINAL_SETTLEMENT',
  DISCOVERY_WORKER_PENDING:'WORKER_RUNNING_MONITOR_SAME_JOB',
  DISCOVERY_WORKER_FAILED:'WORKER_FAILED_RECOVERY_REVIEW_REQUIRED',
  WORKER_RUN_NOT_OBSERVED:'DISPATCH_DELIVERY_UNCONFIRMED_NO_REPLAY',
  WORKER_RUN_AMBIGUOUS:'DISPATCH_DELIVERY_UNCONFIRMED_NO_REPLAY',
  WORKER_PROVIDER_READBACK_UNAVAILABLE:'WORKER_READBACK_UNAVAILABLE_NO_REPLAY',
  WORKER_READ_CREDENTIAL_UNAVAILABLE:'WORKER_READBACK_UNAVAILABLE_NO_REPLAY',
  WORKER_PROVIDER_RESPONSE_INVALID:'WORKER_READBACK_UNAVAILABLE_NO_REPLAY',
  DISPATCH_RECEIPT_NOT_VERIFIED:'DISPATCH_RECEIPT_RECONCILIATION_REQUIRED',
 };
 return receipt(states[worker.state]||
  'WORKER_READBACK_UNAVAILABLE_NO_REPLAY',work,queue,worker);
}
