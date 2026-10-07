import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createUniverseEntry,
  validateUniverseEntry,
  assertAppendOnly,
  buildUniversePersistenceContract,
} from '../src/reality-universe-persistence-contract-v1.0.js';

const base = {
  entry_id: 'entry:test:1',
  continuity_root_id: 'root:test',
  worldline_id: 'worldline:test',
  event_kind: 'TEST_OBSERVATION',
  epistemic_kind: 'OBSERVATION',
  assertion_time: '2026-10-07T17:00:00.000Z',
  effective_time: '2026-10-07T17:00:00.000Z',
  source_ref: 'test:source',
  payload: { value: 1 },
  evidence_references: ['test:evidence:1'],
  provenance: { source: 'test', observed_at: '2026-10-07T17:00:00.000Z' },
};

test('creates and validates an immutable Universe entry', () => {
  const entry = createUniverseEntry(base);
  assert.equal(validateUniverseEntry(entry).valid, true);
  assert.equal(typeof entry.ledger_entry_hash, 'string');
  assert.equal(entry.ledger_entry_hash.length, 64);
});

test('rejects mutation of a persisted entry', () => {
  const entry = createUniverseEntry(base);
  const mutated = createUniverseEntry({ ...entry, payload: { value: 2 } });
  assert.throws(
    () => assertAppendOnly([entry], mutated),
    /UNIVERSE_IMMUTABLE_ENTRY_VIOLATION/,
  );
});

test('accepts an identical duplicate without rewriting it', () => {
  const entry = createUniverseEntry(base);
  assert.deepEqual(
    assertAppendOnly([entry], entry),
    { allowed: false, reason: 'DUPLICATE_IDENTICAL_ENTRY' },
  );
});

test('rejects a forged ledger hash', () => {
  const entry = createUniverseEntry(base);
  assert.throws(
    () => validateUniverseEntry({ ...entry, ledger_entry_hash: '0'.repeat(64) }),
    /UNIVERSE_LEDGER_HASH_MISMATCH/,
  );
});

test('requires provenance and evidence references', () => {
  assert.throws(
    () => createUniverseEntry({ ...base, provenance: null }),
    /UNIVERSE_PROVENANCE_REQUIRED/,
  );
  assert.throws(
    () => createUniverseEntry({ ...base, evidence_references: null }),
    /UNIVERSE_EVIDENCE_REFERENCES_REQUIRED/,
  );
});

test('contract forbids storage from granting authority or promoting truth', () => {
  const contract = buildUniversePersistenceContract();
  assert.equal(contract.invariants.storage_does_not_promote_truth, true);
  assert.equal(contract.invariants.storage_does_not_grant_authority, true);
  assert.equal(contract.invariants.append_only, true);
});
