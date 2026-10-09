import test from 'node:test';
import assert from 'node:assert/strict';
import { createUniversePostgresPersistence } from '../src/reality-universe-postgres-persistence-v0.1.js';

test('persistence automatically links sequential events into one continuity tail', async () => {
  const originalFetch = global.fetch;
  const rows = [];
  global.fetch = async (url, options = {}) => {
    const u = new URL(url);
    if (u.pathname.endsWith('/rpc/append_universe_event')) {
      const { p_record } = JSON.parse(options.body);
      const existing = rows.find((row) => row.event_id === p_record.event_id);
      if (existing) {
        if (existing.lineage_hash !== p_record.lineage_hash) return new Response('CONTINUITY_EVENT_ID_COLLISION', { status: 409 });
        return new Response(JSON.stringify({ ...existing, status: 'DUPLICATE_IDENTICAL' }), { status: 200 });
      }
      const tail = rows.filter((row) => row.continuity_root_id === p_record.continuity_root_id && row.worldline_id === p_record.worldline_id)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
      if ((p_record.parent_event_id || null) !== (tail?.event_id || null)) {
        return new Response('CONTINUITY_APPEND_NOT_TAIL', { status: 409 });
      }
      const priorHash = p_record.provenance?.continuity_spine?.prior_lineage_hash || null;
      if (priorHash !== (tail?.lineage_hash || null)) return new Response('CONTINUITY_PRIOR_LINEAGE_HASH_MISMATCH', { status: 409 });
      const saved = { ...p_record, created_at: new Date(Date.now() + rows.length).toISOString(), status: 'PERSISTED' };
      rows.push(saved);
      return new Response(JSON.stringify(saved), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    const requestedId = u.searchParams.get('event_id')?.replace(/^eq\./, '') || null;
    if (requestedId) {
      const exact = rows.find((row) => row.event_id === requestedId);
      return new Response(JSON.stringify(exact ? [exact] : []), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    const root = u.searchParams.get('continuity_root_id')?.replace(/^eq\./, '') || null;
    const worldline = u.searchParams.get('worldline_id')?.replace(/^eq\./, '') || null;
    const matching = rows.filter((row) => row.continuity_root_id === root && row.worldline_id === worldline);
    const order = u.searchParams.get('order') || '';
    matching.sort((a, b) => order.includes('desc')
      ? String(b.created_at).localeCompare(String(a.created_at))
      : String(a.created_at).localeCompare(String(b.created_at)));
    return new Response(JSON.stringify(matching), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    const persistence = createUniversePostgresPersistence({
      url: 'https://example.supabase.co',
      secretKey: 'test-key',
    });
    const base = {
      continuity_root_id: 'aaaaaaaa-aaaa-5aaa-8aaa-aaaaaaaaaaaa',
      worldline_id: 'bbbbbbbb-bbbb-5bbb-8bbb-bbbbbbbbbbbb',
      effective_time: '2026-10-08T00:00:00.000Z',
      assertion_time: '2026-10-08T00:00:00.000Z',
      epistemic_status: 'OBSERVED',
      evidence_refs: [],
      provenance: { source: 'test' },
    };
    const first = await persistence.appendEvent({
      ...base, event_id: '11111111-1111-5111-8111-111111111111', event_kind: 'observation',
      entity_type: 'observation', entity_id: 'obs:1', payload: { value: 1 },
    });
    const second = await persistence.appendEvent({
      ...base, event_id: '22222222-2222-5222-8222-222222222222', event_kind: 'work',
      entity_type: 'work', entity_id: 'work:1', payload: { value: 2 },
      assertion_time: '2026-10-08T00:01:00.000Z',
    });

    assert.equal(first.parent_event_id, null);
    assert.equal(second.parent_event_id, first.event_id);
    assert.notEqual(second.lineage_hash, first.lineage_hash);
    assert.match(second.lineage_hash, /^[a-f0-9]{64}$/);
  } finally {
    global.fetch = originalFetch;
  }
});

test('persistence rejects a write against a non-tail parent', async () => {
  const originalFetch = global.fetch;
  const rows = [{
    event_id: '33333333-3333-5333-8333-333333333333',
    continuity_root_id: 'root:test',
    worldline_id: 'world:test',
    lineage_hash: 'tail-hash',
    assertion_time: '2026-10-08T00:00:00.000Z',
  }];
  global.fetch = async (url, options = {}) => {
    const u = new URL(url);
    if (u.pathname.endsWith('/rpc/append_universe_event')) {
      const { p_record } = JSON.parse(options.body);
      const tail = rows.filter((row) => row.continuity_root_id === p_record.continuity_root_id && row.worldline_id === p_record.worldline_id)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
      if ((p_record.parent_event_id || null) !== (tail?.event_id || null)) return new Response('CONTINUITY_APPEND_NOT_TAIL', { status: 409 });
      return new Response(JSON.stringify({ ...p_record, status: 'PERSISTED' }), { status: 200 });
    }
    const requestedId = u.searchParams.get('event_id')?.replace(/^eq\./, '') || null;
    if (requestedId) return new Response('[]', { status: 200 });
    return new Response(JSON.stringify(rows), { status: 200 });
  };
  try {
    const persistence = createUniversePostgresPersistence({
      url: 'https://example.supabase.co', secretKey: 'test-key',
    });
    await assert.rejects(
      persistence.appendEvent({
        continuity_root_id: 'root:test', worldline_id: 'world:test',
        event_id: '44444444-4444-5444-8444-444444444444', event_kind: 'work', entity_type: 'work', entity_id: 'work:new',
        parent_event_id: 'event:not-tail', payload: {}, assertion_time: '2026-10-08T00:01:00.000Z',
        effective_time: '2026-10-08T00:01:00.000Z',
      }),
      /CONTINUITY_APPEND_NOT_TAIL/
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('reconstructs the durable ledger by parent links despite timestamp disorder and future assertions', async () => {
  const root = 'aaaaaaaa-aaaa-5aaa-8aaa-aaaaaaaaaaaa';
  const world = 'bbbbbbbb-bbbb-5bbb-8bbb-bbbbbbbbbbbb';
  const seedId = '11111111-1111-5111-8111-111111111111';
  const childId = '22222222-2222-5222-8222-222222222222';
  const rows = [
    {
      event_id: childId, continuity_root_id: root, worldline_id: world,
      parent_event_id: seedId, created_at: '2026-10-09T00:00:01Z',
      assertion_time: '2026-10-08T00:00:00Z', lineage_hash: 'child-hash',
    },
    {
      event_id: seedId, continuity_root_id: root, worldline_id: world,
      parent_event_id: null, created_at: '2026-10-09T00:00:02Z',
      assertion_time: '2026-10-10T00:00:00Z', lineage_hash: 'seed-hash',
    },
  ];
  const persistence = createUniversePostgresPersistence({
    url: 'https://example.supabase.co',
    secretKey: 'test-key',
    fetchImpl: async () => new Response(JSON.stringify(rows), { status: 200 }),
  });
  const reconstructed = await persistence.reconstruct({ continuityRootId: root, worldlineId: world });
  assert.deepEqual(reconstructed.map((row) => row.event_id), [seedId, childId]);
  assert.equal(reconstructed.length, 2, 'continuity reconstruction must not apply an implicit assertion-time cutoff');
});

test('reconstruction fails closed on a forked parent chain', async () => {
  const root = 'aaaaaaaa-aaaa-5aaa-8aaa-aaaaaaaaaaaa';
  const world = 'bbbbbbbb-bbbb-5bbb-8bbb-bbbbbbbbbbbb';
  const seedId = '11111111-1111-5111-8111-111111111111';
  const rows = [
    { event_id: seedId, continuity_root_id: root, worldline_id: world, parent_event_id: null },
    { event_id: '22222222-2222-5222-8222-222222222222', continuity_root_id: root, worldline_id: world, parent_event_id: seedId },
    { event_id: '33333333-3333-5333-8333-333333333333', continuity_root_id: root, worldline_id: world, parent_event_id: seedId },
  ];
  const persistence = createUniversePostgresPersistence({
    url: 'https://example.supabase.co',
    secretKey: 'test-key',
    fetchImpl: async () => new Response(JSON.stringify(rows), { status: 200 }),
  });
  await assert.rejects(
    persistence.reconstruct({ continuityRootId: root, worldlineId: world }),
    /CONTINUITY_HISTORY_FORK_DETECTED/,
  );
});
