import {
  createIntentRecord, structureIntent, createWorkItem, buildPreflightPackage,
  buildAuthorizationRequest, authorize, canExecute, createExecutionReceipt,
  createWorkflowRun, transitionWorkflow, assertNoImplicitExecution,
} from '../src/reality-governed-work-runtime-v0.1.js';

const intent = createIntentRecord({
  requestedBy:'ryan', statement:'Create a calendar event tomorrow at 10 AM titled Product Planning',
  desiredOutcome:'One calendar event exists with the requested title and time.',
  constraints:['Do not contact attendees.'], materialAssumptions:['Timezone must be confirmed before execution.']
});

const workflow = structureIntent(intent, {
  requiredConnectors:['calendar'], successConditions:['Calendar contains exactly one matching event.'],
  workItems:[]
});

const workItem = createWorkItem({
  workflowId:workflow.workflow_id, action:'Create one calendar event',
  connector:'calendar', operation:'create_event', consequential:true,
  authorityRequired:['calendar.write'], expectedEffect:'A new calendar event is created.',
  verificationMethod:'Re-read the event and compare title, time, timezone, calendar, and attendees.',
  reversibility:'reversible'
});

const workflowWithItem = Object.freeze({...workflow, work_items:[workItem]});
const preflight = buildPreflightPackage({
  intent, workflow:workflowWithItem,
  verificationPlan:['Independent calendar readback.']
});

const authRequest = buildAuthorizationRequest({
  workflow:workflowWithItem, preflight, principal:'ryan',
  scope:[{connector:'calendar',operation:'create_event',work_item_id:workItem.work_item_id}]
});

const blocked = createExecutionReceipt({
  workItem, authorization:null, requestSummary:'create Product Planning event',
  requestFingerprint:'sha256:test-request'
});

const activeAuth = authorize({
  request:authRequest, approvedBy:'ryan',
  scope:authRequest.allowed_operations
});

const allowed = canExecute({workItem, authorization:activeAuth});
const receipt = createExecutionReceipt({
  workItem, authorization:activeAuth, requestSummary:'create Product Planning event',
  requestFingerprint:'sha256:test-request'
});

if (intent.status !== 'captured') throw new Error('INTENT_CAPTURE_FAILED');
if (workflowWithItem.status !== 'STRUCTURED') throw new Error('WORKFLOW_STRUCTURE_FAILED');
if (preflight.execution_permitted !== false) throw new Error('PREFLIGHT_GRANTED_EXECUTION');
if (blocked.execution_state !== 'BLOCKED') throw new Error('UNAUTHORIZED_EXECUTION_NOT_BLOCKED');
if (blocked.blocked_reason !== 'EXPLICIT_AUTHORIZATION_REQUIRED') throw new Error('WRONG_BLOCK_REASON');
if (!allowed.allowed) throw new Error('AUTHORIZED_WORK_NOT_ALLOWED');
if (receipt.execution_state !== 'AUTHORIZED') throw new Error('AUTHORIZED_RECEIPT_FAILED');
if (receipt.authorization_id !== activeAuth.authorization_id) throw new Error('RECEIPT_AUTH_LINK_FAILED');

let run = createWorkflowRun({workflow:workflowWithItem,intent});
run = transitionWorkflow(run,'STRUCTURED');
run = transitionWorkflow(run,'PLANNED');
run = transitionWorkflow(run,'PREFLIGHTED');
run = transitionWorkflow(run,'AWAITING_AUTHORIZATION');
run = transitionWorkflow(run,'AUTHORIZED');
if (run.state !== 'AUTHORIZED' || run.events.length !== 5) throw new Error('STATE_MACHINE_FAILED');

let rejected = false;
try { transitionWorkflow(run,'COMPLETED'); } catch { rejected = true; }
if (!rejected) throw new Error('ILLEGAL_STATE_JUMP_ACCEPTED');

if (!assertNoImplicitExecution({preflight, authorization:null, executionReceipt:blocked}))
  throw new Error('IMPLICIT_EXECUTION_ASSERTION_FAILED');

console.log('Governed Work Runtime v0.1: PASS');
