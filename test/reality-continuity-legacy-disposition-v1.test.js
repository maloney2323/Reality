import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyContinuityHistoryDisposition,
  validateContinuityChain,
} from '../src/reality-continuity-spine-v2.0.js';

test('legacy CAPABILITY_VERIFIED history is quarantined, never promoted or resumed', () => {
  const legacy = [{
    event_id: 'legacy-capability-event',
    event_kind: 'CAPABILITY_VERIFIED',
    continuity_root_id: 'legacy-root',
    worldline_id: 'legacy-worldline',
    parent_event_id: 'legacy-parent',
    lineage_hash: 'legacy-placeholder-hash',
    entity_id: 'legacy-entity',
    effective_time: '2026-10-01T00:00:00.000Z',
    assertion_time: '2026-10-01T00:00:00.000Z',
    epistemic_status: 'OBSERVED',
    evidence_refs: [],
    payload: {},
    provenance: {},
  }];
  const validation = validateContinuityChain(legacy);
  const disposition = classifyContinuityHistoryDisposition(legacy, validation);

  assert.equal(validation.valid, false);
  assert.equal(disposition.status, 'LEGACY_UNVERIFIABLE');
  assert.equal(disposition.eligible_for_resume, false);
  assert.equal(disposition.reason, 'LEGACY_STAGE_OUTSIDE_CURRENT_CONTRACT');
  assert.equal(disposition.event_id, 'legacy-capability-event');
  assert.ok(disposition.broken_links.length > 0);
});

test('ordinary invalid history remains invalid rather than being mislabeled as legacy', () => {
  const invalid = [{
    event_id: 'unknown-stage-event',
    event_kind: 'UNKNOWN_STAGE',
    continuity_root_id: 'root',
    worldline_id: 'worldline',
    parent_event_id: null,
    lineage_hash: 'placeholder',
    entity_id: 'unknown-stage-entity',
    effective_time: '2026-10-01T00:00:00.000Z',
    assertion_time: '2026-10-01T00:00:00.000Z',
    epistemic_status: 'OBSERVED',
    evidence_refs: [],
    payload: {},
    provenance: {},
  }];
  const disposition = classifyContinuityHistoryDisposition(invalid);

  assert.equal(disposition.status, 'INVALID');
  assert.equal(disposition.eligible_for_resume, false);
  assert.equal(disposition.reason, 'CONTINUITY_HISTORY_INVALID');
});


// Edge-case tests: malformed legacy events must not crash recovery, and
// unverifiable history must never become resumable. These tests prove the
// operator-facing diagnostics remain intact under degraded input.

test('null input does not crash and classifies as VERIFIED with zero events', () => {
  const disposition = classifyContinuityHistoryDisposition(null);
  assert.equal(disposition.status, 'VERIFIED');
  assert.equal(disposition.eligible_for_resume, true);
  assert.equal(disposition.event_count, 0);
});

test('empty array classifies as VERIFIED with zero events', () => {
  const disposition = classifyContinuityHistoryDisposition([]);
  assert.equal(disposition.status, 'VERIFIED');
  assert.equal(disposition.eligible_for_resume, true);
  assert.equal(disposition.event_count, 0);
});

test('array with null entries does not crash', () => {
  const rows = [null, undefined, { event_kind: 'CAPABILITY_VERIFIED', event_id: 'legacy-1' }];
  const disposition = classifyContinuityHistoryDisposition(rows);
  assert.equal(disposition.status, 'LEGACY_UNVERIFIABLE');
  assert.equal(disposition.eligible_for_resume, false);
  assert.equal(disposition.event_id, 'legacy-1');
});

test('multiple legacy stages report the first one found', () => {
  const rows = [
    { event_kind: 'CAPABILITY_VERIFIED', event_id: 'legacy-first' },
    { event_kind: 'CAPABILITY_VERIFIED', event_id: 'legacy-second' },
  ];
  const disposition = classifyContinuityHistoryDisposition(rows);
  assert.equal(disposition.status, 'LEGACY_UNVERIFIABLE');
  assert.equal(disposition.event_id, 'legacy-first');
  assert.equal(disposition.event_count, 2);
});

test('legacy stage with missing event_id reports null event_id without crashing', () => {
  const rows = [{ event_kind: 'CAPABILITY_VERIFIED' }];
  const disposition = classifyContinuityHistoryDisposition(rows);
  assert.equal(disposition.status, 'LEGACY_UNVERIFIABLE');
  assert.equal(disposition.event_id, null);
  assert.equal(disposition.eligible_for_resume, false);
});

test('legacy stage with missing event_kind is not detected as legacy', () => {
  const rows = [{ event_id: 'not-legacy', event_kind: undefined }];
  const disposition = classifyContinuityHistoryDisposition(rows);
  assert.equal(disposition.status, 'INVALID');
  assert.equal(disposition.eligible_for_resume, false);
});

test('validateContinuityChain with malformed nodes produces broken_links not a crash', () => {
  const malformed = [null, { event_kind: 'RAW_SIGNAL' }, { continuity_root_id: 'r' }];
  const result = validateContinuityChain(malformed);
  assert.equal(result.valid, false);
  assert.ok(result.broken_links.length > 0);
  assert.ok(result.broken_links.some((link) => link.reason === 'NODE_IDENTITY_INCOMPLETE'));
});

test('LEGACY_UNVERIFIABLE disposition carries operator-facing diagnostics', () => {
  const legacy = [{
    event_id: 'legacy-diagnostic-event',
    event_kind: 'CAPABILITY_VERIFIED',
    continuity_root_id: 'legacy-root',
    worldline_id: 'legacy-worldline',
    parent_event_id: 'legacy-parent',
    lineage_hash: 'legacy-placeholder-hash',
    entity_id: 'legacy-entity',
    effective_time: '2026-10-01T00:00:00.000Z',
    assertion_time: '2026-10-01T00:00:00.000Z',
    epistemic_status: 'OBSERVED',
    evidence_refs: [],
    payload: {},
    provenance: {},
  }];
  const validation = validateContinuityChain(legacy);
  const disposition = classifyContinuityHistoryDisposition(legacy, validation);
  assert.equal(disposition.status, 'LEGACY_UNVERIFIABLE');
  assert.equal(disposition.reason, 'LEGACY_STAGE_OUTSIDE_CURRENT_CONTRACT');
  assert.equal(disposition.event_kind, 'CAPABILITY_VERIFIED');
  assert.equal(disposition.event_count, 1);
  assert.ok(Array.isArray(disposition.broken_links));
  assert.ok(disposition.broken_links.length > 0);
});
