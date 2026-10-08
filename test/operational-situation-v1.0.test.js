import assert from 'node:assert/strict';
import {
  createOperationalSituation,
  transitionOperationalSituation,
  situationCanExecute,
  validateOperationalSituation,
} from '../src/operational-situation-v1.0.js';

const situation = createOperationalSituation({
  observedTrigger: {
    description: 'A customer commitment is approaching without a matching completion artifact.',
    observed_at: '2026-10-08T12:00:00.000Z',
    source: 'controlled-test',
    provenance: { source: 'test' },
  },
  consequence: {
    description: 'The commitment may be at risk.',
    materiality: 'MATERIAL',
  },
  desiredOutcome: 'Commitment is fulfilled and independently verified.',
  evidence: [{ ref: 'calendar:event-1', kind: 'calendar' }],
  uncertainty: {
    state: 'MISSING_EVIDENCE',
    confidence: 'STRONGLY_INFERRED',
    known_unknowns: ['Completion artifact is not present.'],
    blocking_questions: ['Was the commitment actually fulfilled?'],
  },
  authority: {
    status: 'REQUIRES_APPROVAL',
    required_decision_maker: 'owner',
    limits: ['Draft follow-up only until approved.'],
  },
  verification: {
    method: 'Independent readback of the external commitment record.',
  },
  closure: {
    criteria: ['Completion evidence exists.', 'Expected downstream state is observed.'],
  },
});

assert.equal(situation.state, 'OBSERVED');
assert.equal(situation.projection_type, 'OPERATIONAL_SITUATION');
assert.equal(situation.consequence.description, 'The commitment may be at risk.');
assert.equal(situation.consequence.desired_outcome, 'Commitment is fulfilled and independently verified.');
assert.equal(situation.consequence.materiality, 'MATERIAL');
assert.equal(validateOperationalSituation(situation).valid, true);

const created = transitionOperationalSituation(situation, 'SITUATION_CREATED', {
  reason: 'TRIGGER_MEETS_SITUATION_THRESHOLD',
});
const evidence = transitionOperationalSituation(created, 'EVIDENCE_ESTABLISHED', {
  reason: 'SUPPORTING_EVIDENCE_ATTACHED',
});
const uncertainty = transitionOperationalSituation(evidence, 'UNCERTAINTY_ASSESSED', {
  reason: 'UNCERTAINTY_RECORDED',
});
const authority = transitionOperationalSituation(uncertainty, 'AUTHORITY_DETERMINED', {
  reason: 'AUTHORITY_BOUNDARY_EVALUATED',
});
const proposed = transitionOperationalSituation(authority, 'ACTION_PROPOSED', {
  reason: 'SAFE_NEXT_ACTION_IDENTIFIED',
  action: { proposed: 'Draft a customer follow-up for owner approval.' },
});
assert.equal(situationCanExecute(proposed), false);

const authorized = transitionOperationalSituation(proposed, 'ACTION_AUTHORIZED', {
  reason: 'EXPLICIT_AUTHORIZATION',
  authority: { status: 'AUTHORIZED', authorization_ref: 'auth:test-1' },
});
assert.equal(situationCanExecute(authorized), true);

const executed = transitionOperationalSituation(authorized, 'ACTION_EXECUTED', {
  reason: 'GOVERNED_EXECUTION',
  action: { execution_ref: 'exec:test-1' },
});
const verified = transitionOperationalSituation(executed, 'OUTCOME_VERIFIED', {
  reason: 'INDEPENDENT_READBACK',
  verification: {
    result: 'EXPECTED_DOWNSTREAM_STATE_OBSERVED',
    verified_at: '2026-10-08T12:10:00.000Z',
    provenance: { source: 'independent-test-observer' },
  },
});
const closed = transitionOperationalSituation(verified, 'CLOSED', {
  reason: 'CLOSURE_CRITERIA_SATISFIED',
  closure: { final_state: 'RESOLVED' },
});

assert.equal(closed.state, 'CLOSED');
assert.equal(closed.transitions.length, 10);
assert.equal(validateOperationalSituation(closed).valid, true);
assert.throws(() => transitionOperationalSituation(closed, 'OBSERVED'), /TERMINAL/);
assert.throws(() => transitionOperationalSituation(verified, 'ACTION_EXECUTED'), /INVALID_TRANSITION/);

console.log('OPERATIONAL_SITUATION_V1_0_PASS');
