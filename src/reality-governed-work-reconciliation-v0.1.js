import { createHash } from 'node:crypto';

export const GOVERNED_WORK_RECONCILIATION_VERSION = '0.1.0';

export const RECONCILIATION_DISPOSITIONS = Object.freeze([
  'INHERITED','MODIFIED','REMOVED','BLOCKED','CLARIFICATION_REQUIRED'
]);

export const RECONCILIATION_TRANSITIONS = Object.freeze([
  'AUTHORITY_CONSTRAINED','REJECTED','BLOCKED','SEMANTIC_AMBIGUITY_IDENTIFIED'
]);

function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function list(value) { return Array.isArray(value) ? value : []; }
function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return '{' + Object.keys(value).sort().map((k) => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
}
function digest(value) {
  return createHash('sha256').update(canonical(value)).digest('hex');
}
function artifactId(prefix, value) {
  return prefix + ':' + digest(value).slice(0, 32);
}
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}
function requireTime(value, name) {
  if (!text(value)) throw new Error(name + '_REQUIRED');
  if (Number.isNaN(Date.parse(value))) throw new Error(name + '_INVALID');
  return value;
}
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createPlanArtifact({
  planId = null, workflowId, revision = 1, derivedFrom = null, status = 'PROPOSED',
  validFrom, validTo = null, recordedAt, supersededAt = null, workItems = [],
  authorityRequestId = null, authorityDecisionId = null, authorityDiffId = null,
  reconciliationId = null, continuityRootId = null, worldlineId = null
} = {}) {
  if (!text(workflowId)) throw new Error('WORKFLOW_ID_REQUIRED');
  if (!Number.isInteger(revision) || revision < 1) throw new Error('PLAN_REVISION_INVALID');
  requireTime(validFrom, 'VALID_FROM');
  requireTime(recordedAt, 'RECORDED_AT');
  if (validTo !== null) requireTime(validTo, 'VALID_TO');
  if (supersededAt !== null) requireTime(supersededAt, 'SUPERSEDED_AT');
  if (derivedFrom !== null && revision === 1) throw new Error('ROOT_PLAN_CANNOT_HAVE_DERIVATION');
  const payload = {
    workflow_id: workflowId, revision, derived_from: derivedFrom, status, valid_from: validFrom,
    valid_to: validTo, recorded_at: recordedAt, superseded_at: supersededAt,
    work_items: clone(workItems), authority_request_id: authorityRequestId,
    authority_decision_id: authorityDecisionId, authority_diff_id: authorityDiffId,
    reconciliation_id: reconciliationId, continuity_root_id: continuityRootId, worldline_id: worldlineId
  };
  payload.plan_id = planId || artifactId('plan', payload);
  return deepFreeze(payload);
}

export function createAuthorityDecision({
  authorizationId = null, workflowId, decisionType, requestedAuthority = [],
  grantedAuthority = [], withheldAuthority = [], decisionScope = [], decidedAt,
  humanActor, authorizationEvidenceRef = null
} = {}) {
  if (!text(workflowId)) throw new Error('WORKFLOW_ID_REQUIRED');
  if (!text(decisionType)) throw new Error('DECISION_TYPE_REQUIRED');
  if (!text(humanActor)) throw new Error('HUMAN_ACTOR_REQUIRED');
  requireTime(decidedAt, 'DECIDED_AT');
  const payload = {
    workflow_id: workflowId, decision_type: decisionType,
    requested_authority: clone(requestedAuthority), granted_authority: clone(grantedAuthority),
    withheld_authority: clone(withheldAuthority), decision_scope: clone(decisionScope),
    decided_at: decidedAt, human_actor: humanActor,
    authorization_evidence_ref: authorizationEvidenceRef
  };
  payload.authorization_id = authorizationId || artifactId('authorization-decision', payload);
  return deepFreeze(payload);
}

