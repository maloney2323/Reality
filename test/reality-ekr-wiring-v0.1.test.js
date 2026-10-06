import assert from 'node:assert/strict';
import {
  admitVerifiedOutcomeToEKR,
  reconcileExecution,
} from '../src/reality-intelligence-orchestrator-v0.1.js';

const execution = {
  work_id: 'WORK-001',
  result: {
    status: 'EXECUTED',
    receipt_ref: 'EXEC-RECEIPT-001',
    continuity_root_id: 'cr:001',
    worldline_id: 'wl:001',
  },
};

const verification = {
  status: 'VERIFIED',
  evidence_refs: ['OBS-001'],
  independent_readback: true,
  authority_preserved: true,
  target_observation_ref: 'OBS-001',
  independent_verification_ref: 'IV-001',
  verified_outcome_ref: 'OUTCOME-001',
  ekr: {
    worldId: 'WORLD-001',
    authorityRefs: ['AUTH-001'],
    proposition: {
      subject: 'WORK-001',
      predicate: 'completed',
      object: true,
      statement: 'Work 001 completed as authorized.',
    },
    falsifiabilityConditions: [{ type: 'contradicting_target_observation' }],
  },
};

const reconciliation = reconcileExecution({ execution, verification });

assert.equal(reconciliation.execution_status, 'VERIFIED');
assert.equal(reconciliation.ekr_admission.status, 'ADMITTED');
assert.equal(reconciliation.ekr_admission.derived_state.epistemic_state, 'RESOLUTION');
assert.equal(reconciliation.ekr_admission.derived_state.verification_level, 'verified_outcome');
assert.equal(reconciliation.ekr_admission.authority_granted, false);
assert.equal(reconciliation.ekr_admission.execution_authorized, false);
assert.equal(reconciliation.ekr_admission.assertion.verification_lineage.execution_receipt_ref, 'EXEC-RECEIPT-001');
assert.equal(reconciliation.ekr_admission.assertion.verification_lineage.target_observation_ref, 'OBS-001');
assert.equal(reconciliation.ekr_admission.assertion.verification_lineage.independent_verification_ref, 'IV-001');

const incomplete = reconcileExecution({
  execution,
  verification: {
    ...verification,
    independent_readback: false,
  },
});
assert.equal(incomplete.ekr_admission.status, 'NOT_ELIGIBLE');
assert.equal(incomplete.ekr_admission.reason, 'INDEPENDENT_VERIFICATION_REQUIRED');

const missingLineage = reconcileExecution({
  execution,
  verification: {
    ...verification,
    target_observation_ref: undefined,
  },
});
assert.equal(missingLineage.ekr_admission.status, 'INSUFFICIENT_EVIDENCE');
assert.equal(missingLineage.ekr_admission.reason, 'COMPLETE_VERIFICATION_LINEAGE_REQUIRED');

const unverified = reconcileExecution({
  execution,
  verification: {
    ...verification,
    status: 'EXECUTED_UNVERIFIED',
  },
});
assert.equal(unverified.ekr_admission.status, 'NOT_ELIGIBLE');
assert.equal(unverified.ekr_admission.reason, 'OUTCOME_NOT_VERIFIED');

console.log('EKR wiring v0.1: PASS');
