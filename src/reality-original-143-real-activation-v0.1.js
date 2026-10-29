// Exact owner-approved original customer work #143 activation and reconciliation.
// There is NO route around owner authentication or one-time DB reservation.
// Only the original Reality-generated executor is invoked; external GitHub
// writes, production deployment, and issue closure are all forbidden.
import {createHash} from 'node:crypto';
import {readFreshPersonalGoalState} from './reality-personal-goal-readback-v0.1.js';
import {inspectAuthenticatedOriginalCapabilityReadiness,
 ORIGINAL_WORK,ORIGINAL_CAPABILITY_ID,ORIGINAL_CAPABILITY_VERSION}
 from './reality-original-upgrade-readback-v0.1.js';
import {createSingleUseExecutionReservationStore}
 from './reality-single-use-execution-reservation-v0.1.js';
import {createUniversePostgresPersistence}
 from './reality-universe-postgres-persistence-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from './reality-reliability-db-boundary-v0.1.js';
import {createContinuitySpine,appendContinuityNode,continuityUuidFromSource}
 from './reality-continuity-spine-v2.0.js';
import {orderContinuityHistory} from './reality-continuous-reliability-v0.1.js';
import {executeOriginalMaintenanceRepair}
 from './reality-extensions/reality-original-maintenance-executor.mjs';
import {readPublicOriginal143GitHubEvidence} from './reality-original-143-public-evidence-v0.1.js';
import {validUuid} from './reality-private-chat-store-v0.1.js';

export const ORIGINAL_143_CONFIRMATION='ACTIVATE_EXACT_VERIFIED_ISOLATED_CAPABILITY';
export const ORIGINAL_143_VERSION='reality-original-143-real-activation-v0.1';
const BRANCH='experiment/reality-live-durable-adversarial-20261025';
const SOURCE_SHA='7ba3cc3273c2301c6902b6b3b3d6d0247e8b6abe0398467656e5e2ca93648128';
const LIVE_RUN='https://github.com/maloney2323/Reality/actions/runs/40777160879';
const canonical=x=>x===null||typeof x!=='object'?x:
 Array.isArray(x)?x.map(canonical):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])]));
