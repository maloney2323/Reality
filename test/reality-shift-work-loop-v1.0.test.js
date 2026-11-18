import test from 'node:test';
import assert from 'node:assert/strict';
import { runShiftWorkLoop } from '../src/reality-shift-work-loop-v1.0.js';
import { createShiftPersistenceAdapter, stableShiftUuid, shiftRunIdForLocalDate } from '../src/reality-shift-persistence-v1.0.js';
import { cronRequest } from '../api/reality/shift.js';

function item(id) {
  return {
    work_id: id,
    evidence_refs: ['github-run:1'],
    execution_work_item: {
      work_item_id: id,
      workflow_id: 'workflow:' + id,
      connector: 'github',
      operation: 'create_issue',
      inputs: { repository: 'maloney2323/Reality' },
    },
  };
}
const approval = () => ({ authorization_id: 'existing-exact-grant', scope: 'only-this-work-item' });
const proved = () => ({
  status: 'VERIFIED',
  execution: { execution_id: 'provider-read-back:1' },
  verification: { verified: true, independent: true, verification_id: 'check:1' },
  outcome: { verified: true },
});
const pending = () => ({ status: 'UNRESOLVED', blocked_reason: 'PROVIDER_TIMEOUT' });

test('a verified repair resumes the exact original job without extending authorization', async () => {
  const events = [], calls = [];
  const result = await runShiftWorkLoop({
    candidates: [item('job:a')],
    record: async event => events.push(event),
    authorize: async () => approval(),
    execute: async args => { calls.push(args); return calls.length === 1 ? pending() : proved(); },
    investigate: async ({ workItem, reason }) => ({
      status: 'FAILURE_EVIDENCE_COLLECTED', original_work_item_id: workItem.work_item_id, reason,
    }),
    repair: async ({ originalWorkItem }) => ({
      status: 'INSTALLED', authorization_ref: 'approved-repair-ref',
      original_work_item_id: originalWorkItem.work_item_id,
    }),
    verifyRepair: async ({ originalWorkItem }) => ({
      independent: true, verified: true, verification_id: 'independent-repair:1',
      original_work_item_id: originalWorkItem.work_item_id,
    }),
  });
  assert.equal(result.state, 'ALL_VERIFIED');
  assert.equal(result.summary.verified, 1);
  assert.equal(result.results[0].resumed, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].workItem, calls[1].workItem);
  assert.deepEqual(calls[0].authorization, calls[1].authorization);
  assert.deepEqual(events.map(x => x.phase), [
    'EXECUTION_STARTED','EXECUTION_NOT_VERIFIED','FAILURE_INVESTIGATED',
    'REPAIR_INDEPENDENTLY_VERIFIED','RESUMED_EXECUTION_STARTED','OUTCOME_VERIFIED'
  ]);
});

test('one failed job without a real repair adapter does not stop other authorized work', async () => {
  const events = [];
  const calls = [];
  const result = await runShiftWorkLoop({
    candidates: [item('job:failed'),item('job:works')],
    record: async x => events.push(x),
    authorize: async () => approval(),
    execute: async ({ workItem }) => {
      calls.push(workItem.work_item_id);
      return workItem.work_item_id === 'job:failed' ? pending() : proved();
    },
    investigate: async ({ failure }) => ({ status: 'INVESTIGATION_REQUIRED', failure }),
  });
  assert.deepEqual(calls, ['job:failed','job:works']);
  assert.equal(result.summary.repair_pending, 1);
  assert.equal(result.summary.verified, 1);
  assert.equal(result.state, 'UNFINISHED_WORK_REMAINS');
  assert.ok(events.some(x => x.phase === 'REPAIR_PENDING' && x.work_item_id === 'job:failed'));
});

test('absence of authority forbids execution and repair', async () => {
  let actions = 0;
  const result = await runShiftWorkLoop({
    candidates: [item('job:unauthorized')],
    record: async () => {},
    authorize: async () => null,
    execute: async () => { actions++; return proved(); },
    repair: async () => { actions++; return null; },
    verifyRepair: async () => { actions++; return null; },
  });
  assert.equal(actions, 0);
  assert.equal(result.summary.awaiting_authorization, 1);
});

test('a fake repair receipt never triggers resumption', async () => {
  let calls = 0;
  const result = await runShiftWorkLoop({
    candidates: [item('job:repair')],
    record: async () => {},
    authorize: async () => approval(),
    execute: async () => { calls++; return pending(); },
    investigate: async () => ({ status: 'INVESTIGATED' }),
    repair: async () => ({ status: 'PR_OPENED', original_work_item_id: 'job:repair', authorization_ref: 'ref' }),
    verifyRepair: async () => { throw new Error('should never be called'); },
  });
  assert.equal(calls, 1);
  assert.equal(result.summary.repair_pending, 1);
});

