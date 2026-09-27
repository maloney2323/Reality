import { canonicalJson, sha256Hex } from '../action-gate/canonical.js';
import { verifyEd25519Jwk } from '../action-gate/key-provider.js';

export const TRUSTED_ISSUER_VERSION = 'reality-trusted-issuer-v0.1';

export const TRUST_FAILURE_CODES = Object.freeze({
  ISSUER_MISSING: 'ISSUER_MISSING',
  ISSUER_UNKNOWN: 'ISSUER_UNKNOWN',
  ISSUER_REVOKED: 'ISSUER_REVOKED',
  ISSUER_SUSPENDED: 'ISSUER_SUSPENDED',
  ISSUER_EXPIRED: 'ISSUER_EXPIRED',
  ISSUER_NOT_YET_ACTIVE: 'ISSUER_NOT_YET_ACTIVE',
  ISSUER_KEY_MISMATCH: 'ISSUER_KEY_MISMATCH',
  ISSUER_ALGORITHM_MISMATCH: 'ISSUER_ALGORITHM_MISMATCH',
  ISSUER_SCOPE_MISMATCH: 'ISSUER_SCOPE_MISMATCH',
  ISSUER_SIGNATURE_INVALID: 'ISSUER_SIGNATURE_INVALID',
  PRODUCTION_TRUST_ROOT_BLOCKED: 'PRODUCTION_TRUST_ROOT_BLOCKED',
});

function normalize(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

export function digestTrustedIssuerRecord(issuer) {
  return sha256Hex(canonicalJson(normalize({
    schema: 'reality.trusted-issuer-record.v0.1',
    issuer_id: issuer?.issuer_id,
    issuer_type: issuer?.issuer_type,
    key_id: issuer?.key_id,
    algorithm: issuer?.algorithm,
    public_key_b64: issuer?.public_key_b64,
    status: issuer?.status,
    authorized_action_classes: issuer?.authorized_action_classes ?? [],
    authorized_targets: issuer?.authorized_targets ?? [],
    not_before: issuer?.not_before,
    not_after: issuer?.not_after,
    registry_version: issuer?.registry_version,
    trust_environment: issuer?.trust_environment,
    production_execution_allowed: issuer?.production_execution_allowed === true,
  })));
}

function targetMatches(authorizedTargets, target) {
  if (!authorizedTargets?.length) return false;
  return authorizedTargets.some(rule => {
    if (!rule || typeof rule !== 'object') return false;
    return Object.entries(rule).every(([key, expected]) => {
      if (expected === '*') return true;
      return target?.[key] === expected;
    });
  });
}

export async function verifyTrustedIssuer({
  authorization,
  issuerRecord,
  now = new Date().toISOString(),
  requestedActionClass,
  target,
  productionExecution = false,
}) {
  if (!authorization?.issuer_id || !authorization?.issuer_key_id) {
    return { verified: false, code: TRUST_FAILURE_CODES.ISSUER_MISSING };
  }
  if (!issuerRecord || issuerRecord.issuer_id !== authorization.issuer_id) {
    return { verified: false, code: TRUST_FAILURE_CODES.ISSUER_UNKNOWN };
  }
  if (issuerRecord.status === 'REVOKED') {
    return { verified: false, code: TRUST_FAILURE_CODES.ISSUER_REVOKED };
  }
  if (issuerRecord.status === 'SUSPENDED') {
    return { verified: false, code: TRUST_FAILURE_CODES.ISSUER_SUSPENDED };
  }

  const at = Date.parse(now);
  const notBefore = Date.parse(issuerRecord.not_before);
  const notAfter = Date.parse(issuerRecord.not_after);
  if (!Number.isFinite(at) || !Number.isFinite(notBefore) || !Number.isFinite(notAfter)) {
    return { verified: false, code: TRUST_FAILURE_CODES.ISSUER_EXPIRED };
  }
  if (at < notBefore) {
    return { verified: false, code: TRUST_FAILURE_CODES.ISSUER_NOT_YET_ACTIVE };
  }
  if (at > notAfter || issuerRecord.status === 'EXPIRED') {
    return { verified: false, code: TRUST_FAILURE_CODES.ISSUER_EXPIRED };
  }

  if (issuerRecord.key_id !== authorization.issuer_key_id) {
    return { verified: false, code: TRUST_FAILURE_CODES.ISSUER_KEY_MISMATCH };
  }
  if (issuerRecord.algorithm !== authorization.signature_algorithm) {
    return { verified: false, code: TRUST_FAILURE_CODES.ISSUER_ALGORITHM_MISMATCH };
  }
  if (issuerRecord.algorithm !== 'Ed25519') {
    return { verified: false, code: TRUST_FAILURE_CODES.ISSUER_ALGORITHM_MISMATCH };
  }

  if (requestedActionClass && !issuerRecord.authorized_action_classes?.includes(requestedActionClass)) {
    return { verified: false, code: TRUST_FAILURE_CODES.ISSUER_SCOPE_MISMATCH };
  }
  if (target && !targetMatches(issuerRecord.authorized_targets, target)) {
    return { verified: false, code: TRUST_FAILURE_CODES.ISSUER_SCOPE_MISMATCH };
  }

  if (productionExecution && (
    issuerRecord.trust_environment !== 'PRODUCTION' ||
    issuerRecord.production_execution_allowed !== true
  )) {
    return { verified: false, code: TRUST_FAILURE_CODES.PRODUCTION_TRUST_ROOT_BLOCKED };
  }

  const payload = authorization.signed_payload;
  const signature = authorization.signature;
  if (!payload || !signature) {
    return { verified: false, code: TRUST_FAILURE_CODES.ISSUER_SIGNATURE_INVALID };
  }

  let signatureValid = false;
  try {
    signatureValid = await verifyEd25519Jwk(
      { kty: 'OKP', crv: 'Ed25519', x: issuerRecord.public_key_b64 },
      canonicalJson(payload),
      signature,
    );
  } catch {
    signatureValid = false;
  }

  if (!signatureValid) {
    return { verified: false, code: TRUST_FAILURE_CODES.ISSUER_SIGNATURE_INVALID };
  }

  return {
    verified: true,
    schema: 'reality.trusted-issuer-verification.v0.1',
    issuer_id: issuerRecord.issuer_id,
    key_id: issuerRecord.key_id,
    issuer_record_digest: await digestTrustedIssuerRecord(issuerRecord),
    trust_environment: issuerRecord.trust_environment,
    production_execution_allowed: issuerRecord.production_execution_allowed === true,
  };
}