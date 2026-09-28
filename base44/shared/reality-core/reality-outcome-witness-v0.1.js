// Reality Automation Outcome Witness v0.1
//
// Execution telemetry is not outcome truth. This contract requires three
// independent closure ingredients before an automation result can be marked
// verified:
//   1. execution receipt
//   2. target-side observation
//   3. resulting continuity state
//
// Model-generated text cannot satisfy any of these requirements.

export const REALITY_OUTCOME_WITNESS_VERSION = 'reality-outcome-witness-v0.1';

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length >= 4;
}

function hasRef(list, value) {
  return Array.isArray(list) && list.includes(value);
}

export function verifyAutomationOutcomeWitness({
  telemetry,
  execution_id,
  expected_result_state = 'COMPLETED',
  receipt,
  target_observation,
  continuity_after,
}) {
  const failures = [];
  if (!telemetry || typeof telemetry !== 'object') failures.push('TELEMETRY_REQUIRED');
  if (!nonEmpty(execution_id)) failures.push('EXECUTION_ID_REQUIRED');

  if (telemetry?.execution_id !== execution_id) failures.push('TELEMETRY_EXECUTION_ID_MISMATCH');
  if (telemetry?.result_state !== expected_result_state) failures.push('RESULT_STATE_NOT_COMPLETE');

  if (!nonEmpty(receipt?.receipt_ref)) failures.push('EXECUTION_RECEIPT_REQUIRED');
  if (receipt?.execution_id !== execution_id) failures.push('RECEIPT_EXECUTION_ID_MISMATCH');
  if (receipt?.observed_execution === true !== true) failures.push('RECEIPT_NOT_OBSERVED');

  if (!nonEmpty(target_observation?.observation_ref)) failures.push('TARGET_OBSERVATION_REQUIRED');
  if (target_observation?.execution_id !== execution_id) failures.push('TARGET_OBSERVATION_EXECUTION_ID_MISMATCH');
  if (target_observation?.target_state_confirmed !== true) failures.push('TARGET_STATE_NOT_CONFIRMED');
  if (target_observation?.source_kind === 'MODEL_GENERATED_ANALYSIS') failures.push('MODEL_OUTPUT_CANNOT_WITNESS');

  if (!nonEmpty(continuity_after?.continuity_state_id)) failures.push('CONTINUITY_CLOSURE_REQUIRED');
  if (continuity_after?.execution_id !== execution_id) failures.push('CONTINUITY_EXECUTION_ID_MISMATCH');

  if (Array.isArray(target_observation?.contradiction_refs) && target_observation.contradiction_refs.length > 0) {
    failures.push('TARGET_OBSERVATION_CONTRADICTED');
  }

  return Object.freeze({
    valid: failures.length === 0,
    failures,
    verification_state: failures.length === 0 ? 'VERIFIED' : 'INSUFFICIENT',
    human_time_returned_established: false,
    authority: 'OUTCOME_WITNESS_RECORD_ONLY',
    execution_authorized: false,
    external_effects_permitted: false,
  });
}

export function closeAutomationExecution({
  telemetry,
  execution_id,
  receipt,
  target_observation,
  continuity_after,
}) {
  const verification = verifyAutomationOutcomeWitness({
    telemetry,
    execution_id,
    receipt,
    target_observation,
    continuity_after,
  });
  if (!verification.valid) {
    return Object.freeze({
      status: 'HALTED',
      verification,
    });
  }
  return Object.freeze({
    status: 'VERIFIED_COMPLETE',
    verification,
    telemetry_patch: Object.freeze({
      outcome_verification_state: 'VERIFIED',
      continuity_after_id: continuity_after.continuity_state_id,
      human_time_returned_established: false,
    }),
  });
}