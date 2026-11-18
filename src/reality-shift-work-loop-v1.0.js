/**
 * Reality's intrinsic operating rule, not an LLM prompt:
 * attempt every eligible job, investigate failures, repair only through a
 * separately authorized and independently verified adapter, then retry the
 * exact original job. A blocked job never stops unrelated authorized work.
 */
export const SHIFT_WORK_LOOP_VERSION = 'reality-shift-work-loop-v1.0';

const string = value => typeof value === 'string' ? value.trim() : '';
const list = value => Array.isArray(value) ? value : [];
const safeReason = error => string(error?.code) || string(error?.message)?.slice(0, 180) || 'EXECUTION_FAILED';
const verifiedExecution = result =>
  result?.status === 'VERIFIED' &&
  result?.verification?.independent === true &&
  result?.verification?.verified === true &&
  result?.outcome?.verified === true;

function identity(candidate) {
  const item = candidate?.execution_work_item || candidate?.work_item || candidate;
  if (!string(item?.work_item_id) || !string(item?.workflow_id)) return null;
  return Object.freeze({
    work_item_id: item.work_item_id,
    workflow_id: item.workflow_id,
    continuity_root_id: string(item.continuity_root_id) || null,
    worldline_id: string(item.worldline_id) || null,
    item,
  });
}

function isAlreadyVerified(priorEvents, id) {
  return list(priorEvents).some(event =>
    event?.work_item_id === id &&
    event?.phase === 'OUTCOME_VERIFIED' &&
    event?.verification?.independent === true &&
    event?.verification?.verified === true
  );
}
function isUnreconciledAttempt(priorEvents, id) {
  const history = list(priorEvents).filter(e => e?.work_item_id === id);
  return history.some(e => e.phase === 'EXECUTION_STARTED' || e.phase === 'RESUMED_EXECUTION_STARTED')
    && !history.some(e => e.phase === 'OUTCOME_VERIFIED');
}
const terminal = (id, status, detail = {}) => Object.freeze({ work_item_id: id, status, ...detail });

