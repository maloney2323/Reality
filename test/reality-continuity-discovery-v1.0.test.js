import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverDormantContinuity } from '../src/reality-continuity-discovery-v1.0.js';

const dormant = [
  {
    continuity_root_id: 'continuity:market-validation',
    payload: {
      continuity_state: 'WAITING',
      work_item_id: 'work:market-validation',
      objective: 'Validate the customer problem',
      continuation_condition: 'NEW_CUSTOMER_EVIDENCE',
      domain: 'market',
    },
  },
  {
    continuity_root_id: 'continuity:billing',
    payload: {
      continuity_state: 'WAITING',
      work_item_id: 'work:billing',
      objective: 'Reconcile customer invoices',
      continuation_condition: 'NEW_BILLING_EVIDENCE',
      domain: 'finance',
    },
  },
];

test('discovers dormant continuity without being given its root id', () => {
  const result = discoverDormantContinuity({
    evidence: {
      id: 'evidence:new-customer-interview',
      title: 'New customer evidence',
      description: 'Customer interview provides evidence about the customer problem',
      continuation_condition: 'NEW_CUSTOMER_EVIDENCE',
      domain: 'market',
    },
    dormantContinuities: dormant,
  });
  assert.equal(result.status, 'CANDIDATES_FOUND');
  assert.equal(result.candidates[0].continuity_root_id, 'continuity:market-validation');
  assert.equal(result.candidates[0].matched_signals.continuation_condition, true);
  assert.equal(result.execution_authorized, false);
});

test('does not manufacture a continuity match from unrelated evidence', () => {
  const result = discoverDormantContinuity({
    evidence: {
      id: 'evidence:unrelated',
      title: 'Server temperature',
      description: 'Infrastructure temperature reading',
      domain: 'infrastructure',
    },
    dormantContinuities: dormant,
  });
  assert.equal(result.status, 'NO_MATCH');
  assert.equal(result.candidate_count, 0);
});

test('preserves ambiguity when multiple dormant roots match equally', () => {
  const ambiguous = [
    ...dormant,
    {
      continuity_root_id: 'continuity:second-market',
      payload: {
        continuity_state: 'DEFERRED',
        work_item_id: 'work:market-secondary',
        objective: 'Validate the customer problem',
        continuation_condition: 'NEW_CUSTOMER_EVIDENCE',
        domain: 'market',
      },
    },
  ];
  const result = discoverDormantContinuity({
    evidence: {
      id: 'evidence:shared-market',
      description: 'New customer evidence about the customer problem',
      continuation_condition: 'NEW_CUSTOMER_EVIDENCE',
      domain: 'market',
    },
    dormantContinuities: ambiguous,
  });
  assert.equal(result.candidate_count, 2);
  assert.equal(result.ambiguity_preserved, true);
});
