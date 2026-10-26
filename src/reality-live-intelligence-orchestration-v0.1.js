import {buildCleanerConversationContext} from './reality-cleaner-conversation-context-v0.1.js';
import {buildCognitionContinuityHandoff} from './reality-cognition-continuity-handoff-v0.1.js';
import {buildCanonicalEpistemicFrame,recordCanonicalEpistemicFrame} from './reality-canonical-epistemic-frame-v0.1.js';
import {buildUserGoalContinuityState,recoverPriorUserGoalState,projectProvisionalGoalLifecycle} from './reality-user-goal-continuity-state-v0.1.js';
import { buildGovernedChatSignal } from './reality-governed-fragmented-signal-cleaner-v0.1.js';
import { buildNativeUniverseContext } from './reality-native-universe-v1.0.js';
import { retrievePersistedUniverse, retrieveDormantContinuitySummaries, persistContinuityEvent } from './reality-native-universe-persistence-v1.0.js';
import { discoverDormantContinuity } from './reality-continuity-discovery-v1.0.js';
import { buildContinuityEvent, buildContinuityRehydration, deriveContinuityRootId } from './reality-continuous-continuity-v1.0.js';
import { startContinuityRuntime } from './reality-continuity-spine-runtime-v0.1.js';
import { runContinuousReliabilityCycle } from './reality-continuous-reliability-v0.1.js';
import { reviewRealityAnswer } from './reality-semantic-review-v0.1.js';
import { assessGoalDriftCoverage } from './reality-goal-drift-assessment-coverage-v0.1.js';
import { buildAssistantGoalGovernance,verifyGoalGovernanceBeforeStateMutation } from './reality-goal-governance-contract-v0.1.js';
import {
 projectGoalStateContract,projectGoalTransitionContract,
 projectAssistantGoalProposal,enforceGoalTransitionBoundary,
 pendingGoalAuthorizationResponse,pendingGoalCompletionEvidenceResponse,
} from './reality-goal-authority-contracts-v0.1.js';
import { qualifyUnresolvedEvidence } from './reality-evidence-release-qualification-v0.1.js';
import { adjudicateSourceReview } from './reality-source-review-adjudication-v0.1.js';
import { assessDrift } from './reality-drift-recovery-v0.1.js';
import { buildUnmonitoredTrustPulse } from './reality-conversation-trust-pulse-v0.1.js';
import { inspectConversationDrift } from './reality-conversation-drift-integrity-v0.1.js';
import { inspectLiveDetectorShadow } from './reality-live-detector-shadow-v0.1.js';
import { buildInvariantFrame } from './reality-alignment-invariant-contract-v0.1.js';
import { buildSelectiveCognitiveAlignmentV02, assessCurrentTurnFocusV02 } from './reality-selective-cognitive-alignment-v0.2.js';
import { readGroundedEvidence } from './reality-reliability-evidence-v0.1.js';
import { extractReliabilityClaims } from './reality-reliability-claim-extraction-v0.1.js';
import { createOperationalSituation, transitionOperationalSituation } from './operational-situation-v1.0.js';

async function loadUniverseContext({ systemContext = null, continuityRootId = null, fetchImpl } = {}) {
  const requestContext = buildNativeUniverseContext({ systemContext });
  if (process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED !== 'true') return requestContext;

  const durable = await retrievePersistedUniverse({ continuityRootId, limit: 100, fetchImpl });
  return Object.freeze({
    ...requestContext,
    status: durable.status,
    count: requestContext.count + durable.count,
    entries: Object.freeze([...durable.entries, ...requestContext.entries]),
    persistence: durable.persistence,
    durable_count: durable.count,
    continuity_root_id: continuityRootId,
  });
}

import { runRealityCognitiveRuntime } from './reality-cognitive-runtime-v1.0.js';
import { invokeRealityModel } from './reality-model-gateway-v0.1.js';
import {
  createIntentRecord,
  structureIntent,
  createWorkItem,
  buildPreflightPackage,
  buildAuthorizationRequest,
  createWorkflowRun,
} from './reality-governed-work-runtime-v0.1.js';

