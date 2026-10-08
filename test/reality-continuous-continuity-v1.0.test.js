import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveContinuityRootId,
  buildContinuityEvent,
  buildContinuityRehydration,
  validateContinuityEvent,
} from '../src/reality-continuous-continuity-v1.0.js';

test('continuous continuity derives a stable root from a conversation', () => {
  const a = deriveContinuityRootId({ conversationId: 'conversation:123' });
  const b = deriveContinuityRootId({ conversationId: 'conversation:123' });
  assert.equal(a, b);
  assert.match(a, /^continuity:/);
});

test('continuity event remains rehydratable after active execution ends', () => {
  const event = buildContinuityEvent({
    continuityRootId: 'continuity:test',
    nextState: 'COMPLETED',
    trigger: 'VERIFIED_OUTCOME',
    payload: { continuity_state: 'COMPLETED', outcome: 'verified' },
  });
  assert.equal(event.rehydratable, true);
  assert.equal(event.next_state, 'COMPLETED');
  assert.equal(validateContinuityEvent(event).valid, true);
});

test('Universe entries can rehydrate dormant continuity and expose the latest state', () => {
  const entries = [
    {
      entry_id: 'e1',
      continuity_root_id: 'continuity:test',
      assertion_time: '2026-10-01T00:00:00.000Z',
      payload: { continuity_state: 'COMPLETED' },
    },
    {
      entry_id: 'e2',
      continuity_root_id: 'continuity:test',
      assertion_time: '2026-10-07T00:00:00.000Z',
      payload: { continuity_state: 'WAITING' },
    },
  ];
  const result = buildContinuityRehydration({
    continuityRootId: 'continuity:test',
    entries,
    trigger: 'RELEVANT_NEW_EVIDENCE',
  });
  assert.equal(result.status, 'REHYDRATED');
  assert.equal(result.continuation_available, true);
  assert.equal(result.matched_entry_count, 2);
  assert.equal(result.latest_state, 'WAITING');
});


test('end-to-end dormant continuity rehydrates and resumes the same thread', () => {
  const root = deriveContinuityRootId({ conversationId: 'conversation:proof-loop' });
  const parked = buildContinuityEvent({
    continuityRootId: root,
    priorState: 'ACTIVE',
    nextState: 'WAITING',
    trigger: 'BLOCKED_ON_EXTERNAL_EVIDENCE',
    workItemId: 'work:market-validation',
    payload: {
      continuity_state: 'WAITING',
      objective: 'Validate the customer problem',
      next_continuation_condition: 'NEW_CUSTOMER_EVIDENCE',
    },
    observedAt: '2026-10-07T18:00:00.000Z',
  });
  const newEvidence = {
    entry_id: 'e:new-customer-evidence',
    continuity_root_id: root,
    assertion_time: '2026-10-08T00:00:00.000Z',
    effective_time: '2026-10-08T00:00:00.000Z',
    payload: {
      continuity_state: 'REOPENED',
      event_kind: 'NEW_CUSTOMER_EVIDENCE',
      objective: 'Validate the customer problem',
      evidence: 'Repeated customer workflow pain observed',
    },
  };

  const rehydrated = buildContinuityRehydration({
    continuityRootId: root,
    entries: [
      {
        entry_id: parked.continuity_event_id,
        continuity_root_id: root,
        assertion_time: parked.observed_at,
        effective_time: parked.observed_at,
        payload: {
          continuity_state: parked.next_state,
          objective: parked.payload.objective,
          next_continuation_condition: parked.payload.next_continuation_condition,
          work_item_id: parked.work_item_id,
        },
      },
      newEvidence,
    ],
    trigger: 'RELEVANT_NEW_EVIDENCE',
    relevantEntryIds: [newEvidence.entry_id],
  });

  assert.equal(rehydrated.status, 'REHYDRATED');
  assert.equal(rehydrated.continuation_available, true);
  assert.equal(rehydrated.latest_state, 'REOPENED');
  assert.equal(rehydrated.entries.some((entry) => entry.payload?.objective === 'Validate the customer problem'), true);
  assert.deepEqual(rehydrated.relevant_entry_ids, [newEvidence.entry_id]);

  const resumed = buildContinuityEvent({
    continuityRootId: root,
    priorState: rehydrated.latest_state,
    nextState: 'ACTIVE',
    trigger: 'CONTINUITY_REHYDRATED',
    workItemId: 'work:market-validation',
    evidenceReferences: [newEvidence.entry_id],
    payload: {
      continuity_state: 'ACTIVE',
      resumed_from: parked.continuity_event_id,
      resumed_by: newEvidence.entry_id,
      objective: 'Validate the customer problem',
    },
    observedAt: '2026-10-08T00:01:00.000Z',
  });

  assert.equal(resumed.continuity_root_id, parked.continuity_root_id);
  assert.equal(resumed.prior_state, 'REOPENED');
  assert.equal(resumed.work_item_id, parked.work_item_id);
  assert.equal(resumed.payload.objective, parked.payload.objective);
  assert.equal(resumed.payload.resumed_from, parked.continuity_event_id);
});
