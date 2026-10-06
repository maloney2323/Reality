import { createHash } from 'node:crypto';

export const GOVERNED_WORK_RUNTIME_VERSION = '0.1.0';

export const WORKFLOW_STATES = Object.freeze([
  'CAPTURED','STRUCTURED','CLARIFICATION_REQUIRED','PLANNED','PREFLIGHTED',
  'AWAITING_AUTHORIZATION','AUTHORIZED','RUNNING','AWAITING_VERIFICATION',
  'RECONCILING','COMPLETED','BLOCKED','PAUSED','CANCELLED','EXPIRED',
  'PARTIALLY_COMPLETED','CONTRADICTORY','UNRESOLVED'
]);

export const TERMINAL_STATES = Object.freeze([
  'COMPLETED','BLOCKED','CANCELLED','EXPIRED','PARTIALLY_COMPLETED','CONTRADICTORY','UNRESOLVED'
]);

const TRANSITIONS = Object.freeze({
  CAPTURED:['STRUCTURED','CLARIFICATION_REQUIRED','BLOCKED'],
  STRUCTURED:['CLARIFICATION_REQUIRED','PLANNED','BLOCKED'],
  CLARIFICATION_REQUIRED:['STRUCTURED','PLANNED','BLOCKED'],
  PLANNED:['PREFLIGHTED','BLOCKED'],
  PREFLIGHTED:['AWAITING_AUTHORIZATION','BLOCKED'],
  AWAITING_AUTHORIZATION:['AUTHORIZED','BLOCKED','CANCELLED','EXPIRED'],
  AUTHORIZED:['RUNNING','CANCELLED','EXPIRED'],
  RUNNING:['AWAITING_VERIFICATION','BLOCKED','PARTIALLY_COMPLETED','CANCELLED'],
  AWAITING_VERIFICATION:['RECONCILING','UNRESOLVED','CONTRADICTORY'],
  RECONCILING:['COMPLETED','PARTIALLY_COMPLETED','UNRESOLVED','CONTRADICTORY'],
});

const SENSITIVE_OPERATIONS = new Set([
  'external_send','purchase','publication','record_write','schedule_write','data_share'
]);

function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function list(value) { return Array.isArray(value) ? value.map((v) => typeof v === 'string' ? v.trim() : v).filter(Boolean) : []; }
function id(prefix, seed) { return prefix + ':' + createHash('sha256').update(seed).digest('hex').slice(0, 32); }
function freeze(value) { return Object.freeze(value); }

export function createIntentRecord({
  requestedBy, statement, desiredOutcome = null, constraints = [], scope = {},
  priority = null, deadline = null, recurrence = null, trigger = 'user_request',
  ambiguities = [], materialAssumptions = [], continuityRootId = null, worldlineId = null
} = {}) {
  const normalized = text(statement);
  if (!normalized) throw new Error('INTENT_STATEMENT_REQUIRED');
  if (!text(requestedBy)) throw new Error('INTENT_REQUESTED_BY_REQUIRED');
  const intentId = id('intent', JSON.stringify([requestedBy, normalized, trigger, continuityRootId, worldlineId]));
  return freeze({
    runtime_version: GOVERNED_WORK_RUNTIME_VERSION, intent_id: intentId, requested_by: requestedBy,
    statement: normalized, desired_outcome: desiredOutcome, constraints: list(constraints), scope,
    priority, deadline, recurrence, trigger, ambiguities: list(ambiguities),
    material_assumptions: list(materialAssumptions), continuity_root_id: continuityRootId,
    worldline_id: worldlineId, status: 'captured'
  });
}

