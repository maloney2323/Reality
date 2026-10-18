import test from 'node:test';
import assert from 'node:assert/strict';
import { createUniverseEntry } from '../src/reality-universe-persistence-contract-v1.0.js';
import { runLiveIntelligenceOrchestration } from '../src/reality-live-intelligence-orchestration-v0.1.js';

const root = 'root:relevance-handoff-test';
const worldline = 'worldline:relevance-handoff-test';

function statementEntry(id, statement, timestamp) {
  return createUniverseEntry({
    entry_id: id,
    continuity_root_id: root,
    worldline_id: worldline,
    event_kind: 'USER_STATEMENT',
    epistemic_kind: 'USER_REPORTED',
    assertion_time: timestamp,
    effective_time: timestamp,
    source_ref: 'test:user-statement',
    payload: { statement, statement_kind: 'USER_PROVIDED', memory_scope: 'CONTINUITY' },
    evidence_references: ['evidence:' + id],
    provenance: { source: 'relevance-handoff-test' },
  });
}

test('relevance retrieval recalls an older matching fact beyond the newest 100 entries', async () => {
  const previousEnabled = process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED;
  const previousKey = process.env.REALITY_UNIVERSE_PERSISTENCE_KEY;
  process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED = 'true';
  process.env.REALITY_UNIVERSE_PERSISTENCE_KEY = 'test-key';

  const oldFact = statementEntry(
    'user-statement:old-kestrel-code',
    "Kestrel's seal code is 4821.",
    '2026-10-01T00:00:00.000Z',
  );
  const store = [oldFact];
  for (let i = 0; i < 150; i += 1) {
    const day = String(2 + Math.floor(i / 24)).padStart(2, '0');
    const hour = String(i % 24).padStart(2, '0');
    store.push(statementEntry(
      'user-statement:irrelevant:' + i,
      'Meeting note reference ' + i + ' concerns scheduling and ordinary project updates.',
      '2026-10-' + day + 'T' + hour + ':00:00.000Z',
    ));
  }

  let retrievalLimit = 0;
  let modelContext = null;
  const fetchImpl = async (url, options = {}) => {
    if (url === 'https://api.openai.com/v1/responses') {
      const request = JSON.parse(options.body);
      const modelInput = JSON.parse(request.input[1].content[0].text);
      modelContext = modelInput.system_context;
      const found = (modelContext?.universe_context_entries || []).some((entry) =>
        entry.entry_id === oldFact.entry_id && entry.payload?.statement === "Kestrel's seal code is 4821.",
      );
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: 'resp:relevance-handoff-test',
          status: 'completed',
          output_text: found ? '4821' : 'UNKNOWN',
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
      assert.equal(rootFilter, 'eq.' + root);
      retrievalLimit = Number(parsed.searchParams.get('limit'));
      const rows = store.filter((entry) => entry.continuity_root_id === root)
        .sort((a, b) => String(b.assertion_time).localeCompare(String(a.assertion_time)))
        .slice(0, retrievalLimit);
      return { ok: true, status: 200, json: async () => rows };
    }
    if (options.method === 'POST') {
      const entry = JSON.parse(options.body);
      store.push(entry);
      return { ok: true, status: 201, json: async () => [entry] };
    }
    throw new Error('UNEXPECTED_METHOD:' + options.method);
  };

  try {
    const result = await runLiveIntelligenceOrchestration({
      message: "What was Kestrel's seal code?",
      systemContext: { continuity_root_id: root, worldline_id: worldline },
      apiKey: 'test-openai-key',
      fetchImpl,
    });

    assert.equal(retrievalLimit, 1000, 'the database read must reach beyond the newest 100 rows');
    assert.equal(result.intelligence.answer, '4821');
    assert.ok(modelContext.memory_retrieval, 'the model context must include a retrieval receipt');
    assert.equal(modelContext.memory_retrieval.strategy, 'LEXICAL_OVERLAP_PLUS_RECENT_USER_STATEMENTS_AND_LATEST_STATE');
    assert.ok(modelContext.memory_retrieval.source_entry_count >= 151);
    assert.ok(modelContext.memory_retrieval.selected_entry_count <= 30);
    assert.ok(modelContext.memory_retrieval.selected_entry_ids.includes(oldFact.entry_id));
    assert.ok((modelContext.universe_context_entries || []).length <= 30);
  } finally {
    if (previousEnabled === undefined) delete process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED;
    else process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED = previousEnabled;
    if (previousKey === undefined) delete process.env.REALITY_UNIVERSE_PERSISTENCE_KEY;
    else process.env.REALITY_UNIVERSE_PERSISTENCE_KEY = previousKey;
  }
});
