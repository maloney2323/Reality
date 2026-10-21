// Public chat ingress is an untrusted input boundary.
// This function intentionally refuses system/continuity/universe context from
// caller-controlled JSON. Server-owned evidence may be constructed separately
// only after authenticated provider readback and explicit admission.
export const CHAT_CONTEXT_BOUNDARY_VERSION = 'reality-chat-context-boundary-v0.1';

export function requireNoClientSystemContext(body) {
  if (body?.systemContext != null) {
    const error = new Error('UNTRUSTED_SYSTEM_CONTEXT_REJECTED');
    error.status = 400;
    throw error;
  }
  return null;
}
