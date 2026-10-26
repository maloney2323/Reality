// Isolated, authenticated Personal Reality conversation. No customer actions.
import {authenticatedChatSession,privateChatConfig,assertSameOrigin} from '../../src/reality-private-chat-auth-v0.1.js';
import {readPrivateChat,recordPrivateMessage,publishPrivateAssistantAtomically,listPrivateConversations,validUuid} from '../../src/reality-private-chat-store-v0.1.js';
import {runLiveIntelligenceOrchestration} from '../../src/reality-live-intelligence-orchestration-v0.1.js';
import {resolveReliabilityBenchmarkDb} from '../../src/reality-reliability-db-boundary-v0.1.js';
import {createHash} from 'node:crypto';
import {startContinuityRuntime} from '../../src/reality-continuity-spine-runtime-v0.1.js';
import {buildGovernedChatSignal} from '../../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import {appendAuthenticatedUserGoalCommand,projectAuthoritativeUserGoals,
 compareAuthenticatedGoalSnapshots} from '../../src/reality-authoritative-user-goal-ledger-v0.1.js';
import {createUniversePostgresPersistence}
 from '../../src/reality-universe-postgres-persistence-v0.1.js';
import {createContinuitySpine}
 from '../../src/reality-continuity-spine-v2.0.js';
