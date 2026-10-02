export const INTELLIGENCE_ORCHESTRATOR_VERSION = 'reality-intelligence-orchestrator-v0.1';

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function requireField(value, code) {
  if (!value) throw new Error(code);
}

export function createCapabilitySnapshot({ systems = [], observedAt = new Date().toISOString() } = {}) {
  return Object.freeze({
    snapshot_version: 'reality-capability-snapshot-v0.1',
    observed_at: observedAt,
    systems: systems.map(clone),
  });
}

export function discoverWorkFromCapabilities({
  capabilitySnapshot,
  objective = 'Find useful, evidence-grounded work that can be safely proposed.',
} = {}) {
  requireField(capabilitySnapshot?.snapshot_version, 'CAPABILITY_SNAPSHOT_REQUIRED');

  const work = [];
  for (const system of capabilitySnapshot.systems || []) {
    for (const capability of system.capabilities || []) {
      if (capability.readable === false) continue;
      work.push({
        work_id: `DISC-${system.system_id}-${capability.capability_id}`,
        system_id: system.system_id,
        capability_id: capability.capability_id,
        objective,
        evidence_basis: clone(capability.evidence_basis || []),
        current_state: clone(capability.current_state ?? null),
        unknowns: clone(capability.unknowns || []),
        proposed_action: clone(capability.proposed_action || null),
        authority: 'DISCOVERY_ONLY',
        status: 'PROPOSED',
      });
    }
  }

  return {
    discovery_version: 'reality-discovery-v0.1',
    snapshot_version: capabilitySnapshot.snapshot_version,
    work,
  };
}

export function authorizeDiscoveredWork({ work, authorization = {} } = {}) {
  requireField(work?.work_id, 'WORK_ITEM_REQUIRED');
  if (authorization.explicit !== true) {
    return {
      ...clone(work),
      authority: 'DISCOVERY_ONLY',
      status: 'AWAITING_EXPLICIT_AUTHORIZATION',
    };
  }

  return {
    ...clone(work),
    authority: 'EXECUTION_AUTHORIZED',
    authorization_ref: authorization.authorization_ref || null,
    status: 'AUTHORIZED',
  };
}

export async function executeAuthorizedWork({
  work,
  executionBridge,
} = {}) {
  requireField(work?.work_id, 'WORK_ITEM_REQUIRED');
  requireField(executionBridge?.execute, 'EXECUTION_BRIDGE_REQUIRED');

  if (work.authority !== 'EXECUTION_AUTHORIZED' || work.status !== 'AUTHORIZED') {
    throw new Error('EXECUTION_AUTHORITY_REQUIRED');
  }

  const result = await executionBridge.execute({
    work: clone(work),
    requested_by: 'reality-intelligence-orchestrator-v0.1',
  });

  return {
    execution_version: 'reality-intelligence-execution-v0.1',
    work_id: work.work_id,
    result: clone(result),
  };
}

export function reconcileExecution({
  execution,
  verification,
} = {}) {
  requireField(execution?.work_id, 'EXECUTION_REQUIRED');
  requireField(verification?.status, 'VERIFICATION_REQUIRED');

  const verified = verification.status === 'VERIFIED';
  const unverified = verification.status === 'EXECUTED_UNVERIFIED';

  return {
    reconciliation_version: 'reality-intelligence-reconciliation-v0.1',
    work_id: execution.work_id,
    execution_status: verified ? 'VERIFIED' : unverified ? 'EXECUTED_UNVERIFIED' : 'NOT_VERIFIED',
    evidence_refs: clone(verification.evidence_refs || []),
    independent_readback: verification.independent_readback === true,
    authority_preserved: verification.authority_preserved !== false,
  };
}
