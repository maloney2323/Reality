import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGovernedChatSignal } from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import { startContinuityRuntime } from '../src/reality-continuity-spine-runtime-v0.1.js';

test('live continuity runtime persists RAW -> TRANSFORMATION -> OBSERVATION on one UUID spine', async () => {
  const previous = {
    enabled: process.env.REALITY_CONTINUITY_SPINE_ENABLED,
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SECRET_KEY,
  };
  process.env.REALITY_CONTINUITY_SPINE_ENABLED = 'true';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'test-key';

  const rows = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, options = {}) => {
    const u = new URL(url);
    if (options.method === 'POST') {
      const body = JSON.parse(options.body);
      rows.push(body);
      return new Response(JSON.stringify([body]), { status: 201 });
    }
    const requestedId = u.searchParams.get('event_id')?.replace(/^eq\./, '') || null;
    if (requestedId) {
      const exact = rows.find((row) => row.event_id === requestedId);
      return new Response(JSON.stringify(exact ? [exact] : []), { status: 200 });
    }
    const root = u.searchParams.get('continuity_root_id')?.replace(/^eq\./, '') || null;
    const worldline = u.searchParams.get('worldline_id')?.replace(/^eq\./, '') || null;
    const matching = rows.filter((row) => row.continuity_root_id === root && row.worldline_id === worldline);
    const latest = matching[matching.length - 1];
    return new Response(JSON.stringify(latest ? [latest] : []), { status: 200 });
  };

  try {
    const signal = buildGovernedChatSignal({
      message: 'I need to follow up with the customer tomorrow.',
      observedAt: '2026-10-09T01:00:00.000Z',
    });
    const runtime = await startContinuityRuntime({
      continuityRootSource: 'continuity:test-runtime',
      worldlineSource: 'reality:test',
      subjectId: 'conversation:test',
      signal,
      observedAt: '2026-10-09T01:00:00.000Z',
      fetchImpl: global.fetch,
    });

    assert.equal(runtime.status, 'PERSISTED');
    assert.equal(runtime.nodes.length, 3);
    assert.equal(rows.length, 3);
    assert.equal(new Set(rows.map((row) => row.continuity_root_id)).size, 1);
    assert.equal(new Set(rows.map((row) => row.worldline_id)).size, 1);
    assert.match(rows[0].event_id, /^[0-9a-f-]{36}$/);
    assert.equal(rows[1].parent_event_id, rows[0].event_id);
    assert.equal(rows[2].parent_event_id, rows[1].event_id);
    assert.equal(rows[1].provenance.continuity_spine.prior_lineage_hash, rows[0].lineage_hash);
    assert.equal(rows[2].provenance.continuity_spine.prior_lineage_hash, rows[1].lineage_hash);
  } finally {
    global.fetch = originalFetch;
    if (previous.enabled === undefined) delete process.env.REALITY_CONTINUITY_SPINE_ENABLED;
    else process.env.REALITY_CONTINUITY_SPINE_ENABLED = previous.enabled;
    if (previous.url === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previous.url;
    if (previous.key === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = previous.key;
  }
});

test('enabled continuity fails closed when durable persistence is unavailable', async () => {
  const previous = {
    enabled: process.env.REALITY_CONTINUITY_SPINE_ENABLED,
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SECRET_KEY,
  };
  process.env.REALITY_CONTINUITY_SPINE_ENABLED = 'true';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'test-key';

  try {
    const signal = buildGovernedChatSignal({
      message: 'Test durable continuity failure.',
      observedAt: '2026-10-09T01:02:00.000Z',
    });
    const failingFetch = async () => new Response('unavailable', { status: 503 });
    await assert.rejects(
      startContinuityRuntime({
        continuityRootSource: 'continuity:test-failure',
        worldlineSource: 'reality:test',
        subjectId: 'conversation:test-failure',
        signal,
        observedAt: '2026-10-09T01:02:00.000Z',
        fetchImpl: failingFetch,
      }),
      /CONTINUITY_PERSISTENCE_REQUIRED/
    );
  } finally {
    if (previous.enabled === undefined) delete process.env.REALITY_CONTINUITY_SPINE_ENABLED;
    else process.env.REALITY_CONTINUITY_SPINE_ENABLED = previous.enabled;
    if (previous.url === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previous.url;
    if (previous.key === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = previous.key;
  }
});
