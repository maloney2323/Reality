import { canonicalJson, sha256Hex } from '../action-gate/canonical.js';
import {
  appendAuthorityGrant,
  AuthorityScope,
  AuthorityResolution,
  AuthorityStatus,
  resolveAuthority,
  verifyAuthorityRegistry,
} from './authority-registry-v0.1.js';

export const AUTHORITY_GRANT_ISSUANCE_VERSION = 'reality-authority-grant-issuance-v0.1';
export const AUTHORITY_ADMIN_RESOURCE = 'authority:registry';

function requiredString(value, name) {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(name + '_REQUIRED');
  return value;
}

function requiredArray(value, name) {
  if (!Array.isArray(value) || value.length === 0) throw new Error(name + '_REQUIRED');
  return value;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function targetGrantScope(grant) {
  if (!grant || typeof grant !== 'object') throw new Error('GRANT_REQUIRED');
  const scopes = requiredArray(grant.scopes, 'SCOPES');
  const resources = requiredArray(grant.resource_scope, 'RESOURCE_SCOPE');
  return {
    scopes: [...new Set(scopes)],
    resources: [...new Set(resources.map((resource) => requiredString(resource, 'RESOURCE_SCOPE_ENTRY')))],
  };
}

function resourceContainedByIssuer(resource, issuerResources) {
  return issuerResources.includes('*') || issuerResources.includes(resource);
}

function findActiveIssuerGrant(registry, issuerId, atTime, targetScopes, targetResources) {
  return registry.entries
    .map((entry) => entry.grant)
    .filter((grant) =>
      grant.principal_id === issuerId &&
      grant.status === AuthorityStatus.ACTIVE &&
      grant.issued_at <= atTime &&
      (grant.expires_at === null || atTime < grant.expires_at) &&
      grant.scopes.includes(AuthorityScope.GRANT)
    )
    .find((grant) =>
      targetScopes.every((scope) => grant.scopes.includes(scope)) &&
      targetResources.every((resource) => resourceContainedByIssuer(resource, grant.resource_scope))
    ) || null;
}

async function sealIssuanceRecord(record) {
  const integrity_digest = await sha256Hex(canonicalJson({
    schema_version: AUTHORITY_GRANT_ISSUANCE_VERSION,
    record,
  }));
  return deepFreeze({
    schema_version: AUTHORITY_GRANT_ISSUANCE_VERSION,
    record,
    integrity_digest,
  });
}

/**
 * Issues a new authority grant only when an independently registered issuer
 * is currently authorized to GRANT every delegated scope/resource.
 *
 * This module does not authenticate an issuer credential. It consumes the
 * result of an already-authenticated/authoritative identity boundary and
 * records that the issuer's registry authority was checked.
 */
export async function issueAuthorityGrant({
  authority_registry,
  issuer_id,
  grant,
  at_time,
  issuance_reason,
  provenance_refs = [],
}) {
  requiredString(issuer_id, 'ISSUER_ID');
  requiredString(at_time, 'AT_TIME');
  requiredString(issuance_reason, 'ISSUANCE_REASON');
  if (!Array.isArray(provenance_refs)) throw new Error('PROVENANCE_REFS_MUST_BE_ARRAY');

  if (!(await verifyAuthorityRegistry(authority_registry))) {
    throw new Error('AUTHORITY_REGISTRY_INVALID');
  }
  if (authority_registry.authoritative !== true) {
    throw new Error('AUTHORITY_REGISTRY_NOT_AUTHORITATIVE');
  }

  const { scopes, resources } = targetGrantScope(grant);
  if (scopes.includes(AuthorityScope.GRANT) || scopes.includes(AuthorityScope.REVOKE)) {
    throw new Error('AUTHORITY_ADMIN_SCOPE_DELEGATION_NOT_PERMITTED');
  }

  const issuerResolution = await resolveAuthority(authority_registry, {
    principal_id: issuer_id,
    required_scope: AuthorityScope.GRANT,
    resource_id: AUTHORITY_ADMIN_RESOURCE,
    at_time,
  });

  if (issuerResolution.resolution !== AuthorityResolution.AUTHORIZED) {
    throw new Error('ISSUER_NOT_AUTHORIZED_TO_GRANT');
  }

  const issuerGrant = findActiveIssuerGrant(
    authority_registry,
    issuer_id,
    at_time,
    scopes,
    resources,
  );

  if (!issuerGrant) {
    throw new Error('ISSUER_CANNOT_DELEGATE_REQUESTED_SCOPE_OR_RESOURCE');
  }

  if (grant.issuer_id !== issuer_id) {
    throw new Error('GRANT_ISSUER_ID_MISMATCH');
  }

  const nextRegistry = await appendAuthorityGrant(authority_registry, {
    ...grant,
    issuer_id,
  });

  const issuanceRecord = await sealIssuanceRecord({
    issuance_id: requiredString(grant.grant_id, 'GRANT_ID') + ':issuance',
    grant_id: grant.grant_id,
    issuer_id,
    issuer_grant_id: issuerGrant.grant_id,
    at_time,
    issuance_reason,
    provenance_refs: [...provenance_refs],
    issuer_resolution: issuerResolution,
    authority_registry_head_before: authority_registry.registry_head ?? null,
    authority_registry_head_after: nextRegistry.registry_head ?? null,
  });

  return deepFreeze({
    registry: nextRegistry,
    issuance_record: issuanceRecord,
    execution_authorized: false,
    action_executed: false,
  });
}