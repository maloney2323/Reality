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
    transformations: Object.freeze(fragments.map((item) => Object.freeze({
      fragment_id: item.fragment_id,
      transformation: item.transformation,
      input_digest: item.raw_text_digest,
      output_digest: item.cleaned_text_digest,
    }))),
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

/**
 * Verifies the complete raw-packet -> fragments -> transformation-receipt chain.
 * This is a pure check: it does not repair, normalize, or mutate supplied evidence.
 */
export function verifyGovernedSignal(signal) {
  const reasons = [];
  const packet = signal?.packet;
  const receipt = signal?.transformation_receipt;
  const fragments = signal?.fragments;

  if (!packet || packet.packet_version !== CANONICAL_PACKET_VERSION) reasons.push('PACKET_VERSION_INVALID');
  if (typeof packet?.raw_content !== 'string') reasons.push('RAW_CONTENT_MISSING');
  if (typeof packet?.source !== 'string' || !packet.source.trim()) reasons.push('PACKET_SOURCE_MISSING');
  if (typeof packet?.observed_at !== 'string' || !packet.observed_at.trim()) reasons.push('OBSERVED_AT_MISSING');

  if (packet && typeof packet.raw_content === 'string') {
    if (packet.raw_content_digest !== `sha256:${hash(packet.raw_content)}`) reasons.push('RAW_CONTENT_DIGEST_MISMATCH');
    const expectedPacketId = `rsp:${hash({
      raw: packet.raw_content,
      source: packet.source,
      observedAt: packet.observed_at,
    }).slice(0, 32)}`;
    if (packet.packet_id !== expectedPacketId) reasons.push('PACKET_ID_MISMATCH');
  }

  if (!Array.isArray(fragments)) {
    reasons.push('FRAGMENTS_MISSING');
  } else if (packet && typeof packet.raw_content === 'string') {
    const rawFragments = fragment(packet.raw_content);
    if (rawFragments.length !== fragments.length) reasons.push('FRAGMENT_COUNT_MISMATCH');
    rawFragments.forEach((rawText, index) => {
      const item = fragments[index];
      if (!item) return;
      const cleanedText = normalize(rawText);
      const expectedId = `sig:${hash({ packet_id: packet.packet_id, index, rawText }).slice(0, 32)}`;
      if (item.packet_id !== packet.packet_id || item.fragment_id !== expectedId || item.ordinal !== index) {
        reasons.push(`FRAGMENT_IDENTITY_MISMATCH:${index}`);
      }
      if (item.raw_text_digest !== `sha256:${hash(rawText)}`) reasons.push(`FRAGMENT_RAW_DIGEST_MISMATCH:${index}`);
      if (item.cleaned_text !== cleanedText || item.cleaned_text_digest !== `sha256:${hash(cleanedText)}`) {
        reasons.push(`FRAGMENT_CLEANED_DIGEST_MISMATCH:${index}`);
      }
      if (item.transformation !== (cleanedText === rawText ? 'IDENTITY' : 'NORMALIZE_WHITESPACE')) {
        reasons.push(`FRAGMENT_TRANSFORMATION_MISMATCH:${index}`);
      }
      if (item.epistemic_status !== 'OBSERVED') reasons.push(`FRAGMENT_EPISTEMIC_STATUS_INVALID:${index}`);
    });
  }

  if (!receipt) {
    reasons.push('TRANSFORMATION_RECEIPT_MISSING');
  } else {
    if (receipt.receipt_version !== 'transformation-receipt-v0.1') reasons.push('TRANSFORMATION_RECEIPT_VERSION_INVALID');
    if (receipt.packet_id !== packet?.packet_id) reasons.push('RECEIPT_PACKET_MISMATCH');
    if (receipt.input_digest !== packet?.raw_content_digest) reasons.push('RECEIPT_INPUT_DIGEST_MISMATCH');
    if (receipt.meaning_change_claimed !== false) reasons.push('UNSUPPORTED_MEANING_CHANGE_CLAIM');
    if (!Array.isArray(fragments)) {
      // The missing-fragments reason above is sufficient; don't dereference here.
    } else {
      if (receipt.fragment_count !== fragments.length) reasons.push('RECEIPT_FRAGMENT_COUNT_MISMATCH');
      const expectedOutputDigest = `sha256:${hash(fragments.map((item) => item.cleaned_text_digest))}`;
      if (receipt.output_digest !== expectedOutputDigest) reasons.push('RECEIPT_OUTPUT_DIGEST_MISMATCH');
      const expectedTransformations = fragments.map((item) => ({
        fragment_id: item.fragment_id,
        transformation: item.transformation,
        input_digest: item.raw_text_digest,
        output_digest: item.cleaned_text_digest,
      }));
      if (JSON.stringify(receipt.transformations) !== JSON.stringify(expectedTransformations)) {
        reasons.push('RECEIPT_TRANSFORMATION_MAP_MISMATCH');
      }
      if (typeof receipt.cleaner_version !== 'string' || !receipt.cleaner_version.trim()) {
        reasons.push('RECEIPT_CLEANER_VERSION_MISSING');
      } else {
        const expectedReceiptId = `tr:${hash({
          packet_id: packet?.packet_id,
          cleanerVersion: receipt.cleaner_version,
          fragments,
        }).slice(0, 32)}`;
        if (receipt.receipt_id !== expectedReceiptId) reasons.push('RECEIPT_ID_MISMATCH');
      }
    }
  }

  if (signal?.lineage?.packet_id !== packet?.packet_id) reasons.push('LINEAGE_PACKET_MISMATCH');
  if (signal?.lineage?.transformation_receipt_id !== receipt?.receipt_id) reasons.push('LINEAGE_RECEIPT_MISMATCH');
  if (signal?.lineage?.continuity_required !== true) reasons.push('CONTINUITY_REQUIREMENT_MISSING');

  return Object.freeze({ valid: reasons.length === 0, reasons: Object.freeze([...new Set(reasons)]) });
}

export function buildGovernedChatSignal({ message, observedAt } = {}) {
  const packet = createRawSignalPacket({ message, observedAt });
  return cleanFragmentedSignal({ packet });
}
