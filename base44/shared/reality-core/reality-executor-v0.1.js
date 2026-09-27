// Reality Execution Constitution v0.1 — Universal Executor Interface (G1/G1.1)
//
// G1 establishes one machine-readable boundary for consequential execution.
// G1.1 adds an explicit execution claim/lease contract. The claim contract
// prevents an authorization from being treated as simultaneously executable
// by competing executor attempts.
//
// This module defines contract and admissibility checks. It does not itself
// provide a transactional datastore primitive and therefore never claims
// atomic persistence merely from these functions.

import { canonicalJson, sha256Hex } from '../action-gate/canonical.js';

export const REALITY_EXECUTOR_VERSION = 'reality-executor-v0.1';

export const ExecutorClass = Object.freeze({
  READ_ONLY_EVIDENCE_MODULE: 'READ_ONLY_EVIDENCE_MODULE',
  GOVERNED_REASONING_MODULE: 'GOVERNED_REASONING_MODULE',
  STATE_TRANSITION_MODULE: 'STATE_TRANSITION_MODULE',
  CONSEQUENTIAL_EXECUTOR: 'CONSEQUENTIAL_EXECUTOR',
});

export const ExecutionLifecycle = Object.freeze({
  RECEIVED: 'RECEIVED',
  ADMISSIBILITY_CHECK: 'ADMISSIBILITY_CHECK',
  EXECUTION_CLAIM_REQUIRED: 'EXECUTION_CLAIM_REQUIRED',
  EXECUTING: 'EXECUTING',
  OBSERVING: 'OBSERVING',
  RECEIPT_REQUIRED: 'RECEIPT_REQUIRED',
  CONTINUITY_CLOSURE_REQUIRED: 'CONTINUITY_CLOSURE_REQUIRED',
  COMPLETED: 'COMPLETED',
  BLOCKED: 'BLOCKED',
  INTEGRITY_INCIDENT: 'INTEGRITY_INCIDENT',
});

export const ExecutionFailureCode = Object.freeze({
  INVALID_REQUEST: 'INVALID_REQUEST',
  MISSING_AUTHORIZATION: 'MISSING_AUTHORIZATION',
  INVALID_AUTHORIZATION: 'INVALID_AUTHORIZATION',
  AUTHORIZATION_EXPIRED: 'AUTHORIZATION_EXPIRED',
  AUTHORIZATION_CONSUMED: 'AUTHORIZATION_CONSUMED',
  AUTHORIZATION_ALREADY_CLAIMED: 'AUTHORIZATION_ALREADY_CLAIMED',
  EXECUTION_ID_MISMATCH: 'EXECUTION_ID_MISMATCH',
  LEASE_EXPIRED: 'LEASE_EXPIRED',
  SNAPSHOT_MISSING: 'SNAPSHOT_MISSING',
  SNAPSHOT_INVALID: 'SNAPSHOT_INVALID',
  SNAPSHOT_DIGEST_MISMATCH: 'SNAPSHOT_DIGEST_MISMATCH',
  ACTION_CLASS_MISMATCH: 'ACTION_CLASS_MISMATCH',
  TARGET_MISMATCH: 'TARGET_MISMATCH',
  CANDIDATE_MISMATCH: 'CANDIDATE_MISMATCH',
  PRECONDITION_FAILED: 'PRECONDITION_FAILED',
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  RECEIPT_MISSING: 'RECEIPT_MISSING',
  CONTINUITY_CLOSURE_FAILED: 'CONTINUITY_CLOSURE_FAILED',
  REPLAY_BLOCKED: 'REPLAY_BLOCKED',
});

const CONSEQUENTIAL = ExecutorClass.CONSEQUENTIAL_EXECUTOR;

function fail(message) {
  throw new Error('Reality Executor v0.1 invalid: ' + message);
}

function requiredString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') fail(field + ' is required');
  return value.trim();
}

function optionalString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function clone(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(clone);
  const out = {};
  for (const key of Object.keys(value)) out[key] = clone(value[key]);
  return out;
}

function normalizeObject(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(field + ' must be an object');
  return clone(value);
}