const digest=x=>createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
function fail(code,status=409){throw Object.assign(Error(code),{status})}
function authScope(session,conversationId,env){
 if(!validUuid(session?.user_id)||!validUuid(conversationId))fail('OWNER_SIGN_IN_REQUIRED',401);
 if(env.VERCEL_ENV!=='preview'||env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true')
  fail('ORIGINAL_143_ISOLATED_PREVIEW_ONLY',403);
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||
  db.url!==session.config?.url||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('ORIGINAL_143_OWNER_DB_SCOPE_INVALID',403);
 return db;
}
function readyToActivate(r){
 return r?.github_verified===true&&r?.actual_experimental_executor_bytes_verified===true&&
 r?.independent_live_reconciliation_verified===true&&r?.historical_source_fix_already_present===true&&
 r?.preexisting_owner_evidence_acceptance_verified===true&&
 r?.owner_capability_registry_registered===false&&
 r?.full_original_job_completed===false&&
 r?.model_source_sha256_expected===SOURCE_SHA&&
 r?.scope==='OWNER_ISOLATED_EXPERIMENT_ONLY';
}
function nodeForPersistence(node,entityType){
 const provenance={...node.provenance,
  continuity_spine:{
   version:'reality-continuity-spine-v2.1',
   prior_lineage_hash:node.prior_lineage_hash||null,
   transformation_receipt_id:node.transformation_receipt_id||null,
   source_event_id:node.event_id_source||null,
   source_entity_id:node.entity_id_source||null,
   source_continuity_root_id:node.continuity_root_source||null,
   source_worldline_id:node.worldline_source||null,
  }};
 return {
  event_id:node.event_id,event_kind:node.event_kind,entity_type:entityType,
  entity_id:node.entity_id,continuity_root_id:node.continuity_root_id,
  worldline_id:node.worldline_id,parent_event_id:node.parent_event_id,
  prior_lineage_hash:node.prior_lineage_hash,
  effective_time:node.effective_time,assertion_time:node.assertion_time,
  epistemic_status:node.epistemic_status,payload:node.payload,
  evidence_refs:node.evidence_refs,provenance,
  content_hash:digest(node.payload),lineage_hash:node.lineage_hash,
 };
}
function verifiedHistory(events){
 const ordered=orderContinuityHistory(events);
 const tail=ordered.at(-1);
 if(!tail?.event_id||!tail?.lineage_hash)fail('ORIGINAL_143_CONTINUITY_TAIL_REQUIRED');
 return {events:ordered,tail};
}
function makeNode({spine,tail,stage,entityId,eventId,payload,evidenceRefs=[]}){
 return nodeForPersistence(appendContinuityNode({
  spine,stage,entityId,eventId,parentEventId:tail.event_id,
  priorLineageHash:tail.lineage_hash,
  effectiveTime:new Date().toISOString(),assertionTime:new Date().toISOString(),
  epistemicStatus:'VERIFIED',payload,evidenceRefs,
  provenance:{source:ORIGINAL_143_VERSION,
   owner_id:payload.owner_id,conversation_id:payload.conversation_id,
   original_work_id:ORIGINAL_WORK}
 }),stage==='CAPABILITY'?'personal_original_executor_capability_registered':
  'personal_original_job_final_settlement');
}
function scopeOfGoal(goal,session,conversationId){
 if(goal?.principal_id!==session.user_id||goal?.conversation_id!==conversationId||
  goal?.state?.active_goal?.status!=='ACTIVE'||
  goal?.state?.active_goal?.user_confirmed!==true||
  goal?.state?.active_goal_id!==goal?.state?.active_goal?.goal_id||
  !goal?.state?.active_goal_id||
  !validUuid(goal?.state?.active_goal?.last_transition_receipt_id))
  fail('ORIGINAL_143_FRESH_OWNER_GOAL_REQUIRED');
 return createContinuitySpine({
  continuityRootId:goal.scope.root,worldlineId:goal.scope.worldline,
  subjectId:session.user_id,
 });
}
async function rpc(db,name,args,fetchImpl=fetch){
 const response=await fetchImpl(db.url+'/rest/v1/rpc/'+name,{
  method:'POST',
  headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
   accept:'application/json','content-type':'application/json'},
  body:JSON.stringify(args),
 });
 const body=await response.json().catch(()=>null);
 if(!response.ok){
  // Allowlisted server-only error diagnosis; never emit SQL, JWTs or raw provider data.
  const safe=/^ORIGINAL_143_[A-Z0-9_]{4,100}$/.test(String(body?.message||''))?
   body.message:'ORIGINAL_143_ATOMIC_DATABASE_OPERATION_REJECTED';
  fail(safe,503);
 }
 return body;
}
// Identity of the SAME previously owner-approved original #143 action.
// Resumption never claims a second reservation or broadens its authorization.
function exactOriginal143ActionIdentity(session,conversationId,goalId){
 const policyId=continuityUuidFromSource('original143-owner-click:'+
  session.user_id+':'+conversationId+':'+ORIGINAL_WORK+':'+SOURCE_SHA);
 const fingerprint='sha256:'+digest({
  owner_id:session.user_id,conversation_id:conversationId,
  original_work_id:ORIGINAL_WORK,goal_id:goalId,
  source_sha256:SOURCE_SHA,target_branch:BRANCH,
  owner_confirmation:ORIGINAL_143_CONFIRMATION,
 });
 return {policyId,fingerprint};
}
async function readExistingOriginal143Reservation({
 db,session,conversationId,goalId,rpcCall=rpc,
}={}){
 const {policyId,fingerprint}=exactOriginal143ActionIdentity(session,conversationId,goalId);
 const result=await rpcCall(db,'reality_read_original_143_reservation',{
  p_owner_id:session.user_id,p_conversation_id:conversationId,
  p_action_policy_id:policyId,p_work_fingerprint:fingerprint,
 });
 if(!result||!['NOT_FOUND','RESERVED_UNDISPATCHED','NOT_RESUMABLE'].includes(result.status))
  fail('ORIGINAL_143_RESERVATION_READBACK_INVALID',503);
 if(result.status==='RESERVED_UNDISPATCHED'&&!validUuid(result.reservation_id))
  fail('ORIGINAL_143_RESERVATION_READBACK_INVALID',503);
 return result;
}

