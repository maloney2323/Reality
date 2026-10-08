import test from 'node:test';
import assert from 'node:assert/strict';
import { AUTONOMOUS_CAPABILITY_LOOP_VERSION, detectCapabilityGap, confirmCapabilityGap, createSandboxExperiment, authorizeSandboxExperiment, validateSandboxResult } from '../src/reality-autonomous-capability-loop-v1.0.js';
import { discoverAutonomousWork, CAPABILITY_GAP_DETECTOR_VERSION } from '../src/reality-capability-gap-detector-v1.0.js';
import { AUTONOMOUS_CLOSURE_VERSION } from '../src/reality-autonomous-closure-orchestrator-v1.0.js';

test('v1.0 capability loop preserves governance', () => {
  assert.equal(AUTONOMOUS_CAPABILITY_LOOP_VERSION, '1.0.0');
  const gap = detectCapabilityGap({ consequence: { gap: 'MISSING_CAPABILITY', subject: 'customer_follow_up' }, workItem: { id: 'work-1', work_key: 'follow-up' } });
  const confirmed = confirmCapabilityGap(gap, { historicalFailureRefs: ['failure-1'], verificationSuiteRef: 'suite-1' });
  const experiment = createSandboxExperiment({ confirmedGap: confirmed, primaryWorldlineId: 'worldline-1' });
  assert.equal(experiment.production_graph_write_permitted, false);
  const authorized = authorizeSandboxExperiment(experiment, { authorizationRef: 'auth-1', authorizedBy: 'human-1' });
  const verified = validateSandboxResult(authorized, { synthesizedCapability: { id: 'customer_follow_up' }, frozenRegression: { passed: true }, isolatedVerification: { verified: true }, capabilitySignature: 'sig-1' });
  assert.equal(verified.state, 'SANDBOX_VERIFIED');
});

test('v1.0 work discovery is economic but cannot invent revenue', () => {
  assert.equal(CAPABILITY_GAP_DETECTOR_VERSION, 'reality-capability-gap-detector-v1.0');
  const work = discoverAutonomousWork({
    observations: [
      { id: '1', work_key: 'follow-up', occurred_at: '2026-09-01T12:00:00Z', evidence_ref: 'e1', expected_revenue: 200 },
      { id: '2', work_key: 'follow-up', occurred_at: '2026-09-15T12:00:00Z', evidence_ref: 'e2', expected_revenue: 200 },
      { id: '3', work_key: 'follow-up', occurred_at: '2026-09-29T12:00:00Z', evidence_ref: 'e3', expected_revenue: 200 },
      { id: '4', work_key: 'ops', occurred_at: '2026-09-29T13:00:00Z', evidence_ref: 'e4' },
      { id: '5', work_key: 'ops', occurred_at: '2026-09-30T13:00:00Z', evidence_ref: 'e5' }
    ],
    minRevenue: 100
  });
  assert.equal(work.length, 2);
  assert.equal(work[0].expected_revenue, 200);
  assert.equal(work[1].expected_revenue, null);
});

test('v1.0 closure is explicitly versioned', () => {
  assert.equal(AUTONOMOUS_CLOSURE_VERSION, '1.0.0');
});
