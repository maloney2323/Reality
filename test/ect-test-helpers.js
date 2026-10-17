import { generateKeyPairSync, sign } from 'node:crypto';
import { verifyConfiguredExecutionECT } from '../src/reality-configured-ect-execution-verifier-v0.2.js';

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
  const names = ['REALITY_ECT_PUBLIC_KEY_PEM','REALITY_ECT_KEY_ID','REALITY_ECT_ISSUER','REALITY_ECT_AUDIENCE','REALITY_ECT_POLICY_SHA256','REALITY_POLICY_AUTHORITY_SHA256','REALITY_ECT_WORKSTREAM'];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  let authority = null;
  try {
    process.env.REALITY_ECT_PUBLIC_KEY_PEM = publicKey.export({ type: 'spki', format: 'pem' });
    process.env.REALITY_ECT_KEY_ID = keyId;
    process.env.REALITY_ECT_ISSUER = issuer;
    process.env.REALITY_ECT_AUDIENCE = audience;
    process.env.REALITY_ECT_POLICY_SHA256 = policyDigest;
    process.env.REALITY_POLICY_AUTHORITY_SHA256 = authorityDigest;
    process.env.REALITY_ECT_WORKSTREAM = 'test-workstream';
    if (!overrides.skipVerify) authority = verifyConfiguredExecutionECT(token, { workItem, workflowId: workItem.workflow_id, nowSeconds: now });
  } finally {
    for (const name of names) previous[name] === undefined ? delete process.env[name] : process.env[name] = previous[name];
  }
  return { token, authority, publicKey, privateKey, claims, header, policyDigest, authorityDigest, keyId, issuer, audience, now };
}
