import { canonicalJson, sha256Hex } from '../action-gate/canonical.js';

export const REALITY_WORKDAY_VERSION = 'reality-workday-controller-v0.1';
export const WORKDAY_AUTHORITY = 'GOVERNED_WORK_SESSION_COORDINATION_ONLY';
export const WORKDAY_TARGET_MIN_HOURS = 8;
export const WORKDAY_TARGET_MAX_HOURS = 12;

export function buildRealityWorkday({ workday_id, world_id, objective, baseline_human_hours = null, created_at }) {
  if (!workday_id || !world_id || !objective || !created_at) throw new Error('workday_id, world_id, objective, created_at required');
  return {
    schema_version: REALITY_WORKDAY_VERSION,
    workday_id, world_id, objective,
    target_operating_envelope_hours: { min: WORKDAY_TARGET_MIN_HOURS, max: WORKDAY_TARGET_MAX_HOURS },
    baseline_human_hours,
    reality_elapsed_seconds: 0,
    human_intervention_seconds: 0,
    verified_work_completed: [],
    work_remaining: true,
    interruptions: [],
    rework: [],
    evidence_refs: [],
    verification_requirements: [],
    status: 'ACTIVE',
    authority: WORKDAY_AUTHORITY,
    execution_authority: false,
    mutation_authority: false,
    merge_authority: false,
    deploy_authority: false,
    created_at,
    state_digest: sha256Hex(canonicalJson({ schema_version: REALITY_WORKDAY_VERSION, workday_id, world_id, objective, baseline_human_hours, created_at }))
  };
}

export function estimateHumanEffortAvoided({ baseline_human_hours, human_intervention_seconds }) {
  if (typeof baseline_human_hours !== 'number' || !Number.isFinite(baseline_human_hours) || baseline_human_hours < 0) {
    return { value_hours: null, confidence: 'UNSUPPORTED_BASELINE' };
  }
  const interventionHours = Math.max(0, human_intervention_seconds || 0) / 3600;
  return { value_hours: Math.max(0, baseline_human_hours - interventionHours), confidence: 'BASELINE_SUPPORTED' };
}

export function closeRealityWorkday(workday, { verified_work_completed = [], work_remaining = false, status = 'COMPLETED' } = {}) {
  return {
    ...workday,
    verified_work_completed: [...verified_work_completed],
    work_remaining,
    status,
    closed_at: new Date().toISOString(),
    authority: WORKDAY_AUTHORITY,
    execution_authority: false,
    mutation_authority: false,
    merge_authority: false,
    deploy_authority: false
  };
}
