import {
  SANDBOX_WORK_WORLD,
  SANDBOX_CONNECTOR,
  CREATE_FOLLOW_UP_TASK,
  createSandboxFollowUpProposal,
  authorizeSandboxFollowUp,
  buildSandboxScope,
  executeSandboxFollowUp,
  createSandboxStore,
} from '../src/reality-sandbox-governed-work-world-v0.1.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const proposal = createSandboxFollowUpProposal({
  principal: 'ryan',
  title: 'Review launch blocker',
  description: 'Internal sandbox follow-up task',
});

assert(proposal.world_id === SANDBOX_WORK_WORLD, 'WRONG_WORK_WORLD');
assert(proposal.connector === SANDBOX_CONNECTOR, 'WRONG_CONNECTOR');
assert(proposal.operation === CREATE_FOLLOW_UP_TASK, 'WRONG_OPERATION');
assert(proposal.status === 'AWAITING_AUTHORIZATION', 'WRONG_INITIAL_STATUS');

const store = createSandboxStore();
const proposalEvent = store.recordProposal(proposal);

const blocked = executeSandboxFollowUp({ proposal, authorization: null, store });
assert(blocked.status === 'BLOCKED', 'UNAUTHORIZED_EXECUTION_NOT_BLOCKED');
assert(blocked.reason === 'EXPLICIT_AUTHORIZATION_REQUIRED', 'WRONG_BLOCK_REASON');
assert(!blocked.execution_request_event, 'BLOCKED_EXECUTION_EMITTED_REQUEST');
assert(store.events().length === 1, 'BLOCKED_EXECUTION_CHANGED_LEDGER');

const authorization = authorizeSandboxFollowUp({
  proposal,
  approvedBy: 'ryan',
  scope: buildSandboxScope(proposal),
});
const authorizationEvent = store.recordAuthorization(proposal, authorization);

const authorizedButNotExecuted = store.reconstruct()[proposal.task.task_id];
assert(authorizedButNotExecuted.state === 'PROPOSED', 'AUTHORIZATION_INFERRED_COMPLETION');
assert(authorizationEvent.payload.authorization_id === authorization.authorization_id, 'AUTHORIZATION_NOT_RECORDED');

const result = executeSandboxFollowUp({ proposal, authorization, store });
assert(result.status === 'SUCCEEDED', 'SANDBOX_EXECUTION_FAILED');
assert(result.execution_request_event.payload.side_effects === 'SANDBOX_ONLY', 'EXTERNAL_SIDE_EFFECT_BOUNDARY_FAILED');
assert(result.outcome_event.payload.status === 'SUCCEEDED', 'OUTCOME_NOT_OBSERVED');
assert(result.reconciliation_event.payload.state_after === 'COMPLETED', 'RECONCILIATION_FAILED');

const events = store.events();
assert(events.length === 5, 'UNEXPECTED_EVENT_COUNT');
assert(events.map((event) => event.event_kind).join(',') ===
  'WORK_PROPOSAL,AUTHORIZATION,EXECUTION_REQUEST,EXECUTION_OUTCOME,RECONCILIATION',
  'WRONG_EVENT_SEQUENCE');

for (let i = 1; i < events.length; i += 1) {
  assert(events[i].parent_event_id === events[i - 1].event_id, 'EVENT_PARENT_CHAIN_BROKEN');
  assert(events[i].prior_event_hash === events[i - 1].event_hash, 'EVENT_HASH_CHAIN_BROKEN');
}

const reconstructed = store.reconstruct();
assert(reconstructed[proposal.task.task_id].state === 'COMPLETED', 'REPLAY_DID_NOT_RECONSTRUCT_COMPLETION');

const failedStore = createSandboxStore();
failedStore.recordProposal(proposal);
const fakeOutcome = failedStore.recordOutcome(proposal, failedStore.events()[0], {
  operation_id: proposal.operation_id,
  task_id: proposal.task.task_id,
  status: 'FAILED',
  executor: 'IN_PROCESS_SANDBOX',
  side_effects: [],
  result: { reason: 'CONTROLLED_TEST_FAILURE' },
});
const failedRecon = failedStore.reconcile(proposal, fakeOutcome);
assert(failedRecon.payload.state_after === 'FAILED', 'FAILED_OUTCOME_NOT_RECONCILED');
assert(failedStore.reconstruct()[proposal.task.task_id].state === 'FAILED', 'FAILED_STATE_NOT_REPLAYABLE');

const pendingStore = createSandboxStore();
pendingStore.recordProposal(proposal);
assert(pendingStore.reconstruct()[proposal.task.task_id].state === 'PROPOSED', 'PENDING_OPERATION_NOT_PRESERVED');

console.log('Sandbox Governed Work-world v0.1: PASS');