export const maxDuration=60;
function fail(code,status){const e=new Error(code);e.status=status;throw e}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 try{
  privateChatConfig();
  if(!['GET','POST'].includes(req.method))
   return res.status(405).setHeader('Allow','GET, POST').json({error:'METHOD_NOT_ALLOWED'});
  if(req.method==='POST')assertSameOrigin(req);
  const session=await authenticatedChatSession(req,res);
  if(!session)fail('CHAT_SIGN_IN_REQUIRED',401);
  if(req.method==='GET'&&String(req.query?.list||'')==='1')
   return res.status(200).json({ok:true,conversations:await listPrivateConversations(session)});
  const conversationId=String((req.method==='GET'?req.query?.conversation_id:req.body?.conversation_id)||'');
  if(!validUuid(conversationId))fail('CHAT_CONVERSATION_ID_INVALID',400);
  const history=await readPrivateChat(session,conversationId);
  if(req.method==='GET'){
   return res.status(200).json({ok:true,conversation_id:conversationId,
    messages:history.messages,continuity:{
     history_source:'AUTHENTICATED_SUPABASE_RLS',
     recovered_messages:history.messages.length,
     coverage:history.history_status,older_messages_may_be_missing:history.older_missing,
    }});
  }
  // Use the SAME canonical Continuity + Reliability pipeline as benchmarks,
  // but only on a configuration independently restricted to this signed-in
  // user's isolated preview project. Never silently fall back to unmonitored chat.
  if(process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
     process.env.REALITY_CONTINUOUS_RELIABILITY_ENABLED!=='true'||
     process.env.REALITY_SEMANTIC_REVIEW_ENABLED!=='true')
   fail('CHAT_UNIFIED_RELIABILITY_REQUIRED',503);
  const isolated=resolveReliabilityBenchmarkDb();
  if(!isolated||isolated.url!==session.config.url||
     isolated.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
    fail('CHAT_PRIVATE_LEDGER_SCOPE_MISMATCH',503);
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
   fail('CHAT_JSON_REQUIRED',415);
  const requestId=String(req.body?.request_id||''),text=String(req.body?.message||'').trim();
  if(!validUuid(requestId)||!text||text.length>6000)fail('CHAT_MESSAGE_INVALID',400);
  // This field originates only from the signed-in USER's explicit UI action,
  // never from the LLM, conversation text, reviewer or default prompt parser.
  const goalCommand=req.body?.goal_command;
  if(goalCommand!==undefined&&goalCommand!==null&&
     goalCommand!=='SET_ACTIVE'&&goalCommand!=='START_DETOUR')
   fail('CHAT_GOAL_COMMAND_NOT_SUPPORTED',400);
  // Stronger anti-CSRF requirement for durable user-goal changes. Ordinary
  // read-only chat can follow the existing session origin checks.
  if(goalCommand&&(!req.headers?.origin||
     req.headers?.['sec-fetch-site']==='cross-site'))
   fail('CHAT_GOAL_COMMAND_SAME_ORIGIN_REQUIRED',403);
  if(goalCommand&&text.length>700)
   fail('CHAT_GOAL_COMMAND_TEXT_TOO_LONG',400);
  const existing=history.messages.filter(m=>m.request_id===requestId);
  if(existing.length){
   const prior=existing.find(x=>x.role==='assistant');
   if(prior)return res.status(200).json({ok:true,conversation_id:conversationId,
     answer:prior.text,replayed:true,continuity:{coverage:history.history_status,
      recovered_messages:history.messages.length,older_messages_may_be_missing:history.older_missing}});
   fail('CHAT_REQUEST_ALREADY_IN_HISTORY',409);
  }
  const key=String(process.env.REALITY_STANDALONE_OPENAI_API_KEY||process.env.OPENAI_API_KEY||'');
  if(!key)fail('CHAT_MODEL_KEY_NOT_CONFIGURED',503);
  // Save the human utterance BEFORE any cognition, and do not hallucinate
  // continuity success when source persistence fails.
  const recordedUser=await recordPrivateMessage(session,{
   conversationId,requestId,role:'user',text,
  });
  // RLS readback is the authentication evidence for a USER goal directive.
  // A supplied model answer, client source_ref or username is never accepted.
  let verifiedUserGoalCommand=null;
  if(goalCommand){
   const verified=await readPrivateChat(session,conversationId);
   const saved=verified.messages.find(x=>x.role==='user'&&
    x.request_id===requestId&&x.source_ref===recordedUser.source_ref&&
    x.text===text);
   if(!saved)fail('CHAT_GOAL_SOURCE_READBACK_REQUIRED',503);
   verifiedUserGoalCommand={command:goalCommand,
    user_message:saved.text,source_ref:saved.source_ref,
    request_id:requestId};
  }
  // Root/world scope cannot be forged by the browser or shared across users.
  const scope=createHash('sha256').update(session.user_id+'|'+conversationId).digest('hex');
  const scopedRoot='personal:chat:'+scope;
  let goalCommandReceipt=null;
  if(verifiedUserGoalCommand){
   // Commit an authoritative CONVERSATIONAL GOAL only through existing
   // append-only Continuity, before the LLM sees the next state.
   const observedAt=new Date().toISOString();
   const writer=await startContinuityRuntime({
    continuityRootSource:scopedRoot,worldlineSource:scopedRoot,
    subjectId:conversationId,
    signal:buildGovernedChatSignal({
     message:'User explicitly selected ongoing goal for saved message '+requestId,
     observedAt,
    }),observedAt,
   });
   goalCommandReceipt=await appendAuthenticatedUserGoalCommand({
    continuityRuntime:writer,worldId:scopedRoot,principalId:session.user_id,
    command:verifiedUserGoalCommand.command,
    sourceUserMessage:verifiedUserGoalCommand.user_message,
    sourceUserMessageRef:verifiedUserGoalCommand.source_ref,
    sourceRequestId:verifiedUserGoalCommand.request_id,observedAt,
   });
   if(!goalCommandReceipt?.event_id||
      goalCommandReceipt.state?.active_goal?.source_user_message_ref!==
       verifiedUserGoalCommand.source_ref)
    fail('CHAT_AUTHORIZED_GOAL_READBACK_FAILED',503);
  }
  const result=await runLiveIntelligenceOrchestration({
   message:text,requestedBy:session.user_id,
   model:'gpt-4.1-mini',apiKey:key,
   systemContext:{conversation_id:conversationId,
    worldline_id:'personal:chat:'+scope,world_id:'personal:chat:'+scope,
    continuity_root_id:'personal:chat:'+scope,
    conversation_history_source:'AUTHENTICATED_SUPABASE_RLS',
    conversation_history_older_messages_may_be_missing:history.older_missing,
    action_authorized:false,execution_authorized:false,
   },
   verifiedConversationTurns:history.messages,
  });
  const answer=String(result?.intelligence?.answer||'').trim();
  if(!answer)fail('CHAT_MODEL_ANSWER_UNAVAILABLE',503);
  if(result?.reliability?.canonical_epistemic_state?.status!=='PERSISTED_AND_READBACK_VERIFIED'||
     result?.reliability?.readback_verified!==true)
   fail('CHAT_UNIFIED_RELIABILITY_READBACK_NOT_VERIFIED',503);
  // Defense-in-depth at the ACTUAL authenticated chat publication boundary.
  // Even a correct review of the first-pass goal state is stale when another
  // authenticated user-goal command changed the active objective meanwhile.
  // Always validate from an independently reconstructed, HMAC-attested
  // Continuity readback; never accept the client's or model's goal claims.
  const goalAtGeneration=result?.reliability?.goal_authority_contracts
    ?.authorized_user_goal_state;
  if(!goalAtGeneration)
   fail('CHAT_GOAL_AUTHORITY_SNAPSHOT_MISSING',503);
  const authoritySpine=createContinuitySpine({
    continuityRootId:scopedRoot,worldlineId:scopedRoot,
    subjectId:session.user_id,
  });
  const goalHistory=await createUniversePostgresPersistence({
    ...isolated,
  }).reconstruct({
    continuityRootId:authoritySpine.continuity_root_id,
    worldlineId:authoritySpine.worldline_id,
  });
  const currentGoal=projectAuthoritativeUserGoals({
    continuityHistory:goalHistory,
    continuityRootId:authoritySpine.continuity_root_id,
    worldId:scopedRoot,principalId:session.user_id,
  });
  const publicationGoal=compareAuthenticatedGoalSnapshots({
    expected:goalAtGeneration,current:currentGoal,
  });
  if(publicationGoal.status!=='USER_GOAL_SNAPSHOT_CURRENT')
   fail('CHAT_GOAL_CHANGED_DURING_COGNITION_RETRY_NEW_TURN',409);
  const atomicPublicationEnabled=
    process.env.REALITY_ATOMIC_GOAL_PUBLICATION_ENABLED==='true';
  const publication=atomicPublicationEnabled?
    await publishPrivateAssistantAtomically(session,{
      conversationId,requestId,text:answer,isolatedDb:isolated,
      expectedRevision:goalAtGeneration.transition_count,
      expectedLastEventId:goalAtGeneration.recent_transition_receipts.at(-1)?.event_id||null,
    }):
    // Legacy preview remains explicit about the unresolved two-request race.
    await recordPrivateMessage(session,{conversationId,requestId,role:'assistant',text:answer});
  const check=await readPrivateChat(session,conversationId);
  if(!check.messages.some(x=>x.role==='assistant'&&x.request_id===requestId&&x.text===answer))
   fail('CHAT_ASSISTANT_DURABILITY_NOT_VERIFIED',503);
  return res.status(200).json({ok:true,conversation_id:conversationId,answer,replayed:false,
   continuity:{history_source:'AUTHENTICATED_SUPABASE_RLS',
    recovered_messages:check.messages.length,coverage:check.history_status,
    older_messages_may_be_missing:check.older_missing,
    current_answer_persisted:true,
    goal_publication_atomicity:atomicPublicationEnabled&&
      publication?.atomic_goal_revision_checked===true?
      'ATOMIC_DATABASE_GOAL_REVISION_AND_ASSISTANT_INSERT':
      'LEGACY_FRESHNESS_CHECK_RACE_NOT_ELIMINATED'},
   goal_command_receipt:goalCommandReceipt?{
    status:'COMMITTED_TO_EXISTING_CONTINUITY',
    event_id:goalCommandReceipt.event_id,
    active_goal_id:goalCommandReceipt.state.active_goal_id,
    grants_execution_authority:false,
   }:null,
   reliability:{canonical_epistemic_state:result.reliability.canonical_epistemic_state,
     user_goal_continuity:result.reliability.user_goal_continuity||null,
     assistant_goal_governance:result.reliability.goal_governance||null,
     goal_authority:result.reliability.goal_authority||null,
     authoritative_user_goal_state:result.reliability.goal_authority_contracts?.authorized_user_goal_state||null,
     semantic_review_status:result.reliability.semantic_review?.status||'NOT_ASSESSED',
     semantic_review_provenance_status:result.reliability.semantic_review?.provenance_review_status||'NOT_ASSESSED',
     semantic_issue_candidates:(result.reliability.semantic_review?.issues||[]).map(issue=>({
       kind:issue.kind,quote:issue.quote,reason:issue.reason})),
     conversational_drift_findings_count:result.reliability.conversational_assessment?.findings_count||0,
     goal_drift_coverage:result.reliability.conversational_assessment?.goal_drift_coverage||{
       status:'NOT_SEMANTICALLY_ASSESSED',candidate_count_zero_means_drift_free:false,
       independently_verified_drift_rate:null},
     intervention:result.intelligence?.reliability_intervention||null,
     corrected_goal_alignment:result.reliability.semantic_repair?.revised_goal_alignment?
       {status:result.reliability.semantic_repair.revised_goal_alignment.status,
        reviewer_goal_source_ref:result.reliability.semantic_repair.revised_goal_alignment.reviewed_goal_source_ref,
        independently_verified_correction:false,
        external_action_authorized:false}:null,
     independently_verified_semantic_correctness:false,
   },
   execution:{status:'NOT_EXECUTED',external_actions_authorized:false}});
 }catch(e){
  const status=Number(e.status)||503;
  return res.status(status).json({ok:false,error:e.message||'CHAT_UNAVAILABLE'});
 }
}
