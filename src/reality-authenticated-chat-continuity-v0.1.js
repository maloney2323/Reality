import { deriveContinuityRootId } from './reality-continuous-continuity-v1.0.js';

export const AUTHENTICATED_CHAT_CONTINUITY_VERSION = 'reality-authenticated-chat-continuity-v0.1';
const nonempty = v => typeof v === 'string' && v.trim().length > 0;

// Server-side composition of the verified Base44 user and their selected Thought.
// The browser may choose a conversation selector, but cannot provide identity,
// accepted evidence, system truth, or a continuity ledger directly.
export function buildAuthenticatedChatContinuity({ body = {}, authenticatedContext } = {}) {
  const userId = authenticatedContext?.authenticated_user_id;
  const conversationId = body?.conversation_id;
  const thoughtId = body?.thought_id;
  if (!nonempty(userId)) throw new Error('AUTHENTICATED_CHAT_IDENTITY_REQUIRED');
  if (!nonempty(conversationId) || !nonempty(thoughtId)) throw new Error('AUTHENTICATED_CHAT_TRACE_REQUIRED');
  const conversation = conversationId.trim();
  const thought = thoughtId.trim();
  const scopedConversation = 'principal:' + userId + ':thought:' + thought + ':conversation:' + conversation;
  const continuityRootId = deriveContinuityRootId({ conversationId: scopedConversation });
  if (!continuityRootId) throw new Error('CHAT_CONTINUITY_ROOT_REQUIRED');

  return Object.freeze({
    ...(authenticatedContext || {}),
    conversation_id: scopedConversation,
    client_conversation_selector: conversation,
    thought_id: thought,
    continuity_root_id: continuityRootId,
    authenticated_user_id: userId,
    identity_basis: 'BASE44_VERIFIED_USER_ME',
    continuity_version: AUTHENTICATED_CHAT_CONTINUITY_VERSION,
    truth_authorized: false,
    action_authorized: false,
  });
}
