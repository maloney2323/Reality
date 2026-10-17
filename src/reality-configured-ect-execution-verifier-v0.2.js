import { verifyExecutionECT } from './reality-ect-execution-verifier-v0.1.js';

export const CONFIGURED_ECT_VERIFIER_VERSION = 'reality-configured-ect-execution-verifier-v0.2';
const verifiedAuthorities = new WeakSet();

function trustedConfiguration() {
  return {
    trustedPublicKeyPem: process.env.REALITY_ECT_PUBLIC_KEY_PEM,
    expectedKeyId: process.env.REALITY_ECT_KEY_ID,
    expectedIssuer: process.env.REALITY_ECT_ISSUER,
    expectedAudience: process.env.REALITY_ECT_AUDIENCE,
    expectedPolicyDigest: process.env.REALITY_ECT_POLICY_SHA256,
    expectedAuthorityDigest: process.env.REALITY_POLICY_AUTHORITY_SHA256,
    expectedWorkstream: process.env.REALITY_ECT_WORKSTREAM,
  };
}

/**
 * Production entry point: trust anchors are resolved internally from server
 * configuration. Callers cannot nominate a public key or policy digest.
 */
export function verifyConfiguredExecutionECT(token, { workItem, workflowId, nowSeconds } = {}) {
  const verified = verifyExecutionECT(token, {
    ...trustedConfiguration(),
    workItem,
    workflowId,
    ...(nowSeconds === undefined ? {} : { nowSeconds }),
  });
  const authority = Object.freeze({ ...verified, verified_by: CONFIGURED_ECT_VERIFIER_VERSION });
  verifiedAuthorities.add(authority);
  return authority;
}

export function isConfiguredExecutionAuthority(value) {
  return Boolean(value && typeof value === 'object' && verifiedAuthorities.has(value));
}
