import {
  createContinuitySpine,
  appendContinuityNode,
  advanceSpine,
} from './reality-continuity-spine-v2.0.js';
import { createUniversePostgresPersistence } from './reality-universe-postgres-persistence-v0.1.js';

export const REALITY_CONTINUITY_RUNTIME_VERSION = 'reality-continuity-runtime-v0.1';

function enabled() {
  return process.env.REALITY_CONTINUITY_SPINE_ENABLED === 'true';
}

export async function startContinuityRuntime({
  continuityRootSource,
  worldlineSource = 'reality:primary',
  subjectId,
  signal,
  observedAt = new Date().toISOString(),
  fetchImpl = fetch,
} = {}) {
  if (!continuityRootSource || !subjectId || !signal?.packet?.packet_id) {
    return Object.freeze({ status: 'NO_CONTINUITY_ROOT', enabled: false, nodes: [] });
  }

  let spine = createContinuitySpine({
    continuityRootId: continuityRootSource,
    worldlineId: worldlineSource,
    subjectId,
  });
  const persistenceEnabled = enabled();
  const persistence = persistenceEnabled ? createUniversePostgresPersistence({ fetchImpl }) : null;
  const nodes = [];

  async function appendStage({
    stage,
    entityId,
    eventId = null,
    evidenceRefs = [],
    transformationReceiptId = null,
    epistemicStatus = 'OBSERVED',
    payload = {},
    provenance = {},
    effectiveTime = observedAt,
    assertionTime = observedAt,
  } = {}) {
    const node = appendContinuityNode({
      spine,
      stage,
      entityId,
      eventId,
      parentEventId: spine.last_event_id || null,
      evidenceRefs,
      transformationReceiptId,
      effectiveTime,
      assertionTime,
      epistemicStatus,
      payload,
      priorLineageHash: spine.last_lineage_hash || null,
      provenance: {
        ...provenance,
        continuity_runtime_version: REALITY_CONTINUITY_RUNTIME_VERSION,
      },
    });

    let committed = node;
    if (persistence) {
      try {
        committed = await persistence.appendEvent(node);
      } catch (error) {
        const failure = new Error('CONTINUITY_PERSISTENCE_REQUIRED:' + (error?.message || error?.code || 'UNKNOWN'));
        failure.code = 'CONTINUITY_PERSISTENCE_REQUIRED';
        failure.cause = error;
        throw failure;
      }
    }

    spine = advanceSpine(spine, committed);
    nodes.push(committed);
    return committed;
  }

  await appendStage({
    stage: 'RAW_SIGNAL',
    entityId: signal.packet.packet_id,
    eventId: `raw:${signal.packet.packet_id}`,
    payload: {
      packet_id: signal.packet.packet_id,
      source: signal.packet.source,
      observed_at: signal.packet.observed_at,
      raw_content_digest: signal.packet.raw_content_digest,
    },
    provenance: { source: 'reality_governed_raw_signal' },
  });

  await appendStage({
    stage: 'TRANSFORMATION',
    entityId: signal.transformation_receipt.receipt_id,
    eventId: `transform:${signal.transformation_receipt.receipt_id}`,
    evidenceRefs: [signal.packet.packet_id],
    transformationReceiptId: signal.transformation_receipt.receipt_id,
    payload: {
      receipt_id: signal.transformation_receipt.receipt_id,
      input_digest: signal.transformation_receipt.input_digest,
      output_digest: signal.transformation_receipt.output_digest,
      cleaner_version: signal.transformation_receipt.cleaner_version,
      fragment_count: signal.transformation_receipt.fragment_count,
      meaning_change_claimed: signal.transformation_receipt.meaning_change_claimed === true,
    },
    provenance: { source: 'reality_governed_signal_cleaner' },
  });

  await appendStage({
    stage: 'OBSERVATION',
    entityId: signal.packet.packet_id + ':observation',
    eventId: `observation:${signal.packet.packet_id}`,
    evidenceRefs: signal.fragments.map((fragment) => fragment.fragment_id),
    transformationReceiptId: signal.transformation_receipt.receipt_id,
    payload: {
      packet_id: signal.packet.packet_id,
      fragment_ids: signal.fragments.map((fragment) => fragment.fragment_id),
      fragment_count: signal.fragments.length,
    },
    provenance: { source: 'reality_live_intelligence_orchestration' },
  });

  return Object.freeze({
    status: persistenceEnabled ? 'PERSISTED' : 'IN_MEMORY_ONLY',
    enabled: persistenceEnabled,
    spine,
    nodes: Object.freeze(nodes),
    appendStage,
  });
}