function validateDispositionCoverage(parentWorkItems, diff) {
  const parentIds = parentWorkItems.map((w) => w.work_item_id);
  if (parentIds.some((id) => !text(id))) throw new Error('PARENT_WORK_ITEM_ID_REQUIRED');
  const seen = new Map();
  for (const key of RECONCILIATION_DISPOSITIONS) {
    for (const item of list(diff[key.toLowerCase()] ?? diff[key])) {
      if (!text(item.work_item_id)) throw new Error('RECONCILIATION_WORK_ITEM_ID_REQUIRED');
      if (!parentIds.includes(item.work_item_id)) throw new Error('RECONCILIATION_REFERENCES_UNKNOWN_PARENT_WORK_ITEM');
      if (seen.has(item.work_item_id)) throw new Error('WORK_ITEM_MULTIPLE_RECONCILIATION_DISPOSITIONS');
      seen.set(item.work_item_id, key);
    }
  }
  if (seen.size !== parentIds.length) throw new Error('INCOMPLETE_RECONCILIATION');
  return seen;
}

function field(diff, upper, lower) {
  return diff[lower] ?? diff[upper] ?? [];
}

export function createAuthorityDiff({
  parentPlanId, successorPlanId = null, parentWorkItems = [],
  inherited = [], modified = [], removed = [], blocked = [], clarificationRequired = [],
  newlyRequired = []
} = {}) {
  if (!text(parentPlanId)) throw new Error('PARENT_PLAN_ID_REQUIRED');
  if (successorPlanId === parentPlanId) throw new Error('SUCCESSOR_CANNOT_EQUAL_PARENT');
  const normalized = {
    inherited: clone(inherited), modified: clone(modified), removed: clone(removed),
    blocked: clone(blocked), clarification_required: clone(clarificationRequired),
    newly_required: clone(newlyRequired)
  };
  const seen = validateDispositionCoverage(parentWorkItems, normalized);
  for (const item of normalized.modified) {
    if (!text(item.reason)) throw new Error('MODIFIED_REASON_REQUIRED');
  }
  for (const item of normalized.newly_required) {
    if (!text(item.reason)) throw new Error('NEW_WORK_ITEM_REASON_REQUIRED');
  }
  const payload = {
    parent_plan_id: parentPlanId, successor_plan_id: successorPlanId,
    ...normalized,
    parent_work_item_count: parentWorkItems.length,
    disposition_count: seen.size
  };
  payload.authority_diff_id = artifactId('authority-diff', payload);
  return deepFreeze(payload);
}

export function createReconciliation({
  parentPlan, authorityDecision, authorityDiff, constitutionalEvaluation,
  successorPlanProposal = null, transitionType = 'AUTHORITY_CONSTRAINED',
  committedBy = 'governance-runtime', committedAt
} = {}) {
  if (!parentPlan?.plan_id) throw new Error('PARENT_PLAN_REQUIRED');
  if (!authorityDecision?.authorization_id) throw new Error('AUTHORITY_DECISION_REQUIRED');
  if (authorityDecision.workflow_id !== parentPlan.workflow_id) throw new Error('AUTHORITY_WORKFLOW_MISMATCH');
  if (!authorityDiff?.authority_diff_id) throw new Error('AUTHORITY_DIFF_REQUIRED');
  if (authorityDiff.parent_plan_id !== parentPlan.plan_id) throw new Error('AUTHORITY_DIFF_PARENT_MISMATCH');
  if (!constitutionalEvaluation?.evaluation_id) throw new Error('CONSTITUTIONAL_EVALUATION_REQUIRED');
  if (!RECONCILIATION_TRANSITIONS.includes(transitionType)) throw new Error('INVALID_RECONCILIATION_TRANSITION');
  requireTime(committedAt, 'COMMITTED_AT');
  if (!text(committedBy)) throw new Error('COMMITTED_BY_REQUIRED');
  if (transitionType === 'AUTHORITY_CONSTRAINED' && !successorPlanProposal) throw new Error('SUCCESSOR_PROPOSAL_REQUIRED');
  if (successorPlanProposal && successorPlanProposal.derived_from !== parentPlan.plan_id)
    throw new Error('SUCCESSOR_PARENT_MISMATCH');
  if (successorPlanProposal && successorPlanProposal.workflow_id !== parentPlan.workflow_id)
    throw new Error('SUCCESSOR_WORKFLOW_MISMATCH');
  if (successorPlanProposal && successorPlanProposal.revision !== parentPlan.revision + 1)
    throw new Error('SUCCESSOR_REVISION_INVALID');
  const payload = {
    version: GOVERNED_WORK_RECONCILIATION_VERSION, workflow_id: parentPlan.workflow_id,
    parent_plan_id: parentPlan.plan_id, authority_decision_id: authorityDecision.authorization_id,
    authority_diff_id: authorityDiff.authority_diff_id,
    constitutional_evaluation_id: constitutionalEvaluation.evaluation_id,
    successor_plan_id: successorPlanProposal?.plan_id || null,
    transition_type: transitionType, committed_by: committedBy, committed_at: committedAt
  };
  payload.reconciliation_id = artifactId('reconciliation', payload);
  return deepFreeze(payload);
}

