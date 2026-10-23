import { buildGovernedChatSignal } from './reality-governed-fragmented-signal-cleaner-v0.1.js';
import { verifySignalCleanerRecord, recordVerifiedLayerHandoff } from './reality-verified-layer-handoff-v0.1.js';
import { retrievePersistedUniverseEntry } from './reality-native-universe-persistence-v1.0.js';
import { buildNativeUniverseContext } from './reality-native-universe-v1.0.js';
import { inspectPersistedEpistemicDifferences } from './reality-live-epistemic-diagnostics-v0.1.js';
import { retrievePersistedUniverse, retrieveLatestPersistedContinuityTransition, retrieveScopedWorkItemTransitionHistory, retrieveDormantContinuitySummaries, persistContinuityEvent } from './reality-native-universe-persistence-v1.0.js';
import { discoverDormantContinuity } from './reality-continuity-discovery-v1.0.js';
import { buildContinuityEvent, buildContinuityRehydration, deriveContinuityRootId } from './reality-continuous-continuity-v1.0.js';
import { createOperationalSituation, transitionOperationalSituation } from './operational-situation-v1.0.js';
import { inspectModelOutputWithContinuity } from './reality-model-output-integrity-v0.1.js';
import { createIntegritySpine, advanceIntegritySpine, summarizeIntegritySpine, inspectConversationDrift, replayConversationTrajectory, inspectTrajectoryRecovery } from './reality-continuous-integrity-spine-v0.1.js';
import {assessIntelligenceSpineV1} from './reality-intelligence-spine-v1.0.js';

async function loadUniverseContext({ systemContext = null, continuityRootId = null, fetchImpl } = {}) {
  const requestContext = buildNativeUniverseContext({ systemContext });
  // Do not read a global/unscoped Universe view when a principal root is
  // absent. Synthetic no-history probes must never inherit another world.
  // The ledger remains durable; this is a scoped retrieval decision only.
  if (process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED !== 'true' ||
      systemContext?.ephemeral_no_history === true ||
      !continuityRootId) return requestContext;

  const durable = await retrievePersistedUniverse({ continuityRootId, limit: 100, fetchImpl });
  const latestTransition = await retrieveLatestPersistedContinuityTransition({
    continuityRootId, fetchImpl,
  });
  const workHistory=await retrieveScopedWorkItemTransitionHistory({
    continuityRootId,worldlineId:systemContext?.worldline_id || 'reality:primary',
    pageSize:100,maxTransitions:2000,fetchImpl,
  });
  const retained = latestTransition && !durable.entries.some(
    entry=>entry.entry_id===latestTransition.entry_id)
      ? [latestTransition,...durable.entries] : durable.entries;
  return Object.freeze({
    ...requestContext,
    status: durable.status,
    count: requestContext.count + retained.length,
    entries: Object.freeze([...retained, ...requestContext.entries]),
    // Prevent request-supplied context from masquerading as durable source
    // admission records during model-output reconciliation.
    persisted_attested_entries: Object.freeze([...retained]),
    persistence: durable.persistence,
    durable_count: durable.count,
    continuity_transition_ref: latestTransition?.entry_id || null,
    work_item_transition_history: workHistory.entries,
    work_item_transition_scan_status: workHistory.status,
    work_item_transition_snapshot_verified:
      workHistory.transactionally_consistent_snapshot_proven,
    // A bounded reasoning context is not the complete Universe history.
    context_is_full_history: false,
    continuity_root_id: continuityRootId,
  });
}

import { runRealityCognitiveRuntime } from './reality-cognitive-runtime-v1.0.js';
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
  const fragments = (signal?.fragments || []).map((f) => f.cleaned_text || '');
  const actionableText = fragments
    .filter((text) => !isExplicitlyProhibitedFragment(text))
    .join('\n')
    .toLowerCase();

  return /\b(create|execute|send|email|reply|publish|post|delete|buy|purchase|schedule|cancel|transfer|pay|write|update|change|deploy|merge)\b/.test(actionableText)
    ? 'ACTION_CANDIDATE'
    : 'CONVERSATIONAL';
}

