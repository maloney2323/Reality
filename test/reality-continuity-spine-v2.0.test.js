import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createContinuitySpine,
  appendContinuityNode,
  advanceSpine,
  validateContinuityChain,
} from '../src/reality-continuity-spine-v2.0.js';

test('one spine carries a subject from signal through learning', () => {
  let spine = createContinuitySpine({ subjectId: 'work:customer-followup', worldlineId: 'world:primary' });
  const stages = ['RAW_SIGNAL','TRANSFORMATION','OBSERVATION','SITUATION','WORK','AUTHORITY','EXECUTION','VERIFICATION','OUTCOME','LEARNING'];
  const nodes = [];
  for (const stage of stages) {
    const previous = nodes[nodes.length - 1] || null;
    const node = appendContinuityNode({
      spine,
      stage,
      entityId: stage.toLowerCase() + ':1',
      parentEventId: previous?.event_id || null,
      priorLineageHash: previous?.lineage_hash || null,
      evidenceRefs: previous ? [previous.entity_id] : [],
      transformationReceiptId: stage === 'TRANSFORMATION' ? 'tr:1' : null,
    });
    nodes.push(node);
    spine = advanceSpine(spine, node);
  }
  assert.equal(new Set(nodes.map((n) => n.continuity_root_id)).size, 1);
  assert.equal(new Set(nodes.map((n) => n.worldline_id)).size, 1);
  assert.equal(spine.current_stage, 'LEARNING');
  assert.equal(validateContinuityChain(nodes).valid, true);
});

test('continuity cannot silently fork or skip the parent lineage', () => {
  const spine = createContinuitySpine({ subjectId: 'work:test' });
  const raw = appendContinuityNode({ spine, stage: 'RAW_SIGNAL', entityId: 'signal:1' });
  const wrongParent = appendContinuityNode({
    spine, stage: 'OBSERVATION', entityId: 'observation:wrong',
    parentEventId: 'wrong-parent', priorLineageHash: raw.lineage_hash,
  });
  assert.equal(validateContinuityChain([raw, wrongParent]).valid, false);
  const observation = appendContinuityNode({
    spine, stage: 'OBSERVATION', entityId: 'observation:1',
    parentEventId: raw.event_id, priorLineageHash: raw.lineage_hash,
  });
  const broken = { ...observation, prior_lineage_hash: 'tampered' };
  assert.equal(validateContinuityChain([raw, broken]).valid, false);
});

test('a non-root node cannot exist without its prior lineage hash', () => {
  const spine = createContinuitySpine({ subjectId: 'work:test' });
  assert.throws(() => appendContinuityNode({
    spine, stage: 'OBSERVATION', entityId: 'observation:1', parentEventId: 'missing-hash'
  }), /CONTINUITY_PRIOR_LINEAGE_HASH_REQUIRED/);
});

test('detects event payload tampering even when parent links remain intact', () => {
  const spine = createContinuitySpine({ subjectId: 'work:tamper-test' });
  const raw = appendContinuityNode({
    spine,
    stage: 'RAW_SIGNAL',
    entityId: 'signal:tamper-test',
    payload: { packet_digest: 'sha256:original' },
    provenance: { source: 'test' },
  });
  const observation = appendContinuityNode({
    spine,
    stage: 'TRANSFORMATION',
    entityId: 'receipt:tamper-test',
    parentEventId: raw.event_id,
    priorLineageHash: raw.lineage_hash,
    evidenceRefs: [raw.event_id],
    transformationReceiptId: 'receipt:tamper-test',
    payload: { receipt_digest: 'sha256:original' },
    provenance: { source: 'test' },
  });
  const tampered = {
    ...observation,
    payload: { receipt_digest: 'sha256:forged' },
  };
  const result = validateContinuityChain([raw, tampered]);
  assert.equal(result.valid, false);
  assert.ok(result.broken_links.some((item) => item.index === 1 && item.reason === 'LINEAGE_HASH_CONTENT_MISMATCH'));
});

test('rejects a root event that claims an earlier parent or lineage hash', () => {
  const spine = createContinuitySpine({ subjectId: 'work:root-parent-test' });
  const raw = appendContinuityNode({ spine, stage: 'RAW_SIGNAL', entityId: 'signal:root-parent-test' });
  const forgedRoot = { ...raw, parent_event_id: 'some-parent', prior_lineage_hash: 'some-hash' };
  const result = validateContinuityChain([forgedRoot]);
  assert.equal(result.valid, false);
  assert.ok(result.broken_links.some((item) => item.reason === 'LINEAGE_HASH_CONTENT_MISMATCH'));
  assert.ok(result.broken_links.some((item) => item.reason === 'ROOT_PARENT_MUST_BE_NULL'));
  assert.ok(result.broken_links.some((item) => item.reason === 'ROOT_PRIOR_HASH_MUST_BE_NULL'));
});

test('lineage verification treats equivalent UTC timestamp encodings as the same instant', () => {
  const spine = createContinuitySpine({ subjectId: 'work:timestamp-canonicalization' });
  const raw = appendContinuityNode({
    spine,
    stage: 'RAW_SIGNAL',
    entityId: 'signal:timestamp-canonicalization',
    effectiveTime: '2026-10-09T12:00:00.602Z',
    assertionTime: '2026-10-09T12:00:00.602Z',
    payload: { value: 'same instant' },
  });
  const persistedRepresentation = {
    ...raw,
    effective_time: '2026-10-09T12:00:00.602+00:00',
    assertion_time: '2026-10-09T12:00:00.602+00:00',
  };
  assert.equal(validateContinuityChain([persistedRepresentation]).valid, true);

  const changedInstant = {
    ...raw,
    effective_time: '2026-10-09T12:00:01.602+00:00',
  };
  assert.equal(validateContinuityChain([changedInstant]).valid, false);
});

test('does not promote legacy capability stages or unverifiable hashes into the current ledger contract', () => {
  const legacy = [
    {
      event_id: '11111111-1111-4111-8111-111111111111',
      event_kind: 'OBSERVATION',
      continuity_root_id: '33333333-3333-4333-8333-333333333333',
      worldline_id: '44444444-4444-4444-8444-444444444444',
      parent_event_id: null,
      lineage_hash: 'lineage-observation-v1',
      effective_time: '2026-10-06T22:47:51.756Z',
      assertion_time: '2026-10-06T22:47:51.756Z',
      epistemic_status: 'OBSERVED',
      evidence_refs: [],
      payload: {},
      provenance: { source: 'universe-v1-proof' },
    },
    {
      event_id: '55555555-5555-4555-8555-555555555555',
      event_kind: 'CAPABILITY_VERIFIED',
      continuity_root_id: '33333333-3333-4333-8333-333333333333',
      worldline_id: '44444444-4444-4444-8444-444444444444',
      parent_event_id: '11111111-1111-4111-8111-111111111111',
      prior_lineage_hash: 'lineage-observation-v1',
      lineage_hash: 'lineage-capability-v1',
      effective_time: '2026-10-06T22:47:51.756Z',
      assertion_time: '2026-10-06T22:47:51.756Z',
      epistemic_status: 'OBSERVED',
      evidence_refs: [],
      payload: {},
      provenance: { source: 'universe-v1-proof' },
    },
  ];
  const result = validateContinuityChain(legacy);
  assert.equal(result.valid, false);
  assert.ok(result.broken_links.some((item) => item.reason === 'LINEAGE_HASH_CONTENT_MISMATCH'));
  assert.ok(result.broken_links.some((item) => item.reason === 'CONTINUITY_STAGE_INVALID'));
});
