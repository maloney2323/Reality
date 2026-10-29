// AUTHORITATIVE user-directed conversational goal relations, projected ONLY
// from authenticated, explicit user-command receipts in EXISTING Continuity.
// No assistant/reviewer/classifier can create, pause, cancel or complete goals.
// An explicit user instruction changes conversation focus; it NEVER proves a
// real-world task completed or authorizes external business execution.
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {orderContinuityHistory} from './reality-continuous-reliability-v0.1.js';
export const AUTHORITATIVE_USER_GOAL_LEDGER_VERSION='reality-authoritative-user-goal-ledger-v0.1';
export const USER_GOAL_COMMANDS=Object.freeze([
 'SET_ACTIVE','START_DETOUR','RESUME','PAUSE','ABANDON','REPORT_COMPLETE',
]);
const ok=x=>typeof x==='string'&&x.trim().length>0;
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function canonical(x){
 if(x===null||typeof x!=='object')return x;
 if(Array.isArray(x))return x.map(canonical);
 return Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])]));
}
function issuerMac(unsigned){
 const secret=process.env.REALITY_CHAT_RECEIPT_HMAC_KEY;
 if(typeof secret!=='string'||secret.length<16)
  throw Error('GOAL_AUTHORITY_PRIVATE_ISSUER_SECRET_REQUIRED');
 return createHmac('sha256',secret).update(
  'reality:goal-user-message-attestation:v1:'+JSON.stringify(canonical(unsigned))
 ).digest('hex');
}
function verifyServerIssuer(payload){
 const signature=payload?.server_issuer_hmac;
 if(typeof signature!=='string'||!/^[0-9a-f]{64}$/.test(signature))
  throw Error('GOAL_AUTHORITY_USER_ISSUER_ATTESTATION_MISSING');
 const {server_issuer_hmac,...unsigned}=payload;
 const actual=Buffer.from(signature,'hex'),expected=Buffer.from(issuerMac(unsigned),'hex');
 if(!timingSafeEqual(actual,expected))
  throw Error('GOAL_AUTHORITY_USER_ISSUER_ATTESTATION_INVALID');
}
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const goalId=(root,source)=>'user-goal:'+digest([root,source]).slice(0,32);
const statusCode='AUTHORITATIVE_USER_GOAL_TRANSITION';
const authorizedSource='reality_authenticated_user_goal_command_adapter';
const commandSet=new Set(USER_GOAL_COMMANDS);
const nonExecution=()=>{
 return {external_execution_authorized:false,financial_outcome_verified:false,
  business_task_completion_independently_verified:false};
};
function scopedEvent(e,{continuityRootId,worldId,principalId}){
 if(e?.payload?.event_type!==statusCode)return false;
 const p=e.payload;
 // Unexpected event claiming this authoritative type is an integrity
 // exception, not something to silently ignore while granting "all clear".
 if(e.provenance?.source!==authorizedSource||
    e.provenance?.authenticated_user_id!==principalId||
    e.provenance?.source_message_ref!==p.source_user_message_ref||
    e.provenance?.source_digest!==p.source_message_digest||
    p.authorized_by!=='AUTHENTICATED_USER_EXPLICIT_GOAL_COMMAND'||
    p.goal_transition_authority_granted!==true||
    p.version!==AUTHORITATIVE_USER_GOAL_LEDGER_VERSION||
    p.continuity_root_id!==continuityRootId||
    p.world_id!==(worldId||null)||
    p.principal_id!==principalId||
    e.continuity_root_id!==continuityRootId||
    p.external_execution_authorized!==false||
    p.source_verification!=='AUTHENTICATED_RLS_CHAT_USER_MESSAGE_READBACK'||
    !/^supabase:reality_chat_messages:[0-9a-f-]{36}$/i.test(p.source_user_message_ref||'')||
    !/^[0-9a-f-]{36}$/i.test(p.source_request_id||'')||
    !/^sha256:[0-9a-f]{64}$/.test(p.source_message_digest||'')||
    !commandSet.has(p.operation)||!ok(p.command_turn_id)||
    p.command_turn_id!==p.source_user_message_ref||
    !Number.isFinite(Date.parse(p.observed_at)))
  throw Error('USER_GOAL_AUTHORITY_EVENT_INTEGRITY_FAILURE');
 verifyServerIssuer(p);
 return true;
}
export function projectAuthoritativeUserGoals({
 continuityHistory=[],continuityRootId,worldId=null,principalId,
}={}){
 if(!Array.isArray(continuityHistory)||!ok(continuityRootId)||!ok(principalId))
  throw Error('USER_GOAL_AUTHORITY_READ_SCOPE_REQUIRED');
 // Re-verify the complete chain and its recomputed lineage hashes before
 // accepting any user-goal authority. Missing history must FAIL CLOSED.
 const verifiedHistory=orderContinuityHistory(continuityHistory);
 const goals=new Map(),transitions=[],seenRequests=new Set();
 let active=null;
 for(const event of verifiedHistory){
  if(!scopedEvent(event,{continuityRootId,worldId,principalId}))continue;
  const p=event.payload;
  if(seenRequests.has(p.source_request_id))
   throw Error('USER_GOAL_AUTHORITY_DUPLICATE_REQUEST');
  seenRequests.add(p.source_request_id);
  const target=ok(p.target_goal_id)?goals.get(p.target_goal_id):null;
  if(p.operation==='SET_ACTIVE'||p.operation==='START_DETOUR'){
   const id=goalId(continuityRootId,p.source_user_message_ref);
   if(p.goal_id!==id||goals.has(id)||!ok(p.user_directed_objective)||
      p.source_message_digest!=='sha256:'+digest(p.user_directed_objective)||
      p.user_directed_objective.length>700||
      (p.operation==='START_DETOUR'&&(!active||p.parent_goal_id!==active)))
    throw Error('USER_GOAL_AUTHORITY_CREATE_INVALID');
   if(active){
    const before=goals.get(active);
    if(!before)throw Error('USER_GOAL_AUTHORITY_ACTIVE_MISSING');
    goals.set(active,{...before,status:p.operation==='START_DETOUR'?'PAUSED':'DORMANT'});
   }
   goals.set(id,{goal_id:id,parent_id:p.operation==='START_DETOUR'?active:null,
    title:p.user_directed_objective,source_user_message_ref:p.source_user_message_ref,
    status:'ACTIVE',created_at:p.observed_at,last_transition_receipt_id:event.event_id,
    user_confirmed:true, ...nonExecution()});
   active=id;
  }else{
   if(!target||p.goal_id!==target.goal_id)
    throw Error('USER_GOAL_AUTHORITY_UNKNOWN_TARGET');
   if(p.operation==='RESUME'){
    if(active&&active!==target.goal_id){
     const prior=goals.get(active);
     goals.set(active,{...prior,status:'DORMANT'});
    }
    goals.set(target.goal_id,{...target,status:'ACTIVE',
      last_transition_receipt_id:event.event_id});
    active=target.goal_id;
   }else if(p.operation==='PAUSE'){
    if(target.goal_id!==active)throw Error('USER_GOAL_AUTHORITY_PAUSE_NOT_ACTIVE');
    goals.set(target.goal_id,{...target,status:'PAUSED',
      last_transition_receipt_id:event.event_id});
    active=null;
   }else if(p.operation==='ABANDON'||p.operation==='REPORT_COMPLETE'){
    goals.set(target.goal_id,{...target,
      status:p.operation==='ABANDON'?'ABANDONED':'USER_REPORTED_COMPLETE_UNVERIFIED',
      last_transition_receipt_id:event.event_id,
      business_task_completion_independently_verified:false});
    if(target.goal_id===active)active=null;
   }else throw Error('USER_GOAL_AUTHORITY_UNKNOWN_OPERATION');
  }
  transitions.push({event_id:event.event_id,operation:p.operation,
   goal_id:p.goal_id,source_ref:p.source_user_message_ref,
   source_request_id:p.source_request_id,principal_id:principalId,
   confirmed_by_user:true,external_execution_authorized:false});
 }
 return freeze({
  version:AUTHORITATIVE_USER_GOAL_LEDGER_VERSION,
  status:transitions.length?'USER_AUTHORIZED_GOAL_STATE_FROM_CONTINUITY':
    'NO_EXPLICIT_USER_GOAL_COMMAND_RECORDED',
  continuity_root_id:continuityRootId,world_id:worldId||null,principal_id:principalId,
  active_goal_id:active,
  active_goal:active?goals.get(active):null,
  goals:[...goals.values()].slice(-50),
  transition_count:transitions.length,
  recent_transition_receipts:transitions.slice(-20),
  authority_source:transitions.length?'AUTHENTICATED_RLS_USER_GOAL_COMMAND_AND_LEDGER_READBACK':'NONE',
  assistant_can_mutate_goals:false,semantic_reviewer_can_mutate_goals:false,
  atomic_compare_and_swap_proven:false,
  consequential_goal_mutation_authorized:false,
  unknown_user_intent_not_equivalent_to_authorized_goal:true,
  ...nonExecution(),
 });
}
export async function appendAuthenticatedUserGoalCommand({
 continuityRuntime,worldId=null,principalId,
 command,sourceUserMessage,sourceUserMessageRef,sourceRequestId,
 targetGoalId=null,observedAt=new Date().toISOString(),
}={}){
 if(!continuityRuntime?.enabled||typeof continuityRuntime.readback!=='function'||
    typeof continuityRuntime.appendStage!=='function')
  throw Error('USER_GOAL_AUTHORITY_DURABLE_LEDGER_REQUIRED');
 const root=continuityRuntime.spine.continuity_root_id;
 if(!ok(principalId)||!ok(sourceUserMessage)||sourceUserMessage.length>700||
    !/^supabase:reality_chat_messages:[0-9a-f-]{36}$/i.test(sourceUserMessageRef||'')||
    !/^[0-9a-f-]{36}$/i.test(sourceRequestId||'')||
    !commandSet.has(command)||!Number.isFinite(Date.parse(observedAt)))
  throw Error('USER_GOAL_AUTHORITY_EXPLICIT_USER_COMMAND_REQUIRED');
 const before=projectAuthoritativeUserGoals({
  continuityHistory:await continuityRuntime.readback(),
  continuityRootId:root,worldId,principalId});
 const already=before.recent_transition_receipts.find(x=>x.source_request_id===sourceRequestId);
 if(already)throw Error('USER_GOAL_AUTHORITY_REQUEST_ALREADY_USED');
 const create=command==='SET_ACTIVE'||command==='START_DETOUR';
 const target=create?null:before.goals.find(x=>x.goal_id===targetGoalId);
 if((!create&&!target)||(create&&targetGoalId))
  throw Error('USER_GOAL_AUTHORITY_TARGET_INVALID');
 if(command==='START_DETOUR'&&!before.active_goal_id)
  throw Error('USER_GOAL_AUTHORITY_DETOUR_PARENT_REQUIRED');
 if(command==='PAUSE'&&before.active_goal_id!==target.goal_id)
  throw Error('USER_GOAL_AUTHORITY_PAUSE_NOT_ACTIVE');
 const goal_id=create?goalId(root,sourceUserMessageRef):target.goal_id;
 const messageDigest='sha256:'+digest(sourceUserMessage);
 const eventId='user-goal-authority:'+digest([root,worldId,principalId,sourceRequestId]);
 const payload={
  event_type:statusCode,version:AUTHORITATIVE_USER_GOAL_LEDGER_VERSION,
  continuity_root_id:root,world_id:worldId||null,principal_id:principalId,
  operation:command,goal_id,target_goal_id:targetGoalId,
  parent_goal_id:command==='START_DETOUR'?before.active_goal_id:null,
  source_user_message_ref:sourceUserMessageRef,
  source_request_id:sourceRequestId,command_turn_id:sourceUserMessageRef,
  user_directed_objective:create?sourceUserMessage:null,
  source_message_digest:messageDigest,
  observed_at:new Date(observedAt).toISOString(),
  source_verification:'AUTHENTICATED_RLS_CHAT_USER_MESSAGE_READBACK',
  authorized_by:'AUTHENTICATED_USER_EXPLICIT_GOAL_COMMAND',
  goal_transition_authority_granted:true,
  ...nonExecution(),
 };
 const attestedPayload={...payload,server_issuer_hmac:issuerMac(payload)};
 const event=await continuityRuntime.appendStage({
  stage:'VERIFICATION',entityId:goal_id,eventId,
  epistemicStatus:'OBSERVED',effectiveTime:observedAt,assertionTime:observedAt,
  payload:attestedPayload,
  provenance:{source:authorizedSource,authenticated_user_id:principalId,
   source_message_ref:sourceUserMessageRef,source_digest:messageDigest},
 });
 const history=await continuityRuntime.readback();
 if(!history.some(x=>x.event_id===event.event_id&&
    x.payload?.source_user_message_ref===sourceUserMessageRef&&
    x.payload?.source_message_digest===messageDigest))
  throw Error('USER_GOAL_AUTHORITY_APPEND_READBACK_MISSING');
 const state=projectAuthoritativeUserGoals({
  continuityHistory:history,continuityRootId:root,worldId,principalId});
 if(!state.recent_transition_receipts.some(x=>x.event_id===event.event_id))
  throw Error('USER_GOAL_AUTHORITY_TRANSITION_NOT_PROJECTED');
 return {event_id:event.event_id,state};
}


