import { canonicalJson, sha256Hex } from '../action-gate/canonical.js';

export const AUTHORITY_REVOCATION_VERSION = 'reality-authority-revocation-v0.1';

export async function revokeAuthorityGrant({
  service,
  grant_id,
  revoked_by,
  revoked_at,
  reason,
  provenance_refs = [],
}) {
  if (!service?.entities?.RealityAuthorityRevocationV01) throw new Error('REVOCATION_ENTITY_UNAVAILABLE');
  if (!grant_id || !revoked_by || !revoked_at || !reason) throw new Error('REVOCATION_FIELDS_REQUIRED');

  const existing = await service.entities.RealityAuthorityRevocationV01.filter({ grant_id }, '-revoked_at', 2, 0);
  if (Array.isArray(existing) && existing.length > 0) throw new Error('GRANT_ALREADY_REVOKED');

  const prior = await service.entities.RealityAuthorityGrantV01.filter({ grant_id }, '-created_at', 2, 0);
  if (!Array.isArray(prior) || prior.length === 0) throw new Error('GRANT_NOT_FOUND');

  const latest = prior[0];
  const previous_record_digest = latest.integrity_digest || null;
  const payload = {
    record_version: AUTHORITY_REVOCATION_VERSION,
    revocation_id: crypto.randomUUID(),
    grant_id,
    revoked_by,
    revoked_at,
    reason,
    provenance_refs: [...provenance_refs],
    prior_status: latest.revoked_at ? 'REVOKED' : (latest.expires_at && revoked_at >= latest.expires_at ? 'EXPIRED' : 'ACTIVE'),
    resulting_status: 'REVOKED',
    previous_record_digest,
  };
  if (payload.prior_status === 'REVOKED') throw new Error('GRANT_ALREADY_REVOKED');

  const integrity_digest = await sha256Hex(canonicalJson(payload));
  const record = Object.freeze({ ...payload, integrity_digest });

  await service.entities.RealityAuthorityRevocationV01.create(record);

  return Object.freeze({
    record,
    authority_changed: true,
    execution_authorized: false,
    action_executed: false,
  });
}