export async function digestExecutionCandidate(candidate) {
  return sha256Hex(canonicalJson(normalizeObject(candidate, 'candidate')));
}

export async function digestExecutionTarget(target) {
  return sha256Hex(canonicalJson(normalizeObject(target, 'target')));
}

export function buildExecutionIdentity({ execution_id, authorization_id, request_id, claim_nonce, lease_expires_at } = {}) {
  return Object.freeze({
    execution_id: requiredString(execution_id, 'execution_id'),
    authorization_id: requiredString(authorization_id, 'authorization_id'),
    request_id: requiredString(request_id, 'request_id'),
    claim_nonce: requiredString(claim_nonce, 'claim_nonce'),
    lease_expires_at: new Date(requiredString(lease_expires_at, 'lease_expires_at')).toISOString(),
  });
}

export function verifyExecutionClaim({ authorization, execution_identity, now = new Date().toISOString() } = {}) {
  if (!authorization) return { valid: false, failure_code: ExecutionFailureCode.MISSING_AUTHORIZATION };
  if (!execution_identity) return { valid: false, failure_code: ExecutionFailureCode.INVALID_AUTHORIZATION };

  if (authorization.execution_state !== 'CLAIMED') {
    return {
      valid: false,
      failure_code: authorization.execution_state === 'CONSUMED'
        ? ExecutionFailureCode.AUTHORIZATION_CONSUMED
        : ExecutionFailureCode.AUTHORIZATION_ALREADY_CLAIMED,
    };
  }

  if (authorization.execution_id !== execution_identity.execution_id) {
    return { valid: false, failure_code: ExecutionFailureCode.EXECUTION_ID_MISMATCH };
  }

  if (authorization.authorization_id !== execution_identity.authorization_id) {
    return { valid: false, failure_code: ExecutionFailureCode.INVALID_AUTHORIZATION };
  }

  if (authorization.claim_nonce !== execution_identity.claim_nonce) {
    return { valid: false, failure_code: ExecutionFailureCode.INVALID_AUTHORIZATION };
  }

  const nowMs = Date.parse(now);
  const leaseMs = Date.parse(authorization.lease_expires_at);
  if (!Number.isFinite(nowMs) || !Number.isFinite(leaseMs)) {
    return { valid: false, failure_code: ExecutionFailureCode.INVALID_AUTHORIZATION };
  }
  if (nowMs >= leaseMs) {
    return { valid: false, failure_code: ExecutionFailureCode.LEASE_EXPIRED };
  }

  return { valid: true, failure_code: null };
}

export async function buildContinuitySnapshot({
  continuity_state_id,
  parent_state_id = null,
  world_id,
  transition_type,
  transition_reason,
  evidence_refs = [],
  epistemic_state = {},
  open_debt = [],
  created_at,
  status = 'VALID',
} = {}) {
  requiredString(continuity_state_id, 'continuity_state_id');
  requiredString(world_id, 'world_id');
  requiredString(transition_type, 'transition_type');
  requiredString(transition_reason, 'transition_reason');
  requiredString(created_at, 'created_at');

  if (!Array.isArray(evidence_refs)) fail('evidence_refs must be an array');
  if (!Array.isArray(open_debt)) fail('open_debt must be an array');
  if (!epistemic_state || typeof epistemic_state !== 'object' || Array.isArray(epistemic_state)) fail('epistemic_state must be an object');

  const body = {
    schema_version: 'reality-continuity-state-v0.1',
    continuity_state_id: continuity_state_id.trim(),
    parent_state_id: optionalString(parent_state_id),
    world_id: world_id.trim(),
    transition_type: transition_type.trim(),
    transition_reason: transition_reason.trim(),
    evidence_refs: [...evidence_refs],
    epistemic_state: clone(epistemic_state),
    open_debt: [...open_debt],
    created_at: new Date(created_at).toISOString(),
    status: status === 'VALID' ? 'VALID' : status,
  };

  const state_digest = await sha256Hex(canonicalJson(body));
  return Object.freeze({ ...body, state_digest });
}

