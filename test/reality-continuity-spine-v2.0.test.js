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
