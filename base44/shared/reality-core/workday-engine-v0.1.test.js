import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createWorkday,
  classifyWorkItem,
  addWorkItem,
  advanceWorkday,
  authorizeWorkday,
  executionCapabilityAllowed
} from './workday-engine-v0.1.js';
import { WORKDAY_CAPABILITIES } from './workday-authority-envelope-v0.1.js';
import { buildProviderEvidenceReceipt, ProviderEvidenceAuthority } from './provider-evidence-adapter-v0.1.js';
import {
  projectedHumanTimeReturned,
  verifiedHumanTimeReturned
} from './human-time-v0.1.js';

test('creates a generic Workday without granting execution authority', async () => {
  const workday = await createWorkday({
    workday_id: 'wd-001',
    subject: { subject_id: 'subject-001', subject_type: 'PERSON', name: 'Test Subject' },
    objective: 'Reconstruct current workload',
    created_at: '2026-09-28T00:00:00Z'
  });

  assert.equal(workday.state, 'PLANNED');
  assert.equal(workday.delegation_state, 'NOT_AUTHORIZED');
  assert.equal(workday.authority_envelope.human_authorized, false);
  assert.deepEqual(workday.authority_envelope.capabilities, []);
  assert.equal(workday.verified_human_time_returned.value_hours, null);
});

test('separates evidence-backed classifications from evidence gaps', async () => {
  let workday = await createWorkday({
    workday_id: 'wd-002',
    subject: { subject_id: 'subject-002', subject_type: 'BUSINESS' },
    objective: 'Discover delegable work',
    created_at: '2026-09-28T00:00:00Z'
  });

  workday = addWorkItem(workday, classifyWorkItem({
    id: 'item-1',
    title: 'Recurring report preparation',
    status: 'DELEGABLE',
    evidence_state: 'OBSERVED',
    evidence_refs: ['evidence-1'],
    repeat_signal: 'weekly'
  }));

  workday = addWorkItem(workday, classifyWorkItem({
    id: 'item-2',
    title: 'Unknown recurring activity',
    status: 'INSUFFICIENT_EVIDENCE'
  }));

  assert.deepEqual(workday.human_only_work, []);
  assert.deepEqual(workday.blocked_work, []);
  assert.deepEqual(workday.evidence_gaps, ['item-2']);
  assert.equal(workday.workload_snapshot.length, 2);
});

test('prevents lifecycle regression', async () => {
  const workday = await createWorkday({
    workday_id: 'wd-003',
    subject: { subject_id: 'subject-003', subject_type: 'FUNCTION' },
    objective: 'Test lifecycle',
    created_at: '2026-09-28T00:00:00Z'
  });

  const implementing = advanceWorkday(workday, 'IMPLEMENTING');
  assert.equal(implementing.state, 'IMPLEMENTING');
  assert.throws(() => advanceWorkday(implementing, 'PLANNED'), /WORKDAY_STATE_REGRESSION/);
});

test('requires explicit human authorization before capability use', async () => {
  let workday = await createWorkday({
    workday_id: 'wd-004',
    subject: { subject_id: 'subject-004', subject_type: 'TEAM' },
    objective: 'Test authority boundary',
    created_at: '2026-09-28T00:00:00Z'
  });

  assert.equal(executionCapabilityAllowed(workday, 'RESEARCH'), false);

  workday = await authorizeWorkday(workday, {
    capabilities: ['OBSERVE', 'RESEARCH'],
    human_authorized: true,
    scope: { sources: ['github'] },
    expires_at: '2026-09-28T12:00:00Z'
  });

  assert.equal(workday.delegation_state, 'AUTHORIZED');
  assert.equal(executionCapabilityAllowed(workday, 'RESEARCH'), true);
  assert.equal(executionCapabilityAllowed(workday, 'DEPLOY'), false);
  assert.ok(workday.authority_digest);
  assert.ok(workday.authority_envelope.denied_capabilities.includes('DEPLOY'));
});