export function structureIntent(intent, {
  objective = null, requiredInformation = [], successConditions = [], requiredConnectors = [],
  riskLevel = 'low', workItems = [], clarificationQuestions = []
} = {}) {
  if (!intent?.intent_id) throw new Error('INTENT_REQUIRED');
  const questions = list(clarificationQuestions);
  const workflowId = id('workflow', JSON.stringify([intent.intent_id, objective, workItems, questions]));
  return freeze({
    runtime_version: GOVERNED_WORK_RUNTIME_VERSION, workflow_id: workflowId, version: 1,
    intent_id: intent.intent_id, objective: objective || intent.desired_outcome || intent.statement,
    required_information: list(requiredInformation), required_connectors: list(requiredConnectors),
    success_conditions: list(successConditions), risk_level: riskLevel, work_items: workItems,
    clarification_questions: questions, status: questions.length ? 'CLARIFICATION_REQUIRED' : 'STRUCTURED',
    continuity_root_id: intent.continuity_root_id, worldline_id: intent.worldline_id
  });
}

export function createWorkItem({ workflowId, workItemId = null, action, connector = null,
  inputs = [], authorityRequired = [], preconditions = [], expectedEffect = null,
  successConditions = [], verificationMethod = null, reversibility = 'unknown',
  operation = 'read', consequential = false } = {}) {
  if (!workflowId) throw new Error('WORKFLOW_ID_REQUIRED');
  if (!text(action)) throw new Error('WORK_ITEM_ACTION_REQUIRED');
  const wi = workItemId || id('work_item', JSON.stringify([workflowId, action, connector, inputs]));
  const sensitive = consequential || SENSITIVE_OPERATIONS.has(operation);
  return freeze({
    work_item_id: wi, workflow_id: workflowId, action, connector, inputs,
    authority_required: list(authorityRequired), preconditions: list(preconditions),
    expected_effect: expectedEffect, success_conditions: list(successConditions),
    verification_method: verificationMethod, reversibility, operation,
    consequential: sensitive, status: 'READY'
  });
}

export function buildPreflightPackage({ intent, workflow, assumptions = [], expectedEffects = [],
  risks = [], verificationPlan = [], clarificationQuestions = [] } = {}) {
  if (!intent?.intent_id || !workflow?.workflow_id) throw new Error('INTENT_AND_WORKFLOW_REQUIRED');
  const items = workflow.work_items || [];
  const requiredAuthority = items.filter((w) => w.consequential || SENSITIVE_OPERATIONS.has(w.operation))
    .map((w) => ({ work_item_id: w.work_item_id, connector: w.connector, operation: w.operation, scope: w.authority_required }));
  const unresolved = [...list(clarificationQuestions), ...(workflow.clarification_questions || [])];
  return freeze({
    preflight_version: GOVERNED_WORK_RUNTIME_VERSION, intent_id: intent.intent_id,
    workflow_id: workflow.workflow_id, assumptions: list(assumptions).concat(intent.material_assumptions || []),
    expected_effects: list(expectedEffects), risks: list(risks), required_authority: requiredAuthority,
    verification_plan: list(verificationPlan), clarification_questions: [...new Set(unresolved)],
    external_effects_possible: requiredAuthority.length > 0,
    execution_permitted: false,
    status: unresolved.length ? 'CLARIFICATION_REQUIRED' : 'READY_FOR_AUTHORIZATION'
  });
}

export function buildAuthorizationRequest({ workflow, preflight, principal, scope = [], expiresAt = null } = {}) {
  if (!workflow?.workflow_id || !preflight?.workflow_id) throw new Error('WORKFLOW_PREFLIGHT_REQUIRED');
  if (preflight.status === 'CLARIFICATION_REQUIRED') throw new Error('CLARIFICATION_REQUIRED');
  return freeze({
    authorization_id: id('auth', JSON.stringify([workflow.workflow_id, principal, scope, expiresAt])),
    workflow_id: workflow.workflow_id, principal, allowed_operations: scope,
    expires_at: expiresAt, status: 'REQUESTED', authorized: false
  });
}

export function authorize({ request, approvedBy, scope }) {
  if (!request?.authorization_id) throw new Error('AUTHORIZATION_REQUEST_REQUIRED');
  if (!text(approvedBy)) throw new Error('APPROVER_REQUIRED');
  if (JSON.stringify(scope || []) !== JSON.stringify(request.allowed_operations || []))
    throw new Error('AUTHORIZATION_SCOPE_MISMATCH');
  return freeze({ ...request, approved_by: approvedBy, approved_at: new Date().toISOString(),
    status: 'ACTIVE', authorized: true });
}

