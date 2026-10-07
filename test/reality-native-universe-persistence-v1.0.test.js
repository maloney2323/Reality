import test from 'node:test';
import assert from 'node:assert/strict';
import { createUniverseEntry } from '../src/reality-universe-persistence-contract-v1.0.js';
import {
  persistUniverseEntry,
  retrievePersistedUniverse,
} from '../src/reality-native-universe-persistence-v1.0.js';

const base = createUniverseEntry({
  entry_id: 'entry:persistence:test:1',
  continuity_root_id: 'root:test',
  worldline_id: 'worldline:test',
  event_kind: 'TEST_OBSERVATION',
  epistemic_kind: 'OBSERVATION',
  assertion_time: '2026-10-07T17:00:00.000Z',
  effective_time: '2026-10-07T17:00:00.000Z',
  source_ref: 'test:source',
  payload: { value: 1 },
  evidence_references: ['evidence:test'],
  provenance: { source: 'test' },
});

function mockFetch(routes) {
  return async (url, options = {}) => {
    const route = routes.find((candidate) => candidate.match(url, options));
    if (!route) throw new Error(`UNEXPECTED_REQUEST:${url}`);
    return route.respond(url, options);
  };
}

test('round-trips a Universe entry through the persistence adapter', async () => {
  const calls = [];
  const fetchImpl = mockFetch([
    {
      match: (url, options) => options.method === 'GET' && url.includes('entry_id=eq.'),
      respond: () => ({ ok: true, json: async () => [] }),
    },
    {
      match: (url, options) => options.method === 'POST',
      respond: (_url, options) => {
        calls.push(JSON.parse(options.body));
        return { ok: true, json: async () => [JSON.parse(options.body)] };
      },
    },
    {
      match: (url, options) => options.method === 'GET' && url.includes('/rest/v1/reality_universe_entries?select=*'),
      respond: () => ({ ok: true, json: async () => [base] }),
    },
  ]);

  const persisted = await persistUniverseEntry(base, { fetchImpl });
  assert.equal(persisted.status, 'PERSISTED');
  assert.equal(persisted.entry.ledger_entry_hash, base.ledger_entry_hash);
  assert.equal(calls.length, 1);

  const retrieved = await retrievePersistedUniverse({ fetchImpl });
  assert.equal(retrieved.status, 'AVAILABLE');
  assert.equal(retrieved.count, 1);
  assert.deepEqual(retrieved.entries[0], base);
});

test('rejects a conflicting retry for an immutable entry id', async () => {
  const existing = base;
  const conflicting = createUniverseEntry({ ...base, payload: { value: 2 } });
  const fetchImpl = mockFetch([{
    match: (url, options) => options.method === 'GET' && url.includes('entry_id=eq.'),
    respond: () => ({ ok: true, json: async () => [existing] }),
  }]);

  await assert.rejects(
    persistUniverseEntry(conflicting, { fetchImpl }),
    /UNIVERSE_IMMUTABLE_ENTRY_VIOLATION/,
  );
});

test('fails closed when persistence is unavailable', async () => {
  const fetchImpl = async () => { throw new Error('network down'); };
  await assert.rejects(
    retrievePersistedUniverse({ fetchImpl }),
    /UNIVERSE_PERSISTENCE_UNAVAILABLE/,
  );
});
