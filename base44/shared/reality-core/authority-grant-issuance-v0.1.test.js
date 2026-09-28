import assert from 'node:assert/strict';
import {
  AuthorityResolution,
  AuthorityScope,
  AuthorityStatus,
  createAuthorityRegistry,
  resolveAuthority,
} from './authority-registry-v0.1.js';
import {
  AUTHORITY_ADMIN_RESOURCE,
  AUTHORITY_GRANT_ISSUANCE_VERSION,
  issueAuthorityGrant,
} from './authority-grant-issuance-v0.1.js';

const adminGrant = {
  grant_id: 'admin-001',
  principal_id: 'issuer-001',
  principal_type: 'HUMAN',
  scopes: [AuthorityScope.GRANT, AuthorityScope.EXECUTE],
  resource_scope: ['authority:registry', 'refund:4821'],
  status: AuthorityStatus.ACTIVE,
  issued_at: '2026-09-25T08:00:00Z',
  expires_at: '2026-09-25T18:00:00Z',
  issuer_id: 'bootstrap-admin',
  authority_version: 'authority-policy-v1',
};

function requestedGrant(overrides = {}) {
  return {
    grant_id: 'grant-issued-001',
    principal_id: 'operator-001',
    principal_type: 'HUMAN',
    scopes: [AuthorityScope.EXECUTE],
    resource_scope: ['refund:4821'],
    status: AuthorityStatus.ACTIVE,
    issued_at: '2026-09-25T10:00:00Z',
    expires_at: '2026-09-25T12:00:00Z',
    issuer_id: 'issuer-001',
    authority_version: 'authority-policy-v1',
    ...overrides,
  };
}

async function main() {
  const registry = await createAuthorityRegistry({ grants: [adminGrant], authoritative: true });

  const issued = await issueAuthorityGrant({
    authority_registry: registry,
    issuer_id: 'issuer-001',
    grant: requestedGrant(),
    at_time: '2026-09-25T10:30:00Z',
    issuance_reason: 'Explicit human authorization for invoice 4821 release',
    provenance_refs: ['human-approval:4821'],
  });

  assert.equal(issued.issuance_record.schema_version, AUTHORITY_GRANT_ISSUANCE_VERSION);
  assert.equal(issued.issuance_record.record.issuer_grant_id, 'admin-001');
  assert.equal(issued.execution_authorized, false);
  assert.equal(issued.action_executed, false);

  const targetResolution = await resolveAuthority(issued.registry, {
    principal_id: 'operator-001',
    required_scope: AuthorityScope.EXECUTE,
    resource_id: 'refund:4821',
    at_time: '2026-09-25T10:30:00Z',
  });
  assert.equal(targetResolution.resolution, AuthorityResolution.AUTHORIZED);
  assert.deepEqual(targetResolution.matched_grant_ids, ['grant-issued-001']);

  await assert.rejects(
    () => issueAuthorityGrant({
      authority_registry: registry,
      issuer_id: 'unknown-issuer',
      grant: requestedGrant({ grant_id: 'grant-unknown-issuer' }),
      at_time: '2026-09-25T10:30:00Z',
      issuance_reason: 'Should not mint authority',
    }),
    /ISSUER_NOT_AUTHORIZED_TO_GRANT/
  );

  await assert.rejects(
    () => issueAuthorityGrant({
      authority_registry: registry,
      issuer_id: 'issuer-001',
      grant: requestedGrant({
        grant_id: 'grant-escalation',
        scopes: [AuthorityScope.EXECUTE],
        resource_scope: ['refund:9999'],
      }),
      at_time: '2026-09-25T10:30:00Z',
      issuance_reason: 'Cannot exceed issuer resource authority',
    }),
    /ISSUER_CANNOT_DELEGATE_REQUESTED_SCOPE_OR_RESOURCE/
  );

  await assert.rejects(
    () => issueAuthorityGrant({
      authority_registry: registry,
      issuer_id: 'issuer-001',
      grant: requestedGrant({
        grant_id: 'grant-issuer-mismatch',
        issuer_id: 'different-issuer',
      }),
      at_time: '2026-09-25T10:30:00Z',
      issuance_reason: 'Issuer identity must match grant issuer',
    }),
    /GRANT_ISSUER_ID_MISMATCH/
  );

  await assert.rejects(
    () => issueAuthorityGrant({
      authority_registry: registry,
      issuer_id: 'issuer-001',
      grant: requestedGrant({
        grant_id: 'grant-admin-escalation',
        scopes: [AuthorityScope.GRANT],
      }),
      at_time: '2026-09-25T10:30:00Z',
      issuance_reason: 'Admin authority cannot be self-delegated',
    }),
    /AUTHORITY_ADMIN_SCOPE_DELEGATION_NOT_PERMITTED/
  );

  const nonAuthoritative = await createAuthorityRegistry({
    grants: [adminGrant],
    authoritative: false,
  });
  await assert.rejects(
    () => issueAuthorityGrant({
      authority_registry: nonAuthoritative,
      issuer_id: 'issuer-001',
      grant: requestedGrant({ grant_id: 'grant-non-authoritative' }),
      at_time: '2026-09-25T10:30:00Z',
      issuance_reason: 'Cannot issue from uncertain registry',
    }),
    /AUTHORITY_REGISTRY_NOT_AUTHORITATIVE/
  );

  const expiredIssuer = await createAuthorityRegistry({
    grants: [{
      ...adminGrant,
      grant_id: 'admin-expired',
      expires_at: '2026-09-25T09:00:00Z',
    }],
    authoritative: true,
  });
  await assert.rejects(
    () => issueAuthorityGrant({
      authority_registry: expiredIssuer,
      issuer_id: 'issuer-001',
      grant: requestedGrant({ grant_id: 'grant-expired-issuer' }),
      at_time: '2026-09-25T10:30:00Z',
      issuance_reason: 'Expired issuer cannot grant',
    }),
    /ISSUER_NOT_AUTHORIZED_TO_GRANT/
  );

  assert.equal(AUTHORITY_ADMIN_RESOURCE, 'authority:registry');
  assert.equal(JSON.stringify(registry).includes('grant-issued-001'), false);
  console.log('PASS authority-grant-issuance-v0.1: issuer authority is independently resolved, delegation is bounded, and issuance never authorizes execution');
}

await main();