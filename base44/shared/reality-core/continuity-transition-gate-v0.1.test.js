import test from 'node:test';
import assert from 'node:assert/strict';
import { buildContinuityPackage, extendContinuityPackage } from './continuity-of-intelligence-v0.1.js';
import { verifyContinuityTransition, computeConsumedContinuityDigest, serializeContinuityPackage } from './continuity-transition-gate-v0.1.js';

const role = {
  role_id: 'TEST_ANALYST', role_version: 'v0.1',
  responsibilities: ['evaluate'], constraints: ['do not authorize'], source_refs: ['test:role'],
};
const rules = [{
  rule_id: 'TEST_NO_PROMOTION', rule_version: 'v0.1',
  rule_text: 'Inheritance cannot promote epistemic status.', status: 'ACTIVE',
  source_refs: ['test:rule'], supersedes: [],
}];

async function fixture() {
  const previous = await buildContinuityPackage({
    continuity_id: 'continuity:source', source_layer: 'SOURCE', target_layer: 'RECEIVER',
    epoch_id: 'epoch:1', lineage_root: 'lineage:1', role_context: role, rule_stack: rules,
    inherited: [{
      item_id: 'claim:1', kind: 'CLAIM', disposition: 'INHERITED', epistemic_status: 'CONTESTED',
      value: { status: 'conflicted' }, source_refs: ['evidence:1'], evidence_refs: ['evidence:1'],
      parent_item_refs: [], rationale: 'test',
    }],
    produced: [{
      item_id: 'finding:1', kind: 'FINDING', disposition: 'PRODUCED', epistemic_status: 'UNKNOWN',
      value: { x: 1 }, source_refs: ['test:source'], evidence_refs: [], parent_item_refs: [], rationale: 'test',
    }],
    forwarded: [], captured_at: '2026-09-26T12:00:00.000Z',
  });
  const received = await extendContinuityPackage({
    previous, continuity_id: 'continuity:receiver', target_layer: 'NEXT',
    produced: [], forwarded: [], captured_at: '2026-09-26T12:01:00.000Z',
  });
  const serialized = serializeContinuityPackage(received);
  return { previous, received, serialized, digest: await computeConsumedContinuityDigest(serialized) };
}

test('valid identical consumption passes without granting authority', async () => {
  const f = await fixture();
  const result = await verifyContinuityTransition({
    previous_package: f.previous, received_package: f.received,
    serialized_received_bytes: f.serialized, consumption_digest: f.digest,
    previous_epistemic_debt: [], received_epistemic_debt: [],
    transition_id: 'transition:1', source_state_id: 'state:1', source_state_digest: 'digest:1',
    proposed_state_id: 'state:2', proposed_state_digest: 'digest:2',
    handoff_id: 'handoff:1', epoch_id: 'epoch:1', lineage_root: 'lineage:1',
  });
  assert.equal(result.disposition, 'PASS');
  assert.equal(result.checks.serialization_integrity, true);
  assert.equal(result.state_advanced, false);
  assert.equal(result.authority_created, false);
  assert.equal(result.execution_authorized, false);
});

test('altered consumed bytes fail closed', async () => {
  const f = await fixture();
  const result = await verifyContinuityTransition({
    previous_package: f.previous, received_package: f.received,
    serialized_received_bytes: f.serialized.replace('UNKNOWN', 'ESTABLISHED'),
    consumption_digest: f.digest,
    transition_id: 'transition:2', source_state_id: 'state:1', source_state_digest: 'digest:1',
    proposed_state_id: 'state:2', handoff_id: 'handoff:2', epoch_id: 'epoch:1', lineage_root: 'lineage:1',
  });
  assert.equal(result.disposition, 'HALT');
  assert.ok(result.violations.some((v) => v.code === 'CONSUMPTION_DIGEST_MISMATCH'));
});

test('epistemic promotion across handoff fails closed', async () => {
  const f = await fixture();
  const promoted = structuredClone(f.received);
  promoted.inherited = promoted.inherited.map((item) => item.item_id === 'claim:1'
    ? { ...item, epistemic_status: 'ESTABLISHED' } : item);
  const body = { ...promoted }; delete body.continuity_digest;
  const { sha256Hex, canonicalJson } = await import('../action-gate/canonical.js');
  promoted.continuity_digest = await sha256Hex(canonicalJson(body));
  const serialized = serializeContinuityPackage(promoted);
  const result = await verifyContinuityTransition({
    previous_package: f.previous, received_package: promoted,
    serialized_received_bytes: serialized, consumption_digest: await computeConsumedContinuityDigest(serialized),
    transition_id: 'transition:3', source_state_id: 'state:1', source_state_digest: 'digest:1',
    proposed_state_id: 'state:2', handoff_id: 'handoff:3', epoch_id: 'epoch:1', lineage_root: 'lineage:1',
  });
  assert.equal(result.disposition, 'HALT');
  assert.ok(result.violations.some((v) => v.code === 'EPISTEMIC_STATUS_CHANGED_WITHOUT_GATE'));
});