test('a repair without independent verification never triggers retry', async () => {
  let calls = 0;
  const result = await runShiftWorkLoop({
    candidates: [item('job:repair')],
    record: async () => {},
    authorize: async () => approval(),
    execute: async () => { calls++; return pending(); },
    repair: async () => ({ status: 'INSTALLED', authorization_ref: 'r',
      original_work_item_id: 'job:repair' }),
    verifyRepair: async () => ({ verified: true, independent: false, verification_id: 'self-attestation',
      original_work_item_id: 'job:repair' }),
  });
  assert.equal(calls, 1);
  assert.equal(result.summary.repair_pending, 1);
});

test('a claimed VERIFIED status without independent outcome remains unresolved', async () => {
  const result = await runShiftWorkLoop({
    candidates: [item('job:fake')],
    record: async () => {},
    authorize: async () => approval(),
    execute: async () => ({ status:'VERIFIED', verification:{verified:true, independent:false}, outcome:{verified:true} }),
  });
  assert.equal(result.summary.verified, 0);
  assert.equal(result.summary.repair_pending, 1);
});

test('a prior verified receipt prevents a second execution', async () => {
  let calls = 0;
  const result = await runShiftWorkLoop({
    candidates: [item('job:done')],
    priorEvents: [{ work_item_id:'job:done',phase:'OUTCOME_VERIFIED',
      verification:{verified:true, independent:true} }],
    record: async () => {},
    authorize: async () => approval(),
    execute: async () => { calls++; return proved(); },
  });
  assert.equal(calls, 0);
  assert.equal(result.results[0].status, 'ALREADY_VERIFIED');
});

test('ambiguous prior execution is not duplicated', async () => {
  let calls = 0;
  const result = await runShiftWorkLoop({
    candidates: [item('job:started')],
    priorEvents: [{work_item_id:'job:started',phase:'EXECUTION_STARTED'}],
    record: async () => {},
    authorize: async () => approval(),
    execute: async () => { calls++; return proved(); },
  });
  assert.equal(calls, 0);
  assert.equal(result.results[0].status, 'AWAITING_RECONCILIATION');
});

test('failed durable reservation means no external execution', async () => {
  let calls = 0;
  const result = await runShiftWorkLoop({
    candidates: [item('job:persist')],
    record: async () => { throw new Error('DATABASE_UNAVAILABLE'); },
    authorize: async () => approval(),
    execute: async () => { calls++; return proved(); },
  });
  assert.equal(calls, 0);
  assert.equal(result.results[0].status, 'AWAITING_RECONCILIATION');
});

test('legacy symbolic shift IDs normalize to valid stable UUIDs across child references', async () => {
  let saved = null;
  const raw = {
    appendEvent: async e => { saved = e; return e; },
    reconstruct: async () => [],
  };
  const wrapped = createShiftPersistenceAdapter(raw);
  const id = stableShiftUuid('shift:event', 'shift:tick:2026-11-18:17:00');
  const result = await wrapped.appendEvent({
    event_id: 'shift:tick:2026-11-18:17:00:result',
    entity_id: 'shift:tick:2026-11-18:17:00',
    parent_event_id: 'shift:tick:2026-11-18:17:00',
  });
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f-]{27,}$/);
  assert.match(result.event_id, /^[0-9a-f]{8}-[0-9a-f-]{27,}$/);
  assert.equal(saved.parent_event_id, id);
  assert.equal(stableShiftUuid('shift:event', 'shift:tick:2026-11-18:17:00'), id);
});

test('overnight shift has one stable identity across midnight', () => {
  const config={shiftStart:'21:00',shiftLength:8};
  assert.equal(shiftRunIdForLocalDate({year:'2026',month:'11',day:'18',hour:'22',minute:'00'}, config),
    shiftRunIdForLocalDate({year:'2026',month:'11',day:'19',hour:'01',minute:'00'}, config));
});

test('cron cannot be triggered by any random bearer or user-agent', () => {
  const original=process.env.CRON_SECRET;
  process.env.CRON_SECRET='test-secret-only';
  try {
    assert.equal(cronRequest({headers:{authorization:'Bearer any-other-secret'}}), false);
    assert.equal(cronRequest({headers:{'user-agent':'vercel-cron/1.0'}}), false);
    assert.equal(cronRequest({headers:{authorization:'Bearer test-secret-only'}}), true);
  } finally {
    if(original===undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET=original;
  }
});