export function createLineageTransition({
  workflowId, parentPlanId, childPlanId = null, transitionType,
  authorityDecisionId, authorityDiffId, reconciliationId, constitutionalEvaluationId,
  validatedBy = 'governance-runtime', committedAt, attestationRefs = []
} = {}) {
  if (!text(workflowId) || !text(parentPlanId)) throw new Error('LINEAGE_IDENTIFIERS_REQUIRED');
  if (childPlanId === parentPlanId) throw new Error('LINEAGE_SELF_REFERENCE');
  if (!text(transitionType) || !RECONCILIATION_TRANSITIONS.includes(transitionType))
    throw new Error('INVALID_LINEAGE_TRANSITION');
  for (const [value, name] of [[authorityDecisionId,'AUTHORITY_DECISION_ID'],[authorityDiffId,'AUTHORITY_DIFF_ID'],
    [reconciliationId,'RECONCILIATION_ID'],[constitutionalEvaluationId,'CONSTITUTIONAL_EVALUATION_ID']]) {
    if (!text(value)) throw new Error(name + '_REQUIRED');
  }
  requireTime(committedAt, 'COMMITTED_AT');
  if (!text(validatedBy)) throw new Error('VALIDATED_BY_REQUIRED');
  const payload = {
    workflow_id: workflowId, parent_plan_id: parentPlanId, child_plan_id: childPlanId,
    transition_type: transitionType, authority_decision_id: authorityDecisionId,
    authority_diff_id: authorityDiffId, reconciliation_id: reconciliationId,
    constitutional_evaluation_id: constitutionalEvaluationId, validated_by: validatedBy,
    committed_at: committedAt, attestation_refs: clone(attestationRefs)
  };
  payload.lineage_id = artifactId('lineage', payload);
  return deepFreeze(payload);
}

export function materializeSuccessorPlan({
  parentPlan, authorityDecision, authorityDiff, reconciliation, workItems,
  validFrom, recordedAt, continuityRootId = parentPlan.continuity_root_id,
  worldlineId = parentPlan.worldline_id
} = {}) {
  if (!reconciliation?.reconciliation_id) throw new Error('RECONCILIATION_REQUIRED');
  if (reconciliation.parent_plan_id !== parentPlan?.plan_id) throw new Error('RECONCILIATION_PARENT_MISMATCH');
  if (reconciliation.successor_plan_id && reconciliation.successor_plan_id !== undefined &&
      reconciliation.transition_type === 'AUTHORITY_CONSTRAINED' && !text(reconciliation.successor_plan_id))
    throw new Error('SUCCESSOR_REQUIRED');
  return createPlanArtifact({
    workflowId: parentPlan.workflow_id, revision: parentPlan.revision + 1,
    derivedFrom: parentPlan.plan_id, status: 'AWAITING_PREFLIGHT',
    validFrom, recordedAt, workItems, authorityRequestId: parentPlan.authority_request_id,
    authorityDecisionId: authorityDecision.authorization_id,
    authorityDiffId: authorityDiff.authority_diff_id, reconciliationId: reconciliation.reconciliation_id,
    continuityRootId, worldlineId
  });
}

