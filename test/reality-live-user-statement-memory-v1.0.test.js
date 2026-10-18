import test from 'node:test';
import assert from 'node:assert/strict';
import { runLiveIntelligenceOrchestration } from '../src/reality-live-intelligence-orchestration-v0.1.js';

function memoryFetch(store, modelContexts) {
  return async (url, options = {}) => {
    if (url === 'https://api.openai.com/v1/responses') {
      const body = JSON.parse(options.body);
      const modelInput = JSON.parse(body.input[1].content[0].text);
      modelContexts.push(modelInput.system_context);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: `resp:memory-test:${modelContexts.length}`,
          status: 'completed',
          output_text: '4821',
        }),
      };
    }

    const parsed = new URL(url);
    assert.equal(parsed.pathname, '/rest/v1/reality_universe_entries');

    if (options.method === 'GET') {
      const entryFilter = parsed.searchParams.get('entry_id');
      const rootFilter = parsed.searchParams.get('continuity_root_id');
      let rows = store.slice();
      if (entryFilter?.startsWith('eq.')) {
        const id = entryFilter.slice(3);
        rows = rows.filter((entry) => entry.entry_id === id);
      }
      if (rootFilter?.startsWith('eq.')) {
        const root = rootFilter.slice(3);
        rows = rows.filter((entry) => entry.continuity_root_id === root);
      }
      return { ok: true, status: 200, json: async () => rows };
    }

    if (options.method === 'POST') {
      const entry = JSON.parse(options.body);
      store.push(entry);
      return { ok: true, status: 201, json: async () => [entry] };
    }

    throw new Error(`UNEXPECTED_METHOD:${options.method}`);
  };
}

test('a user-provided fact is persisted and supplied to cognition on the next turn', async () => {
  const previousEnabled = process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED;
  const previousKey = process.env.REALITY_UNIVERSE_PERSISTENCE_KEY;
  process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED = 'true';
  process.env.REALITY_UNIVERSE_PERSISTENCE_KEY = 'test-key';

  const store = [];
  const modelContexts = [];
  const fetchImpl = memoryFetch(store, modelContexts);
  const systemContext = { continuity_root_id: 'root:kestrel-recall-test' };

  try {
    await runLiveIntelligenceOrchestration({
      message: "Kestrel's seal code is 4821.",
      systemContext,
      apiKey: 'test-openai-key',
      fetchImpl,
    });

    assert.ok(store.some((entry) =>
      entry.event_kind === 'USER_STATEMENT' &&
      entry.payload?.statement === "Kestrel's seal code is 4821."
    ), 'the original user statement must be stored as a distinct Universe entry');

    await runLiveIntelligenceOrchestration({
      message: "What was Kestrel's seal code? Answer with the four digits only.",
      systemContext,
      apiKey: 'test-openai-key',
      fetchImpl,
    });

    const secondTurnEntries = modelContexts[1]?.universe_context_entries || [];
    assert.ok(secondTurnEntries.some((entry) =>
      entry.event_kind === 'USER_STATEMENT' &&
      entry.payload?.statement === "Kestrel's seal code is 4821."
    ), 'the prior user statement must be present in the next turn model context');
  } finally {
    if (previousEnabled === undefined) delete process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED;
    else process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED = previousEnabled;
    if (previousKey === undefined) delete process.env.REALITY_UNIVERSE_PERSISTENCE_KEY;
    else process.env.REALITY_UNIVERSE_PERSISTENCE_KEY = previousKey;
  }
});
