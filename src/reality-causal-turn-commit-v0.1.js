// Reality Causal Turn Commit Contract v0.1
// The user record, cognition event and displayed assistant reply are independent
// immutable entries. A "successful response" is NOT a terminal state until a
// separately read-back TURN_COMMITTED receipt links all three.
// No automatic rerun from a partially committed turn: that would permit
// double billing, duplicate execution claims, and conflicting model answers.
import {createHash} from 'node:crypto';
import {createUniverseEntry,validateUniverseEntry} from './reality-universe-persistence-contract-v1.0.js';
import {persistUniverseEntry,retrieveOptionalPersistedUniverseEntry} from './reality-native-universe-persistence-v1.0.js';
import {runLiveIntelligenceOrchestration} from './reality-live-intelligence-orchestration-v0.1.js';
import {processStandaloneChat,getStandaloneConversationHistory} from './reality-standalone-chat-v0.1.js';
import {verifyStandaloneUser,createStandaloneConversationScope,scopedTurnEntryId,
 rejectUnsafeStandalonePayload,requireStandaloneReady,STANDALONE_HISTORY_PROVENANCE} from './reality-standalone-auth-v0.1.js';

export const CAUSAL_TURN_CONTRACT_VERSION='reality-causal-turn-commit-v0.1';
export const CAUSAL_TURN_KIND='REALITY_CAUSAL_TURN_RECEIPT';
const knownPhases=['PROCESSING','INTERRUPTED','COMMITTED'];
const fail=(code,status=503)=>{const e=new Error(code);e.status=status;return e;};
function idFor(root,turnId,phase){
 if(!knownPhases.includes(phase))throw fail('CAUSAL_TURN_PHASE_INVALID');
 return 'reality:turn:'+createHash('sha256')
  .update(JSON.stringify([root,turnId,phase])).digest('hex');
}
export function causalTurnIds(scope,turnId){
 if(!scope?.continuity_root_id||typeof turnId!=='string'||
    !/^[A-Za-z0-9:_-]{1,96}$/.test(turnId))
  throw fail('CAUSAL_TURN_SELECTOR_INVALID',400);
 const root=scope.continuity_root_id;
 return Object.freeze({
  user:scopedTurnEntryId({root,turnId,role:'user'}),
  assistant:scopedTurnEntryId({root,turnId,role:'assistant'}),
  processing:idFor(root,turnId,'PROCESSING'),
  interrupted:idFor(root,turnId,'INTERRUPTED'),
  committed:idFor(root,turnId,'COMMITTED'),
 });
}
export function makeCausalTurnReceipt({scope,turnId,phase,observedAt,payload}){
 const ids=causalTurnIds(scope,turnId);
 if(!knownPhases.includes(phase))throw fail('CAUSAL_TURN_PHASE_INVALID');
 if(!payload||typeof payload!=='object')throw fail('CAUSAL_TURN_EVIDENCE_REQUIRED');
 const phaseId=ids[phase.toLowerCase()];
 return createUniverseEntry({
  entry_id:phaseId,continuity_root_id:scope.continuity_root_id,
  worldline_id:scope.worldline_id,
  event_kind:CAUSAL_TURN_KIND,epistemic_kind:'OBSERVATION',
  assertion_time:observedAt,effective_time:observedAt,
  source_ref:'reality:causal-turn-commit-contract',
  payload:{
   ...payload,
   // These identity and authority fields are structural, not caller-writable.
   version:CAUSAL_TURN_CONTRACT_VERSION,phase,turn_id:turnId,
   authenticated_user_id:scope.authenticated_user_id,
   authority_granted:false,truth_authorized:false,
   action_authorized:false,external_action_executed:false,
  },
  evidence_references:[
   ...[payload.user_message_hash,payload.assistant_message_hash,
      payload.cognition_ledger_hash].filter(Boolean),
  ],
  provenance:{source:STANDALONE_HISTORY_PROVENANCE,
   authenticated_user_id:scope.authenticated_user_id,
   owner_scoped_root:scope.continuity_root_id,
   authority_granted:false},
 });
}
function checked(row,scope,turnId,id,kind){
 if(row==null)return null;
 validateUniverseEntry(row);
 if(row.entry_id!==id||row.continuity_root_id!==scope.continuity_root_id||
   row.worldline_id!==scope.worldline_id||
   row.provenance?.source!==STANDALONE_HISTORY_PROVENANCE||
   row.provenance?.authenticated_user_id!==scope.authenticated_user_id||
   (kind==='message'&&row.event_kind!=='AUTHENTICATED_CONVERSATION_MESSAGE')||
   (kind==='phase'&&row.event_kind!==CAUSAL_TURN_KIND)||
   row.payload?.turn_id!==turnId)
  throw fail('CAUSAL_TURN_SCOPE_OR_EVIDENCE_MISMATCH');
 return row;
}
export async function inspectCausalTurn({scope,turnId,
 lookup=retrieveOptionalPersistedUniverseEntry,fetchImpl=fetch}={}){
 const ids=causalTurnIds(scope,turnId);
 const read=async(id,kind)=>checked(await lookup({entryId:id,fetchImpl}),scope,turnId,id,kind);
 const user=await read(ids.user,'message');
 const committed=await read(ids.committed,'phase');
 // Exact identity checks include every phase, not just the two terminal IDs.
 // A corrupted/partially deleted ledger can never be labelled NOT_RECEIVED.
 const assistant=await read(ids.assistant,'message');
 const started=await read(ids.processing,'phase');
 const interrupted=await read(ids.interrupted,'phase');
 if(!user&&!committed){
  if(assistant||started||interrupted)
   throw fail('CAUSAL_TURN_ORPHANED_EVIDENCE');
  return Object.freeze({
   status:'NOT_RECEIVED',turn_id:turnId,committed:false,
   retry_policy:'NEW_TURN_ALLOWED_ONLY_IF_NO_DURABLE_EVIDENCE',
  });
 }
 if(!user){
  throw fail('CAUSAL_TURN_ORPHANED_COMMIT');
 }
 if(user.payload?.role!=='user'||typeof user.payload?.text!=='string')
  throw fail('CAUSAL_TURN_USER_EVIDENCE_INVALID');
 if(started && (started.payload.phase!=='PROCESSING'||
   started.payload.user_message_entry_id!==ids.user||
   started.payload.user_message_hash!==user.ledger_entry_hash))
  throw fail('CAUSAL_TURN_PROCESSING_EVIDENCE_MISMATCH');
 if(interrupted && interrupted.payload.phase!=='INTERRUPTED')
  throw fail('CAUSAL_TURN_INTERRUPTION_INVALID');
 if(assistant && (assistant.payload.role!=='assistant'||
   typeof assistant.payload.text!=='string'))
  throw fail('CAUSAL_TURN_ASSISTANT_EVIDENCE_INVALID');
 if(committed){
  if(!assistant||!started||committed.payload.phase!=='COMMITTED'||
    committed.payload.user_message_entry_id!==ids.user||
    committed.payload.assistant_message_entry_id!==ids.assistant||
    committed.payload.user_message_hash!==user.ledger_entry_hash||
    committed.payload.assistant_message_hash!==assistant.ledger_entry_hash||
    committed.payload.processing_receipt_entry_id!==ids.processing||
    committed.payload.processing_receipt_hash!==started.ledger_entry_hash||
    typeof committed.payload.cognition_ledger_event_id!=='string'||
    !committed.payload.cognition_ledger_event_id)
   throw fail('CAUSAL_TURN_COMMIT_CHAIN_BROKEN');
  const cognition=await lookup({
   entryId:committed.payload.cognition_ledger_event_id,fetchImpl,
  });
  if(!cognition)throw fail('CAUSAL_TURN_COGNITION_RECEIPT_MISSING');
  validateUniverseEntry(cognition);
  if(cognition.entry_id!==committed.payload.cognition_ledger_event_id||
     cognition.ledger_entry_hash!==committed.payload.cognition_ledger_hash||
     cognition.continuity_root_id!==scope.continuity_root_id||
     cognition.worldline_id!==scope.worldline_id)
   throw fail('CAUSAL_TURN_COGNITION_CHAIN_BROKEN');
  return Object.freeze({
   status:'COMMITTED',turn_id:turnId,committed:true,
   response:assistant.payload.display_text||assistant.payload.text,
   receipt:Object.freeze({
    user_message_entry_id:ids.user,
    assistant_message_entry_id:ids.assistant,
    processing_receipt_entry_id:ids.processing,
    cognition_ledger_event_id:cognition.entry_id,
    commit_entry_id:ids.committed,
    commit_entry_hash:committed.ledger_entry_hash,
    verified_chain:true,
   }),
   retry_policy:'READ_BACK_COMMITTED_RESULT_DO_NOT_REGENERATE',
  });
 }
 return Object.freeze({
  status:assistant?'RESPONSE_STORED_UNCOMMITTED':
   interrupted?'INTERRUPTED':started?'PROCESSING':'RECEIVED',
  turn_id:turnId,committed:false,
  evidence:Object.freeze({
   user_message_entry_id:ids.user,
   processing_receipt_entry_id:started?.entry_id||null,
   assistant_message_entry_id:assistant?.entry_id||null,
   interruption_recorded:Boolean(interrupted),
  }),
  retry_policy:'REQUIRES_RECONCILIATION_NO_AUTOMATIC_MODEL_RERUN',
 });
}
async function appendPhase({scope,turnId,phase,payload,store,lookup,fetchImpl,now}){
 const entry=makeCausalTurnReceipt({
  scope,turnId,phase,payload,observedAt:now(),
 });
 const saved=await store(entry,{fetchImpl});
 if(!['PERSISTED','DUPLICATE_IDENTICAL','DUPLICATE_IDENTICAL_CONCURRENT'].includes(saved?.status))
  throw fail('CAUSAL_TURN_'+phase+'_NOT_DURABLY_STORED');
 const readback=await lookup({entryId:entry.entry_id,fetchImpl});
 checked(readback,scope,turnId,entry.entry_id,'phase');
 if(readback?.ledger_entry_hash!==entry.ledger_entry_hash)
  throw fail('CAUSAL_TURN_'+phase+'_READBACK_MISMATCH');
 return readback;
}
export async function processCausalTurn(req,{
 env=process.env,fetchImpl=fetch,
 lookup=retrieveOptionalPersistedUniverseEntry,
 store=persistUniverseEntry,run=runLiveIntelligenceOrchestration,
 load,now=()=>new Date().toISOString(),
}={}){
 // Any failure before this check must have zero database or model effects.
 requireStandaloneReady(env);
 const principal=await verifyStandaloneUser(req,{fetchImpl,env});
 const input=rejectUnsafeStandalonePayload(req.body);
 const scope=createStandaloneConversationScope({
  userId:principal.user_id,conversationId:input.conversationId,
  thoughtId:input.thoughtId,
 });
 const existing=await inspectCausalTurn({scope,turnId:input.turnId,lookup,fetchImpl});
 if(existing.committed){
  // Prevent a user from retrieving an unrelated committed answer by guessing
  // a turn_id and supplying different text in the same conversation.
  const original=await lookup({entryId:causalTurnIds(scope,input.turnId).user,fetchImpl});
  if(original?.payload?.text!==input.message)
   throw fail('CAUSAL_TURN_ID_PAYLOAD_CONFLICT',409);
  return Object.freeze({
   ok:true,version:CAUSAL_TURN_CONTRACT_VERSION,
   response:existing.response,receipt:existing.receipt,
   continuity_root_id:scope.continuity_root_id,
   idempotent_replay:true,external_action_executed:false,
  });
 }
 if(existing.status!=='NOT_RECEIVED')
  throw fail('CAUSAL_TURN_RECOVERY_REVIEW_REQUIRED',409);
 let started=null;
 const wrappedRun=async args=>{
  const user=await lookup({entryId:causalTurnIds(scope,input.turnId).user,fetchImpl});
  checked(user,scope,input.turnId,causalTurnIds(scope,input.turnId).user,'message');
  if(!user)throw fail('CAUSAL_TURN_USER_RECORD_MISSING');
  started=await appendPhase({scope,turnId:input.turnId,phase:'PROCESSING',
   payload:{user_message_entry_id:user.entry_id,
    user_message_hash:user.ledger_entry_hash},
   store,lookup,fetchImpl,now});
  return run(args);
 };
 try{
  const reply=await processStandaloneChat(req,{
   env,fetchImpl,store,run:wrappedRun,now,
   ...(load?{load}:{}),
  });
  const ids=causalTurnIds(scope,input.turnId);
  const user=checked(await lookup({entryId:ids.user,fetchImpl}),
   scope,input.turnId,ids.user,'message');
  const assistant=checked(await lookup({entryId:ids.assistant,fetchImpl}),
   scope,input.turnId,ids.assistant,'message');
  if(!user||!assistant||!started||assistant.payload.text!==reply.result?.intelligence?.raw_model_answer||
    (assistant.payload.display_text||assistant.payload.text)!==reply.response)
   throw fail('CAUSAL_TURN_ASSISTANT_READBACK_MISMATCH');
  const cognitionId=reply.receipt?.cognition_ledger_event_id;
  if(typeof cognitionId!=='string'||!cognitionId)
   throw fail('CAUSAL_TURN_COGNITION_ID_MISSING');
  const cognition=await lookup({entryId:cognitionId,fetchImpl});
  if(!cognition)throw fail('CAUSAL_TURN_COGNITION_READBACK_MISSING');
  validateUniverseEntry(cognition);
  if(cognition.continuity_root_id!==scope.continuity_root_id||
    cognition.worldline_id!==scope.worldline_id)
   throw fail('CAUSAL_TURN_COGNITION_SCOPE_MISMATCH');
  await appendPhase({scope,turnId:input.turnId,phase:'COMMITTED',
   payload:{
    user_message_entry_id:ids.user,user_message_hash:user.ledger_entry_hash,
    assistant_message_entry_id:ids.assistant,assistant_message_hash:assistant.ledger_entry_hash,
    processing_receipt_entry_id:ids.processing,processing_receipt_hash:started.ledger_entry_hash,
    cognition_ledger_event_id:cognition.entry_id,cognition_ledger_hash:cognition.ledger_entry_hash,
   },store,lookup,fetchImpl,now});
  const verified=await inspectCausalTurn({scope,turnId:input.turnId,lookup,fetchImpl});
  if(!verified.committed)throw fail('CAUSAL_TURN_COMMIT_VERIFICATION_FAILED');
  return Object.freeze({
   ...reply,version:CAUSAL_TURN_CONTRACT_VERSION,
   receipt:Object.freeze({...reply.receipt,...verified.receipt,turn_commit_status:'COMMITTED'}),
   idempotent_replay:false,
  });
 }catch(cause){
  // Crash/power loss may prevent this diagnostic receipt. The incomplete
  // source records themselves must ALWAYS be enough to expose an open turn.
  try{
   const status=await inspectCausalTurn({scope,turnId:input.turnId,lookup,fetchImpl});
   if(!status.committed&&status.status!=='NOT_RECEIVED'){
    await appendPhase({scope,turnId:input.turnId,phase:'INTERRUPTED',
     payload:{error_code:/^[A-Z][A-Z0-9_]{3,120}$/.test(cause?.message||'')
      ?cause.message:'CAUSAL_TURN_PROCESS_INTERRUPTED'},
     store,lookup,fetchImpl,now});
   }
  }catch{ /* failure to report an interruption must not mask its cause */ }
  throw cause;
 }
}
export async function getCausalTurnStatus(req,{
 env=process.env,fetchImpl=fetch,lookup=retrieveOptionalPersistedUniverseEntry,
}={}){
 requireStandaloneReady(env);
 const principal=await verifyStandaloneUser(req,{fetchImpl,env});
 const q=req?.query;
 if(!q||typeof q!=='object'||Array.isArray(q)||
   Object.keys(q).some(k=>!['conversation_id','thought_id','turn_id'].includes(k)))
  throw fail('CAUSAL_TURN_STATUS_SELECTOR_INVALID',400);
 const scope=createStandaloneConversationScope({
  userId:principal.user_id,conversationId:q.conversation_id,
  thoughtId:q.thought_id??'personal',
 });
 const status=await inspectCausalTurn({
  scope,turnId:q.turn_id,lookup,fetchImpl,
 });
 return Object.freeze({ok:true,version:CAUSAL_TURN_CONTRACT_VERSION,
  continuity_root_id:scope.continuity_root_id,...status});
}


