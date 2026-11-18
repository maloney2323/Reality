import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SHIFT_OPERATING_CONTRACT,
  runGovernedShiftRecovery,
} from '../src/reality-shift-recovery-loop-v1.js';

const jobs = [
  { work_item_id: 'job-1', continuity_root_id: 'root-1' },
  { work_item_id: 'job-2', continuity_root_id: 'root-2' },
];
const grant = (job, operation, repairId = null) => ({
  granted: true, authorization_ref: 'approval-' + operation,
  scope: { work_item_id: job.work_item_id, operation, ...(repairId ? { repair_id: repairId } : {}) },
});
const proof = (job, suffix, repairId = null) => ({
  status: 'VERIFIED', independent: true, work_item_id: job.work_item_id,
  verification_id: suffix, evidence_refs: ['readback:' + suffix],
  ...(repairId ? { repair_id: repairId } : {}),
});

function ready(overrides = {}) {
  const events = [];
  const calls = [];
  const count = new Map();
  const adapters = {
    record: async event => events.push(event),
    authorizeWork: async job => grant(job, 'execute_work'),
    executeWork: async job => {
      calls.push(job.work_item_id);
      const n = (count.get(job.work_item_id) || 0) + 1;
      count.set(job.work_item_id, n);
      return { work_item_id: job.work_item_id, execution_id: 'exec:' + job.work_item_id + ':' + n,
        status: job.work_item_id === 'job-1' && n === 1 ? 'FAILED' : 'SUCCEEDED',
        failure_evidence_refs: job.work_item_id === 'job-1' && n === 1 ? ['provider:confirmed_failure'] : [] };
    },
    verifyOutcome: async job => proof(job, 'outcome:' + job.work_item_id),
    investigate: async job => ({ work_item_id: job.work_item_id, evidence_refs: ['readback:root-cause'] }),
    prepareRepair: async job => ({ work_item_id: job.work_item_id, repair_id: 'repair:' + job.work_item_id }),
    authorizeSandboxRepair: async (job, repair) => grant(job, 'sandbox_repair', repair.repair_id),
    buildRepair: async (job, repair) => ({ artifact_id: 'artifact:' + repair.repair_id }),
    verifySandboxRepair: async (job, repair) => proof(job, 'sandbox-test', repair.repair_id),
    authorizeInstallation: async (job, repair) => grant(job, 'install_repair', repair.repair_id),
    installRepair: async (job, repair) => ({ status: 'INSTALLED', repair_id: repair.repair_id }),
    verifyInstallation: async (job, repair) => proof(job, 'installed-readback', repair.repair_id),
    ...overrides,
  };
  return { adapters, events, calls };
}

test('operating contract is part of executable code, not a generated chat instruction', () => {
  assert.match(SHIFT_OPERATING_CONTRACT.resumption, /SAME original job/);
  assert.match(SHIFT_OPERATING_CONTRACT.completion, /independently verified/);
});

test('complete shift: failure, authorized repair, independent tests, same-job resume, remaining job verified', async () => {
  const { adapters, events, calls } = ready();
  const result = await runGovernedShiftRecovery({
    shiftId: 'shift-A', loadAssignedWork: async () => jobs, adapters,
  });
  assert.equal(result.status, 'ALL_SELECTED_JOBS_VERIFIED');
  assert.equal(result.completed_count, 2);
  assert.deepEqual(calls, ['job-1', 'job-1', 'job-2']);
  assert.equal(result.jobs[0].repair_attempts, 1);
  assert.equal(result.jobs[0].work_item_id, 'job-1');
  assert.ok(events.some(x => x.stage === 'ROOT_CAUSE_INVESTIGATED'));
  assert.ok(events.some(x => x.stage === 'REPAIR_TEST_VERIFIED'));
  assert.ok(events.some(x => x.stage === 'INSTALLATION_VERIFIED_RESUME_ORIGINAL'));
  assert.equal(events.filter(x => x.stage === 'VERIFIED_COMPLETION').length, 2);
  assert.equal(events[0].continuity_root_id, 'root-1');
  assert.equal(new Set(events.map(x => x.event_id)).size, events.length);
});

