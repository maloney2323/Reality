import test from 'node:test';
import assert from 'node:assert/strict';
import { startContinuityRuntime } from '../src/reality-continuity-spine-runtime-v0.1.js';
import { validateContinuityChain } from '../src/reality-continuity-spine-v2.0.js';
import { buildGovernedChatSignal } from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';

function signal(message, observedAt = '2026-10-09T00:00:00.000Z') {
  return buildGovernedChatSignal({ message, observedAt });
}

function makeDb({ failPost = false, failRead = false, failPostNumber = null } = {}) {
  const rows = [];
  let sequence = 0;
  let postCount = 0;
  const fetchImpl = async (input, init = {}) => {
    const url = new URL(String(input));
    const method = init.method || 'GET';
    if (failRead && method === 'GET' && url.pathname.endsWith('/universe_events')) {
      return new Response('read unavailable', { status: 503 });
    }
    if (method === 'POST' && url.pathname.endsWith('/rpc/append_universe_event')) {
      postCount += 1;
      if (failPost || postCount === failPostNumber) return new Response('write unavailable', { status: 503 });
      const { p_record: record } = JSON.parse(init.body);
      const tail = rows.filter((row) => row.continuity_root_id === record.continuity_root_id && row.worldline_id === record.worldline_id)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
      if ((record.parent_event_id || null) !== (tail?.event_id || null)) return new Response('CONTINUITY_APPEND_NOT_TAIL', { status: 409 });
      const priorHash = record.provenance?.continuity_spine?.prior_lineage_hash || null;
      if (priorHash !== (tail?.lineage_hash || null)) return new Response('CONTINUITY_PRIOR_LINEAGE_HASH_MISMATCH', { status: 409 });
      sequence += 1;
      rows.push({ ...record, created_at: new Date(Date.now() + sequence).toISOString() });
      return new Response(JSON.stringify({ ...rows[rows.length - 1], status: 'PERSISTED' }), { status: 200 });
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
  assert.equal(first.nodes[1].payload.transformation_receipt.receipt_id, first.nodes[1].transformation_receipt_id);
  assert.equal(first.nodes[1].payload.transformation_receipt.fragment_count, first.nodes[1].payload.fragment_count);
  assert.equal(first.nodes[2].payload.fragment_manifest.length, first.nodes[2].payload.fragment_count);
  assert.equal(first.nodes[2].payload.fragment_manifest[0].fragment_id, first.nodes[2].payload.fragment_ids[0]);

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
  const normalizedRows = db.rows.map((row) => ({
    ...row,
    prior_lineage_hash: row.provenance?.continuity_spine?.prior_lineage_hash || null,
  }));
  assert.equal(validateContinuityChain(normalizedRows).valid, true);
});

test('resumes a partially persisted workflow without duplicating earlier stages', async (t) => {
  setPersistenceEnv(t);
  const db = makeDb({ failPostNumber: 3 });
  const originalObservedAt = '2026-10-09T10:00:00.000Z';
  const originalSignal = signal('resume this exact work', originalObservedAt);

  await assert.rejects(
    () => startContinuityRuntime({
      continuityRootSource: 'continuity-resume-root',
      subjectId: 'resume-work',
      signal: originalSignal,
      observedAt: originalObservedAt,
      workflowRunId: 'stable-resume-run',
      fetchImpl: db.fetchImpl,
    }),
    (error) => error.code === 'CONTINUITY_PERSISTENCE_REQUIRED',
  );
  assert.deepEqual(db.rows.map((row) => row.event_kind), ['RAW_SIGNAL', 'TRANSFORMATION']);

  // Retry with the same request body but a newly constructed packet timestamp.
  // The durable run identity restores the original packet timestamp/identity.
  const retryObservedAt = '2026-10-09T10:05:00.000Z';
  const retrySignal = signal('resume this exact work', retryObservedAt);
  const resumed = await startContinuityRuntime({
    continuityRootSource: 'continuity-resume-root',
    subjectId: 'resume-work',
    signal: retrySignal,
    observedAt: retryObservedAt,
    workflowRunId: 'stable-resume-run',
    fetchImpl: db.fetchImpl,
  });

  assert.equal(resumed.status, 'PERSISTED');
  assert.equal(resumed.nodes.length, 3);
  assert.deepEqual(db.rows.map((row) => row.event_kind), ['RAW_SIGNAL', 'TRANSFORMATION', 'OBSERVATION']);
  assert.equal(new Set(db.rows.map((row) => row.event_id)).size, 3);
  assert.equal(db.rows[0].payload.packet_id, originalSignal.packet.packet_id);
  assert.equal(db.rows[2].payload.packet_id, originalSignal.packet.packet_id);
  assert.equal(db.rows[1].payload.transformation_receipt.receipt_id, originalSignal.transformation_receipt.receipt_id);
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

test('rejects a tampered signal before writing any continuity event', async (t) => {
  setPersistenceEnv(t);
  const db = makeDb();
  const badSignal = structuredClone(signal('tamper-me'));
  badSignal.fragments[0].cleaned_text = 'Forged cleaned content';
  await assert.rejects(
    () => startContinuityRuntime({
      continuityRootSource: 'tampered-signal-root',
      subjectId: 'subject-tampered-signal',
      signal: badSignal,
      fetchImpl: db.fetchImpl,
    }),
    (error) => error.code === 'CONTINUITY_SIGNAL_INTEGRITY_FAILED'
      && error.message.includes('FRAGMENT_CLEANED_DIGEST_MISMATCH'),
  );
  assert.equal(db.rows.length, 0);
});

test('fails closed when persisted event content no longer matches its lineage hash', async (t) => {
  setPersistenceEnv(t);
  const db = makeDb();
  await startContinuityRuntime({
    continuityRootSource: 'tampered-persisted-payload-root',
    subjectId: 'subject-payload-original',
    signal: signal('original content'),
    workflowRunId: 'run-payload-original',
    fetchImpl: db.fetchImpl,
  });
  db.rows[1].payload.receipt_id = 'receipt:forged-after-write';

  await assert.rejects(
    () => startContinuityRuntime({
      continuityRootSource: 'tampered-persisted-payload-root',
      subjectId: 'subject-payload-recovery',
      signal: signal('new content'),
      workflowRunId: 'run-payload-recovery',
      fetchImpl: db.fetchImpl,
    }),
    (error) => error.code === 'CONTINUITY_HISTORY_INVALID'
      && error.details.broken_links.some((item) => item.reason === 'LINEAGE_HASH_CONTENT_MISMATCH'),
  );
  assert.equal(db.rows.length, 3, 'tampered history must block before any new append');
});

test('records a governed business-work proposal but blocks execution without granted authority', async (t) => {
  setPersistenceEnv(t);
  const db = makeDb();
  const runtime = await startContinuityRuntime({
    continuityRootSource: 'controlled-business-workflow',
    worldlineSource: 'reality:business-test',
    subjectId: 'customer-follow-up-work',
    signal: signal('customer follow-up request'),
    observedAt: new Date(Date.now() - 10000).toISOString(),
    workflowRunId: 'customer-follow-up-run',
    fetchImpl: db.fetchImpl,
  });
  const packetId = runtime.nodes[0].payload.packet_id;
  const receiptId = runtime.nodes[1].payload.receipt_id;

  const situation = await runtime.appendStage({
    stage: 'SITUATION',
    entityId: 'situation:customer-follow-up',
    evidenceRefs: [packetId, receiptId],
    transformationReceiptId: receiptId,
    epistemicStatus: 'PARTIALLY_VERIFIED',
    payload: { situation_id: 'situation:customer-follow-up', missing_evidence: ['customer response not observed'] },
  });
  const work = await runtime.appendStage({
    stage: 'WORK',
    entityId: 'work:customer-follow-up',
    evidenceRefs: [packetId],
    transformationReceiptId: receiptId,
    epistemicStatus: 'PROPOSED',
    payload: { work_item_id: 'work:customer-follow-up', operation: 'draft_follow_up', consequential: true },
  });
  const authority = await runtime.appendStage({
    stage: 'AUTHORITY',
    entityId: 'authority:customer-follow-up',
    evidenceRefs: ['work:customer-follow-up'],
    epistemicStatus: 'PROPOSED',
    payload: {
      authorization_status: 'REQUESTED',
      granted: false,
      authorization_ref: 'authorization-request:customer-follow-up',
    },
  });

  assert.equal(situation.event_kind, 'SITUATION');
  assert.equal(work.event_kind, 'WORK');
  assert.equal(authority.event_kind, 'AUTHORITY');
  assert.equal(authority.payload.authorization_status, 'REQUESTED');
  assert.equal(authority.payload.granted, false);
  assert.equal(db.rows.length, 6);
  await assert.rejects(
    () => runtime.appendStage({
      stage: 'EXECUTION',
      entityId: 'execution:customer-follow-up',
      evidenceRefs: ['work:customer-follow-up'],
      payload: { authorization_ref: 'authorization-request:customer-follow-up' },
    }),
    (error) => error.code === 'CONTINUITY_STAGE_BLOCKED' && error.message.includes('AUTHORITY_NOT_GRANTED'),
  );
  assert.equal(db.rows.length, 6);
  assert.equal(runtime.nodes.length, 3, 'returned initial nodes are a stable snapshot, not the live mutable history');
});