export function assertValidContinuitySnapshot(snapshot) {
  if (!snapshot || snapshot.schema_version !== 'reality-continuity-state-v0.1') fail('continuity snapshot schema is invalid');
  requiredString(snapshot.continuity_state_id, 'continuity_state_id');
  requiredString(snapshot.state_digest, 'state_digest');
  requiredString(snapshot.world_id, 'world_id');
  if (snapshot.status !== 'VALID') fail('continuity snapshot is not valid');
  return true;
}

export async function verifyContinuitySnapshot(snapshot) {
  try {
    assertValidContinuitySnapshot(snapshot);
    const { state_digest, ...body } = snapshot;
    return (await sha256Hex(canonicalJson(body))) === state_digest;
  } catch {
    return false;
  }
}

export async function buildExecutionRequest({
  request_id,
  executor_class = CONSEQUENTIAL,
  authorization,
  continuity_snapshot,
  action_class,
  target,
  candidate,
  preconditions = [],
  execution_budget = {},
  requested_at,
  execution_identity = null,
} = {}) {
  requiredString(request_id, 'request_id');
  requiredString(action_class, 'action_class');
  requiredString(requested_at, 'requested_at');
  if (!authorization) fail('authorization is required');
  if (!continuity_snapshot) fail('continuity_snapshot is required');
  assertValidContinuitySnapshot(continuity_snapshot);

  const target_digest = await digestExecutionTarget(target);
  const candidate_digest = await digestExecutionCandidate(candidate);

  return Object.freeze({
    schema_version: REALITY_EXECUTOR_VERSION,
    request_id: request_id.trim(),
    executor_class,
    authorization: clone(authorization),
    continuity_snapshot: clone(continuity_snapshot),
    action_class: action_class.trim(),
    target: clone(target),
    target_digest,
    candidate: clone(candidate),
    candidate_digest,
    preconditions: Array.isArray(preconditions) ? clone(preconditions) : fail('preconditions must be an array'),
    execution_budget: normalizeObject(execution_budget, 'execution_budget'),
    requested_at: new Date(requested_at).toISOString(),
    execution_identity: execution_identity ? clone(execution_identity) : null,
  });
}

