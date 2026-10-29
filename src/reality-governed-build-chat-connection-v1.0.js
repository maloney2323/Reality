// The owner-authenticated bridge between Reality Chat/Continuity and the
// foundational autonomous code-generation worker. Queuing is not execution,
// approval, model generation, sandbox verification, installation or settlement.
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {privateChatConfig} from './reality-private-chat-auth-v0.1.js';
import {inspectAuthenticatedSelfImprovement}
 from './reality-personal-governed-self-improvement-v0.1.js';
import {readFreshPersonalGoalState}
 from './reality-personal-goal-readback-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from './reality-reliability-db-boundary-v0.1.js';
import {dispatchGovernedBuildToIsolatedWorker}
 from './reality-governed-build-github-dispatch-v1.0.js';
import {observeGovernedBuildWorker}
 from './reality-governed-build-worker-readback-v1.0.js';
export const GOVERNED_BUILD_CHAT_CONNECTION_VERSION=
 'reality-governed-build-chat-connection-v1.0';
const fail=(code,status=409)=>{throw Object.assign(Error(code),{status})};
const commit=x=>/^[a-f0-9]{40}$/.test(String(x||''));
function trust(session,env){
 if(!validUuid(session?.user_id)||env.VERCEL_ENV!=='preview'||
  env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true')
  fail('GOVERNED_BUILD_AUTHENTICATED_PREVIEW_ONLY',403);
 const cfg=privateChatConfig(env);
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||db.url!==cfg.url||
   db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('GOVERNED_BUILD_OWNER_DB_BOUNDARY_CHANGED',403);
 if(!commit(env.VERCEL_GIT_COMMIT_SHA))
  fail('GOVERNED_BUILD_VERIFIED_PREVIEW_RELEASE_REQUIRED',503);
 return db;
}
async function rpc(db,name,input,fetchImpl=fetch){
 const response=await fetchImpl(db.url+'/rest/v1/rpc/'+name,{
  method:'POST',
  headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
   accept:'application/json','content-type':'application/json'},
  body:JSON.stringify(input),
 });
 const result=await response.json().catch(()=>null);
 if(!response.ok)fail('GOVERNED_BUILD_ATOMIC_QUEUE_UNAVAILABLE',503);
 return result;
}
export async function queueOwnerGovernedBuild({
 session,env=process.env,
 inspect=inspectAuthenticatedSelfImprovement,readGoal=readFreshPersonalGoalState,
 call=rpc,dispatch=dispatchGovernedBuildToIsolatedWorker,
}={}){
 const db=trust(session,env);
 const next=await inspect({session,env});
 if(next?.status!=='ORIGINAL_JOB_IDENTIFIED_AWAITING_INDEPENDENT_GAP_OBSERVATION'||
  !validUuid(next.original_conversation_id)||
  !/^work:[a-f0-9]{32}$/.test(String(next.original_work_id||''))||
  !next.original_job_tracking_receipt_ref)
  fail('GOVERNED_BUILD_VERIFIED_UNFINISHED_WORK_REQUIRED');
 const goal=await readGoal({session,conversationId:next.original_conversation_id,env});
 if(goal?.principal_id!==session.user_id||
  goal?.state?.active_goal_id!==next.goal_id||
  goal?.state?.active_goal?.goal_id!==next.goal_id||
  goal?.state?.active_goal?.user_confirmed!==true||
  goal?.state?.active_goal?.last_transition_receipt_id!==next.goal_transition_receipt_ref||
  !goal?.state?.active_goal?.source_user_message_ref||
  goal?.state?.active_goal?.status!=='ACTIVE')
  fail('GOVERNED_BUILD_FRESH_CONFIRMED_GOAL_REQUIRED');
 if(goal.scope?.root==null||goal.scope?.worldline==null)
  fail('GOVERNED_BUILD_CONTINUITY_SCOPE_REQUIRED');
 const result=await call(db,'reality_enqueue_governed_build_v1',{
  p_owner_id:session.user_id,
  p_conversation_id:next.original_conversation_id,
  p_goal_id:next.goal_id,
  p_goal_transition_event_id:next.goal_transition_receipt_ref,
  p_original_work_id:next.original_work_id,
  p_original_work_evidence_ref:next.original_job_tracking_receipt_ref,
  p_goal_evidence_ref:goal.state.active_goal.source_user_message_ref,
  p_continuity_root_id:goal.scope.root,p_worldline_id:goal.scope.worldline,
  p_preview_release_sha:env.VERCEL_GIT_COMMIT_SHA,
 });
 if(!validUuid(result?.queue_id)||result?.original_work_id!==next.original_work_id||
  result?.goal_id!==next.goal_id||result?.job_completed!==false||
  result?.installation_authorized!==false)
  fail('GOVERNED_BUILD_QUEUE_READBACK_NOT_CONFIRMED',503);
 // The authenticated owner action permits only a scoped request commit on
 // the isolated worker branch; it does NOT permit model code installation.
 // Failed dispatch preserves the queue so the owner sees an exact blocker.
 let worker=null;
 try{
  worker=await dispatch({
   queue_id:result.queue_id,original_work_id:next.original_work_id,
   issue_url:next.issue_url,env,
  });
  const pinned=await call(db,'reality_mark_governed_build_dispatched_v1',{
   p_owner_id:session.user_id,p_conversation_id:next.original_conversation_id,
   p_queue_id:result.queue_id,p_commit_sha:worker.worker_sha,
   p_request_path:worker.request_path,
  });
  if(pinned?.queue_id!==result.queue_id||pinned?.dispatched!==true)
   fail('GOVERNED_BUILD_DISPATCH_DURABLE_READBACK_FAILED',503);
 }catch(error){
  const safe=String(error?.message||'');
  return Object.freeze({
   ...result,phase:'QUEUED_DISPATCH_BLOCKED',
   dispatch_error:/^GOVERNED_BUILD_[A-Z0-9_]+$/.test(safe)?safe:
    'GOVERNED_BUILD_WORKER_DISPATCH_UNAVAILABLE',
   owner_approved_investigation_only:true,
   model_generated:false,sandbox_executed:false,
   continuous_worker_connected:false,
   external_execution_authorized:false,capability_installed:false,
  });
 }
 return Object.freeze({
  ...result,phase:'DISPATCHED_TO_ISOLATED_WORKER',
  worker_dispatch_started:true,worker_commit_sha:worker.worker_sha,
  worker_workflow_url:worker.workflow_runs_url,
  owner_approved_investigation_only:true,
  model_generated:false,sandbox_executed:false,
  continuous_worker_connected:true,
  external_execution_authorized:false,capability_installed:false,
 });
}
export async function readOwnerGovernedBuild({
 session,env=process.env,inspect=inspectAuthenticatedSelfImprovement,call=rpc,
 observeWorker=observeGovernedBuildWorker,
}={}){
 const db=trust(session,env);
 const discovered=await inspect({session,env});
 if(!validUuid(discovered?.original_conversation_id))
  return Object.freeze({phase:'NO_VERIFIED_ELIGIBLE_WORK',queued:false,
   completed:false,model_generated:false,sandbox_executed:false,
   capability_installed:false,installation_authorized:false,
   external_execution_authorized:false,
   production_changed:false});
 const eligible=discovered.status===
  'ORIGINAL_JOB_IDENTIFIED_AWAITING_INDEPENDENT_GAP_OBSERVATION'&&
  /^work:[a-f0-9]{32}$/.test(String(discovered.original_work_id||''))&&
  typeof discovered.original_job_tracking_receipt_ref==='string'&&
  discovered.original_job_tracking_receipt_ref.length>0;
 if(!eligible)fail('GOVERNED_BUILD_FRESH_ELIGIBILITY_REQUIRED');
 const result=await call(db,'reality_read_governed_build_v1',{
  p_owner_id:session.user_id,p_conversation_id:discovered.original_conversation_id});
 if(!result?.queue_id)
  return Object.freeze({phase:'NOT_QUEUED',queued:false,
   original_work_id:discovered.original_work_id,
   goal_id:discovered.goal_id,
   original_conversation_id:discovered.original_conversation_id,
   eligible_for_investigation:true,
   completed:false,model_generated:false,sandbox_executed:false,
   capability_installed:false,installation_authorized:false,
   external_execution_authorized:false,
   production_changed:false});
 if(!validUuid(result.queue_id)||result.original_work_id!==discovered.original_work_id)
  fail('GOVERNED_BUILD_READBACK_OWNER_SCOPE_MISMATCH');
 // A run observed at the exact dispatch SHA is evidence that the isolated
 // discovery worker ran. It is NOT a missing-capability attestation.
 const workerObservation=result.dispatch_commit_sha&&result.request_path?
  await observeWorker({queue:result,env}):null;
 return Object.freeze({...result,queued:true,worker_observation:workerObservation,
  // A durable queue or worker commit is not a generated, tested or installed
  // upgrade. Future stages need independent receipts, not status guesses.
  completed:false,model_generated:false,sandbox_executed:false,
  installation_authorized:false,job_completed:false,
  external_execution_authorized:false,
  capability_installed:false,production_changed:false});
}