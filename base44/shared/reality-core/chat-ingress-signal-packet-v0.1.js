// Reality Chat Ingress Signal Packet v0.1.
//
// Admits the current authenticated user's chat message into a governed canonical
// signal packet using the existing Fragmented Signal Cleaner (v0.2). This is the
// first small step toward governed multi-lane orchestration: every ordinary user
// question is canonicalized before model invocation.
//
// The cleaner remains authoritative only for signal canonicalization, not truth.
// A cleaner failure must fail closed — the raw question must never bypass the
// cleaner and reach the model directly.

import {
  SIGNAL_CLEANER_VERSION,
  cleanFragmentedSignals,
} from './fragmented-signal-cleaner.js';

export const CHAT_INGRESS_SIGNAL_PACKET_VERSION = 'reality-chat-ingress-signal-packet-v0.1';

export function buildChatIngressSignalPacket({
  packet_id,
  user_message_id,
  principal_id,
  content,
  received_at,
}) {
  if (typeof user_message_id !== 'string' || !user_message_id.trim()) {
    throw new Error('chat ingress signal packet requires user_message_id');
  }
  if (typeof principal_id !== 'string' || !principal_id.trim()) {
    throw new Error('chat ingress signal packet requires principal_id');
  }
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('chat ingress signal packet requires non-empty content');
  }
  const receivedAt = typeof received_at === 'string' && received_at.trim()
    ? received_at
    : new Date().toISOString();
  const packetId = (typeof packet_id === 'string' && packet_id.trim())
    ? packet_id.trim()
    : `chat-ingress:${user_message_id}`;

  // observed_at is intentionally omitted: the composition time of the user's
  // message is not knowable from the runtime boundary. The cleaner keeps it
  // unresolved rather than guessing.
  return cleanFragmentedSignals({
    packet_id: packetId,
    reconciled_at: receivedAt,
    signals: [
      {
        signal_id: `chat-user-message:${user_message_id}`,
        admission_ref: `chat-admission:${user_message_id}`,
        source_ref: 'personal-reality-chat:user-message',
        content,
        received_at: receivedAt,
        admitted_at: receivedAt,
      },
    ],
  });
}

// Render the canonical packet as structured prompt context for the model.
// Includes only the fields the model needs to treat it as structured input.
export function chatIngressPacketForPrompt(packet) {
  const observation = packet.observations[0];
  return JSON.stringify({
    packet_version: packet.packet_version,
    packet_id: packet.packet_id,
    cleaner_version: packet.metadata.cleaner_version,
    cleaner_authority: packet.metadata.authority,
    observation: {
      id: observation.id,
      source_ref: observation.source_ref,
      content: observation.content,
      observed_at: observation.observed_at,
      provenance_ref: observation.provenance_ref,
      admission_ref: observation.attributes.admission_ref,
      received_at: observation.attributes.received_at,
      admitted_at: observation.attributes.admitted_at,
      disclosure_state: observation.attributes.disclosure_state,
    },
    conflicts: packet.conflicts,
    policies: {
      semantic_policy: packet.metadata.semantic_policy,
      conflict_policy: packet.metadata.conflict_policy,
      independence_policy: packet.metadata.independence_policy,
      dedupe_policy: packet.metadata.dedupe_policy,
    },
  }, null, 2);
}