import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateContinuityStageGate } from '../src/reality-continuity-stage-gate-v1.0.js';

const node = (event_kind, overrides = {}) => ({
  event_id: event_kind.toLowerCase() + '-event',
  event_kind,
  lineage_hash: event_kind.toLowerCase() + '-hash',
  evidence_refs: ['evidence:1'],
  transformation_receipt_id: 'receipt:1',
  ...overrides,
  payload: { workflow_run_id: 'run-test', ...(overrides.payload || {}) },
});

test('blocks WORK when SITUATION has not been durably established', () => {
  const result = evaluateContinuityStageGate({
    stage: 'WORK',
    priorNodes: [node('RAW_SIGNAL'), node('TRANSFORMATION'), node('OBSERVATION')],
    candidate: node('WORK'),
    persistenceStatus: 'PERSISTED',
  });
  assert.equal(result.allowed, false);
  assert.ok(result.reasons.includes('REQUIRED_PREDECESSOR_MISSING:SITUATION'));
});

test('requires a transformation receipt and evidence for OBSERVATION', () => {
  const result = evaluateContinuityStageGate({
    stage: 'OBSERVATION',
    priorNodes: [node('RAW_SIGNAL'), node('TRANSFORMATION')],
    candidate: node('OBSERVATION', { evidence_refs: [], transformation_receipt_id: null }),
    persistenceStatus: 'PERSISTED',
  });
  assert.equal(result.allowed, false);
  assert.ok(result.reasons.includes('EVIDENCE_REFS_REQUIRED'));
  assert.ok(result.reasons.includes('TRANSFORMATION_RECEIPT_REQUIRED'));
});

test('a requested authorization does not authorize execution', () => {
  const priorNodes = [
    node('RAW_SIGNAL'), node('TRANSFORMATION'), node('OBSERVATION'),
    node('SITUATION'), node('WORK'),
    node('AUTHORITY', { payload: { authorization_status: 'REQUESTED', granted: false, authorization_ref: 'auth:1' } }),
  ];
  const result = evaluateContinuityStageGate({
    stage: 'EXECUTION',
    priorNodes,
    candidate: node('EXECUTION', { payload: { authorization_ref: 'auth:1' } }),
    persistenceStatus: 'PERSISTED',
  });
  assert.equal(result.allowed, false);
  assert.ok(result.reasons.includes('AUTHORITY_NOT_GRANTED'));
});

test('blocks governed work when continuity is only in memory', () => {
  const result = evaluateContinuityStageGate({
    stage: 'WORK',
    priorNodes: [node('RAW_SIGNAL'), node('TRANSFORMATION'), node('OBSERVATION'), node('SITUATION')],
    candidate: node('WORK'),
    persistenceStatus: 'IN_MEMORY_ONLY',
  });
  assert.equal(result.allowed, false);
  assert.ok(result.reasons.includes('DURABLE_CONTINUITY_REQUIRED'));
});

test('allows a valid next stage when predecessor, evidence and persistence are present', () => {
  const result = evaluateContinuityStageGate({
    stage: 'SITUATION',
    priorNodes: [node('RAW_SIGNAL'), node('TRANSFORMATION'), node('OBSERVATION')],
    candidate: node('SITUATION'),
    persistenceStatus: 'PERSISTED',
  });
  assert.equal(result.allowed, true);
  assert.deepEqual(result.reasons, []);
});

test('allows a new workflow to start only when linked to the durable global tail', () => {
  const tail = node('OBSERVATION', { event_id: 'prior-global-event', lineage_hash: 'prior-global-hash' });
  const result = evaluateContinuityStageGate({
    stage: 'RAW_SIGNAL',
    workflowHistory: [],
    globalTail: tail,
    candidate: {
      workflow_run_id: 'run-b',
      parent_event_id: tail.event_id,
      prior_lineage_hash: tail.lineage_hash,
      evidence_refs: [],
      payload: { workflow_run_id: 'run-b' },
    },
    persistenceStatus: 'DURABLE_READY',
  });
  assert.equal(result.allowed, true);
  assert.deepEqual(result.reasons, []);
});

