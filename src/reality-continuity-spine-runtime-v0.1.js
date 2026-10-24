import {
  createContinuitySpine,
  appendContinuityNode,
  advanceSpine,
} from './reality-continuity-spine-v2.0.js';
import { createUniversePostgresPersistence } from './reality-universe-postgres-persistence-v0.1.js';

export const REALITY_CONTINUITY_RUNTIME_VERSION = 'reality-continuity-runtime-v0.1';

function enabled() {
  return process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED === 'true';
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

  // A new HTTP request is not a new continuity chain. Reconstruct the
  // authoritative tail before computing any new event's parent and hash.
  // Validate by parent references, never by timestamps: several events in a
  // single turn share assertion_time and may sort in arbitrary UUID order.
  let priorEventCount = 0;
  if (persistence) {
    try {
      const history = await persistence.reconstruct({
        continuityRootId: spine.continuity_root_id,
        worldlineId: spine.worldline_id,
      });
      if (!Array.isArray(history)) throw new Error('CONTINUITY_HISTORY_NOT_ARRAY');
      priorEventCount = history.length;
      if (history.length) {
        const byId = new Map();
        const parents = new Set();
        for (const event of history) {
          if (!event?.event_id || !event.lineage_hash ||
              event.continuity_root_id !== spine.continuity_root_id ||
              event.worldline_id !== spine.worldline_id ||
              byId.has(event.event_id)) throw new Error('CONTINUITY_HISTORY_INVALID');
          byId.set(event.event_id, event);
          if (event.parent_event_id) parents.add(event.parent_event_id);
        }
        const tips = history.filter(e => !parents.has(e.event_id));
        if (tips.length !== 1) throw new Error('CONTINUITY_HISTORY_FORKED');
        let cursor = tips[0];
        const visited = new Set();
        while (cursor) {
          if (visited.has(cursor.event_id)) throw new Error('CONTINUITY_HISTORY_CYCLE');
          visited.add(cursor.event_id);
          const parent = cursor.parent_event_id ? byId.get(cursor.parent_event_id) : null;
          if (cursor.parent_event_id && !parent) throw new Error('CONTINUITY_HISTORY_PARENT_MISSING');
          const priorHash = cursor.provenance?.continuity_spine?.prior_lineage_hash ?? null;
          if (parent && priorHash !== parent.lineage_hash) throw new Error('CONTINUITY_HISTORY_HASH_LINK_INVALID');
          if (!parent && priorHash) throw new Error('CONTINUITY_HISTORY_ORPHAN_HASH');
          cursor = parent;
        }
        if (visited.size !== history.length) throw new Error('CONTINUITY_HISTORY_DISCONNECTED');
        spine = Object.freeze({
          ...spine,
          last_event_id: tips[0].event_id,
          last_lineage_hash: tips[0].lineage_hash,
          current_stage: tips[0].event_kind,
        });
      }
    } catch (error) {
      const failure = new Error('CONTINUITY_REHYDRATION_FAILED:' + (error?.message || 'UNKNOWN'));
      failure.code = 'CONTINUITY_REHYDRATION_FAILED';
      failure.cause = error;
      throw failure;
    }
  }

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
    prior_event_count: priorEventCount,
    readback: persistence ? async () => persistence.reconstruct({continuityRootId:spine.continuity_root_id,worldlineId:spine.worldline_id}) : null,
    appendStage,
  });
}
