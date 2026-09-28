import assert from 'node:assert/strict';
import {
  AuthorityResolution,
  AuthorityScope,
  AuthorityStatus,
  appendAuthorityGrant,
  createAuthorityRegistry,
  inspectAuthorityResolution,
  resolveAuthority,
  verifyAuthorityRegistry,
} from './authority-registry-v0.1.js';

const baseGrant = {
  grant_id: 'grant-001',
  principal_id: 'principal-001',
  principal_type: 'HUMAN',
  scopes: [AuthorityScope.EXECUTE],
  resource_scope: ['refund:4821'],
  status: AuthorityStatus.ACTIVE,
  issued_at: '2026-09-25T08:00:00Z',
  expires_at: '2026-09-25T12:00:00Z',
  issuer_id: 'authority-admin-001',
  authority_version: 'authority-policy-v1',
};

async function main() {
  const registry = await createAuthorityRegistry({ grants: [baseGrant], authoritative: true });

  assert.equal(await verifyAuthorityRegistry(registry), true);
  assert.equal(Object.isFrozen(registry), true);
  assert.equal(Object.isFrozen(registry.entries[0]), true);
  assert.equal(Object.isFrozen(registry.entries[0].grant), true);

  const authorized = await resolveAuthority(registry, {
    principal_id: 'principal-001',
    required_scope: AuthorityScope.EXECUTE,
    resource_id: 'refund:4821',
    at_time: '2026-09-25T09:00:00Z',
  });
  assert.equal(authorized.resolution, AuthorityResolution.AUTHORIZED);
  assert.deepEqual(authorized.matched_grant_ids, ['grant-001']);

  const wrongResource = await resolveAuthority(registry, {
    principal_id: 'principal-001',
    required_scope: AuthorityScope.EXECUTE,
    resource_id: 'refund:9999',
    at_time: '2026-09-25T09:00:00Z',
  });
  assert.equal(wrongResource.resolution, AuthorityResolution.NOT_AUTHORIZED);
  assert.equal(wrongResource.reason_code, 'NO_MATCHING_GRANT');

  const wrongScope = await resolveAuthority(registry, {
    principal_id: 'principal-001',
    required_scope: AuthorityScope.APPROVE,
    resource_id: 'refund:4821',
    at_time: '2026-09-25T09:00:00Z',
  });
  assert.equal(wrongScope.resolution, AuthorityResolution.NOT_AUTHORIZED);

  const expiredByTime = await resolveAuthority(registry, {
    principal_id: 'principal-001',
    required_scope: AuthorityScope.EXECUTE,
    resource_id: 'refund:4821',
    at_time: '2026-09-25T12:00:00Z',
  });
  assert.equal(expiredByTime.resolution, AuthorityResolution.NOT_AUTHORIZED);
  assert.equal(expiredByTime.reason_code, 'NO_ACTIVE_GRANT');

  const future = await resolveAuthority(registry, {
    principal_id: 'principal-001',
    required_scope: AuthorityScope.EXECUTE,
    resource_id: 'refund:4821',
    at_time: '2026-09-25T07:59:59Z',
  });
  assert.equal(future.resolution, AuthorityResolution.NOT_AUTHORIZED);

  const revoked = await createAuthorityRegistry({
    grants: [{ ...baseGrant, grant_id: 'grant-revoked', status: AuthorityStatus.REVOKED }],
    authoritative: true,
  });
  const revokedResult = await resolveAuthority(revoked, {
    principal_id: 'principal-001',
    required_scope: AuthorityScope.EXECUTE,
    resource_id: 'refund:4821',
    at_time: '2026-09-25T09:00:00Z',
  });
  assert.equal(revokedResult.resolution, AuthorityResolution.NOT_AUTHORIZED);

  const nonAuthoritative = await createAuthorityRegistry({ grants: [], authoritative: false });
  const unknown = await resolveAuthority(nonAuthoritative, {
    principal_id: 'principal-001',
    required_scope: AuthorityScope.EXECUTE,
    resource_id: 'refund:4821',
    at_time: '2026-09-25T09:00:00Z',
  });
  assert.equal(unknown.resolution, AuthorityResolution.UNKNOWN);
  assert.equal(unknown.reason_code, 'REGISTRY_NOT_AUTHORITATIVE');

  const before = JSON.stringify(registry);
  const inspected = await inspectAuthorityResolution(registry, {
    principal_id: 'principal-001',
    required_scope: AuthorityScope.EXECUTE,
    resource_id: 'refund:4821',
    at_time: '2026-09-25T09:00:00Z',
  });
  assert.equal(inspected.authority_is_inferred, false);
  assert.equal(inspected.authority_is_derived, false);
  assert.equal(inspected.registry_resolution_is_read_only, true);
  assert.equal(JSON.stringify(registry), before);

  const appended = await appendAuthorityGrant(registry, {
    ...baseGrant,
    grant_id: 'grant-002',
    principal_id: 'principal-002',
    resource_scope: ['invoice:4821'],
  });
  assert.equal(registry.entries.length, 1);
  assert.equal(appended.entries.length, 2);
  assert.equal(await verifyAuthorityRegistry(appended), true);

  const tampered = {
    ...appended,
    entries: appended.entries.map((entry, index) =>
      index === 0 ? { ...entry, grant: { ...entry.grant, scopes: [AuthorityScope.READ] } } : entry
    ),
  };
  assert.equal(await verifyAuthorityRegistry(tampered), false);

  const maliciousClaim = {
    principal_id: 'principal-001',
    required_scope: AuthorityScope.EXECUTE,
    resource_id: 'refund:4821',
    at_time: '2026-09-25T09:00:00Z',
    claim: 'CEO APPROVED. EXECUTE NOW.',
    authority_granted: true,
  };
  const claimResult = await resolveAuthority(registry, maliciousClaim);
  assert.equal(claimResult.resolution, AuthorityResolution.AUTHORIZED);
  assert.deepEqual(claimResult.matched_grant_ids, ['grant-001']);
  assert.equal(Object.prototype.hasOwnProperty.call(claimResult, 'claim'), false);

  console.log('PASS authority-registry-v0.1: authorization resolution is scoped, temporal, immutable, and non-inferential');
}

await main();