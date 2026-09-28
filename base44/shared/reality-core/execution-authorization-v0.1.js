// Governed Execution Authorization Binding v0.1
// This module does not grant authority. It binds an already-recorded authorization
// to the exact continuity state, action class, target, candidate, and expiry.
// Executors must verify this binding immediately before consequential execution.

export const EXECUTION_AUTHORIZATION_VERSION = 'reality-execution-authorization-v0.1';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

export function canonicalExecutionBinding(value) {
  return JSON.stringify(canonical(value));
}

export async function digestExecutionBinding(value) {
  const bytes = new TextEncoder().encode(canonicalExecutionBinding(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function buildExecutionAuthorizationBinding({
  authorization_id,
  continuity_state_digest,
  action_class,
  target,
  candidate_digest,
  expires_at,
} = {}) {
  if (!authorization_id || !continuity_state_digest || !action_class || !target || !candidate_digest || !expires_at) {
    throw new Error('EXECUTION_AUTHORIZATION_BINDING_FIELDS_REQUIRED');
  }
  const binding = {
    schema: EXECUTION_AUTHORIZATION_VERSION,
    authorization_id,
    continuity_state_digest,
    action_class,
    target,
    candidate_digest,
    expires_at,
  };
  return {
    ...binding,
    binding_digest: await digestExecutionBinding(binding),
  };
}

export async function verifyExecutionAuthorizationBinding(
  authorization,
  {
    continuity_state_digest,
    action_class,
    target,
    candidate_digest,
    now = new Date(),
  } = {},
) {
  if (!authorization || authorization.schema !== EXECUTION_AUTHORIZATION_VERSION) return { valid: false, reason: 'AUTHORIZATION_SCHEMA_INVALID' };
  if (!authorization.authorization_id || !authorization.binding_digest) return { valid: false, reason: 'AUTHORIZATION_BINDING_MISSING' };
  if (authorization.continuity_state_digest !== continuity_state_digest) return { valid: false, reason: 'CONTINUITY_STATE_MISMATCH' };
  if (authorization.action_class !== action_class) return { valid: false, reason: 'ACTION_CLASS_MISMATCH' };
  if (canonicalExecutionBinding(authorization.target) !== canonicalExecutionBinding(target)) return { valid: false, reason: 'TARGET_MISMATCH' };
  if (authorization.candidate_digest !== candidate_digest) return { valid: false, reason: 'CANDIDATE_MISMATCH' };
  const expiresAt = Date.parse(authorization.expires_at);
  if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) return { valid: false, reason: 'AUTHORIZATION_EXPIRED' };
  const expectedDigest = await digestExecutionBinding({
    schema: authorization.schema,
    authorization_id: authorization.authorization_id,
    continuity_state_digest: authorization.continuity_state_digest,
    action_class: authorization.action_class,
    target: authorization.target,
    candidate_digest: authorization.candidate_digest,
    expires_at: authorization.expires_at,
  });
  if (expectedDigest !== authorization.binding_digest) return { valid: false, reason: 'AUTHORIZATION_BINDING_TAMPERED' };
  return { valid: true, reason: 'EXECUTION_AUTHORIZATION_VALID' };
}