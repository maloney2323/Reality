import crypto from 'node:crypto';

export const SANDBOX_WORK_WORLD_VERSION = '0.1.0';
export const SANDBOX_WORK_WORLD = 'work:sandbox';
export const SANDBOX_CONNECTOR = 'sandbox_work';
export const CREATE_FOLLOW_UP_TASK = 'create_follow_up_task';

const ALLOWED_OPERATION = Object.freeze({
  connector: SANDBOX_CONNECTOR,
  operation: CREATE_FOLLOW_UP_TASK,
});

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function stable(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stable);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function hash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

function id(prefix, seed) {
  return `${prefix}:${hash(seed).slice(0, 32)}`;
}

function now() {
  return new Date().toISOString();
}

function freeze(value) {
  return Object.freeze(value);
}

function assertPrincipal(principal) {
  if (!text(principal)) throw new Error('WORK_PRINCIPAL_REQUIRED');
}

function assertTask(task) {
  if (!task || typeof task !== 'object') throw new Error('FOLLOW_UP_TASK_REQUIRED');
  if (!text(task.title)) throw new Error('FOLLOW_UP_TASK_TITLE_REQUIRED');
  if (!text(task.world_id)) throw new Error('WORK_WORLD_REQUIRED');
  if (task.world_id !== SANDBOX_WORK_WORLD) throw new Error('SANDBOX_WORLD_REQUIRED');
}

function exactScope(workItemId) {
  return [{
    connector: SANDBOX_CONNECTOR,
    operation: CREATE_FOLLOW_UP_TASK,
    work_item_id: workItemId,
  }];
}

function scopeMatches(scope, workItemId) {
  return Array.isArray(scope) &&
    scope.length === 1 &&
    scope[0]?.connector === SANDBOX_CONNECTOR &&
    scope[0]?.operation === CREATE_FOLLOW_UP_TASK &&
    scope[0]?.work_item_id === workItemId;
}

export function createSandboxFollowUpProposal({
  principal,
  title,
  description = '',
  worldId = SANDBOX_WORK_WORLD,
  operationId = crypto.randomUUID(),
} = {}) {
  assertPrincipal(principal);
  const task = {
    task_id: `task:${operationId}`,
    title: text(title),
    description: text(description),
    world_id: worldId,
    state: 'PROPOSED',
  };
  assertTask(task);

  const workItemId = id('sandbox-work-item', JSON.stringify([principal, operationId, task]));
  return freeze({
    version: SANDBOX_WORK_WORLD_VERSION,
    operation_id: operationId,
    principal,
    world_id: worldId,
    work_item_id: workItemId,
    operation: CREATE_FOLLOW_UP_TASK,
    connector: SANDBOX_CONNECTOR,
    task,
    authority_required: exactScope(workItemId),
    status: 'AWAITING_AUTHORIZATION',
  });
}

export function createSandboxAuthorization({ proposal, approvedBy, scope } = {}) {
  if (!proposal?.work_item_id) throw new Error('SANDBOX_PROPOSAL_REQUIRED');
  assertPrincipal(approvedBy);
  if (approvedBy !== proposal.principal) throw new Error('AUTHORIZER_PRINCIPAL_MISMATCH');
  if (!scopeMatches(scope, proposal.work_item_id)) throw new Error('SANDBOX_AUTHORIZATION_SCOPE_MISMATCH');

  return freeze({
    authorization_id: id('sandbox-auth', JSON.stringify([proposal.operation_id, approvedBy, scope])),
    operation_id: proposal.operation_id,
    work_item_id: proposal.work_item_id,
    principal: proposal.principal,
    approved_by: approvedBy,
    allowed_operations: scope,
    authorized: true,
    status: 'ACTIVE',
    authorized_at: now(),
  });
}

export function authorizeSandboxFollowUp({ proposal, approvedBy, scope } = {}) {
  return createSandboxAuthorization({ proposal, approvedBy, scope });
}

export function canExecuteSandboxFollowUp({ proposal, authorization } = {}) {
  if (!proposal?.work_item_id) return { allowed: false, reason: 'SANDBOX_PROPOSAL_REQUIRED' };
  if (proposal.connector !== SANDBOX_CONNECTOR || proposal.operation !== CREATE_FOLLOW_UP_TASK) {
    return { allowed: false, reason: 'SANDBOX_OPERATION_NOT_ALLOWED' };
  }
  if (!authorization?.authorized) return { allowed: false, reason: 'EXPLICIT_AUTHORIZATION_REQUIRED' };
  if (authorization.principal !== proposal.principal || authorization.work_item_id !== proposal.work_item_id) {
    return { allowed: false, reason: 'AUTHORIZATION_BINDING_MISMATCH' };
  }
  if (!scopeMatches(authorization.allowed_operations, proposal.work_item_id)) {
    return { allowed: false, reason: 'AUTHORIZATION_SCOPE_MISMATCH' };
  }
  return { allowed: true, reason: 'AUTHORIZED' };
}

