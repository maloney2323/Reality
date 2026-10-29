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
import {createContinuitySpine,appendContinuityNode,continuityUuidFromSource}
 from './reality-continuity-spine-v2.0.js';
import {createUniversePostgresPersistence}
 from './reality-universe-postgres-persistence-v0.1.js';
import {orderContinuityHistory}
 from './reality-continuous-reliability-v0.1.js';
import {observeFirstGapFromGithub,FIRST_GAP_PROOF}
 from './reality-first-gap-handoff-v0.1.js';


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
export function dbFor(session,env){
 const cfg=privateChatConfig(env);
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db?.secretKey||db.url!==cfg.url||
    db.url!==session.config?.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('ISOLATED_DATABASE_UNVERIFIED',503);
 return db;
}
export async function rpc(db,name,input,fetchImpl=fetch){
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
export async function verifiedOwnerScope({session,conversationId,env,readGoal=readFreshPersonalGoalState}){
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
  const phase=String(existing.phase||'NOT_VERIFIED');
  const r=existing.report||{};
  const stageReceipt=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(
   String(r.checkpoint_receipt_id||''))?r.checkpoint_receipt_id:null;
  const exactHash=/^[a-f0-9]{64}$/.test(String(r.checkpoint_hash||''))?
   r.checkpoint_hash:null;
  const verifiedGate=phase==='AWAITING_OWNER_APPROVAL'&&
   r.state===phase&&stageReceipt&&exactHash&&
   r.installation_authorized===false&&r.job_completed===false;
  return Object.freeze({...publicShape(scope,'ALREADY_QUEUED'),
   queue_id:existing.queue_id,queue_phase:phase,
   checkpoint_receipt_id:stageReceipt,checkpoint_hash:exactHash,
   owner_approval_required:Boolean(verifiedGate),
   model_generated:Boolean(verifiedGate),
   sandbox_verified:Boolean(verifiedGate),
   installation_authorized:false,job_completed:false});
 }
 // The exact public #178 GitHub failure is verified without a write token.
 // Model and sandbox run on the trusted Vercel host under this same goal.
 if(!String(env.REALITY_STANDALONE_OPENAI_API_KEY||'').trim()||
    !String(env.REALITY_SEMANTIC_REVIEW_MODEL||'').trim())
  return publicShape(scope,'BLOCKED_MODEL_PROVIDER_NOT_CONFIGURED');
 if(String(env.REALITY_FIRST178_GITHUB_READ_TOKEN||'').length<20)
  return publicShape(scope,'BLOCKED_GITHUB_READ_ONLY_CREDENTIAL');
 return publicShape(scope,'READY_FOR_EXACT_OWNER_CONFIRMATION');
}
// The queue reservation is not itself an event in the owner's Continuity.
// Append a source-linked observation to the SAME authenticated worldline,
// then independently reconstruct and verify it before dispatch. No model
// source, installation approval or settlement is represented by this event.
export async function persistFirstUpgrade178Work({
 scope,conversationId,providerEvidence,db,
 createPersistence=createUniversePostgresPersistence,
}={}){
 if(!uuid(scope?.owner_id)||!uuid(conversationId)||
    providerEvidence?.status!=='INDEPENDENT_CI_MISSING_CAPABILITY_OBSERVED'||
    providerEvidence.original_work_id!==scope.original_work_id||
    providerEvidence.goal_id!==scope.goal_id||
    providerEvidence.owner_id!==scope.owner_id)
  fail('CONTINUITY_WORK_SOURCE_INVALID');
 const store=createPersistence({...db});
 const read=()=>store.reconstruct({continuityRootId:scope.continuity_root_id,
  worldlineId:scope.worldline_id});
 const id=continuityUuidFromSource('personal-first-customer-upgrade-178:'+
   scope.owner_id+':'+conversationId+':'+scope.original_work_id);
 const history=orderContinuityHistory(await read());
 const matching=history.filter(x=>x.event_id===id);
 const content={
  version:'reality-personal-first-upgrade-178-v0.1',
  original_work_id:scope.original_work_id,original_goal_id:scope.goal_id,
  goal_transition_receipt_ref:scope.goal_transition_receipt_ref,
  issue_number:178,issue_url:'https://github.com/maloney2323/Reality/issues/178',
  pinned_red_run:providerEvidence.run_url,
  gap_provider_receipt_ref:providerEvidence.provider_receipt_ref,
  gap_evidence_hash:providerEvidence.evidence_hash,
  status:'INVESTIGATION_APPROVED_GAP_WORK_NOT_COMPLETED',
  installation_authorized:false,model_generated:false,
  original_job_completed:false,production_changed:false,
 };
 if(matching.length>1)fail('CONTINUITY_WORK_DUPLICATE');
 if(!matching.length){
  const tail=history.at(-1);
  if(!tail?.event_id||!tail?.lineage_hash||
     !history.some(x=>x.event_id===scope.goal_transition_receipt_ref))
    fail('CONTINUITY_GOAL_LINEAGE_MISSING');
  const spine=createContinuitySpine({
   continuityRootId:scope.continuity_root_id,
   worldlineId:scope.worldline_id,subjectId:scope.owner_id,
  });
  const at=new Date().toISOString();
  const node=appendContinuityNode({
   spine,stage:'WORK',entityId:scope.original_work_id,eventId:id,
   parentEventId:tail.event_id,priorLineageHash:tail.lineage_hash,
   effectiveTime:at,assertionTime:at,epistemicStatus:'OBSERVED',
   evidenceRefs:[content.issue_url,content.pinned_red_run],
   payload:content,
   provenance:{source:'reality-personal-first-upgrade-178-v0.1',
    principal_id:scope.owner_id,conversation_id:conversationId},
  });
  await store.appendEvent({...node,entity_type:'personal_first_self_upgrade_customer_work'});
 }
 const verified=orderContinuityHistory(await read());
 const event=verified.find(x=>x.event_id===id);
 if(!event||event.entity_type!=='personal_first_self_upgrade_customer_work'||
    event.payload?.original_work_id!==scope.original_work_id||
    event.payload?.original_goal_id!==scope.goal_id||
    event.payload?.goal_transition_receipt_ref!==scope.goal_transition_receipt_ref||
    event.payload?.gap_evidence_hash!==providerEvidence.evidence_hash||
    event.payload?.gap_provider_receipt_ref!==providerEvidence.provider_receipt_ref||
    event.payload?.installation_authorized!==false||
    event.payload?.original_job_completed!==false)
   fail('CONTINUITY_WORK_READBACK_FAILED');
 return Object.freeze({receipt_id:id,original_work_id:scope.original_work_id,
  verified_readback:true,installation_authorized:false});
}
export async function startFirstUpgrade178({
 session,conversationId,env=process.env,
 readGoal=readFreshPersonalGoalState,call=rpc,
 observe=observeFirstGapFromGithub,
 persistWork=persistFirstUpgrade178Work,
}={}){
 const db=dbFor(session,env);
 if(!/^[a-f0-9]{40}$/.test(String(env.VERCEL_GIT_COMMIT_SHA||'')))
  fail('PINNED_PREVIEW_RELEASE_REQUIRED',503);
 if(!String(env.REALITY_STANDALONE_OPENAI_API_KEY||'').trim()||
    !String(env.REALITY_SEMANTIC_REVIEW_MODEL||'').trim())
  fail('MODEL_PROVIDER_NOT_CONFIGURED',503);
 if(String(env.REALITY_FIRST178_GITHUB_READ_TOKEN||'').length<20)
  fail('GITHUB_READ_ONLY_CREDENTIAL_REQUIRED',503);
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
 const observed=await observe({scope:initial,apiToken:env.REALITY_FIRST178_GITHUB_READ_TOKEN});
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
 const third=await verifiedOwnerScope({session,conversationId,env,readGoal});
 if(third.original_work_id!==initial.original_work_id||
    third.goal_transition_receipt_ref!==initial.goal_transition_receipt_ref)
   fail('GOAL_CHANGED_BEFORE_CONTINUITY_WORK');
 const workReceipt=await persistWork({scope:initial,conversationId,
   providerEvidence:observed,db});
 if(workReceipt?.verified_readback!==true||
    workReceipt.original_work_id!==initial.original_work_id||
    workReceipt.installation_authorized!==false||
    !uuid(workReceipt.receipt_id))
   fail('CONTINUITY_WORK_READBACK_FAILED',503);
 // No GitHub WRITE request here. The existing atomic queue is claimed
 // separately by the trusted constitutional driver in the same preview.
 // This avoids copying a protected GitHub dispatch secret and ensures there
 // is only ONE lifecycle authority for the original owner job.
 return Object.freeze({...publicShape(initial,'QUEUED_DIRECT_CONSTITUTIONAL'),
  queue_id:result.queue_id,continuity_work_receipt_id:workReceipt.receipt_id,
  provider_receipt_ref:observed.provider_receipt_ref,
  worker_dispatch_required:false,external_execution_authorized:false,
  next_action:'CLAIM_AND_RUN_SAME_ORIGINAL_JOB'});
}
