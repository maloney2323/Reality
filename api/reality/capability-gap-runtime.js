export const maxDuration = 60;

/**
 * Runtime proof surface for Capability-Gap Closure v1.
 *
 * This endpoint is intentionally a bounded internal runtime probe:
 * - cognition derives the missing capability from a Universe snapshot;
 * - capability acquisition is authorized only for an isolated sandbox;
 * - synthesis, verification, merge, and registration are deterministic in-memory adapters;
 * - no external connector is invoked;
 * - production_graph_write_permitted remains false.
 *
 * This proves the live execution path without pretending that an external
 * business action was authorized or executed.
 */
import { runAutonomousClosurePass } from '../../src/reality-autonomous-closure-orchestrator-v0.1.js';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function buildRuntimeFixture() {
  const capabilityId = 'runtime.proof.capability';
  const workItem = {
    id: 'runtime-proof-work-item',
    continuity_root_id: 'runtime-proof-continuity',
    worldline_id: 'runtime-proof-worldline',
    status: 'BLOCKED',
    missing_capabilities: [capabilityId],
    capability_contract: {
      input_schema: { type: 'object', required: ['input'] },
      output_schema: { type: 'object', required: ['result'] },
      verification_suite_ref: 'verification-suite:runtime-capability-gap-v1',
    },
  };

  const universe = {
    worldId: 'runtime-proof-world',
    continuityRootId: workItem.continuity_root_id,
    worldlineId: workItem.worldline_id,
    particles: [{
      id: 'runtime-proof-particle',
      claim: 'A blocked work item requires runtime.proof.capability.',
      kind: 'OBSERVED',
    }],
    evidence: [{
      id: 'runtime-proof-evidence',
      claim: 'runtime.proof.capability is not registered.',
      kind: 'OBSERVED',
    }],
    capabilities: [],
    work: [workItem],
    authority: [],
    outcomes: [],
  };

  const synthesis = {
    async run({ gap, experiment, production_graph_write_permitted }) {
      if (production_graph_write_permitted !== false) {
        throw new Error('PRODUCTION_GRAPH_WRITE_MUST_REMAIN_DISABLED');
      }
      return {
        capability_id: gap.capability_id,
        implementation: 'deterministic-runtime-probe',
        sandbox_worldline_id: experiment.ephemeral_worldline_id,
        external_effects: false,
      };
    },
  };

  const sandboxVerifier = {
    async verify({ capability, experiment }) {
      return {
        frozen_regression: {
          passed: true,
          evidence_ref: 'runtime-proof:frozen-regression',
        },
        isolated_verification: {
          verified: true,
          evidence_ref: 'runtime-proof:isolated-verification',
          external_effects: capability.external_effects === false,
        },
        capability_signature: `capability-signature:${experiment.experiment_hash.slice(0, 24)}`,
      };
    },
  };

  const registry = [];
  const capabilityRegistry = {
    register(record) {
      registry.push({ ...record, registry_scope: 'IN_MEMORY_RUNTIME_PROBE' });
      return {
        registered: true,
        registry_scope: 'IN_MEMORY_RUNTIME_PROBE',
        capability_id: record.capability?.capability_id || capabilityId,
      };
    },
  };

  const mergeVerifier = {
    async verify(experiment) {
      return {
        approved: true,
        basis: 'independent-runtime-probe-verifier',
        verification_hash: experiment.verification_hash,
      };
    },
    async merge(experiment) {
      return {
        merged: true,
        merge_scope: 'EPHEMERAL_RUNTIME_PROBE_ONLY',
        production_graph_write_permitted: experiment.production_graph_write_permitted === true,
      };
    },
  };

  return {
    universe,
    workItem,
    historicalFailureRefs: ['runtime-proof:historical-failure-1'],
    verificationSuiteRef: 'verification-suite:runtime-capability-gap-v1',
    authorization: {
      authorizationRef: 'runtime-probe:sandbox-authorization-v1',
      authorizedBy: 'runtime-proof-test-harness',
    },
    synthesis,
    sandboxVerifier,
    mergeVerifier,
    capabilityRegistry,
    registry,
  };
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const fixture = buildRuntimeFixture();
    const result = await runAutonomousClosurePass(fixture);

    const trace = {
      ok: true,
      runtime: 'LIVE_CAPABILITY_GAP_CLOSURE_V1',
      state: result.state,
      gap_detected: Boolean(result.gap?.gap_id),
      capability_gap_projection: result.capability_gap_projection || null,
      sandbox_state: result.experiment?.state || null,
      sandbox_worldline: result.experiment?.ephemeral_worldline_id || null,
      production_graph_write_permitted: result.experiment?.production_graph_write_permitted === true,
      verification: result.experiment?.verification_bundle ? {
        frozen_regression: result.experiment.verification_bundle.frozen_regression?.passed === true,
        isolated_verification: result.experiment.verification_bundle.isolated_verification?.verified === true,
        capability_signature_present: Boolean(result.experiment.verification_bundle.capability_signature),
      } : null,
      registration_scope: result.registration?.registration?.registry_scope || null,
      reactivation_work_item_id: result.reactivation?.original_work_item_id || null,
      external_execution: false,
    };

    return res.status(200).json({ ...trace, result });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      runtime: 'LIVE_CAPABILITY_GAP_CLOSURE_V1',
      error: error?.message || 'RUNTIME_PROBE_FAILED',
    });
  }
}