test('CREATE WORKDAY consumes the provider evidence receipt as observed world state', async () => {
  const receipt = buildProviderEvidenceReceipt([
    {
      provider: 'github',
      adapter_id: 'github-read-v0.1',
      connected: true,
      read_attempted: true,
      read_executed: true,
      readability_established: true,
      completeness_established: false,
      evidence: ['commit abc123 exists on the authorized repository'],
      provenance: 'GITHUB_READONLY_CONNECTOR',
      exact_ref_sha: 'abc123',
      provider_identity: 'maloney2323/Reality'
    },
    {
      provider: 'vercel',
      adapter_id: 'vercel-read-v0.1',
      connected: true,
      read_attempted: false,
      read_executed: false,
      readability_established: false,
      completeness_established: false,
      evidence: [],
      reason: 'Connected but not read.'
    }
  ]);

  const workday = await createWorkday({
    workday_id: 'wd-evidence-001',
    subject: { subject_id: 'subject-evidence-001', subject_type: 'PERSON' },
    objective: 'Reconstruct current workload',
    created_at: '2026-09-29T00:00:00Z',
    provider_evidence_receipt: receipt
  });

  assert.equal(workday.observed_world.observation_statement, 'Here is what I actually observed across your authorized world.');
  assert.equal(workday.observed_world.summary.providers_seen, 2);
  assert.equal(workday.observed_world.summary.providers_read, 1);
  assert.equal(workday.observed_world.summary.evidence_items_observed, 1);
  assert.deepEqual(workday.evidence_refs, ['provider:github:provider-observation:1']);
  assert.ok(workday.observed_world.evidence_gaps.includes('COMPLETENESS_NOT_ESTABLISHED:github'));
  assert.ok(workday.observed_world.evidence_gaps.includes('CONNECTED_NOT_READ:vercel'));
  assert.equal(workday.delegation_state, 'NOT_AUTHORIZED');
  assert.equal(workday.authority_envelope.human_authorized, false);
  assert.equal(workday.provider_evidence_receipt.authority, ProviderEvidenceAuthority);
});

test('CREATE WORKDAY rejects an evidence receipt that attempts to grant authority', async () => {
  await assert.rejects(
    createWorkday({
      workday_id: 'wd-evidence-002',
      subject: { subject_id: 'subject-evidence-002', subject_type: 'BUSINESS' },
      objective: 'Reject authority smuggling',
      created_at: '2026-09-29T00:00:00Z',
      provider_evidence_receipt: {
        schema_version: 'reality-provider-evidence-adapter-v0.1',
        authority: ProviderEvidenceAuthority,
        providers: [],
        truth_authorized: true,
        action_authorized: false,
        write_authorized: false,
        external_effects_permitted: false
      }
    }),
    /cannot grant authority/
  );
});

test('CREATE WORKDAY preserves explicit no-receipt evidence boundary', async () => {
  const workday = await createWorkday({
    workday_id: 'wd-evidence-003',
    subject: { subject_id: 'subject-evidence-003', subject_type: 'TEAM' },
    objective: 'Require real observations',
    created_at: '2026-09-29T00:00:00Z'
  });

  assert.equal(workday.observed_world.summary.providers_seen, 0);
  assert.deepEqual(workday.observed_world.evidence_gaps, ['NO_PROVIDER_EVIDENCE_RECEIPT']);
  assert.equal(workday.observed_world.observation_statement, 'No provider observations were supplied to CREATE WORKDAY.');
});

test('human-time metrics refuse unsupported baselines', () => {
  assert.equal(projectedHumanTimeReturned({ baseline_hours: null, projected_oversight_hours: 1 }).value_hours, null);
  assert.equal(verifiedHumanTimeReturned({ baseline_hours: 8, human_intervention_hours: 2, verification_refs: [] }).value_hours, null);

  const projected = projectedHumanTimeReturned({ baseline_hours: 8, projected_oversight_hours: 2 });
  assert.equal(projected.value_hours, 6);
  assert.equal(projected.evidence_state, 'EXPLICITLY_ESTIMATED');

  const verified = verifiedHumanTimeReturned({
    baseline_hours: 8,
    human_intervention_hours: 2,
    verification_refs: ['verification-1']
  });
  assert.equal(verified.value_hours, 6);
  assert.equal(verified.evidence_state, 'OBSERVED');
});

test('authority vocabulary is explicit and finite', () => {
  assert.deepEqual([...WORKDAY_CAPABILITIES], [
    'OBSERVE',
    'RESEARCH',
    'ANALYZE',
    'PREPARE',
    'CREATE',
    'EDIT',
    'COMMUNICATE',
    'EXECUTE',
    'MERGE',
    'DEPLOY',
    'DELETE',
    'FINANCIAL',
    'PERMISSIONS',
    'GOVERNANCE'
  ]);
});
