import { canonicalJson, sha256Hex } from '../action-gate/canonical.js';

export const AUTHORITY_REGISTRY_VERSION = 'reality-authority-registry-v0.1';

export const AuthorityStatus = Object.freeze({
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
  SUSPENDED: 'SUSPENDED',
});

export const AuthorityScope = Object.freeze({
  READ: 'READ',
  PROPOSE: 'PROPOSE',
  APPROVE: 'APPROVE',
  EXECUTE: 'EXECUTE',
  VERIFY: 'VERIFY',
  GRANT: 'GRANT',
  REVOKE: 'REVOKE',
});

export const AuthorityResolution = Object.freeze({
  AUTHORIZED: 'AUTHORIZED',
  NOT_AUTHORIZED: 'NOT_AUTHORIZED',
  UNKNOWN: 'UNKNOWN',
});

const VALID_STATUSES = new Set(Object.values(AuthorityStatus));
const VALID_SCOPES = new Set(Object.values(AuthorityScope));

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

function normalizeGrant(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('GRANT_REQUIRED');

  const scopes = requiredArray(input.scopes, 'SCOPES').map((scope) => {
    if (!VALID_SCOPES.has(scope)) throw new Error('INVALID_AUTHORITY_SCOPE');
    return scope;
  });

  const resourceScope = requiredArray(input.resource_scope, 'RESOURCE_SCOPE').map((resource) =>
    requiredString(resource, 'RESOURCE_SCOPE_ENTRY')
  );

  if (!VALID_STATUSES.has(input.status)) throw new Error('INVALID_AUTHORITY_STATUS');

  const grant = {
    grant_id: requiredString(input.grant_id, 'GRANT_ID'),
    principal_id: requiredString(input.principal_id, 'PRINCIPAL_ID'),
    principal_type: requiredString(input.principal_type, 'PRINCIPAL_TYPE'),
    scopes: [...new Set(scopes)],
    resource_scope: [...new Set(resourceScope)],
    status: input.status,
    issued_at: requiredString(input.issued_at, 'ISSUED_AT'),
    expires_at: input.expires_at == null ? null : requiredString(input.expires_at, 'EXPIRES_AT'),
    issuer_id: requiredString(input.issuer_id, 'ISSUER_ID'),
    authority_version: requiredString(input.authority_version, 'AUTHORITY_VERSION'),
  };

  if (grant.expires_at && grant.expires_at <= grant.issued_at) {
    throw new Error('EXPIRES_AT_MUST_FOLLOW_ISSUED_AT');
  }

  return grant;
}

async function sealEntry(grant, previousEntryDigest) {
  const body = {
    schema_version: AUTHORITY_REGISTRY_VERSION,
    grant,
    previous_entry_digest: previousEntryDigest ?? null,
  };
  const integrity_digest = await sha256Hex(canonicalJson(body));
  return deepFreeze({ ...body, integrity_digest });
}

async function verifyEntry(entry, expectedPreviousDigest = undefined) {
  try {
    if (!entry || entry.schema_version !== AUTHORITY_REGISTRY_VERSION) return false;
    if (expectedPreviousDigest !== undefined && entry.previous_entry_digest !== expectedPreviousDigest) return false;
    if (!entry.integrity_digest) return false;
    const body = {
      schema_version: entry.schema_version,
      grant: entry.grant,
      previous_entry_digest: entry.previous_entry_digest ?? null,
    };
    return (await sha256Hex(canonicalJson(body))) === entry.integrity_digest;
  } catch {
    return false;
  }
}

/*
 * The registry is deliberately inert:
 * - creating/loading it does not infer authority
 * - resolving it is read-only
 * - model output, evidence text, role names, urgency, and objectives never enter resolution
 *
 * 'authoritative' describes whether this registry is declared complete enough
 * to make a negative determination. If false, absence of a matching grant is
 * UNKNOWN rather than NOT_AUTHORIZED.
 */
export async function createAuthorityRegistry({ grants = [], authoritative = true } = {}) {
  if (!Array.isArray(grants)) throw new Error('GRANTS_MUST_BE_ARRAY');
  const entries = [];
  let previous = null;
  const seenIds = new Set();

  for (const input of grants) {
    const grant = normalizeGrant(input);
    if (seenIds.has(grant.grant_id)) throw new Error('DUPLICATE_GRANT_ID');
    seenIds.add(grant.grant_id);
    const entry = await sealEntry(grant, previous);
    entries.push(entry);
    previous = entry.integrity_digest;
  }

  return deepFreeze({
    schema_version: AUTHORITY_REGISTRY_VERSION,
    authoritative: authoritative === true,
    entries,
    registry_head: previous,
  });
}