export async function runLiveIntelligenceOrchestration({
  message,
  observedAt,
  requestedBy = 'chat_user',
  systemContext = null,
  model,
  apiKey,
  fetchImpl,
} = {}) {
  if (typeof message !== 'string' || !message.trim()) throw new Error('MESSAGE_REQUIRED');

  const governedSignal = buildGovernedChatSignal({ message, observedAt });
  const verifiedCleaner = verifySignalCleanerRecord(governedSignal);
  const explicitContinuityRootId = String(systemContext?.continuity_root_id || '').trim() || null;
  const conversationContinuityRootId = deriveContinuityRootId({
    explicitRootId: null,
    conversationId: systemContext?.conversation_id,
    workstreamId: systemContext?.workstream_id,
  });
  const universeContext = await loadUniverseContext({
    systemContext,
    continuityRootId: explicitContinuityRootId || conversationContinuityRootId,
    fetchImpl,
  });
  const suppliedUniverseCount =
    (Array.isArray(systemContext?.universe_entries) ? systemContext.universe_entries.length : 0) +
    (Array.isArray(systemContext?.connected_world_observations) ? systemContext.connected_world_observations.length : 0);
  if (suppliedUniverseCount > 0 && universeContext.count === 0) {
    const error = new Error('UNIVERSE_CONTEXT_HANDOFF_FAILED');
    error.code = 'UNIVERSE_CONTEXT_HANDOFF_FAILED';
    throw error;
  }
  const passiveEpistemicDiagnostics = inspectPersistedEpistemicDifferences({
    entries:universeContext.entries,
    continuityRootId:explicitContinuityRootId || conversationContinuityRootId,
    worldlineId:systemContext?.worldline_id || 'reality:primary',
  });
  const scopedRootForRehydration=explicitContinuityRootId || conversationContinuityRootId;
  let persistedContinuity = scopedRootForRehydration
    ? buildContinuityRehydration({
        continuityRootId: scopedRootForRehydration,
        entries: [...universeContext.entries,
          ...(universeContext.work_item_transition_history||[])],
        worldlineId:systemContext?.worldline_id || 'reality:primary',
        trigger: 'CURRENT_REQUEST',
      })
    : null;

  let continuityDiscovery = null;
  let discoveredContinuityRootId = null;
  // Root-independent dormant-continuity discovery currently queries a
  // cross-root global index. Keep it off the interactive path until this
  // lookup can prove principal/tenant scope independently.
  if (false && !explicitContinuityRootId && systemContext?.ephemeral_no_history !== true && process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED === 'true') {
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
  if (discoveredContinuityRootId) {
    const discoveredUniverse = await retrievePersistedUniverse({ continuityRootId: discoveredContinuityRootId, limit: 100, fetchImpl });
    persistedContinuity = buildContinuityRehydration({ continuityRootId: discoveredContinuityRootId, entries: discoveredUniverse.entries, trigger: 'ROOT_INDEPENDENT_NEW_EVIDENCE' });
  }
  const durabilityEnabled = process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED === 'true' && systemContext?.ephemeral_no_history !== true;
  const signalHandoff = durabilityEnabled && effectiveContinuityRootId
    ? await recordVerifiedLayerHandoff({
        stage:'SIGNAL_CLEANER',
        continuityRootId:effectiveContinuityRootId,
        observedAt:governedSignal.packet.observed_at,
        sourceRef:'reality:signal-cleaner',
        output:{signal:governedSignal,verification:verifiedCleaner},
        evidenceReferences:[
          governedSignal.packet.raw_content_digest,
          governedSignal.transformation_receipt.receipt_id,
          ...governedSignal.fragments.map(f=>f.fragment_id),
        ],
        fetchImpl,
      })
    : null;
  const historyAuthenticated=['BASE44_AUTHENTICATED_PERSONAL_REALITY','REALITY_STANDALONE_AUTHENTICATED'].includes(systemContext?.context_source) &&
    Boolean(systemContext?.authenticated_user_id) && systemContext?.ephemeral_no_history!==true;
  const priorConversationTurns=historyAuthenticated?systemContext.authenticated_conversation_turns||[]:[];
  const priorDetectionReceipts=(universeContext.persisted_attested_entries||[])
    .filter(e=>e?.continuity_root_id===effectiveContinuityRootId &&
      e?.worldline_id===(systemContext?.worldline_id||'reality:primary'))
    .flatMap(e=>e?.payload?.conversation_drift?.findings||[]);
  const trajectoryReplay=replayConversationTrajectory({
    priorTurns:priorConversationTurns,
    historySource:historyAuthenticated?'AUTHENTICATED_CONVERSATION_MESSAGES':'NOT_ATTESTED',
    continuityRootId:effectiveContinuityRootId,
    currentUserMessage:message,
    currentUserSourceRef:governedSignal.packet.packet_id,
    priorDetectionReceipts,
  });
  const cognitionContext = {
    signal_cleaner_structural_verification:verifiedCleaner,
    epistemic_diagnostics:passiveEpistemicDiagnostics,
    signal_ledger_handoff:signalHandoff ? {
      status:signalHandoff.status,
      entry_id:signalHandoff.entry_id,
      ledger_entry_hash:signalHandoff.ledger_entry_hash,
    } : {status:'NOT_DURABLY_PERSISTED'},
    ...(systemContext || {}),
    conversation_trajectory_reconciliation:{
      status:trajectoryReplay.status,
      prior_drift_candidates:trajectoryReplay.findings.slice(0,8).map(x=>({
        earliest_model_message_ref:x.origin_turn_ref,
        original_user_message_ref:x.original_user_turn_ref,
        original_user_text:x.original_user_text,
        observed_assistant_shift:x.observed_model_text,
        original_required_condition:x.expected_condition,
        independent_verification:'NOT_PERFORMED',
      })),
      interpretation_rule:'Preserve user-stated conditions. Prior assistant summaries do not override original user intent. Clarify unverified changes.',
      evidence_status:'AUTHENTICATED_CONVERSATION_INTENT_NOT_EXTERNAL_TRUTH',
    },
    continuity_root_id: effectiveContinuityRootId,
    continuity_status: persistedContinuity?.status || 'NO_CONTINUITY_ROOT',
    continuity_latest_state: persistedContinuity?.latest_state || null,
    continuity_work_items: persistedContinuity?.work_item_states||[],
    continuity_unresolved_work_items: persistedContinuity?.unresolved_work_items||[],
    continuity_work_items_complete_snapshot_proven:false,
    continuity_rehydrated: persistedContinuity?.continuation_available === true,
    continuity_entry_count: persistedContinuity?.matched_entry_count || 0,
    continuity_transition_ref: universeContext.continuity_transition_ref || null,
    reality_context_source: 'UNIVERSE',
    universe_context_status: universeContext.status,
    universe_context_count: universeContext.count,
  };
  let cognitiveResult;
  try {
    cognitiveResult = await runRealityCognitiveRuntime({
      message,
      governedSignal,
      systemContext: cognitionContext,
      universeEntries: universeContext.entries,
      model,
      apiKey,
      fetchImpl,
    });
  } catch (error) {
    // Keep a durable observed failure rather than lose the broken transition.
    // This is diagnostic capture, not answer filtering or semantic judgment.
    if(signalHandoff) {
      try {
        await recordVerifiedLayerHandoff({
          stage:'COGNITION_ERROR',
          continuityRootId:effectiveContinuityRootId,
          observedAt:new Date().toISOString(),
          sourceRef:'reality:cognitive-runtime',
          output:{error_code:String(error?.code || error?.message || 'COGNITION_ERROR').slice(0,320),
            failed_stage:'COGNITION',source_signal_entry_id:signalHandoff.entry_id},
          evidenceReferences:[signalHandoff.entry_id,signalHandoff.ledger_entry_hash],
          parent:signalHandoff.entry,fetchImpl,
        });
      } catch (persistenceError) {
        error.ledger_capture_error=String(persistenceError?.message || persistenceError);
      }
    }
    throw error;
  }
  // Compare model output against trusted, root-scoped source observations.
  // Model prose never becomes a source fact. A mismatch is not a confirmed hallucination.
  const rawModelAnswer=String(cognitiveResult.answer||'');
  const modelIntegrity=inspectModelOutputWithContinuity({
    answer:rawModelAnswer,
    ledgerEntries:universeContext.persisted_attested_entries||[],
    continuityRootId:effectiveContinuityRootId,
    worldlineId:systemContext?.worldline_id||'reality:primary',
    modelResponseId:cognitiveResult.response_id||'untracked',
    observedAt:observedAt||new Date().toISOString(),
  });
  const {candidate_observations:_syntheticComparator,...modelIntegrityPublic}=modelIntegrity;
  const conversationDrift=inspectConversationDrift({
    priorTurns:priorConversationTurns,
    historySource:historyAuthenticated?'AUTHENTICATED_CONVERSATION_MESSAGES':'NOT_ATTESTED',
    currentUserMessage:message,modelAnswer:rawModelAnswer,
    continuityRootId:effectiveContinuityRootId,
    currentUserSourceRef:governedSignal.packet.packet_id,
    modelResponseId:cognitiveResult.response_id||'untracked',
  });
  const {anchors:_intentCandidates,...conversationDriftPublic}=conversationDrift;
  const trajectoryRecovery=inspectTrajectoryRecovery({replay:trajectoryReplay,modelAnswer:rawModelAnswer});
  const trajectoryPublic={
    ...trajectoryReplay,recovery:trajectoryRecovery,
    detection_turn_semantics:'OBSERVED_BY_THIS_REPLAY_NOT_PROVEN_FIRST_EVER',
  };
  // V1 composes the existing findings into a single proof/coverage receipt.
  // No extra model calls, no changes to publication/authority, and no
  // fabricated semantic or hallucination verdicts.
  const intelligenceSpineV1=effectiveContinuityRootId
    ?assessIntelligenceSpineV1({
        continuityRootId:effectiveContinuityRootId,
        userSourceRef:governedSignal.packet.packet_id,
        modelSourceRef:'model-response:'+(cognitiveResult.response_id||'untracked'),
        currentRequest:message,rawAnswer:rawModelAnswer,
        priorConversationSource:historyAuthenticated
          ?'AUTHENTICATED_CONVERSATION_MESSAGES':'NOT_ATTESTED',
        authenticatedHistoryVerified:historyAuthenticated,
        conversationDrift,modelIntegrity,trajectoryReplay,
        // Only server-derived model propositions are eligible. Raw prompt text
        // never becomes a trusted statement or a source observation.
        typedModelClaims:Array.isArray(cognitiveResult.typed_model_claims)
          ?cognitiveResult.typed_model_claims:[],
        attestedUniverseEntries:universeContext.persisted_attested_entries||[],
        worldlineId:systemContext?.worldline_id||'reality:primary',
        evaluatedAt:observedAt||new Date().toISOString(),
        providerCompletion:{
          status:cognitiveResult.provider_status??null,
          incomplete_reason:cognitiveResult.provider_incomplete_reason??null,
          output_tokens:cognitiveResult.provider_output_tokens??null,
          max_output_tokens:cognitiveResult.provider_max_output_tokens??null,
        },
      }):null;
  const combinedIntegrityFindings=[
    ...modelIntegrity.findings,...conversationDrift.findings,
    ...trajectoryReplay.findings.filter(x=>!x.previously_recorded_detection),
  ];
  let spine=null,spineSummary=null;
  // Only claim lineage anchoring if an earlier handoff was stored and read back.
  if(signalHandoff?.status==='STORED_AND_READ_BACK' && effectiveContinuityRootId){
    spine=createIntegritySpine({
      continuityRootId:effectiveContinuityRootId,
      worldlineId:systemContext?.worldline_id||'reality:primary',
      runId:'model-response:'+(cognitiveResult.response_id||governedSignal.packet.packet_id),
      ledgerAnchorRef:signalHandoff.entry_id,
      openedAt:observedAt||new Date().toISOString(),
    });
    for(const stage of ['SIGNAL_CLEANER','UNIVERSE','CONTINUITY','COGNITION']){
      spine=advanceIntegritySpine({
        trace:spine,stage,
        observedAt:observedAt||new Date().toISOString(),
        sourceReceiptRefs:stage==='SIGNAL_CLEANER'
          ? [signalHandoff.entry_id]
          : stage==='COGNITION'
            ? ['model-response:'+(cognitiveResult.response_id||'untracked')]
            : [signalHandoff.entry_id],
        observedModelFindings:stage==='COGNITION'?combinedIntegrityFindings:[],
        // The selected context is bounded; full obligation coverage unproven.
        presentOpenObligationIds:null,
      });
    }
    spineSummary=summarizeIntegritySpine(spine);
  }
  // Conversation drift is *diagnostic*, not a new action gate. Continue
  // to apply only the pre-existing factual-output proposal policy.
  const conversationReviewNeeded=conversationDrift.findings.length>0||trajectoryReplay.findings.length>0;
  const integrityRequiresReview=modelIntegrity.findings.some(x=>
    ['POTENTIAL_MATERIAL_DRIFT','UNVERIFIED_EXECUTION_CLAIM',
      'CONTESTED_SOURCE_REFERENCE'].includes(x.classification));
  const boundaryRequiresReview=Boolean(intelligenceSpineV1?.findings?.some(x=>
    ['UNTRUSTED_SOURCE_EVENT_PROMOTION','MODEL_RESPONSE_INCOMPLETE'].includes(x.classification)));
  const anyIntegrityFinding=integrityRequiresReview||conversationReviewNeeded||boundaryRequiresReview;
  const note=anyIntegrityFinding
    ? boundaryRequiresReview
      ? '\n\nReality integrity notice: A response-completeness or untrusted-source factual claim requires review. No external action is authorized and unsupported event claims are not verified.'
      : '\n\nReality integrity notice: A material claim, prior conversational condition, or requested revision needs review. The original user requirement remains recorded; no independent truth verdict or external action is authorized.'
    : '';
  const modelResult = {
    ...cognitiveResult,
    raw_model_answer:rawModelAnswer,
    answer:rawModelAnswer+note,
    cognitive_runtime_version:cognitiveResult.runtime_version,
    integrity_review_required:integrityRequiresReview,
    conversation_drift_observed:conversationReviewNeeded,
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
  // A chat turn is an observation, not evidence that WAITING/BLOCKED or
  // completed work changed state. Preserve the latest verified projection.
  // State advancement requires a separate, evidence-linked transition.
  const continuityState = persistedContinuity?.latest_state || 'ACTIVE';
  const continuityEvent = effectiveContinuityRootId
    ? buildContinuityEvent({
        continuityRootId: effectiveContinuityRootId,
        priorState: persistedContinuity?.latest_state || null,
        nextState: continuityState,
        workItemId:persistedContinuity?.latest_work_item_id || null,
        trigger: persistedContinuity?.latest_state ? 'STATE_PRESERVED_DURING_CHAT' : 'NEW_OBSERVATION',
        evidenceReferences: [
          governedSignal.packet.packet_id,
          governedSignal.transformation_receipt.receipt_id,
          ...governedSignal.fragments.map(fragment=>fragment.fragment_id),
          signalHandoff?.entry_id,
          signalHandoff?.ledger_entry_hash,
        ].filter(Boolean),
        payload: {
          continuity_state: continuityState,
          prior_state_preserved: Boolean(persistedContinuity?.latest_state),
          state_transition_authorized: false,
          materiality,
          runtime_version: modelResult?.runtime_version || null,
          universe_context_count: universeContext.count,
          response_summary: String(modelResult?.answer || '').slice(0, 1000),
          // Do not replace a layer's actual output with only a summary.
          cognitive_output: modelResult,
          signal_handoff_entry_id:signalHandoff?.entry_id || null,
          signal_handoff_ledger_hash:signalHandoff?.ledger_entry_hash || null,
          cleaner_verification:verifiedCleaner,
          passive_epistemic_diagnostics:passiveEpistemicDiagnostics,
          model_output_integrity:modelIntegrityPublic,
          conversation_drift:conversationDriftPublic,
          conversation_trajectory:trajectoryPublic,
          intelligence_spine_v1:intelligenceSpineV1,
          integrity_spine:spine?spine:null,
          contradiction_diagnostics:'NARROW_EXPLICIT_MODEL_CLAIMS_COMPARED_NOT_FULL_SEMANTIC_VERIFICATION',
        },
        observedAt: observedAt || new Date().toISOString(),
      })
    : null;

  let continuityReadback = null;
  if (continuityEvent && durabilityEnabled) {
    const stored=await persistContinuityEvent(continuityEvent, { fetchImpl });
    continuityReadback=await retrievePersistedUniverseEntry({
      entryId:continuityEvent.continuity_event_id,fetchImpl
    });
    if(stored.entry?.ledger_entry_hash!==continuityReadback.ledger_entry_hash ||
       continuityReadback.payload?.signal_handoff_ledger_hash!==signalHandoff?.ledger_entry_hash ||
       continuityReadback.payload?.model_output_integrity?.status!==modelIntegrityPublic.status ||
       continuityReadback.payload?.conversation_drift?.status!==conversationDriftPublic.status ||
       continuityReadback.payload?.conversation_trajectory?.status!==trajectoryPublic.status ||
       (intelligenceSpineV1 && continuityReadback.payload?.intelligence_spine_v1?.evidence_receipt_hash!==intelligenceSpineV1.evidence_receipt_hash) ||
       (spine && continuityReadback.payload?.integrity_spine?.trace_hash!==spine.trace_hash))
      throw new Error('CONTINUITY_LEDGER_COGNITION_READBACK_MISMATCH');
  }

  let situation = null;
  if (materiality === 'ACTION_CANDIDATE') {
    const observations = Array.isArray(systemContext?.connected_world_observations)
      ? systemContext.connected_world_observations : [];
    const evidence = [
      governedSignal?.packet?.packet_id ? {
        ref:governedSignal.packet.packet_id,
        kind:'OBSERVED_USER_REQUEST_NOT_INDEPENDENT_WORLD_TRUTH',
        source:'USER_MESSAGE',
        observed_at:governedSignal.packet.observed_at,
      } : null,
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

  const base = {
    orchestration_version: LIVE_INTELLIGENCE_ORCHESTRATION_VERSION,
    governed_signal: clone(governedSignal),
    intelligence: clone(modelResult),
    authority: {
      granted: false,
      execution_authorized: false,
      principle: 'MODEL_OUTPUT_IS_NOT_AUTHORITY',
    },
    execution: {
      status: 'NOT_EXECUTED',
      reason: 'INTELLIGENCE_AND_PLANNING_ONLY',
    },
    context: { universe: { status: universeContext.status, count: universeContext.count },
      epistemic_diagnostics:clone(passiveEpistemicDiagnostics),
      model_output_integrity:clone(modelIntegrityPublic),
      conversation_drift:clone(conversationDriftPublic),
      conversation_trajectory:clone(trajectoryPublic),
      intelligence_spine_v1:intelligenceSpineV1?clone(intelligenceSpineV1):{status:'NO_VERIFIED_CONTEXT'},
      integrity_spine:spineSummary?clone(spineSummary):{status:'NOT_DURABLY_ANCHORED'},
      continuity: {
      root_id: effectiveContinuityRootId,
      discovery: continuityDiscovery,
      status: persistedContinuity?.status || 'NO_CONTINUITY_ROOT',
      rehydrated: persistedContinuity?.continuation_available === true,
      prior_state: persistedContinuity?.latest_state || null,
      current_state: continuityEvent?.next_state || null,
      work_item_states:clone(persistedContinuity?.work_item_states||[]),
      unresolved_work_items:clone(persistedContinuity?.unresolved_work_items||[]),
      work_item_history_scan_status:universeContext.work_item_transition_scan_status||'NOT_SCANNED',
      event_id: continuityEvent?.continuity_event_id || null,
      signal_handoff_status:signalHandoff?.status || 'NOT_DURABLY_PERSISTED',
      signal_handoff_entry_id:signalHandoff?.entry_id || null,
      cognitive_readback_verified:Boolean(continuityReadback),
    } },
    situation: clone(situation),
    learning: {
      training_experience: trainingExperience,
      training_experiment: trainingExperiment,
      principle: 'REALITY_OWNS_INTELLIGENCE_AND_GOVERNANCE',
    },
  };

  if(integrityRequiresReview && materiality==='ACTION_CANDIDATE'){
    return {
      ...base,mode:'INTEGRITY_REVIEW_REQUIRED',governance:'REQUIRES_INDEPENDENT_REVIEW',
      work:null,
      integrity_review:{
        status:'WORK_PROPOSAL_HELD',reason:'UNVERIFIED_MATERIAL_MODEL_ASSERTION',
        finding_ids:combinedIntegrityFindings.map(x=>x.issue_id),
        authorization_granted:false,
      },
    };
  }
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
