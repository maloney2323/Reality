import crypto from 'node:crypto';

export const SHIFT_RECOVERY_PROTOCOL_VERSION = 'reality-governed-shift-recovery-v1';

/**
 * The permanent Reality shift objective, enforced by the runner's gates.
 * A model instruction alone never grants authority or marks an outcome verified.
 */
export const SHIFT_OPERATING_CONTRACT = Object.freeze({
  goal: 'Complete the full evidence-backed, authorized work shift and verify every outcome.',
  discovery: 'Load real assigned jobs from durable operational state, not a fabricated list.',
  continuity: 'A failed job must retain its original work_item_id and continuity_root_id.',
  failure: 'Investigate a confirmed failure; do not treat silence or ambiguous transport as failure.',
  repair: 'Acquire a missing capability through an authorized sandbox, independent tests, and a separately authorized installation.',
  resumption: 'Automatically retry the SAME original job after independent installation verification.',
  concurrency: 'A blocked job must not stop unrelated authorized work.',
  limits: 'No inferred authority, no unbounded retries, no implicit success, no duplicate side effects.',
  completion: 'Only independently verified outcomes count as completed. Report blockers and value evidence separately.',
});

export const SHIFT_JOB_STATES = Object.freeze([
  'VERIFIED', 'AWAITING_WORK_AUTHORIZATION', 'AWAITING_REPAIR_AUTHORIZATION',
  'AWAITING_INSTALL_AUTHORIZATION', 'BLOCKED', 'UNRESOLVED',
]);

const nonblank = x => typeof x === 'string' && x.trim().length > 0;
const evidence = x => Array.isArray(x) && x.some(nonblank);

function authorized(grant, job, operation, repairId = null) {
  if (grant?.granted !== true || !nonblank(grant.authorization_ref)) return false;
  if (grant.scope?.work_item_id !== job.work_item_id || grant.scope?.operation !== operation) return false;
  return repairId === null || grant.scope?.repair_id === repairId;
}

function independentProof(proof, job, { repairId = null, status = 'VERIFIED' } = {}) {
  return proof?.independent === true &&
    proof.status === status &&
    proof.work_item_id === job.work_item_id &&
    (repairId === null || proof.repair_id === repairId) &&
    nonblank(proof.verification_id) &&
    evidence(proof.evidence_refs);
}

function stableUuid(value) {
  const h = crypto.createHash('sha256').update(String(value)).digest('hex');
  return [h.slice(0, 8), h.slice(8, 12), '5' + h.slice(13, 16), 'a' + h.slice(17, 20), h.slice(20, 32)].join('-');
}

/**
 * Run a bounded *real* shift over a source-backed queue. All I/O is delegated
 * to server-side adapters. There is no automatic authority creation, and no
 * model-generated completion claim is accepted as a receipt.
 *
 * record must durably persist every decision BEFORE the next side effect.
 * The caller owns idempotent job reservation across repeated invocations.
 */
