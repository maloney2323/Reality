import test from 'node:test';
import assert from 'node:assert/strict';
import { runLiveIntelligenceOrchestration } from '../src/reality-live-intelligence-orchestration-v0.1.js';

function persistenceMock(store) {
  return async (url, options = {}) => {
    if (url === 'https://api.openai.com/v1/responses') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: 'resp:continuity-state-test',
          status: 'completed',
          output_text: 'No external action was executed.',
        }),
      };
    }

    const parsed = new URL(url);
    assert.equal(parsed.pathname, '/rest/v1/reality_universe_entries');
    if (options.method === 'GET') {
      const entryFilter = parsed.searchParams.get('entry_id');
      const rootFilter = parsed.searchParams.get('continuity_root_id');
      if (entryFilter?.startsWith('eq.')) {
        const id = entryFilter.slice(3);
        return { ok: true, status: 200, json: async () => store.filter((entry) => entry.entry_id === id) };
      }
      assert.ok(rootFilter?.startsWith('eq.'), 'all continuity reads must be scoped');
      const root = rootFilter.slice(3);
      const rows = store.filter((entry) => entry.continuity_root_id === root)
        .sort((a, b) => String(b.assertion_time).localeCompare(String(a.assertion_time)));
      return { ok: true, status: 200, json: async () => rows };
    }
    if (options.method === 'POST') {
      const entry = JSON.parse(options.body);
      store.push(entry);
      return { ok: true, status: 201, json: async () => [entry] };
    }
    throw new Error('UNEXPECTED_METHOD:' + options.method);
  };
}

test('action candidates wait for explicit authorization and follow-up turns do not erase unresolved state', async () => {
  const previousEnabled = process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED;
  const previousKey = process.env.REALITY_UNIVERSE_PERSISTENCE_KEY;
  process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED = 'true';
  process.env.REALITY_UNIVERSE_PERSISTENCE_KEY = 'test-key';

  const store = [];
  const fetchImpl = persistenceMock(store);
  const systemContext = {
    continuity_root_id: 'root:pending-authorization-test',
    worldline_id: 'worldline:pending-authorization-test',
  };

  try {
    await runLiveIntelligenceOrchestration({
      message: 'Send an email to the customer.',
      systemContext,
      apiKey: 'test-openai-key',
      fetchImpl,
    });

    await runLiveIntelligenceOrchestration({
      message: 'What should I consider before doing that?',
      systemContext,
      apiKey: 'test-openai-key',
      fetchImpl,
    });

    const transitions = store.filter((entry) => entry.event_kind === 'CONTINUITY_STATE_TRANSITION');
    assert.equal(transitions.length, 2);
    assert.equal(transitions[0].payload.next_state, 'WAITING');
    assert.equal(transitions[0].payload.continuity_state_reason, 'ACTION_CANDIDATE_AWAITS_EXPLICIT_AUTHORIZATION');
    assert.equal(transitions[1].payload.prior_state, 'WAITING');
    assert.equal(transitions[1].payload.next_state, 'WAITING');
    assert.equal(transitions[1].payload.continuity_state_reason, 'PRESERVE_PRIOR_STATE_UNTIL_VERIFIED_TRANSITION');
  } finally {
    if (previousEnabled === undefined) delete process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED;
    else process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED = previousEnabled;
    if (previousKey === undefined) delete process.env.REALITY_UNIVERSE_PERSISTENCE_KEY;
    else process.env.REALITY_UNIVERSE_PERSISTENCE_KEY = previousKey;
  }
});
