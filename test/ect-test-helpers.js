import { generateKeyPairSync, sign } from 'node:crypto';
import { verifyExecutionECT } from '../src/reality-ect-execution-verifier-v0.1.js';

function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
const b64u = value => Buffer.from(value).toString('base64url');

export function makeVerifiedTestAuthority(workItem, overrides = {}) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const now = overrides.nowSeconds ?? Math.floor(Date.now() / 1000);
  const policyDigest = 'a'.repeat(64);
  const authorityDigest = 'b'.repeat(64);
  const keyId = 'test-ed25519-key';
  const issuer = 'reality-test-issuer';
  const audience = 'reality-test-executor';
  const header = { alg: 'EdDSA', typ: 'ECT', kid: keyId };
  const claims = {
    contract_version: 'reality-evaluation-context-v0.1',
    iss: issuer, sub: 'test-user', aud: audience, iat: now, nbf: now,
    exp: now + (overrides.ttlSeconds ?? 300), jti: 'test-jti-fixed',
    key_id: keyId, policy_id: 'test-policy',
    policy_sha256: overrides.policyDigest ?? policyDigest,
    identity: { iss: 'https://issuer.example.test', sub: 'test-user', aud: audience, workflow_ref: 'owner/repo/.github/workflows/test.yml@refs/heads/test' },
    scope: overrides.scope ?? ['execute:' + workItem.connector + ':' + workItem.operation],
    evaluation_boundaries: {
      policy_authority_digest: overrides.authorityDigest ?? authorityDigest,
      target_workstream: overrides.workstream ?? 'test-workstream',
      workflow_id: workItem.workflow_id, work_item_id: workItem.work_item_id,
      connector: workItem.connector, operation: workItem.operation,
    },
  };
  const first = b64u(stable(header));
  const second = b64u(stable(claims));
  const signingInput = first + '.' + second;
  const token = signingInput + '.' + sign(null, Buffer.from(signingInput, 'ascii'), privateKey).toString('base64url');
  const authority = overrides.skipVerify ? null : verifyExecutionECT(token, {
    trustedPublicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }),
    expectedKeyId: keyId, expectedIssuer: issuer, expectedAudience: audience,
    expectedPolicyDigest: policyDigest, expectedAuthorityDigest: authorityDigest,
    expectedWorkstream: 'test-workstream', workItem, workflowId: workItem.workflow_id, nowSeconds: now,
  });
  return { token, authority, publicKey, privateKey, claims, header, policyDigest, authorityDigest, keyId, issuer, audience, now };
}