export function canExecute({ workItem, authorization }) {
  if (!workItem?.work_item_id) return { allowed:false, reason:'WORK_ITEM_REQUIRED' };
  if (!workItem.consequential && !SENSITIVE_OPERATIONS.has(workItem.operation))
    return { allowed:true, reason:'NON_CONSEQUENTIAL_WORK_ITEM' };
  if (!authorization?.authorized) return { allowed:false, reason:'EXPLICIT_AUTHORIZATION_REQUIRED' };
  if (authorization.workflow_id !== workItem.workflow_id) return { allowed:false, reason:'AUTHORIZATION_WORKFLOW_MISMATCH' };
  const allowed = (authorization.allowed_operations || []).some((x) =>
    x.connector === workItem.connector && x.operation === workItem.operation &&
    (!x.work_item_id || x.work_item_id === workItem.work_item_id));
  if (!allowed) return { allowed:false, reason:'AUTHORIZATION_SCOPE_MISMATCH' };
  if (authorization.expires_at && new Date(authorization.expires_at).getTime() <= Date.now())
    return { allowed:false, reason:'AUTHORIZATION_EXPIRED' };
  return { allowed:true, reason:'AUTHORIZED' };
}

export function createExecutionReceipt({ workItem, authorization = null, requestSummary = null, requestFingerprint = null } = {}) {
  const gate = canExecute({ workItem, authorization });
  if (!gate.allowed) return freeze({
    execution_id: id('execution', JSON.stringify([workItem?.work_item_id, requestFingerprint, gate.reason])),
    work_item_id: workItem?.work_item_id || null, workflow_id: workItem?.workflow_id || null,
    authorization_id: authorization?.authorization_id || null, execution_state: 'BLOCKED',
    blocked_reason: gate.reason
  });
  return freeze({
    execution_id: id('execution', JSON.stringify([workItem.work_item_id, requestFingerprint, authorization.authorization_id])),
    workflow_id: workItem.workflow_id, work_item_id: workItem.work_item_id,
    authorization_id: authorization.authorization_id, connector: workItem.connector,
    operation: workItem.operation, started_at: new Date().toISOString(),
    request_summary: requestSummary, request_fingerprint: requestFingerprint,
    execution_state: 'AUTHORIZED', response_observation: null, error: null
  });
}

export function transitionWorkflow(run, nextState, { reason = null, evidence = [] } = {}) {
  if (!run?.state || !WORKFLOW_STATES.includes(nextState)) throw new Error('INVALID_WORKFLOW_STATE');
  if (run.state !== nextState && !(TRANSITIONS[run.state] || []).includes(nextState))
    throw new Error(`INVALID_WORKFLOW_TRANSITION:${run.state}->${nextState}`);
  const event = freeze({
    event_id: id('workflow_event', JSON.stringify([run.run_id, run.events?.length || 0, run.state, nextState])),
    run_id: run.run_id, previous_state: run.state, new_state: nextState,
    reason, evidence: list(evidence), occurred_at: new Date().toISOString()
  });
  return freeze({ ...run, state: nextState, events: [...(run.events || []), event] });
}

export function createWorkflowRun({ workflow, intent } = {}) {
  if (!workflow?.workflow_id || !intent?.intent_id) throw new Error('WORKFLOW_AND_INTENT_REQUIRED');
  return freeze({
    run_id: id('run', JSON.stringify([workflow.workflow_id, intent.intent_id, Date.now()])),
    workflow_id: workflow.workflow_id, workflow_version: workflow.version, intent_id: intent.intent_id,
    continuity_root_id: intent.continuity_root_id, worldline_id: intent.worldline_id,
    state: 'CAPTURED', events: []
  });
}

export function assertNoImplicitExecution({ preflight, authorization, executionReceipt } = {}) {
  if (!preflight?.execution_permitted && executionReceipt?.execution_state !== 'BLOCKED' && !authorization?.authorized)
    throw new Error('IMPLICIT_EXECUTION_VIOLATION');
  return true;
}
