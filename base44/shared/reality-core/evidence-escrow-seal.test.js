import assert from 'node:assert/strict';
import {
  sealEvidenceEscrow,
  verifyEvidenceEscrowSeal,
} from './evidence-escrow-v0.1.js';

const admittedSignals = [{
  signal_id: 'seal-1',
  admission_ref: 'admission-1',
  source_ref: 'customer:message-1',
  content: 'Customer said the change was probably okay.',
  observed_at: '2026-09-24T12:00:00Z',
  provenance_ref: 'claim-1',
  supersedes_signal_id: null,
  disclosure_state: 'UNSPECIFIED',
  structured_value: {
    group_key: 'change-1',
    field_key: 'approval_signal',
    value: 'probably okay',
    source_path: 'body',
  },
}];

const canonicalPacket = {
  packet_version: 'reality-canonical-evidence-v0.1',
  packet_id: 'seal-packet-1',
  observations: [{
    id: 'seal-1',
    source_ref: 'customer:message-1',
    content: 'Customer said the change was probably okay.',
    observed_at: '2026-09-24T12:00:00.000Z',
    provenance_ref: 'claim-1',
    attributes: {
      supersedes_signal_id: null,
      disclosure_state: 'UNSPECIFIED',
      structured_group_key: 'change-1',
      structured_field_key: 'approval_signal',
      structured_candidate_value: 'probably okay',
      structured_source_path: 'body',
    },
  }],
  conflicts: [],
  metadata: {},
};

const seal = await sealEvidenceEscrow({
  admittedSignals,
  canonicalPacket,
  transformation_id: 'test.seal',
  cleaner_version: 'test-v1',
});

assert.equal(seal.status, 'PASS');
assert.equal(seal.gate, 'DOWNSTREAM_PROMOTION_ALLOWED');
assert.match(seal.original_hash, /^[0-9a-f]{64}$/);
assert.match(seal.canonical_hash, /^[0-9a-f]{64}$/);
assert.match(seal.binding_hash, /^[0-9a-f]{64}$/);
assert.equal(await verifyEvidenceEscrowSeal({ admittedSignals, canonicalPacket, seal }), true);

const tamperedPacket = structuredClone(canonicalPacket);
tamperedPacket.observations[0].content = 'Customer approved the change.';
assert.equal(await verifyEvidenceEscrowSeal({
  admittedSignals,
  canonicalPacket: tamperedPacket,
  seal,
}), false);

const tamperedOriginal = structuredClone(admittedSignals);
tamperedOriginal[0].content = 'Customer approved the change.';
assert.equal(await verifyEvidenceEscrowSeal({
  admittedSignals: tamperedOriginal,
  canonicalPacket,
  seal,
}), false);

console.log('PASS cryptographic escrow seal binds original and canonical representations');
console.log('PASS canonical tampering invalidates escrow seal');
console.log('PASS original evidence tampering invalidates escrow seal');
console.log('3/3 passed');