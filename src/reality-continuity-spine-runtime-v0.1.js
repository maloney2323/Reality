import {
  createContinuitySpine,
  appendContinuityNode,
  advanceSpine,
  validateContinuityChain,
} from './reality-continuity-spine-v2.0.js';
import { evaluateContinuityStageGate } from './reality-continuity-stage-gate-v1.0.js';
import { createUniversePostgresPersistence } from './reality-universe-postgres-persistence-v0.1.js';
import { verifyGovernedSignal } from './reality-governed-fragmented-signal-cleaner-v0.1.js';

export const REALITY_CONTINUITY_RUNTIME_VERSION = 'reality-continuity-runtime-v0.2';

function enabled() {
  return process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED === 'true'
    || process.env.REALITY_CONTINUITY_SPINE_ENABLED === 'true';
}

function normalizePersistedNode(row) {
  return {
    ...row,
    prior_lineage_hash: row?.prior_lineage_hash
      || row?.provenance?.continuity_spine?.prior_lineage_hash
      || null,
  };
}

function workflowIdOf(node) {
  return node?.payload?.workflow_run_id || node?.workflow_run_id || null;
}

export async function startContinuityRuntime({
  continuityRootSource,
  worldlineSource = 'reality:primary',
  subjectId,
  signal,
  observedAt = new Date().toISOString(),
  workflowRunId,
  fetchImpl = fetch,
} = {}) {
  if (!continuityRootSource || !subjectId || !signal?.packet?.packet_id) {
    return Object.freeze({ status: 'NO_CONTINUITY_ROOT', enabled: false, nodes: [] });
  }

  const signalIntegrity = verifyGovernedSignal(signal);
  if (!signalIntegrity.valid) {
    const failure = new Error('CONTINUITY_SIGNAL_INTEGRITY_FAILED:' + signalIntegrity.reasons.join(','));
    failure.code = 'CONTINUITY_SIGNAL_INTEGRITY_FAILED';
    failure.details = signalIntegrity;
    throw failure;
  }

  const runId = String(workflowRunId || `${signal.packet.packet_id}:${observedAt}`);
  let spine = createContinuitySpine({
    continuityRootId: continuityRootSource,
    worldlineId: worldlineSource,
    subjectId,
  });
  const persistenceEnabled = enabled();
  const persistence = persistenceEnabled ? createUniversePostgresPersistence({ fetchImpl }) : null;
  let globalNodes = [];
  let workflowNodes = [];

  if (persistence) {
    let reconstructed;
    try {
      reconstructed = await persistence.reconstruct({
        continuityRootId: spine.continuity_root_id,
        worldlineId: spine.worldline_id,
      });
    } catch (error) {
      const failure = new Error('CONTINUITY_REHYDRATION_REQUIRED:' + (error?.message || error?.code || 'UNKNOWN'));
      failure.code = 'CONTINUITY_REHYDRATION_REQUIRED';
      failure.cause = error;
      throw failure;
    }
    globalNodes = (Array.isArray(reconstructed) ? reconstructed : []).map(normalizePersistedNode);
    const chain = validateContinuityChain(globalNodes);
    if (!chain.valid) {
      const failure = new Error('CONTINUITY_HISTORY_INVALID');
      failure.code = 'CONTINUITY_HISTORY_INVALID';
      failure.details = chain;
      throw failure;
    }
    workflowNodes = globalNodes.filter((node) => workflowIdOf(node) === runId);
    const tail = globalNodes[globalNodes.length - 1] || null;
    if (tail) {
      spine = Object.freeze({
        ...spine,
        last_event_id: tail.event_id,
        last_lineage_hash: tail.lineage_hash,
        current_stage: tail.event_kind,
      });
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
    const parentEventId = spine.last_event_id || null;
    const priorLineageHash = spine.last_lineage_hash || null;
    const stagePayload = { ...payload, workflow_run_id: runId };
    const candidate = {
      event_kind: stage,
      workflow_run_id: runId,
      parent_event_id: parentEventId,
      prior_lineage_hash: priorLineageHash,
      evidence_refs: evidenceRefs,
      transformation_receipt_id: transformationReceiptId,
      payload: stagePayload,
    };
    const gate = evaluateContinuityStageGate({
      stage,
      workflowHistory: workflowNodes,
      globalTail: globalNodes[globalNodes.length - 1] || null,
      candidate,
      persistenceStatus: persistenceEnabled ? 'DURABLE_READY' : 'IN_MEMORY_ONLY',
    });
    if (!gate.allowed) {
      const failure = new Error('CONTINUITY_STAGE_BLOCKED:' + gate.reasons.join(','));
      failure.code = 'CONTINUITY_STAGE_BLOCKED';
      failure.details = gate;
      throw failure;
    }

    const node = appendContinuityNode({
      spine,
      stage,
      entityId,
      eventId: `${eventId || `${stage}:${entityId}`}:workflow:${runId}`,
      parentEventId,
      evidenceRefs,
      transformationReceiptId,
      effectiveTime,
      assertionTime,
      epistemicStatus,
      payload: stagePayload,
      priorLineageHash,
      provenance: {
        ...provenance,
        workflow_run_id: runId,
        continuity_runtime_version: REALITY_CONTINUITY_RUNTIME_VERSION,
      },
    });

    let committed = node;
    if (persistence) {
      try {
        committed = await persistence.appendEvent(node);
        if (!committed || !['PERSISTED', 'DUPLICATE_IDENTICAL'].includes(committed.status)) {
          throw new Error('CONTINUITY_PERSISTENCE_COMMIT_UNCONFIRMED');
        }
      } catch (error) {
        const failure = new Error('CONTINUITY_PERSISTENCE_REQUIRED:' + (error?.message || error?.code || 'UNKNOWN'));
        failure.code = 'CONTINUITY_PERSISTENCE_REQUIRED';
        failure.cause = error;
        throw failure;
      }
    }

    spine = advanceSpine(spine, committed);
    globalNodes.push(committed);
    workflowNodes.push(committed);
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
    workflow_run_id: runId,
    rehydrated_event_count: globalNodes.length - workflowNodes.length,
    global_tail_event_id: spine.last_event_id || null,
    spine,
    nodes: Object.freeze([...workflowNodes]),
    appendStage,
  });
}
