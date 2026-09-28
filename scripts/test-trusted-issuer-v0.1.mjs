import assert from 'node:assert/strict';
import { verifyTrustedIssuer, TRUST_FAILURE_CODES } from '../base44/shared/reality-core/trusted-issuer-v0.1.js';

const now = '2026-09-27T12:00:00.000Z';
const baseIssuer = {
  issuer_id: 'reality-dev-issuer',
  issuer_type: 'DEVELOPMENT_AUTHORITY',
  key_id: 'dev-key-1',
  algorithm: 'Ed25519',
  public_key_b64: 'test-public-key',
  status: 'ACTIVE',
  authorized_action_classes: ['CREATE_BRANCH_COMMIT_PR'],
  authorized_targets: [{ provider: 'github', repository: 'maloney2323/Reality' }],
  not_before: '2026-01-01T00:00:00.000Z',
  not_after: '2027-01-01T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
  registry_version: 'g2-test',
  trust_environment: 'DEVELOPMENT',
  production_execution_allowed: false,
};

const auth = {
  issuer_id: 'reality-dev-issuer',
  issuer_key_id: 'dev-key-1',
  signature_algorithm: 'Ed25519',
  signed_payload: { authorization_id: 'auth-1', action_class: 'CREATE_BRANCH_COMMIT_PR' },
  signature: 'not-a-valid-signature',
};

const run = async (label, issuer, authorization = auth, opts = {}) => {
  const result = await verifyTrustedIssuer({
    authorization,
    issuerRecord: issuer,
    now,
    requestedActionClass: 'CREATE_BRANCH_COMMIT_PR',
    target: { provider: 'github', repository: 'maloney2323/Reality' },
    ...opts,
  });
  return { label, result };
};

const cases = [
  ['unknown issuer', null, TRUST_FAILURE_CODES.ISSUER_UNKNOWN],
  ['wrong key', { ...baseIssuer, key_id: 'other-key' }, TRUST_FAILURE_CODES.ISSUER_KEY_MISMATCH],
  ['revoked issuer', { ...baseIssuer, status: 'REVOKED' }, TRUST_FAILURE_CODES.ISSUER_REVOKED],
  ['expired issuer', { ...baseIssuer, status: 'EXPIRED' }, TRUST_FAILURE_CODES.ISSUER_EXPIRED],
  ['future issuer', { ...baseIssuer, not_before: '2027-01-01T00:00:00.000Z' }, TRUST_FAILURE_CODES.ISSUER_NOT_YET_ACTIVE],
  ['scope mismatch', { ...baseIssuer, authorized_action_classes: ['READ_ONLY'] }, TRUST_FAILURE_CODES.ISSUER_SCOPE_MISMATCH],
  ['target mismatch', { ...baseIssuer, authorized_targets: [{ provider: 'github', repository: 'other/repo' }] }, TRUST_FAILURE_CODES.ISSUER_SCOPE_MISMATCH],
  ['production blocked by development root', baseIssuer, TRUST_FAILURE_CODES.PRODUCTION_TRUST_ROOT_BLOCKED, { productionExecution: true }],
];

for (const [label, issuer, expected, opts] of cases) {
  const { result } = await run(label, issuer, auth, opts);
  assert.equal(result.verified, false, label);
  assert.equal(result.code, expected, label);
}

// The final test intentionally uses an invalid signature: registry membership and scope
// must never be treated as sufficient without cryptographic verification.
const signatureResult = await run('invalid signature', baseIssuer);
assert.equal(signatureResult.result.verified, false);
assert.equal(signatureResult.result.code, TRUST_FAILURE_CODES.ISSUER_SIGNATURE_INVALID);

console.log('G2 trusted issuer adversarial contract suite: PASS');
