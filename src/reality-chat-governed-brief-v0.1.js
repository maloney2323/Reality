import {
  createIntentRecord,
  structureIntent,
  createWorkItem,
  buildPreflightPackage,
  buildAuthorizationRequest,
  createWorkflowRun,
} from './reality-governed-work-runtime-v0.1.js';

export const REALITY_CHAT_BRIEF_VERSION = '0.1.0';

function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function lower(value) { return text(value).toLowerCase(); }

function inferEmailPlan(statement) {
  const value = lower(statement);
  const email = value.includes('email') || value.includes('inbox') || value.includes('message');
  if (!email) return null;

  const send = value.includes('send') || value.includes('reply') || value.includes('respond');
  const draft = value.includes('draft');
  const review = value.includes('review') || value.includes('unread') || value.includes('follow-up') || value.includes('follow up');

  const work = [];
  if (review || email) {
    work.push({ action: 'Retrieve permitted business emails', operation: 'read', connector: 'email',
      expectedEffect: 'Read-only retrieval; no external effect.', verificationMethod: 'Compare retrieved message identifiers to the source mailbox.' });
    work.push({ action: 'Classify follow-up obligations', operation: 'analyze', connector: 'reality',
      expectedEffect: 'Produce classifications only; no external effect.', verificationMethod: 'Retain message evidence and classification rationale.' });
  }
  if (draft || send || review) {
    work.push({ action: 'Create candidate response drafts', operation: 'draft', connector: 'email',
      expectedEffect: 'Create drafts only; no message is sent.', verificationMethod: 'Retain draft identifiers and source-message lineage.' });
  }
  if (send) {
    work.push({ action: 'Send approved responses', operation: 'external_send', connector: 'email',
      expectedEffect: 'Transmit messages to external recipients.', verificationMethod: 'Independent mailbox/provider confirmation of send result.' });
  }

  return work;
}

function defaultPlan(statement) {
  return [
    { action: 'Inspect the permitted information relevant to the request', operation: 'read', connector: 'declared',
      expectedEffect: 'Read-only inspection; no external effect.', verificationMethod: 'Retain source references for inspected information.' },
    { action: 'Analyze the request and identify required work', operation: 'analyze', connector: 'reality',
      expectedEffect: 'Produce a governed plan; no external effect.', verificationMethod: 'Retain the interpreted request and plan revision.' },
  ];
}

export function buildRealityBrief({ statement, requestedBy = 'chat_user' } = {}) {
  const ask = text(statement);
  if (!ask) throw new Error('ASK_REQUIRED');

  const inferred = inferEmailPlan(ask) || defaultPlan(ask);
  const ambiguities = [];
  if (ask.length < 12) ambiguities.push('The request is too short to establish complete scope.');

  const intent = createIntentRecord({
    requestedBy,
    statement: ask,
    desiredOutcome: 'Complete the requested goal without unverified external side effects.',
    ambiguities,
  });

  const provisionalItems = inferred.map((item, index) => createWorkItem({
    workflowId: 'pending',
    workItemId: `chat-wi-${index + 1}`,
    action: item.action,
    connector: item.connector,
    operation: item.operation,
    consequential: item.operation === 'external_send',
    authorityRequired: item.operation === 'external_send' ? ['explicit_send_authorization'] : [],
    expectedEffect: item.expectedEffect,
    successConditions: ['Work item result is represented without claiming completion beyond available evidence.'],
    verificationMethod: item.verificationMethod,
  }));

  const workflow = structureIntent(intent, {
    objective: 'Execute only the work that is understood, authorized, and independently verifiable.',
    requiredInformation: [],
    successConditions: ['Every material external effect has explicit authority and independent verification.'],
    requiredConnectors: [...new Set(provisionalItems.map((item) => item.connector))],
    workItems: provisionalItems.map((item) => ({ ...item, workflow_id: 'PENDING_WORKFLOW' })),
    clarificationQuestions: ambiguities,
  });

  const workItems = provisionalItems.map((item) => Object.freeze({
    ...item,
    workflow_id: workflow.workflow_id,
  }));
  const finalWorkflow = Object.freeze({ ...workflow, work_items: workItems });
  const preflight = buildPreflightPackage({
    intent,
    workflow: finalWorkflow,
    verificationPlan: workItems.map((item) => item.verification_method),
    clarificationQuestions: ambiguities,
  });
  const authorizationRequest = preflight.status === 'READY_FOR_AUTHORIZATION'
    ? buildAuthorizationRequest({
        workflow: finalWorkflow,
        preflight,
        principal: requestedBy,
        scope: workItems.filter((item) => item.consequential).map((item) => ({
          connector: item.connector, operation: item.operation, work_item_id: item.work_item_id,
        })),
      })
    : null;
  const run = createWorkflowRun({ workflow: finalWorkflow, intent });

  const authority = workItems.map((item) => ({
    operation: item.operation,
    action: item.action,
    status: item.consequential ? 'NOT_AUTHORIZED' : 'PERMITTED_FOR_PLANNING',
    reason: item.consequential
      ? 'Explicit authorization is required before external effect.'
      : 'No consequential external effect is authorized by this brief.',
  }));

  const status = ambiguities.length ? 'pending' : 'proposed';

  return Object.freeze({
    brief_version: REALITY_CHAT_BRIEF_VERSION,
    status,
    understood: {
      statement: ask,
      scope: 'Derived from the current request only.',
      ambiguities,
    },
    intended_plan: workItems.map((item) => item.action),
    authority_map: authority,
    expected_effect: workItems.some((item) => item.consequential)
      ? 'No external message will be sent until explicit authorization is granted and the exact work item is bound to it.'
      : 'No consequential external effect is authorized by this brief.',
    proof_plan: workItems.map((item) => ({
      work_item_id: item.work_item_id,
      evidence: item.verification_method,
    })),
    workflow: finalWorkflow,
    preflight,
    authorization_request: authorizationRequest,
    run,
    execution: { status: 'NOT_EXECUTED', reason: 'CHAT_BRIEF_PLANNING_ONLY' },
    verification: { status: 'NOT_STARTED' },
    change_history: [],
  });
}