export async function runGovernedShiftRecovery({
  shiftId, loadAssignedWork, adapters = {}, maxRepairAttempts = 2,
} = {}) {
  if (!nonblank(shiftId)) throw new Error('SHIFT_ID_REQUIRED');
  if (typeof loadAssignedWork !== 'function') return Object.freeze({
    protocol_version: SHIFT_RECOVERY_PROTOCOL_VERSION, shift_id: shiftId,
    status: 'INTEGRATION_BLOCKED', reason: 'DURABLE_ASSIGNED_WORK_LOADER_REQUIRED', jobs: [],
  });
  if (typeof adapters.record !== 'function') return Object.freeze({
    protocol_version: SHIFT_RECOVERY_PROTOCOL_VERSION, shift_id: shiftId,
    status: 'INTEGRATION_BLOCKED', reason: 'DURABLE_EVENT_WRITER_REQUIRED', jobs: [],
  });
  if (!Number.isInteger(maxRepairAttempts) || maxRepairAttempts < 0 || maxRepairAttempts > 3) {
    throw new Error('SHIFT_REPAIR_BUDGET_INVALID');
  }

  const jobs = await loadAssignedWork();
  if (!Array.isArray(jobs)) throw new Error('ASSIGNED_WORK_LIST_INVALID');
  if (!jobs.length) return Object.freeze({
    protocol_version: SHIFT_RECOVERY_PROTOCOL_VERSION, shift_id: shiftId,
    status: 'NO_ASSIGNED_WORK', jobs: [], completed_count: 0, value: 'NOT_ESTABLISHED',
  });
  const ids = new Set();
  for (const job of jobs) {
    if (!nonblank(job?.work_item_id) || !nonblank(job?.continuity_root_id)) {
      throw new Error('SOURCE_BACKED_WORK_IDENTITY_REQUIRED');
    }
    if (ids.has(job.work_item_id)) throw new Error('DUPLICATE_ASSIGNED_WORK');
    ids.add(job.work_item_id);
  }

  async function persist(job, stage, attempt, detail = {}) {
    await adapters.record(Object.freeze({
      event_id: stableUuid([shiftId, job.work_item_id, stage, attempt].join('|')),
      shift_id: shiftId, work_item_id: job.work_item_id,
      continuity_root_id: job.continuity_root_id, stage, attempt,
      detail: Object.freeze(detail),
      protocol_version: SHIFT_RECOVERY_PROTOCOL_VERSION,
    }));
  }

  const outcomes = [];
  for (const job of jobs) {
    const originalId = job.work_item_id;
    const history = typeof adapters.loadPriorStages === 'function'
      ? await adapters.loadPriorStages(job, shiftId) : [];
    if (!Array.isArray(history)) throw new Error('SHIFT_PRIOR_STAGES_INVALID');
    const prior = history.filter(event =>
      event?.work_item_id === originalId &&
      event?.continuity_root_id === job.continuity_root_id &&
      event?.shift_id === shiftId);
    const completion = prior.find(e => e.stage === 'VERIFIED_COMPLETION');
    if (completion) {
      const detail = completion.detail || {};
      if (nonblank(detail.execution_id) && nonblank(detail.verification_id) &&
        evidence(detail.evidence_refs)) {
        outcomes.push(Object.freeze({
          work_item_id:originalId,state:'VERIFIED',from_durable_receipt:true,
          execution_id:detail.execution_id,verification_id:detail.verification_id,
          evidence_refs:detail.evidence_refs,repair_attempts:Number(completion.attempt||1)-1,
        }));
        continue;
      }
      throw new Error('SHIFT_DURABLE_COMPLETION_RECEIPT_INVALID');
    }
    const irreversible = prior.some(e => [
      'EXECUTION_REQUESTED','SANDBOX_REPAIR_REQUESTED','INSTALLATION_REQUESTED',
    ].includes(e.stage));
    if (irreversible) {
      // Re-read the actual external target. This can settle a successful
      // result whose response was lost, but MUST NEVER perform another write.
      const request = prior.find(e => e.stage==='EXECUTION_REQUESTED');
      const anyRepairRequest = prior.some(e => [
        'SANDBOX_REPAIR_REQUESTED','INSTALLATION_REQUESTED',
      ].includes(e.stage));
      let reconciliation = null;
      if (request && !anyRepairRequest &&
        typeof adapters.reconcilePendingExecution==='function') {
        try { reconciliation = await adapters.reconcilePendingExecution(job,{
          shiftId,history:prior,
        }); } catch { reconciliation=null; }
      }
      if (independentProof(reconciliation,job) &&
        nonblank(reconciliation.execution_id)) {
        const attempt=Number(request.attempt||1);
        await persist(job,'VERIFIED_COMPLETION',attempt,{
          execution_id:reconciliation.execution_id,
          verification_id:reconciliation.verification_id,
          evidence_refs:reconciliation.evidence_refs,
          reconciled_from_provider:true,
        });
        outcomes.push(Object.freeze({
          work_item_id:originalId,state:'VERIFIED',repair_attempts:attempt-1,
          execution_id:reconciliation.execution_id,
          verification_id:reconciliation.verification_id,
          evidence_refs:reconciliation.evidence_refs,
          reconciled_from_provider:true,
        }));
        continue;
      }
      const last = prior.at(-1)?.stage || null;
      const reason = last === 'EXECUTION_OUTCOME_UNKNOWN'
        ? 'EXECUTION_OUTCOME_UNKNOWN'
        : 'PENDING_SIDE_EFFECT_RECONCILIATION_REQUIRED';
      outcomes.push(Object.freeze({
        work_item_id:originalId,state:'UNRESOLVED',reason,from_durable_checkpoint:true,
        repair_attempts:0,
      }));
      continue;
    }
    let repairAttempts = 0;
    let outcome = null;
    // Record an unchanged information-only gate once, not on every wake.
    const seenInformational = new Set(prior.map(x => x.stage));
    // A retry is allowed ONLY after independent proof of a repair installation.
    while (!outcome) {
      const attempt = repairAttempts + 1;
      const grant = typeof adapters.authorizeWork === 'function'
        ? await adapters.authorizeWork(job) : null;
      if (!authorized(grant, job, 'execute_work')) {
        if (!seenInformational.has('AWAITING_WORK_AUTHORIZATION')) {
          await persist(job, 'AWAITING_WORK_AUTHORIZATION', attempt);
        }
        outcome = { work_item_id: originalId, state: 'AWAITING_WORK_AUTHORIZATION', repair_attempts: repairAttempts };
        break;
      }
      if (typeof adapters.executeWork !== 'function' || typeof adapters.verifyOutcome !== 'function') {
        if (!seenInformational.has('MISSING_EXECUTION_OR_VERIFIER')) {
          await persist(job, 'MISSING_EXECUTION_OR_VERIFIER', attempt);
        }
        outcome = { work_item_id: originalId, state: 'BLOCKED', reason: 'EXECUTION_OR_VERIFICATION_BRIDGE_REQUIRED', repair_attempts: repairAttempts };
        break;
      }
      await persist(job, 'EXECUTION_REQUESTED', attempt, { authorization_ref: grant.authorization_ref });
      let execution;
      try {
        execution = await adapters.executeWork(job, grant, { attempt, idempotency_key: stableUuid([shiftId, originalId, 'execution', attempt].join('|')) });
      } catch {
        // An unknown transport outcome cannot safely be retried.
        await persist(job, 'EXECUTION_OUTCOME_UNKNOWN', attempt);
        outcome = { work_item_id: originalId, state: 'UNRESOLVED', reason: 'EXECUTION_OUTCOME_UNKNOWN', repair_attempts: repairAttempts };
        break;
      }
      if (execution?.work_item_id !== originalId || !nonblank(execution?.execution_id)) {
        await persist(job, 'EXECUTION_RECEIPT_INVALID', attempt);
        outcome = { work_item_id: originalId, state: 'UNRESOLVED', reason: 'EXECUTION_RECEIPT_INVALID', repair_attempts: repairAttempts };
        break;
      }
      if (execution.status === 'SUCCEEDED') {
        let verification;
        try { verification = await adapters.verifyOutcome(job, execution); }
        catch { verification = null; }
        if (independentProof(verification, job)) {
          await persist(job, 'VERIFIED_COMPLETION', attempt, {
            execution_id: execution.execution_id,
            verification_id: verification.verification_id,
            evidence_refs: verification.evidence_refs,
          });
          outcome = { work_item_id: originalId, state: 'VERIFIED', repair_attempts: repairAttempts,
            execution_id: execution.execution_id, verification_id: verification.verification_id,
            evidence_refs: verification.evidence_refs };
        } else {
          await persist(job, 'OUTCOME_NOT_INDEPENDENTLY_VERIFIED', attempt);
          outcome = { work_item_id: originalId, state: 'UNRESOLVED', reason: 'OUTCOME_VERIFICATION_REQUIRED', repair_attempts: repairAttempts };
        }
        break;
      }
      if (execution.status !== 'FAILED' || !evidence(execution.failure_evidence_refs)) {
        await persist(job, 'FAILURE_NOT_CONFIRMED', attempt);
        outcome = { work_item_id: originalId, state: 'UNRESOLVED', reason: 'CONFIRMED_FAILURE_EVIDENCE_REQUIRED', repair_attempts: repairAttempts };
        break;
      }

      await persist(job, 'CONFIRMED_FAILURE', attempt, {
        execution_id: execution.execution_id, evidence_refs: execution.failure_evidence_refs,
      });
      if (repairAttempts >= maxRepairAttempts) {
        await persist(job, 'REPAIR_BUDGET_EXHAUSTED', attempt);
        outcome = { work_item_id: originalId, state: 'BLOCKED', reason: 'REPAIR_BUDGET_EXHAUSTED', repair_attempts: repairAttempts };
        break;
      }
      if (typeof adapters.investigate !== 'function' || typeof adapters.prepareRepair !== 'function') {
        await persist(job, 'REPAIR_HANDOFF_MISSING', attempt);
        outcome = { work_item_id: originalId, state: 'BLOCKED', reason: 'INVESTIGATION_OR_REPAIR_ADAPTER_REQUIRED', repair_attempts: repairAttempts };
        break;
      }
      const investigation = await adapters.investigate(job, execution);
      if (investigation?.work_item_id !== originalId || !evidence(investigation.evidence_refs)) {
        await persist(job, 'ROOT_CAUSE_NOT_ESTABLISHED', attempt);
        outcome = { work_item_id: originalId, state: 'BLOCKED', reason: 'ROOT_CAUSE_EVIDENCE_REQUIRED', repair_attempts: repairAttempts };
        break;
      }
      await persist(job, 'ROOT_CAUSE_INVESTIGATED', attempt, { evidence_refs: investigation.evidence_refs });
      const repair = await adapters.prepareRepair(job, investigation);
      if (repair?.work_item_id !== originalId || !nonblank(repair?.repair_id)) {
        await persist(job, 'REPAIR_ARTIFACT_MISSING', attempt);
        outcome = { work_item_id: originalId, state: 'BLOCKED', reason: 'REPAIR_ARTIFACT_REQUIRED', repair_attempts: repairAttempts };
        break;
      }
      const sandboxGrant = typeof adapters.authorizeSandboxRepair === 'function'
        ? await adapters.authorizeSandboxRepair(job, repair) : null;
      if (!authorized(sandboxGrant, job, 'sandbox_repair', repair.repair_id)) {
        await persist(job, 'AWAITING_REPAIR_AUTHORIZATION', attempt, { repair_id: repair.repair_id });
        outcome = { work_item_id: originalId, state: 'AWAITING_REPAIR_AUTHORIZATION',
          repair_id: repair.repair_id, repair_attempts: repairAttempts };
        break;
      }
      if (typeof adapters.buildRepair !== 'function' || typeof adapters.verifySandboxRepair !== 'function') {
        await persist(job, 'SANDBOX_HANDOFF_MISSING', attempt);
        outcome = { work_item_id: originalId, state: 'BLOCKED', reason: 'INDEPENDENT_SANDBOX_TEST_REQUIRED', repair_attempts: repairAttempts };
        break;
      }
      await persist(job, 'SANDBOX_REPAIR_REQUESTED', attempt, {
        repair_id: repair.repair_id, authorization_ref: sandboxGrant.authorization_ref,
      });
      const artifact = await adapters.buildRepair(job, repair, sandboxGrant);
      const sandboxProof = await adapters.verifySandboxRepair(job, repair, artifact);
      if (!independentProof(sandboxProof, job, { repairId: repair.repair_id })) {
        await persist(job, 'REPAIR_TEST_FAILED', attempt, { repair_id: repair.repair_id });
        outcome = { work_item_id: originalId, state: 'BLOCKED', reason: 'REPAIR_INDEPENDENT_TEST_FAILED', repair_attempts: repairAttempts };
        break;
      }
      await persist(job, 'REPAIR_TEST_VERIFIED', attempt, {
        repair_id: repair.repair_id, verification_id: sandboxProof.verification_id,
        evidence_refs: sandboxProof.evidence_refs,
      });
      const installGrant = typeof adapters.authorizeInstallation === 'function'
        ? await adapters.authorizeInstallation(job, repair, sandboxProof) : null;
      if (!authorized(installGrant, job, 'install_repair', repair.repair_id)) {
        await persist(job, 'AWAITING_INSTALL_AUTHORIZATION', attempt, { repair_id: repair.repair_id });
        outcome = { work_item_id: originalId, state: 'AWAITING_INSTALL_AUTHORIZATION',
          repair_id: repair.repair_id, repair_attempts: repairAttempts };
        break;
      }
      if (typeof adapters.installRepair !== 'function' || typeof adapters.verifyInstallation !== 'function') {
        await persist(job, 'INSTALL_VERIFIER_MISSING', attempt);
        outcome = { work_item_id: originalId, state: 'BLOCKED', reason: 'INSTALLATION_BRIDGE_REQUIRED', repair_attempts: repairAttempts };
        break;
      }
      await persist(job, 'INSTALLATION_REQUESTED', attempt, {
        repair_id: repair.repair_id, authorization_ref: installGrant.authorization_ref,
      });
      let installation;
      try { installation = await adapters.installRepair(job, repair, artifact, installGrant); }
      catch {
        await persist(job, 'INSTALLATION_OUTCOME_UNKNOWN', attempt);
        outcome = { work_item_id: originalId, state: 'UNRESOLVED', reason: 'INSTALLATION_OUTCOME_UNKNOWN', repair_attempts: repairAttempts };
        break;
      }
      const installed = installation?.status === 'INSTALLED' &&
        installation?.repair_id === repair.repair_id &&
        await adapters.verifyInstallation(job, repair, installation);
      if (!independentProof(installed, job, { repairId: repair.repair_id })) {
        await persist(job, 'INSTALLATION_NOT_VERIFIED', attempt);
        outcome = { work_item_id: originalId, state: 'UNRESOLVED', reason: 'INSTALLATION_VERIFICATION_REQUIRED', repair_attempts: repairAttempts };
        break;
      }
      await persist(job, 'INSTALLATION_VERIFIED_RESUME_ORIGINAL', attempt, {
        repair_id: repair.repair_id, verification_id: installed.verification_id,
        evidence_refs: installed.evidence_refs,
        original_work_item_id: originalId,
      });
      repairAttempts += 1;
      // The next iteration acts on the original job and its original scope.
    }
    outcomes.push(Object.freeze(outcome));
  }

  const completed = outcomes.filter(x => x.state === 'VERIFIED').length;
  return Object.freeze({
    protocol_version: SHIFT_RECOVERY_PROTOCOL_VERSION, shift_id: shiftId,
    status: completed === jobs.length ? 'ALL_SELECTED_JOBS_VERIFIED' : 'INCOMPLETE',
    selected_count: jobs.length, completed_count: completed, jobs: Object.freeze(outcomes),
    value: 'REQUIRES_INDEPENDENT_MEASUREMENT',
  });
}