// Isolated, authenticated Personal Reality conversation. No customer actions.
import {authenticatedChatSession,privateChatConfig,assertSameOrigin} from '../../src/reality-private-chat-auth-v0.1.js';
import {readPrivateChat,recordPrivateMessage,publishPrivateAssistantAtomically,listPrivateConversations,validUuid} from '../../src/reality-private-chat-store-v0.1.js';
import {runLiveIntelligenceOrchestration} from '../../src/reality-live-intelligence-orchestration-v0.1.js';
import {resolveReliabilityBenchmarkDb} from '../../src/reality-reliability-db-boundary-v0.1.js';
import {readVerifiedMarketStageForChat}
 from '../../src/reality-market-stage-chat-context-v1.js';
import {readVerifiedResearchUpgradeForChat}
 from '../../src/reality-verified-repair-chat-context-v1.js';
import {readVerifiedEmployeeShiftForChat,readVerifiedRealityCompanyWorkforceForChat,readVerifiedRileySourceWorkForChat}
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
import {readOwnerOriginalWorkForChat,originalWorkObservation,
 readOwnerWeeklyCandidateQueueForChat,weeklyQueueObservation}
 from '../../src/reality-owner-original-work-chat-readback-v1.js';
import {createHash} from 'node:crypto';
import {resolvePrivateChatContinuity} from '../../src/reality-private-chat-continuity-recovery-v1.js';
import {isPublicResearchRequest,publishedReferencesForChat} from '../../src/reality-chat-research-bridge-v1.js';
import {assertFinalChatPublicationProof}
 from '../../src/reality-final-chat-publication-proof-v0.1.js';
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
 let stage='AUTHENTICATION';
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
  const history=await readPrivateChat(session,conversationId);
  if(req.method==='GET'){
   return res.status(200).json({ok:true,conversation_id:conversationId,
    messages:history.messages,
    reply_readback:summarizeSavedChatReplyReadback(history.messages),
    work_handoff:await readOwnerChatWorkHandoff({session,conversationId}),
    original_work_readback:await readOwnerOriginalWorkForChat({session}).catch(()=>null),
    weekly_queue_readback:await readOwnerWeeklyCandidateQueueForChat({session}).catch(()=>null),
    continuity:{
     history_source:'AUTHENTICATED_SUPABASE_RLS',
     recovered_messages:history.messages.length,
     coverage:history.history_status,older_messages_may_be_missing:history.older_missing,
    }});
  }
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
  stage='CONTINUITY_RECONSTRUCTION';
  const continuity=await resolvePrivateChatContinuity({
   scopedRoot:'personal:chat:'+scope,principalId:session.user_id,db:isolated
  });
  const scopedRoot=continuity.scopedRoot;
  if(continuity.fork_recovery&&goalCommand)
   fail('CHAT_FORK_GOAL_MUTATION_REQUIRES_INDEPENDENT_RECONCILIATION',409);
  const key=String(process.env.REALITY_STANDALONE_OPENAI_API_KEY||process.env.OPENAI_API_KEY||'');
  if(!key)fail('CHAT_MODEL_KEY_NOT_CONFIGURED',503);
  // Save the human utterance BEFORE any cognition, and do not hallucinate
  // continuity success when source persistence fails.
  const recordedUser=previouslySavedUser?
   {source_ref:previouslySavedUser.source_ref}:
   await recordPrivateMessage(session,{
    conversationId,requestId,role:'user',text,
   });
  // The signed human message entered the governed durable work inbox via
  // AFTER INSERT, independently of Chat cognition or assistant publication.
  stage='SIGNED_CHAT_WORK_READBACK';
  const chatWorkReadback=await readOwnerChatWorkHandoff({
   session,conversationId
  });
  const signedIntake=chatWorkReadback?.items?.find(x=>
   x.request_id===requestId&&x.source_ref===recordedUser.source_ref)||
   null;
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
  const [marketStageObservations,verifiedUpgradeObservations,employeeShiftObservations,workerWakeObservations,companyWorkforceObservations,rileySourceWorkObservations,native263TemporalObservations,ownerCompletedWorkObservations]=await Promise.all([
   readVerifiedMarketStageForChat({session,message:text,db:isolated}),
   readVerifiedResearchUpgradeForChat({session,message:text,db:isolated}),
   readVerifiedEmployeeShiftForChat({session,message:text,db:isolated}),
   readVerifiedIndependentWorkerForChat({session,message:text,db:isolated}),
   readVerifiedRealityCompanyWorkforceForChat({session,message:text,db:isolated}),
   readVerifiedRileySourceWorkForChat({session,message:text,db:isolated}),
   // Always load independent owner work evidence. Reference resolution belongs
   // to authenticated conversation history + model cognition, not a regex.
   readVerifiedNative263TemporalForChat({session,db:isolated}),
   readVerifiedOwnerCompletedWorkForChat({session,db:isolated})
  ]);
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
  const [ownerOriginalWork,ownerWeeklyQueue]=await Promise.all([
   readOwnerOriginalWorkForChat({session,
    currentShiftId:verifiedOwnerShift?.active_owner_shift_id||null}).catch(()=>null),
   readOwnerWeeklyCandidateQueueForChat({session}).catch(()=>null)
  ]);
  stage='COGNITION_AND_RELIABILITY';
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
    fork_recovery_audit:continuity.fork_recovery,
    conversation_history_source:'AUTHENTICATED_SUPABASE_RLS',
    conversation_history_older_messages_may_be_missing:history.older_missing,
    // This authenticated endpoint handles cognition and optional explicit goal
    // recording. It does not run /personal-governed-build or /real-repair...
    // Merely saying "starting" must never impersonate worker dispatch.
    chat_work_execution_bridge:{
      authenticated_message_entered_existing_shift_intake:!!signedIntake,
      exact_authenticated_message_source_ref:signedIntake?.source_ref||null,
      current_work_intake_status:signedIntake?.status||'NO_DURABLE_HANDOFF_READBACK',
      read_only_qualification_uses_existing_signed_worker:true,
      plain_chat_can_dispatch_workers:false,
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
      another_shift_start_or_approval_required:verifiedOwnerShift===null,
      existing_shift_is_not_new_original_repair_admission:true,
      existing_shift_blocked_at_original_admission_is_not_missing_owner_shift_permission:true,
      current_work_inventory_does_not_require_active_shift:true,
      prior_settled_jobs_must_not_be_readmitted:true,
      existing_owner_action_uses_exact_owner_job_and_frozen_evidence:true,
      installed_capabilities_require_separate_exact_authorization:true,
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
    owner_original_work_current_state:ownerOriginalWork?{
     source:'AUTHENTICATED_OWNER_SCOPED_DATABASE_READBACK',
     existing_authorized_shift_id:ownerOriginalWork.current_shift_id,
     unfinished_originals:ownerOriginalWork.observed_unfinished_count,
     jobs:ownerOriginalWork.jobs,
     no_new_authorization_granted:true,
     required_truth:'A job without an independently verified settlement is NOT complete. Do not claim there are no unfinished jobs when a source-admitted original is in this readback.'
    }:{status:'READBACK_UNAVAILABLE_DO_NOT_CLAIM_ZERO_UNFINISHED'},
    owner_completed_work_context_status:
      native263TemporalObservations.length+ownerCompletedWorkObservations.length>0?
       'OWNER_SCOPED_INDEPENDENT_RECEIPT_CONTEXT_AVAILABLE':
       'NO_INDEPENDENT_OWNER_RECEIPT_AVAILABLE_THIS_TURN',
    connected_world_observations:[
     // Trusted existing employee roles are standing operational context.
     // Proposed weekly jobs are free to discuss but not already authorized.
     buildRealityProposedEmployeeRoleDiscussionContext(),
     ...native263TemporalObservations,...ownerCompletedWorkObservations,
     ...marketStageObservations,...verifiedUpgradeObservations,...employeeShiftObservations,
     ...workerWakeObservations,...companyWorkforceObservations,
     ...rileySourceWorkObservations,...originalWorkObservation(ownerOriginalWork),
     ...weeklyQueueObservation(ownerWeeklyQueue)
    ],
    action_authorized:false,execution_authorized:false,
   },
   // The current user turn was saved by intake; pass only PRIOR turns as
   // conversation history so the model sees the current message exactly once.
   verifiedConversationTurns:history.messages.filter(x=>x.request_id!==requestId),
  });
  // Preserve EXACT checked bytes, including any harmless trailing spaces.
  // Trimming after final-direction verification would change the answer
  // without another source-linked verification receipt.
  const answer=String(result?.intelligence?.answer||'');
  if(!answer.trim())fail('CHAT_MODEL_ANSWER_UNAVAILABLE',503);
  stage='FINAL_ANSWER_REVIEW';
  const finalPublicationProof=assertFinalChatPublicationProof({
   answer,reliability:result?.reliability,
   atomicGoalPublicationEnabled:true,
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
     final_answer_direction_release:result.reliability.final_direction_release||{
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
   work_handoff:signedIntake?{
     status:signedIntake.status,source_ref:signedIntake.source_ref,
     request_id:requestId,shift_id:signedIntake.shift_id,
     execution_authorized_by_chat:false,
     installation_authorized:false,production_changed:false
    }:null,
   execution:{status:'NOT_EXECUTED',external_actions_authorized:false}});
 }catch(e){
  const status=Number(e.status)||503;
  const underlying=String(e?.message||'');
  // Never reflect arbitrary provider/database errors or user content.
  const code=/^[A-Z][A-Z0-9_]{3,119}$/.test(underlying)?underlying:'CHAT_RESPONSE_UNAVAILABLE';
  console.warn('REALITY_CHAT_STAGE_FAILURE',stage,code);
  return res.status(status).json({ok:false,error:code,
   stage,request_saved_state:'CHECK_AUTHENTICATED_HISTORY',
   execution_authorized:false,installation_authorized:false});
 }
}
