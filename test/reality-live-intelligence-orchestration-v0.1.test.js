import test from 'node:test';
import assert from 'node:assert/strict';
import { runLiveIntelligenceOrchestration } from '../src/reality-live-intelligence-orchestration-v0.1.js';

function fakeFetch(url, options) {
  assert.equal(url, 'https://api.openai.com/v1/responses');
  const input = JSON.parse(options.body);
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({
      id: 'resp:test-live-orchestration',
      status: 'completed',
      output_text: 'Model interpretation: no external action is authorized.',
    }),
  });
}

test('ordinary cognition reaches the live orchestration boundary without action governance', async () => {
  const result = await runLiveIntelligenceOrchestration({
    message: 'Explain why evidence lineage matters.',
    apiKey: 'test-key',
    fetchImpl: fakeFetch,
  });

  assert.equal(result.mode, 'CONVERSATIONAL');
  assert.equal(result.governance, 'NO_ACTION_GOVERNANCE');
  assert.equal(result.intelligence.response_id, 'resp:test-live-orchestration');
  assert.equal(result.authority.granted, false);
  assert.equal(result.execution.status, 'NOT_EXECUTED');
  assert.equal(result.work, null);
  assert.ok(result.governed_signal.transformation_receipt.receipt_id);
});

test('consequential intelligence produces a governed work proposal but cannot authorize execution', async () => {
  const result = await runLiveIntelligenceOrchestration({
    message: 'Send an email to the customer confirming the appointment.',
    apiKey: 'test-key',
    fetchImpl: fakeFetch,
  });

  assert.equal(result.mode, 'ACTION_CANDIDATE');
  assert.equal(result.governance, 'PROPORTIONAL_ACTION_GOVERNANCE');
  assert.equal(result.authority.granted, false);
  assert.equal(result.intelligence.execution_authorized, false);
  assert.equal(result.work.preflight.execution_permitted, false);
  assert.equal(result.work.authorization_request.authorized, false);
  assert.equal(result.execution.status, 'NOT_EXECUTED');
  assert.equal(result.work.run.state, 'CAPTURED');
  assert.ok(result.governed_signal.packet.packet_id);
  assert.ok(result.governed_signal.transformation_receipt.receipt_id);
});

test('missing model credential fails closed before orchestration can produce a work result', async () => {
  await assert.rejects(
    () => runLiveIntelligenceOrchestration({
      message: 'What is operational verification?',
      apiKey: '',
      fetchImpl: fakeFetch,
    }),
    /OPENAI_API_KEY_REQUIRED/
  );
});


