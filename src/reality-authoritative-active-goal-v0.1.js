// Authoritative CONVERSATIONAL GOAL pin within Reality's existing append-only
// Continuity ledger. Does not confer execution authority or verify world facts.
// ONLY a signed-in user's explicit "pin as ongoing objective" action may create
// a directive; prose, model replies and semantic reviewers may not.
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
export const AUTHORITATIVE_GOAL_DIRECTIVE_VERSION='reality-user-active-goal-directive-v0.1';
const digest=x=>'sha256:'+createHash('sha256').update(JSON.stringify(x)).digest('hex');
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x)}return x};
const sign=(obj,secret)=>createHmac('sha256',secret).update(JSON.stringify(obj)).digest('hex');
function ensureSecret(secret){
 if(typeof secret!=='string'||secret.length<16)
  throw Error('ACTIVE_GOAL_SERVER_ISSUER_SECRET_REQUIRED');
}
function verifiedDirective(value,secret,root,world){
 ensureSecret(secret);
 if(value?.version!==AUTHORITATIVE_GOAL_DIRECTIVE_VERSION||
  value.operation!=='SET_ACTIVE'||value.issuer!=='SERVER_AUTHENTICATED_USER_ACTION'||
  value.grants_execution_authority!==false||
  value.authorized_by!=='USER_EXPLICIT_GOAL_PIN'||
  value.continuity_root_id!==root||value.world_id!==(world||null)||
  !nonempty(value.goal_text)||value.goal_text.length>2400||
  !nonempty(value.user_message_source_ref)||
  !value.user_message_source_ref.startsWith('supabase:reality_chat_messages:')||
  !nonempty(value.subject_user_id)||!nonempty(value.conversation_id)||
  !nonempty(value.directive_id)||!nonempty(value.goal_id)||
  !/^[a-f0-9]{64}$/.test(String(value.issuer_mac||'')))
  throw Error('ACTIVE_GOAL_DIRECTIVE_INVALID_OR_UNSCOPED');
 const {issuer_mac,...unsigned}=value;
 const expected=sign(unsigned,secret),actual=Buffer.from(issuer_mac,'hex');
 if(actual.length!==32||!timingSafeEqual(Buffer.from(expected,'hex'),actual))
  throw Error('ACTIVE_GOAL_ISSUER_AUTHENTICATION_FAILED');
 if(value.directive_id!==digest(['USER_ACTIVE_GOAL',value.continuity_root_id,
  value.world_id,value.user_message_source_ref])||
  value.goal_id!==digest(['USER_GOAL',value.continuity_root_id,
  value.world_id,value.user_message_source_ref]))
  throw Error('ACTIVE_GOAL_SOURCE_ID_INVALID');
 return true;
}
export function issueAuthenticatedGoalPin({
 continuityRootId,worldId,conversationId,subjectUserId,
 sourceRef,savedUserMessage,explicitUserSelection=false,
 secret,observedAt,
}={}){
 ensureSecret(secret);
 if(explicitUserSelection!==true||!nonempty(continuityRootId)||
  !nonempty(worldId)||!nonempty(conversationId)||!nonempty(subjectUserId)||
  !nonempty(sourceRef)||!sourceRef.startsWith('supabase:reality_chat_messages:')||
  !nonempty(savedUserMessage)||savedUserMessage.length>2400||
  !Number.isFinite(Date.parse(observedAt)))
  throw Error('ACTIVE_GOAL_REQUIRES_EXPLICIT_AUTHENTICATED_USER_MESSAGE');
 const base={
  version:AUTHORITATIVE_GOAL_DIRECTIVE_VERSION,
  directive_id:digest(['USER_ACTIVE_GOAL',continuityRootId,worldId,sourceRef]),
  goal_id:digest(['USER_GOAL',continuityRootId,worldId,sourceRef]),
  operation:'SET_ACTIVE',authorized_by:'USER_EXPLICIT_GOAL_PIN',
  issuer:'SERVER_AUTHENTICATED_USER_ACTION',
  continuity_root_id:continuityRootId,world_id:worldId,
  conversation_id:conversationId,subject_user_id:subjectUserId,
  user_message_source_ref:sourceRef,goal_text:savedUserMessage,
  issued_at:new Date(observedAt).toISOString(),
  semantics:'USER_PINNED_TEXT_NOT_MODEL_INTERPRETED',
  grants_execution_authority:false,
  business_completion_verified:false,
 };
 return freeze({...base,issuer_mac:sign(base,secret)});
}
export function projectAuthoritativeActiveGoal({
 history=[],continuityRootId,worldId,secret,
 subjectUserId,conversationId,
}={}){
 ensureSecret(secret);
 if(!Array.isArray(history)||!nonempty(continuityRootId)||!nonempty(worldId)||
  !nonempty(subjectUserId)||!nonempty(conversationId))
  throw Error('ACTIVE_GOAL_PROJECTION_SCOPE_REQUIRED');
 const directives=[],seen=new Set();
 for(const event of history){
  if(event?.payload?.event_type!=='AUTHORIZED_USER_GOAL_DIRECTIVE')continue;
  const directive=event.payload.directive;
  // Do not permit a cross-world event or unsigned model-authored event to
  // poison this user-owned projection. Wrong scope is ignored, while any
  // matching-scope tampering is a hard failure.
  if(directive?.continuity_root_id!==continuityRootId||
     directive.world_id!==worldId)continue;
  verifiedDirective(directive,secret,continuityRootId,worldId);
  if(directive.subject_user_id!==subjectUserId||
     directive.conversation_id!==conversationId)
   throw Error('ACTIVE_GOAL_SUBJECT_OR_CONVERSATION_MISMATCH');
  if(event.entity_id!==directive.goal_id||
     event.epistemic_status==='VERIFIED_EXTERNAL_FACT')
   throw Error('ACTIVE_GOAL_EVENT_LINKAGE_INVALID');
  if(seen.has(directive.directive_id))
   throw Error('ACTIVE_GOAL_DUPLICATE_DIRECTIVE_UNRESOLVED');
  seen.add(directive.directive_id);
  directives.push(directive);
 }
 const latest=directives.at(-1);
 return freeze({
  version:AUTHORITATIVE_GOAL_DIRECTIVE_VERSION,
  status:latest?'USER_PINNED_ACTIVE_GOAL':'NO_EXPLICIT_USER_PINNED_GOAL',
  active_goal_id:latest?.goal_id||null,
  active_goal_text:latest?.goal_text||null,
  active_goal_user_source_ref:latest?.user_message_source_ref||null,
  active_goal_directive_id:latest?.directive_id||null,
  explicit_user_pin_count:directives.length,
  earlier_user_goals_recoverable:true,
  modeled_goal_interpretations_do_not_mutate_this:true,
  changing_conversation_topic_does_not_mutate_this:true,
  action_execution_authorized:false,
  business_completion_verified:false,
  // Storage read-before-write isn't an atomic state CAS. Do not claim a
  // concurrency-proof authorization mechanism for consequential revisions.
  atomic_compare_and_swap_verified:false,
  irreversible_or_automated_goal_mutations_supported:false,
 });
}
export async function commitAuthenticatedGoalPin({
 continuityRuntime,directive,secret,subjectUserId,conversationId,
}={}){
 if(!continuityRuntime?.enabled||typeof continuityRuntime.readback!=='function'||
    typeof continuityRuntime.appendStage!=='function')
  throw Error('ACTIVE_GOAL_DURABLE_CONTINUITY_REQUIRED');
 const root=continuityRuntime.spine.continuity_root_id;
 verifiedDirective(directive,secret,root,directive.world_id);
 if(directive.subject_user_id!==subjectUserId||
    directive.conversation_id!==conversationId)
  throw Error('ACTIVE_GOAL_SERVER_SESSION_MISMATCH');
 const before=await continuityRuntime.readback();
 // A replay of an already committed source message is not another user
 // authorization. It must never silently overwrite current goal state.
 if(before.some(e=>e.payload?.event_type==='AUTHORIZED_USER_GOAL_DIRECTIVE'&&
     e.payload.directive?.directive_id===directive.directive_id))
  throw Error('ACTIVE_GOAL_DUPLICATE_USER_DIRECTIVE');
 const event=await continuityRuntime.appendStage({
  stage:'OBSERVATION',entityId:directive.goal_id,
  eventId:'reality:authorized-goal:'+directive.directive_id,
  evidenceRefs:[directive.user_message_source_ref],
  epistemicStatus:'USER_DIRECTIVE_OBSERVED',
  observedAt:directive.issued_at,
  payload:{event_type:'AUTHORIZED_USER_GOAL_DIRECTIVE',directive,
    source_is_verified_user_utterance_not_external_truth:true,
    assistant_authority:false,execution_authorized:false},
  provenance:{source:'authenticated_private_chat_explicit_user_pin'},
 });
 const after=await continuityRuntime.readback();
 const matching=after.filter(x=>x.event_id===event.event_id&&
  x.payload?.directive?.directive_id===directive.directive_id&&
  x.payload?.directive?.issuer_mac===directive.issuer_mac);
 if(matching.length!==1)
  throw Error('ACTIVE_GOAL_DIRECTIVE_DURABLE_READBACK_FAILED');
 const current=projectAuthoritativeActiveGoal({
  history:after,continuityRootId:root,worldId:directive.world_id,
  subjectUserId,conversationId,secret,
 });
 if(current.active_goal_directive_id!==directive.directive_id)
  throw Error('ACTIVE_GOAL_DIRECTIVE_SUPERSEDED_BEFORE_CONFIRMATION');
 return freeze({status:'COMMITTED_AND_READBACK',event_id:event.event_id,
  goal_id:directive.goal_id,directive_id:directive.directive_id,
  goal_state:current});
}