export async function verifyExecutionRequest({
  request,
  now = new Date().toISOString(),
  expected_action_class,
  expected_target,
  expected_candidate,
  require_claim = true,
} = {}) {
  const failResult = (code, detail) => Object.freeze({
    admissible: false,
    failure_code: code,
    detail,
    lifecycle: ExecutionLifecycle.BLOCKED,
  });

  try {
    if (!request || request.schema_version !== REALITY_EXECUTOR_VERSION) return failResult(ExecutionFailureCode.INVALID_REQUEST, 'executor request schema mismatch');
    if (request.executor_class !== CONSEQUENTIAL) return failResult(ExecutionFailureCode.INVALID_REQUEST, 'consequential executor requires CONSEQUENTIAL_EXECUTOR class');
    if (!request.authorization) return failResult(ExecutionFailureCode.MISSING_AUTHORIZATION, 'authorization is required');

    const auth = request.authorization;
    const snapshot = request.continuity_snapshot;

    if (!snapshot || snapshot.continuity_state_id !== auth.continuity_state_id) return failResult(ExecutionFailureCode.SNAPSHOT_INVALID, 'authorization is not bound to the supplied continuity_state_id');
    if (snapshot.state_digest !== auth.continuity_state_digest) return failResult(ExecutionFailureCode.SNAPSHOT_DIGEST_MISMATCH, 'authorization continuity digest does not match supplied snapshot');
    if (snapshot.status !== 'VALID') return failResult(ExecutionFailureCode.SNAPSHOT_INVALID, 'continuity snapshot is not valid');
    if (!(await verifyContinuitySnapshot(snapshot))) return failResult(ExecutionFailureCode.SNAPSHOT_DIGEST_MISMATCH, 'continuity snapshot digest failed verification');

    if (expected_action_class && request.action_class !== expected_action_class) return failResult(ExecutionFailureCode.ACTION_CLASS_MISMATCH, 'action class mismatch');
    if (auth.action_class !== request.action_class) return failResult(ExecutionFailureCode.ACTION_CLASS_MISMATCH, 'authorization action class mismatch');

    if (expected_target !== undefined && request.target_digest !== await digestExecutionTarget(expected_target)) return failResult(ExecutionFailureCode.TARGET_MISMATCH, 'target digest mismatch');
    if (auth.target_digest !== request.target_digest) return failResult(ExecutionFailureCode.TARGET_MISMATCH, 'authorization target digest mismatch');

    if (expected_candidate !== undefined && request.candidate_digest !== await digestExecutionCandidate(expected_candidate)) return failResult(ExecutionFailureCode.CANDIDATE_MISMATCH, 'candidate digest mismatch');
    if (auth.candidate_digest !== request.candidate_digest) return failResult(ExecutionFailureCode.CANDIDATE_MISMATCH, 'authorization candidate digest mismatch');

    if (auth.execution_state === 'CONSUMED') return failResult(ExecutionFailureCode.REPLAY_BLOCKED, 'authorization has already been consumed');
    if (require_claim && auth.execution_state !== 'CLAIMED') {
      return failResult(
        auth.execution_state === 'CLAIMED' ? ExecutionFailureCode.INVALID_AUTHORIZATION : ExecutionFailureCode.AUTHORIZATION_ALREADY_CLAIMED,
        'consequential execution requires an atomic execution claim before the external effect',
      );
    }

    if (request.execution_identity) {
      const claimCheck = verifyExecutionClaim({
        authorization: auth,
        execution_identity: request.execution_identity,
        now,
      });
      if (!claimCheck.valid) return failResult(claimCheck.failure_code, 'execution claim is not valid');
    }

    const nowMs = Date.parse(now);
    const expiresMs = Date.parse(auth.expires_at);
    if (!Number.isFinite(nowMs) || !Number.isFinite(expiresMs)) return failResult(ExecutionFailureCode.INVALID_AUTHORIZATION, 'authorization timestamps are invalid');
    if (nowMs >= expiresMs) return failResult(ExecutionFailureCode.AUTHORIZATION_EXPIRED, 'authorization has expired');

    return Object.freeze({
      admissible: true,
      failure_code: null,
      detail: 'request is admissible after exact continuity, authorization, claim, target, and candidate binding checks',
      lifecycle: ExecutionLifecycle.ADMISSIBILITY_CHECK,
      requirements: Object.freeze({
        verify_issuer_authenticity: true,
        atomically_claim_authorization: true,
        verify_current_preconditions: true,
        observe_external_effect: true,
        emit_execution_receipt: true,
        close_continuity_transition: true,
      }),
    });
  } catch (error) {
    return failResult(ExecutionFailureCode.INVALID_REQUEST, error?.message || 'invalid execution request');
  }
}

export function buildExecutionResult({
  request_id,
  status,
  lifecycle,
  execution_receipt = null,
  observed_effect = null,
  resulting_continuity_state = null,
  verification_status = 'UNVERIFIED',
  failure_reason = null,
} = {}) {
  requiredString(request_id, 'request_id');
  requiredString(status, 'status');
  requiredString(lifecycle, 'lifecycle');
  if (status === 'COMPLETED' && (!execution_receipt || !resulting_continuity_state)) fail('COMPLETED requires execution_receipt and resulting_continuity_state');
  if (status === 'EXECUTED_RECEIPT_UNVERIFIED') {
    if (verification_status === 'VERIFIED' || resulting_continuity_state) fail('receipt-unverified result cannot claim verified closure');
    lifecycle = ExecutionLifecycle.INTEGRITY_INCIDENT;
  }

  return Object.freeze({
    schema_version: REALITY_EXECUTOR_VERSION,
    request_id: request_id.trim(),
    status,
    lifecycle,
    execution_receipt: clone(execution_receipt),
    observed_effect: clone(observed_effect),
    resulting_continuity_state: clone(resulting_continuity_state),
    verification_status,
    failure_reason: optionalString(failure_reason),
  });
}