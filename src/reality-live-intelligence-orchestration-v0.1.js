import { buildGovernedChatSignal } from './reality-governed-fragmented-signal-cleaner-v0.1.js';
import { buildNativeUniverseContext } from './reality-native-universe-v1.0.js';
import { retrievePersistedUniverse, retrieveDormantContinuitySummaries, persistContinuityEvent } from './reality-native-universe-persistence-v1.0.js';
import { discoverDormantContinuity } from './reality-continuity-discovery-v1.0.js';
import { buildContinuityEvent, buildContinuityRehydration, deriveContinuityRootId } from './reality-continuous-continuity-v1.0.js';
import { startContinuityRuntime } from './reality-continuity-spine-runtime-v0.1.js';
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
  const cognitionContext = {
    ...(systemContext || {}),
    continuity_root_id: effectiveContinuityRootId,
    continuity_status: persistedContinuity?.status || 'NO_CONTINUITY_ROOT',
    continuity_latest_state: persistedContinuity?.latest_state || null,
    continuity_rehydrated: persistedContinuity?.continuation_available === true,
    continuity_entry_count: persistedContinuity?.matched_entry_count || 0,
    reality_context_source: 'UNIVERSE',
    universe_context_status: universeContext.status,
    universe_context_count: universeContext.count,
  };
  const cognitiveResult = await runRealityCognitiveRuntime({
    message,
    governedSignal,
    systemContext: cognitionContext,
    universeEntries: universeContext.entries,
    model,
    apiKey,
    fetchImpl,
  });
  const modelResult = {
    ...cognitiveResult,
    answer: cognitiveResult.answer,
    cognitive_runtime_version: cognitiveResult.runtime_version,
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
      governedSignal?.signal_hash ? { ref: governedSignal.signal_hash, kind: 'governed_signal' } : null,
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
      stage: 'SITUATION',
      entityId: situation?.situation_id || situation?.id || `situation:${item.work_item_id}`,
      evidenceRefs: [
        governedSignal?.signal_hash,
        ...(situation?.evidence || []).map((entry) => entry?.ref),
      ].filter(Boolean),
      transformationReceiptId: governedSignal?.transformation_receipt?.receipt_id || null,
      epistemicStatus: situation?.missing_evidence?.length ? 'PARTIALLY_VERIFIED' : 'OBSERVED',
      payload: {
        situation_id: situation?.situation_id || situation?.id || null,
        state: situation?.state || null,
        uncertainty: clone(situation?.uncertainty || null),
        authority_status: situation?.authority?.status || 'REQUIRES_EXPLICIT_AUTHORIZATION',
        missing_evidence: clone(situation?.missing_evidence || []),
        blocking_questions: clone(situation?.uncertainty?.blocking_questions || []),
      },
      provenance: { source: 'operational_situation_v1' },
    });
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
        authorization_status: 'REQUESTED',
        authorization_ref: authorizationRequest.authorization_request_id || null,
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
