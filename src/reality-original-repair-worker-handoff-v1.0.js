// Source-bound handoff for a newly verified ORIGINAL repair job.
// Never rediscover a different unfinished job or mint an owner approval.
// The private Continuity source and current goal are independently re-read
// before using the existing durable queue and isolated worker dispatch.
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {privateChatConfig} from './reality-private-chat-auth-v0.1.js';
import {listAuthenticatedUnfinishedWork}
 from './reality-personal-unfinished-work-v0.1.js';
import {readFreshPersonalGoalState}
 from './reality-personal-goal-readback-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from './reality-reliability-db-boundary-v0.1.js';
import {dispatchGovernedBuildToIsolatedWorker}
 from './reality-governed-build-github-dispatch-v1.0.js';

const WORK=/^work:[a-f0-9]{32}$/;
const SHA=/^[a-f0-9]{40}$/;
const fail=code=>{throw Error('REAL_ORIGINAL_BUILD_'+code)};
async function invoke(db,name,payload,fetchImpl=fetch){
 const result=await fetchImpl(db.url+'/rest/v1/rpc/'+name,{
  method:'POST',redirect:'error',cache:'no-store',headers:{
   apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
   'content-type':'application/json',accept:'application/json'},
  body:JSON.stringify(payload),
 });
 if(!result.ok)fail('DATABASE_RPC_'+name.toUpperCase()+'_'+result.status);
 const read=await result.json().catch(()=>null);
 if(!read||typeof read!=='object')fail('DATABASE_RECEIPT_REQUIRED');
 return read;
}
// At admission, before writing a new original-work Continuity event,
// honor an already unfinished issue-bound original from ANY conversation.
export async function assertOwnerOriginalIssueIdentity({
 session,issueNumber,expectedOriginalWorkId,env=process.env,
 call=invoke,
}={}){
 if(env.VERCEL_ENV!=='preview'||
    env.REALITY_GOVERNED_AUTO_TRIGGER_ENABLED!=='true'||
    !validUuid(session?.user_id)||!WORK.test(String(expectedOriginalWorkId||''))||
    !Number.isSafeInteger(issueNumber)||issueNumber<1||issueNumber>100000)
  fail('OWNER_ORIGINAL_IDENTITY_PREVIEW_SCOPE_REQUIRED');
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||db.url!==session.config?.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('OWNER_ORIGINAL_IDENTITY_DATABASE_REQUIRED');
 const result=await call(db,'reality_read_owner_existing_original_issue_v1',{
  p_owner_id:session.user_id,p_issue_number:issueNumber,
 });
 if(result?.status==='EXISTING_UNFINISHED_ORIGINAL'){
  if(result.original_work_id!==expectedOriginalWorkId||
     result.installation_authorized!==false||result.job_completed!==false)
   fail('PRIOR_ORIGINAL_ISSUE_WORK_ID_MUST_BE_RECONCILED');
 }else if(result?.status!=='NO_PRIOR_ORIGINAL'||
    result.installation_authorized!==false||result.job_completed!==false)
  fail('OWNER_ORIGINAL_ISSUE_IDENTITY_READBACK_INVALID');
 return Object.freeze({status:'OWNER_ORIGINAL_IDENTITY_VERIFIED',
  original_work_id:expectedOriginalWorkId,
  installation_authorized:false,original_job_completed:false});
}