export function validateExecutionBinding({
  execution, plan, preflight, authorization
} = {}) {
  if (!execution?.execution_id || !plan?.plan_id || !preflight?.workflow_id)
    return { valid:false, reason:'EXECUTION_PLAN_PREFLIGHT_REQUIRED' };
  if (execution.plan_id !== plan.plan_id) return { valid:false, reason:'EXECUTION_PLAN_MISMATCH' };
  if (execution.workflow_id !== plan.workflow_id || preflight.workflow_id !== plan.workflow_id)
    return { valid:false, reason:'WORKFLOW_MISMATCH' };
  if (preflight.plan_id !== plan.plan_id) return { valid:false, reason:'PREFLIGHT_PLAN_MISMATCH' };
  if (plan.superseded_at) return { valid:false, reason:'PLAN_SUPERSEDED' };
  if (plan.status !== 'AWAITING_PREFLIGHT' && plan.status !== 'PREFLIGHTED' && plan.status !== 'AUTHORIZED')
    return { valid:false, reason:'PLAN_NOT_EXECUTABLE_STATE' };
  if (!authorization?.authorized) return { valid:false, reason:'EXPLICIT_AUTHORIZATION_REQUIRED' };
  if (authorization.workflow_id !== plan.workflow_id) return { valid:false, reason:'AUTHORIZATION_WORKFLOW_MISMATCH' };
  if (execution.authorization_id !== authorization.authorization_id)
    return { valid:false, reason:'EXECUTION_AUTHORIZATION_MISMATCH' };
  return { valid:true, reason:'VALIDATED' };
}

export function buildReconciledSuccessor({
  parentPlan, authorityDecision, authorityDiff, constitutionalEvaluation,
  workItems, validFrom, recordedAt, committedAt, committedBy = 'governance-runtime'
} = {}) {
  const proposal = createPlanArtifact({
    workflowId: parentPlan.workflow_id, revision: parentPlan.revision + 1,
    derivedFrom: parentPlan.plan_id, status: 'AWAITING_PREFLIGHT',
    validFrom, recordedAt, workItems, authorityRequestId: parentPlan.authority_request_id,
    authorityDecisionId: authorityDecision.authorization_id,
    authorityDiffId: authorityDiff.authority_diff_id,
    continuityRootId: parentPlan.continuity_root_id, worldlineId: parentPlan.worldline_id
  });
  const reconciliation = createReconciliation({
    parentPlan, authorityDecision, authorityDiff, constitutionalEvaluation,
    successorPlanProposal: proposal, transitionType:'AUTHORITY_CONSTRAINED',
    committedBy, committedAt
  });
  const successor = createPlanArtifact({
    ...proposal, planId: proposal.plan_id, reconciliationId: reconciliation.reconciliation_id
  });
  const lineage = createLineageTransition({
    workflowId: parentPlan.workflow_id, parentPlanId: parentPlan.plan_id,
    childPlanId: successor.plan_id, transitionType:'AUTHORITY_CONSTRAINED',
    authorityDecisionId: authorityDecision.authorization_id,
    authorityDiffId: authorityDiff.authority_diff_id,
    reconciliationId: reconciliation.reconciliation_id,
    constitutionalEvaluationId: constitutionalEvaluation.evaluation_id,
    validatedBy: committedBy, committedAt
  });
  return deepFreeze({ proposal, reconciliation, successor, lineage });
}