export function createSandboxStore() {
  const events = [];
  const state = new Map();

  function append(kind, payload, {
    operationId,
    principal,
    parentEventId = null,
    effectiveTime = now(),
  } = {}) {
    const assertionTime = now();
    const eventId = id('sandbox-event', JSON.stringify([
      events.length, kind, payload, operationId, parentEventId, assertionTime,
    ]));
    const prior = events.at(-1) || null;
    const record = freeze({
      event_id: eventId,
      event_kind: kind,
      world_id: SANDBOX_WORK_WORLD,
      operation_id: operationId || null,
      principal: principal || null,
      effective_time: effectiveTime,
      assertion_time: assertionTime,
      parent_event_id: parentEventId,
      prior_event_hash: prior?.event_hash || null,
      payload,
      event_hash: hash({
        event_id: eventId,
        event_kind: kind,
        world_id: SANDBOX_WORK_WORLD,
        operation_id: operationId || null,
        principal: principal || null,
        effective_time: effectiveTime,
        assertion_time: assertionTime,
        parent_event_id: parentEventId,
        prior_event_hash: prior?.event_hash || null,
        payload,
      }),
    });
    events.push(record);
    return record;
  }

  function recordProposal(proposal) {
    return append('WORK_PROPOSAL', proposal, {
      operationId: proposal.operation_id,
      principal: proposal.principal,
    });
  }

  function recordAuthorization(proposal, authorization) {
    return append('AUTHORIZATION', authorization, {
      operationId: proposal.operation_id,
      principal: proposal.principal,
      parentEventId: events.at(-1)?.event_id || null,
    });
  }

  function recordExecutionRequest(proposal, authorization) {
    return append('EXECUTION_REQUEST', {
      operation_id: proposal.operation_id,
      work_item_id: proposal.work_item_id,
      authorization_id: authorization.authorization_id,
      connector: SANDBOX_CONNECTOR,
      operation: CREATE_FOLLOW_UP_TASK,
      side_effects: 'SANDBOX_ONLY',
    }, {
      operationId: proposal.operation_id,
      principal: proposal.principal,
      parentEventId: events.at(-1)?.event_id || null,
    });
  }

  function recordOutcome(proposal, requestEvent, outcome) {
    return append('EXECUTION_OUTCOME', outcome, {
      operationId: proposal.operation_id,
      principal: proposal.principal,
      parentEventId: requestEvent.event_id,
    });
  }

  function reconcile(proposal, outcomeEvent) {
    const outcome = outcomeEvent?.payload;
    if (!outcome || outcome.operation_id !== proposal.operation_id) throw new Error('OUTCOME_OPERATION_MISMATCH');

    const nextState = outcome.status === 'SUCCEEDED' ? 'COMPLETED'
      : outcome.status === 'FAILED' ? 'FAILED'
      : 'PENDING';

    const current = state.get(proposal.task.task_id) || proposal.task;
    const next = freeze({
      ...current,
      state: nextState,
      last_outcome_event_id: outcomeEvent.event_id,
    });

    state.set(proposal.task.task_id, next);
    return append('RECONCILIATION', {
      task_id: proposal.task.task_id,
      operation_id: proposal.operation_id,
      state_before: current.state,
      state_after: nextState,
      outcome_event_id: outcomeEvent.event_id,
      observed_result: outcome,
    }, {
      operationId: proposal.operation_id,
      principal: proposal.principal,
      parentEventId: outcomeEvent.event_id,
    });
  }

  function reconstruct() {
    const replay = new Map();
    for (const event of events) {
      if (event.event_kind === 'WORK_PROPOSAL') {
        replay.set(event.payload.task.task_id, { ...event.payload.task });
      } else if (event.event_kind === 'RECONCILIATION') {
        const current = replay.get(event.payload.task_id);
        if (!current) throw new Error('REPLAY_MISSING_TASK');
        replay.set(event.payload.task_id, {
          ...current,
          state: event.payload.state_after,
          last_outcome_event_id: event.payload.outcome_event_id,
        });
      }
    }
    return Object.freeze(Object.fromEntries(replay.entries()));
  }

  return Object.freeze({
    append,
    recordProposal,
    recordAuthorization,
    recordExecutionRequest,
    recordOutcome,
    reconcile,
    events: () => Object.freeze([...events]),
    reconstruct,
  });
}

export function executeSandboxFollowUp({ proposal, authorization, store } = {}) {
  if (!store) throw new Error('SANDBOX_STORE_REQUIRED');
  const gate = canExecuteSandboxFollowUp({ proposal, authorization });
  if (!gate.allowed) {
    return freeze({ status: 'BLOCKED', reason: gate.reason, execution_request_event: null, outcome_event: null });
  }

  const requestEvent = store.recordExecutionRequest(proposal, authorization);

  const outcome = {
    operation_id: proposal.operation_id,
    task_id: proposal.task.task_id,
    status: 'SUCCEEDED',
    executor: 'IN_PROCESS_SANDBOX',
    side_effects: [],
    result: {
      task_id: proposal.task.task_id,
      state: 'CREATED_IN_SANDBOX',
    },
  };

  const outcomeEvent = store.recordOutcome(proposal, requestEvent, outcome);
  const reconciliationEvent = store.reconcile(proposal, outcomeEvent);

  return freeze({
    status: 'SUCCEEDED',
    execution_request_event: requestEvent,
    outcome_event: outcomeEvent,
    reconciliation_event: reconciliationEvent,
  });
}

export function buildSandboxScope(proposal) {
  if (!proposal?.work_item_id) throw new Error('SANDBOX_PROPOSAL_REQUIRED');
  return exactScope(proposal.work_item_id);
}