export async function queueVerifiedOriginalRepair({
 session,work,env=process.env,
 listWork=listAuthenticatedUnfinishedWork,readGoal=readFreshPersonalGoalState,
 call=invoke,dispatch=dispatchGovernedBuildToIsolatedWorker,
}={}){
 if(env.VERCEL_ENV!=='preview'||
    env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
    env.REALITY_GOVERNED_AUTO_TRIGGER_ENABLED!=='true'||
    !validUuid(session?.user_id)||!session.config?.url||
    !validUuid(work?.original_conversation_id)||
    !validUuid(work?.source_receipt_id)||
    !WORK.test(String(work?.original_work_id||''))||
    !SHA.test(String(work?.original_source_sha||''))||
    !Number.isSafeInteger(work?.original_provider_failed_run_id)||
    work.original_provider_failed_run_id<1||
    !/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/[1-9][0-9]*$/.test(String(work?.issue_url||''))||
    !SHA.test(String(env.VERCEL_GIT_COMMIT_SHA||'')))
  fail('EXACT_OWNER_SOURCE_BACKED_PREVIEW_WORK_REQUIRED');
 const expected=privateChatConfig(env);
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||db.url!==session.config.url||
    db.url!==expected.url||db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('TRUSTED_OWNER_DATABASE_REQUIRED');
 const pending=await listWork({session,env});
 if(pending?.status!=='SCOPED_READ_ONLY'||pending.coverage_limited===true||
    pending.result_truncated===true)
  fail('OWNER_CONTINUITY_COVERAGE_INCOMPLETE');
 const jobs=(pending.jobs||[]).filter(item=>
  item.original_work_id===work.original_work_id&&
  item.conversation_id===work.original_conversation_id&&
  item.source_receipt_id===work.source_receipt_id&&
  item.original_provider_failed_run_id===work.original_provider_failed_run_id&&
  item.original_source_sha===work.original_source_sha&&
  item.issue_url===work.issue_url&&
  item.state==='REAL_SOURCE_BACKED_REPAIR_PENDING'&&
  item.action_completed===true&&item.goal_still_current===true&&
  item.job_completed===false);
 if(jobs.length!==1)fail('INDEPENDENT_ORIGINAL_WORK_READBACK_CHANGED');
 const goal=await readGoal({session,conversationId:work.original_conversation_id,env});
 const active=goal?.state?.active_goal;
 if(goal.principal_id!==session.user_id||
    goal.conversation_id!==work.original_conversation_id||
    active?.status!=='ACTIVE'||active.user_confirmed!==true||
    goal.state.active_goal_id!==work.goal_id||
    active.goal_id!==work.goal_id||
    !validUuid(active.last_transition_receipt_id)||
    !active.source_user_message_ref||
    !validUuid(goal.scope?.root)||!validUuid(goal.scope?.worldline))
  fail('FRESH_OWNER_GOAL_AND_SCOPE_REQUIRED');
 // Reconcile a previously admitted original job before creating another queue.
 // A new evidence classification is not a replacement for its prior work ID.
 await assertOwnerOriginalIssueIdentity({session,
  issueNumber:Number(work.issue_url.split('/').at(-1)),
  expectedOriginalWorkId:work.original_work_id,env,call});
 const prior=await call(db,'reality_read_governed_build_v1',{
  p_owner_id:session.user_id,p_conversation_id:work.original_conversation_id,
 });
 if(prior?.queue_id&&prior.original_work_id!==work.original_work_id&&
    !['SETTLED','CANCELLED'].includes(prior.phase))
  fail('EXISTING_UNFINISHED_WORK_IDENTITY_RECONCILIATION_REQUIRED');
 const queued=await call(db,'reality_enqueue_governed_build_v1',{
  p_owner_id:session.user_id,
  p_conversation_id:work.original_conversation_id,
  p_goal_id:work.goal_id,
  p_goal_transition_event_id:active.last_transition_receipt_id,
  p_original_work_id:work.original_work_id,
  p_original_work_evidence_ref:'universe:'+work.source_receipt_id,
  p_goal_evidence_ref:active.source_user_message_ref,
  p_continuity_root_id:goal.scope.root,
  p_worldline_id:goal.scope.worldline,
  p_preview_release_sha:env.VERCEL_GIT_COMMIT_SHA,
 });
 if(!validUuid(queued?.queue_id)||
    queued.original_work_id!==work.original_work_id||
    queued.goal_id!==work.goal_id||
    queued.installation_authorized!==false||
    queued.job_completed!==false)
  fail('EXACT_QUEUE_READBACK_REQUIRED');
 // An old claim, escalation or previously dispatched work is never
 // restarted through this entrypoint. The original queue remains readable.
 if(queued.phase!=='QUEUED_DISCOVERY')
  return Object.freeze({
   status:'EXISTING_ORIGINAL_QUEUE_PRESERVED',phase:queued.phase,
   queue_id:queued.queue_id,original_work_id:work.original_work_id,
   worker_dispatch_started:false,installation_authorized:false,
   original_job_completed:false,production_changed:false,
  });
 let sent;
 try{
  sent=await dispatch({
   queue_id:queued.queue_id,original_work_id:work.original_work_id,
   issue_url:work.issue_url,env,
  });
 }catch(error){
  const msg=String(error?.message||'');
  return Object.freeze({
   status:'ORIGINAL_QUEUE_DISPATCH_RECONCILIATION_REQUIRED',
   dispatch_error:/^GOVERNED_BUILD_[A-Z0-9_]+$/.test(msg)?msg:
    'REAL_ORIGINAL_BUILD_PROVIDER_UNKNOWN',
   queue_id:queued.queue_id,original_work_id:work.original_work_id,
   worker_dispatch_started:false,installation_authorized:false,
   original_job_completed:false,production_changed:false,
  });
 }
 const persisted=await call(db,'reality_mark_governed_build_dispatched_v1',{
  p_owner_id:session.user_id,
  p_conversation_id:work.original_conversation_id,
  p_queue_id:queued.queue_id,p_commit_sha:sent.worker_sha,
  p_request_path:sent.request_path,
 });
 if(persisted?.queue_id!==queued.queue_id||
    persisted.dispatched!==true)
  fail('DISPATCH_COMMIT_READBACK_MISSING');
 return Object.freeze({
  status:'ORIGINAL_JOB_DISPATCHED_TO_ISOLATED_WORKER',
  queue_id:queued.queue_id,original_work_id:work.original_work_id,
  worker_commit_sha:sent.worker_sha,worker_dispatch_started:true,
  installation_authorized:false,original_job_completed:false,
  production_changed:false,
 });
}
