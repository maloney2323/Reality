import test from 'node:test';
import assert from 'node:assert/strict';
import { runAutonomousClosurePass } from '../src/reality-autonomous-closure-orchestrator-v0.1.js';

test('capability-gap runtime closure reaches reactivation without external execution', async () => {
  const capabilityId = 'runtime.test.capability';
  const workItem = {
    id: 'runtime-test-work',
    continuity_root_id: 'runtime-test-continuity',
    worldline_id: 'runtime-test-worldline',
    status: 'BLOCKED',
    missing_capabilities: [capabilityId],
    capability_contract: { verification_suite_ref: 'verification-suite:runtime-test' },
  };

  const result = await runAutonomousClosurePass({
    universe: {
      worldId: 'runtime-test-world',
      continuityRootId: workItem.continuity_root_id,
      worldlineId: workItem.worldline_id,
      particles: [{ id: 'p1', claim: 'blocked work requires runtime.test.capability', kind: 'OBSERVED' }],
      evidence: [{ id: 'e1', claim: 'runtime.test.capability is missing', kind: 'OBSERVED' }],
      capabilities: [],
      work: [workItem],
    },
    workItem,
    historicalFailureRefs: ['failure:runtime-test'],
    verificationSuiteRef: 'verification-suite:runtime-test',
    authorization: { authorizationRef: 'auth:runtime-test-sandbox', authorizedBy: 'test-harness' },
    synthesis: {
      async run({ production_graph_write_permitted }) {
        assert.equal(production_graph_write_permitted, false);
        return { capability_id: capabilityId, external_effects: false };
      },
    },
    sandboxVerifier: {
      async verify() {
        return {
          frozen_regression: { passed: true },
          isolated_verification: { verified: true },
          capability_signature: 'sig:runtime-test',
        };
      },
    },
    mergeVerifier: {
      async verify() { return { approved: true }; },
      async merge(experiment) {
        return { merged: true, scope: 'ephemeral', production_graph_write_permitted: experiment.production_graph_write_permitted };
      },
    },
    capabilityRegistry: {
      register() { return { registered: true, registry_scope: 'IN_MEMORY_TEST' }; },
    },
  });

  assert.equal(result.state, 'REACTIVATED');
  assert.equal(result.capability_gap_projection.projection_type, 'CAPABILITY_GAP');
  assert.equal(result.capability_gap_projection.authority, null);
  assert.equal(result.capability_gap_projection.execution_authorized, false);
  assert.equal(result.experiment.production_graph_write_permitted, false);
  assert.equal(result.experiment.verification_bundle.frozen_regression.passed, true);
  assert.equal(result.experiment.verification_bundle.isolated_verification.verified, true);
  assert.equal(result.registration.registration.registry_scope, 'IN_MEMORY_TEST');
  assert.equal(result.reactivation.original_work_item_id, workItem.id);
});
