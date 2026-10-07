// Reality Governed Operation Proof v1.0
// Synthetic, zero-side-effect proof harness for the complete governed loop.
// This module never grants authority and never performs external work.

import crypto from 'node:crypto';
import {
  createOperationEvent,
  validateOperationAuthority,
  validateExecutionReplay,
  classifyOperationOutcome,
  createVerifiedLearningSignal,
  hashOperationScope,
} from './reality-operation-ledger-v1.0.js';

export const REALITY_GOVERNED_OPERATION_PROOF_VERSION = 'reality-governed-operation-proof-v1.0';

export function createSyntheticOperation({
  operation_id = `proof:${crypto.randomUUID()}`,
  proposal_id = `proposal:${crypto.randomUUID()}`,
  target = 'sandbox:reality-proof',
  action_type = 'write_test_marker',
  parameters = { marker: 'reality-proof' },
  constraints = { max_writes: 1 },
  side_effects = [],
} = {}) {
  const operation = Object.freeze({
    operation_id, proposal_id, target, action_type,
    parameters: Object.freeze({...parameters}),
    constraints: Object.freeze({...constraints}),
    side_effects: Object.freeze([...side_effects]),
  });
  return Object.freeze({...operation, scope_hash: hashOperationScope(operation)});
}

export function createOneTimeSyntheticAuthority(operation, {
  authority_ref = `authority:${crypto.randomUUID()}`,
  principal = 'synthetic-human-approver',
  verification_method = 'fresh-sandbox-observation',
  expires_at = '2099-01-01T00:00:00.000Z',
} = {}) {
  return Object.freeze({
    operation_id: operation.operation_id,
    proposal_id: operation.proposal_id,
    target: operation.target,
    action_type: operation.action_type,
    parameters: Object.freeze({...operation.parameters}),
    constraints: Object.freeze({...operation.constraints}),
    side_effects: Object.freeze([...operation.side_effects]),
    authority_ref, principal, verification_method, expires_at,
    allow_reuse: false,
    delegation: false,
  });
}

export function runSyntheticGovernedOperationProof() {
  const operation = createSyntheticOperation();
  const authority = createOneTimeSyntheticAuthority(operation);
  const authorization = validateOperationAuthority({ operation, authorization: authority });
  if (!authorization.valid) throw new Error(`PROOF_AUTHORITY_REJECTED:${authorization.reason}`);

  const events = [];
  const push = (event) => { events.push(event); return event; };

  push(createOperationEvent({
    operation_id: operation.operation_id,
    stage: 'question',
    outcome: 'not_started',
    payload: { question: 'Can Reality complete one bounded synthetic operation safely?' },
  }));
  push(createOperationEvent({
    operation_id: operation.operation_id,
    stage: 'evidence',
    outcome: 'observed',
    payload: { source: 'synthetic-proof-fixture', scope_hash: operation.scope_hash },
    evidence_refs: ['evidence:synthetic-fixture'],
  }));
  push(createOperationEvent({
    operation_id: operation.operation_id,
    stage: 'reconstructed_state',
    outcome: 'proposed',
    payload: { state: 'bounded-sandbox-available' },
  }));
  push(createOperationEvent({
    operation_id: operation.operation_id,
    stage: 'decision',
    outcome: 'proposed',
    payload: { proposal_id: operation.proposal_id, scope_hash: operation.scope_hash },
  }));
  push(createOperationEvent({
    operation_id: operation.operation_id,
    stage: 'authority',
    outcome: 'authorized',
    authority_ref: authority.authority_ref,
    payload: { authority: authority.authority_ref, principal: authority.principal },
  }));
  push(createOperationEvent({
    operation_id: operation.operation_id,
    stage: 'proposed_action',
    outcome: 'proposed',
    authority_ref: authority.authority_ref,
    payload: { scope_hash: operation.scope_hash },
  }));

  const execution_id = `execution:${crypto.randomUUID()}`;
  const replayCheck = validateExecutionReplay({
    operation_id: operation.operation_id,
    execution_id,
    priorEvents: events,
  });
  if (!replayCheck.valid) throw new Error(`PROOF_REPLAY_REJECTED:${replayCheck.reason}`);

  push(createOperationEvent({
    operation_id: operation.operation_id,
    stage: 'executed_action',
    outcome: 'executing',
    authority_ref: authority.authority_ref,
    payload: { execution_id, side_effects: 'NONE_EXTERNAL' },
  }));

  const independentObservation = Object.freeze({
    observation_id: `observation:${crypto.randomUUID()}`,
    independent: true,
    verified: true,
    contradicted: false,
    source: 'synthetic-independent-observer',
    observed: { marker: 'reality-proof' },
  });
  push(createOperationEvent({
    operation_id: operation.operation_id,
    stage: 'independent_observation',
    outcome: 'verified',
    authority_ref: authority.authority_ref,
    payload: independentObservation,
    evidence_refs: [independentObservation.observation_id],
  }));

  const outcome = classifyOperationOutcome({
    independentObservation,
    observedResult: independentObservation.observed,
    expectedResult: { marker: 'reality-proof' },
  });
  push(createOperationEvent({
    operation_id: operation.operation_id,
    stage: 'outcome',
    outcome,
    authority_ref: authority.authority_ref,
    payload: { outcome },
    evidence_refs: [independentObservation.observation_id],
  }));

  const learning = createVerifiedLearningSignal({
    operation_id: operation.operation_id,
    outcome,
    independentObservation,
    learning: { lesson: 'bounded synthetic operation completed and independently verified' },
    evidence_refs: [independentObservation.observation_id],
  });
  push(createOperationEvent({
    operation_id: operation.operation_id,
    stage: 'learning_signal',
    outcome: 'verified',
    authority_ref: authority.authority_ref,
    payload: learning,
    evidence_refs: learning.evidence_refs,
  }));

  return Object.freeze({
    version: REALITY_GOVERNED_OPERATION_PROOF_VERSION,
    operation_id: operation.operation_id,
    proposal_id: operation.proposal_id,
    scope_hash: operation.scope_hash,
    authority_ref: authority.authority_ref,
    execution_id,
    observation_id: independentObservation.observation_id,
    outcome,
    learning_signal_id: learning.signal_id,
    external_side_effects: false,
    stages: Object.freeze(events),
    status: 'PROVEN_SYNTHETIC_LOOP',
  });
}
