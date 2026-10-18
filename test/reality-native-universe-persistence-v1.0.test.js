import test from 'node:test';
import assert from 'node:assert/strict';
import { createUniverseEntry } from '../src/reality-universe-persistence-contract-v1.0.js';
import {
  persistUniverseEntry,
  retrievePersistedUniverse,
  retrieveDormantContinuitySummaries,
} from '../src/reality-native-universe-persistence-v1.0.js';

process.env.REALITY_UNIVERSE_PERSISTENCE_KEY ||= 'test-persistence-key';

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
  const databaseRow = {
    ...base,
    // PostgreSQL/PostgREST may return timestamptz with an offset and omit .000.
    assertion_time: '2026-10-07T17:00:00+00:00',
    effective_time: '2026-10-07T17:00:00+00:00',
  };
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
      respond: () => ({ ok: true, json: async () => [databaseRow] }),
    },
  ]);

  const persisted = await persistUniverseEntry(base, { fetchImpl });
  assert.equal(persisted.status, 'PERSISTED');
  assert.equal(persisted.entry.ledger_entry_hash, base.ledger_entry_hash);
  assert.equal(calls.length, 1);

  const retrieved = await retrievePersistedUniverse({ continuityRootId: 'root:test', worldlineId: 'worldline:test', fetchImpl });
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


test('dormant continuity uses each root latest state before classifying it', async () => {
  const transition = (root, state, timestamp) => createUniverseEntry({
    entry_id: 'transition:' + root + ':' + state + ':' + timestamp,
    continuity_root_id: root,
    worldline_id: 'worldline:test',
    event_kind: 'CONTINUITY_STATE_TRANSITION',
    epistemic_kind: 'OBSERVATION',
    assertion_time: timestamp,
    effective_time: timestamp,
    source_ref: 'test:continuity',
    payload: { continuity_state: state, next_state: state },
    evidence_references: ['evidence:' + root],
    provenance: { source: 'test' },
  });

  const rows = [
    transition('root:active', 'ACTIVE', '2026-10-18T12:00:00.000Z'),
    transition('root:dormant', 'BLOCKED', '2026-10-18T12:00:00.000Z'),
    transition('root:completed', 'COMPLETED', '2026-10-18T12:00:00.000Z'),
    transition('root:reopened', 'REOPENED', '2026-10-18T12:00:00.000Z'),
    transition('root:active', 'WAITING', '2026-10-18T11:00:00.000Z'),
    transition('root:dormant', 'ACTIVE', '2026-10-18T11:00:00.000Z'),
    transition('root:completed', 'ACTIVE', '2026-10-18T11:00:00.000Z'),
    transition('root:reopened', 'BLOCKED', '2026-10-18T11:00:00.000Z'),
  ];

  const fetchImpl = async (url, options = {}) => {
    assert.equal(options.method, 'GET');
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get('event_kind'), 'eq.CONTINUITY_STATE_TRANSITION');
    assert.equal(parsed.searchParams.get('worldline_id'), 'eq.worldline:test');
    return { ok: true, status: 200, json: async () => rows };
  };

  const result = await retrieveDormantContinuitySummaries({
    worldlineId: 'worldline:test',
    fetchImpl,
  });
  const byRoot = new Map(result.entries.map((entry) => [entry.continuity_root_id, entry]));

  assert.deepEqual([...byRoot.keys()].sort(), ['root:completed', 'root:dormant']);
  assert.equal(byRoot.get('root:dormant').payload.continuity_state, 'BLOCKED');
  assert.equal(byRoot.get('root:completed').payload.continuity_state, 'COMPLETED');
});

test('fails closed when persistence is unavailable', async () => {
  const fetchImpl = async () => { throw new Error('network down'); };
  await assert.rejects(
    retrievePersistedUniverse({ continuityRootId: 'root:test', worldlineId: 'worldline:test', fetchImpl }),
    /UNIVERSE_PERSISTENCE_UNAVAILABLE/,
  );
});
