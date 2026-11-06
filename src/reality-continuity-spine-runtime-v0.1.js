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
  // Server-attested prior fork; it is an observation, never inherited authority.
  recoveryAudit = null,
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
  const isolated = resolveReliabilityBenchmarkDb();
  const persistence = persistenceEnabled ? createUniversePostgresPersistence({
    fetchImpl, ...(isolated||{}),
  }) : null;
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
        // The isolated DB now enforces one successor per parent and one
        // genesis event per scope. Two concurrent readers can pass a stale
        // tail check, but the second INSERT fails atomically (no new fork).
        // For ordinary intake only, recheck the entire integrity chain and
        // retry once against its freshly verified tail. Never silently
        // rebase authority, execution, installed outcomes or approvals.
        const collision=/UNIVERSE_POSTGRES_HTTP_409/.test(String(error?.message||'')) &&
          /reality_universe_single_(successor|genesis)_preview_v1/.test(String(error?.message||''));
        const canRebase=['RAW_SIGNAL','TRANSFORMATION','OBSERVATION'].includes(stage);
        if(collision&&canRebase){
          try{
            const rows=await persistence.reconstruct({
              continuityRootId:spine.continuity_root_id,
              worldlineId:spine.worldline_id,
            });
            const verified=orderContinuityHistory(rows);
            const tail=verified.at(-1);
            if(!tail||tail.event_id===node.parent_event_id)
              throw Error('CONTINUITY_ATOMIC_APPEND_COLLISION_NOT_ADVANCED');
            const rebased=appendContinuityNode({
              spine,stage,entityId,eventId,
              parentEventId:tail.event_id,
              evidenceRefs,transformationReceiptId,
              effectiveTime,assertionTime,epistemicStatus,
              payload,priorLineageHash:tail.lineage_hash,
              provenance:{
                ...provenance,
                continuity_runtime_version:REALITY_CONTINUITY_RUNTIME_VERSION,
              },
            });
            committed=await persistence.appendEvent(rebased);
          }catch(retryError){
            const failure=new Error('CONTINUITY_ATOMIC_APPEND_RETRY_UNVERIFIED:'+
              (retryError?.message||'UNKNOWN'));
            failure.code='CONTINUITY_ATOMIC_APPEND_RETRY_UNVERIFIED';
            failure.cause=retryError;
            throw failure;
          }
        }else{
          const failure = new Error('CONTINUITY_PERSISTENCE_REQUIRED:' + (error?.message || error?.code || 'UNKNOWN'));
          failure.code = 'CONTINUITY_PERSISTENCE_REQUIRED';
          failure.cause = error;
          throw failure;
        }
      }
    }

    spine = advanceSpine(spine, committed);
    nodes.push(committed);
    return committed;
  }

  await appendStage({
    stage: 'RAW_SIGNAL',
    entityId: signal.packet.packet_id,
    evidenceRefs: recoveryAudit?.status==='TWO_IMMUTABLE_TERMINAL_SIBLINGS_INDEPENDENTLY_VERIFIED'?
      recoveryAudit.independent_tip_hashes.map(x=>x.event_id):[], 
    eventId: `root:${spine.continuity_root_id}:world:${spine.worldline_id}:raw:${signal.packet.packet_id}`,
    payload: {
      packet_id: signal.packet.packet_id,
      source: signal.packet.source,
      observed_at: signal.packet.observed_at,
      raw_content_digest: signal.packet.raw_content_digest,
      fork_recovery_audit: recoveryAudit || null,
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
      typed_intake_projection_digest:signal.typed_epistemic_intake?.projection_digest||null,
      typed_clause_count:signal.typed_epistemic_intake?.clause_count??null,
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
      typed_signal_manifest:signal.typed_epistemic_intake?{
        version:signal.typed_epistemic_intake.version,
        projection_digest:signal.typed_epistemic_intake.projection_digest,
        source_digest:signal.typed_epistemic_intake.source_digest,
        status:'INTERPRETATION_CANDIDATES_NOT_GROUND_TRUTH',
        execution_authorized:false,
        clauses:signal.typed_epistemic_intake.clauses.map(c=>({
          clause_id:c.clause_id,fragment_id:c.fragment_id,
          source_span:c.source_span,source_text_digest:c.source_text_digest,
          kind:c.kind,modalities:c.epistemic_modalities,
          agency_candidate:c.agency.candidate,
          candidate_dependency:c.candidate_dependency,
          candidate_relations:c.candidate_relations,
          epistemic_status:'UNVERIFIED_INTAKE',
        })),
        unresolved_conditions:signal.typed_epistemic_intake.unresolved_conditions,
        correction_candidates:signal.typed_epistemic_intake.correction_candidates,
      }:null,
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
