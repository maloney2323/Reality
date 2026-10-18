import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveServerContinuityScope } from '../src/reality-continuity-scope-v1.0.js';
import { retrievePersistedUniverse } from '../src/reality-native-universe-persistence-v1.0.js';
import { runLiveIntelligenceOrchestration } from '../src/reality-live-intelligence-orchestration-v0.1.js';
import { createSessionPrincipal, getOrCreateSessionPrincipal } from '../src/reality-session-principal-v0.1.js';

test('server continuity scope separates users and conversations and requires both identifiers', () => {
  const a = deriveServerContinuityScope({ principalId: 'user-a', conversationId: 'conversation-1' });
  const same = deriveServerContinuityScope({ principalId: 'user-a', conversationId: 'conversation-1' });
  const otherConversation = deriveServerContinuityScope({ principalId: 'user-a', conversationId: 'conversation-2' });
  const otherUser = deriveServerContinuityScope({ principalId: 'user-b', conversationId: 'conversation-1' });

  assert.deepEqual(a, same, 'same verified principal and conversation should re-derive the same scope');
  assert.notEqual(a.continuity_root_id, otherConversation.continuity_root_id);
  assert.notEqual(a.continuity_root_id, otherUser.continuity_root_id);
  assert.notEqual(a.worldline_id, otherUser.worldline_id);
  assert.equal(a.worldline_id, otherConversation.worldline_id);
  assert.throws(() => deriveServerContinuityScope({ principalId: '', conversationId: 'conversation-1' }), /CONTINUITY_PRINCIPAL_REQUIRED/);
  assert.throws(() => deriveServerContinuityScope({ principalId: 'user-a', conversationId: '' }), /CONTINUITY_CONVERSATION_REQUIRED/);
});

test('session principal remains stable when its cookie is not the first cookie', () => {
  const previousKey = process.env.REALITY_CHAT_RECEIPT_HMAC_KEY;
  process.env.REALITY_CHAT_RECEIPT_HMAC_KEY = 'scope-test-hmac-key';
  try {
    const token = createSessionPrincipal({ principalId: 'stable-principal' });
    const headers = [];
    const req = { headers: { cookie: 'theme=dark; reality_principal=' + encodeURIComponent(token) } };
    const res = { setHeader: (...args) => headers.push(args) };
    const principal = getOrCreateSessionPrincipal(req, res);
    assert.equal(principal.principal_id, 'stable-principal');
    assert.equal(headers.length, 0, 'a valid existing principal cookie must not be replaced');
  } finally {
    if (previousKey === undefined) delete process.env.REALITY_CHAT_RECEIPT_HMAC_KEY;
    else process.env.REALITY_CHAT_RECEIPT_HMAC_KEY = previousKey;
  }
});

test('persisted universe retrieval refuses an absent continuity root before any database request', async () => {
  let calls = 0;
  await assert.rejects(
    () => retrievePersistedUniverse({ fetchImpl: async () => { calls += 1; throw new Error('should not be called'); } }),
    /CONTINUITY_SCOPE_REQUIRED/,
  );
  assert.equal(calls, 0);
});

test('durable user statements remain isolated to their conversation root during retrieval and cognition', async () => {
  const previousEnabled = process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED;
  const previousKey = process.env.REALITY_UNIVERSE_PERSISTENCE_KEY;
  process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED = 'true';
  process.env.REALITY_UNIVERSE_PERSISTENCE_KEY = 'test-key';

  const scopeA = deriveServerContinuityScope({ principalId: 'isolation-user', conversationId: 'conversation-a' });
  const scopeB = deriveServerContinuityScope({ principalId: 'isolation-user', conversationId: 'conversation-b' });
  const store = [];
  const modelContexts = [];
  const retrievalRoots = [];
  const unscopedReads = [];

  const fetchImpl = async (url, options = {}) => {
    if (url === 'https://api.openai.com/v1/responses') {
      const request = JSON.parse(options.body);
      const modelInput = JSON.parse(request.input[1].content[0].text);
      modelContexts.push(modelInput.system_context);
      const hasAlpha = (modelInput.system_context?.universe_context_entries || []).some((entry) =>
        entry.event_kind === 'USER_STATEMENT' && entry.payload?.statement === 'Private code is ALPHA-714.',
      );
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: 'resp:scope-isolation',
          status: 'completed',
          output_text: hasAlpha ? 'ALPHA-714' : 'UNKNOWN',
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
      if (!rootFilter?.startsWith('eq.')) {
        unscopedReads.push(url);
        return { ok: true, status: 200, json: async () => store.slice() };
      }
      const root = rootFilter.slice(3);
      retrievalRoots.push(root);
      return { ok: true, status: 200, json: async () => store.filter((entry) => entry.continuity_root_id === root) };
    }
    if (options.method === 'POST') {
      const entry = JSON.parse(options.body);
      store.push(entry);
      return { ok: true, status: 201, json: async () => [entry] };
    }
    throw new Error('UNEXPECTED_METHOD:' + options.method);
  };

  try {
    await runLiveIntelligenceOrchestration({
      message: 'Private code is ALPHA-714.',
      systemContext: { continuity_root_id: scopeA.continuity_root_id, worldline_id: scopeA.worldline_id },
      apiKey: 'test-openai-key',
      fetchImpl,
    });

    const recallA = await runLiveIntelligenceOrchestration({
      message: 'What is the private code?',
      systemContext: { continuity_root_id: scopeA.continuity_root_id, worldline_id: scopeA.worldline_id },
      apiKey: 'test-openai-key',
      fetchImpl,
    });
    assert.equal(recallA.intelligence.answer, 'ALPHA-714', 'the owning conversation should recover its own statement');

    const recallB = await runLiveIntelligenceOrchestration({
      message: 'What is the private code?',
      systemContext: { continuity_root_id: scopeB.continuity_root_id, worldline_id: scopeB.worldline_id },
      apiKey: 'test-openai-key',
      fetchImpl,
    });
    assert.equal(recallB.intelligence.answer, 'UNKNOWN', 'a different conversation must not receive the private statement');

    const contextB = modelContexts[2]?.universe_context_entries || [];
    assert.equal(contextB.some((entry) => entry.event_kind === 'USER_STATEMENT' && entry.payload?.statement === 'Private code is ALPHA-714.'), false);
    assert.deepEqual(unscopedReads, [], 'the durable retrieval path must never issue an unscoped read');
    assert.ok(retrievalRoots.includes(scopeA.continuity_root_id));
    assert.ok(retrievalRoots.includes(scopeB.continuity_root_id));
    assert.ok(store.filter((entry) => entry.event_kind === 'USER_STATEMENT').every((entry) =>
      entry.continuity_root_id === scopeA.continuity_root_id || entry.continuity_root_id === scopeB.continuity_root_id,
    ));
  } finally {
    if (previousEnabled === undefined) delete process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED;
    else process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED = previousEnabled;
    if (previousKey === undefined) delete process.env.REALITY_UNIVERSE_PERSISTENCE_KEY;
    else process.env.REALITY_UNIVERSE_PERSISTENCE_KEY = previousKey;
  }
});