// The browser must never render an uncommitted assistant message as an
// approved reply. Authenticated history can include a user turn whose
// processing crashed; these remain visible as explicit unresolved work.
export async function getCommittedStandaloneHistory(req,{
 env=process.env,fetchImpl=fetch,
 load,lookup=retrieveOptionalPersistedUniverseEntry,
}={}){
 const transcript=await getStandaloneConversationHistory(req,{
  env,fetchImpl,...(load?{load}:{})
 });
 const principal=await verifyStandaloneUser(req,{env,fetchImpl});
 const q=req.query||{};
 const scope=createStandaloneConversationScope({
  userId:principal.user_id,conversationId:q.conversation_id,
  thoughtId:q.thought_id??'personal',
 });
 const ids=[...new Set(transcript.messages.map(m=>m.turn_id))];
 const statuses=new Map();
 // Concurrency is bounded to avoid overwhelming Supabase on long threads.
 for(let i=0;i<ids.length;i+=5){
  const slice=ids.slice(i,i+5);
  await Promise.all(slice.map(async turnId=>{
   statuses.set(turnId,await inspectCausalTurn({
    scope,turnId,lookup,fetchImpl,
   }));
  }));
 }
 const messages=transcript.messages.filter(m=>
  m.role==='user'||statuses.get(m.turn_id)?.committed===true);
 const unresolved=ids.filter(id=>statuses.get(id)?.committed!==true)
  .map(id=>Object.freeze({turn_id:id,status:statuses.get(id)?.status||'UNVERIFIED'}));
 return Object.freeze({
  ...transcript,
  messages:messages.map(m=>Object.freeze(m)),
  unresolved_turns:unresolved,
  assistant_messages_require_verified_commit:true,
  history_is_complete:false,
 });
}
