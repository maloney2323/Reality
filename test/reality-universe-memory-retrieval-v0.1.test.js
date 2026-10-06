import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createBitemporalLedgerEntry,
} from '../src/reality-universe-bitemporal-ledger-v0.1.js';
import {
  retrieveUniverseMemory,
} from '../src/reality-universe-memory-retrieval-v0.1.js';

const root='cr:test-root';
const worldline='wl:test';

function entry(id, effective, assertion, payload, extra={}) {
  return createBitemporalLedgerEntry({
    entryId:id,
    eventKind:extra.eventKind || 'OBSERVATION',
    effectiveTime:effective,
    assertionTime:assertion,
    continuityRootId:root,
    worldlineId:worldline,
    payload,
    evidenceReferences:extra.evidenceReferences || [],
    sourceRef:extra.sourceRef || null,
    metadata:extra.metadata || {},
  });
}

test('retrieves durable memory without rewriting or promoting it', () => {
  const entries=[
    entry('e1','2026-10-01T10:00:00Z','2026-10-01T10:00:01Z',{message:'deploy started'},{sourceRef:'github:abc'}),
    entry('e2','2026-10-01T11:00:00Z','2026-10-01T11:00:01Z',{message:'deploy verified'},{sourceRef:'vercel:def'}),
  ];
  const result=retrieveUniverseMemory(entries,{continuityRootId:root,worldlineId:worldline,terms:['deploy']});
  assert.equal(result.matched_count,2);
  assert.equal(result.returned_count,2);
  assert.equal(result.entries[0].entry_id,'e2');
  assert.equal(result.entries[0].memory_retrieved,true);
  assert.equal(result.entries[0].ledger_entry_hash,entries[1].ledger_entry_hash);
});

test('assertion cutoff preserves what Reality could have known', () => {
  const entries=[
    entry('e1','2026-10-01T10:00:00Z','2026-10-01T12:00:00Z',{message:'late assertion'}),
    entry('e2','2026-10-01T09:00:00Z','2026-10-01T09:00:00Z',{message:'known earlier'}),
  ];
  const result=retrieveUniverseMemory(entries,{assertionTime:'2026-10-01T10:00:00Z'});
  assert.deepEqual(result.entries.map((x)=>x.entry_id),['e2']);
});

test('worldline and source filters remain exact', () => {
  const entries=[
    entry('e1','2026-10-01T10:00:00Z','2026-10-01T10:00:00Z',{x:1},{sourceRef:'github:a'}),
    entry('e2','2026-10-01T11:00:00Z','2026-10-01T11:00:00Z',{x:2},{sourceRef:'github:b'}),
  ];
  const result=retrieveUniverseMemory(entries,{worldlineId:worldline,sourceRefs:['github:b']});
  assert.deepEqual(result.entries.map((x)=>x.entry_id),['e2']);
});

test('retrieval preserves contradictions instead of selecting truth', () => {
  const entries=[
    entry('e1','2026-10-01T10:00:00Z','2026-10-01T10:00:01Z',{claim:'deployment ready'},{eventKind:'OBSERVATION'}),
    entry('e2','2026-10-01T10:00:01Z','2026-10-01T10:00:02Z',{claim:'deployment not ready'},{eventKind:'CONTRADICTION'}),
  ];
  const result=retrieveUniverseMemory(entries,{});
  assert.equal(result.returned_count,2);
  assert.deepEqual(result.entries.map((x)=>x.event_kind).sort(),['CONTRADICTION','OBSERVATION']);
});
