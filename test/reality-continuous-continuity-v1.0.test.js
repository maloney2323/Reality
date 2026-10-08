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
