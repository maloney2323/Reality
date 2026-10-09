import test from 'node:test';
import assert from 'node:assert/strict';
import { startContinuityRuntime } from '../src/reality-continuity-spine-runtime-v0.1.js';
import { validateContinuityChain } from '../src/reality-continuity-spine-v2.0.js';

function signal(packetId) {
  return {
    packet: {
      packet_id: packetId,
      source: 'test',
      observed_at: new Date().toISOString(),
      raw_content_digest: 'raw-digest-' + packetId,
    },
    transformation_receipt: {
      receipt_id: 'receipt-' + packetId,
      input_digest: 'input-' + packetId,
      output_digest: 'output-' + packetId,
      cleaner_version: 'test-cleaner-v1',
      fragment_count: 1,
      meaning_change_claimed: false,
    },
    fragments: [{ fragment_id: 'fragment-' + packetId }],
  };
}

function makeDb({ failPost = false, failRead = false } = {}) {
  const rows = [];
  let sequence = 0;
  const fetchImpl = async (input, init = {}) => {
    const url = new URL(String(input));
    const method = init.method || 'GET';
    if (failRead && method === 'GET' && url.pathname.endsWith('/universe_events')) {
      return new Response('read unavailable', { status: 503 });
    }
    if (method === 'POST' && url.pathname.endsWith('/universe_events')) {
      if (failPost) return new Response('write unavailable', { status: 503 });
      const record = JSON.parse(init.body);
      sequence += 1;
      rows.push({ ...record, created_at: new Date(Date.now() + sequence).toISOString() });
      return new Response(JSON.stringify([rows[rows.length - 1]]), { status: 201 });
    }
    if (method === 'GET' && url.pathname.endsWith('/universe_events')) {
      const eventFilter = url.searchParams.get('event_id');
      const rootFilter = url.searchParams.get('continuity_root_id');
      const worldlineFilter = url.searchParams.get('worldline_id');
      let matches = rows.filter((row) =>
        (!eventFilter || row.event_id === eventFilter.replace(/^eq\./, '')) &&
        (!rootFilter || row.continuity_root_id === rootFilter.replace(/^eq\./, '')) &&
        (!worldlineFilter || row.worldline_id === worldlineFilter.replace(/^eq\./, ''))
      );
      if (url.searchParams.has('assertion_time')) {
        const limit = url.searchParams.get('assertion_time').replace(/^lte\./, '');
        matches = matches.filter((row) => row.assertion_time <= limit);
      }
      if (url.searchParams.has('order')) {
        const order = url.searchParams.get('order');
        matches = [...matches].sort((a, b) => {
          const direction = order.includes('desc') ? -1 : 1;
          return direction * (
            String(a.assertion_time).localeCompare(String(b.assertion_time)) ||
            String(a.created_at).localeCompare(String(b.created_at)) ||
            String(a.event_id).localeCompare(String(b.event_id))
          );
        });
      }
      if (url.searchParams.has('limit')) matches = matches.slice(0, Number(url.searchParams.get('limit')));
      return new Response(JSON.stringify(matches), { status: 200 });
    }
    return new Response('unexpected request', { status: 404 });
  };
  return { rows, fetchImpl };
}

function setPersistenceEnv(t) {
  const previous = {
    enabled: process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED,
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SECRET_KEY,
  };
  process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED = 'true';
  process.env.SUPABASE_URL = 'https://supabase.test';
  process.env.SUPABASE_SECRET_KEY = 'test-secret';
  t.after(() => {
    for (const [key, value] of [
      ['REALITY_UNIVERSE_PERSISTENCE_ENABLED', previous.enabled],
      ['SUPABASE_URL', previous.url],
      ['SUPABASE_SECRET_KEY', previous.key],
    ]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

test('rehydrates the global tail and starts a separate workflow without cross-run stage contamination', async (t) => {
  setPersistenceEnv(t);
  const db = makeDb();
  const root = 'continuity-runtime-test-root';
  const worldline = 'reality:test-world';
  const first = await startContinuityRuntime({
    continuityRootSource: root,
    worldlineSource: worldline,
    subjectId: 'subject-a',
    signal: signal('packet-a'),
    observedAt: new Date(Date.now() - 10000).toISOString(),
    workflowRunId: 'run-a',
    fetchImpl: db.fetchImpl,
  });
  assert.equal(first.status, 'PERSISTED');
  assert.equal(first.nodes.length, 3);
  assert.equal(first.nodes[0].event_kind, 'RAW_SIGNAL');
  assert.equal(first.nodes[2].event_kind, 'OBSERVATION');

  const second = await startContinuityRuntime({
    continuityRootSource: root,
    worldlineSource: worldline,
    subjectId: 'subject-b',
    signal: signal('packet-b'),
    observedAt: new Date(Date.now() - 5000).toISOString(),
    workflowRunId: 'run-b',
    fetchImpl: db.fetchImpl,
  });
  assert.equal(second.status, 'PERSISTED');
  assert.equal(second.rehydrated_event_count, 3);
  assert.equal(second.nodes.length, 3);
  assert.equal(second.nodes[0].event_kind, 'RAW_SIGNAL');
  assert.equal(second.nodes[0].parent_event_id, first.nodes[2].event_id);
  assert.equal(second.nodes[0].payload.workflow_run_id, 'run-b');
  assert.equal(first.nodes[0].payload.workflow_run_id, 'run-a');
  assert.equal(validateContinuityChain(db.rows).valid, true);
});

test('fails closed when durable history cannot be read', async (t) => {
  setPersistenceEnv(t);
  const db = makeDb({ failRead: true });
  await assert.rejects(
    () => startContinuityRuntime({
      continuityRootSource: 'read-failure-root',
      subjectId: 'subject-read-failure',
      signal: signal('packet-read-failure'),
      fetchImpl: db.fetchImpl,
    }),
    (error) => error.code === 'CONTINUITY_REHYDRATION_REQUIRED',
  );
  assert.equal(db.rows.length, 0);
});

test('does not report continuity success when an event write fails', async (t) => {
  setPersistenceEnv(t);
  const db = makeDb({ failPost: true });
  await assert.rejects(
    () => startContinuityRuntime({
      continuityRootSource: 'write-failure-root',
      subjectId: 'subject-write-failure',
      signal: signal('packet-write-failure'),
      fetchImpl: db.fetchImpl,
    }),
    (error) => error.code === 'CONTINUITY_PERSISTENCE_REQUIRED',
  );
  assert.equal(db.rows.length, 0);
});

test('blocks progression when the persisted global chain is broken', async (t) => {
  setPersistenceEnv(t);
  const db = makeDb();
  await startContinuityRuntime({
    continuityRootSource: 'broken-chain-root',
    subjectId: 'subject-chain-a',
    signal: signal('packet-chain-a'),
    observedAt: new Date(Date.now() - 10000).toISOString(),
    workflowRunId: 'run-chain-a',
    fetchImpl: db.fetchImpl,
  });
  db.rows[1].parent_event_id = 'wrong-parent';
  await assert.rejects(
    () => startContinuityRuntime({
      continuityRootSource: 'broken-chain-root',
      subjectId: 'subject-chain-b',
      signal: signal('packet-chain-b'),
      observedAt: new Date(Date.now() - 5000).toISOString(),
      workflowRunId: 'run-chain-b',
      fetchImpl: db.fetchImpl,
    }),
    (error) => error.code === 'CONTINUITY_HISTORY_INVALID',
  );
  assert.equal(db.rows.length, 3);
});
