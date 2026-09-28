// Reality Automation Discovery -> Work Promotion Bridge v0.1
//
// Canonical bridge:
//   governed discovery -> automation opportunity -> proposed governed work item.
//
// This module never grants execution authority. It refuses promotion when the
// discovery is not grounded or when a real Workday/Continuity binding is absent.

export const REALITY_AUTOMATION_BRIDGE_VERSION = 'reality-automation-bridge-v0.1';
export const AUTOMATION_BRIDGE_AUTHORITY = 'CANDIDATE_DISCOVERY_ONLY';

function required(value, name) {
  if (typeof value !== 'string' || value.trim().length < 4) {
    throw new Error(`${name}_REQUIRED`);
  }
  return value.trim();
}

function list(value, max = 20) {
  return Array.isArray(value) ? [...new Set(value.filter((v) => typeof v === 'string' && v.trim()).map((v) => v.trim()))].slice(0, max) : [];
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function buildAutomationOpportunityFromDiscovery({
  discovery,
  workday_id,
  continuity_state_id,
  created_at = new Date().toISOString(),
}) {
  if (!discovery || typeof discovery !== 'object') throw new Error('DISCOVERY_REQUIRED');
  if (discovery.discovery_type !== 'AUTOMATION_OPPORTUNITY') {
    throw new Error('DISCOVERY_NOT_AUTOMATION_OPPORTUNITY');
  }
  if (discovery.truth_authorized === true || discovery.action_authorized === true || discovery.external_effects_permitted === true) {
    throw new Error('DISCOVERY_AUTHORITY_VIOLATION');
  }
  if (!Array.isArray(discovery.evidence_refs) || discovery.evidence_refs.length === 0) {
    throw new Error('DISCOVERY_EVIDENCE_REQUIRED');
  }

  const workday = required(workday_id, 'WORKDAY_ID');
  const continuity = required(continuity_state_id, 'CONTINUITY_STATE_ID');
  const confidence = ['LOW', 'MEDIUM', 'HIGH', 'INSUFFICIENT_EVIDENCE'].includes(discovery.confidence)
    ? discovery.confidence
    : 'INSUFFICIENT_EVIDENCE';

  return Object.freeze({
    opportunity_id: `automation-opportunity:${discovery.discovery_id}:${workday}`,
    user_id: required(discovery.user_id, 'USER_ID'),
    world_id: required(discovery.world_id, 'WORLD_ID'),
    workday_id: workday,
    continuity_state_id: continuity,
    title: String(discovery.subject || 'Automation opportunity').slice(0, 300),
    workflow_summary: String(discovery.summary || '').slice(0, 1800),
    evidence_refs: Object.freeze(list(discovery.evidence_refs, 12)),
    confidence,
    time_estimate_status: 'NOT_ENOUGH_EVIDENCE',
    potential_minutes_low_per_week: 0,
    potential_minutes_high_per_week: 0,
    measured_human_time_returned_seconds: 0,
    routine_tasks_removed: 0,
    exceptions_surfaced: 0,
    status: 'DISCOVERED',
    approval_boundary: 'Discovery proposes candidate work only. Consequential external actions require separate human authorization and governed execution.',
    authority: AUTOMATION_BRIDGE_AUTHORITY,
    automation_authorized: false,
    action_authorized: false,
    external_effects_permitted: false,
    created_at,
  });
}

export function buildGovernedWorkItemFromOpportunity({ opportunity, discovery }) {
  if (!opportunity || opportunity.authority !== AUTOMATION_BRIDGE_AUTHORITY) {
    throw new Error('OPPORTUNITY_NOT_GOVERNED_CANDIDATE');
  }
  if (opportunity.automation_authorized || opportunity.action_authorized || opportunity.external_effects_permitted) {
    throw new Error('OPPORTUNITY_AUTHORITY_VIOLATION');
  }

  const evidence = list(opportunity.evidence_refs, 20);
  return Object.freeze({
    record_id: `gwi-record:${opportunity.opportunity_id}`,
    record_version: 'governed-work-item-v0.1',
    work_item_id: `work-item:${opportunity.opportunity_id}`,
    sequence_number: 0,
    decision_id: `decision:${opportunity.opportunity_id}`,
    objective_id: `objective:${opportunity.opportunity_id}`,
    constraint_id: `constraint:${opportunity.opportunity_id}`,
    user_id: opportunity.user_id,
    world_id: opportunity.world_id,
    title: opportunity.title,
    scope: Object.freeze({
      opportunity_id: opportunity.opportunity_id,
      discovery_id: discovery?.discovery_id || null,
      workday_id: opportunity.workday_id,
      continuity_state_id: opportunity.continuity_state_id,
      mode: 'DISCOVERY_TO_PROPOSED_WORK',
    }),
    authorized_actions: Object.freeze([]),
    prohibited_actions: Object.freeze([
      'external_effects',
      'consequential_action_without_authorization',
      'merge',
      'deploy',
      'destructive_change',
      'credential_change',
    ]),
    authority_ref: opportunity.opportunity_id,
    status: 'PROPOSED',
    continue_if: Object.freeze(['human review establishes the workflow boundary', 'required evidence remains valid']),
    pause_if: Object.freeze(['evidence becomes stale', 'continuity cannot be verified', 'authority scope is unclear']),
    stop_if: Object.freeze(['contradiction cannot be resolved', 'required evidence is unavailable', 'unauthorized action would be required']),
    review_at: new Date().toISOString(),
    verification_requirements: Object.freeze([
      'verify exact source evidence',
      'verify current continuity state',
      'verify human-work baseline before claiming time returned',
      'verify execution result independently if later authorized',
    ]),
    expected_outputs: Object.freeze(['bounded automation plan', 'verification requirements', 'measured outcome if later executed']),
    expected_operational_outcomes: Object.freeze([]),
    evidence_refs: Object.freeze(evidence),
    source_record_refs: Object.freeze([
      discovery?.discovery_id || opportunity.opportunity_id,
      opportunity.opportunity_id,
    ]),
    provenance: Object.freeze({
      source: 'RealityAutomationOpportunityV01',
      discovery_id: discovery?.discovery_id || null,
      bridge_version: REALITY_AUTOMATION_BRIDGE_VERSION,
    }),
    assumptions: Object.freeze([]),
    uncertainty: Object.freeze(['Human recurrence and handling time are not established by discovery alone.']),
    claim_boundaries: Object.freeze({
      discovery_is_not_truth: true,
      proposal_is_not_authorization: true,
      authorization_is_not_execution: true,
      execution_is_not_verification: true,
      time_return_requires_verified_human_baseline: true,
    }),
    supersedes_record_id: '',
    created_at: new Date().toISOString(),
  });
}

export function verifyAutomationPromotion({ opportunity, workItem }) {
  const failures = [];
  if (!opportunity?.opportunity_id) failures.push('OPPORTUNITY_ID_MISSING');
  if (!workItem?.work_item_id) failures.push('WORK_ITEM_ID_MISSING');
  if (opportunity?.automation_authorized !== false) failures.push('OPPORTUNITY_AUTOMATION_AUTHORITY_CHANGED');
  if (opportunity?.action_authorized !== false) failures.push('OPPORTUNITY_ACTION_AUTHORITY_CHANGED');
  if (opportunity?.external_effects_permitted !== false) failures.push('OPPORTUNITY_EXTERNAL_EFFECTS_CHANGED');
  if (workItem?.status !== 'PROPOSED') failures.push('WORK_ITEM_NOT_PROPOSED');
  if ((workItem?.authorized_actions || []).length !== 0) failures.push('WORK_ITEM_AUTHORIZED_ACTIONS_NOT_EMPTY');
  if (workItem?.claim_boundaries?.proposal_is_not_authorization !== true) failures.push('PROPOSAL_AUTHORITY_BOUNDARY_MISSING');
  return Object.freeze({ valid: failures.length === 0, failures });
}