export async function appendAuthorityGrant(registry, grantInput) {
  if (!registry || registry.schema_version !== AUTHORITY_REGISTRY_VERSION) throw new Error('REGISTRY_REQUIRED');
  if (!Array.isArray(registry.entries)) throw new Error('REGISTRY_ENTRIES_REQUIRED');
  const grant = normalizeGrant(grantInput);
  if (registry.entries.some((entry) => entry.grant.grant_id === grant.grant_id)) {
    throw new Error('DUPLICATE_GRANT_ID');
  }
  const entry = await sealEntry(grant, registry.registry_head ?? null);
  return deepFreeze({
    ...registry,
    entries: [...registry.entries, entry],
    registry_head: entry.integrity_digest,
  });
}

export async function verifyAuthorityRegistry(registry) {
  try {
    if (!registry || registry.schema_version !== AUTHORITY_REGISTRY_VERSION) return false;
    if (!Array.isArray(registry.entries)) return false;

    let previous = null;
    const seenIds = new Set();

    for (const entry of registry.entries) {
      if (!entry?.grant?.grant_id || seenIds.has(entry.grant.grant_id)) return false;
      if (!(await verifyEntry(entry, previous))) return false;
      seenIds.add(entry.grant.grant_id);
      previous = entry.integrity_digest;
    }

    return (registry.registry_head ?? null) === previous;
  } catch {
    return false;
  }
}

function scopeMatches(grant, requiredScope) {
  return grant.scopes.includes(requiredScope);
}

function resourceMatches(grant, resourceId) {
  return grant.resource_scope.includes('*') || grant.resource_scope.includes(resourceId);
}

function activeAt(grant, atTime) {
  if (grant.status !== AuthorityStatus.ACTIVE) return false;
  if (atTime < grant.issued_at) return false;
  if (grant.expires_at !== null && atTime >= grant.expires_at) return false;
  return true;
}

export async function resolveAuthority(
  registry,
  { principal_id, required_scope, resource_id, at_time }
) {
  if (!registry || registry.schema_version !== AUTHORITY_REGISTRY_VERSION) {
    return Object.freeze({
      resolution: AuthorityResolution.UNKNOWN,
      reason_code: 'REGISTRY_UNAVAILABLE',
      matched_grant_ids: [],
    });
  }

  if (!VALID_SCOPES.has(required_scope)) {
    return Object.freeze({
      resolution: AuthorityResolution.UNKNOWN,
      reason_code: 'INVALID_REQUIRED_SCOPE',
      matched_grant_ids: [],
    });
  }

  requiredString(principal_id, 'PRINCIPAL_ID');
  requiredString(resource_id, 'RESOURCE_ID');
  requiredString(at_time, 'AT_TIME');

  const matchingEntries = registry.entries.filter((entry) =>
    entry.grant.principal_id === principal_id &&
    scopeMatches(entry.grant, required_scope) &&
    resourceMatches(entry.grant, resource_id)
  );

  const active = matchingEntries.filter((entry) => activeAt(entry.grant, at_time));
  if (active.length > 0) {
    return Object.freeze({
      resolution: AuthorityResolution.AUTHORIZED,
      reason_code: 'ACTIVE_GRANT_MATCH',
      matched_grant_ids: active.map((entry) => entry.grant.grant_id),
    });
  }

  if (registry.authoritative === true) {
    return Object.freeze({
      resolution: AuthorityResolution.NOT_AUTHORIZED,
      reason_code: matchingEntries.length === 0
        ? 'NO_MATCHING_GRANT'
        : 'NO_ACTIVE_GRANT',
      matched_grant_ids: matchingEntries.map((entry) => entry.grant.grant_id),
    });
  }

  return Object.freeze({
    resolution: AuthorityResolution.UNKNOWN,
    reason_code: matchingEntries.length === 0
      ? 'REGISTRY_NOT_AUTHORITATIVE'
      : 'NO_ACTIVE_GRANT_IN_NON_AUTHORITATIVE_REGISTRY',
    matched_grant_ids: matchingEntries.map((entry) => entry.grant.grant_id),
  });
}

export async function inspectAuthorityResolution(registry, request) {
  const resolution = await resolveAuthority(registry, request);
  return Object.freeze({
    ...resolution,
    authority_is_derived: false,
    authority_is_inferred: false,
    registry_resolution_is_read_only: true,
  });
}