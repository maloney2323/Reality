// Reality Execution Claim v0.1
//
// G1.1 separates authorization validity from exclusive execution ownership.
// The claim MUST be persisted through a storage primitive that provides an
// atomic compare-and-set/unique-claim guarantee. This module intentionally
// does not pretend that a normal read followed by update is atomic.

import { canonicalJson, randomToken, sha256Hex } from '../action-gate/canonical.js';

export const EXECUTION_CLAIM_VERSION = 'reality-execution-claim-v0.1';
export const EXECUTION_CLAIM_LEASE_MS = 2 * 60 * 1000;

export const ExecutionClaimState = Object.freeze({
  ISSUED: 'ISSUED',
  CLAIMED: 'CLAIMED',
  CONSUMED: 'CONSUMED',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
});

export async function authorizationDigest(authorization) {
  const normalized = {
    authorization_id: authorization.authorization_id,
    continuity_state_id: authorization.continuity_state_id,
    continuity_state_digest: authorization.continuity_state_digest,
    action_class: authorization.action_class,
    target_digest: authorization.target_digest,
    candidate_digest: authorization.candidate_digest,
    expires_at: authorization.expires_at,
    nonce: authorization.nonce,
  };
  return sha256Hex(canonicalJson(normalized));
}

export async function buildExecutionClaim({
  authorization,
  execution_id,
  request_id,
  now = new Date().toISOString(),
  lease_ms = EXECUTION_CLAIM_LEASE_MS,
} = {}) {
  if (!authorization?.authorization_id) throw new Error('authorization_id is required');
  if (authorization.execution_state !== ExecutionClaimState.ISSUED) throw new Error('authorization must be ISSUED before claim');
  if (!execution_id || !request_id) throw new Error('execution_id and request_id are required');

  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs)) throw new Error('now must be valid ISO-8601');
  const authExpiry = Date.parse(authorization.expires_at);
  if (!Number.isFinite(authExpiry) || nowMs >= authExpiry) throw new Error('authorization expired');

  const claim_nonce = randomToken(24);
  const lease_expires_at = new Date(Math.min(nowMs + lease_ms, authExpiry)).toISOString();

  const claim = {
    schema_version: EXECUTION_CLAIM_VERSION,
    authorization_id: authorization.authorization_id,
    execution_id,
    request_id,
    claim_nonce,
    claimed_at: new Date(nowMs).toISOString(),
    lease_expires_at,
    authorization_digest: await authorizationDigest(authorization),
    state: ExecutionClaimState.CLAIMED,
  };

  return Object.freeze(claim);
}

export async function verifyExecutionClaim({ authorization, claim, now = new Date().toISOString() } = {}) {
  if (!authorization || !claim) return { valid: false, code: 'CLAIM_MISSING' };
  if (claim.schema_version !== EXECUTION_CLAIM_VERSION) return { valid: false, code: 'CLAIM_SCHEMA_INVALID' };
  if (claim.authorization_id !== authorization.authorization_id) return { valid: false, code: 'AUTHORIZATION_ID_MISMATCH' };
  if (!claim.execution_id || !claim.request_id || !claim.claim_nonce) return { valid: false, code: 'CLAIM_IDENTITY_INVALID' };
  if (claim.state !== ExecutionClaimState.CLAIMED) return { valid: false, code: 'CLAIM_NOT_ACTIVE' };
  if (authorization.execution_state !== ExecutionClaimState.CLAIMED) return { valid: false, code: 'AUTHORIZATION_NOT_CLAIMED' };
  if (authorization.execution_id !== claim.execution_id) return { valid: false, code: 'EXECUTION_ID_MISMATCH' };
  if (authorization.claim_nonce !== claim.claim_nonce) return { valid: false, code: 'CLAIM_NONCE_MISMATCH' };
  if (authorization.lease_expires_at !== claim.lease_expires_at) return { valid: false, code: 'LEASE_MISMATCH' };

  const digest = await authorizationDigest(authorization);
  if (digest !== claim.authorization_digest) return { valid: false, code: 'AUTHORIZATION_DIGEST_MISMATCH' };

  const nowMs = Date.parse(now);
  const leaseMs = Date.parse(claim.lease_expires_at);
  if (!Number.isFinite(nowMs) || !Number.isFinite(leaseMs)) return { valid: false, code: 'LEASE_TIMESTAMP_INVALID' };
  if (nowMs >= leaseMs) return { valid: false, code: 'LEASE_EXPIRED' };

  return { valid: true, code: null };
}

export function buildAtomicClaimInstruction({
  authorization_id,
  expected_state = ExecutionClaimState.ISSUED,
  execution_id,
  request_id,
  claim_nonce,
  claimed_at,
  lease_expires_at,
} = {}) {
  if (!authorization_id || !execution_id || !request_id || !claim_nonce) throw new Error('claim instruction identity is incomplete');

  return Object.freeze({
    schema_version: EXECUTION_CLAIM_VERSION,
    operation: 'ATOMIC_COMPARE_AND_SET',
    authorization_id,
    expected_state,
    next_state: ExecutionClaimState.CLAIMED,
    execution_id,
    request_id,
    claim_nonce,
    claimed_at,
    lease_expires_at,
    requirement: 'Exactly one executor may transition this authorization from ISSUED to CLAIMED.',
    failure_if_not_exactly_one: 'AUTHORIZATION_ALREADY_CLAIMED',
  });
}

export function assertAtomicClaimResult(result) {
  if (!result || result.atomic !== true || result.claimed !== true || result.affected_count !== 1) {
    throw new Error('ATOMIC_EXECUTION_CLAIM_NOT_ESTABLISHED');
  }
  return true;
}