test('missing exact installation authorization blocks that job, not independent assignments', async () => {
  const { adapters, calls } = ready({
    authorizeInstallation: async () => grant(jobs[1], 'install_repair', 'repair:job-1'),
  });
  const result = await runGovernedShiftRecovery({
    shiftId: 'shift-B', loadAssignedWork: async () => jobs, adapters,
  });
  assert.equal(result.status, 'INCOMPLETE');
  assert.equal(result.jobs[0].state, 'AWAITING_INSTALL_AUTHORIZATION');
  assert.equal(result.jobs[1].state, 'VERIFIED');
  assert.deepEqual(calls, ['job-1', 'job-2']);
});

test('unverified sandbox test prevents installation and resumption', async () => {
  let installs = 0;
  const { adapters, calls } = ready({
    verifySandboxRepair: async job => ({ ...proof(job, 'test', 'repair:job-1'), independent: false }),
    installRepair: async () => { installs += 1; },
  });
  const result = await runGovernedShiftRecovery({
    shiftId: 'shift-C', loadAssignedWork: async () => jobs, adapters,
  });
  assert.equal(result.jobs[0].reason, 'REPAIR_INDEPENDENT_TEST_FAILED');
  assert.equal(installs, 0);
  assert.deepEqual(calls, ['job-1', 'job-2']);
});

test('a thrown execution has unknown external outcome and is never blindly repeated', async () => {
  let executions = 0;
  const { adapters } = ready({ executeWork: async () => { executions++; throw new Error('timeout'); } });
  const result = await runGovernedShiftRecovery({
    shiftId: 'shift-D', loadAssignedWork: async () => [jobs[0]], adapters,
  });
  assert.equal(result.jobs[0].state, 'UNRESOLVED');
  assert.equal(result.jobs[0].reason, 'EXECUTION_OUTCOME_UNKNOWN');
  assert.equal(executions, 1);
});

test('no guessed authority, including mismatched operation scope', async () => {
  let executions = 0;
  const { adapters } = ready({
    authorizeWork: async job => grant(job, 'install_repair'),
    executeWork: async () => { executions++; },
  });
  const result = await runGovernedShiftRecovery({
    shiftId: 'shift-E', loadAssignedWork: async () => jobs, adapters,
  });
  assert.equal(result.jobs[0].state, 'AWAITING_WORK_AUTHORIZATION');
  assert.equal(result.jobs[1].state, 'AWAITING_WORK_AUTHORIZATION');
  assert.equal(executions, 0);
});

test('an unverified work outcome is never counted as success', async () => {
  const { adapters } = ready({
    verifyOutcome: async job => ({ ...proof(job, 'not-independent'), independent: false }),
    executeWork: async job => ({ work_item_id: job.work_item_id, execution_id: 'exec', status: 'SUCCEEDED' }),
  });
  const result = await runGovernedShiftRecovery({
    shiftId: 'shift-F', loadAssignedWork: async () => jobs, adapters,
  });
  assert.equal(result.completed_count, 0);
  assert.equal(result.status, 'INCOMPLETE');
});

test('missing durable job source or event writer fails closed', async () => {
  const a = await runGovernedShiftRecovery({ shiftId: 'shift-G' });
  assert.equal(a.status, 'INTEGRATION_BLOCKED');
  assert.equal(a.reason, 'DURABLE_ASSIGNED_WORK_LOADER_REQUIRED');
  const b = await runGovernedShiftRecovery({ shiftId: 'shift-G', loadAssignedWork: async () => jobs });
  assert.equal(b.reason, 'DURABLE_EVENT_WRITER_REQUIRED');
  const c = await runGovernedShiftRecovery({
    shiftId: 'shift-G', loadAssignedWork: async () => [], adapters: { record: async () => {} },
  });
  assert.equal(c.status, 'NO_ASSIGNED_WORK');
  assert.equal(c.completed_count, 0);
});

test('recording failure prevents external action', async () => {
  let executions = 0;
  const { adapters } = ready({
    record: async () => { throw new Error('no durable ledger'); },
    executeWork: async () => { executions += 1; },
  });
  await assert.rejects(
    runGovernedShiftRecovery({ shiftId: 'shift-H', loadAssignedWork: async () => [jobs[0]], adapters }),
    /no durable ledger/,
  );
  assert.equal(executions, 0);
});

test('same work item cannot appear twice in a single shift', async () => {
  await assert.rejects(
    runGovernedShiftRecovery({
      shiftId: 'shift-I',
      loadAssignedWork: async () => [jobs[0], jobs[0]],
      adapters: { record: async () => {} },
    }), /DUPLICATE_ASSIGNED_WORK/,
  );
});