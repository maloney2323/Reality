// Reality State Ledger v0.
//
// Append-only durable history sits downstream of the State Engine. The ledger
// does not decide truth and does not create transitions. It validates that a
// persisted transition chain is internally coherent, then derives current state
// from that history instead of trusting a separately mutable "current" row.

import {
  STATE_RECORD_VERSION,
  STATE_TRANSITION_VERSION,
  StateTransitionType,
} from './state-engine.js';

export const STATE_LEDGER_VERSION = 'reality-state-ledger-v0.1';
export const STATE_LEDGER_AUTHORITY = 'PERSISTED_TRANSITION_HISTORY_ONLY';

const TRANSITION_TYPES = new Set(Object.values(StateTransitionType));
const NEW_STATE_TYPES = new Set([StateTransitionType.UPDATED, StateTransitionType.CONTESTED]);

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function invariant(condition, message) {
  if (!condition) throw new Error(`Reality state ledger invalid: ${message}`);
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function normalizeRow(row) {
  invariant(row && typeof row === 'object', 'ledger row must be an object');
  invariant(row.ledger_version === STATE_LEDGER_VERSION, 'ledger version mismatch');
  invariant(nonEmpty(row.stream_key), 'stream_key required');
  invariant(nonEmpty(row.transition_id), 'transition_id required');
  invariant(Number.isInteger(row.event_sequence) && row.event_sequence >= 1, 'event_sequence must be a positive integer');
  invariant(row.transition_record && typeof row.transition_record === 'object', 'transition_record required');
  invariant(row.transition_record.transition_version === STATE_TRANSITION_VERSION, 'transition version mismatch');
  invariant(row.transition_record.transition_id === row.transition_id, 'transition id mismatch');
  invariant(TRANSITION_TYPES.has(row.transition_record.transition_type), 'unknown transition type');
  invariant(row.transition_record.action_authorized === false, 'state ledger transition cannot authorize action');
  if (row.resulting_state !== null && row.resulting_state !== undefined) {
    invariant(row.resulting_state.record_version === STATE_RECORD_VERSION, 'resulting state version mismatch');
    invariant(nonEmpty(row.resulting_state.state_id), 'resulting state id required');
    invariant(Number.isInteger(row.resulting_state.state_version) && row.resulting_state.state_version >= 1, 'resulting state_version invalid');
  }
  return row;
}

export function validateAndProjectStateLedger(rows) {
  const ordered = [...(rows || [])].map(normalizeRow).sort((a, b) => a.event_sequence - b.event_sequence);
  if (ordered.length === 0) {
    return Object.freeze({
      ledger_version: STATE_LEDGER_VERSION,
      authority: STATE_LEDGER_AUTHORITY,
      stream_key: null,
      event_count: 0,
      current_state: null,
      history: Object.freeze([]),
      action_authorized: false,
    });
  }

  const streamKey = ordered[0].stream_key;
  const transitionIds = new Set();
  const stateIds = new Set();
  let currentState = null;

  ordered.forEach((row, index) => {
    invariant(row.stream_key === streamKey, 'mixed stream keys are not allowed in one projection');
    invariant(row.event_sequence === index + 1, 'event_sequence must be contiguous from 1');
    invariant(!transitionIds.has(row.transition_id), 'duplicate transition_id');
    transitionIds.add(row.transition_id);

    const transition = row.transition_record;
    const expectedPreviousId = currentState?.state_id || null;
    invariant((transition.previous_state_id || null) === expectedPreviousId, 'transition previous_state_id does not match projected current state');

    const createsState = NEW_STATE_TYPES.has(transition.transition_type);
    if (createsState) {
      invariant(row.resulting_state, 'state-creating transition requires resulting_state');
      const next = row.resulting_state;
      invariant(!stateIds.has(next.state_id), 'duplicate resulting state_id');
      stateIds.add(next.state_id);
      invariant(next.state_version === (currentState ? currentState.state_version + 1 : 1), 'state_version must increment exactly once');
      invariant((next.previous_state_id || null) === expectedPreviousId, 'resulting state previous_state_id mismatch');
      invariant(next.created_by_transition_id === transition.transition_id, 'resulting state transition binding mismatch');
      invariant(transition.resulting_state_id === next.state_id, 'transition resulting_state_id mismatch');
      currentState = next;
    } else {
      invariant((transition.resulting_state_id || null) === (currentState?.state_id || null), 'non-state-creating transition must preserve current state identity');
      invariant(sameJson(row.resulting_state || null, currentState || null), 'non-state-creating transition must persist the unchanged current projection');
    }
  });

  return Object.freeze({
    ledger_version: STATE_LEDGER_VERSION,
    authority: STATE_LEDGER_AUTHORITY,
    stream_key: streamKey,
    event_count: ordered.length,
    current_state: currentState ? Object.freeze({ ...currentState }) : null,
    history: Object.freeze(ordered.map((row) => Object.freeze({
      id: row.id || null,
      event_sequence: row.event_sequence,
      proof_run_id: row.proof_run_id || null,
      phase: row.phase || null,
      transition_id: row.transition_id,
      transition_type: row.transition_record.transition_type,
      reason_code: row.transition_record.reason_code,
      candidate_value: row.transition_record.candidate_value,
      candidate_epistemic_status: row.transition_record.candidate_epistemic_status,
      previous_state_id: row.transition_record.previous_state_id || null,
      resulting_state_id: row.transition_record.resulting_state_id || null,
      evidence_refs: Object.freeze([...(row.transition_record.evidence_refs || [])]),
      resulting_state: row.resulting_state ? Object.freeze({ ...row.resulting_state }) : null,
      created_date: row.created_date || null,
    }))),
    action_authorized: false,
  });
}