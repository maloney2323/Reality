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
