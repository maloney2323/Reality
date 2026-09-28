import { canonicalJson, sha256Hex } from '../action-gate/canonical.js';

export const PERSISTENT_AUTHORITY_REGISTRY_VERSION = 'reality-persistent-authority-registry-v0.1';
export const AuthorityEventType = Object.freeze({
  GRANT: 'GRANT',
  REVOKE: 'REVOKE',
  SUPERSEDE: 'SUPERSEDE',
});

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function activeEventAt(event, atTime) {
  if (event.grant_event_type !== AuthorityEventType.GRANT) return false;
  if (event.effective_at > atTime) return false;
  if (event.expires_at && atTime >= event.expires_at) return false;
  return true;
}

export async function loadPersistentAuthorityRegistry({ service, world_id }) {
  if (!service?.entities?.RealityAuthorityGrantV01) throw new Error('PERSISTENT_AUTHORITY_ENTITY_UNAVAILABLE');
  if (typeof world_id !== 'string' || !world_id.trim()) throw new Error('WORLD_ID_REQUIRED');

  const rows = await service.entities.RealityAuthorityGrantV01.filter({ world_id }, '-created_at', 500, 0);
  const events = (rows || []).map((row) => ({ ...row }));
  const canonical = events.map((event) => ({
    id: event.id || null,
    grant_id: event.grant_id,
    grant_event_type: event.grant_event_type,
    world_id: event.world_id,
    action_class: event.action_class,
    permitted_scope: event.permitted_scope || null,
    effective_at: event.effective_at,
    expires_at: event.expires_at || null,
    supersedes: event.supersedes || null,
    granting_principal_fingerprint: event.granting_principal_fingerprint,
    granting_principal_proof_id: event.granting_principal_proof_id,
  }));

  const integrity_digest = await sha256Hex(canonicalJson({
    schema_version: PERSISTENT_AUTHORITY_REGISTRY_VERSION,
    world_id,
    events: canonical,
  }));

  return deepFreeze({
    schema_version: PERSISTENT_AUTHORITY_REGISTRY_VERSION,
    authoritative: true,
    persistent: true,
    world_id,
    events,
    integrity_digest,
  });
}

function scopeMatches(event, resource_id) {
  if (typeof resource_id !== 'string' || !resource_id.trim()) return false;
  const scope = event.permitted_scope;
  if (!scope || typeof scope !== 'object') return false;
  if (scope.resource_id === resource_id) return true;
  return Array.isArray(scope.resource_ids) && scope.resource_ids.includes(resource_id);
}

export function resolvePersistentAuthority(registry, {
  principal_fingerprint,
  action_class,
  resource_id,
  at_time,
}) {
  if (!registry || registry.authoritative !== true || registry.persistent !== true) {
    return Object.freeze({
      resolution: 'UNKNOWN',
      reason_code: 'PERSISTENT_REGISTRY_UNAVAILABLE',
      matched_grant_ids: [],
      resource_id: resource_id || null,
    });
  }

  const revoked = new Set(
    registry.events
      .filter((event) => event.grant_event_type === AuthorityEventType.REVOKE && event.effective_at <= at_time)
      .flatMap((event) => [event.grant_id, event.supersedes].filter(Boolean))
  );
  const superseded = new Set(
    registry.events
      .filter((event) => event.grant_event_type === AuthorityEventType.SUPERSEDE && event.effective_at <= at_time)
      .map((event) => event.supersedes)
      .filter(Boolean)
  );

  const active = registry.events.filter((event) =>
    activeEventAt(event, at_time) &&
    event.granting_principal_fingerprint === principal_fingerprint &&
    event.action_class === action_class &&
    !revoked.has(event.grant_id) &&
    !superseded.has(event.grant_id) &&
    scopeMatches(event, resource_id)
  );

  if (active.length) {
    return Object.freeze({
      resolution: 'AUTHORIZED',
      reason_code: 'PERSISTENT_ACTIVE_GRANT',
      matched_grant_ids: active.map((event) => event.grant_id),
      resource_id,
    });
  }

  return Object.freeze({
    resolution: 'NOT_AUTHORIZED',
    reason_code: 'NO_ACTIVE_PERSISTENT_GRANT',
    matched_grant_ids: [],
    resource_id: resource_id || null,
  });
}

export function inspectPersistentAuthority(registry, request) {
  const resolution = resolvePersistentAuthority(registry, request);
  return Object.freeze({
    ...resolution,
    authority_is_derived_from_model_output: false,
    authority_is_inferred_from_evidence: false,
    registry_is_read_only: true,
  });
}