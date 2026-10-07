import assert from 'node:assert/strict';
import {
  reconstructOperationalWork, analyzeOwnership, analyzeCapabilityAndAuthority,
  createDiscoveredWork, validateDiscoveredWork, prioritizeDiscoveredWork,
} from '../src/reality-discovered-work-v0.1.js';

const observations = [
  { observation_id:'obs:1', source:'SYSTEM', subject:'Ryan reconciles payment exceptions', actor:'Ryan', system:'payments', effective_at:'2026-10-03T14:00:00Z', category:'finance' },
  { observation_id:'obs:2', source:'SYSTEM', subject:'Ryan reconciles payment exceptions', actor:'Ryan', system:'payments', effective_at:'2026-10-04T14:00:00Z', category:'finance' },
  { observation_id:'obs:3', source:'SYSTEM', subject:'Ryan reconciles payment exceptions', actor:'Ryan', system:'payments', effective_at:'2026-10-05T14:00:00Z', category:'finance' },
];
const [reconstruction] = reconstructOperationalWork({ observations });
assert.equal(reconstruction.classification, 'RECURRING');
assert.equal(reconstruction.evidence_count, 3);
assert.equal(reconstruction.temporal.recurring_signal, true);

const ownership = analyzeOwnership(reconstruction);
assert.equal(ownership.apparent_operator, 'Ryan');
assert.equal(ownership.accountability_status, 'UNESTABLISHED');

const ready = analyzeCapabilityAndAuthority(reconstruction, {
  knownCapabilities:['reconcile_payments'], knownAuthority:['payments_reconciliation'],
  capabilityRequirements:['reconcile_payments'], authorityRequirements:['payments_reconciliation'],
});
assert.equal(ready.can_perform, true);
assert.equal(ready.authority_established, true);
assert.equal(ready.disposition, 'READY_TO_PROPOSE');

const work = createDiscoveredWork({
  reconstruction, ownership, capabilityAuthority: ready, materiality:'HIGH',
  proposedNextAction:'PREPARE_GOVERNED_TAKEOVER',
  verificationRequirements:['Independent comparison against authoritative payment record'],
});
assert.equal(work.state, 'DISCOVERED');
assert.equal(work.authority, 'NONE_UNLESS_EXPLICITLY_ESTABLISHED');

const validated = validateDiscoveredWork(work);
assert.equal(validated.state, 'VALIDATED');
assert.equal(validated.validation.valid, true);

const gap = analyzeCapabilityAndAuthority(reconstruction, {
  knownCapabilities:[], knownAuthority:[],
  capabilityRequirements:['reconcile_payments'], authorityRequirements:['payments_reconciliation'],
});
assert.equal(gap.disposition, 'AWAITING_CAPABILITY');

const ranked = prioritizeDiscoveredWork([work, {...work, discovered_work_id:'other', materiality:'LOW'}]);
assert.equal(ranked[0].discovered_work_id, work.discovered_work_id);
console.log('REALITY_DISCOVERED_WORK_V0_1_PASS');
