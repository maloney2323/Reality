import {
  createCapabilitySnapshot,
  discoverWorkFromCapabilities,
  authorizeDiscoveredWork,
  executeAuthorizedWork,
  reconcileExecution,
} from '../src/reality-intelligence-orchestrator-v0.1.js';

export const BENCHMARK_VERSION = 'reality-intelligence-orchestrator-benchmark-v0.1';

export async function runIntelligenceOrchestratorBenchmark() {
  const snapshot = createCapabilitySnapshot({
    systems: [{
      system_id: 'github',
      capabilities: [{
        capability_id: 'read_repository',
        readable: true,
        evidence_basis: ['GITHUB_AUTHENTICATED'],
        current_state: { repository: 'Reality' },
        unknowns: ['which repository change is highest value'],
        proposed_action: { type: 'inspect' },
      }, {
        capability_id: 'write_repository',
        readable: true,
        evidence_basis: ['GITHUB_AUTHENTICATED'],
        current_state: { repository: 'Reality' },
        unknowns: [],
        proposed_action: { type: 'create_file' },
      }],
    }],
  });

  const discovery = discoverWorkFromCapabilities({ capabilitySnapshot: snapshot });
  if (discovery.work.length !== 2) throw new Error('DISCOVERY_FAILED');

  const waiting = authorizeDiscoveredWork({ work: discovery.work[0] });
  if (waiting.status !== 'AWAITING_EXPLICIT_AUTHORIZATION') throw new Error('AUTHORITY_LEAK');

  const authorized = authorizeDiscoveredWork({
    work: discovery.work[0],
    authorization: { explicit: true, authorization_ref: 'AUTH-001' },
  });

  let executedInput = null;
  const execution = await executeAuthorizedWork({
    work: authorized,
    executionBridge: {
      async execute(input) {
        executedInput = input;
        return { status: 'EXECUTED', receipt_ref: 'RECEIPT-001' };
      },
    },
  });

  const reconciliation = reconcileExecution({
    execution,
    verification: {
      status: 'VERIFIED',
      evidence_refs: ['READBACK-001'],
      independent_readback: true,
      authority_preserved: true,
    },
  });

  return {
    benchmark_version: BENCHMARK_VERSION,
    discovered: discovery.work.length,
    waiting_status: waiting.status,
    executed: execution.result.status,
    executed_requested_by: executedInput.requested_by,
    reconciliation: reconciliation.execution_status,
  };
}

export async function assertIntelligenceOrchestratorBenchmark(result) {
  if (result.benchmark_version !== BENCHMARK_VERSION) throw new Error('BENCHMARK_VERSION_MISMATCH');
  if (result.discovered !== 2) throw new Error('DISCOVERY_COUNT_INVALID');
  if (result.waiting_status !== 'AWAITING_EXPLICIT_AUTHORIZATION') throw new Error('AUTHORIZATION_GATE_FAILED');
  if (result.executed !== 'EXECUTED') throw new Error('EXECUTION_FAILED');
  if (result.reconciliation !== 'VERIFIED') throw new Error('VERIFICATION_FAILED');
}
