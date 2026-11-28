// Isolated, authenticated Personal Reality conversation. No customer actions.
import {authenticatedChatSession,privateChatConfig,assertSameOrigin} from '../../src/reality-private-chat-auth-v0.1.js';
import {readPrivateChat,readPrivateChatRequest,recordPrivateMessage,publishPrivateAssistantAtomically,readPrivateChatGoalPublicationEpoch,listPrivateConversations,validUuid,resolvePrivateConversationDatabase,publishPrivateConversationReply} from '../../src/reality-private-chat-store-v0.1.js';
import {runLiveIntelligenceOrchestration} from '../../src/reality-live-intelligence-orchestration-v0.1.js';
import {isProportionalReadOnlyChat,generateProportionalReadOnlyReply}
 from '../../src/reality-chat-proportional-readonly-v1.js';
import {collectOptionalChatEvidence} from '../../src/reality-chat-optional-evidence-v1.js';
import {readOperationalSelfVisibilityForChat,projectChatOperationalHorizon,
 needsRealityCapabilityInspection,reconcileOwnerOriginalStatesForChat}
 from '../../src/reality-chat-self-visibility-v1.js';
import {projectOwnerRealityUniverseForChat}
 from '../../src/reality-chat-universe-cognitive-projection-v1.js';
import {readOwnerTimeHorizonEvidence}
 from './personal-time-horizon.js';
import {resolveReliabilityBenchmarkDb} from '../../src/reality-reliability-db-boundary-v0.1.js';
import {readVerifiedMarketStageForChat}
 from '../../src/reality-market-stage-chat-context-v1.js';
import {readVerifiedResearchUpgradeForChat}
 from '../../src/reality-verified-repair-chat-context-v1.js';
import {readVerifiedEmployeeShiftForChat,readVerifiedRealityCompanyWorkforceForChat,readVerifiedRileySourceWorkForChat,readVerifiedWeeklyWorkloadForChat}
 from '../../src/reality-employee-shift-chat-context-v1.js';
import {readVerifiedNative263TemporalForChat}
 from '../../src/reality-native263-temporal-chat-context-v1.js';
import {readVerifiedOwnerCompletedWorkForChat}
 from '../../src/reality-owner-completed-work-chat-context-v1.js';
import {buildRealityProposedEmployeeRoleDiscussionContext}
 from '../../src/reality-employee-identity-roster-v1.js';
import {readVerifiedIndependentWorkerForChat}
 from '../../src/reality-independent-worker-chat-context-v1.js';
import {summarizeSavedChatReplyReadback} from '../../src/reality-saved-chat-reply-readback-v1.js';
import {readOwnerChatWorkHandoff} from '../../src/reality-private-chat-work-readback-v1.js';
import {readOwnerOperationalIncidentChatBriefing,incidentChatUniverseObservations}
 from '../../src/reality-owner-operational-incident-chat-v1.js';
import {readOwnerOriginalWorkForChat,originalWorkObservation,
 readOwnerWeeklyCandidateQueueForChat,weeklyQueueObservation,
 scopeOwnerOriginalWorkToShift}
 from '../../src/reality-owner-original-work-chat-readback-v1.js';
import {createHash} from 'node:crypto';
import {resolvePrivateChatContinuity} from '../../src/reality-private-chat-continuity-recovery-v1.js';
import {isPublicResearchRequest,publishedReferencesForChat} from '../../src/reality-chat-research-bridge-v1.js';
import {assertFinalChatPublicationProof,summarizeOutputClaimAssessment,recordReadOnlyOutputClaimAssessment,requiresSourceRenderedOperationalReply}
 from '../../src/reality-final-chat-publication-proof-v0.1.js';
import {startContinuityRuntime} from '../../src/reality-continuity-spine-runtime-v0.1.js';
import {buildGovernedChatSignal} from '../../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import {appendAuthenticatedUserGoalCommand,projectAuthoritativeUserGoals,
 compareAuthenticatedGoalSnapshots} from '../../src/reality-authoritative-user-goal-ledger-v0.1.js';
import {createUniversePostgresPersistence}
 from '../../src/reality-universe-postgres-persistence-v0.1.js';
import {createContinuitySpine}
 from '../../src/reality-continuity-spine-v2.0.js';
import {readFreshPersonalAccountMissionState}
 from '../../src/reality-personal-goal-readback-v0.1.js';
