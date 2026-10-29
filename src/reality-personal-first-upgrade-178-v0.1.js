// Reality's first real missing-capability customer job #178.
// A dedicated, owner-authenticated entry point. The client supplies only its
// current conversation ID and a fixed intent, never a work/goal/provider claim.
// This creates/reads the ORIGINAL work under the live owner goal. The trusted
// independent provider must verify the pinned RED run before any queue action.
// Does NOT generate, install, authorize promotion or settle anything.
import {createHash} from 'node:crypto';
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {readFreshPersonalGoalState} from './reality-personal-goal-readback-v0.1.js';
import {resolveReliabilityBenchmarkDb} from './reality-reliability-db-boundary-v0.1.js';
import {privateChatConfig} from './reality-private-chat-auth-v0.1.js';
import {createContinuitySpine} from './reality-continuity-spine-v2.0.js';
import {observeFirstGapFromGithub,FIRST_GAP_PROOF}
 from './reality-first-gap-handoff-v0.1.js';
import {dispatchGovernedBuildToIsolatedWorker}
 from './reality-governed-build-github-dispatch-v1.0.js';

const fail=(s,status=409)=>{throw Object.assign(Error('FIRST_PROOF_'+s),{status})};
const uuid=x=>validUuid(x);
const sha=x=>createHash('sha256').update(x).digest('hex');
function scopeFor(session,goal,conversationId,env){
 if(env.VERCEL_ENV!=='preview'||!uuid(session?.user_id)||
    !uuid(conversationId)||goal?.principal_id!==session.user_id||
    goal.conversation_id!==conversationId||
    goal.persisted_source!=='ISOLATED_CONTINUITY_VERIFIED_READBACK'||
    goal.state?.active_goal_id!==goal.state?.active_goal?.goal_id||
    goal.state?.active_goal?.status!=='ACTIVE'||
    goal.state?.active_goal?.user_confirmed!==true||
    !uuid(goal.state?.active_goal?.last_transition_receipt_id)||
    !goal.state?.active_goal?.source_user_message_ref)
   fail('OWNER_CONFIRMED_GOAL_REQUIRED');
 const spine=createContinuitySpine({
  continuityRootId:goal.scope.root,worldlineId:goal.scope.worldline,
  subjectId:session.user_id,
 });
 if(spine.continuity_root_id!==goal.state.continuity_root_id||
    goal.scope.world!==goal.state.world_id)
   fail('CANONICAL_CONTINUITY_SCOPE_MISMATCH');
 const id='work:'+sha(JSON.stringify(['first-real-self-upgrade-customer-178-v1',
  session.user_id,conversationId,goal.state.active_goal_id,
  goal.state.active_goal.last_transition_receipt_id])).slice(0,32);
 return Object.freeze({
  owner_id:session.user_id,goal_id:goal.state.active_goal_id,
  original_work_id:id,original_issue_number:178,
  continuity_root_id:spine.continuity_root_id,
  worldline_id:spine.worldline_id,
  goal_transition_receipt_ref:goal.state.active_goal.last_transition_receipt_id,
  goal_evidence_ref:goal.state.active_goal.source_user_message_ref,
  user_confirmed:true,owner_session_verified:true,
  goal_current_verified:true,environment:'ISOLATED_PREVIEW',
 });
}
function dbFor(session,env){
 const cfg=privateChatConfig(env);
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db?.secretKey||db.url!==cfg.url||
    db.url!==session.config?.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('ISOLATED_DATABASE_UNVERIFIED',503);
 return db;
}
async function rpc(db,name,input,fetchImpl=fetch){
 const response=await fetchImpl(db.url+'/rest/v1/rpc/'+name,{
  method:'POST',redirect:'error',cache:'no-store',
  headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
   accept:'application/json','content-type':'application/json'},
  body:JSON.stringify(input),
 });
 const data=await response.json().catch(()=>null);
 if(!response.ok)fail('ATOMIC_GOAL_QUEUE_OPERATION_REJECTED',503);
 return data;
}
async function verifiedOwnerScope({session,conversationId,env,readGoal}){
 if(!uuid(session?.user_id)||!uuid(conversationId))
  fail('AUTHENTICATED_CONVERSATION_REQUIRED',401);
 const goal=await readGoal({session,conversationId,env});
 return scopeFor(session,goal,conversationId,env);
}
function publicShape(scope,phase){
 return Object.freeze({status:phase,
  issue_number:178,original_work_id:scope.original_work_id,
  goal_id:scope.goal_id,
  missing_capability_id:'reality.ci-failure-evidence-v1',
  pinned_red_run:'https://github.com/maloney2323/Reality/actions/runs/'+
    FIRST_GAP_PROOF.run_id,
  installation_authorized:false,
  model_generated:false,sandbox_verified:false,job_completed:false,
  production_changed:false});
}
export async function inspectFirstUpgrade178({
 session,conversationId,env=process.env,
 readGoal=readFreshPersonalGoalState,call=rpc,
}={}){
 const db=dbFor(session,env);
 const scope=await verifiedOwnerScope({session,conversationId,env,readGoal});
 const existing=await call(db,'reality_read_governed_build_v1',{
  p_owner_id:session.user_id,p_conversation_id:conversationId,
 });
 if(existing?.queue_id){
  if(existing.original_work_id!==scope.original_work_id||
    existing.goal_id!==scope.goal_id)
   return publicShape(scope,'BLOCKED_BY_DIFFERENT_QUEUED_WORK');
  return Object.freeze({...publicShape(scope,'ALREADY_QUEUED'),
   queue_id:existing.queue_id,
   queue_phase:existing.phase||'NOT_VERIFIED'});
 }
 if(!String(env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN||'').trim())
  return publicShape(scope,'BLOCKED_MISSING_ISOLATED_GITHUB_CREDENTIAL');
 return publicShape(scope,'READY_FOR_EXACT_OWNER_CONFIRMATION');
}
export async function startFirstUpgrade178({
 session,conversationId,env=process.env,
 readGoal=readFreshPersonalGoalState,call=rpc,
 observe=observeFirstGapFromGithub,dispatch=dispatchGovernedBuildToIsolatedWorker,
}={}){
 const db=dbFor(session,env);
 if(!/^[a-f0-9]{40}$/.test(String(env.VERCEL_GIT_COMMIT_SHA||'')))
  fail('PINNED_PREVIEW_RELEASE_REQUIRED',503);
 const token=String(env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN||'');
 if(token.length<25)fail('WORKER_PROVIDER_CREDENTIAL_UNAVAILABLE',503);
 const initial=await verifiedOwnerScope({session,conversationId,env,readGoal});
 const existing=await call(db,'reality_read_governed_build_v1',{
  p_owner_id:session.user_id,p_conversation_id:conversationId,
 });
 if(existing?.queue_id)
  return Object.freeze({...publicShape(initial,
   existing.original_work_id===initial.original_work_id?'ALREADY_QUEUED':
   'BLOCKED_BY_DIFFERENT_QUEUED_WORK'),
   queue_id:existing.queue_id,queue_phase:existing.phase,
   external_execution_authorized:false});
 // Real provider logs are fetched by the trusted server, never the browser.
 const observed=await observe({scope:initial,apiToken:token});
 if(observed?.status!=='INDEPENDENT_CI_MISSING_CAPABILITY_OBSERVED'||
    observed.original_work_id!==initial.original_work_id||
    observed.goal_id!==initial.goal_id||
    observed.owner_id!==initial.owner_id)
   fail('EXACT_PROVIDER_GAP_NOT_PROVEN',503);
 // Catch goal changes during provider I/O before crossing the DB lock.
 const fresh=await verifiedOwnerScope({session,conversationId,env,readGoal});
 if(fresh.original_work_id!==initial.original_work_id||
    fresh.goal_transition_receipt_ref!==initial.goal_transition_receipt_ref)
   fail('GOAL_CHANGED_DURING_PROVIDER_CHECK');
 const result=await call(db,'reality_enqueue_governed_build_v1',{
  p_owner_id:session.user_id,p_conversation_id:conversationId,
  p_goal_id:initial.goal_id,
  p_goal_transition_event_id:initial.goal_transition_receipt_ref,
  p_original_work_id:initial.original_work_id,
  p_original_work_evidence_ref:observed.provider_receipt_ref,
  p_goal_evidence_ref:initial.goal_evidence_ref,
  p_continuity_root_id:initial.continuity_root_id,
  p_worldline_id:initial.worldline_id,
  p_preview_release_sha:env.VERCEL_GIT_COMMIT_SHA,
 });
 if(!uuid(result?.queue_id)||result.original_work_id!==initial.original_work_id||
    result.goal_id!==initial.goal_id||result.job_completed!==false||
    result.installation_authorized!==false)
  fail('DURABLE_QUEUE_RECEIPT_UNVERIFIED',503);
 let dispatched=null;
 try{
  dispatched=await dispatch({queue_id:result.queue_id,
   original_work_id:initial.original_work_id,
   issue_url:'https://github.com/maloney2323/Reality/issues/178',env});
  const pinned=await call(db,'reality_mark_governed_build_dispatched_v1',{
   p_owner_id:session.user_id,p_conversation_id:conversationId,
   p_queue_id:result.queue_id,p_commit_sha:dispatched.worker_sha,
   p_request_path:dispatched.request_path,
  });
  if(pinned?.dispatched!==true||pinned.queue_id!==result.queue_id)
   fail('WORKER_DISPATCH_READBACK_FAILED',503);
 }catch{
  return Object.freeze({...publicShape(initial,'QUEUED_DISPATCH_UNRESOLVED'),
   queue_id:result.queue_id,provider_receipt_ref:observed.provider_receipt_ref,
   do_not_retry:true,external_execution_authorized:false});
 }
 return Object.freeze({...publicShape(initial,'DISCOVERY_WORKER_DISPATCHED'),
  queue_id:result.queue_id,worker_commit_sha:dispatched.worker_sha,
  provider_receipt_ref:observed.provider_receipt_ref,
  external_execution_authorized:false});
}