// Single-use selector: a prior checked RESERVATION is reused exactly once,
// never claimed again. A stale/ambiguous/consumed result fails closed.
export async function claimOrResumeOriginal143Reservation({
 prior,lease,policyId,fingerprint,goalId,epoch,
}={}){
 if(prior?.status==='RESERVED_UNDISPATCHED'){
  if(!validUuid(prior.reservation_id))fail('ORIGINAL_143_RESERVATION_READBACK_INVALID');
  return Object.freeze({reservation_id:prior.reservation_id,
   existing_owner_approval_reused:true});
 }
 if(prior?.status!=='NOT_FOUND')
  fail('ORIGINAL_143_EXISTING_RESERVATION_NOT_RESUMABLE',409);
 if(!lease||typeof lease.claim!=='function')
  fail('ORIGINAL_143_RESERVATION_CLAIM_UNAVAILABLE');
 return lease.claim({
  policyId,workFingerprint:fingerprint,goalId,
  expectedGoalRevision:epoch.goal_revision,
  expectedGoalEventId:epoch.goal_transition_event_id,
  expectedUserMessageRevision:epoch.user_message_revision,
  expectedLatestUserRequestId:epoch.latest_user_request_id,
 });
}

function matchStoredEvent(stored,event){
 return stored?.event_id===event.event_id&&
  stored?.lineage_hash===event.lineage_hash&&
  stored?.content_hash===event.content_hash&&
  stored?.entity_type===event.entity_type&&
  stored?.payload?.original_work_id===ORIGINAL_WORK;
}
export async function inspectOriginal143OwnerAction({
 session,conversationId,env=process.env,
 inspect=inspectAuthenticatedOriginalCapabilityReadiness,
 readGoal=readFreshPersonalGoalState,
 readReservation=readExistingOriginal143Reservation,
}={}){
 authScope(session,conversationId,env);
 const r=await inspect({session,conversationId,workId:ORIGINAL_WORK,env});
 let existing='NOT_CHECKED',resume=false;
 if(readyToActivate(r)){
  const goal=await readGoal({session,conversationId,env});
  scopeOfGoal(goal,session,conversationId);
  if(r.original_goal_id!==undefined&&goal.state.active_goal_id!==r.original_goal_id)
   fail('ORIGINAL_143_OWNER_GOAL_CHANGED');
  const result=await readReservation({db:authScope(session,conversationId,env),
   session,conversationId,goalId:goal.state.active_goal_id});
  existing=result.status;
  resume=existing==='RESERVED_UNDISPATCHED';
 }
 return Object.freeze({
  ...r,exact_owner_action_available:readyToActivate(r)&&
   ['NOT_FOUND','RESERVED_UNDISPATCHED'].includes(existing),
  existing_approved_reservation_status:existing,
  existing_approved_reservation_verified:resume,
  user_action_confirmation:ORIGINAL_143_CONFIRMATION,
  automatic_installation:false,production_unchanged:true,
 });
}
export async function completeOriginal143OwnerAction({
 session,conversationId,confirmation,env=process.env,
 inspect=inspectAuthenticatedOriginalCapabilityReadiness,
 readGoal=readFreshPersonalGoalState,
 createPersistence=createUniversePostgresPersistence,
 createReservation=createSingleUseExecutionReservationStore,
 get=readPublicOriginal143GitHubEvidence,originalExecutor=executeOriginalMaintenanceRepair,
 rpcCall=rpc,readReservation=readExistingOriginal143Reservation,
}={}){
 // This method must be called only by an authenticated same-origin POST,
 // and may not be called from a model, a cron job, or GET request.
 const db=authScope(session,conversationId,env);
 if(confirmation!==ORIGINAL_143_CONFIRMATION)
  fail('ORIGINAL_143_EXPLICIT_OWNER_ACTIVATION_REQUIRED',403);
 const initial=await inspect({session,conversationId,workId:ORIGINAL_WORK,env});
 if(!readyToActivate(initial))fail('ORIGINAL_143_ACTIVATION_PREREQUISITES_UNPROVEN');
 const goal=await readGoal({session,conversationId,env});
 const spine=scopeOfGoal(goal,session,conversationId);
 if(goal.state.active_goal_id!==initial?.original_goal_id&&
   initial?.original_goal_id!==undefined)
  fail('ORIGINAL_143_OWNER_GOAL_CHANGED');
 const store=createPersistence({...db});
 const {events,tail}=verifiedHistory(await store.reconstruct({
  continuityRootId:spine.continuity_root_id,worldlineId:spine.worldline_id
 }));
 const evidence=events.find(e=>e.entity_type==='personal_original_repair_owner_acceptance'&&
  e.payload?.owner_id===session.user_id&&
  e.payload?.conversation_id===conversationId&&
  e.payload?.original_goal_id===goal.state.active_goal_id&&
  e.payload?.original_work_id===ORIGINAL_WORK&&
  e.payload?.owner_confirmation==='ACCEPT_VERIFIED_CORRECTION_EVIDENCE_ONLY'&&
  e.payload?.github_write_authorized===false);
 if(!evidence)fail('ORIGINAL_143_PERSISTED_ORIGINAL_ACCEPTANCE_REQUIRED');
 // The owner click is the only new authority. A model cannot manufacture it.
 // The goal+conversation-scoped DB reservation is atomic and one-time.
 const lease=createReservation({session,conversationId,env});
 const epoch=await lease.readEpoch();
 if(epoch.goal_transition_event_id!==goal.state.active_goal.last_transition_receipt_id)
  fail('ORIGINAL_143_AUTHORITY_GOAL_EPOCH_CHANGED');
 const {policyId,fingerprint}=exactOriginal143ActionIdentity(
  session,conversationId,goal.state.active_goal_id);
 const prior=await readReservation({db,session,conversationId,
  goalId:goal.state.active_goal_id,rpcCall});
 // Exactly one source-bound, previously owner-authorized reservation can be
 // recovered. It has not been dispatched and is still bound to a fresh epoch.
 const reservation=await claimOrResumeOriginal143Reservation({
  prior,lease,policyId,fingerprint,goalId:goal.state.active_goal_id,epoch,
 });
 const payload={
  original_work_id:ORIGINAL_WORK,owner_id:session.user_id,
  conversation_id:conversationId,original_goal_id:goal.state.active_goal_id,
  original_goal_revision:epoch.goal_revision,
  owner_confirmation:confirmation,source_sha256:SOURCE_SHA,
  target_branch:BRANCH,runtime_activation_verified:true,
  registration_readback_verified:true,external_repair_performed_by_reality:false,
  verification_run:LIVE_RUN,original_issue_number:143,
  execution_reservation_id:reservation.reservation_id,
 };
 const id=continuityUuidFromSource('personal-original143-activate:'+
  session.user_id+':'+ORIGINAL_WORK+':'+SOURCE_SHA);
 const event=makeNode({
  spine,tail,stage:'CAPABILITY',entityId:ORIGINAL_CAPABILITY_ID,
  eventId:id,payload,evidenceRefs:[
   'https://github.com/maloney2323/Reality/pull/156',
   'https://github.com/maloney2323/Reality/pull/157',LIVE_RUN],
 });
 const registry={
  capability_id:ORIGINAL_CAPABILITY_ID,capability_version:ORIGINAL_CAPABILITY_VERSION,
  status:'ACTIVE',admitted_event_id:event.event_id,
  purpose:'Owner-approved original #143 isolated evidence reconciliation',
  preconditions:['Owner authenticated','Exact consent','Single-use goal-bound reservation',
   'GitHub source bytes and independent live readback verified'],
  procedure:{runtime_import_verified:true,provider_access:'GET_ONLY',
   github_writes:false,production_installation:false},
  failure_modes:['STALE_GOAL','SOURCE_CHANGED','UNVERIFIED_PROVIDER',
   'REGISTRATION_MISMATCH','CONTINUITY_FAILURE'],
  verification_basis:{
   owner_id:session.user_id,original_goal_id:goal.state.active_goal_id,
   original_work_id:ORIGINAL_WORK,source_sha256:SOURCE_SHA,target_branch:BRANCH,
   independent_live_run_ref:LIVE_RUN,registration_receipt_id:event.event_id,
  },
  performance:{verified_external_effects:0}
 };
 const registration=await rpcCall(db,'reality_register_original_143_capability',{
  p_owner_id:session.user_id,p_conversation_id:conversationId,
  p_reservation_id:reservation.reservation_id,
  p_event:event,p_registry:registry
 });
 if(registration?.status!=='REGISTERED'||
  registration.registration_event_id!==event.event_id)
  fail('ORIGINAL_143_ATOMIC_REGISTRATION_UNCONFIRMED');
 const [registeredRow,registeredEvents]=await Promise.all([
  store.getCapability(ORIGINAL_CAPABILITY_ID,ORIGINAL_CAPABILITY_VERSION),
  store.reconstruct({continuityRootId:spine.continuity_root_id,
   worldlineId:spine.worldline_id}),
 ]);
 const stored=verifiedHistory(registeredEvents).events.find(e=>e.event_id===event.event_id);
 if(!matchStoredEvent(stored,event)||
   registeredRow?.status!=='ACTIVE'||
   registeredRow?.admitted_event_id!==event.event_id||
   registeredRow?.verification_basis?.owner_id!==session.user_id)
  fail('ORIGINAL_143_REGISTERED_CAPABILITY_READBACK_UNVERIFIED');
 // Perform the actual Reality-generated executor's original job, read-only.
 // Historical source was already fixed, so there must be no GitHub mutation.
 const executed=await originalExecutor({session,conversationId,
  workId:ORIGINAL_WORK,get});
 if(executed?.status!=='PREEXISTING_FIX_NOT_EXECUTED_BY_REALITY'||
  executed.external_write_performed!==false||
  executed.repair_executed_by_reality!==false||
  executed.original_job_completed!==false)
  fail('ORIGINAL_143_REAL_EXECUTOR_NOT_INDEPENDENTLY_RECONCILED');
 // Re-observe provider and owner Continuity AFTER executing, not model claims.
 const rechecked=await inspect({session,conversationId,workId:ORIGINAL_WORK,env});
 if(rechecked?.owner_capability_registry_registered!==true||
  rechecked?.github_verified!==true||rechecked?.original_job_final_settlement_persisted!==false)
  fail('ORIGINAL_143_AFTER_EXECUTION_RECHECK_FAILED');
 const current=verifiedHistory(await store.reconstruct({
  continuityRootId:spine.continuity_root_id,worldlineId:spine.worldline_id
 }));
 const settlement=makeNode({
  spine,tail:current.tail,stage:'OUTCOME',entityId:ORIGINAL_WORK,
  eventId:continuityUuidFromSource('personal-original143-settle:'+
   session.user_id+':'+ORIGINAL_WORK+':'+SOURCE_SHA),
  payload:{
   original_work_id:ORIGINAL_WORK,owner_id:session.user_id,
   conversation_id:conversationId,original_goal_id:goal.state.active_goal_id,
   registration_receipt_id:event.event_id,
   outcome:'HISTORICAL_SOURCE_ALREADY_FIXED_INDEPENDENTLY_RECONCILED',
   original_job_completed:true,external_repair_performed_by_reality:false,
   independently_verified:true,original_issue_number:143,
   original_issue_closed:false,source_sha256:SOURCE_SHA,provider_run_ref:LIVE_RUN,
   execution_status:executed.status,
  },
  evidenceRefs:[LIVE_RUN,'https://github.com/maloney2323/Reality/issues/143']
 });
 const final=await rpcCall(db,'reality_settle_original_143_job',{
  p_owner_id:session.user_id,p_conversation_id:conversationId,
  p_registration_event_id:event.event_id,p_event:settlement
 });
 if(final?.status!=='SETTLED'||final?.settlement_event_id!==settlement.event_id)
  fail('ORIGINAL_143_ATOMIC_SETTLEMENT_UNCONFIRMED');
 const all=verifiedHistory(await store.reconstruct({
  continuityRootId:spine.continuity_root_id,worldlineId:spine.worldline_id
 }));
 if(!matchStoredEvent(all.events.find(e=>e.event_id===settlement.event_id),settlement))
  fail('ORIGINAL_143_SETTLEMENT_DURABLE_READBACK_FAILED');
 const published=await inspect({session,conversationId,workId:ORIGINAL_WORK,env});
 if(published?.full_original_job_completed!==true||
  published?.final_settlement_receipt_id!==settlement.event_id)
  fail('ORIGINAL_143_FINAL_READINESS_NOT_SETTLED');
 return Object.freeze({
  status:'ORIGINAL_143_FULL_LOOP_RECONCILIATION_SETTLED',
  original_work_id:ORIGINAL_WORK,registration_receipt_id:event.event_id,
  settlement_receipt_id:settlement.event_id,
  outcome:'HISTORICAL_SOURCE_ALREADY_FIXED_INDEPENDENTLY_RECONCILED',
  historical_fix_was_preexisting:true,
  external_repair_performed_by_reality:false,
  github_write_performed:false,production_changed:false,
  original_issue_closed:false,
  full_original_job_completed:true,
 });
}