test('blocks a new workflow that tries to fork from a stale or missing global tail', () => {
  const tail = node('OBSERVATION', { event_id: 'current-tail', lineage_hash: 'current-hash' });
  const result = evaluateContinuityStageGate({
    stage: 'RAW_SIGNAL',
    workflowHistory: [],
    globalTail: tail,
    candidate: {
      workflow_run_id: 'run-b',
      parent_event_id: 'stale-parent',
      prior_lineage_hash: 'stale-hash',
      payload: { workflow_run_id: 'run-b' },
    },
    persistenceStatus: 'DURABLE_READY',
  });
  assert.equal(result.allowed, false);
  assert.ok(result.reasons.includes('GLOBAL_PARENT_MISMATCH'));
  assert.ok(result.reasons.includes('GLOBAL_LINEAGE_HASH_MISMATCH'));
});

test('another workflow cannot satisfy this workflow predecessor requirement', () => {
  const foreignHistory = [
    node('RAW_SIGNAL', { payload: { workflow_run_id: 'run-a' } }),
    node('TRANSFORMATION', { payload: { workflow_run_id: 'run-a' } }),
    node('OBSERVATION', { payload: { workflow_run_id: 'run-a' } }),
  ];
  const result = evaluateContinuityStageGate({
    stage: 'SITUATION',
    workflowHistory: [],
    globalTail: foreignHistory[2],
    candidate: {
      workflow_run_id: 'run-b',
      parent_event_id: foreignHistory[2].event_id,
      prior_lineage_hash: foreignHistory[2].lineage_hash,
      evidence_refs: ['evidence:run-b'],
      transformation_receipt_id: 'receipt:run-b',
      payload: { workflow_run_id: 'run-b' },
    },
    persistenceStatus: 'DURABLE_READY',
  });
  assert.equal(result.allowed, false);
  assert.ok(result.reasons.includes('REQUIRED_PREDECESSOR_MISSING:OBSERVATION'));
});

test('execution requires a granted authority artifact and matching reference', () => {
  const priorNodes = [
    node('RAW_SIGNAL'), node('TRANSFORMATION'), node('OBSERVATION'),
    node('SITUATION'), node('WORK'),
    node('AUTHORITY', { payload: { authorization_status: 'GRANTED', granted: true, authorization_ref: 'auth:1' } }),
  ];
  const result = evaluateContinuityStageGate({
    stage: 'EXECUTION',
    priorNodes,
    candidate: node('EXECUTION', { payload: { authorization_ref: 'auth:2' } }),
    persistenceStatus: 'PERSISTED',
  });
  assert.equal(result.allowed, false);
  assert.ok(result.reasons.includes('AUTHORIZATION_SCOPE_REFERENCE_MISMATCH'));
});

test('requires a durable workflow identity and rejects mixed-run stage history', () => {
  const missingId = evaluateContinuityStageGate({
    stage: 'RAW_SIGNAL',
    workflowHistory: [],
    globalTail: null,
    candidate: { payload: {} },
    persistenceStatus: 'DURABLE_READY',
  });
  assert.equal(missingId.allowed, false);
  assert.ok(missingId.reasons.includes('WORKFLOW_RUN_ID_REQUIRED'));

  const mixed = evaluateContinuityStageGate({
    stage: 'SITUATION',
    workflowHistory: [
      node('RAW_SIGNAL', { payload: { workflow_run_id: 'run-a' } }),
      node('TRANSFORMATION', { payload: { workflow_run_id: 'run-b' } }),
      node('OBSERVATION', { payload: { workflow_run_id: 'run-b' } }),
    ],
    globalTail: node('OBSERVATION', { event_id: 'tail', lineage_hash: 'tail-hash' }),
    candidate: {
      workflow_run_id: 'run-b',
      parent_event_id: 'tail',
      prior_lineage_hash: 'tail-hash',
      evidence_refs: ['evidence:1'],
      transformation_receipt_id: 'receipt:1',
      payload: { workflow_run_id: 'run-b' },
    },
    persistenceStatus: 'DURABLE_READY',
  });
  assert.equal(mixed.allowed, false);
  assert.ok(mixed.reasons.includes('WORKFLOW_HISTORY_ID_MISMATCH:0'));
});
