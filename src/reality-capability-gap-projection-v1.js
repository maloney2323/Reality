import crypto from 'node:crypto';

export const CAPABILITY_GAP_PROJECTION_VERSION = 'capability-gap-projection-v1';

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function freeze(value) {
  return Object.freeze(value);
}

/**
 * First-class non-authoritative projection of a discovered capability limitation.
 * This record can initiate research/sandbox acquisition but cannot authorize
 * external action, production mutation, or capability admission.
 */
export function createCapabilityGapProjection({
  sourceDiscoveryId,
  requiredCapability,
  currentLimitation,
  evidenceRefs = [],
  acquisitionPath = 'RESEARCH_THEN_ISOLATED_SANDBOX',
  gapId = null,
  provenance = {},
} = {}) {
  if (!sourceDiscoveryId) throw new Error('CAPABILITY_GAP_SOURCE_DISCOVERY_REQUIRED');
  if (!requiredCapability) throw new Error('CAPABILITY_GAP_REQUIRED_CAPABILITY_REQUIRED');
  if (!currentLimitation) throw new Error('CAPABILITY_GAP_LIMITATION_REQUIRED');

  const refs = list(evidenceRefs);
  const id = gapId || `capability_gap_projection:${digest({
    sourceDiscoveryId, requiredCapability, currentLimitation, refs,
  }).slice(0, 24)}`;

  return freeze({
    projection_version: CAPABILITY_GAP_PROJECTION_VERSION,
    projection_type: 'CAPABILITY_GAP',
    projection_id: id,
    source_discovery_id: sourceDiscoveryId,
    required_capability: requiredCapability,
    current_limitation: currentLimitation,
    evidence_refs: freeze(refs),
    acquisition_path: acquisitionPath,
    sandbox_required: true,
    authority: null,
    execution_authorized: false,
    admission_status: 'PENDING',
    provenance: freeze({
      ...provenance,
      source_discovery_id: sourceDiscoveryId,
    }),
  });
}

export function assertCapabilityGapNonAuthoritative(projection) {
  if (!projection || projection.projection_type !== 'CAPABILITY_GAP') {
    throw new Error('CAPABILITY_GAP_PROJECTION_REQUIRED');
  }
  if (projection.authority !== null) throw new Error('CAPABILITY_GAP_AUTHORITY_MUST_BE_NULL');
  if (projection.execution_authorized !== false) throw new Error('CAPABILITY_GAP_EXECUTION_MUST_BE_FALSE');
  if (projection.admission_status !== 'PENDING') throw new Error('CAPABILITY_GAP_ADMISSION_NOT_PENDING');
  return true;
}
