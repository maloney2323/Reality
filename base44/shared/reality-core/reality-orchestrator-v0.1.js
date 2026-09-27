import { canonicalJson, sha256Hex } from '../action-gate/canonical.js';

export const REALITY_ORCHESTRATOR_VERSION = 'reality-orchestrator-v0.1';
export const ORCHESTRATOR_AUTHORITY = 'GOVERNED_WORKFLOW_COORDINATION_ONLY';

export const TERMINAL_STATES = new Set(['COMPLETED','BLOCKED','HALTED','HANDED_OFF']);
export const NEXT_ACTIONS = Object.freeze({
  OBSERVE: 'OBSERVE',
  VERIFY: 'VERIFY',
  REASON: 'REASON',
  REQUEST_EVIDENCE: 'REQUEST_EVIDENCE',
  EXECUTE_GOVERNED: 'EXECUTE_GOVERNED',
  WAIT: 'WAIT',
  HANDOFF_HUMAN: 'HANDOFF_HUMAN',
  CLOSE: 'CLOSE'
});

export function digestOrchestrationState(state) {
  return sha256Hex(canonicalJson({
    schema_version: REALITY_ORCHESTRATOR_VERSION,
    work_unit_id: state.work_unit_id,
    workday_id: state.workday_id,
    continuity_state_id: state.continuity_state_id,
    status: state.status,
    next_action: state.next_action,
    open_verification_requirements: [...(state.open_verification_requirements || [])].sort(),
    open_debt: [...(state.open_debt || [])].sort(),
  }));
}

export function buildOrchestrationDecision(input = {}) {
  const {
    work_unit_id, workday_id, continuity_state_id,
    status = 'ACTIVE',
    verification_requirements = [],
    open_debt = [],
    human_decision_required = false,
    governed_action_required = false,
    evidence_required = false,
    work_remaining = false,
    failure = null
  } = input;
  if (!work_unit_id || !workday_id || !continuity_state_id) {
    return { schema_version: REALITY_ORCHESTRATOR_VERSION, authority: ORCHESTRATOR_AUTHORITY, state: 'HALTED', next_action: 'HANDOFF_HUMAN', failure: 'MISSING_GOVERNED_IDENTIFIERS' };
  }
  let next_action = NEXT_ACTIONS.CLOSE;
  let state = 'ACTIVE';
  if (failure) { state = 'HALTED'; next_action = NEXT_ACTIONS.HANDOFF_HUMAN; }
  else if (human_decision_required) next_action = NEXT_ACTIONS.HANDOFF_HUMAN;
  else if (evidence_required || open_debt.length) next_action = NEXT_ACTIONS.REQUEST_EVIDENCE;
  else if (verification_requirements.length) next_action = NEXT_ACTIONS.VERIFY;
  else if (governed_action_required) next_action = NEXT_ACTIONS.EXECUTE_GOVERNED;
  else if (work_remaining) next_action = NEXT_ACTIONS.OBSERVE;
  else { state = 'COMPLETED'; next_action = NEXT_ACTIONS.CLOSE; }
  const decision = {
    schema_version: REALITY_ORCHESTRATOR_VERSION,
    authority: ORCHESTRATOR_AUTHORITY,
    work_unit_id, workday_id, continuity_state_id,
    status: state, next_action,
    open_verification_requirements: [...verification_requirements],
    open_debt: [...open_debt],
    execution_authority: false,
    mutation_authority: false,
    merge_authority: false,
    deploy_authority: false
  };
  return { ...decision, decision_digest: digestOrchestrationState(decision) };
}

export function verifyOrchestrationDecision(decision) {
  if (!decision || decision.schema_version !== REALITY_ORCHESTRATOR_VERSION) return { valid:false, failure:'INVALID_SCHEMA' };
  if (decision.authority !== ORCHESTRATOR_AUTHORITY) return { valid:false, failure:'INVALID_AUTHORITY' };
  if (decision.execution_authority || decision.mutation_authority || decision.merge_authority || decision.deploy_authority) return { valid:false, failure:'UNAUTHORIZED_AUTHORITY_ESCALATION' };
  const expected = digestOrchestrationState(decision);
  if (decision.decision_digest !== expected) return { valid:false, failure:'DECISION_DIGEST_MISMATCH' };
  return { valid:true };
}