test('persists the complete governed proposal and returns the final authority stage without executing it', async (t) => {
  const envKeys = [
    'REALITY_UNIVERSE_PERSISTENCE_ENABLED',
    'REALITY_UNIVERSE_PERSISTENCE_URL',
    'REALITY_UNIVERSE_PERSISTENCE_KEY',
    'SUPABASE_URL',
    'SUPABASE_SECRET_KEY',
  ];
  const previous = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED = 'true';
  process.env.REALITY_UNIVERSE_PERSISTENCE_URL = 'https://supabase.test';
  process.env.REALITY_UNIVERSE_PERSISTENCE_KEY = 'test-key';
  process.env.SUPABASE_URL = 'https://supabase.test';
  process.env.SUPABASE_SECRET_KEY = 'test-key';
  t.after(() => {
    for (const key of envKeys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });

  const rows = [];
  let sequence = 0;
  const fetchImpl = async (input, options = {}) => {
    const url = new URL(String(input));
    const method = options.method || 'GET';
    if (url.hostname === 'api.openai.com') {
      return new Response(JSON.stringify({
        id: 'resp:governed-e2e',
        status: 'completed',
        output_text: 'Model interpretation: no external action is authorized.',
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.pathname.endsWith('/reality_universe_entries')) {
      return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (method === 'POST' && url.pathname.endsWith('/rpc/append_universe_event')) {
      const { p_record: record } = JSON.parse(options.body);
      const existing = rows.find((row) => row.event_id === record.event_id);
      if (existing) {
        if (existing.lineage_hash !== record.lineage_hash) return new Response('CONTINUITY_EVENT_ID_COLLISION', { status: 409 });
        return new Response(JSON.stringify({ ...existing, status: 'DUPLICATE_IDENTICAL' }), { status: 200 });
      }
      const tail = rows.filter((row) => row.continuity_root_id === record.continuity_root_id && row.worldline_id === record.worldline_id)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
      if ((record.parent_event_id || null) !== (tail?.event_id || null)) return new Response('CONTINUITY_APPEND_NOT_TAIL', { status: 409 });
      const priorHash = record.provenance?.continuity_spine?.prior_lineage_hash || null;
      if (priorHash !== (tail?.lineage_hash || null)) return new Response('CONTINUITY_PRIOR_LINEAGE_HASH_MISMATCH', { status: 409 });
      sequence += 1;
      const saved = { ...record, created_at: new Date(1800000000000 + sequence * 1000).toISOString() };
      rows.push(saved);
      return new Response(JSON.stringify({ ...saved, status: 'PERSISTED' }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.pathname.endsWith('/universe_events')) {
      let matches = [...rows];
      const eventId = url.searchParams.get('event_id')?.replace(/^eq\./, '');
      const rootId = url.searchParams.get('continuity_root_id')?.replace(/^eq\./, '');
      const worldlineId = url.searchParams.get('worldline_id')?.replace(/^eq\./, '');
      const assertionLimit = url.searchParams.get('assertion_time')?.replace(/^lte\./, '');
      if (eventId) matches = matches.filter((row) => row.event_id === eventId);
      if (rootId) matches = matches.filter((row) => row.continuity_root_id === rootId);
      if (worldlineId) matches = matches.filter((row) => row.worldline_id === worldlineId);
      if (assertionLimit) matches = matches.filter((row) => row.assertion_time <= assertionLimit);
      const order = url.searchParams.get('order') || '';
      matches.sort((a, b) => order.includes('desc')
        ? String(b.created_at).localeCompare(String(a.created_at))
        : String(a.created_at).localeCompare(String(b.created_at)));
      if (url.searchParams.has('limit')) matches = matches.slice(0, Number(url.searchParams.get('limit')));
      return new Response(JSON.stringify(matches), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response('unexpected test request: ' + url.pathname, { status: 404 });
  };

  const result = await runLiveIntelligenceOrchestration({
    message: 'Send a follow-up email to the customer about tomorrow’s appointment.',
    requestedBy: 'controlled-test-user',
    observedAt: new Date().toISOString(),
    systemContext: {
      continuity_root_id: 'continuity:controlled-e2e',
      worldline_id: 'reality:controlled-e2e',
      conversation_id: 'conversation:controlled-e2e',
    },
    apiKey: 'test-key',
    fetchImpl,
  });

  assert.equal(result.mode, 'ACTION_CANDIDATE');
  assert.equal(result.continuity_spine.status, 'PERSISTED');
  assert.equal(result.continuity_spine.node_count, 6);
  assert.equal(rows.length, 6);
  assert.deepEqual(rows.map((row) => row.event_kind), [
    'RAW_SIGNAL', 'TRANSFORMATION', 'OBSERVATION', 'SITUATION', 'WORK', 'AUTHORITY',
  ]);
  const authority = rows.at(-1);
  assert.equal(authority.payload.authorization_status, 'REQUESTED');
  assert.equal(authority.payload.granted, false);
  assert.equal(authority.payload.authorization_ref, result.work.authorization_request.authorization_id);
  assert.equal(result.continuity_spine.last_event_id, authority.event_id);
  assert.equal(result.execution.status, 'NOT_EXECUTED');
  assert.equal(result.work.authorization_request.authorized, false);
});
