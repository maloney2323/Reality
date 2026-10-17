import { createPublicKey, verify as verifySignature } from 'node:crypto';

export const ECT_EXECUTION_VERIFIER_VERSION = 'reality-ect-execution-verifier-v0.1';
const verifiedAuthorities = new WeakSet();

function reject(code) {
  const error = new Error(code);
  error.code = code;
  error.status = 401;
  throw error;
}

function decodeBase64Url(value, code) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) reject(code);
  try {
    const decoded = Buffer.from(value, 'base64url');
    if (decoded.toString('base64url') !== value) reject(code);
    return decoded;
  } catch {
    reject(code);
  }
}

function parseObject(segment, code) {
  let value;
  try {
    value = JSON.parse(decodeBase64Url(segment, code).toString('utf8'));
  } catch {
    reject(code);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) reject(code);
  return value;
}

/**
 * Verify the Python issuer's compact EdDSA ECT and bind it to one exact work item.
 * All trust anchors are supplied by server configuration, never by the request.
 * No permissive defaults are allowed.
 */
export function verifyExecutionECT(token, {
  trustedPublicKeyPem,
  expectedKeyId,
  expectedIssuer,
  expectedAudience,
  expectedPolicyDigest,
  expectedAuthorityDigest,
  expectedWorkstream,
  workItem,
  workflowId,
  nowSeconds = Math.floor(Date.now() / 1000),
} = {}) {
  if (typeof token !== 'string' || !token) reject('MISSING_AUTHORITY');
  if (!trustedPublicKeyPem || !expectedKeyId || !expectedIssuer || !expectedAudience ||
      !/^[0-9a-f]{64}$/.test(expectedPolicyDigest || '') ||
      !/^[0-9a-f]{64}$/.test(expectedAuthorityDigest || '') || !expectedWorkstream) {
    reject('ECT_TRUST_CONFIGURATION_MISSING');
  }
  if (!workItem?.work_item_id || !workItem?.workflow_id || !workItem?.connector || !workItem?.operation) {
    reject('ECT_WORK_ITEM_BINDING_REQUIRED');
  }
  if (workflowId !== workItem.workflow_id) reject('WORKFLOW_MISMATCH');

  const parts = token.split('.');
  if (parts.length !== 3) reject('MALFORMED_ECT');
  const header = parseObject(parts[0], 'MALFORMED_ECT_HEADER');
  const claims = parseObject(parts[1], 'MALFORMED_ECT_CLAIMS');
  const signature = decodeBase64Url(parts[2], 'MALFORMED_ECT_SIGNATURE');

  if (header.alg !== 'EdDSA' || header.typ !== 'ECT' || header.kid !== expectedKeyId ||
      claims.key_id !== expectedKeyId) reject('ECT_HEADER_REJECTED');

  let publicKey;
  try {
    publicKey = createPublicKey(trustedPublicKeyPem);
    if (publicKey.asymmetricKeyType !== 'ed25519') reject('ECT_PUBLIC_KEY_ALGORITHM_REJECTED');
    if (!verifySignature(null, Buffer.from(parts[0] + '.' + parts[1], 'ascii'), publicKey, signature)) {
      reject('INVALID_SIGNATURE');
    }
  } catch (error) {
    if (error?.code) throw error;
    reject('INVALID_SIGNATURE');
  }

  if (claims.contract_version !== 'reality-evaluation-context-v0.1') reject('ECT_CONTRACT_VERSION_REJECTED');
  if (claims.iss !== expectedIssuer) reject('ECT_ISSUER_MISMATCH');
  if (claims.aud !== expectedAudience) reject('ECT_AUDIENCE_MISMATCH');
  if (claims.policy_sha256 !== expectedPolicyDigest) reject('POLICY_MISMATCH');
  if (!claims.evaluation_boundaries || typeof claims.evaluation_boundaries !== 'object' ||
      Array.isArray(claims.evaluation_boundaries)) reject('ECT_BOUNDARIES_REQUIRED');
  const boundaries = claims.evaluation_boundaries;
  if (boundaries.policy_authority_digest !== expectedAuthorityDigest) reject('POLICY_AUTHORITY_MISMATCH');
  if (boundaries.target_workstream !== expectedWorkstream) reject('WORKSTREAM_MISMATCH');
  if (boundaries.workflow_id !== workItem.workflow_id || boundaries.workflow_id !== workflowId ||
      boundaries.work_item_id !== workItem.work_item_id ||
      boundaries.connector !== workItem.connector || boundaries.operation !== workItem.operation) {
    reject('ECT_OPERATION_BINDING_MISMATCH');
  }

  for (const field of ['iat', 'nbf', 'exp']) {
    if (!Number.isSafeInteger(claims[field])) reject('ECT_TIME_CLAIMS_INVALID');
  }
  if (claims.iat > nowSeconds || claims.nbf > nowSeconds) reject('ECT_NOT_YET_VALID');
  if (claims.exp <= nowSeconds || claims.exp <= claims.iat) reject('TOKEN_EXPIRED');
  if (claims.exp - claims.iat > 900) reject('ECT_TTL_EXCEEDS_LIMIT');
  if (typeof claims.jti !== 'string' || !claims.jti) reject('ECT_JTI_REQUIRED');
  if (typeof claims.sub !== 'string' || !claims.sub ||
      !claims.identity || claims.identity.sub !== claims.sub) reject('ECT_SUBJECT_BINDING_INVALID');

  const requiredScope = 'execute:' + workItem.connector + ':' + workItem.operation;
  if (!Array.isArray(claims.scope) || !claims.scope.length ||
      claims.scope.some((scope) => typeof scope !== 'string' || !scope) ||
      new Set(claims.scope).size !== claims.scope.length ||
      !claims.scope.includes(requiredScope)) reject('ECT_SCOPE_REJECTED');

  const authority = Object.freeze({
    authorization_id: claims.jti,
    workflow_id: workItem.workflow_id,
    principal: claims.sub,
    principal_id: claims.sub,
    allowed_operations: Object.freeze([Object.freeze({
      connector: workItem.connector,
      operation: workItem.operation,
      work_item_id: workItem.work_item_id,
    })]),
    authorized: true,
    status: 'ACTIVE',
    expires_at: new Date(claims.exp * 1000).toISOString(),
    scope: Object.freeze([...claims.scope]),
    policy_sha256: claims.policy_sha256,
    policy_authority_digest: boundaries.policy_authority_digest,
    target_workstream: boundaries.target_workstream,
    verified_by: ECT_EXECUTION_VERIFIER_VERSION,
  });
  verifiedAuthorities.add(authority);
  return authority;
}

export function isVerifiedExecutionAuthority(value) {
  return Boolean(value && typeof value === 'object' && verifiedAuthorities.has(value));
}
