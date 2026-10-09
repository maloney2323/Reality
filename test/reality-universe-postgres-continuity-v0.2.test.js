import test from 'node:test';
import assert from 'node:assert/strict';
import { createUniversePostgresPersistence } from '../src/reality-universe-postgres-persistence-v0.1.js';

test('persistence automatically links sequential events into one continuity tail', async () => {
  const originalFetch = global.fetch;
  const rows = [];
  global.fetch = async (url, options = {}) => {
    const u = new URL(url);
    if (options.method === 'POST') {
      const body = JSON.parse(options.body);
      rows.push(body);
      return new Response(JSON.stringify([body]), { status: 201, headers: { 'content-type': 'application/json' } });
    }
    const requestedId = u.searchParams.get('event_id')?.replace(/^eq\./, '') || null;
    if (requestedId) {
      const exact = rows.find((row) => row.event_id === requestedId);
      return new Response(JSON.stringify(exact ? [exact] : []), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    const latest = rows.slice().sort((a, b) => String(b.assertion_time).localeCompare(String(a.assertion_time)))[0];
    return new Response(JSON.stringify(latest ? [latest] : []), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    const persistence = createUniversePostgresPersistence({
      url: 'https://example.supabase.co',
      secretKey: 'test-key',
    });
    const base = {
      continuity_root_id: 'root:test',
      worldline_id: 'world:test',
      effective_time: '2026-10-08T00:00:00.000Z',
      assertion_time: '2026-10-08T00:00:00.000Z',
      epistemic_status: 'OBSERVED',
      evidence_refs: [],
      provenance: { source: 'test' },
    };
    const first = await persistence.appendEvent({
      ...base, event_id: 'event:1', event_kind: 'observation',
      entity_type: 'observation', entity_id: 'obs:1', payload: { value: 1 },
    });
    const second = await persistence.appendEvent({
      ...base, event_id: 'event:2', event_kind: 'work',
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
    event_id: 'event:tail',
    continuity_root_id: 'root:test',
    worldline_id: 'world:test',
    lineage_hash: 'tail-hash',
    assertion_time: '2026-10-08T00:00:00.000Z',
  }];
  global.fetch = async (url, options = {}) => {
    const u = new URL(url);
    if (options.method === 'POST') return new Response('[]', { status: 201 });
    const u = new URL(url);
    if (u.searchParams.get('event_id')) return new Response('[]', { status: 200 });
    return new Response(JSON.stringify(rows), { status: 200 });
  };
  try {
    const persistence = createUniversePostgresPersistence({
      url: 'https://example.supabase.co', secretKey: 'test-key',
    });
    await assert.rejects(
      persistence.appendEvent({
        continuity_root_id: 'root:test', worldline_id: 'world:test',
        event_id: 'event:new', event_kind: 'work', entity_type: 'work', entity_id: 'work:new',
        parent_event_id: 'event:not-tail', payload: {}, assertion_time: '2026-10-08T00:01:00.000Z',
        effective_time: '2026-10-08T00:01:00.000Z',
      }),
      /CONTINUITY_APPEND_NOT_TAIL/
    );
  } finally {
    global.fetch = originalFetch;
  }
});
