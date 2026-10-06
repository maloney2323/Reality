import {
  createEKRAssertion,
  createEKREvent,
  validateEKRVerification,
  foldEKRState,
} from './reality-ekr-v0.2.js';

export const INTELLIGENCE_ORCHESTRATOR_VERSION = 'reality-intelligence-orchestrator-v0.1';
export const EKR_WIRING_VERSION = 'reality-ekr-wiring-v0.1';

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

export function admitVerifiedOutcomeToEKR({ execution, verification, reconciliation, ekr = {} } = {}) {
  if (reconciliation?.execution_status !== 'VERIFIED') {
    return { status: 'NOT_ELIGIBLE', reason: 'OUTCOME_NOT_VERIFIED' };
  }
  if (verification?.independent_readback !== true) {
    return { status: 'NOT_ELIGIBLE', reason: 'INDEPENDENT_VERIFICATION_REQUIRED' };
  }

  const continuityRootId = ekr.continuityRootId || execution?.result?.continuity_root_id;
  const worldlineId = ekr.worldlineId || execution?.result?.worldline_id;
  const worldId = ekr.worldId || ekr.world_id;
  const executionReceiptRef = execution?.result?.receipt_ref;
  const targetObservationRef = verification?.target_observation_ref;
  const independentVerificationRef = verification?.independent_verification_ref;
  const verifiedOutcomeRef = verification?.verified_outcome_ref || ekr.verifiedOutcomeRef;

  if (!continuityRootId || !worldlineId || !worldId) {
    return { status: 'INSUFFICIENT_EVIDENCE', reason: 'CONTINUITY_WORLDLINE_CONTEXT_REQUIRED' };
  }
  if (!executionReceiptRef || !targetObservationRef || !independentVerificationRef || !verifiedOutcomeRef) {
    return { status: 'INSUFFICIENT_EVIDENCE', reason: 'COMPLETE_VERIFICATION_LINEAGE_REQUIRED' };
  }

  const verificationLineage = {
    execution_receipt_ref: executionReceiptRef,
    target_observation_ref: targetObservationRef,
    independent_verification_ref: independentVerificationRef,
    verified_outcome_ref: verifiedOutcomeRef,
  };

  validateEKRVerification({
    verificationLevel: 'verified_outcome',
    verificationLineage,
    eventType: 'VERIFICATION_CONFIRMED',
  });

  const assertion = createEKRAssertion({
    ekrId: ekr.ekrId || `ekr:${execution.work_id}:${verifiedOutcomeRef}`,
    continuityRootId,
    worldlineId,
    worldId,
    proposition: ekr.proposition || {
      statement: ekr.statement || `Verified outcome for work ${execution.work_id}`,
      subject: execution.work_id,
      predicate: 'verified_outcome',
      object: true,
    },
    claimScope: ekr.claimScope || { work_id: execution.work_id },
    assertedAt: ekr.assertedAt || new Date().toISOString(),
    evidenceLineage: {
      evidence_refs: verification.evidence_refs || [],
      work_refs: [execution.work_id],
      authority_refs: ekr.authorityRefs || [],
      execution_refs: [executionReceiptRef],
      target_observation_refs: [targetObservationRef],
      independent_verification_refs: [independentVerificationRef],
    },
    reconstructionLineage: ekr.reconstructionLineage || {},
    verificationLineage,
    confidenceBasis: ekr.confidenceBasis || {
      independent_verification: true,
      evidence_refs: verification.evidence_refs || [],
    },
    applicabilityBasis: ekr.applicabilityBasis || { status: 'UNKNOWN' },
    falsifiabilityConditions: ekr.falsifiabilityConditions || [],
  });

  const assertedEvent = createEKREvent({
    eventId: `${assertion.id}:asserted`,
    assertionId: assertion.id,
    continuityRootId,
    worldlineId,
    eventType: 'ASSERTED',
    eventPayload: { state: 'RESOLUTION', applicability_status: 'UNKNOWN' },
    evidenceRefs: verification.evidence_refs || [],
    occurredAt: assertion.asserted_at,
    recordedAt: new Date().toISOString(),
    actorRef: 'reality',
    authorityRef: ekr.authorityRef,
  });

  const verifiedEvent = createEKREvent({
    eventId: `${assertion.id}:verified`,
    assertionId: assertion.id,
    continuityRootId,
    worldlineId,
    eventType: 'VERIFICATION_CONFIRMED',
    eventPayload: { verification_level: 'verified_outcome' },
    evidenceRefs: [independentVerificationRef],
    occurredAt: new Date().toISOString(),
    recordedAt: new Date().toISOString(),
    actorRef: 'reality',
    authorityRef: ekr.authorityRef,
    previousEventHash: assertedEvent.event_hash,
  });

  const derivedState = foldEKRState(assertion, [assertedEvent, verifiedEvent]);

  return {
    status: 'ADMITTED',
    wiring_version: EKR_WIRING_VERSION,
    assertion,
    events: [assertedEvent, verifiedEvent],
    derived_state: derivedState,
    authority_granted: false,
    execution_authorized: false,
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

  const reconciliation = {
    reconciliation_version: 'reality-intelligence-reconciliation-v0.1',
    work_id: execution.work_id,
    execution_status: verified ? 'VERIFIED' : unverified ? 'EXECUTED_UNVERIFIED' : 'NOT_VERIFIED',
    evidence_refs: clone(verification.evidence_refs || []),
    independent_readback: verification.independent_readback === true,
    authority_preserved: verification.authority_preserved !== false,
  };

  return {
    ...reconciliation,
    ekr_admission: admitVerifiedOutcomeToEKR({ execution, verification, reconciliation, ekr: verification.ekr || {} }),
  };
}