/**
 * Before publishing an answer, project a NEW authenticated goal-ledger
 * readback and ensure that no user-owned goal transition was recorded
 * while the model was generating. Do not rely on a reviewer or model text.
 *
 * This is not a transactional compare-and-swap across simultaneous writes.
 */
export function compareAuthenticatedGoalSnapshots({expected,current}={}){
 if(expected?.version!==AUTHORITATIVE_USER_GOAL_LEDGER_VERSION||
    current?.version!==AUTHORITATIVE_USER_GOAL_LEDGER_VERSION||
    !ok(expected.continuity_root_id)||!ok(expected.principal_id)||
    current.continuity_root_id!==expected.continuity_root_id||
    current.world_id!==expected.world_id||
    current.principal_id!==expected.principal_id||
    expected.assistant_can_mutate_goals!==false||
    current.assistant_can_mutate_goals!==false||
    expected.external_execution_authorized!==false||
    current.external_execution_authorized!==false||
    !Number.isInteger(expected.transition_count)||
    !Number.isInteger(current.transition_count))
  throw Error('USER_GOAL_PUBLICATION_SCOPE_OR_PROJECTION_INVALID');
 if(current.transition_count<expected.transition_count)
  throw Error('USER_GOAL_PUBLICATION_HISTORY_ROLLBACK');
 const first=expected.active_goal,latest=current.active_goal;
 const identical=expected.transition_count===current.transition_count&&
   expected.active_goal_id===current.active_goal_id&&
   (first?.last_transition_receipt_id||null)===(latest?.last_transition_receipt_id||null);
 return freeze({
  version:AUTHORITATIVE_USER_GOAL_LEDGER_VERSION,
  status:identical?'USER_GOAL_SNAPSHOT_CURRENT':
    'USER_GOAL_CHANGED_SINCE_COGNITION',
  continuity_root_id:expected.continuity_root_id,
  world_id:expected.world_id,principal_id:expected.principal_id,
  original_active_goal_id:expected.active_goal_id,
  latest_active_goal_id:current.active_goal_id,
  original_active_goal_receipt_id:first?.last_transition_receipt_id||null,
  latest_active_goal_receipt_id:latest?.last_transition_receipt_id||null,
  transitions_seen_during_answer:current.transition_count-expected.transition_count,
  generated_answer_may_rely_on_stale_goal:!identical,
  stale_model_answer_admission_allowed:identical,
  goal_state_mutated_by_assistant:false,
  external_execution_authorized:false,
  independently_verified_semantic_correctness:false,
  atomic_compare_and_swap_proven:false,
 });
}
