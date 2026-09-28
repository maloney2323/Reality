import assert from 'node:assert/strict';
import {
  EVIDENCE_ESCROW_VERSION,
  INVARIANT_CHECK_VERSION,
  evaluateCanonicalInvariants,
  assertCanonicalInvariants,
  buildInvariantWitness,
} from './evidence-escrow-v0.1.js';

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

function admitted() {
  return [{
    signal_id: 's1',
    admission_ref: 'a1',
    source_ref: 'customer:1',
    content: 'Customer seemed okay with the additional $1,850.',
    observed_at: '2026-09-24T12:00:00-04:00',
    provenance_ref: 'claim:1',
    supersedes_signal_id: null,
    disclosure_state: 'UNSPECIFIED',
    structured_value: {
      group_key: 'change:1',
      field_key: 'approval_signal',
      value: 'seemed okay',
      source_path: 'message.body',
    },
  }];
}

function canonicalFrom(signals = admitted()) {
  return {
    packet_version: 'reality-canonical-evidence-v0.1',
    packet_id: 'packet-1',
    observations: signals.map((signal) => ({
      id: signal.signal_id,
      source_ref: signal.source_ref,
      content: signal.content,
      observed_at: signal.observed_at ? new Date(Date.parse(signal.observed_at)).toISOString() : null,
      provenance_ref: signal.provenance_ref,
      attributes: {
        supersedes_signal_id: signal.supersedes_signal_id,
        disclosure_state: signal.disclosure_state,
        structured_group_key: signal.structured_value?.group_key || null,
        structured_field_key: signal.structured_value?.field_key || null,
        structured_candidate_value: signal.structured_value?.value || null,
        structured_source_path: signal.structured_value?.source_path || null,
      },
    })),
    conflicts: [],
    metadata: {},
  };
}

test('clean canonical representation passes', () => {
  const result = evaluateCanonicalInvariants({ admittedSignals: admitted(), canonicalPacket: canonicalFrom() });
  assert.equal(result.status, 'PASS');
  assert.equal(result.gate, 'DOWNSTREAM_PROMOTION_ALLOWED');
});

test('content mutation is caught', () => {
  const packet = canonicalFrom();
  packet.observations[0].content = 'Customer approved the additional $1,850.';
  const result = evaluateCanonicalInvariants({ admittedSignals: admitted(), canonicalPacket: packet });
  assert.equal(result.status, 'VIOLATION');
  assert.ok(result.violations.some((v) => v.code === 'CONTENT_MUTATED'));
});

test('semantic promotion is caught even when other fields look valid', () => {
  const packet = canonicalFrom();
  packet.observations[0].attributes.customer_approval = true;
  const result = evaluateCanonicalInvariants({ admittedSignals: admitted(), canonicalPacket: packet });
  assert.equal(result.status, 'VIOLATION');
  assert.ok(result.violations.some((v) => v.code === 'SEMANTIC_PROMOTION_FIELD'));
});

test('uncertainty cannot disappear through structured candidate mutation', () => {
  const packet = canonicalFrom();
  packet.observations[0].attributes.structured_candidate_value = 'approved';
  const result = evaluateCanonicalInvariants({ admittedSignals: admitted(), canonicalPacket: packet });
  assert.equal(result.status, 'VIOLATION');
  assert.ok(result.violations.some((v) => v.code === 'STRUCTURED_CANDIDATE_MUTATED'));
});

test('unknown observed time cannot become a known time', () => {
  const signals = [{ ...admitted()[0], observed_at: null }];
  const packet = canonicalFrom(signals);
  packet.observations[0].observed_at = '2026-09-24T16:00:00.000Z';
  const result = evaluateCanonicalInvariants({ admittedSignals: signals, canonicalPacket: packet });
  assert.equal(result.status, 'VIOLATION');
  assert.ok(result.violations.some((v) => v.code === 'TEMPORAL_VALUE_MUTATED'));
});

test('superseded evidence remains represented by its original observation', () => {
  const signals = [
    admitted()[0],
    {
      ...admitted()[0],
      signal_id: 's2',
      admission_ref: 'a2',
      content: 'Customer later said the additional work was not approved.',
      observed_at: '2026-09-24T13:00:00-04:00',
      provenance_ref: 'claim:2',
      supersedes_signal_id: 's1',
      structured_value: { ...admitted()[0].structured_value, value: 'not approved' },
    },
  ];
  const packet = canonicalFrom(signals);
  const result = evaluateCanonicalInvariants({ admittedSignals: signals, canonicalPacket: packet });
  assert.equal(result.status, 'PASS');
  assert.equal(packet.observations.length, 2);
});

test('dropped admitted observation is a hard violation', () => {
  const packet = canonicalFrom();
  packet.observations = [];
  const result = evaluateCanonicalInvariants({ admittedSignals: admitted(), canonicalPacket: packet });
  assert.equal(result.status, 'VIOLATION');
  assert.ok(result.violations.some((v) => v.code === 'OBSERVATION_DROPPED'));
});

test('introduced observation is a hard violation', () => {
  const packet = canonicalFrom();
  packet.observations.push({
    id: 'injected',
    source_ref: 'attacker',
    content: 'Approved',
    observed_at: null,
    provenance_ref: 'attacker',
    attributes: {},
  });
  const result = evaluateCanonicalInvariants({ admittedSignals: admitted(), canonicalPacket: packet });
  assert.equal(result.status, 'VIOLATION');
  assert.ok(result.violations.some((v) => v.code === 'UNADMITTED_OBSERVATION_INTRODUCED'));
});

test('assertCanonicalInvariants fails closed on violation', () => {
  const packet = canonicalFrom();
  packet.observations[0].source_ref = 'attacker';
  assert.throws(
    () => assertCanonicalInvariants({ admittedSignals: admitted(), canonicalPacket: packet }),
    /INVARIANT_VIOLATION:SOURCE_MUTATED/
  );
});

test('witness records the hard gate result without granting authority', () => {
  const witness = buildInvariantWitness({
    admittedSignals: admitted(),
    canonicalPacket: canonicalFrom(),
    transformation_id: 'test.clean',
    cleaner_version: 'test-v1',
  });
  assert.equal(witness.witness_version, EVIDENCE_ESCROW_VERSION);
  assert.equal(witness.invariant_version, INVARIANT_CHECK_VERSION);
  assert.equal(witness.status, 'PASS');
  assert.equal(witness.gate, 'DOWNSTREAM_PROMOTION_ALLOWED');
  assert.equal(witness.transformation_id, 'test.clean');
});

let failed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}\n  ${error.stack}`);
  }
}
console.log(`\\n${tests.length - failed}/${tests.length} passed`);
if (failed) process.exit(1);