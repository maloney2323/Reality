import { createHash } from 'node:crypto';

export const GOVERNED_WORK_RUNTIME_VERSION = '0.2.0';

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

export function verifyHandoffIntegrity({ requiredReferences, carriedReferences, declaredDigest, consumerDigest }) {
  const missing = requiredReferences.filter(ref => !carriedReferences.includes(ref));
  if (missing.length > 0) throw new Error(`HANDOFF_MISSING_REQUIRED_REFS:${missing.join(',')}`);
  if (declaredDigest !== consumerDigest) throw new Error('HANDOFF_DIGEST_MISMATCH');
  return true;
}

export function createIntentRecord({ ...args } = {}) {
  const normalized = text(args.statement);
  if (!normalized) throw new Error('INTENT_STATEMENT_REQUIRED');
  if (!text(args.requestedBy)) throw new Error('INTENT_REQUESTED_BY_REQUIRED');
  const intentId = id('intent', JSON.stringify([args.requestedBy, normalized, args.trigger, args.continuityRootId, args.worldlineId]));
  return freeze({ runtime_version: GOVERNED_WORK_RUNTIME_VERSION, intent_id: intentId, status: 'captured', ...args, statement: normalized });
}

export function structureIntent(intent, { ...args } = {}) {
  if (!intent?.intent_id) throw new Error('INTENT_REQUIRED');
  const questions = list(args.clarificationQuestions);
  const workflowId = id('workflow', JSON.stringify([intent.intent_id, args.objective, args.workItems, questions]));
  return freeze({
    runtime_version: GOVERNED_WORK_RUNTIME_VERSION, workflow_id: workflowId, version: 2,
    intent_id: intent.intent_id, objective: args.objective || intent.desired_outcome || intent.statement,
    status: questions.length ? 'CLARIFICATION_REQUIRED' : 'STRUCTURED', ...args, clarification_questions: questions
  });
}

export function createWorkItem({ workflowId, workItemId = null, action, connector = null, ...args } = {}) {
  if (!workflowId) throw new Error('WORKFLOW_ID_REQUIRED');
  const wi = workItemId || id('work_item', JSON.stringify([workflowId, action, connector, args.inputs]));
  return freeze({ work_item_id: wi, workflow_id: workflowId, action, connector, status: 'READY', ...args });
}

export function buildPreflightPackage({ intent, workflow, ...args } = {}) {
  if (!intent?.intent_id || !workflow?.workflow_id) throw new Error('INTENT_AND_WORKFLOW_REQUIRED');
  const items = workflow.work_items || [];
  const requiredAuthority = items.filter((w) => w.consequential || SENSITIVE_OPERATIONS.has(w.operation))
    .map((w) => ({ work_item_id: w.work_item_id, connector: w.connector, operation: w.operation, scope: w.authority_required }));
  return freeze({ preflight_version: GOVERNED_WORK_RUNTIME_VERSION, ...args, intent_id: intent.intent_id, workflow_id: workflow.workflow_id, required_authority: requiredAuthority, execution_permitted: false });
}

export function buildAuthorizationRequest({ workflow, preflight, principal, scope = [], expiresAt = null } = {}) {
  if (!workflow?.workflow_id || !preflight?.workflow_id) throw new Error('WORKFLOW_PREFLIGHT_REQUIRED');
  return freeze({ authorization_id: id('auth', JSON.stringify([workflow.workflow_id, principal, scope, expiresAt])), workflow_id: workflow.workflow_id, principal, allowed_operations: scope, expires_at: expiresAt, status: 'REQUESTED', authorized: false });
}

export function authorize({ request, approvedBy, scope }) {
  if (!request?.authorization_id) throw new Error('AUTHORIZATION_REQUEST_REQUIRED');
  if (JSON.stringify(scope || []) !== JSON.stringify(request.allowed_operations || [])) throw new Error('AUTHORIZATION_SCOPE_MISMATCH');
  return freeze({ ...request, approved_by: approvedBy, approved_at: new Date().toISOString(), status: 'ACTIVE', authorized: true });
}

export function canExecute({ workItem, authorization }) {
  if (!workItem?.work_item_id) return { allowed:false, reason:'WORK_ITEM_REQUIRED' };
  if (!workItem.consequential && !SENSITIVE_OPERATIONS.has(workItem.operation)) return { allowed:true, reason:'NON_CONSEQUENTIAL_WORK_ITEM' };
  if (!authorization?.authorized) return { allowed:false, reason:'EXPLICIT_AUTHORIZATION_REQUIRED' };
  return { allowed:true, reason:'AUTHORIZED' };
}

export function createExecutionReceipt({ workItem, authorization = null, ...args } = {}) {
  const gate = canExecute({ workItem, authorization });
  if (!gate.allowed) return freeze({ execution_id: id('execution', JSON.stringify([workItem?.work_item_id, args.requestFingerprint, gate.reason])), execution_state: 'BLOCKED', blocked_reason: gate.reason });
  return freeze({ execution_id: id('execution', JSON.stringify([workItem.work_item_id, args.requestFingerprint, authorization.authorization_id])), execution_state: 'AUTHORIZED', ...args });
}

export function transitionWorkflow(run, nextState, { reason = null, evidence = [] } = {}) {
  if (!WORKFLOW_STATES.includes(nextState)) throw new Error('INVALID_WORKFLOW_STATE');
  const event = freeze({ event_id: id('workflow_event', JSON.stringify([run.run_id, run.events?.length || 0, run.state, nextState])), previous_state: run.state, new_state: nextState, reason, evidence, occurred_at: new Date().toISOString() });
  return freeze({ ...run, state: nextState, events: [...(run.events || []), event] });
}

export function createWorkflowRun({ workflow, intent } = {}) {
  if (!workflow?.workflow_id || !intent?.intent_id) throw new Error('WORKFLOW_AND_INTENT_REQUIRED');
  return freeze({ run_id: id('run', JSON.stringify([workflow.workflow_id, intent.intent_id, Date.now()])), workflow_id: workflow.workflow_id, intent_id: intent.intent_id, state: 'CAPTURED', events: [] });
}

export function assertNoImplicitExecution({ preflight, authorization, executionReceipt } = {}) {
  if (!preflight?.execution_permitted && executionReceipt?.execution_state !== 'BLOCKED' && !authorization?.authorized) throw new Error('IMPLICIT_EXECUTION_VIOLATION');
  return true;
}