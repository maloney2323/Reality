import {
  createContinuitySpine,
  appendContinuityNode,
  advanceSpine,
  validateContinuityChain,
  SPINE_STAGES,
} from './reality-continuity-spine-v2.0.js';
import { evaluateContinuityStageGate } from './reality-continuity-stage-gate-v1.0.js';
import { createUniversePostgresPersistence } from './reality-universe-postgres-persistence-v0.1.js';
import { buildGovernedChatSignal, verifyGovernedSignal } from './reality-governed-fragmented-signal-cleaner-v0.1.js';

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
    transformation_receipt_id: row?.transformation_receipt_id
      || row?.provenance?.continuity_spine?.transformation_receipt_id
      || null,
  };
}

function workflowIdOf(node) {
  return node?.payload?.workflow_run_id || node?.workflow_run_id || null;
}

function stableJson(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stableJson);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableJson(value[key])]));
}

function sameJson(left, right) {
  return JSON.stringify(stableJson(left)) === JSON.stringify(stableJson(right));
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
  let signalForRun = signal;
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
      if (String(error?.message || error?.code || '').startsWith('CONTINUITY_HISTORY_')) {
        const failure = new Error('CONTINUITY_HISTORY_INVALID:' + (error?.message || error?.code));
        failure.code = 'CONTINUITY_HISTORY_INVALID';
        failure.cause = error;
        throw failure;
      }
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

    if (workflowNodes.length) {
      // Resume only an intact prefix of the same workflow. A reused workflow ID
      // with different input or a skipped/reordered stage is a hard collision,
      // never an excuse to create a second RAW_SIGNAL and fork the workflow.
      if (workflowNodes.length > SPINE_STAGES.length) {
        const failure = new Error('CONTINUITY_HISTORY_INVALID:WORKFLOW_STAGE_COUNT_EXCEEDED');
        failure.code = 'CONTINUITY_HISTORY_INVALID';
        throw failure;
      }
      for (let index = 0; index < workflowNodes.length; index += 1) {
        if (workflowNodes[index].event_kind !== SPINE_STAGES[index]) {
          const failure = new Error('CONTINUITY_HISTORY_INVALID:WORKFLOW_STAGE_SEQUENCE_INVALID');
          failure.code = 'CONTINUITY_HISTORY_INVALID';
          failure.details = { index, expected: SPINE_STAGES[index], actual: workflowNodes[index].event_kind };
          throw failure;
        }
      }

      const rawNode = workflowNodes[0];
      if (rawNode?.payload?.raw_content_digest !== signal.packet.raw_content_digest
          || rawNode?.payload?.source !== signal.packet.source) {
        const failure = new Error('CONTINUITY_WORKFLOW_SIGNAL_MISMATCH');
        failure.code = 'CONTINUITY_WORKFLOW_SIGNAL_MISMATCH';
        throw failure;
      }

      if (rawNode?.payload?.packet_id !== signal.packet.packet_id) {
        signalForRun = buildGovernedChatSignal({
          message: signal.packet.raw_content,
          observedAt: rawNode?.payload?.observed_at,
        });
      }
      const restoredIntegrity = verifyGovernedSignal(signalForRun);
      if (!restoredIntegrity.valid || signalForRun.packet.packet_id !== rawNode?.payload?.packet_id) {
        const failure = new Error('CONTINUITY_WORKFLOW_SIGNAL_MISMATCH');
        failure.code = 'CONTINUITY_WORKFLOW_SIGNAL_MISMATCH';
        failure.details = restoredIntegrity;
        throw failure;
      }

      if (workflowNodes.length >= 2) {
        const transformNode = workflowNodes[1];
        const receipt = signalForRun.transformation_receipt;
        const persistedReceipt = transformNode?.payload?.transformation_receipt;
        const receiptMatches = transformNode?.transformation_receipt_id === receipt.receipt_id
          && transformNode?.payload?.receipt_id === receipt.receipt_id
          && transformNode?.payload?.input_digest === receipt.input_digest
          && transformNode?.payload?.output_digest === receipt.output_digest
          && transformNode?.payload?.cleaner_version === receipt.cleaner_version
          && transformNode?.payload?.fragment_count === receipt.fragment_count
          && persistedReceipt?.receipt_id === receipt.receipt_id
          && sameJson(persistedReceipt?.transformations, receipt.transformations);
        if (!receiptMatches) {
          const failure = new Error('CONTINUITY_WORKFLOW_RECEIPT_MISMATCH');
          failure.code = 'CONTINUITY_WORKFLOW_RECEIPT_MISMATCH';
          throw failure;
        }
        if (persistedReceipt.created_at) {
          signalForRun = Object.freeze({
            ...signalForRun,
            transformation_receipt: Object.freeze({
              ...receipt,
              created_at: persistedReceipt.created_at,
            }),
          });
        }
      }

      if (workflowNodes.length >= 3) {
        const observation = workflowNodes[2]?.payload || {};
        const expectedFragments = signalForRun.fragments.map((fragment) => fragment.fragment_id);
        const actualFragments = observation.fragment_ids || [];
        const expectedManifest = signalForRun.fragments.map((fragment) => ({
          fragment_id: fragment.fragment_id,
          ordinal: fragment.ordinal,
          raw_text_digest: fragment.raw_text_digest,
          cleaned_text_digest: fragment.cleaned_text_digest,
          transformation: fragment.transformation,
          epistemic_status: fragment.epistemic_status,
        }));
        if (observation.packet_id !== signalForRun.packet.packet_id
            || !sameJson(actualFragments, expectedFragments)
            || !sameJson(observation.fragment_manifest || [], expectedManifest)) {
          const failure = new Error('CONTINUITY_WORKFLOW_OBSERVATION_MISMATCH');
          failure.code = 'CONTINUITY_WORKFLOW_OBSERVATION_MISMATCH';
          throw failure;
        }
      }
    }

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

  if (workflowNodes.length === 0) {
    await appendStage({
      stage: 'RAW_SIGNAL',
      entityId: signalForRun.packet.packet_id,
      eventId: `raw:${signalForRun.packet.packet_id}`,
      payload: {
        packet_id: signalForRun.packet.packet_id,
        packet_version: signalForRun.packet.packet_version,
        source: signalForRun.packet.source,
        observed_at: signalForRun.packet.observed_at,
        raw_content_digest: signalForRun.packet.raw_content_digest,
      },
      provenance: { source: 'reality_governed_raw_signal' },
    });
  }

  if (workflowNodes.length === 1) {
    await appendStage({
      stage: 'TRANSFORMATION',
      entityId: signalForRun.transformation_receipt.receipt_id,
      eventId: `transform:${signalForRun.transformation_receipt.receipt_id}`,
      evidenceRefs: [signalForRun.packet.packet_id],
      transformationReceiptId: signalForRun.transformation_receipt.receipt_id,
      payload: {
        receipt_id: signalForRun.transformation_receipt.receipt_id,
        input_digest: signalForRun.transformation_receipt.input_digest,
        output_digest: signalForRun.transformation_receipt.output_digest,
        cleaner_version: signalForRun.transformation_receipt.cleaner_version,
        fragment_count: signalForRun.transformation_receipt.fragment_count,
        meaning_change_claimed: signalForRun.transformation_receipt.meaning_change_claimed === true,
        transformation_receipt: signalForRun.transformation_receipt,
      },
      provenance: { source: 'reality_governed_signal_cleaner' },
    });
  }

  if (workflowNodes.length === 2) {
    await appendStage({
      stage: 'OBSERVATION',
      entityId: signalForRun.packet.packet_id + ':observation',
      eventId: `observation:${signalForRun.packet.packet_id}`,
      evidenceRefs: signalForRun.fragments.map((fragment) => fragment.fragment_id),
      transformationReceiptId: signalForRun.transformation_receipt.receipt_id,
      payload: {
        packet_id: signalForRun.packet.packet_id,
        fragment_ids: signalForRun.fragments.map((fragment) => fragment.fragment_id),
        fragment_count: signalForRun.fragments.length,
        fragment_manifest: signalForRun.fragments.map((fragment) => ({
          fragment_id: fragment.fragment_id,
          ordinal: fragment.ordinal,
          raw_text_digest: fragment.raw_text_digest,
          cleaned_text_digest: fragment.cleaned_text_digest,
          transformation: fragment.transformation,
          epistemic_status: fragment.epistemic_status,
        })),
      },
      provenance: { source: 'reality_live_intelligence_orchestration' },
    });
  }

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
