// Reality's proportional, READ-ONLY Chat lane: existing Signal Cleaner
// -> existing cognitive model gateway. Read-only intelligence is permitted
// without creating another shift, job, installation or authority engine.
// Final saved-reply authority remains the existing atomic owner/goal CAS
// in /api/reality/personal-chat. This module has NO provider write tools.
import {buildGovernedChatSignal}
 from './reality-governed-fragmented-signal-cleaner-v0.1.js';
import {runRealityCognitiveRuntime}
 from './reality-cognitive-runtime-v1.0.js';

const ACTION=/^(?:(?:reality[, :]+|please\s+|go ahead and\s+|i (?:want|need) you to\s+|can you\s+){0,2})(?:start|run|execute|install|deploy|merge|publish|send|transfer|delete|pay|purchase|authorize|approve|build|code|fix|upgrade|schedule|create)\b/i;
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const SOURCE=/^supabase:reality_chat_messages:[0-9a-f-]{36}$/i;
const fail=code=>{throw Error('CHAT_READ_ONLY_'+code)};
export function isProportionalReadOnlyChat({message,goalCommand=null,publicResearch=false}={}){
 return goalCommand==null&&publicResearch!==true&&
  typeof message==='string'&&message.trim().length>0&&
  !ACTION.test(message.trim());
}
export async function generateProportionalReadOnlyReply({
 message,conversationId,requestId,ownerId,sourceRef,
 verifiedPriorTurns=[],worldlineId,ownerContext=null,
 verifiedUniverseObservations=[],apiKey,model='gpt-4.1-mini',
 runtime=runRealityCognitiveRuntime
}={}){
 if(typeof message!=='string'||!message.trim()||
    !UUID.test(conversationId||'')||!UUID.test(requestId||'')||
    !UUID.test(ownerId||'')||!SOURCE.test(sourceRef||'')||
    typeof apiKey!=='string'||apiKey.length<20||
    typeof runtime!=='function'||!Array.isArray(verifiedPriorTurns)||
    !Array.isArray(verifiedUniverseObservations)||
    verifiedUniverseObservations.length>150)
  fail('TRUSTED_CURRENT_TURN_REQUIRED');
 const prior=verifiedPriorTurns.filter(t=>
  ['user','assistant'].includes(t?.role)&&
  typeof t.text==='string'&&
  t.text.length<=12000&&
  UUID.test(t.request_id||'')&&
  SOURCE.test(t.source_ref||'')).slice(-18).map(t=>({
   role:t.role,text:t.text,source_ref:t.source_ref,
   request_id:t.request_id
  }));
 const signal=buildGovernedChatSignal({message,observedAt:new Date().toISOString()});
 const result=await runtime({
  message,governedSignal:signal,
  systemContext:{
   conversation_id:conversationId,
   worldline_id:worldlineId,
   current_owner_request_id:requestId,
   exact_authenticated_user_source_ref:sourceRef,
   current_message_authenticated:true,
   conversation_continuity:{
    status:'AUTHENTICATED_SAVED_CONVERSATION_HISTORY',
    source:'OWNER_RLS_READBACK',
    recent_exchanges:prior
   },
   owner_business_context:ownerContext,
   governance_proportionality:{
    mode:'READ_ONLY_CONVERSATION',
    answer_and_planning_allowed_without_new_job_or_shift:true,
    missing_worker_authorization_does_not_forbid_a_chat_answer:true,
    existing_work_authority_not_extended:true,
    external_actions_authorized:false,
    execution_authorized:false,
    installation_authorized:false,
    source_independent_verification_not_inferred_from_model:true
   }
  },
  universeEntries:verifiedUniverseObservations.slice(0,90),
  cognitionEffort:'CONVERSATION',model,apiKey,
  publicResearchEnabled:false
 });
 if(result?.mode!=='FAST'||result?.authority_granted!==false||
    result?.execution_authorized!==false||
    typeof result.answer!=='string'||!result.answer.trim()||
    result.answer.length>12000)
  fail('MODEL_OUTPUT_OR_EXECUTION_BOUNDARY_UNVERIFIED');
 return Object.freeze({
  status:'READ_ONLY_AUTHENTICATED_MODEL_REPLY_PREPARED',
  answer:result.answer,model:result.model||model,
  semantic_correctness_independently_verified:false,
  independent_business_outcome_verified:false,
  external_actions_authorized:false,
  execution_authorized:false,installation_authorized:false
 });
}
