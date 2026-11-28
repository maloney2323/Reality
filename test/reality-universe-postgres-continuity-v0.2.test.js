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
    if (u.searchParams.has('select')) {
      const offset=Number(u.searchParams.get('offset')||0);
      const limit=Number(u.searchParams.get('limit')||400);
      return new Response(JSON.stringify(rows.slice(offset,offset+limit)),{status:200});
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
    if (options.method === 'POST') return new Response('[]', { status: 201 });
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


test('reconstruction reads beyond the provider row cap using one scoped cutoff', async () => {
  const root='aaaaaaaa-aaaa-5aaa-8aaa-aaaaaaaaaaaa';
  const worldline='bbbbbbbb-bbbb-5bbb-8bbb-bbbbbbbbbbbb';
  const cutoff='2026-10-08T00:00:00.000Z';
  const rows=Array.from({length:1205},(_,i)=>({
    event_id:'event:'+i, continuity_root_id:root, worldline_id:worldline,
    assertion_time:cutoff, parent_event_id:i?'event:'+(i-1):null,
  }));
  const offsets=[];
  const persistence=createUniversePostgresPersistence({
    url:'https://example.supabase.co',secretKey:'test-key',
    fetchImpl:async url=>{
      const q=new URL(url).searchParams;
      assert.equal(q.get('continuity_root_id'),'eq.'+root);
      assert.equal(q.get('worldline_id'),'eq.'+worldline);
      assert.equal(q.get('assertion_time'),'lte.'+cutoff);
      assert.equal(q.get('order'),'assertion_time.asc,created_at.asc,event_id.asc');
      const offset=Number(q.get('offset')||0);
      const limit=Math.min(1000,Number(q.get('limit')||1000));
      offsets.push(offset);
      return new Response(JSON.stringify(rows.slice(offset,offset+limit)),{status:200});
    }
  });
  const history=await persistence.reconstruct({
    continuityRootId:root,worldlineId:worldline,assertionTime:cutoff
  });
  assert.deepEqual(history,rows);
  assert.deepEqual(offsets,[0,400,800,1200]);
});

test('reconstruction rejects cross-worldline rows and overlapping pages', async () => {
  const root='root:test', worldline='world:test';
  const create=fetchImpl=>createUniversePostgresPersistence({
    url:'https://example.supabase.co',secretKey:'test-key',fetchImpl
  });
  const scope={continuityRootId:root,worldlineId:worldline};
  const wrong=create(async()=>new Response(JSON.stringify([{
    event_id:'wrong',continuity_root_id:root,worldline_id:'world:other'
  }]),{status:200}));
  await assert.rejects(wrong.reconstruct(scope),/CONTINUITY_RECONSTRUCTION_SCOPE_MISMATCH/);
  const rows=Array.from({length:400},(_,i)=>({
    event_id:'event:'+i,continuity_root_id:root,worldline_id:worldline
  }));
  const repeated=create(async()=>new Response(JSON.stringify(rows),{status:200}));
  await assert.rejects(repeated.reconstruct(scope),/CONTINUITY_RECONSTRUCTION_DUPLICATE_OR_INVALID/);
});
