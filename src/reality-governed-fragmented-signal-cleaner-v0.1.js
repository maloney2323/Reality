import crypto from 'node:crypto';

export const GOVERNED_FRAGMENTED_SIGNAL_CLEANER_VERSION = '0.1.0';
export const CANONICAL_PACKET_VERSION = 'raw-signal-packet-v0.1';

function hash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
function required(value, code) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(code);
  return value;
}
function normalize(text) {
  return text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();
}
function fragment(text) {
  return text
    .split(/\n+|(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function createRawSignalPacket({ message, source = 'USER_MESSAGE', observedAt = new Date().toISOString() } = {}) {
  const raw = required(message, 'MESSAGE_REQUIRED');
  const packet = {
    packet_version: CANONICAL_PACKET_VERSION,
    packet_id: `rsp:${hash({ raw, source, observedAt }).slice(0, 32)}`,
    source,
    observed_at: observedAt,
    raw_content: raw,
    raw_content_digest: `sha256:${hash(raw)}`,
  };
  return Object.freeze(packet);
}

export function cleanFragmentedSignal({ packet, cleanerVersion = GOVERNED_FRAGMENTED_SIGNAL_CLEANER_VERSION } = {}) {
  if (!packet?.packet_id || !packet.raw_content_digest) throw new Error('RAW_SIGNAL_PACKET_REQUIRED');

  const rawFragments = fragment(packet.raw_content);
  const fragments = rawFragments.map((rawText, index) => {
    const cleanedText = normalize(rawText);
    return Object.freeze({
      fragment_id: `sig:${hash({ packet_id: packet.packet_id, index, rawText }).slice(0, 32)}`,
      packet_id: packet.packet_id,
      ordinal: index,
      raw_text_digest: `sha256:${hash(rawText)}`,
      cleaned_text: cleanedText,
      cleaned_text_digest: `sha256:${hash(cleanedText)}`,
      transformation: cleanedText === rawText ? 'IDENTITY' : 'NORMALIZE_WHITESPACE',
      epistemic_status: 'OBSERVED',
    });
  });

  const transformationReceipt = Object.freeze({
    receipt_version: 'transformation-receipt-v0.1',
    receipt_id: `tr:${hash({ packet_id: packet.packet_id, cleanerVersion, fragments }).slice(0, 32)}`,
    packet_id: packet.packet_id,
    cleaner_version: cleanerVersion,
    input_digest: packet.raw_content_digest,
    output_digest: `sha256:${hash(fragments.map((item) => item.cleaned_text_digest))}`,
    fragment_count: fragments.length,
    transformations: fragments.map((item) => ({
      fragment_id: item.fragment_id,
      transformation: item.transformation,
      input_digest: item.raw_text_digest,
      output_digest: item.cleaned_text_digest,
    })),
    meaning_change_claimed: false,
    created_at: new Date().toISOString(),
  });

  return Object.freeze({
    cleaner_version: cleanerVersion,
    packet,
    fragments: Object.freeze(fragments),
    transformation_receipt: transformationReceipt,
    lineage: Object.freeze({
      packet_id: packet.packet_id,
      transformation_receipt_id: transformationReceipt.receipt_id,
      continuity_required: true,
    }),
  });
}

export function buildGovernedChatSignal({ message, observedAt } = {}) {
  const packet = createRawSignalPacket({ message, observedAt });
  return cleanFragmentedSignal({ packet });
}