export const maxDuration=60;
function fail(code,status){const e=new Error(code);e.status=status;throw e}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const chatStartedAt=Date.now();
 let stage='AUTHENTICATION';
 let optionalContextWaitMs=null;
 let governedCognitionMs=null;
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
  stage='AUTHENTICATED_HISTORY';
  // Automatic owner-only operational incident read, no model or write.
  if(req.method==='GET'&&String(req.query?.incident_readback||'')==='1'){
   const result=await readOwnerOperationalIncidentChatBriefing({session});
   return res.status(200).json({
    ok:true,conversation_id:conversationId,
    operational_incidents_readback:result,
    execution_authorized_by_chat:false,
    installation_authorized:false,production_changed:false
   });
  }
  // Progress polling is exact-request owner-RLS readback only, with
  // no model, worker, full-history reconstruction or dashboard lookups.
  if(req.method==='GET'&&String(req.query?.reply_readback||'')==='1'){
   const targetRequestId=String(req.query?.request_id||'');
   if(!validUuid(targetRequestId))fail('CHAT_REQUEST_ID_INVALID',400);
   const exact=await readPrivateChatRequest(session,{
    conversationId,requestId:targetRequestId});
   return res.status(200).json({ok:true,conversation_id:conversationId,
    request_id:targetRequestId,messages:exact.messages,
    reply_readback:summarizeSavedChatReplyReadback(exact.messages),
    continuity:{history_source:'AUTHENTICATED_SUPABASE_RLS',
     recovered_messages:exact.messages.length,coverage:'EXACT_SAVED_REQUEST',
     older_messages_may_be_missing:null},
    readback_scope:exact.status,
    work_execution_authorized:false,installation_authorized:false});
  }
  // Exact saved Chat request -> existing governed work inbox readback.
  // This is evidence only: neither a model answer nor a browser poll can
  // authorize execution, claim a job or fabricate a worker completion.
  if(req.method==='GET'&&String(req.query?.work_readback||'')==='1'){
   const targetRequestId=String(req.query?.request_id||'');
   if(!validUuid(targetRequestId))fail('CHAT_REQUEST_ID_INVALID',400);
   const exact=await readPrivateChatRequest(session,{
    conversationId,requestId:targetRequestId});
   const source=exact.messages.find(x=>x.role==='user');
   if(!source)return res.status(200).json({
    ok:true,conversation_id:conversationId,request_id:targetRequestId,
    status:'NO_AUTHENTICATED_SAVED_USER_TURN',
    work_handoff:null,execution_authorized_by_chat:false,
    installation_authorized:false,production_changed:false});
   const read=await readOwnerChatWorkHandoff({session,conversationId});
   if(!read)return res.status(200).json({
    ok:true,conversation_id:conversationId,request_id:targetRequestId,
    status:'WORK_HANDOFF_READBACK_UNAVAILABLE',
    work_handoff:null,execution_authorized_by_chat:false,
    installation_authorized:false,production_changed:false});
   const matches=read.items.filter(x=>
    x.request_id===targetRequestId&&x.source_ref===source.source_ref);
   if(matches.length>1)fail('CHAT_WORK_INTAKE_IDENTITY_AMBIGUOUS',503);
   const item=matches[0]||null;
   return res.status(200).json({
    ok:true,conversation_id:conversationId,request_id:targetRequestId,
    status:item?'AUTHENTICATED_WORK_INTAKE_RECORD_VERIFIED':
     'NO_MATCHING_WORK_INTAKE_RECORD',
    work_handoff:item?{
     status:item.status,shift_id:item.shift_id,
     source_ref:item.source_ref,request_id:item.request_id,
     diagnosis_status:item.diagnosis_status,
     selected_source_refs:item.selected_source_refs,
     work_chain:item.work_chain,
     // Only source-matched, service-read model development receipts appear
     // in the original conversation. No model wording can mint execution.
     development:item.development&&
      /^work:[a-f0-9]{32}$/.test(item.development.original_work_id||'')&&
      item.development.installation_authorized===false&&
      item.development.production_changed===false?{
       original_work_id:item.development.original_work_id,
       phase:String(item.development.phase||'QUEUED'),
       evidence:item.development.evidence||null,
       installation_authorized:false,production_changed:false
      }:null,
     worker_invocation_claimed:item.worker_invocation_claimed,
     execution_authorized_by_chat:false,
     installation_authorized:false,production_changed:false,
    }:null,
    execution_authorized_by_chat:false,
    installation_authorized:false,production_changed:false});
  }
  const history=await readPrivateChat(session,conversationId);
  if(req.method==='GET'){
   const context=await collectOptionalChatEvidence([
    {id:'operational_incidents',
     read:()=>readOwnerOperationalIncidentChatBriefing({session}),
     validate:v=>v?.status==='OWNER_OPERATIONAL_INCIDENT_CHAT_BRIEFING_READ_ONLY'&&
      v.owner_scope_verified===true&&v.original_job_authorized_by_chat===false,
     fallback:null},
    {id:'work_handoff',read:()=>readOwnerChatWorkHandoff({session,conversationId}),
     validate:v=>v!==null&&typeof v==='object',fallback:null},
    {id:'owner_originals',read:()=>readOwnerOriginalWorkForChat({session}),
     validate:v=>v?.status==='OWNER_SCOPED_ORIGINAL_WORK_INDEPENDENT_READBACK',fallback:null},
    {id:'weekly_queue',read:()=>readOwnerWeeklyCandidateQueueForChat({session}),
     validate:v=>typeof v?.status==='string'&&
      (v.status.startsWith('CHAT_WEEKLY_QUEUE_')||
       v.status==='CHAT_WEEKLY_SOURCE_CANDIDATES_VERIFIED'),fallback:null}
   ],{timeoutMs:2500});
   return res.status(200).json({ok:true,conversation_id:conversationId,
    messages:history.messages,
    reply_readback:summarizeSavedChatReplyReadback(history.messages),
    work_handoff:context.values.work_handoff,
    operational_incidents_readback:context.values.operational_incidents,
    original_work_readback:context.values.owner_originals,
    weekly_queue_readback:context.values.weekly_queue,
    contextual_readback_status:context.status,
    contextual_readbacks_unavailable:context.unavailable,
    continuity:{
     history_source:'AUTHENTICATED_SUPABASE_RLS',
     recovered_messages:history.messages.length,
     coverage:history.history_status,older_messages_may_be_missing:history.older_missing
    }});
  }
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
  const previouslySavedUser=existing.find(x=>x.role==='user'&&x.text===text);
  if(existing.length&&(!previouslySavedUser||
     existing.some(x=>x.role==='user'&&x.text!==text)))
   fail('CHAT_REQUEST_ID_CONTENT_MISMATCH',409);
  if(existing.length){
   const prior=existing.find(x=>x.role==='assistant');
   if(prior)return res.status(200).json({ok:true,conversation_id:conversationId,
     answer:prior.text,replayed:true,continuity:{
      history_source:'AUTHENTICATED_SUPABASE_RLS',
      current_answer_persisted:true,coverage:history.history_status,
      recovered_messages:history.messages.length,older_messages_may_be_missing:history.older_missing},
     execution:{status:'NOT_EXECUTED',external_actions_authorized:false}});
   // A user turn durably saved by the fast intake can continue through
   // governed cognition with the SAME request ID, without another insert.
  }
  // Inspect the actual immutable scoped ledger before saving another user
  // message. Only a fully hash-verified non-consequential terminal fork may
  // start a new, explicitly linked read-only recovery segment.
  const scope=createHash('sha256').update(session.user_id+'|'+conversationId).digest('hex');
  const readOnlyTurn=isProportionalReadOnlyChat({
   message:text,goalCommand,publicResearch:isPublicResearchRequest(text)
  });
  // Read-only conversational identity and storage are independent of work
  // configuration; action and goal mutation still require every old gate.
  let isolated=null;
  if(readOnlyTurn){
   isolated=resolvePrivateConversationDatabase(session);
  }else{
  // The isolated preview has the database's shared goal/user publication
  // lock installed. Never permit the older non-atomic assistant insert path.
  if(process.env.REALITY_ATOMIC_GOAL_PUBLICATION_ENABLED!=='true')
   fail('CHAT_ATOMIC_GOAL_PUBLICATION_REQUIRED',503);
  // Use the SAME canonical Continuity + Reliability pipeline as benchmarks,
  // but only on a configuration independently restricted to this signed-in
  // user's isolated preview project. Never silently fall back to unmonitored chat.
  if(process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
     process.env.REALITY_CONTINUOUS_RELIABILITY_ENABLED!=='true'||
     process.env.REALITY_SEMANTIC_REVIEW_ENABLED!=='true')
   fail('CHAT_UNIFIED_RELIABILITY_REQUIRED',503);
  isolated=resolveReliabilityBenchmarkDb();
  if(!isolated||isolated.url!==session.config.url||
     isolated.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
    fail('CHAT_PRIVATE_LEDGER_SCOPE_MISMATCH',503);

  }
  stage=readOnlyTurn?'READ_ONLY_OWNER_ATOMIC_EPOCH':
   'CONTINUITY_RECONSTRUCTION';
  // The existing atomic owner-epoch database RPC already protects read-only
  // conversational publication. DO NOT gate ordinary answers on a slow
  // full-chain Universe reconstruction: it timed out after ~50 seconds
  // on a real saved owner instruction. Goal changes and work actions still
  // require the original complete hash-verified reconstruction.
  const continuity=readOnlyTurn?Object.freeze({
   scopedRoot:'personal:chat:'+scope,fork_recovery:null,
   verified_prior_goal_cas:null,
   full_continuity_reconstruction_required_for_external_effects:true
  }):await resolvePrivateChatContinuity({
   scopedRoot:'personal:chat:'+scope,principalId:session.user_id,db:isolated
  });
  const scopedRoot=continuity.scopedRoot;
  // Both model lanes use the existing Universe projector. A bounded
  // conversation passes only its available owner-scoped observations; the
  // operational pipeline still reconstructs and verifies its durable spine.
  const makeOwnerUniverseReadModel=({observations,reconciledOriginals=null}={})=>{
   const spine=createContinuitySpine({
    continuityRootId:scopedRoot,worldlineId:scopedRoot,
    subjectId:session.user_id
   });
   return projectOwnerRealityUniverseForChat({
    rootId:spine.continuity_root_id,worldlineId:spine.worldline_id,
    worldId:scopedRoot,continuityHistory:null,
    currentObservations:observations,reconciledOriginals
   });
  };
  if(continuity.fork_recovery&&goalCommand)
   fail('CHAT_FORK_GOAL_MUTATION_REQUIRES_INDEPENDENT_RECONCILIATION',409);
  const key=String(process.env.REALITY_STANDALONE_OPENAI_API_KEY||process.env.OPENAI_API_KEY||'');
  // Save the human utterance BEFORE any cognition, and do not hallucinate
  // continuity success when source persistence fails.
  const recordedUser=previouslySavedUser?
   {source_ref:previouslySavedUser.source_ref}:
   await recordPrivateMessage(session,{
    conversationId,requestId,role:'user',text,
   });
  if(!key)fail('CHAT_MODEL_KEY_NOT_CONFIGURED',503);
  // Conversation: use recent authenticated history and selectively collect
  // existing evidence. No work qualification, goal epoch, or full spine replay.
  if(readOnlyTurn){
   stage='READ_ONLY_BOUNDED_CONTEXT';
   const recent=history.messages.filter(x=>x.request_id!==requestId).slice(-18);
   // This selects read-only context, NEVER action authority. Even a mistaken
   // relevance decision cannot create work. Greetings need only conversation.
   const wantsContext=text.length>35||needsRealityCapabilityInspection(text,recent)||/\b(past|present|future|universe|ceo|reality|work|job|shift|goal|history|yesterday|today|tomorrow|remember|progress|status|done|next|it|that|this|revision|release|receipt|approval|worker|continuity|recovery|blocker|capability|capabilities)\b/i.test(text);
   const ctx=wantsContext&&isolated?await collectOptionalChatEvidence([
    {id:'time_horizon',read:()=>readOwnerTimeHorizonEvidence({ownerId:session.user_id,db:isolated,env:process.env}),
     validate:v=>v?.status==='REALITY_OWNER_TIME_HORIZON_READ_ONLY'&&v.owner_scope_verified===true&&v.read_only===true&&v.approved_new_work_by_read===false,
     fallback:null},
    {id:'owner_handoff',read:()=>readOwnerOperationalIncidentChatBriefing({session,db:isolated}),
     validate:v=>v?.status==='OWNER_OPERATIONAL_INCIDENT_CHAT_BRIEFING_READ_ONLY'&&v.owner_scope_verified===true&&v.original_job_authorized_by_chat===false,fallback:null},
    {id:'verified_work',read:()=>readVerifiedOwnerCompletedWorkForChat({session,db:isolated}),validate:Array.isArray,fallback:[]},
    {id:'self_visibility',timeoutMs:5000,read:()=>readOperationalSelfVisibilityForChat({session,message:text,priorTurns:recent,db:isolated}),validate:v=>Array.isArray(v?.observations),fallback:null},
    {id:'active_shift',timeoutMs:5000,read:()=>readVerifiedEmployeeShiftForChat({session,message:text,db:isolated,briefOnly:true}),validate:Array.isArray,fallback:[]},
    {id:'worker_observation',read:()=>readVerifiedIndependentWorkerForChat({session,message:text,db:isolated}),validate:Array.isArray,fallback:[]},
    {id:'mission',read:()=>readFreshPersonalAccountMissionState({session}),
     validate:v=>v?.principal_id===session.user_id&&v.source==='OWNER_ACCOUNT_SCOPED_SIGNED_CONTINUITY'&&v.execution_authorized===false&&v.state?.assistant_can_mutate_goals===false,fallback:null}
   ],{timeoutMs:1800}):{values:{},unavailable:wantsContext?['owner_context']:[],status:wantsContext?'OPTIONAL_EVIDENCE_PARTIALLY_UNAVAILABLE':'CONVERSATION_ONLY_CONTEXT'};
   const t=ctx.values.time_horizon;
   const shift=ctx.values.active_shift?.find(x=>x?.source_kind==='AUTHENTICATED_OWNER_SCOPED_SUPABASE_READBACK'&&x.owner_shift_authorization_recorded===true)||null;
   const selfVisibilityObservations=ctx.values.self_visibility?.observations||[];
   // Reuse the full lane's authenticated incident projection, not a second
   // read, detector, or authority path. Keep current incidents in the bounded
   // context; unavailable evidence stays unknown.
   const incidentObservations=incidentChatUniverseObservations(ctx.values.owner_handoff);
   const observations=[...incidentObservations,...selfVisibilityObservations,...(ctx.values.verified_work||[]),...(ctx.values.active_shift||[]),...(ctx.values.worker_observation||[])].slice(0,90);
   const operationalHorizon=wantsContext?projectChatOperationalHorizon({visibility:ctx.values.self_visibility,settlements:ctx.values.verified_work||[]}):null;
   const mission=ctx.values.mission?.state?.active_goal;
   const ownerUniverse=makeOwnerUniverseReadModel({observations});
   stage='READ_ONLY_MODEL_COGNITION';
   const quickStart=Date.now();
   const advisory=await generateProportionalReadOnlyReply({
    message:text,conversationId,requestId,ownerId:session.user_id,sourceRef:recordedUser.source_ref,
    verifiedPriorTurns:recent,worldlineId:scopedRoot,apiKey:key,
    operationalTimeHorizon:operationalHorizon,
    model:process.env.REALITY_CHAT_OPENAI_MODEL||'gpt-4.1-mini',
    ownerContext:{source_status:ctx.status,unavailable_sources:ctx.unavailable,
     currently_authorized_shift:shift,
      current_operational_self_visibility:selfVisibilityObservations.filter(x=>x.event_kind==='reality_current_verified_operational_self_visibility').slice(0,12).map(x=>x.current_operational_facts),
      current_operational_receipts_take_precedence_over_legacy_audit_or_prior_conversation:true,
     temporal_intelligence:t?{past:t.past,present:t.present,future:t.future,
      final_loop:t.final_loop_owner,ceo:t.final_loop_owner?.executive||null,
      recovery:t.final_loop_recovery_guidance,universe_feedback:t.final_loop_universe_feedback,
      expected_outcomes_are_not_verified_facts:true}:null,
     active_owner_mission:mission?.user_confirmed===true&&mission.status==='ACTIVE'?{title:mission.title,source_user_message_ref:mission.source_user_message_ref,grants_execution_authority:false}:null,
     owner_operational_incidents:ctx.values.owner_handoff?.items?.slice(0,3)||null,
     owner_incident_evidence_status:ctx.values.owner_handoff?'OWNER_SCOPED_READBACK':'UNAVAILABLE_NOT_ABSENCE',
     owner_shift_continuity_incidents:ctx.values.owner_handoff?.shift_continuity_incidents?.slice(0,3)||null,
     conversation_never_grants_execution_authority:true},
    verifiedUniverseObservations:ownerUniverse.observations,
    recordClaimAssessment:async({answer,assessment})=>{
     // Only assessed operational replies use the canonical writer. Ordinary
     // Chat never waits on a history reconstruction. Enforce a shared time
     // budget and exact preview credentials; never fall back to production.
     const ledgerDb=resolveReliabilityBenchmarkDb();
     if(!isolated||!ledgerDb||ledgerDb.url!==isolated.url||
        process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true')throw Error('CHAT_READ_ONLY_CLAIM_LEDGER_UNAVAILABLE');
     const deadline=AbortSignal.timeout(5000);
     const observedAt=new Date().toISOString();
     const runtime=await startContinuityRuntime({
      continuityRootSource:scopedRoot,worldlineSource:scopedRoot,subjectId:conversationId,
      signal:buildGovernedChatSignal({message:text,observedAt}),observedAt,
      fetchImpl:(url,options={})=>fetch(url,{...options,signal:options.signal?
       AbortSignal.any([deadline,options.signal]):deadline})
     });
     return recordReadOnlyOutputClaimAssessment({runtime,requestId,sourceRef:recordedUser.source_ref,answer,assessment});
    }
   });
   governedCognitionMs=Date.now()-quickStart;
   stage='READ_ONLY_CONVERSATION_PUBLICATION';
   let publication=null;
   try{
    if(isolated)publication=await publishPrivateConversationReply(session,{
     conversationId,requestId,sourceRef:recordedUser.source_ref,text:advisory.answer,db:isolated});
   }catch(e){if(Number(e?.status)!==503)throw e;}
   // The exact committed INSERT receipt is the save acknowledgement.
   // A failed write is not called saved; the current request remains recoverable.
   return res.status(200).json({ok:true,conversation_id:conversationId,answer:advisory.answer,
    read_only_conversation:true,transient_answer_only:!publication,
    original_request_id:requestId,replayed:false,
    continuity:{history_source:'AUTHENTICATED_SUPABASE_RLS',current_answer_persisted:Boolean(publication),
     coverage:history.history_status,recovered_messages:history.messages.length,
     older_messages_may_be_missing:history.older_missing,
     goal_publication_atomicity:publication?'CONVERSATIONAL_EXACT_REQUEST_ATOMIC_INSERT':'UNAVAILABLE',
     reply_recovery_requires_exact_saved_request:!publication},
    reliability:{chat_lane:'PROPORTIONAL_READ_ONLY',transient_answer_not_a_receipt:!publication,
     canonical_epistemic_state:{status:'NOT_ASSERTED_FOR_READ_ONLY_CHAT'},
     output_claim_assessment:advisory.output_claim_assessment,
     independently_verified_semantic_correctness:false,business_outcome_verified:false,external_actions_authorized:false},
    contextual_readback_status:{evidence:ctx.status,unavailable_sources:ctx.unavailable,grants_execution_authority:false},
    execution:{status:'NOT_EXECUTED',external_actions_authorized:false,installation_authorized:false},
    response_timing:{total_ms:Date.now()-chatStartedAt,governed_cognition_ms:governedCognitionMs}});
  }
  // The signed human message entered the governed durable work inbox via
  // AFTER INSERT, independently of Chat cognition or assistant publication.
  stage='SIGNED_CHAT_WORK_READBACK';
  // Start all optional context reads together. Independent sources share one
  // short wall-clock budget instead of serially delaying the model 3 times.
  // The goal/authority CAS and mandatory final publication are separate.
  // A scheduled-worker health probe must not delay ordinary answers.
  // Direct worker-health questions still receive the independently read
  // wake evidence, while regular conversation uses the other grounded
  // optional sources and existing read-only governance.
  const wantsWorkerHealth=/(?:\bwatchdog\b|\bauto[ -]?wake\b|\bwake(?:up)?\s+(?:status|health|failure|trigger)\b|\bworker\s+(?:health|status|wake|failed)\b)/i.test(text);
  const optionalContextPromise=collectOptionalChatEvidence([
   {id:'operational_incidents',
    read:()=>readOwnerOperationalIncidentChatBriefing({session,db:isolated}),
    validate:v=>v?.status==='OWNER_OPERATIONAL_INCIDENT_CHAT_BRIEFING_READ_ONLY'&&
     v.owner_scope_verified===true&&v.original_job_authorized_by_chat===false&&
     v.installation_authorized===false,
    fallback:null},
   {id:'primary_mission',
    read:()=>readFreshPersonalAccountMissionState({session}),
    validate:x=>x?.version==='reality-account-primary-business-mission-v1'&&
     x.principal_id===session.user_id&&
     x.source==='OWNER_ACCOUNT_SCOPED_SIGNED_CONTINUITY'&&
     x.execution_authorized===false&&x.external_actions_authorized===false&&
     x.state?.assistant_can_mutate_goals===false,
    fallback:null},
   {id:'work_handoff',read:()=>readOwnerChatWorkHandoff({
      session,conversationId}),validate:v=>v!==null&&typeof v==='object',
      fallback:null},
   // Existing self-audit + exact pinned GitHub source tree. Fast and
   // independent of the employee-shift dashboard's readback success.
   // A model MUST NOT infer "missing engine" from absent optional evidence.
   {id:'self_visibility',timeoutMs:5000,read:()=>readOperationalSelfVisibilityForChat({
      session,message:text,
      priorTurns:history.messages.filter(x=>x.request_id!==requestId),
      db:isolated}),validate:v=>Array.isArray(v?.observations),fallback:null},
   {id:'market',read:()=>readVerifiedMarketStageForChat({
      session,message:text,db:isolated}),validate:Array.isArray,fallback:[]},
   {id:'upgrade',read:()=>readVerifiedResearchUpgradeForChat({
      session,message:text,db:isolated}),validate:Array.isArray,fallback:[]},
   {id:'employee_shift',read:()=>readVerifiedEmployeeShiftForChat({
      session,message:text,db:isolated}),validate:Array.isArray,fallback:[]},
   // Same canonical source-review allocation read model as Home. An optional
   // failure may not prevent Chat from replying or become zero scheduled work.
   {id:'weekly_workload',read:()=>readVerifiedWeeklyWorkloadForChat({
      session,message:text}),validate:Array.isArray,fallback:[]},
   {id:'worker_wake',read:()=>wantsWorkerHealth?
     readVerifiedIndependentWorkerForChat({
      session,message:text,db:isolated}):[],
     validate:Array.isArray,fallback:[]},
   {id:'workforce',read:()=>readVerifiedRealityCompanyWorkforceForChat({
      session,message:text,db:isolated}),validate:Array.isArray,fallback:[]},
   {id:'riley_sources',read:()=>readVerifiedRileySourceWorkForChat({
      session,message:text,db:isolated}),validate:Array.isArray,fallback:[]},
   {id:'native263',read:()=>readVerifiedNative263TemporalForChat({
      session,db:isolated}),validate:Array.isArray,fallback:[]},
   {id:'settlements',read:()=>readVerifiedOwnerCompletedWorkForChat({
      session,db:isolated}),validate:Array.isArray,fallback:[]},
   {id:'originals',read:()=>readOwnerOriginalWorkForChat({session}),
      validate:v=>v?.status==='OWNER_SCOPED_ORIGINAL_WORK_INDEPENDENT_READBACK',
      fallback:null},
   // Bounded optional Universe feedback from SAME owner, signed shift,
   // canonical Continuity and independently verified Final Loop settlement.
   // An unavailable read is UNKNOWN; it never blocks ordinary owner Chat.
   {id:'final_loop_universe',read:()=>process.env.VERCEL_ENV==='preview'&&
     process.env.REALITY_FINAL_LOOP_UNIVERSE_CHAT_CONTEXT_ENABLED==='true'?
      readOwnerTimeHorizonEvidence({
       ownerId:session.user_id,db:isolated,env:process.env
      }):null,
    validate:x=>x?.status==='REALITY_OWNER_TIME_HORIZON_READ_ONLY'&&
     x.owner_scope_verified===true&&
     x.final_loop_universe_feedback?.status===
      'FINAL_LOOP_UNIVERSE_CONTINUITY_FEEDBACK_VERIFIED_READ_ONLY'&&
     x.final_loop_universe_feedback.owner_id===session.user_id&&
     x.final_loop_universe_feedback.read_only===true&&
     x.final_loop_universe_feedback.execution_authorized===false&&
     x.final_loop_universe_feedback.original_job_completed===false&&
     (process.env.REALITY_FINAL_LOOP_SHARED_CONTINUITY_GUARD_ENABLED!=='true'||
       (x.final_loop_shared_continuity_guard?.status===
        'FINAL_LOOP_SHARED_CONTINUITY_GUARD_VERIFIED_READ_ONLY'&&
        x.final_loop_universe_feedback.shared_continuity_guard_crosschecked===true)),
    fallback:null},
   {id:'weekly_queue',read:()=>readOwnerWeeklyCandidateQueueForChat({session}),
      validate:v=>typeof v?.status==='string'&&
       (v.status.startsWith('CHAT_WEEKLY_QUEUE_')||
        v.status==='CHAT_WEEKLY_SOURCE_CANDIDATES_VERIFIED'),fallback:null},
  ],{timeoutMs:2500});
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
  // Context comes only from trusted owner-scoped database stage receipts.
  stage='OWNER_EVIDENCE_COLLECTION';
  const optionalContextWaitStart=Date.now();
  const optionalContext=await optionalContextPromise;
  optionalContextWaitMs=Date.now()-optionalContextWaitStart;
  const {
   primary_mission:ownerMissionReadback,
   operational_incidents:operationalIncidentsReadback,
   work_handoff:chatWorkReadback,
   market:marketStageObservations,upgrade:verifiedUpgradeObservations,
   employee_shift:employeeShiftObservations,worker_wake:workerWakeObservations,
   weekly_workload:weeklyWorkloadObservations,
   workforce:companyWorkforceObservations,riley_sources:rileySourceWorkObservations,
   native263:native263TemporalObservations,settlements:ownerCompletedWorkObservations,
   self_visibility:selfVisibilityReadback
  }=optionalContext.values;
  const selfVisibilityObservations=selfVisibilityReadback?.observations||[];
  const operationalHorizon=projectChatOperationalHorizon({visibility:selfVisibilityReadback,settlements:ownerCompletedWorkObservations});
  const signedIntake=chatWorkReadback?.items?.find(x=>
   x.request_id===requestId&&x.source_ref===recordedUser.source_ref)||null;
  const evidence=optionalContext;
  const chatWorkContext={
   status:chatWorkReadback?'SIGNED_CHAT_WORK_READBACK_VERIFIED':'SIGNED_CHAT_WORK_READBACK_UNAVAILABLE',
   all_sources_verified:chatWorkReadback!==null,
   unavailable:chatWorkReadback?[]:['work_handoff']
  };
  // The same signed-in owner already has a durable shift authorization when
  // the verified owner-bound shift readback reports RUNNING/QUEUED. A chat
  // model must NEVER turn a missing original-repair admission into a demand
  // that the owner re-authorize the EXISTING shift.
  const ownerShiftFacts=employeeShiftObservations.filter(x=>
   x?.event_kind==='owner_governed_employee_shift_briefing'&&
   x?.source_kind==='AUTHENTICATED_OWNER_SCOPED_SUPABASE_READBACK'&&
   x?.owner_shift_authorization_recorded===true&&
   x?.shift_start_command_already_satisfied===true&&
   ['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK'].includes(x.shift_status)&&
   /^reality:employee-shift:[a-f0-9-]{36}$/i.test(x.source_ref||'')&&
   x.active_owner_shift_id===x.source_ref.slice('reality:employee-shift:'.length));
  const verifiedOwnerShift=ownerShiftFacts.length===1?ownerShiftFacts[0]:null;
  stage='OWNER_ORIGINAL_WORK_READBACK';
  const ownerOriginalWork=scopeOwnerOriginalWorkToShift(
   optionalContext.values.originals,verifiedOwnerShift?.active_owner_shift_id||null);
  const ownerWeeklyQueue=optionalContext.values.weekly_queue;
  const reconciledOriginals=reconcileOwnerOriginalStatesForChat({
   ownerOriginalWork,
   finalObservations:[
    ...native263TemporalObservations,...ownerCompletedWorkObservations
   ]
  });
  const reconciliationObservation=reconciledOriginals&&
   reconciledOriginals.source_projection_disagreements.length?
   [Object.freeze({
    entry_id:'reality:owner-original-ledger-reconciliation',
    event_kind:'owner_exact_original_independent_final_receipt_reconciliation',
    source_kind:'RECONCILED_FROM_EXISTING_AUTHENTICATED_OWNER_LEDGER_READBACKS',
    source_ref:'reality:original-ledger-cross-check',
    assertion_time:new Date().toISOString(),
    epistemic_status:'SAME_ORIGINAL_TERMINAL_RECEIPT_PRECEDENCE',
    summary:'One Reality ledger still projects a source admission for an original '+
     'that has a separately verified terminal settlement receipt. '+
     'For these EXACT original work IDs, completed settlement takes priority; '+
     'do not count them as still open: '+
     reconciledOriginals.source_projection_disagreements.map(x=>
      x.original_work_id+' receipt '+x.verified_final_receipt_ref).join(' | ')+
     '. Source projection may need reconciliation; do not replay or reapprove.',
    contradictions:reconciledOriginals.source_projection_disagreements,
    installation_authorized:false,production_changed:false
   })]:[];
  const ownerContext={
   status:optionalContext.status,
   unavailable:optionalContext.unavailable.filter(x=>
    x==='originals'||x==='weekly_queue'||x==='weekly_workload')
  };
  // ONE authenticated Universe observation window supplies Reality and
  // its underlying model in both response modes. Not a second ledger.
  const primaryMission=ownerMissionReadback?.state?.active_goal||null;
  const activePrimaryMission=primaryMission?.goal_id&&
   ownerMissionReadback.state.active_goal_id===primaryMission.goal_id&&
   primaryMission.user_confirmed===true&&primaryMission.status==='ACTIVE'&&
   typeof primaryMission.title==='string'&&primaryMission.title.length<=700&&
   /^supabase:reality_chat_messages:[a-f0-9-]{36}$/i.test(
    primaryMission.source_user_message_ref||'')?
    primaryMission:null;
  const primaryMissionObservation=activePrimaryMission?Object.freeze({
   entry_id:'reality:owner-primary-business-mission',
   event_kind:'owner_confirmed_account_primary_business_mission',
   source_kind:'OWNER_ACCOUNT_SCOPED_SIGNED_CONTINUITY',
   source_ref:activePrimaryMission.source_user_message_ref,
   epistemic_status:'OWNER_CONFIRMED_OBJECTIVE_NOT_BUSINESS_OUTCOME',
   assertion_time:new Date().toISOString(),
   summary:'Owner-confirmed standing business mission: '+
    activePrimaryMission.title+
    '. This defines long-term intent, NOT approval for external execution, '+
    'employment actions, purchases, production deployment, or completion.',
   execution_authorized:false,installation_authorized:false,
   production_changed:false
  }):null;
  const feedback=optionalContext.values.final_loop_universe
   ?.final_loop_universe_feedback;
  const finalLoopUniverseObservations=
   feedback?.status===
     'FINAL_LOOP_UNIVERSE_CONTINUITY_FEEDBACK_VERIFIED_READ_ONLY'&&
   (process.env.REALITY_FINAL_LOOP_SHARED_CONTINUITY_GUARD_ENABLED!=='true'||
    feedback.shared_continuity_guard_crosschecked===true)&&
   feedback.owner_id===session.user_id&&
   feedback.shift_id===verifiedOwnerShift?.active_owner_shift_id&&
   feedback.read_only===true&&feedback.execution_authorized===false&&
   feedback.original_job_completed===false&&
   feedback.future_is_not_execution_authority===true&&
   Array.isArray(feedback.observations)&&
   feedback.observations.length<=24&&
   feedback.observations.every(x=>
    x?.execution_authorized===false&&
    x.installation_authorized===false&&
    x.production_changed===false&&
    ['CANONICAL_FINAL_LOOP_ATOMIC_UNIVERSE_SETTLEMENT_READBACK',
     'CANONICAL_SIGNED_FINAL_LOOP_UNFINISHED_READBACK'].includes(
      x.source_kind))?
   feedback.observations:[];
  const ownerCurrentUniverseObservations=[
   ...(primaryMissionObservation?[primaryMissionObservation]:[]),
   ...selfVisibilityObservations,
   ...finalLoopUniverseObservations,
   buildRealityProposedEmployeeRoleDiscussionContext(),
   ...native263TemporalObservations,...ownerCompletedWorkObservations,
   ...marketStageObservations,...verifiedUpgradeObservations,
   ...employeeShiftObservations,...workerWakeObservations,
   ...companyWorkforceObservations,...rileySourceWorkObservations,
   ...weeklyWorkloadObservations,
   ...incidentChatUniverseObservations(operationalIncidentsReadback),
   ...originalWorkObservation(ownerOriginalWork),
   ...reconciliationObservation,...weeklyQueueObservation(ownerWeeklyQueue)
  ];
  stage='COGNITION_AND_RELIABILITY';
  const governedCognitionStart=Date.now();
  // The full operational pipeline already reconstructs durable Universe
  // history itself. Supply the SAME current owner cognitive read model,
  // without issuing another persistence query or creating a second ledger.
  const ownerUniverse=makeOwnerUniverseReadModel({
   observations:ownerCurrentUniverseObservations,reconciledOriginals
  });
  const result=await runLiveIntelligenceOrchestration({
   message:text,requestedBy:session.user_id,
   // The signed-in user's current request can permit read-only public search;
   // model text cannot authorize installation, worker execution or any account action.
   publicResearchEnabled:isPublicResearchRequest(text),
   // A planning conversation uses one grounded model call. The existing
   // independent reliability/readback and atomic publication still apply.
   cognitionEffort:'CONVERSATION',
   model:'gpt-4.1-mini',apiKey:key,
   systemContext:{conversation_id:conversationId,
    worldline_id:scopedRoot,world_id:scopedRoot,
    continuity_root_id:scopedRoot,
    // Signed-in owner Chat consumes the verified canonical Spine, not the
    // stale, independently stored legacy Universe entry collection.
    canonical_continuity_is_universe_source:true,
    operational_time_horizon:operationalHorizon,
    fork_recovery_audit:continuity.fork_recovery,
    conversation_history_source:'AUTHENTICATED_SUPABASE_RLS',
    conversation_history_older_messages_may_be_missing:history.older_missing,
    // This authenticated endpoint handles cognition and optional explicit goal
    // recording. It does not run /personal-governed-build or /real-repair...
    // Merely saying "starting" must never impersonate worker dispatch.
    chat_work_execution_bridge:{
      authenticated_message_entered_existing_shift_intake:!!signedIntake,
      exact_authenticated_message_source_ref:signedIntake?.source_ref||null,
      current_work_intake_status:signedIntake?.status||
       (chatWorkContext.all_sources_verified?'NO_DURABLE_HANDOFF_READBACK':
        'SIGNED_CHAT_WORK_READBACK_UNAVAILABLE'),
      read_only_qualification_uses_existing_signed_worker:true,
      plain_chat_can_dispatch_workers:false,
      optional_context_status:evidence.status,
      missing_context_is_not_evidence_of_no_work:true,
      saved_authenticated_turn_enters_existing_worker_inbox:!!signedIntake,
      original_job_queued_by_this_chat_turn:false,
      worker_acknowledgment_verified_by_this_chat_turn:false,
      existing_owner_action:'EXPLICIT_SIGNED_IN_REALITY_CHAT_START_COMMAND_OR_EQUIVALENT_START_BUTTON',
      shift_owner_authorization_requires_explicit_button_click:false,
      explicit_signed_in_start_message_is_first_shift_authorization:true,
      selected_work_is_pinned_to_owner_shift_fingerprint:true,
      owner_already_authorized_current_shift:verifiedOwnerShift!==null,
      current_owner_authorized_shift_id:verifiedOwnerShift?.active_owner_shift_id||null,
      current_owner_shift_status:verifiedOwnerShift?.shift_status||null,
      another_shift_start_or_approval_required:verifiedOwnerShift?false:null,
      existing_shift_is_not_new_original_repair_admission:true,
      existing_shift_blocked_at_original_admission_is_not_missing_owner_shift_permission:true,
      current_work_inventory_does_not_require_active_shift:true,
      prior_settled_jobs_must_not_be_readmitted:true,
      existing_owner_action_uses_exact_owner_job_and_frozen_evidence:true,
      installed_capabilities_require_separate_exact_authorization:true,
    },
    // Reality is a proactive, conversational business operating partner.
    // These are conversation instructions, never new authorization grants.
    // Always prefer saved owner intent and verified state over a canned
    // script; a newly signed-up customer has no proven connections yet.
    owner_first_contact_and_conversational_onboarding:{
      experience:'CHAT_IS_BUSINESS_HOME_FOR_SIGNED_IN_CUSTOMERS',
      new_business_welcome_source:'FIRST_ASSISTANT_TURN_SAVED_ONCE_UNDER_SIGNED_OWNER_SERVICE',
      prior_turns_source:'AUTHENTICATED_OWNER_RLS_CHAT',
      when_new:'Walk through the customer business one question at a time. Start with business type and a current pain point. Explain automation plainly. Ask whether to connect relevant existing services, then verify actual provider access before examining data.',
      when_setup_partial:'Resume the next unverified step from owner records. A connector setup request is NOT an authenticated connection.',
      when_ready_for_work:'Explain existing source-backed opportunities and their evidence; do not invent hours, qualified jobs, completed work or ROI.',
      when_returning:'Use established owner goal, Universe/continuity evidence, active shift warrants and unfinished repairs to initiate a human-feeling operational conversation. Mention what changed and only the specific permissions genuinely missing. Never ask to reauthorize still-covered work.',
      conversation_flow:'The customer may ask why or skip a step; reply naturally in the SAME saved conversation, then resume from independently verified progress.',
      direct_authority:'The model may explain and offer links or exact UI actions; ordinary messages cannot grant OAuth, install code, move money or broaden permissions.',
      customer_past_expectations_are_only_known_when_grounded:true,
      no_external_action_authorized:true,
      no_customer_job_completion_implied:true
    },
    // Static published references already shown on Reality's homepage.
    // These are references, not evidence of measured business savings.
    published_research_references:publishedReferencesForChat(text),
    // Grounded recent owner work is visible to the model even when the
    // next message merely says "it", "this job", or "the milestone".
    // Cognition must still keep unrelated questions unrelated.
    owner_weekly_employee_queue_state:ownerWeeklyQueue?{
     source:'AUTHENTICATED_OWNER_SCOPED_FROZEN_WEEKLY_QUEUE',
     shift_id:ownerWeeklyQueue.shift_id||null,
     candidate_count:ownerWeeklyQueue.source_candidate_count??null,
     candidates:ownerWeeklyQueue.source_candidates||[],
     qualification_needed:true,
     work_authorized_by_read:false,
     required_truth:'These are existing weekly work candidates, not approved executable jobs. Proactively qualify current defects; never manufacture work or replay settled originals.'
    }:{status:'WEEKLY_QUEUE_READBACK_UNAVAILABLE_DO_NOT_CLAIM_NO_WORK'},
    current_operational_self_visibility:selfVisibilityObservations.filter(x=>x.event_kind==='reality_current_verified_operational_self_visibility').slice(0,12).map(x=>x.current_operational_facts),
     current_operational_receipts_take_precedence_over_legacy_audit_or_prior_conversation:true,
     owner_original_work_current_state:ownerOriginalWork?{
     source:'AUTHENTICATED_OWNER_SCOPED_DATABASE_READBACK',
     existing_authorized_shift_id:ownerOriginalWork.current_shift_id,
     unfinished_originals:reconciledOriginals?
      reconciledOriginals.effectively_unsettled_original_count:
      ownerOriginalWork.observed_unfinished_count,
     source_projection_unfinished_count:ownerOriginalWork.observed_unfinished_count,
     jobs:reconciledOriginals?.jobs||ownerOriginalWork.jobs,
     cross_ledger_disagreements:reconciledOriginals?.source_projection_disagreements||[],
     no_new_authorization_granted:true,
     required_truth:'A job without an independently verified settlement is NOT complete. Do not claim there are no unfinished jobs when a source-admitted original is in this readback.'
    }:{status:'READBACK_UNAVAILABLE_DO_NOT_CLAIM_ZERO_UNFINISHED'},
    owner_completed_work_context_status:
      native263TemporalObservations.length+ownerCompletedWorkObservations.length>0?
       'OWNER_SCOPED_INDEPENDENT_RECEIPT_CONTEXT_AVAILABLE':
       'NO_INDEPENDENT_OWNER_RECEIPT_AVAILABLE_THIS_TURN',
    owner_weekly_workload_gap:weeklyWorkloadObservations[0]?.weekly_workload_insight||
     {status:'OWNER_WEEKLY_SOURCE_ALLOCATION_UNAVAILABLE_NOT_ZERO_WORK'},
    universe_cognitive_state_id:ownerUniverse.state_id,
    universe_read_model:'EXISTING_UNIVERSE_COGNITIVE_PROJECTION',
    connected_world_observations:ownerUniverse.observations,
    action_authorized:false,execution_authorized:false,
   },
   // The current user turn was saved by intake; pass only PRIOR turns as
   // conversation history so the model sees the current message exactly once.
   verifiedConversationTurns:history.messages.filter(x=>x.request_id!==requestId),
  });
  // Preserve EXACT checked bytes, including any harmless trailing spaces.
  // Trimming after final-direction verification would change the answer
  // without another source-linked verification receipt.
  governedCognitionMs=Date.now()-governedCognitionStart;
  const answer=String(result?.intelligence?.answer||'');
  if(!answer.trim())fail('CHAT_MODEL_ANSWER_UNAVAILABLE',503);
  stage='FINAL_ANSWER_REVIEW';
  const finalPublicationProof=assertFinalChatPublicationProof({
   answer,reliability:result?.reliability,
   atomicGoalPublicationEnabled:true,
   sourceRenderedOperationalRequired:requiresSourceRenderedOperationalReply(text),
  });
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
  stage='GOAL_SNAPSHOT_RECONCILIATION';
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
  // This atomic RPC reads the same conversation/goal revision while inserting
  // the EXACT answer checked by the final Integrity publication decision.
  stage='ATOMIC_ASSISTANT_PUBLICATION';
  const publication=await publishPrivateAssistantAtomically(session,{
    conversationId,requestId,text:answer,isolatedDb:isolated,
    // On a recovered fork, keep the *original* independently verified goal
    // epoch for the existing DB transaction's CAS. The new read-only segment
    // never invents a new owner goal or resets the original goal revision.
    expectedRevision:continuity.verified_prior_goal_cas?
      continuity.verified_prior_goal_cas.expected_revision:goalAtGeneration.transition_count,
    expectedLastEventId:continuity.verified_prior_goal_cas?
      continuity.verified_prior_goal_cas.expected_last_goal_event_id:
      goalAtGeneration.recent_transition_receipts.at(-1)?.event_id||null,
  });
  stage='ASSISTANT_DURABILITY_READBACK';
  const check=await readPrivateChat(session,conversationId);
  if(!check.messages.some(x=>x.role==='assistant'&&x.request_id===requestId&&x.text===answer))
   fail('CHAT_ASSISTANT_DURABILITY_NOT_VERIFIED',503);
  return res.status(200).json({ok:true,conversation_id:conversationId,answer,replayed:false,
   continuity:{history_source:'AUTHENTICATED_SUPABASE_RLS',
    recovered_messages:check.messages.length,coverage:check.history_status,
    older_messages_may_be_missing:check.older_missing,
    current_answer_persisted:true,
    goal_publication_atomicity:publication?.atomic_goal_revision_checked===true?
      'ATOMIC_DATABASE_GOAL_REVISION_AND_ASSISTANT_INSERT':
      'ATOMIC_GOAL_PUBLICATION_NOT_CONFIRMED'},
   goal_command_receipt:goalCommandReceipt?{
    status:'COMMITTED_TO_EXISTING_CONTINUITY',
    event_id:goalCommandReceipt.event_id,
    active_goal_id:goalCommandReceipt.state.active_goal_id,
    grants_execution_authority:false,
   }:null,
   reliability:{canonical_epistemic_state:result.reliability.canonical_epistemic_state,
     user_goal_continuity:result.reliability.user_goal_continuity||null,
     assistant_goal_governance:result.reliability.goal_governance||null,
     final_answer_publication_proof:finalPublicationProof,
     final_answer_direction_release:result.reliability.final_direction_release?{
       ...result.reliability.final_direction_release,
       output_claim_assessment:summarizeOutputClaimAssessment(result.reliability.final_direction_release.output_claim_assessment)
     }:{
       status:'NOT_ASSESSED_IN_THIS_RUNTIME',release_allowed:null,
       semantic_accuracy_independently_verified:false},
     three_contract_integrity:{
       proof_hash:result.reliability.final_direction_release?.three_contract_integrity_proof_hash||null,
       original_proposal_id:result.reliability.final_direction_release?.goal_proposal_id||null,
       provisional_goal_transition_authorization:
         result.reliability.final_direction_release?.goal_transition_authorization||'NOT_ASSESSED',
       canonical_user_goal_state_bound:
         result.reliability.final_direction_release?.exact_goal_state_bound===true,
       independent_goal_semantics_proven:false,
       assistant_state_mutation_authorized:false,
       external_execution_authorized:false,
     },
     goal_authority:result.reliability.goal_authority||null,
     authoritative_user_goal_state:result.reliability.goal_authority_contracts?.authorized_user_goal_state||null,
     semantic_review_status:result.reliability.semantic_review?.status||'NOT_ASSESSED',
     semantic_review_provenance_status:result.reliability.semantic_review?.provenance_review_status||'NOT_ASSESSED',
     semantic_issue_candidates:(result.reliability.semantic_review?.issues||[]).map(issue=>({
       kind:issue.kind})),
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
   contextual_readback_status:{
    evidence:evidence.status,owner_job_queue:ownerContext.status,
    signed_chat_intake:chatWorkContext.status,
    unavailable_sources:[...evidence.unavailable,...ownerContext.unavailable,...chatWorkContext.unavailable],
    missing_source_does_not_prove_no_work:true,grants_execution_authority:false
   },
   work_handoff:signedIntake?{
     status:signedIntake.status,source_ref:signedIntake.source_ref,
     request_id:requestId,shift_id:signedIntake.shift_id,
     execution_authorized_by_chat:false,
     installation_authorized:false,production_changed:false
    }:null,
   response_timing:{total_ms:Date.now()-chatStartedAt,
     optional_context_wait_ms:optionalContextWaitMs,
     governed_cognition_ms:governedCognitionMs},
    execution:{status:'NOT_EXECUTED',external_actions_authorized:false}});
 }catch(e){
  const status=Number(e.status)||503;
  const underlying=String(e?.message||'');
  // Never reflect arbitrary provider/database errors or user content.
  // Only fixed categories are exposed; raw provider messages can contain secrets.
  let code=/^[A-Z][A-Z0-9_]{3,119}$/.test(underlying)?underlying:'CHAT_RESPONSE_UNAVAILABLE';
  if(stage==='READ_ONLY_MODEL_COGNITION' && code==='CHAT_RESPONSE_UNAVAILABLE'){
   const providerCode=String(e?.provider_error||'');
   if(providerCode==='insufficient_quota')code='CHAT_MODEL_INSUFFICIENT_QUOTA';
   else if(providerCode==='model_not_found')code='CHAT_MODEL_NOT_AVAILABLE';
   else if(status===401)code='CHAT_MODEL_AUTHENTICATION_FAILED';
   else if(status===403)code='CHAT_MODEL_PERMISSION_DENIED';
   else if(status===429)code='CHAT_MODEL_RATE_LIMITED';
   else if(status===400||status===422)code='CHAT_MODEL_REQUEST_REJECTED';
   else if(status===404)code='CHAT_MODEL_NOT_AVAILABLE';
   else if(e?.name==='TimeoutError'||e?.name==='AbortError')code='CHAT_MODEL_REQUEST_TIMEOUT';
   else if(Number(e?.status)>=500)code='CHAT_MODEL_PROVIDER_UNAVAILABLE';
   else if(e?.name==='TypeError')code='CHAT_MODEL_TRANSPORT_OR_RUNTIME_FAILURE';
   else if(e?.name==='SyntaxError')code='CHAT_MODEL_RESPONSE_PARSE_FAILED';
   else code='CHAT_MODEL_UNCLASSIFIED_FAILURE';
  }
  console.warn('REALITY_CHAT_STAGE_FAILURE',stage,code,
   'elapsed_ms',Date.now()-chatStartedAt);
  return res.status(status).json({ok:false,error:code,
   stage,response_timing:{total_ms:Date.now()-chatStartedAt,
    optional_context_wait_ms:optionalContextWaitMs,
    governed_cognition_ms:governedCognitionMs},
   request_saved_state:'CHECK_AUTHENTICATED_HISTORY',
   execution_authorized:false,installation_authorized:false});
 }
}
