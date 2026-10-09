import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateContinuityStageGate } from '../src/reality-continuity-stage-gate-v1.0.js';

const node = (event_kind, overrides = {}) => ({
  event_id: event_kind.toLowerCase() + '-event',
  event_kind,
  lineage_hash: event_kind.toLowerCase() + '-hash',
  evidence_refs: ['evidence:1'],
  transformation_receipt_id: 'receipt:1',
  payload: {},
  ...overrides,
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
    node('AUTHORITY', { payload: { authorization_status: 'REQUESTED' } }),
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
