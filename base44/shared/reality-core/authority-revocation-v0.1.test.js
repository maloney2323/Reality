import test from 'node:test';
import assert from 'node:assert/strict';
import { revokeAuthorityGrant } from './authority-revocation-v0.1.js';

function serviceWith(grants = [], revocations = []) {
  const created = { grant: [], revocation: [] };
  return {
    created,
    entities: {
      RealityAuthorityGrantV01: {
        filter: async (q) => grants.filter((g) => g.grant_id === q.grant_id),
      },
      RealityAuthorityRevocationV01: {
        filter: async (q) => revocations.filter((r) => r.grant_id === q.grant_id),
        create: async (record) => { created.revocation.push(record); return record; },
      },
    },
  };
}

test('authenticated service revocation is append-only and bound to the grant', async () => {
  const service = serviceWith([{
    grant_id: 'grant-123456',
    expires_at: '2026-09-25T18:00:00Z',
    integrity_digest: 'prior-digest',
  }]);
  const result = await revokeAuthorityGrant({
    service,
    grant_id: 'grant-123456',
    revoked_by: 'human-admin',
    revoked_at: '2026-09-25T15:00:00Z',
    reason: 'human authority withdrawn',
    provenance_refs: ['decision-1'],
  });
  assert.equal(result.record.resulting_status, 'REVOKED');
  assert.equal(result.record.previous_record_digest, 'prior-digest');
  assert.equal(result.execution_authorized, false);
  assert.equal(service.created.revocation.length, 1);
});

test('missing grant cannot be revoked', async () => {
  await assert.rejects(
    () => revokeAuthorityGrant({
      service: serviceWith(),
      grant_id: 'missing-123',
      revoked_by: 'human-admin',
      revoked_at: '2026-09-25T15:00:00Z',
      reason: 'withdrawn',
    }),
    /GRANT_NOT_FOUND/
  );
});

test('existing revocation cannot be duplicated', async () => {
  await assert.rejects(
    () => revokeAuthorityGrant({
      service: serviceWith(
        [{ grant_id: 'grant-123456', expires_at: '2026-09-25T18:00:00Z' }],
        [{ grant_id: 'grant-123456' }],
      ),
      grant_id: 'grant-123456',
      revoked_by: 'human-admin',
      revoked_at: '2026-09-25T15:00:00Z',
      reason: 'withdrawn',
    }),
    /GRANT_ALREADY_REVOKED/
  );
});

console.log('PASS authority-revocation-v0.1: revocation is append-only, grant-bound, and never execution authorization');