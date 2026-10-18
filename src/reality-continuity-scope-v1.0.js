import crypto from 'node:crypto';

export const REALITY_CONTINUITY_SCOPE_VERSION = 'reality-continuity-scope-v1.0';

function requiredIdentifier(value, code) {
  if (typeof value !== 'string') throw new Error(code);
  const normalized = value.trim();
  if (!normalized || normalized.length > 256 || /[\\u0000-\\u001f\\u007f]/.test(normalized)) {
    throw new Error(code);
  }
  return normalized;
}

/**
 * Derive continuity identity from the server-verified principal and a client
 * conversation identifier. The client identifier selects a conversation; it
 * is never treated as proof of identity or authorization by itself.
 */
export function deriveServerContinuityScope({ principalId, conversationId } = {}) {
  const principal = requiredIdentifier(principalId, 'CONTINUITY_PRINCIPAL_REQUIRED');
  const conversation = requiredIdentifier(conversationId, 'CONTINUITY_CONVERSATION_REQUIRED');
  const worldlineDigest = crypto.createHash('sha256')
    .update('reality-worldline-v1\\0')
    .update(principal)
    .digest('hex');
  const rootDigest = crypto.createHash('sha256')
    .update('reality-continuity-root-v1\\0')
    .update(principal)
    .update('\\0')
    .update(conversation)
    .digest('hex');
  return Object.freeze({
    version: REALITY_CONTINUITY_SCOPE_VERSION,
    continuity_root_id: 'continuity:v1:' + rootDigest.slice(0, 32),
    worldline_id: 'reality:user:v1:' + worldlineDigest.slice(0, 32),
    scope_source: 'SERVER_DERIVED_PRINCIPAL_AND_CONVERSATION',
  });
}
