import { buildGovernedChatSignal } from './reality-governed-fragmented-signal-cleaner-v0.1.js';
import { buildNativeUniverseContext } from './reality-native-universe-v1.0.js';
import { retrievePersistedUniverse, retrieveDormantContinuitySummaries, persistContinuityEvent } from './reality-native-universe-persistence-v1.0.js';
import { discoverDormantContinuity } from './reality-continuity-discovery-v1.0.js';
import { buildContinuityEvent, buildContinuityRehydration, deriveContinuityRootId } from './reality-continuous-continuity-v1.0.js';

async function loadUniverseContext({ systemContext = null, fetchImpl } = {}) {
  const requestContext = buildNativeUniverseContext({ systemContext });
  if (process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED !== 'true') return requestContext;

  const continuityRootId = systemContext?.continuity_root_id || null;
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
  const universeContext = await loadUniverseContext({ systemContext, fetchImpl });
  const suppliedUniverseCount =
    (Array.isArray(systemContext?.universe_entries) ? systemContext.universe_entries.length : 0) +
    (Array.isArray(systemContext?.connected_world_observations) ? systemContext.connected_world_observations.length : 0);
  if (suppliedUniverseCount > 0 && universeContext.count === 0) {
    const error = new Error('UNIVERSE_CONTEXT_HANDOFF_FAILED');
    error.code = 'UNIVERSE_CONTEXT_HANDOFF_FAILED';
    throw error;
  }
  const continuityRootId = deriveContinuityRootId({
    explicitRootId: systemContext?.continuity_root_id,
    conversationId: systemContext?.conversation_id,
    workstreamId: systemContext?.workstream_id,
  });
  const persistedContinuity = continuityRootId
    ? buildContinuityRehydration({
        continuityRootId,
        entries: universeContext.entries,
        trigger: 'CURRENT_REQUEST',
      })
    : null;
  const cognitionContext = {
    ...(systemContext || {}),
    continuity_root_id: continuityRootId,
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
  const continuityEvent = continuityRootId
    ? buildContinuityEvent({
        continuityRootId,
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

  if (continuityEvent && process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED === 'true') {
    await persistContinuityEvent(continuityEvent, { fetchImpl });
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
    context: { universe: { status: universeContext.status, count: universeContext.count }, continuity: {
      root_id: continuityRootId,
      status: persistedContinuity?.status || 'NO_CONTINUITY_ROOT',
      rehydrated: persistedContinuity?.continuation_available === true,
      prior_state: persistedContinuity?.latest_state || null,
      current_state: continuityEvent?.next_state || null,
      event_id: continuityEvent?.continuity_event_id || null,
    } },
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
