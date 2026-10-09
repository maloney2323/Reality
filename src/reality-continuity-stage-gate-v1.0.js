export const REALITY_CONTINUITY_STAGE_GATE_VERSION = 'reality-continuity-stage-gate-v1.1';

const PREDECESSOR = Object.freeze({
  TRANSFORMATION: 'RAW_SIGNAL',
  OBSERVATION: 'TRANSFORMATION',
  SITUATION: 'OBSERVATION',
  WORK: 'SITUATION',
  AUTHORITY: 'WORK',
  EXECUTION: 'AUTHORITY',
  VERIFICATION: 'EXECUTION',
  OUTCOME: 'VERIFICATION',
  LEARNING: 'OUTCOME',
  CAPABILITY: 'LEARNING',
});

const DURABLE_STAGES = new Set([
  'SITUATION', 'WORK', 'AUTHORITY', 'EXECUTION', 'VERIFICATION',
  'OUTCOME', 'LEARNING', 'CAPABILITY',
]);
const VALID_STAGES = new Set(['RAW_SIGNAL', ...Object.keys(PREDECESSOR)]);
const list = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;

export function evaluateContinuityStageGate({
  stage,
  workflowHistory,
  priorNodes = [],
  globalTail,
  candidate = {},
  persistenceStatus = 'UNKNOWN',
} = {}) {
  const reasons = [];
  const history = list(workflowHistory === undefined ? priorNodes : workflowHistory);
  const expected = PREDECESSOR[stage];
  const workflowRunId = candidate?.workflow_run_id || candidate?.payload?.workflow_run_id || null;
  const hasGlobalTailContract = globalTail !== undefined;

  if (!VALID_STAGES.has(stage)) {
    reasons.push('CONTINUITY_STAGE_INVALID');
  } else if (stage === 'RAW_SIGNAL') {
    if (history.length) reasons.push('WORKFLOW_ALREADY_HAS_RAW_SIGNAL');
  } else {
    const previous = history[history.length - 1];
    if (!previous || previous.event_kind !== expected) {
      reasons.push('REQUIRED_PREDECESSOR_MISSING:' + expected);
    }
    const previousRunId = previous?.payload?.workflow_run_id || previous?.workflow_run_id || null;
    if (previous && workflowRunId && previousRunId && previousRunId !== workflowRunId) {
      reasons.push('WORKFLOW_ID_MISMATCH');
    }
    if (previous && !hasGlobalTailContract) {
      if (candidate?.parent_event_id && candidate.parent_event_id !== previous.event_id) {
        reasons.push('PARENT_EVENT_MISMATCH');
      }
      if (candidate?.prior_lineage_hash && candidate.prior_lineage_hash !== previous.lineage_hash) {
        reasons.push('LINEAGE_HASH_MISMATCH');
      }
    }
  }

  // Global append-only lineage and per-workflow stage order are separate contracts.
  // A new workflow may begin with RAW_SIGNAL, but it must attach to the durable global tail.
  if (hasGlobalTailContract) {
    const expectedParent = globalTail?.event_id || null;
    const expectedHash = globalTail?.lineage_hash || null;
    if ((candidate?.parent_event_id || null) !== expectedParent) reasons.push('GLOBAL_PARENT_MISMATCH');
    if ((candidate?.prior_lineage_hash || null) !== expectedHash) reasons.push('GLOBAL_LINEAGE_HASH_MISMATCH');
  }

  if (stage !== 'RAW_SIGNAL' && !list(candidate?.evidence_refs).length) {
    reasons.push('EVIDENCE_REFS_REQUIRED');
  }

  if (stage === 'TRANSFORMATION' || stage === 'OBSERVATION') {
    if (!nonempty(candidate?.transformation_receipt_id)) {
      reasons.push('TRANSFORMATION_RECEIPT_REQUIRED');
    }
  }

  if (DURABLE_STAGES.has(stage) && !['PERSISTED', 'DURABLE_READY'].includes(persistenceStatus)) {
    reasons.push('DURABLE_CONTINUITY_REQUIRED');
  }

  if (stage === 'EXECUTION') {
    const authority = history[history.length - 1];
    const status = authority?.payload?.authorization_status;
    if (status !== 'GRANTED' || authority?.payload?.granted !== true) reasons.push('AUTHORITY_NOT_GRANTED');
    if (!nonempty(authority?.payload?.authorization_ref)) reasons.push('AUTHORIZATION_ARTIFACT_REQUIRED');
    if (!nonempty(candidate?.payload?.authorization_ref)) reasons.push('EXECUTION_AUTHORIZATION_REF_REQUIRED');
    if (authority?.payload?.authorization_ref && candidate?.payload?.authorization_ref &&
        authority.payload.authorization_ref !== candidate.payload.authorization_ref) {
      reasons.push('AUTHORIZATION_SCOPE_REFERENCE_MISMATCH');
    }
  }

  return Object.freeze({
    allowed: reasons.length === 0,
    stage: stage || null,
    workflow_run_id: workflowRunId,
    expected_predecessor: expected || null,
    reasons: Object.freeze([...new Set(reasons)]),
    gate_version: REALITY_CONTINUITY_STAGE_GATE_VERSION,
  });
}
