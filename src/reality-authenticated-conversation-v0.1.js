import { createHash } from 'node:crypto';

// The client may select a thread handle, never a continuity root, universe
// entry, obligation, authority, or evidence. A server-verified principal is
// ALWAYS included in the derived root. Cross-account thread IDs never collide.
const THREAD_ID = /^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,127}$/;
const text = value => typeof value === 'string' ? value.trim() : '';

export function requireConversationSelector(body) {
  const id = body?.conversation_id;
  if (typeof id !== 'string' || !THREAD_ID.test(id)) {
    const error = new Error('CONVERSATION_ID_REQUIRED_OR_INVALID');
    error.status = 400;
    throw error;
  }
  return id;
}

export function derivePrincipalScopedContinuityRoot({ principalId, conversationId } = {}) {
  const principal = text(principalId);
  if (!principal.startsWith('base44:') || principal.length <= 7) {
    throw new Error('VERIFIED_BASE44_PRINCIPAL_REQUIRED_FOR_CONTINUITY');
  }
  if (typeof conversationId !== 'string' || !THREAD_ID.test(conversationId)) {
    throw new Error('CONVERSATION_ID_REQUIRED_OR_INVALID');
  }
  // Fixed domain separation guards against collision with old/other roots.
  const hash = createHash('sha256').update(JSON.stringify([
    'reality:authenticated-conversation-root:v0.1',
    principal, conversationId,
  ])).digest('hex');
  return 'continuity:principal:' + hash;
}
