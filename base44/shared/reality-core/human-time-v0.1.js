export const REALITY_HUMAN_TIME_VERSION = 'reality-human-time-v0.1';

export const TIME_EVIDENCE_STATES = Object.freeze([
  'OBSERVED',
  'CALCULATED',
  'EXPLICITLY_ESTIMATED',
  'INSUFFICIENT_EVIDENCE'
]);

function finiteNonNegative(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function projectedHumanTimeReturned({ baseline_hours = null, projected_oversight_hours = null } = {}) {
  if (!finiteNonNegative(baseline_hours) || !finiteNonNegative(projected_oversight_hours)) {
    return {
      value_hours: null,
      evidence_state: 'INSUFFICIENT_EVIDENCE'
    };
  }

  return {
    value_hours: Math.max(0, baseline_hours - projected_oversight_hours),
    evidence_state: 'EXPLICITLY_ESTIMATED'
  };
}

export function verifiedHumanTimeReturned({ baseline_hours = null, human_intervention_hours = null, verification_refs = [] } = {}) {
  if (!finiteNonNegative(baseline_hours) || !finiteNonNegative(human_intervention_hours) || !Array.isArray(verification_refs) || verification_refs.length === 0) {
    return {
      value_hours: null,
      evidence_state: 'INSUFFICIENT_EVIDENCE'
    };
  }

  return {
    value_hours: Math.max(0, baseline_hours - human_intervention_hours),
    evidence_state: 'OBSERVED',
    verification_refs: [...verification_refs]
  };
}
