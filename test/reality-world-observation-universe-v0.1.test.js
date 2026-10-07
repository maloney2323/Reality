import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createObservation,
  createObservationFabric,
  normalizeGmailMessage,
  normalizeCalendarEvent,
  normalizeGitHubCommit,
} from '../src/reality-world-observation-fabric-v0.1.js';
import {
  reconstructUniverse,
  resolveCapabilityAndAuthority,
} from '../src/reality-universe-reconstruction-v0.1.js';

const NOW = '2026-10-07T12:00:00.000Z';

test('normalizes unrelated source records into one observation contract', () => {
  const github = normalizeGitHubCommit({
    sha: 'abc123',
    date: '2026-10-01T10:00:00Z',
    message: 'maintenance',
    repository: 'maloney2323/Reality',
  }, { observedAt: NOW });

  const gmail = normalizeGmailMessage({
    id: 'm1',
    threadId: 't1',
    date: '2026-10-02T10:00:00Z',
    from: 'ryan@example.test',
    to: ['customer@example.test'],
    subject: 'Checking in',
    snippet: 'I will follow up with the details.',
  }, { observedAt: NOW });

  const calendar = normalizeCalendarEvent({
    id: 'c1',
    start: '2026-10-03T15:00:00Z',
    summary: 'Customer conversation',
    organizer: { email: 'ryan@example.test' },
    attendees: [{ email: 'customer@example.test' }],
  }, { observedAt: NOW });

  assert.equal(github.domain, 'SOFTWARE');
  assert.equal(gmail.domain, 'BUSINESS');
  assert.equal(calendar.domain, 'BUSINESS');
  assert.equal(gmail.actor_refs.includes('actor:ryan@example.test'), true);
});

test('fabric records source coverage without claiming unobserved sources', () => {
  const fabric = createObservationFabric({
    sources: [
      { source: 'GITHUB', domain: 'SOFTWARE' },
      { source: 'GMAIL', domain: 'BUSINESS' },
      { source: 'CALENDAR', domain: 'BUSINESS' },
    ],
  });
  fabric.ingest(normalizeGmailMessage({
    id: 'm1',
    date: '2026-10-02T10:00:00Z',
    from: 'ryan@example.test',
    subject: 'Follow up',
    snippet: 'I will follow up.',
  }, { observedAt: NOW }));
  const coverage = fabric.coverage({ now: NOW });
  assert.equal(coverage.find((x) => x.source === 'GITHUB').status, 'UNOBSERVED');
  assert.equal(coverage.find((x) => x.source === 'GMAIL').status, 'CURRENT');
  assert.equal(coverage.find((x) => x.source === 'CALENDAR').status, 'UNOBSERVED');
});

test('reconstructs cross-source world knowledge while preserving epistemic layers', () => {
  const observations = [
    normalizeGmailMessage({ id: 'm1', threadId: 't1', date: '2026-10-01T10:00:00Z', from: 'ryan@example.test', to: ['customer@example.test'], subject: 'Details', snippet: 'I will follow up with the details.' }, { observedAt: NOW }),
    normalizeCalendarEvent({ id: 'c1', start: '2026-10-02T15:00:00Z', summary: 'Customer conversation', organizer: { email: 'ryan@example.test' }, attendees: [{ email: 'customer@example.test' }] }, { observedAt: NOW }),
    normalizeGmailMessage({ id: 'm2', threadId: 't1', date: '2026-10-04T10:00:00Z', from: 'ryan@example.test', to: ['customer@example.test'], subject: 'Checking in', snippet: 'I will follow up again.' }, { observedAt: NOW }),
    normalizeGmailMessage({ id: 'm3', threadId: 't1', date: '2026-10-06T10:00:00Z', from: 'ryan@example.test', to: ['customer@example.test'], subject: 'Another check', snippet: 'I will follow up again.' }, { observedAt: NOW }),
  ];

  const universe = reconstructUniverse({ observations, now: NOW });
  assert.ok(universe.claims.some((c) => c.epistemic_status === 'INFERRED'));
  assert.ok(universe.claims.some((c) => c.claim_kind === 'UNKNOWN'));
  assert.ok(universe.recurring_process_signals.length >= 1);
  assert.ok(universe.discovered_work.length >= 1);
  assert.ok(universe.discovered_work.every((w) => w.required_authority.length === 0));
});

test('capability and authority never collapse into one decision', () => {
  const work = { work_id: 'work:test', required_capability: ['draft_preparation'] };
  assert.equal(resolveCapabilityAndAuthority(work, { capabilities: { draft_preparation: true } }).disposition, 'AWAITING_AUTHORIZATION');
  assert.equal(resolveCapabilityAndAuthority(work, { capabilities: { draft_preparation: false } }).disposition, 'AWAITING_CAPABILITY');
  assert.equal(resolveCapabilityAndAuthority(work, { capabilities: { draft_preparation: true }, authorizations: { 'work:test': true } }).disposition, 'READY_FOR_GOVERNED_EXECUTION');
});

test('observation contract rejects missing source identity', () => {
  assert.throws(() => createObservation({ domain: 'BUSINESS', sourceRecordId: 'x', eventType: 'EVENT' }), /OBSERVATION_SOURCE_REQUIRED/);
});
