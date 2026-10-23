// Base44-independent entrypoint to the EXISTING Reality cognition, Universe,
// Continuity Ledger and Integrity Spine. Server-owned identity and evidence.
// This is a preview pilot until the full frontend/data migration is verified.
import {createUniverseEntry} from './reality-universe-persistence-contract-v1.0.js';
import {persistUniverseEntry,retrievePersistedUniverse} from './reality-native-universe-persistence-v1.0.js';
import {runLiveIntelligenceOrchestration} from './reality-live-intelligence-orchestration-v0.1.js';
import {verifyStandaloneUser,createStandaloneConversationScope,
 rejectUnsafeStandalonePayload,scopedTurnEntryId,requireStandaloneReady,
 STANDALONE_HISTORY_PROVENANCE} from './reality-standalone-auth-v0.1.js';

export const STANDALONE_CHAT_VERSION='reality-standalone-chat-v0.1';
const error=(code,status=400)=>{const e=new Error(code);e.status=status;return e};
function makeTurnEntry({scope,turnId,role,text,displayText,observedAt}){
 return createUniverseEntry({
  entry_id:scopedTurnEntryId({root:scope.continuity_root_id,turnId,role}),
  continuity_root_id:scope.continuity_root_id,
  worldline_id:scope.worldline_id,
  event_kind:'AUTHENTICATED_CONVERSATION_MESSAGE',
  epistemic_kind:'OBSERVATION',
  assertion_time:observedAt,
  effective_time:observedAt,
  source_ref:'reality:authenticated:customer-conversation',
  payload:{
   role,text,
   // Preserve both the model's raw words for drift analysis and what the
   // customer actually saw (which may include an integrity notice).
   ...(role==='assistant'&&typeof displayText==='string'?{display_text:displayText}:{}),
   // A customer utterance is evidence of intent, not external-world truth.
   epistemic_status:role==='user'?'USER_ASSERTED_INTENT':'MODEL_OUTPUT_UNVERIFIED',
   turn_id:turnId,principal_id:scope.authenticated_user_id,
  },
  evidence_references:[],
  provenance:{
   source:STANDALONE_HISTORY_PROVENANCE,
   authenticated_user_id:scope.authenticated_user_id,
   owner_scoped_root:scope.continuity_root_id,
   authority_granted:false,
  },
 });
}
export function reconstructStandaloneHistory({entries,scope}={}){
 if(!Array.isArray(entries)||!scope?.continuity_root_id)
  throw error('STANDALONE_HISTORY_INVALID',503);
 const retained=entries.filter(e=>
  e.event_kind==='AUTHENTICATED_CONVERSATION_MESSAGE'&&
  e.continuity_root_id===scope.continuity_root_id&&
  e.worldline_id===scope.worldline_id&&
  e.provenance?.source===STANDALONE_HISTORY_PROVENANCE&&
  e.provenance?.authenticated_user_id===scope.authenticated_user_id&&
  e.payload?.principal_id===scope.authenticated_user_id&&
  ['user','assistant'].includes(e.payload?.role)&&
  typeof e.payload?.text==='string');
 // Same-millisecond writes are legitimate: do NOT sort a hashed assistant
 // message before the user instruction that caused it. Group each turn by
 // its durable user message, with user before its matching model reply.
 const usersByTurn=new Map(retained.filter(e=>e.payload.role==='user')
   .map(e=>[e.payload.turn_id,e]));
 const turnTimestamp=e=>Date.parse((usersByTurn.get(e.payload.turn_id)||e).assertion_time);
 return retained.sort((a,b)=>turnTimestamp(a)-turnTimestamp(b)||
   (a.payload.turn_id===b.payload.turn_id
     ? (a.payload.role==='user'?-1:1)-(b.payload.role==='user'?-1:1)
     : String(a.payload.turn_id).localeCompare(String(b.payload.turn_id)))||
   a.entry_id.localeCompare(b.entry_id))
  .slice(-60).map(e=>Object.freeze({
   role:e.payload.role,text:e.payload.text.slice(0,12000),
   display_text:String(e.payload.display_text||e.payload.text).slice(0,16000),
   source_ref:'reality:universe:'+e.entry_id,
  }));
}
export async function processStandaloneChat(req,{
 fetchImpl=fetch,env=process.env,
 load=retrievePersistedUniverse,store=persistUniverseEntry,
 run=runLiveIntelligenceOrchestration,
 now=()=>new Date().toISOString(),
}={}){
 if(env.REALITY_STANDALONE_CHAT_ENABLED!=='true')
  throw error('STANDALONE_CHAT_DISABLED',503);
 if(env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true')
  throw error('STANDALONE_DURABILITY_REQUIRED',503);
 requireStandaloneReady(env);
 const principal=await verifyStandaloneUser(req,{fetchImpl,env});
 const input=rejectUnsafeStandalonePayload(req.body);
 const scope=createStandaloneConversationScope({
  userId:principal.user_id,conversationId:input.conversationId,
  thoughtId:input.thoughtId,
 });
 // No global scan or client-supplied history: the server selects one owner root.
 const stored=await load({continuityRootId:scope.continuity_root_id,
  worldlineId:scope.worldline_id,
  // Conversation-only index: other Universe events must not age out dialogue.
  eventKind:'AUTHENTICATED_CONVERSATION_MESSAGE',limit:80,fetchImpl});
 if(stored?.status!=='AVAILABLE'||!Array.isArray(stored.entries))
  throw error('STANDALONE_LEDGER_UNAVAILABLE',503);
 const history=reconstructStandaloneHistory({entries:stored.entries,scope});
 const userEntryId=scopedTurnEntryId({
  root:scope.continuity_root_id,turnId:input.turnId,role:'user'});
 if(stored.entries.some(x=>x.entry_id===userEntryId))
  throw error('STANDALONE_TURN_ID_ALREADY_USED',409);
 const observedAt=now();
 const accepted=await store(makeTurnEntry({
  scope,turnId:input.turnId,role:'user',
  text:input.message,observedAt,
 }),{fetchImpl});
 // A competing duplicate must NOT enter model cognition as a new user turn.
 if(accepted?.status!=='PERSISTED'||
     accepted?.entry?.entry_id!==userEntryId)
  throw error('STANDALONE_USER_MESSAGE_NOT_DURABLY_CONFIRMED',503);
 const result=await run({
  message:input.message,requestedBy:principal.user_id,
  // Explicit preview-only model credential; never inherit production's OPENAI_API_KEY.
  model:env.REALITY_OPENAI_MODEL,
  apiKey:env.REALITY_STANDALONE_OPENAI_API_KEY,
  systemContext:{
   ...scope,
   authenticated_conversation_turns:history,
   // Explicitly avoid accepting browser supplied external facts.
   universe_entries:[],connected_world_observations:[],
   verified_conversation_context:history.map(x=>x.role.toUpperCase()+': '+x.text).join('\n'),
  },
  fetchImpl,
 });
 // The receipt, not the model's own wording, establishes durability.
 if(result?.context?.continuity?.root_id!==scope.continuity_root_id ||
    result?.context?.continuity?.cognitive_readback_verified!==true ||
    result?.context?.continuity?.signal_handoff_status!=='STORED_AND_READ_BACK')
  throw error('STANDALONE_COGNITION_NOT_DURABLY_CONFIRMED',503);
 const rawAnswer=result?.intelligence?.raw_model_answer;
 const displayedAnswer=result?.intelligence?.answer;
 if(typeof rawAnswer!=='string'||!rawAnswer.trim()||
    typeof displayedAnswer!=='string')
  throw error('STANDALONE_RESPONSE_MISSING',503);
 const assistantEntryId=scopedTurnEntryId({
  root:scope.continuity_root_id,turnId:input.turnId,role:'assistant'});
 const assistant=await store(makeTurnEntry({
  scope,turnId:input.turnId,role:'assistant',text:rawAnswer,
  displayText:displayedAnswer,observedAt:now(),
 }),{fetchImpl});
 if(assistant?.status!=='PERSISTED'||
    assistant?.entry?.entry_id!==assistantEntryId)
  throw error('STANDALONE_ASSISTANT_MESSAGE_NOT_DURABLY_CONFIRMED',503);
 return Object.freeze({
  ok:true,version:STANDALONE_CHAT_VERSION,
  response:displayedAnswer,
  result,
  identity_basis:scope.identity_basis,
  continuity_root_id:scope.continuity_root_id,
  receipt:{
   user_message_entry_id:userEntryId,
   assistant_message_entry_id:assistantEntryId,
   cognition_ledger_event_id:result.context.continuity.event_id,
   cognitive_readback_verified:true,
   history_window_count:history.length,
   history_is_complete:false,
  },
  external_action_executed:false,
 });
}


// Read-only history endpoint. Uses exactly the same verified principal and
// root selection as the chat POST; raw model text stays in the durable ledger,
// while the history UI gets the exact displayed answer.
export async function getStandaloneConversationHistory(req,{
  fetchImpl=fetch,env=process.env,load=retrievePersistedUniverse,
}={}){
  if(env.REALITY_STANDALONE_CHAT_ENABLED!=='true')
    throw error('STANDALONE_CHAT_DISABLED',503);
  if(env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true')
    throw error('STANDALONE_DURABILITY_REQUIRED',503);
  requireStandaloneReady(env);
  const principal=await verifyStandaloneUser(req,{fetchImpl,env});
  const q=req?.query||{};
  if(!q||typeof q!=='object'||Array.isArray(q)||
     Object.keys(q).some(k=>!['conversation_id','thought_id'].includes(k)))
    throw error('STANDALONE_HISTORY_SELECTOR_INVALID');
  const scope=createStandaloneConversationScope({
    userId:principal.user_id,
    conversationId:q.conversation_id,
    thoughtId:q.thought_id===undefined?'personal':q.thought_id,
  });
  const historyRows=await load({
    continuityRootId:scope.continuity_root_id,
    worldlineId:scope.worldline_id,
    eventKind:'AUTHENTICATED_CONVERSATION_MESSAGE',
    limit:80,fetchImpl,
  });
  if(historyRows?.status!=='AVAILABLE'||!Array.isArray(historyRows.entries))
    throw error('STANDALONE_LEDGER_UNAVAILABLE',503);
  const history=reconstructStandaloneHistory({entries:historyRows.entries,scope});
  return Object.freeze({
    ok:true,version:STANDALONE_CHAT_VERSION,
    continuity_root_id:scope.continuity_root_id,
    messages:history.map(h=>Object.freeze({
      role:h.role,text:h.display_text,source_ref:h.source_ref,
    })),
    displayed_history_not_full_ledger:true,
    history_is_complete:false,
    bounded_message_window:60,
  });
}
