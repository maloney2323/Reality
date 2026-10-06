import crypto from 'node:crypto';

export const RECURSIVE_DRYFIRE_WORLD_VERSION = '0.1.1';
const sha = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const freeze = (value) => Object.freeze(value);

export function createRecursiveDryfireWorld() {
  const worldId = 'dryfire:fulfillment:recursive-closure-v0.1';
  const continuityRootId = 'root:dryfire:fulfillment:recursive-closure-v0.1';
  const worldlineId = 'worldline:dryfire:baseline';
  const workItem = {
    id: 'work:shipment-8472', continuity_root_id: continuityRootId, worldline_id: worldlineId,
    type: 'shipment_exception_resolution', status: 'BLOCKED',
    required_capability: 'carrier-status-lookup', required_capabilities: ['carrier-status-lookup'],
    missing_capabilities: ['carrier-status-lookup'],
    objective: 'Resolve shipment 8472 using verified carrier status.',
  };
  const evidence = [
    { evidence_id: 'evidence:shipment-8472:dispatch', kind: 'OBSERVED', effective_time: '2026-10-01T09:00:00Z', claim: 'Shipment 8472 was dispatched.' },
    { evidence_id: 'evidence:shipment-8472:delay', kind: 'OBSERVED', effective_time: '2026-10-01T13:00:00Z', claim: 'Shipment 8472 was delayed.' },
    { evidence_id: 'evidence:shipment-8472:contradiction', kind: 'OBSERVED', effective_time: '2026-10-01T14:00:00Z', claim: 'A stale source reports shipment 8472 delivered.', status: 'CONTRADICTED', contradiction_of: 'evidence:shipment-8472:delay' },
  ];
  const capabilityGap = {
    gap_id: 'gap:carrier-status-lookup', type: 'MISSING_CAPABILITY', capability_id: 'carrier-status-lookup',
    blocked_work_item_id: workItem.id, historical_failure_ref: 'failure:carrier-status-api-missing',
  };
  const sandbox = {
    sandbox_id: 'sandbox:carrier-status-lookup:attempt-1', ephemeral_worldline_id: 'worldline:dryfire:sandbox:carrier-status-lookup',
    attempt: 1, frozen_regression_ref: 'regression:carrier-status-lookup:v0.1', production_graph_write_permitted: false,
  };
  const capability = { capability_id: 'carrier-status-lookup', version: '0.1.0', status: 'VERIFIED', source_ref: sandbox.sandbox_id, verification_ref: 'verification:carrier-status-lookup:v0.1' };
  const execution = {
    execution_receipt_hash: sha({ work_item_id: workItem.id, capability_id: capability.capability_id, action: 'lookup_carrier_status' }),
    work_item_id: workItem.id, capability_id: capability.capability_id, status: 'SUCCEEDED',
  };
  const targetObservation = {
    observation_id: 'observation:shipment-8472:carrier-readback',
    execution_receipt_hash: execution.execution_receipt_hash,
    claim: 'Carrier independently reports shipment 8472 delivered at 16:42Z.', source: 'independent-carrier-readback',
  };
  const independentVerification = {
    verification_id: 'verification:shipment-8472:independent',
    target_observation_id: targetObservation.observation_id, method: 'independent_source_reconciliation', result: 'CONFIRMED',
  };
  const verifiedOutcome = {
    outcome_id: 'outcome:shipment-8472:verified', independent_verification_id: independentVerification.verification_id,
    status: 'VERIFIED_OUTCOME', claim: 'Shipment 8472 delivery status is verified as delivered.',
  };
  return freeze({ version: RECURSIVE_DRYFIRE_WORLD_VERSION, worldId, continuityRootId, worldlineId,
    workItem: freeze(workItem), evidence: freeze(evidence.map(freeze)), capabilityGap: freeze(capabilityGap),
    sandbox: freeze(sandbox), capability: freeze(capability), execution: freeze(execution),
    targetObservation: freeze(targetObservation), independentVerification: freeze(independentVerification),
    verifiedOutcome: freeze(verifiedOutcome),
    adversarialConditions: freeze(['MISSING_CAPABILITY','CONTRADICTION','TEMPORAL_TRAP','SANDBOX_ISOLATION','INDEPENDENT_VERIFICATION']),
  });
}

export function validateDryfireWorld(world) {
  if (!world?.workItem?.id) throw new Error('WORK_ITEM_REQUIRED');
  if (world.workItem.status !== 'BLOCKED') throw new Error('WORK_ITEM_MUST_START_BLOCKED');
  if (world.workItem.required_capability !== world.capabilityGap.capability_id) throw new Error('WORK_CAPABILITY_GAP_MISMATCH');
  if (!world.workItem.missing_capabilities?.includes(world.capabilityGap.capability_id)) throw new Error('CAPABILITY_GAP_NOT_REPRESENTED_IN_WORK');
  if (world.capabilityGap.type !== 'MISSING_CAPABILITY') throw new Error('DRYFIRE_REQUIRES_CAPABILITY_GAP');
  if (world.sandbox.production_graph_write_permitted !== false) throw new Error('SANDBOX_MUST_BE_ISOLATED');
  if (world.capability.status !== 'VERIFIED') throw new Error('CAPABILITY_MUST_BE_VERIFIED');
  if (world.targetObservation.source === 'executor') throw new Error('TARGET_OBSERVATION_MUST_BE_INDEPENDENT');
  if (world.targetObservation.execution_receipt_hash !== world.execution.execution_receipt_hash) throw new Error('TARGET_OBSERVATION_EXECUTION_MISMATCH');
  if (world.independentVerification.target_observation_id !== world.targetObservation.observation_id) throw new Error('INDEPENDENT_VERIFICATION_TARGET_MISMATCH');
  if (world.verifiedOutcome.independent_verification_id !== world.independentVerification.verification_id) throw new Error('VERIFIED_OUTCOME_VERIFICATION_MISMATCH');
  if (world.independentVerification.result !== 'CONFIRMED') throw new Error('INDEPENDENT_VERIFICATION_REQUIRED');
  if (world.verifiedOutcome.status !== 'VERIFIED_OUTCOME') throw new Error('VERIFIED_OUTCOME_REQUIRED');
  return { valid: true, world_id: world.worldId, original_work_item_id: world.workItem.id, capability_id: world.capability.capability_id, adversarial_conditions: world.adversarialConditions };
}
