import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOperationalGreeting } from '../src/reality-operational-greeting-v0.1.js';
import { makeOperationalGreetingHandler } from '../api/reality/operational-greeting.js';

const candidate = (overrides = {}) => ({
  work_id: 'work:github:123',
  objective: 'Review recurring GitHub workflow failure',
  state: 'QUALIFIED',
  authorization_required: true,
  next_action: 'AWAITING_USER_AUTHORIZATION',
  evidence_refs: ['https://github.com/maloney2323/Reality/actions/runs/123'],
  ...overrides,
});
const observation = (work = [candidate()], overrides = {}) => ({
  status: 'OBSERVED',
  observed_at: '2026-11-18T18:00:00Z',
  source: { provider: 'github', repository: 'maloney2323/Reality' },
  work,
  ...overrides,
});

test('a source-backed change creates a non-executing greeting with exact evidence', () => {
  const brief = buildOperationalGreeting(observation());
  assert.equal(brief.material_change, true);
  assert.equal(brief.attention_count, 1);
  assert.equal(brief.findings[0].evidence_refs.length, 1);
  assert.equal(brief.coverage.employee_job_states, 'NOT_CONNECTED_TO_THIS_BRIEF');
  assert.equal(brief.authority, 'NOT_GRANTED_BY_GREETING');
  assert.equal(brief.execution, 'NOT_EXECUTED_BY_GREETING');
  assert.equal(brief.verification, 'NOT_ESTABLISHED_BY_GREETING');
  assert.doesNotMatch(brief.message, /Riley|Taylor|repaired successfully/);
});

test('observation timestamp changes do not create a repeat greeting', () => {
  const before = buildOperationalGreeting(observation());
  const after = buildOperationalGreeting(observation([candidate()], { observed_at: '2026-11-19T18:00:00Z' }));
  assert.equal(before.fingerprint, after.fingerprint);
});

test('a state or evidence change creates a new operational fingerprint', () => {
  const before = buildOperationalGreeting(observation());
  const after = buildOperationalGreeting(observation([candidate({ state: 'AWAITING_VERIFICATION' })]));
  assert.notEqual(before.fingerprint, after.fingerprint);
});

test('empty results are not described as the completion of all employee jobs', () => {
  const brief = buildOperationalGreeting(observation([]));
  assert.equal(brief.material_change, false);
  assert.equal(brief.fingerprint, null);
  assert.match(brief.message, /not all employees or all business work/);
});

test('ungrounded candidates and unsupported sources fail closed', () => {
  assert.equal(buildOperationalGreeting(observation([candidate({ evidence_refs: [] })])).material_change, false);
  assert.equal(buildOperationalGreeting(observation([candidate({ evidence_refs: ['javascript:alert(1)'] })])).material_change, false);
  assert.equal(buildOperationalGreeting(observation([], { source: { provider: 'other' } })).status, 'SOURCE_UNAVAILABLE');
  assert.equal(buildOperationalGreeting(null).status, 'SOURCE_UNAVAILABLE');
});

function response() {
  const out = { headers: {}, statusCode: 200 };
  out.setHeader = (key, value) => { out.headers[key] = value; return out; };
  out.status = value => { out.statusCode = value; return out; };
  out.json = value => { out.body = value; return out; };
  return out;
}

test('GET endpoint reports genuine observation without granting execution', async () => {
  const handler = makeOperationalGreetingHandler({ load: async () => observation() });
  const res = response();
  await handler({ method: 'GET' }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, 'SOURCE_BACKED_WORK_FOUND');
  assert.equal(res.body.execution, 'NOT_EXECUTED_BY_GREETING');
  assert.equal(res.headers['Cache-Control'], 'no-store');
});

test('endpoint rejects writes and unavailable sources fail closed', async () => {
  const handler = makeOperationalGreetingHandler({ load: async () => { throw new Error('private-error'); } });
  const res = response();
  await handler({ method: 'GET' }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.status, 'SOURCE_UNAVAILABLE');
  assert.equal(JSON.stringify(res.body).includes('private-error'), false);
  const rejected = response();
  await handler({ method: 'POST' }, rejected);
  assert.equal(rejected.statusCode, 405);
});