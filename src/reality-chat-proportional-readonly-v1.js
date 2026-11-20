// Reality's proportional, READ-ONLY Chat lane: existing Signal Cleaner
// -> existing cognitive model gateway. Read-only intelligence is permitted
// without creating another shift, job, installation or authority engine.
// Final saved-reply authority remains the existing atomic owner/goal CAS
// in /api/reality/personal-chat. This module has NO provider write tools.
import {buildGovernedChatSignal}
 from './reality-governed-fragmented-signal-cleaner-v0.1.js';
import {runRealityCognitiveRuntime}
 from './reality-cognitive-runtime-v1.0.js';

// Questions about capability or feasibility are conversation, not execution.
// The independently authenticated work-intake adapter still classifies saved
// instructions and enforces the exact approval gate; Chat must answer without
// borrowing that adapter's authority or waiting for full operational replay.
const ACTION=/^(?:(?:reality[, :]+|please\s+|go ahead and\s+|i (?:want|need) you to\s+){0,2})(?:start|run|execute|install|deploy|merge|publish|send|transfer|delete|pay|purchase|authorize|approve|build|code|fix|upgrade|schedule|create)\b/i;
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const SOURCE=/^supabase:reality_chat_messages:[0-9a-f-]{36}$/i;
const fail=code=>{throw Error('CHAT_READ_ONLY_'+code)};

// The read-only model has no execution tools. Treat claims of actions taken
// during *this* Chat turn as unsupported unless an independent provider receipt
// is explicitly returned by a separate work adapter. Historical quotations and
// suggestions are not authority. Reconcile the saved owner shift before any
// model-authored claim that the owner must start or authorize a new shift.
export function reconcileReadOnlyOperationalAnswer({answer,ownerContext}={}){
 const a=String(answer||'');
 const s=ownerContext?.currently_authorized_shift;
 const active=s?.owner_shift_authorization_recorded===true&&
  s?.shift_start_command_already_satisfied===true&&
  ['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK'].includes(s.shift_status)&&
  UUID.test(s.active_owner_shift_id||'')?
  s.active_owner_shift_id:null;
 const unsupportedRun=
  /\b(?:sandbox(?:ed)? (?:deployment )?simulation|simulation results|independent (?:acceptance )?tests?|test assertions|production installation)\b[^.!?\n]{0,150}\b(?:completed|passed|verified|executed|succeeded|successful|activated|installed|deployed)\b/i.test(a)||
  /\b(?:completed|passed|verified|executed|succeeded|successful|activated|installed|deployed)\b[^.!?\n]{0,150}\b(?:sandbox(?:ed)? (?:deployment )?simulation|simulation results|independent (?:acceptance )?tests?|test assertions|production installation)\b/i.test(a);
 const unsupportedPromise=
  /\b(?:I|we|Reality)\s+(?:will now|am now|are now|have now)\s+(?:prepare and )?(?:run|execute|deploy|install|activate|simulate|initiate)\b/i.test(a);
 const unsupportedApproval=
  /\b(?:owner |installation |production )?approval\s+(?:has been|was|is)\s+(?:recorded|verified|granted|received|confirmed)\b/i.test(a);
 const contradictedShift=active!==null&&
  /\b(?:no|not an?)\s+(?:authorized\s+)?(?:active\s+)?(?:shift|owner shift)\s+(?:exists|is available|is running|has been authorized)\b/i.test(a);
 const unnecessaryShift=active!==null&&
  /\b(?:start|schedule|authorize|approve)\s+(?:an?\s+)?(?:new\s+)?(?:authorized\s+)?shift\b/i.test(a)&&
  /\b(?:must|need|require|first|next step|formal)\b/i.test(a);
 if(!unsupportedRun&&!unsupportedPromise&&!unsupportedApproval&&
    !contradictedShift&&!unnecessaryShift)
  return Object.freeze({answer:a,disposition:'CONVERSATIONAL_CLAIMS_UNCHANGED'});
 const truth=active?
  'The existing owner-authorized shift '+active+
  ' is open. It does not need a second start or shift approval for work already covered by its warrant.':
  'I cannot verify an active signed shift from the owner-scoped evidence available to this Chat turn.';
 return Object.freeze({
  answer:truth+' This Chat response did not run a sandbox simulation, install code, record an approval event or independently verify an operational result. '+
   'Existing owner permission and source-backed work should be reconciled by the governed executor against the exact scoped warrant and any tested installation artifact. '+
   'I can explain the next evidence-backed action, but must not claim it has executed without a provider and ledger receipt.',
  disposition:'UNSUPPORTED_OPERATIONAL_CLAIM_REPLACED_WITH_OWNER_SCOPED_TRUTH'
 });
}
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
    typeof apiKey!=='string'||!apiKey.trim()||
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
    source_message_count:prior.length,
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
  answer:reconcileReadOnlyOperationalAnswer({answer:result.answer,ownerContext}).answer,
  model:result.model||model,
  semantic_correctness_independently_verified:false,
  independent_business_outcome_verified:false,
  external_actions_authorized:false,
  execution_authorized:false,installation_authorized:false
 });
}
