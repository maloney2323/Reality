import test from 'node:test';
import assert from 'node:assert/strict';
import { CONSTITUTION, evaluateConstitution } from '../src/reality-constitution.js';

const base = {
  proposal: {
    authorization: { authorized: true, scope: 'repository', authorityId: 'owner-1' },
    requiredScope: 'repository',
    risk: 'low',
    amountCents: 1000,
  },
  state: { evidenceSufficient: true, contradiction: false },
};

test('permits a fully satisfied bounded action', () => {
  const result = evaluateConstitution(base);
  assert.equal(result.allowed, true);
  assert.equal(result.decision, 'ACT');
  assert.equal(result.attested, true);
});

test('blocks insufficient evidence', () => {
  const result = evaluateConstitution({ ...base, state: { evidenceSufficient: false } });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'INSUFFICIENT_EVIDENCE');
  assert.equal(result.decision, 'INVESTIGATE');
});

test('blocks contradictory evidence', () => {
  const result = evaluateConstitution({ ...base, state: { evidenceSufficient: true, contradiction: true } });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'CONTRADICTORY_EVIDENCE');
});

test('blocks missing authority', () => {
  const result = evaluateConstitution({ ...base, proposal: { ...base.proposal, authorization: { authorized: false, scope: 'repository' } } });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'EXPLICIT_AUTHORIZATION_REQUIRED');
});

test('blocks scope mismatch', () => {
  const result = evaluateConstitution({ ...base, proposal: { ...base.proposal, authorization: { authorized: true, scope: 'project' } } });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'AUTHORITY_SCOPE_MISMATCH');
});

test('blocks constitutional override attempts from intelligence', () => {
  const result = evaluateConstitution({ ...base, proposal: { ...base.proposal, overrideConstitution: true } });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'CONSTITUTION_MUTATION_ATTEMPT');
});

test('blocks risk and financial limit violations', () => {
  assert.equal(evaluateConstitution({ ...base, proposal: { ...base.proposal, risk: 'high' } }).reason, 'RISK_LIMIT_EXCEEDED');
  assert.equal(evaluateConstitution({ ...base, proposal: { ...base.proposal, amountCents: 50001 } }).reason, 'FINANCIAL_LIMIT_EXCEEDED');
});

test('blocks discovery beyond the constitutional budget', () => {
  const result = evaluateConstitution({ ...base, proposal: { ...base.proposal, discoveryCostCents: 1001 } });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'DISCOVERY_BUDGET_EXCEEDED');
  assert.equal(result.decision, 'WAIT');
});

test('constitution is immutable at runtime', () => {
  assert.equal(Object.isFrozen(CONSTITUTION), true);
  assert.equal(Object.isFrozen(CONSTITUTION.limits), true);
});

test('non-action decisions remain explicit and attested', () => {
  const result = evaluateConstitution({ ...base, proposal: { ...base.proposal, requestedDecision: 'ESCALATE' } });
  assert.equal(result.allowed, false);
  assert.equal(result.decision, 'ESCALATE');
  assert.equal(result.attested, true);
});
