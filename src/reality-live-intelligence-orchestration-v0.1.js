import { buildGovernedChatSignal } from './reality-governed-fragmented-signal-cleaner-v0.1.js';
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
  const modelResult = await invokeRealityModel({
    governedSignal,
    systemContext,
    model,
    apiKey,
    fetchImpl,
  });

  const materiality = materialityFromSignal(governedSignal);
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