export async function runShiftWorkLoop({
  candidates = [],
  priorEvents = [],
  authorize,
  execute,
  investigate,
  repair,
  verifyRepair,
  record,
  maxRepairsPerJob = 1,
} = {}) {
  if (typeof record !== 'function') throw new Error('SHIFT_DURABLE_EVENT_RECORDER_REQUIRED');
  if (typeof authorize !== 'function') throw new Error('SHIFT_AUTHORITY_ADAPTER_REQUIRED');
  if (typeof execute !== 'function') throw new Error('SHIFT_EXECUTION_ADAPTER_REQUIRED');
  if (!Number.isInteger(maxRepairsPerJob) || maxRepairsPerJob < 0 || maxRepairsPerJob > 3)
    throw new Error('SHIFT_REPAIR_BUDGET_INVALID');

  const results = [];
  const seen = new Set();
  const emit = async event => { await record(Object.freeze({ ...event })); };

  for (const candidate of list(candidates)) {
    const bound = identity(candidate);
    const id = bound?.work_item_id || string(candidate?.work_id) || 'UNKNOWN';
    if (seen.has(id)) continue;
    seen.add(id);

    if (!bound) {
      results.push(terminal(id, 'NOT_EXECUTABLE', { reason: 'EXACT_WORKFLOW_AND_WORK_ITEM_REQUIRED' }));
      continue;
    }
    if (isAlreadyVerified(priorEvents, id)) {
      results.push(terminal(id, 'ALREADY_VERIFIED', { resumed: false }));
      continue;
    }
    // Fail closed on ambiguous outcome: a crash after a provider side effect
    // must not result in a duplicate execution on the next scheduled tick.
    if (isUnreconciledAttempt(priorEvents, id)) {
      results.push(terminal(id, 'AWAITING_RECONCILIATION', { reason: 'PREVIOUS_ATTEMPT_OUTCOME_UNKNOWN' }));
      continue;
    }

    let authorization;
    try { authorization = await authorize({ workItem: bound.item, candidate }); }
    catch (error) {
      await emit({ work_item_id: id, phase: 'AUTHORITY_CHECK_FAILED', reason: safeReason(error) });
      results.push(terminal(id, 'AWAITING_AUTHORIZATION', { reason: 'AUTHORITY_CHECK_FAILED' }));
      continue;
    }
    if (!authorization?.authorization_id) {
      await emit({ work_item_id: id, phase: 'AWAITING_AUTHORIZATION' });
      results.push(terminal(id, 'AWAITING_AUTHORIZATION'));
      continue;
    }

    // Every execution must be preceded by a durable reservation event.
    async function attempt(phase) {
      await emit({ work_item_id: id, workflow_id: bound.workflow_id, phase,
        authorization_id: authorization.authorization_id });
      try { return await execute({ workItem: bound.item, candidate, authorization }); }
      catch (error) { return { status: 'FAILED', blocked_reason: safeReason(error) }; }
    }

    let outcome;
    try { outcome = await attempt('EXECUTION_STARTED'); }
    catch (error) {
      // Recording the reservation failed or another worker already reserved
      // this job. No external execution is allowed in this situation.
      results.push(terminal(id, 'AWAITING_RECONCILIATION', { reason: 'EXECUTION_RESERVATION_FAILED' }));
      continue;
    }
    if (verifiedExecution(outcome)) {
      await emit({ work_item_id: id, phase: 'OUTCOME_VERIFIED', verification: outcome.verification,
        execution_id: outcome.execution?.execution_id || null });
      results.push(terminal(id, 'VERIFIED', { resumed: false, verification: outcome.verification }));
      continue;
    }
    const reason = string(outcome?.blocked_reason) || string(outcome?.status) || 'OUTCOME_NOT_INDEPENDENTLY_VERIFIED';
    await emit({ work_item_id: id, phase: 'EXECUTION_NOT_VERIFIED', reason });

    // A missing or mismatched authority grant is not a capability gap.
    // Never attempt to "repair" or bypass an authorization boundary.
    if (/AUTHORIZ|SCOPE|PRINCIPAL|POLICY|EXPIRED/i.test(reason)) {
      results.push(terminal(id, 'AWAITING_AUTHORIZATION', { reason }));
      continue;
    }

    let diagnosis = null;
    if (typeof investigate === 'function') {
      try {
        diagnosis = await investigate({ workItem: bound.item, candidate, failure: outcome, reason });
      } catch (error) {
        diagnosis = { status: 'INVESTIGATION_FAILED', reason: safeReason(error), evidence_refs: [] };
      }
    }
    await emit({ work_item_id: id, phase: 'FAILURE_INVESTIGATED',
      diagnosis: diagnosis || { status: 'INVESTIGATION_UNAVAILABLE', evidence_refs: [] }, reason });

    if (typeof repair !== 'function' || typeof verifyRepair !== 'function' || maxRepairsPerJob === 0) {
      await emit({ work_item_id: id, phase: 'REPAIR_PENDING', reason: 'AUTHORIZED_REPAIR_ADAPTER_UNAVAILABLE' });
      results.push(terminal(id, 'REPAIR_PENDING', { reason, diagnosis }));
      continue;
    }

    let recovered = false;
    for (let n = 1; n <= maxRepairsPerJob; n++) {
      let repairResult;
      try {
        repairResult = await repair({
          originalWorkItem: bound.item, originalAuthorization: authorization, diagnosis,
          failedExecution: outcome, attempt: n,
        });
      } catch (error) {
        await emit({ work_item_id: id, phase: 'REPAIR_FAILED', reason: safeReason(error), attempt: n });
        break;
      }
      // An artifact merely proposed/opened in GitHub is NOT an installed repair.
      if (repairResult?.status !== 'INSTALLED' || !string(repairResult?.authorization_ref)
        || repairResult?.original_work_item_id !== id) {
        await emit({ work_item_id: id, phase: 'REPAIR_PENDING',
          reason: 'NO_AUTHORIZED_INSTALLED_REPAIR', attempt: n });
        break;
      }
      const repairProof = await verifyRepair({
        originalWorkItem: bound.item, repairResult, diagnosis,
      }).catch(error => ({ verified: false, reason: safeReason(error) }));
      if (repairProof?.verified !== true || repairProof?.independent !== true ||
        !string(repairProof?.verification_id) || repairProof?.original_work_item_id !== id) {
        await emit({ work_item_id: id, phase: 'REPAIR_NOT_VERIFIED', attempt: n });
        break;
      }
      await emit({ work_item_id: id, phase: 'REPAIR_INDEPENDENTLY_VERIFIED', attempt: n,
        repair_verification_id: repairProof.verification_id });
      // Repair success permits a retry of the ORIGINAL job only. It does not
      // expand the original execution authorization or create a new job.
      let retried;
      try { retried = await attempt('RESUMED_EXECUTION_STARTED'); }
      catch {
        results.push(terminal(id, 'AWAITING_RECONCILIATION', { reason: 'RESUMPTION_RESERVATION_FAILED' }));
        recovered = true;
        break;
      }
      if (verifiedExecution(retried)) {
        await emit({ work_item_id: id, phase: 'OUTCOME_VERIFIED', verification: retried.verification,
          resumed_after_repair: true, repair_verification_id: repairProof.verification_id });
        results.push(terminal(id, 'VERIFIED', { resumed: true, verification: retried.verification }));
        recovered = true;
        break;
      }
      await emit({ work_item_id: id, phase: 'RESUMED_EXECUTION_NOT_VERIFIED',
        reason: string(retried?.blocked_reason) || 'OUTCOME_UNVERIFIED', attempt: n });
      outcome = retried;
    }
    if (!recovered) {
      await emit({ work_item_id: id, phase: 'REPAIR_PENDING', reason: 'VERIFIED_COMPLETION_NOT_ESTABLISHED' });
      results.push(terminal(id, 'REPAIR_PENDING', { reason, diagnosis }));
    }
  }

  const summary = {
    candidates: results.length,
    verified: results.filter(r => r.status === 'VERIFIED' || r.status === 'ALREADY_VERIFIED').length,
    awaiting_authorization: results.filter(r => r.status === 'AWAITING_AUTHORIZATION').length,
    repair_pending: results.filter(r => r.status === 'REPAIR_PENDING').length,
    awaiting_reconciliation: results.filter(r => r.status === 'AWAITING_RECONCILIATION').length,
    not_executable: results.filter(r => r.status === 'NOT_EXECUTABLE').length,
  };
  return Object.freeze({ version: SHIFT_WORK_LOOP_VERSION, state:
    results.length && summary.verified === results.length ? 'ALL_VERIFIED' : 'UNFINISHED_WORK_REMAINS',
    results: Object.freeze(results), summary: Object.freeze(summary),
    automatic_new_authority: false, unverified_repairs_count_as_success: false });
}
