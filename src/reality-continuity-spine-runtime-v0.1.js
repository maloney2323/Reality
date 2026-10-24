import {
  createContinuitySpine,
  appendContinuityNode,
  advanceSpine,
} from './reality-continuity-spine-v2.0.js';
import { createUniversePostgresPersistence } from './reality-universe-postgres-persistence-v0.1.js';
import { orderContinuityHistory } from './reality-continuous-reliability-v0.1.js';
import { resolveReliabilityBenchmarkDb } from './reality-reliability-db-boundary-v0.1.js';

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
  previewProofPersistence = null,
} = {}) {
  if (!continuityRootSource || !subjectId || !signal?.packet?.packet_id) {
    return Object.freeze({ status: 'NO_CONTINUITY_ROOT', enabled: false, nodes: [] });
  }

  let spine = createContinuitySpine({
    continuityRootId: continuityRootSource,
    worldlineId: worldlineSource,
    subjectId,
  });
  if (previewProofPersistence && (
    process.env.VERCEL_ENV !== 'preview' ||
    process.env.VERCEL_GIT_COMMIT_REF !== 'feature/reality-drift-live-continuity-v1-20261024' ||
    typeof previewProofPersistence.appendEvent !== 'function' ||
    typeof previewProofPersistence.reconstruct !== 'function')) {
    throw new Error('RELIABILITY_PREVIEW_PROOF_PERSISTENCE_FORBIDDEN');
  }
  const persistenceEnabled = enabled() || Boolean(previewProofPersistence);
  const isolated = resolveReliabilityBenchmarkDb();
  const persistence = previewProofPersistence || (persistenceEnabled ? createUniversePostgresPersistence({
    fetchImpl, ...(isolated||{}),
  }) : null);
  const nodes = [];
  // Share the same integrity verifier with the historical backcheck.
  let priorEventCount = 0;
  if (persistence) {
    try {
      const history = await persistence.reconstruct({
        continuityRootId: spine.continuity_root_id,
        worldlineId: spine.worldline_id,
      });
      const ordered = orderContinuityHistory(history);
      priorEventCount = ordered.length;
      const tail = ordered.at(-1);
      if (tail) {
        spine = Object.freeze({
          ...spine, last_event_id: tail.event_id,
          last_lineage_hash: tail.lineage_hash,
          current_stage: tail.event_kind,
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
    eventId: `root:${spine.continuity_root_id}:world:${spine.worldline_id}:raw:${signal.packet.packet_id}`,
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
    eventId: `root:${spine.continuity_root_id}:world:${spine.worldline_id}:transform:${signal.transformation_receipt.receipt_id}`,
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
    eventId: `root:${spine.continuity_root_id}:world:${spine.worldline_id}:observation:${signal.packet.packet_id}`,
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
    // The runtime advances after its initial three stages; expose the live tail.
    get spine() { return spine; },
    get nodes() { return Object.freeze(nodes.slice()); },
    prior_event_count: priorEventCount,
    readback: persistence ? async () => persistence.reconstruct({continuityRootId:spine.continuity_root_id,worldlineId:spine.worldline_id}) : null,
    appendStage,
  });
}