test('lineage substitution fails closed', async () => {
  const f = await fixture();
  const altered = { ...f.received, parent_continuity_id: 'continuity:other' };
  const body = { ...altered }; delete body.continuity_digest;
  const { sha256Hex, canonicalJson } = await import('../action-gate/canonical.js');
  altered.continuity_digest = await sha256Hex(canonicalJson(body));
  const serialized = serializeContinuityPackage(altered);
  const result = await verifyContinuityTransition({
    previous_package: f.previous, received_package: altered,
    serialized_received_bytes: serialized, consumption_digest: await computeConsumedContinuityDigest(serialized),
    transition_id: 'transition:4', source_state_id: 'state:1', source_state_digest: 'digest:1',
    proposed_state_id: 'state:2', handoff_id: 'handoff:4', epoch_id: 'epoch:1', lineage_root: 'lineage:1',
  });
  assert.equal(result.disposition, 'HALT');
  assert.ok(result.violations.some((v) => v.code === 'LINEAGE_MISMATCH'));
});

test('active rule mutation fails closed', async () => {
  const f = await fixture();
  const altered = { ...f.received, rule_stack: [{ ...rules[0], rule_text: 'changed rule' }] };
  const body = { ...altered }; delete body.continuity_digest;
  const { sha256Hex, canonicalJson } = await import('../action-gate/canonical.js');
  altered.continuity_digest = await sha256Hex(canonicalJson(body));
  const serialized = serializeContinuityPackage(altered);
  const result = await verifyContinuityTransition({
    previous_package: f.previous, received_package: altered,
    serialized_received_bytes: serialized, consumption_digest: await computeConsumedContinuityDigest(serialized),
    transition_id: 'transition:5', source_state_id: 'state:1', source_state_digest: 'digest:1',
    proposed_state_id: 'state:2', handoff_id: 'handoff:5', epoch_id: 'epoch:1', lineage_root: 'lineage:1',
  });
  assert.equal(result.disposition, 'HALT');
  assert.ok(result.violations.some((v) => v.code === 'ACTIVE_RULE_MUTATED'));
});

test('contradiction removal fails closed', async () => {
  const f = await fixture();
  const previous = await buildContinuityPackage({
    ...f.previous,
    continuity_id: 'continuity:contradiction-source',
    inherited: [...f.previous.inherited, {
      item_id: 'contradiction:1', kind: 'CONTRADICTION', disposition: 'INHERITED',
      epistemic_status: 'UNRESOLVED', value: { conflict: true }, source_refs: ['e:2'],
      evidence_refs: ['e:2'], parent_item_refs: [], rationale: 'unresolved',
    }],
    captured_at: '2026-09-26T12:00:00.000Z',
  });
  const received = await extendContinuityPackage({
    previous, continuity_id: 'continuity:contradiction-receiver', target_layer: 'NEXT',
    produced: [], forwarded: [], captured_at: '2026-09-26T12:01:00.000Z',
  });
  const altered = { ...received, inherited: received.inherited.filter((i) => i.item_id !== 'contradiction:1') };
  const body = { ...altered }; delete body.continuity_digest;
  const { sha256Hex, canonicalJson } = await import('../action-gate/canonical.js');
  altered.continuity_digest = await sha256Hex(canonicalJson(body));
  const serialized = serializeContinuityPackage(altered);
  const result = await verifyContinuityTransition({
    previous_package: previous, received_package: altered,
    serialized_received_bytes: serialized, consumption_digest: await computeConsumedContinuityDigest(serialized),
    transition_id: 'transition:6', source_state_id: 'state:1', source_state_digest: 'digest:1',
    proposed_state_id: 'state:2', handoff_id: 'handoff:6', epoch_id: 'epoch:1', lineage_root: 'lineage:1',
  });
  assert.equal(result.disposition, 'HALT');
  assert.ok(result.violations.some((v) => v.code === 'CONTRADICTION_DROPPED'));
});