export const LIVE_INTELLIGENCE_ORCHESTRATION_VERSION = 'reality-live-intelligence-orchestration-v0.1';

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createIntelligenceTrainingExperience({
  message,
  governedSignal,
  intelligence,
  systemContext,
  governance,
  execution,
  observedAt,
} = {}) {
  const answer = typeof intelligence?.answer === 'string' ? intelligence.answer : '';
  return Object.freeze({
    experience_id: `training_experience:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    observed_at: observedAt || new Date().toISOString(),
    input: String(message || ''),
    governed_signal_hash: governedSignal?.signal_hash || governedSignal?.canonical_packet_id || null,
    response_summary: answer.slice(0, 2000),
    runtime_version: intelligence?.runtime_version || null,
    governance,
    execution,
    universe_context_count: Number(systemContext?.universe_context_count || 0),
    verified_outcome_required: true,
    status: 'UNVERIFIED',
  });
}

function proposeTrainingExperiment(trainingExperience) {
  return Object.freeze({
    experiment_id: `training_experiment:${trainingExperience.experience_id}`,
    basis: trainingExperience.experience_id,
    status: 'PROPOSED',
    requires_verified_outcome: true,
    authority_change: 'NONE',
    capability_change: 'NONE',
  });
}

function isExplicitlyProhibitedFragment(text) {
  return /^(do not|don't|never)\b/i.test(text.trim());
}

function extractGitHubIssueProposal(answer) {
  const text = typeof answer === 'string' ? answer : '';
  if (!/\bGitHub\b/i.test(text)) return null;

  const titleMatch = text.match(/(?:\*\*\s*)?(?:Issue\s+title|Title)(?:\s*\*\*)?\s*:\s*([^\n]+)/i);
  const bodyMarker = text.match(/(?:\*\*\s*)?(?:Issue\s+body|Body)(?:\s*\*\*)?\s*:/i);
  if (!titleMatch || !bodyMarker) return null;

  const title = titleMatch[1].trim().replace(/^\`\`\`(?:text)?\s*/i, '').replace(/\s*\`\`\`$/i, '');
  const bodyStart = bodyMarker.index + bodyMarker[0].length;
  const remainder = text.slice(bodyStart).replace(/^\s*\n/, '');
  const nextSection = remainder.search(/\n\s*\*\*[^\n]+\*\*\s*:/i);
  const body = (nextSection >= 0 ? remainder.slice(0, nextSection) : remainder)
    .trim().replace(/^\`\`\`(?:markdown|text)?\s*\n?/i, '').replace(/\n\s*\`\`\`\s*$/i, '');

  if (!title || !body || title.length > 200 || body.length > 10000) return null;
  return Object.freeze({ title, body });
}

function materialityFromSignal(signal) {
  // The Cleaner owns quote scope. External quoted instructions are not
  // user requests. Materiality indicates review risk, NOT execution authority.
  const candidate=(signal?.fragments||[]).some(f=>{
    const direct=f.intake_observation?.markers;
    if(direct)return direct.direct_action_cue_present&&!direct.explicit_prohibition;
    const text=f.cleaned_text||'';
    return !isExplicitlyProhibitedFragment(text)&&
      /\b(create|execute|send|email|reply|publish|post|delete|buy|purchase|schedule|cancel|transfer|pay|write|update|change|deploy|merge)\b/i.test(text);
  });
  return candidate?'ACTION_CANDIDATE':'CONVERSATIONAL';
}

export async function runLiveIntelligenceOrchestration({
  message,
  observedAt,
  requestedBy = 'chat_user',
  systemContext = null,
  // This parameter is supplied ONLY by a trusted server-side history adapter.
  // Client-provided systemContext cannot impersonate authenticated past turns.
  verifiedConversationTurns = null,
  model,
  apiKey,
  fetchImpl,
} = {}) {
  if (typeof message !== 'string' || !message.trim()) throw new Error('MESSAGE_REQUIRED');

  const governedSignal = buildGovernedChatSignal({ message, observedAt });
  const explicitContinuityRootId = String(systemContext?.continuity_root_id || '').trim() || null;
  const conversationContinuityRootId = deriveContinuityRootId({
    explicitRootId: null,
    conversationId: systemContext?.conversation_id,
    workstreamId: systemContext?.workstream_id,
  });
  const universeContext = await loadUniverseContext({ systemContext, continuityRootId: explicitContinuityRootId, fetchImpl });
  const suppliedUniverseCount =
    (Array.isArray(systemContext?.universe_entries) ? systemContext.universe_entries.length : 0) +
    (Array.isArray(systemContext?.connected_world_observations) ? systemContext.connected_world_observations.length : 0);
  if (suppliedUniverseCount > 0 && universeContext.count === 0) {
    const error = new Error('UNIVERSE_CONTEXT_HANDOFF_FAILED');
    error.code = 'UNIVERSE_CONTEXT_HANDOFF_FAILED';
    throw error;
  }
  let persistedContinuity = explicitContinuityRootId
    ? buildContinuityRehydration({
        continuityRootId: explicitContinuityRootId,
        entries: universeContext.entries,
        trigger: 'CURRENT_REQUEST',
      })
    : null;

  let continuityDiscovery = null;
  let discoveredContinuityRootId = null;
  if (!explicitContinuityRootId && process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED === 'true') {
    const dormant = await retrieveDormantContinuitySummaries({
      worldlineId: systemContext?.worldline_id || null,
      limit: 1000,
      fetchImpl,
    });
    const observations = Array.isArray(systemContext?.connected_world_observations)
      ? systemContext.connected_world_observations : [];
    const evidence = {
      id: governedSignal?.signal_hash || null,
      title: observations.length ? 'New connected-world evidence' : 'New operational signal',
      description: [message, ...observations.map((item) => item?.summary || item?.description || item?.text || '')]
        .filter(Boolean).join(' '),
      domain: systemContext?.domain || null,
      work_item_id: systemContext?.work_item_id || null,
      continuation_condition: systemContext?.continuation_condition || null,
    };
    continuityDiscovery = discoverDormantContinuity({ evidence, dormantContinuities: dormant.entries });
    const top = continuityDiscovery.candidates?.[0] || null;
    if (top && continuityDiscovery.ambiguity_preserved !== true) {
      discoveredContinuityRootId = top.continuity_root_id;
    }
  }
  const effectiveContinuityRootId = discoveredContinuityRootId || explicitContinuityRootId || conversationContinuityRootId;
  const continuityRuntime = await startContinuityRuntime({
    continuityRootSource: effectiveContinuityRootId,
    worldlineSource: systemContext?.worldline_id || 'reality:primary',
    subjectId: systemContext?.work_item_id || systemContext?.conversation_id || systemContext?.thought_id || governedSignal.packet.packet_id,
    signal: governedSignal,
    observedAt: observedAt || new Date().toISOString(),
    fetchImpl,
  });
  if (discoveredContinuityRootId) {
    const discoveredUniverse = await retrievePersistedUniverse({ continuityRootId: discoveredContinuityRootId, limit: 100, fetchImpl });
    persistedContinuity = buildContinuityRehydration({ continuityRootId: discoveredContinuityRootId, entries: discoveredUniverse.entries, trigger: 'ROOT_INDEPENDENT_NEW_EVIDENCE' });
  }
  // Align the current task BEFORE generation, from the SAME existing source
  // readback as Continuity. This is a projection, not new memory or authority.
  let preCognitionAlignment = null;
  if (process.env.VERCEL_ENV === 'preview' &&
      process.env.REALITY_CONTINUOUS_RELIABILITY_ENABLED === 'true' &&
      continuityRuntime?.enabled && systemContext?.world_id) {
    const history = await continuityRuntime.readback();
    const grounded = readGroundedEvidence(history,{worldId:systemContext.world_id,
      asOf:observedAt||new Date().toISOString()});
    if (grounded.source_receipt_ids.length) {
      const receiptById = new Map(history.map(x=>[x.event_id,x]));
      const facts = grounded.facts.map(f=>{
        const event = receiptById.get(f.evidence_ref);
        if (!event?.assertion_time || !event?.effective_time)
          throw Error('PRE_COGNITION_SOURCE_TIME_MISSING');
        return {key:f.key,value:f.value,world_id:systemContext.world_id,
          source_receipt_id:f.evidence_ref,system_time:event.assertion_time,
          valid_from:event.effective_time,source_kind:'SOURCE_ATTESTED_CONTINUITY_READBACK'};
      });
      const asOf=observedAt||new Date().toISOString();
      const frame=buildInvariantFrame({
        records:facts,asOf,worldId:systemContext.world_id,
        continuityRootId:effectiveContinuityRootId,
        activeObjective:message,sourceKind:'SOURCE_ATTESTED_CONTINUITY_READBACK',
      });
      preCognitionAlignment=buildSelectiveCognitiveAlignmentV02({
        currentUserMessage:message,
        currentUserSourceRef:governedSignal.packet.packet_id,
        priorTurns:Array.isArray(verifiedConversationTurns)?verifiedConversationTurns:[],
        historySource:Array.isArray(verifiedConversationTurns)?
          'AUTHENTICATED_CONVERSATION_MESSAGES':'NOT_ATTESTED',
        frame,continuityRootId:effectiveContinuityRootId,
      });
    }
  }

  // Ground the NEXT cognitive turn from the reconstructed ledger, not from
  // the previous model answer. A superseded source claim is never inherited.
  let reliabilityGrounding = null;
  let sourceAttestedFrameSnapshot = null;
  if (process.env.VERCEL_ENV === 'preview' &&
      process.env.REALITY_CONTINUOUS_RELIABILITY_ENABLED === 'true' &&
      continuityRuntime?.enabled && systemContext?.world_id) {
    const evidenceHistory = await continuityRuntime.readback();
    const grounded = readGroundedEvidence(evidenceHistory,{worldId:systemContext.world_id});
    sourceAttestedFrameSnapshot = grounded;
    if (grounded.source_receipt_ids.length) {
      reliabilityGrounding = {
        world_id:grounded.world_id,
        evidence_basis:grounded.epistemic_basis,
        facts:grounded.facts.map(f=>({key:f.key,value:f.value,source_receipt_id:f.evidence_ref})),
        active_obligations:grounded.obligations.filter(o=>o.active).map(o=>({
          id:o.id,source_receipt_id:o.evidence_ref,
        })),
        evidence_source_receipt_ids:grounded.source_receipt_ids,
        source_attestations_are_not_infallible:true,
      };
    }
  }
  // Project server-authenticated conversation history BEFORE generation.
  // This fills the continuity handoff gap without treating prior model text
  // or Cleaner candidate interpretations as independently verified truth.
  const authenticatedConversationContinuity=buildCognitionContinuityHandoff({
    governedSignal,verifiedConversationTurns,latestMessage:message,
  });
  // Restore user-owned goal EVIDENCE from prior canonical frames in the SAME
  // Continuity spine. The oldest source survives bounded chat retrieval.
  // No assistant suggestion or inferred pivot can silently rewrite it.
  const normalizedContinuityRoot=continuityRuntime?.spine?.continuity_root_id||
    effectiveContinuityRootId||('turn:'+governedSignal.packet.packet_id);
  const priorGoalContinuityHistory=continuityRuntime?.enabled?
    await continuityRuntime.readback():[];
  const oldGoalState=continuityRuntime?.enabled?
    recoverPriorUserGoalState({
      continuityHistory:priorGoalContinuityHistory,
      continuityRootId:normalizedContinuityRoot,
      worldId:systemContext?.world_id||null,
    }):null;
  const userGoalContinuityState=buildUserGoalContinuityState({
    continuityRootId:normalizedContinuityRoot,
    worldId:systemContext?.world_id||null,
    verifiedConversationTurns,
    currentUserMessage:message,
    currentUserSourceRef:governedSignal.packet.packet_id,
    priorState:oldGoalState,
    conversationHistoryMayBeIncomplete:Boolean(
      systemContext?.conversation_history_older_messages_may_be_missing),
  });
  const goalLifecycle=projectProvisionalGoalLifecycle({
    continuityHistory:priorGoalContinuityHistory,
    continuityRootId:normalizedContinuityRoot,
    worldId:systemContext?.world_id||null,
    goalState:userGoalContinuityState,
  });
  const userGoalStateContract=projectGoalStateContract({
    lifecycle:goalLifecycle,goalEvidence:userGoalContinuityState,
    worldId:systemContext?.world_id||null,
  });
  const sourceLinkedOriginal={
    source_ref:userGoalContinuityState.original_user_goal_source_ref,
    text:userGoalContinuityState.original_user_goal_candidate,
    source_role:'USER_CHANNEL_GOAL_CANDIDATE_NOT_RESOLVED',
  };
  const goalAwareContinuity={
    ...authenticatedConversationContinuity,
    user_goal_trajectory:{
      ...authenticatedConversationContinuity.user_goal_trajectory,
      original_user_goal_candidate:sourceLinkedOriginal,
      original_goal_survived_history_window:Boolean(oldGoalState),
      goal_lifecycle_reconciliation_status:
        userGoalContinuityState.lifecycle_reconciliation_status,
      assistant_suggestions_can_change_goal:false,
      // Working interpretation from prior source-linked *user* turns, not
      // an autonomous change of user intent or execution authority.
      working_goal_lifecycle:goalLifecycle,
    },
    user_goal_continuity_summary:{
      original_goal_evidence_id:userGoalContinuityState.original_user_goal_evidence_id,
      current_user_evidence_id:userGoalContinuityState.current_user_evidence_id,
      lifecycle_status:userGoalContinuityState.lifecycle_reconciliation_status,
      provisional_working_goal_ref:goalLifecycle.working_goal.source_ref,
      unresolved_semantic_transitions:goalLifecycle.unresolved_semantic_transitions,
      active_goal_verified:false,
      unresolved_transition_count:userGoalContinuityState.unresolved_user_goal_transitions.length,
      earlier_evidence_omitted_at_least:userGoalContinuityState.goal_evidence_records_omitted_at_least,
    },
  };
  // One projection shared across ingestion, cognition, evidence review and
  // durable Continuity. A report is still not verified truth.
  const canonicalEpistemicFrame=buildCanonicalEpistemicFrame({
    governedSignal,conversationContinuity:goalAwareContinuity,
    userGoalContinuityState,userGoalLifecycle:goalLifecycle,
    userGoalStateContract,
    sourceAttestedSnapshot:sourceAttestedFrameSnapshot,
    worldId:systemContext?.world_id||null,
    // The Continuity spine canonicalizes the root to a UUID. Use that
    // exact root for durable readback; unscoped chat remains explicitly ephemeral.
    continuityRootId:normalizedContinuityRoot,
    observedAt:observedAt||new Date().toISOString(),
    historyMayBeIncomplete:Boolean(systemContext?.conversation_history_older_messages_may_be_missing),
  });
  const epistemicFrameReceipt=await recordCanonicalEpistemicFrame({
    frame:canonicalEpistemicFrame,continuityRuntime,
  });
  // The original server-side message array is used to form the bounded,
  // source-linked projection. Never duplicate the entire raw transcript in
  // every observer/verifier/adversary/synthesis model request.
  const {
    authenticated_conversation_turns:_unboundedRawConversationHistory,
    verified_conversation_context:_redundantFlattenedConversationHistory,
    ...boundedCognitionInput
  }=systemContext||{};
  const cognitionContext = {
    ...boundedCognitionInput,
    conversation_continuity:goalAwareContinuity,
    canonical_epistemic_state:canonicalEpistemicFrame,
    canonical_epistemic_receipt:epistemicFrameReceipt,
    user_goal_state_contract:canonicalEpistemicFrame.user_goal_state_contract,
    reliability_grounding:reliabilityGrounding,
    signal_intake:governedSignal.intake_semantics||null,
    signal_typed_intake:governedSignal.typed_epistemic_intake||null,
    current_turn_alignment:preCognitionAlignment?.capsule||null,
    continuity_root_id: effectiveContinuityRootId,
    continuity_status: persistedContinuity?.status || 'NO_CONTINUITY_ROOT',
    continuity_latest_state: persistedContinuity?.latest_state || null,
    continuity_rehydrated: persistedContinuity?.continuation_available === true,
    continuity_entry_count: persistedContinuity?.matched_entry_count || 0,
    reality_context_source: 'UNIVERSE',
    universe_context_status: universeContext.status,
    universe_context_count: universeContext.count,
  };
  const controlledPreviewModel = process.env.VERCEL_ENV === 'preview' &&
    process.env.REALITY_CONTINUOUS_RELIABILITY_ENABLED === 'true';
  const resolvedModel = model || (controlledPreviewModel ?
    process.env.REALITY_RELIABILITY_MODEL : undefined);
  const resolvedApiKey = apiKey || (controlledPreviewModel ?
    process.env.REALITY_STANDALONE_OPENAI_API_KEY : undefined);
  const cognitiveResult = await runRealityCognitiveRuntime({
    message,
    governedSignal,
    systemContext: cognitionContext,
    universeEntries: universeContext.entries,
    model:resolvedModel,
    apiKey:resolvedApiKey,
    fetchImpl,
  });
  const modelResult = {
    ...cognitiveResult,
    answer: cognitiveResult.answer,
    cognitive_runtime_version: cognitiveResult.runtime_version,
  };

  // Preview-only, explicitly opted-in continuous evidence receipts. Never
  // treat an unstructured model answer as verified facts or report 0% drift.
  const reliabilityPreviewEnabled = process.env.VERCEL_ENV === 'preview' &&
    process.env.REALITY_CONTINUOUS_RELIABILITY_ENABLED === 'true';
  let reliabilityCandidate = null;
  let reliabilityExtractionStatus = 'NOT_ATTEMPTED';
  const semanticModeEnabled=reliabilityPreviewEnabled &&
    process.env.REALITY_SEMANTIC_REVIEW_ENABLED === 'true';
  let semanticFirst=null, semanticSourceSnapshot=null, semanticReviewStatus='NOT_ATTEMPTED';
  // Inspect the actual model output BEFORE any quarantine/replacement.
  // Prior conversational anchors are eligible only from the server adapter;
  // the Signal Cleaner owns the current user turn and its packet provenance.
  const cleanerConversationContext = reliabilityPreviewEnabled
    ? buildCleanerConversationContext({governedSignal,
        priorTurns:Array.isArray(verifiedConversationTurns)?verifiedConversationTurns:[],
        authenticatedHistory:Array.isArray(verifiedConversationTurns)}) : null;
  const conversationalAssessment = reliabilityPreviewEnabled
    ? inspectConversationDrift({
        cleanerConversationContext,
        // Lexical replay is bounded; full 240-message typed conditions are
        // provided by the source-linked Cleaner conversation projection.
        priorTurns: Array.isArray(verifiedConversationTurns)?verifiedConversationTurns.slice(-80):[],
        historySource: Array.isArray(verifiedConversationTurns)
          ? 'AUTHENTICATED_CONVERSATION_MESSAGES' : 'NOT_ATTESTED',
        currentUserMessage: message,
        currentUserSourceRef: governedSignal.packet.packet_id,
        modelAnswer: String(modelResult?.answer || ''),
        continuityRootId: effectiveContinuityRootId,
        modelResponseId: modelResult?.response_id || governedSignal.packet.packet_id,
      })
    : null;
  // Preview-only shadow read of the existing Continuity/Universe snapshot.
  // This may generate CANDIDATES; it cannot change an answer, authorize an
  // external effect, or replace the original Integrity Spine assessment.
  const shadowEnabled = reliabilityPreviewEnabled &&
    process.env.REALITY_DETECTOR_SHADOW_ENABLED === 'true';
  let detectorShadow = null;
  if (shadowEnabled) {
    try {
      detectorShadow = await inspectLiveDetectorShadow({
        enabled:true,continuityRuntime,
        worldId:systemContext?.world_id || null,
        continuityRootId:effectiveContinuityRootId,
        currentUserMessage:message,
        currentUserSourceRef:governedSignal.packet.packet_id,
        modelAnswer:String(modelResult?.answer || ''),
        modelResponseId:modelResult?.response_id || null,
        observedAt:observedAt || new Date().toISOString(),
        priorTurns:Array.isArray(verifiedConversationTurns)?verifiedConversationTurns:[],
        authenticatedHistory:Array.isArray(verifiedConversationTurns),
        existingDetectorFindings:conversationalAssessment?.findings || [],
      });
    } catch (error) {
      // Shadow failures are recorded as unassessed. No invented 0% scores,
      // and the original model reply / deterministic authority remain intact.
      detectorShadow = {
        status:'SHADOW_SOURCE_OR_PROJECTION_ERROR',
        failure_code:String(error?.code || error?.message || 'UNKNOWN').slice(0,100),
        independently_verified_error_count:null,drift_rate_pct:null,
        live_execution_authorized:false,automated_intervention:false,
      };
    }
  }
  // Single meaning-based review replaces keyword-based release decisions and
  // the separate LLM quote extractor when enabled. Both originate from THIS
  // Reality runtime; the reviewer has no truth or execution authority.
  if (semanticModeEnabled) {
    try {
      if (systemContext?.world_id && continuityRuntime?.enabled) {
        const sourceHistory=await continuityRuntime.readback();
        const available=readGroundedEvidence(sourceHistory,{
          worldId:systemContext.world_id,
        });
        if (available.source_receipt_ids.length)semanticSourceSnapshot=available;
      }
      semanticFirst=await reviewRealityAnswer({
        cleanerConversationContext,
        conversationEvidence:canonicalEpistemicFrame.conversation_evidence||null,
          userGoalTrajectory:canonicalEpistemicFrame.user_goal_trajectory||null,
        currentUserMessage:message,modelAnswer:String(modelResult.answer||''),
        sourceSnapshot:semanticSourceSnapshot,
        priorTurns:Array.isArray(verifiedConversationTurns)?verifiedConversationTurns:[],
        worldId:systemContext?.world_id||null,
        model:process.env.REALITY_SEMANTIC_REVIEW_MODEL||cognitiveResult.model||resolvedModel||process.env.REALITY_OPENAI_MODEL||'gpt-4.1-mini',
        apiKey:resolvedApiKey||process.env.OPENAI_API_KEY,fetchImpl,
      });
      semanticReviewStatus=semanticFirst.review.status;
      reliabilityCandidate=semanticFirst.candidate;
      reliabilityExtractionStatus='SEMANTIC_REVIEW_'+semanticReviewStatus;
    } catch (error) {
      semanticReviewStatus='UNASSESSED:'+String(error?.message||'UNKNOWN').slice(0,100);
      reliabilityExtractionStatus=semanticReviewStatus;
    }
  }
  if (!semanticModeEnabled && reliabilityPreviewEnabled &&
      process.env.REALITY_RELIABILITY_EXTRACTION_ENABLED === 'true' &&
      systemContext?.world_id && continuityRuntime?.enabled) {
    try {
      const evidenceHistory = await continuityRuntime.readback();
      const grounded = readGroundedEvidence(evidenceHistory,{worldId:systemContext.world_id});
      if (grounded.source_receipt_ids.length) {
        const extraction = await extractReliabilityClaims({
          modelOutput:String(modelResult?.answer || ''),worldId:systemContext.world_id,
          snapshot:grounded,apiKey:resolvedApiKey||process.env.OPENAI_API_KEY,
          model:resolvedModel||process.env.REALITY_OPENAI_MODEL||'gpt-5.6-luna',fetchImpl,
        });
        reliabilityCandidate = extraction.candidate;
        reliabilityExtractionStatus = extraction.extraction_status;
      } else {
        reliabilityExtractionStatus = 'NO_ATTESTED_SOURCE';
      }
    } catch (error) {
      // The answer still exists; its reliability simply must NOT be scored
      // as accurate. A later backcheck must see this coverage gap.
      reliabilityExtractionStatus = 'FAILED:'+String(error?.message || 'UNKNOWN').slice(0,80);
    }
  }
  // Merge conversation-specific semantic review candidates into the EXISTING
  // Continuity conversational-drift receipt. This is not another detector or
  // another model call: the same reviewer compared the exact source-linked
  // user messages against the proposed answer. No candidate is ground truth.
  const comparedUserRefs=Array.isArray(verifiedConversationTurns)
    ? verifiedConversationTurns.filter(t=>t?.role==='user').slice(-24)
      .map(t=>t.source_ref).filter(Boolean) : [];
  const semanticConversationFindings=(semanticFirst?.review?.issues||[])
    .filter(x=>['FACT_CONTRADICTION','FORGOTTEN_OBLIGATION','WRONG_TASK'].includes(x.kind))
    .map((issue,i)=>({
      issue_id:'semantic-conversation:'+String(semanticFirst.response_id||governedSignal.packet.packet_id)+':'+i,
      classification:({
        FACT_CONTRADICTION:'CONVERSATION_FACT_CONTRADICTION_CANDIDATE',
        FORGOTTEN_OBLIGATION:'CONVERSATION_OBLIGATION_LOSS_CANDIDATE',
        WRONG_TASK:'CONVERSATION_TOPIC_DRIFT_CANDIDATE',
      })[issue.kind],
      origin_stage:'COGNITION',
      detector_channel:'EXISTING_SEMANTIC_CONVERSATION_REVIEW',
      source_receipt_refs:[governedSignal.packet.packet_id,
        ...comparedUserRefs,'semantic-review:'+String(semanticFirst.response_id||'untracked')],
      original_user_text:String(message).slice(0,400),
      observed_model_text:issue.quote,
      reason:issue.reason,
      reviewer_response_id:semanticFirst.response_id||null,
      independently_adjudicated:false,verified_hallucination:false,
      auto_correction_authorized:false,
    }));
  // One existing review pass; make missing/partial semantic coverage explicit
  // BEFORE persisting the ordinary Continuity verification receipt. A zero
  // candidate count is never a measured zero drift rate.
  const goalDriftCoverage=assessGoalDriftCoverage({
    semanticReview:semanticFirst?.review||null,semanticReviewStatus,
    userGoalTrajectory:canonicalEpistemicFrame.user_goal_trajectory,
    historyMayBeIncomplete:Boolean(
      systemContext?.conversation_history_older_messages_may_be_missing||
      canonicalEpistemicFrame.history_incomplete),
    trustedConversationHistory:Array.isArray(verifiedConversationTurns),
    findings:[...(conversationalAssessment?.findings||[]),...semanticConversationFindings],
  });
  const userGoalTransitionContract=projectGoalTransitionContract({
    currentTurnId:governedSignal.packet.packet_id,
    goalState:userGoalStateContract,
    userDirection:semanticFirst?.review?.goal_trajectory_review?.user_direction||'UNCLEAR',
    sourceUserTurnId:governedSignal.packet.packet_id,
    reviewerEvidenceId:semanticFirst?.response_id||null,
  });
  const assistantGoalProposal=projectAssistantGoalProposal({
    firstAnswer:String(modelResult.answer||''),
    modelResponseId:modelResult.response_id||null,
    currentTurnId:governedSignal.packet.packet_id,
    goalState:userGoalStateContract,
    semanticReview:semanticFirst?.review||null,
    reviewerResponseId:semanticFirst?.response_id||null,
  });
  const assistantGoalDecision=enforceGoalTransitionBoundary({
    proposal:assistantGoalProposal,goalState:userGoalStateContract,
  });
  const combinedConversationalAssessment=conversationalAssessment?{
    ...conversationalAssessment,
    status:semanticConversationFindings.length?'EARLY_CONVERSATION_DRIFT_RISK':
      conversationalAssessment.status,
    assessment_scope:'TYPED_CONDITIONS_LEXICAL_REPLAY_AND_SEMANTIC_USER_CONVERSATION_CANDIDATES',
    coverage:{...conversationalAssessment.coverage,
      semantic_review_source:'SINGLE_EXISTING_REVIEW_PASS',
      semantic_comparison_independently_verified:false,
      reviewer_status:semanticFirst?.review?.status||'NOT_ASSESSED',
      comparison_may_omit_earlier_user_history:true,
      goal_drift_coverage:goalDriftCoverage},
    findings:[...conversationalAssessment.findings,...semanticConversationFindings],
  }:null;
  const continuousReliability = reliabilityPreviewEnabled
    ? await runContinuousReliabilityCycle({
        continuityRuntime,
        modelOutput: String(modelResult?.answer || ''),
        modelResponseId: modelResult?.response_id || null,
        packetId: governedSignal.packet.packet_id,
        structuredCandidate:reliabilityCandidate,
        conversationalAssessment:combinedConversationalAssessment,
        detectorShadow,
        epistemicFrameReference:epistemicFrameReceipt,
        semanticReview:semanticFirst?.review||{status:semanticReviewStatus,
          independent_semantic_adjudication:false,external_action_authorized:false},
        semanticRelevantClaimKeys:semanticModeEnabled?
          (semanticFirst?.review?.relevant_source_keys||[]):null,
        currentUserMessage:message,
        authorizedWorldId:systemContext?.world_id || null,
        observedAt: observedAt || new Date().toISOString(),
      })
    : { evaluation_status: 'DISABLED', drift_rate_pct: null, hallucination_rate_pct: null,
        trust_pulse: buildUnmonitoredTrustPulse() };
  const reliabilityWithExtraction = { ...continuousReliability, extraction_status: reliabilityExtractionStatus,
    semantic_review:semanticFirst?.review||{status:semanticReviewStatus,
      independent_semantic_adjudication:false},
    detector_shadow:detectorShadow,
    canonical_epistemic_state:{frame_hash:canonicalEpistemicFrame.frame_hash,
      status:epistemicFrameReceipt.status,history_coverage:canonicalEpistemicFrame.history_coverage,
      source_receipt_id:epistemicFrameReceipt.source_receipt_id,
      reported_claim_count:canonicalEpistemicFrame.reported_claims.length},
    goal_authority_contracts:{
      goal_state:userGoalStateContract,
      goal_transition:userGoalTransitionContract,
      assistant_proposal:assistantGoalProposal,
      boundary_decision:assistantGoalDecision,
      confirmed_user_authority_transition:false,
    },
    user_goal_continuity:{
      original_user_source_ref:userGoalContinuityState.original_user_goal_source_ref,
      preserved_original_goal_across_turns:Boolean(oldGoalState),
      provisional_working_goal_source_ref:goalLifecycle.working_goal.source_ref,
      provisional_working_goal_text:goalLifecycle.working_goal.text.slice(0,300),
      pending_semantic_reconciliation:!goalLifecycle.user_intent_semantically_verified,
      lifecycle_status:goalLifecycle.status,
      paused_goal_candidate_count:goalLifecycle.paused_goal_candidates.length,
      historical_transition_receipt_count:goalLifecycle.recent_transition_receipts.length,
      persistent_state_receipt_status:epistemicFrameReceipt.status,
      action_execution_authorized:false,
      drift_improvement_verified:false,
    },
    conversational_assessment: combinedConversationalAssessment?{
      status:combinedConversationalAssessment.status,
      coverage:combinedConversationalAssessment.assessment_scope,
      findings_count:combinedConversationalAssessment.findings?.length||0,
      semantic_conversation_candidates:semanticConversationFindings.length,
      history_scope:combinedConversationalAssessment.history_scope,
      independently_verified_drift_rate:null,
      goal_drift_coverage:goalDriftCoverage,
    }:null,
  };
  const initialAssistantProposalText=String(modelResult?.answer||'');
  // Meaning-first correction. Never accept a candidate because its keyword
  // flags went away: regenerate ONCE, then review source claims and objective
  // again. All semantic judgments remain provisional, not verified world truth.
  if (semanticModeEnabled) {
    const review=semanticFirst?.review;
    const originalModelText=String(modelResult.answer||'');
    const sourceAdjudication=adjudicateSourceReview({
      answer:originalModelText,review,candidate:semanticFirst?.candidate,
      sourceSnapshot:semanticSourceSnapshot,
    });
    reliabilityWithExtraction.source_review_adjudication=sourceAdjudication;
    const explicitlySupportedIssueQuotes=new Set(
      sourceAdjudication.source_supported_issue_quotes.map(x=>x.issue_quote));
    const releaseRelevantIssues=(review?.issues||[]).filter(issue=>
      issue.kind!=='UNSUPPORTED_FACT' ||
      !explicitlySupportedIssueQuotes.has(issue.quote));
    const userObjectiveNotAddressed=Boolean(review &&
      review.addresses_current_request===false &&
      review.issues.some(x=>x.kind==='WRONG_TASK'));
    const provedSourceConflict=Boolean(continuousReliability.model_output_quarantined &&
      (continuousReliability.drift||[]).includes('FACT_DRIFT'));
    const materialUnsupportedClaim=Boolean(releaseRelevantIssues.some(x=>
      ['UNSUPPORTED_FACT','FALSE_COMPLETION','AUTHORITY_CONFUSION'].includes(x.kind)));
    // Contradictions against authenticated USER conversation are eligible for
    // the existing revise-once / re-review path, just like lost obligations.
    // A finding is still a candidate, never independently proven truth.
    const conversationalRepairCandidate=releaseRelevantIssues.some(x=>
      ['FACT_CONTRADICTION','FORGOTTEN_OBLIGATION','WRONG_TASK'].includes(x.kind));
    const semanticRepairCandidate=conversationalRepairCandidate||userObjectiveNotAddressed||
      provedSourceConflict||materialUnsupportedClaim;
    if (semanticRepairCandidate &&
        process.env.REALITY_DETECTOR_REPAIR_ENABLED==='true') {
      const originalResponseId=modelResult.response_id||null;
      let retry=null, retryReview=null, retryFailure=null, deterministicReview=null;
      try{
        retry=await invokeRealityModel({
          governedSignal,
          systemContext:{
            ...cognitionContext,
            current_turn_alignment:preCognitionAlignment?.capsule||null,
            semantic_review_feedback:{
              status:'UNTRUSTED_REVIEW_CANDIDATE',
              cleaner_conversation_context:cleanerConversationContext,
              mistakes:releaseRelevantIssues.map(x=>({
                kind:x.kind,quote:x.quote,reason:x.reason,
              })),
              conversation_comparison_must_preserve_current_user_scope:true,
              source_corrections:continuousReliability.source_attested_correction_proposals||[],
              original_answer_for_targeted_revision:originalModelText.slice(0,5000),
            },
            cognitive_instruction:[
              'This is a correction attempt within Reality.',
              'Answer the CURRENT user request directly, not a previous question.',
              'Compare the exact source-linked earlier user statements and later corrections. Preserve scope, negations and current unresolved status.',
              'Do not turn a missing confirmation into confirmation of the opposite event. Unverified delivery means delivery unknown, not delivered and not NOT DELIVERED.',
              'Revise only the issue quoted by the reviewer. Do not add a generic warning to an otherwise valid answer.',
              'Use the supplied source-attested records and respect time/order of supersessions.',
              'Do not claim any action was executed or approved without evidence.',
              'Perform a MINIMAL evidence-backed revision: preserve accurate source-backed claims and requested deliverables.',
              'Do not treat an untrusted reviewer concern as evidence that an otherwise supported statement is false.',
              'Clearly qualify external effects or reliability claims not established by the supplied source records.',
              'If the user requested an internal draft, still deliver the draft; never externally send or publish it.',
            ].join(' '),
          },
          model:resolvedModel,apiKey:resolvedApiKey,fetchImpl,
        });
        retryReview=await reviewRealityAnswer({
          cleanerConversationContext,
          conversationEvidence:canonicalEpistemicFrame.conversation_evidence||null,
          userGoalTrajectory:canonicalEpistemicFrame.user_goal_trajectory||null,
          currentUserMessage:message,
          modelAnswer:String(retry.answer||''),
          sourceSnapshot:semanticSourceSnapshot,
          priorTurns:Array.isArray(verifiedConversationTurns)?verifiedConversationTurns:[],
          worldId:systemContext?.world_id||null,
          model:process.env.REALITY_SEMANTIC_REVIEW_MODEL||cognitiveResult.model||resolvedModel||process.env.REALITY_OPENAI_MODEL||'gpt-4.1-mini',
          apiKey:resolvedApiKey||process.env.OPENAI_API_KEY,fetchImpl,
        });
        if(semanticSourceSnapshot&&retryReview.candidate)
          deterministicReview=assessDrift({
            trustedSnapshot:semanticSourceSnapshot,candidate:retryReview.candidate,
          });
      }catch(error){
        retryFailure=String(error?.message||'UNKNOWN').slice(0,110);
      }
      const secondReviewPass=Boolean(retryReview?.review &&
        retryReview.review.addresses_current_request===true &&
        retryReview.review.issues.length===0 &&
        retryReview.review.unassessed_claims.length===0 &&
        (!deterministicReview||deterministicReview.codes.length===0));
      const safeToRelease=secondReviewPass &&
        (!continuousReliability.model_output_quarantined ||
          provedSourceConflict);
      const actionClaimRisk=Boolean(releaseRelevantIssues.some(issue=>
        issue.kind==='FALSE_COMPLETION'||issue.kind==='AUTHORITY_CONFUSION'));
      // Explicitly disclose reviewer-only unresolved evidence concerns
      // without deleting a good answer or pretending the detector proved
      // the quoted claim false. This is NOT a verified correction.
      const unresolvedEvidenceNotice=(!safeToRelease && materialUnsupportedClaim &&
        !actionClaimRisk)
        ? qualifyUnresolvedEvidence({originalAnswer:originalModelText,
            initialReview:review,repairVerified:false})
        : null;
      // Both review calls use the same replaceable model; this is NOT an
      // independently adjudicated accuracy finding, and no effects execute.
      const correctionReceipt=await continuityRuntime.appendStage({
        stage:'VERIFICATION',
        entityId:'semantic-repair:'+governedSignal.packet.packet_id,
        eventId:'semantic-repair:'+continuityRuntime.spine.continuity_root_id+
          ':'+governedSignal.packet.packet_id,
        epistemicStatus:'UNVERIFIED',
        evidenceRefs:[continuousReliability.receipt_id].filter(Boolean),
        payload:{
          event_type:'MODEL_SEMANTIC_REVIEW_AND_REPAIR',
          original_response_id:originalResponseId,
          review_response_id:semanticFirst?.response_id||null,
          retry_response_id:retry?.response_id||null,
          post_repair_review_response_id:retryReview?.response_id||null,
          source_reliability_receipt_id:continuousReliability.receipt_id,
          initial_issues:review?.issues||[],
          source_adjudication:sourceAdjudication,
          post_repair_issues:retryReview?.review?.issues||null,
          post_repair_source_violation_codes:deterministicReview?.codes||null,
          original_output_digest:continuousReliability.receipt_id,
          disposition:safeToRelease?'CORRECTION_CANDIDATE_CLEARED_NOT_INDEPENDENTLY_VERIFIED':
            'CORRECTION_NOT_VERIFIED',
          correction_error:retryFailure,
          released_unresolved_evidence_notice:unresolvedEvidenceNotice?.qualified===true,
          released_qualification_quotes:unresolvedEvidenceNotice?.issue_quotes||[],
          independent_source_entailment_verified:false,
          independently_verified_semantic_correctness:false,
          external_action_authorized:false,
        },
        provenance:{source:'reality_existing_orchestration_semantic_review'},
      });
      if(safeToRelease){
        modelResult.answer=String(retry.answer);
        modelResult.reliability_intervention='SEMANTIC_REVIEW_CORRECTED';
      } else if(materialUnsupportedClaim) {
        if(actionClaimRisk){
          // Consequential unverified action claims must not be released as fact.
          modelResult.answer='Reality cannot verify the claimed external action or authority from the connected records. No external action was executed by Reality.';
          modelResult.reliability_intervention='UNVERIFIED_ACTION_CLAIM_WITHHELD';
        } else if(unresolvedEvidenceNotice?.qualified===true) {
          modelResult.answer=unresolvedEvidenceNotice.answer;
          modelResult.reliability_intervention=
            'UNRESOLVED_EVIDENCE_DISCLOSED_NOT_VERIFIED_CORRECTION';
        } else {
          modelResult.reliability_intervention='UNASSESSED_SEMANTIC_REVIEW_ORIGINAL_PRESERVED';
        }
      }
      reliabilityWithExtraction.semantic_repair={
        status:safeToRelease?'CORRECTION_CANDIDATE_CLEARED_NOT_INDEPENDENTLY_VERIFIED':
          'CORRECTION_NOT_VERIFIED',
        original_response_id:originalResponseId,
        retry_response_id:retry?.response_id||null,
        first_review_id:semanticFirst?.response_id||null,
        second_review_id:retryReview?.response_id||null,
        source_violation_codes:deterministicReview?.codes||null,
        receipt_id:correctionReceipt.event_id,
        released_evidence_notice:unresolvedEvidenceNotice?.qualified===true,
        qualification_issue_quotes:unresolvedEvidenceNotice?.issue_quotes||[],
        independently_verified_correctness:false,external_action_authorized:false,
      };
      // Quarantine only if a source-backed contradiction was NOT corrected.
      if(safeToRelease && provedSourceConflict)
        reliabilityWithExtraction.source_conflict_resolved_before_release=true;
    }
  } else {
  // Repair a suspected previous-topic reply WITHIN REALITY, not via an
  // independent baseline. Keep original response and its verification receipt.
  // Restrict automatic retry to explicit unanswered current action or topic;
  // the focus checker is heuristic, so a retry is not an adjudicated truth.
  const originalFocus = preCognitionAlignment
    ? assessCurrentTurnFocusV02({
        capsule:preCognitionAlignment.capsule,
        modelAnswer:String(modelResult?.answer||''),
      }) : null;
  // Only an explicit CURRENT action omission is eligible for automatic
  // bounded retry. General topic-keyword heuristics are review signals:
  // a correct inventory checklist must not be silently rewritten.
  const focusNeedsRepair=Boolean(originalFocus?.candidate_codes?.includes(
    'CURRENT_REQUESTED_ACTION_NOT_ADDRESSED_CANDIDATE'));
  if (reliabilityPreviewEnabled &&
      process.env.REALITY_DETECTOR_REPAIR_ENABLED === 'true' &&
      focusNeedsRepair &&
      !continuousReliability.model_output_quarantined) {
    const originalResponseId=modelResult.response_id||null;
    const originalText=String(modelResult.answer||'');
    const contextForRetry={
      ...cognitionContext,
      // The original broad assistant dialogue is explicitly excluded on
      // bounded retry, to avoid repeating the previous wrong topic.
      verified_conversation_context:null,
      current_turn_alignment:preCognitionAlignment.capsule,
      cognitive_instruction: [
        'CORRECTION ATTEMPT: The previous draft did not answer the current request.',
        'Answer ONLY current_turn_alignment.PRIMARY_OBJECTIVE.original_current_user_request.',
        'Treat older assistant text as NOT authoritative; do not repeat an earlier topic.',
        'Use source-attested facts in reliability_grounding and applicable obligations.',
        'Do not claim external action or authorization. Be short and direct.',
      ].join(' '),
      previous_draft_issue_codes:originalFocus.candidate_codes,
      previous_draft_snippet:originalText.slice(0,450),
    };
    let retryResult=null, retryFocus=null, retryError=null;
    try {
      retryResult=await invokeRealityModel({
        governedSignal,systemContext:contextForRetry,
        model:resolvedModel,apiKey:resolvedApiKey,
        fetchImpl,
      });
      retryFocus=assessCurrentTurnFocusV02({
        capsule:preCognitionAlignment.capsule,
        modelAnswer:String(retryResult.answer||''),
      });
    } catch (error) {
      retryError=String(error?.code||error?.message||'MODEL_RETRY_FAILED').slice(0,100);
    }
    const repaired=Boolean(retryResult?.answer?.trim()&&
      retryFocus?.candidate_codes?.length===0);
    // This receipt is diagnostics and CONTINUITY, not independent semantic
    // or external outcome verification. Never promote model text to truth.
    const repairEvent=await continuityRuntime.appendStage({
      stage:'VERIFICATION',
      entityId:'focus-repair:'+governedSignal.packet.packet_id,
      eventId:'focus-repair:'+continuityRuntime.spine.continuity_root_id+
        ':'+governedSignal.packet.packet_id,
      epistemicStatus:'UNVERIFIED',
      evidenceRefs:[continuousReliability.receipt_id].filter(Boolean),
      payload:{
        event_type:'MODEL_ANSWER_FOCUS_REPAIR',
        original_response_id:originalResponseId,
        retry_response_id:retryResult?.response_id||null,
        original_reliability_receipt_id:continuousReliability.receipt_id,
        current_user_packet_id:governedSignal.packet.packet_id,
        initial_focus_candidates:originalFocus.candidate_codes,
        retry_focus_candidates:retryFocus?.candidate_codes||null,
        disposition:repaired?'FOCUS_CANDIDATES_CLEARED':
          'FOCUS_REPAIR_NOT_ESTABLISHED',
        retry_error:retryError,
        independently_verified_semantic_correctness:false,
        external_action_authorized:false,
      },
      provenance:{source:'reality_existing_live_orchestration_focus_repair'},
    });
    if (repaired) {
      modelResult.answer=String(retryResult.answer);
      modelResult.reliability_intervention='CURRENT_TURN_FOCUS_REGENERATED';
    }
    reliabilityWithExtraction.focus_repair={
      status:repaired?'FOCUS_CANDIDATES_CLEARED_NOT_SEMANTICALLY_ADJUDICATED':
        'FOCUS_REPAIR_NOT_ESTABLISHED',
      original_response_id:originalResponseId,
      retry_response_id:retryResult?.response_id||null,
      original_focus_candidate_codes:originalFocus.candidate_codes,
      retry_focus_candidate_codes:retryFocus?.candidate_codes||null,
      receipt_id:repairEvent.event_id,
      independently_verified_correctness:false,
    };
  }
  }
  if (reliabilityPreviewEnabled && continuousReliability.model_output_quarantined &&
      reliabilityWithExtraction.source_conflict_resolved_before_release!==true) {
    const corrections=(continuousReliability.source_attested_correction_proposals||[])
      .map(f=>String(f.key)+': '+JSON.stringify(f.source_attested_value)+
        ' (source receipt '+String(f.source_receipt_id)+')');
    modelResult.answer = [
      'Reality detected an unverified or contradictory model statement and withheld the affected answer.',
      ...(corrections.length
        ? ['The independently retrieved, source-attested record currently states: '+corrections.join('; ')+'.']
        : []),
      'The original model claim is preserved in the reliability receipt. No external action was authorized. Confirm the source if it is disputed.',
    ].join(' ');
    modelResult.reliability_intervention='QUARANTINED_PRIOR_TO_DISPLAY';
  }


  // Native pre-publication goal-authority boundary. The initial Cognition
  // answer is ALWAYS a proposal, never an instruction to mutate user goals.
  // If the same semantic review identified a quoted assistant-origin shift,
  // release only a re-reviewed correction; otherwise withhold the shift.
  // A missing semantic review is NOT evidence that no drift occurred.
  const unreviewedGoalShift=assistantGoalDecision.status===
    'UNAUTHORIZED_ASSISTANT_GOAL_SHIFT_BLOCKED'&&
    modelResult.reliability_intervention!=='SEMANTIC_REVIEW_CORRECTED';
  if(unreviewedGoalShift){
    modelResult.answer=pendingGoalAuthorizationResponse({
      goalState:userGoalStateContract,
    });
    modelResult.reliability_intervention='ASSISTANT_GOAL_SHIFT_WITHHELD_PENDING_USER_DIRECTION';
  }
  // A reviewer-only assistant claim that work is complete cannot close a
  // business goal or be emitted as an established outcome without a matching
  // independently verified result. Replace the unproved completion sentence,
  // never append a cosmetic warning while leaving the claim intact.
  const unverifiedAssistantCompletion=assistantGoalDecision.status===
    'UNVERIFIED_ASSISTANT_COMPLETION_BLOCKED';
  if(unverifiedAssistantCompletion){
    modelResult.answer=pendingGoalCompletionEvidenceResponse({
      goalState:userGoalStateContract,decision:assistantGoalDecision,
    });
    modelResult.reliability_intervention='UNVERIFIED_ASSISTANT_COMPLETION_WITHHELD';
  }
  let goalAuthorityReceipt=null;
  if(continuityRuntime?.enabled){
    const proposalEvent=await continuityRuntime.appendStage({
      stage:'VERIFICATION',
      entityId:'goal-proposal:'+governedSignal.packet.packet_id,
      eventId:'goal-proposal:'+continuityRuntime.spine.continuity_root_id+
        ':'+governedSignal.packet.packet_id,
      epistemicStatus:'UNVERIFIED',
      evidenceRefs:[epistemicFrameReceipt.source_receipt_id,
        continuousReliability?.receipt_id].filter(Boolean),
      payload:{
        event_type:'ASSISTANT_GOAL_PROPOSAL_AND_AUTHORITY_DECISION',
        goal_state_contract:userGoalStateContract,
        goal_transition:userGoalTransitionContract,
        assistant_proposal:assistantGoalProposal,
        verifier_decision:assistantGoalDecision,
        original_model_response_id:modelResult.response_id||null,
        released_intervention:modelResult.reliability_intervention||null,
        external_goal_state_mutations:0,
        external_actions_authorized:false,
        independently_verified_goal_alignment:false,
      },
      provenance:{source:'reality_native_goal_authority_before_publication'},
    });
    const confirmed=(await continuityRuntime.readback()).some(e=>
      e.event_id===proposalEvent.event_id&&
      e.payload?.event_type==='ASSISTANT_GOAL_PROPOSAL_AND_AUTHORITY_DECISION'&&
      e.payload?.assistant_proposal?.proposal_id===assistantGoalProposal.proposal_id&&
      e.payload?.verifier_decision?.status===assistantGoalDecision.status);
    if(!confirmed)throw Error('GOAL_PROPOSAL_AUTHORITY_READBACK_NOT_VERIFIED');
    goalAuthorityReceipt=proposalEvent.event_id;
  }
  reliabilityWithExtraction.goal_authority={
    proposal_id:assistantGoalProposal.proposal_id,
    boundary_status:assistantGoalDecision.status,
    source_goal_ref:userGoalStateContract.provenance.origin_turn_id,
    source_receipt_id:goalAuthorityReceipt,
    goal_state_changed:false,
    external_execution_authorized:false,
    business_completion_verified:false,
    completion_claim_withheld:unverifiedAssistantCompletion,
    current_user_lifecycle_candidate:
      semanticFirst?.review?.goal_lifecycle_review||null,
    reviewer_coverage:semanticFirst?.review?.status||semanticReviewStatus,
    independently_verified_goal_alignment:false,
  };

  const materiality = materialityFromSignal(governedSignal);
  const trainingExperience = createIntelligenceTrainingExperience({
    message,
    governedSignal,
    intelligence: modelResult,
    systemContext: cognitionContext,
    governance: materiality === 'ACTION_CANDIDATE' ? 'PROPORTIONAL_ACTION_GOVERNANCE' : 'NO_ACTION_GOVERNANCE',
    execution: 'NOT_EXECUTED',
    observedAt,
  });
  const trainingExperiment = proposeTrainingExperiment(trainingExperience);
  const continuityState = materiality === 'ACTION_CANDIDATE' ? 'ACTIVE' : 'ACTIVE';
  const continuityEvent = effectiveContinuityRootId
    ? buildContinuityEvent({
        continuityRootId: effectiveContinuityRootId,
        priorState: persistedContinuity?.latest_state || null,
        nextState: continuityState,
        trigger: persistedContinuity?.continuation_available ? 'CONTINUITY_REHYDRATED' : 'NEW_OBSERVATION',
        evidenceReferences: [governedSignal?.signal_hash, ...((governedSignal?.fragments || []).map((fragment) => fragment?.fragment_id).filter(Boolean))],
        payload: {
          continuity_state: continuityState,
          materiality,
          runtime_version: modelResult?.runtime_version || null,
          universe_context_count: universeContext.count,
          response_summary: String(modelResult?.answer || '').slice(0, 1000),
        },
        observedAt: observedAt || new Date().toISOString(),
      })
    : null;

  // The continuity spine is the canonical ledger when enabled. Do not also write
  // the legacy state-transition ledger for the same chat turn: its independent
  // lineage contract can reject the request after the canonical spine has already
  // durably recorded RAW_SIGNAL -> TRANSFORMATION -> OBSERVATION.
  if (continuityEvent && process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED === 'true' && continuityRuntime?.enabled !== true) {
    await persistContinuityEvent(continuityEvent, { fetchImpl });
  }

  let situation = null;
  if (materiality === 'ACTION_CANDIDATE') {
    const observations = Array.isArray(systemContext?.connected_world_observations)
      ? systemContext.connected_world_observations : [];
    const evidence = [
      governedSignal?.packet?.packet_id ? { ref: governedSignal.packet.packet_id, kind: 'governed_signal_unverified' } : null,
      ...observations.map((item) => item?.entry_id ? {
        ref: item.entry_id,
        kind: item.event_kind || 'connected_world_observation',
        source: item.source_ref || null,
        observed_at: item.assertion_time || null,
      } : null),
    ].filter(Boolean);
    situation = createOperationalSituation({
      observedTrigger: {
        description: String(message).slice(0, 2000),
        observed_at: observedAt || new Date().toISOString(),
        source: 'live_intelligence_orchestration',
        provenance: { runtime: LIVE_INTELLIGENCE_ORCHESTRATION_VERSION },
      },
      consequence: {
        description: 'A consequential operational request or condition requires governed handling.',
        desired_outcome: 'The requested outcome is completed only within explicit authority and independently verified.',
        materiality: 'ACTION_CANDIDATE',
      },
      evidence,
      missingEvidence: evidence.length ? [] : ['Independent supporting evidence is not yet attached.'],
      uncertainty: {
        state: evidence.length ? 'ASSESSED' : 'MISSING_EVIDENCE',
        confidence: evidence.length ? 'SUPPORTED_BY_RECORDED_SIGNAL' : null,
        known_unknowns: ['The intended external effect must not be inferred from model output alone.'],
        blocking_questions: ['What exact action, connector, target, and authorization scope apply?'],
      },
      authority: {
        status: 'REQUIRES_EXPLICIT_AUTHORIZATION',
        required_decision_maker: requestedBy,
        limits: ['Model output cannot grant authority.', 'Execution requires matching authorization and independent verification.'],
      },
      verification: {
        method: 'Independent observation of the resulting external state.',
      },
      closure: {
        criteria: ['Authorized action completed where applicable.', 'Outcome independently verified or Situation explicitly closed as non-executable.'],
      },
      observedAt,
    });
    situation = transitionOperationalSituation(situation, 'SITUATION_CREATED', {
      reason: 'ACTION_CANDIDATE_REQUIRES_GOVERNED_SITUATION',
    });
    if (evidence.length) {
      situation = transitionOperationalSituation(situation, 'EVIDENCE_ESTABLISHED', {
        reason: 'LIVE_SIGNAL_AND_CONNECTED_WORLD_EVIDENCE_ATTACHED',
      });
    }
    situation = transitionOperationalSituation(situation, 'UNCERTAINTY_ASSESSED', {
      reason: 'AUTHORITY_AND_EXTERNAL_EFFECT_REMAIN_UNRESOLVED',
    });
    situation = transitionOperationalSituation(situation, 'AUTHORITY_DETERMINED', {
      reason: 'NO_AUTHORITY_INFERRED_FROM_MODEL_OUTPUT',
    });
    situation = transitionOperationalSituation(situation, 'ACTION_PROPOSED', {
      reason: 'GOVERNED_ACTION_CANDIDATE_CREATED',
      action: { proposed: 'Continue through separately established authorization and governed execution.' },
    });
  }

  // Pre-output governance: a reviewer may interpret assistant drift but
  // cannot make a model suggestion into a user goal or execution permission.
  const goalGovernanceContract=buildAssistantGoalGovernance({
    canonicalFrame:canonicalEpistemicFrame,
    modelAnswer:initialAssistantProposalText,
    finalAnswer:String(modelResult?.answer||''),
    modelResponseId:modelResult?.response_id||null,
    semanticReview:semanticFirst?.review||null,
    observedAt:observedAt||new Date().toISOString(),
  });
  const goalGovernanceDecision=verifyGoalGovernanceBeforeStateMutation({
    contract:goalGovernanceContract,canonicalFrame:canonicalEpistemicFrame,
  });
  let goalGovernanceReceipt=null;
  if(continuityRuntime?.enabled){
    const receipt=await continuityRuntime.appendStage({
      stage:'VERIFICATION',
      entityId:'goal-governance:'+governedSignal.packet.packet_id,
      eventId:'goal-governance:'+continuityRuntime.spine.continuity_root_id+':'+governedSignal.packet.packet_id,
      epistemicStatus:'UNVERIFIED',
      evidenceRefs:[epistemicFrameReceipt.source_receipt_id,
        continuousReliability?.receipt_id].filter(Boolean),
      payload:{
        event_type:'MODEL_GOAL_PROPOSAL_GOVERNANCE',
        canonical_frame_receipt_id:epistemicFrameReceipt.source_receipt_id,
        canonical_frame_hash:canonicalEpistemicFrame.frame_hash,
        goal_governance_contract:goalGovernanceContract,
        goal_governance_decision:goalGovernanceDecision,
        semantic_goal_reviewer_response_id:semanticFirst?.response_id||null,
        final_response_is_independently_goal_verified:false,
        source_speaker_is_not_execution_authority:true,
        external_action_executed:false,
      },
      provenance:{source:'reality_existing_continuity_and_integrity_goal_contract'},
    });
    const readback=await continuityRuntime.readback();
    if(!readback.some(e=>e.event_id===receipt.event_id&&
       e.payload?.goal_governance_contract?.contract_hash===goalGovernanceContract.contract_hash&&
       e.payload?.canonical_frame_hash===canonicalEpistemicFrame.frame_hash))
      throw Error('GOAL_GOVERNANCE_RECEIPT_READBACK_INVALID');
    goalGovernanceReceipt=receipt.event_id;
  }
  reliabilityWithExtraction.goal_governance={
    status:goalGovernanceDecision.status,
    review_disposition:goalGovernanceContract.verification_disposition,
    candidate_goal_mutations:goalGovernanceContract.assistant_proposal.intended_state_mutations.goal_mutations.length,
    original_proposal_id:goalGovernanceContract.assistant_proposal.proposal_id,
    canonical_frame_hash:canonicalEpistemicFrame.frame_hash,
    governance_receipt_id:goalGovernanceReceipt,
    state_mutation_executed:false,
    external_execution_authorized:false,
    independently_verified_goal_alignment:false,
  };
  const base = {
    orchestration_version: LIVE_INTELLIGENCE_ORCHESTRATION_VERSION,
    continuity_spine: {
      version: continuityRuntime?.spine?.spine_version || null,
      status: continuityRuntime?.status || 'NO_CONTINUITY_ROOT',
      enabled: continuityRuntime?.enabled === true,
      continuity_root_id: continuityRuntime?.spine?.continuity_root_id || null,
      continuity_root_source: continuityRuntime?.spine?.continuity_root_source || effectiveContinuityRootId || null,
      worldline_id: continuityRuntime?.spine?.worldline_id || null,
      node_count: continuityRuntime?.nodes?.length || 0,
      last_event_id: continuityRuntime?.spine?.last_event_id || null,
    },
    governed_signal: clone(governedSignal),
    intelligence: clone(modelResult),
    reliability: clone(reliabilityWithExtraction),
    authority: {
      granted: false,
      execution_authorized: false,
      principle: 'MODEL_OUTPUT_IS_NOT_AUTHORITY',
    },
    execution: {
      status: 'NOT_EXECUTED',
      reason: 'INTELLIGENCE_AND_PLANNING_ONLY',
    },
    context: { universe: { status: universeContext.status, count: universeContext.count }, continuity: {
      root_id: effectiveContinuityRootId,
      discovery: continuityDiscovery,
      status: persistedContinuity?.status || 'NO_CONTINUITY_ROOT',
      rehydrated: persistedContinuity?.continuation_available === true,
      prior_state: persistedContinuity?.latest_state || null,
      current_state: continuityEvent?.next_state || null,
      event_id: continuityEvent?.continuity_event_id || null,
    } },
    situation: clone(situation),
    learning: {
      training_experience: trainingExperience,
      training_experiment: trainingExperiment,
      principle: 'REALITY_OWNS_INTELLIGENCE_AND_GOVERNANCE',
    },
  };

  if (materiality !== 'ACTION_CANDIDATE') {
    return {
      ...base,
      mode: 'CONVERSATIONAL',
      governance: 'NO_ACTION_GOVERNANCE',
      work: null,
    };
  }

  const githubIssueProposal = extractGitHubIssueProposal(modelResult?.answer);
  const isGitHubIssueAction = Boolean(githubIssueProposal) && /\bGitHub\b/i.test(message);

  const intent = createIntentRecord({
    requestedBy,
    statement: message,
    desiredOutcome: 'Complete the requested consequential goal only after explicit authorization and independent verification.',
    trigger: 'live_model_interpretation',
  });

  const workflow = structureIntent(intent, {
    objective: message,
    requiredConnectors: isGitHubIssueAction ? ['github'] : ['TO_BE_DETERMINED'],
    successConditions: ['External result is independently verified before completion.'],
  });

  const item = createWorkItem({
    workflowId: workflow.workflow_id,
    action: message,
    connector: isGitHubIssueAction ? 'github' : 'TO_BE_DETERMINED',
    operation: isGitHubIssueAction ? 'create_issue' : 'external_send',
    inputs: isGitHubIssueAction
      ? [{ repository: 'maloney2323/Reality', title: githubIssueProposal.title, body: githubIssueProposal.body }]
      : [],
    consequential: true,
    authorityRequired: ['EXPLICIT_USER_AUTHORIZATION'],
    expectedEffect: 'External effect only after matching authorization.',
    verificationMethod: 'Independent observation of the resulting GitHub issue state.',
    successConditions: isGitHubIssueAction
      ? ['GitHub issue is created in maloney2323/Reality.', 'Fresh GitHub readback independently verifies issue number, title, and open state.']
      : [],
  });

  const finalWorkflow = Object.freeze({ ...workflow, work_items: [item] });
  const preflight = buildPreflightPackage({
    intent,
    workflow: finalWorkflow,
    risks: ['External side effect requested by signal.'],
    verificationPlan: [item.verification_method],
  });
  const authorizationRequest = buildAuthorizationRequest({
    workflow: finalWorkflow,
    preflight,
    principal: requestedBy,
    scope: [{ connector: item.connector, operation: item.operation, work_item_id: item.work_item_id }],
  });
  const run = createWorkflowRun({ workflow: finalWorkflow, intent });

  if (continuityRuntime?.enabled && continuityRuntime?.appendStage) {
    await continuityRuntime.appendStage({
      stage: 'WORK',
      entityId: item.work_item_id,
      evidenceRefs: [governedSignal?.packet?.packet_id, governedSignal?.transformation_receipt?.receipt_id].filter(Boolean),
      transformationReceiptId: governedSignal?.transformation_receipt?.receipt_id || null,
      epistemicStatus: 'PROPOSED',
      payload: {
        work_item_id: item.work_item_id,
        workflow_id: workflow.workflow_id,
        connector: item.connector,
        operation: item.operation,
        consequential: item.consequential === true,
        authority_required: item.authority_required,
      },
      provenance: { source: 'reality_governed_work_runtime' },
    });
    await continuityRuntime.appendStage({
      stage: 'AUTHORITY',
      entityId: authorizationRequest.authorization_request_id || workflow.workflow_id,
      evidenceRefs: [item.work_item_id],
      epistemicStatus: 'PROPOSED',
      payload: {
        authorization_request_id: authorizationRequest.authorization_request_id || null,
        granted: false,
        status: 'REQUIRES_EXPLICIT_AUTHORIZATION',
        production_merge_permitted: false,
      },
      provenance: { source: 'reality_governed_authorization_request' },
    });
  }

  return {
    ...base,
    mode: 'ACTION_CANDIDATE',
    governance: 'PROPORTIONAL_ACTION_GOVERNANCE',
    work: {
      intent,
      workflow: finalWorkflow,
      preflight,
      authorization_request: authorizationRequest,
      run,
    },
  };
}

