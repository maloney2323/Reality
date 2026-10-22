// Reality's original-work closure boundary. This runs AFTER a capability has
// been independently verified and registered, never as part of model egress.
// A successful upgrade is not proof that the user's original task was completed.
export const ORIGINAL_WORK_RETRY_VERSION = 'reality-original-work-retry-v0.1';

const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const freeze = value => Object.freeze(value);

export async function retryAndVerifyOriginalWork({
  workItem, reactivation, registration, authorization = null, runner = null,
} = {}) {
  if (!nonempty(workItem?.id) || reactivation?.original_work_item_id !== workItem.id ||
      reactivation?.state !== 'REACTIVATED' ||
      registration?.state !== 'REGISTERED' ||
      registration.capability_id !== reactivation.capability_id ||
      !nonempty(reactivation.continuation_token)) {
    throw new Error('REACTIVATED_WORK_AND_REGISTERED_CAPABILITY_REQUIRED');
  }
  const context = {
    version: ORIGINAL_WORK_RETRY_VERSION,
    original_work_item_id: workItem.id,
    capability_id: registration.capability_id,
    continuation_token: reactivation.continuation_token,
  };
  if (!runner) return freeze({ ...context, status: 'NOT_ATTEMPTED', reason: 'NO_ORIGINAL_WORK_RUNNER' });
  if (!nonempty(authorization?.authorization_ref) ||
      !nonempty(authorization?.authorized_by) ||
      authorization?.work_item_id !== workItem.id) {
    return freeze({ ...context, status: 'AWAITING_AUTHORIZATION', reason: 'ORIGINAL_WORK_RETRY_AUTHORITY_REQUIRED' });
  }
  if (typeof runner.verifyAuthorization !== 'function' ||
      typeof runner.retry !== 'function' || typeof runner.verify !== 'function') {
    return freeze({ ...context, status: 'NOT_ATTEMPTED', reason: 'AUTHORITY_RETRY_AND_INDEPENDENT_VERIFICATION_ADAPTER_REQUIRED' });
  }
  // A caller-supplied authorization reference is not evidence that consent
  // or scope was issued. Resolve it through the server-owned authority record.
  let authorized;
  try {
    authorized = await runner.verifyAuthorization({ workItem, authorization });
  } catch (error) {
    return freeze({ ...context, status: 'AWAITING_AUTHORIZATION', reason: String(error?.message || error) });
  }
  if (authorized?.verified !== true ||
      authorized?.work_item_id !== workItem.id ||
      authorized?.authorization_ref !== authorization.authorization_ref ||
      !nonempty(authorized?.verification_ref)) {
    return freeze({ ...context, status: 'AWAITING_AUTHORIZATION', reason: 'ORIGINAL_WORK_AUTHORITY_NOT_INDEPENDENTLY_VERIFIED' });
  }
  let retryReceipt;
  try {
    retryReceipt = await runner.retry({
      workItem, registration,
      continuationToken: reactivation.continuation_token,
      authorization, authorizationProof: authorized,
    });
  } catch (error) {
    return freeze({ ...context, status: 'RETRY_FAILED', reason: String(error?.message || error) });
  }
  if (retryReceipt?.original_work_item_id !== workItem.id ||
      retryReceipt?.status !== 'EXECUTED' ||
      !nonempty(retryReceipt?.retry_receipt_id)) {
    return freeze({ ...context, status: 'EXECUTED_UNVERIFIED', reason: 'RETRY_EXECUTION_RECEIPT_INVALID', retry_receipt: retryReceipt ?? null });
  }
  let verification;
  try {
    verification = await runner.verify({ workItem, registration, retryReceipt });
  } catch (error) {
    return freeze({ ...context, status: 'EXECUTED_UNVERIFIED', reason: String(error?.message || error), retry_receipt: retryReceipt });
  }
  if (verification?.verified !== true || verification?.independent !== true ||
      verification?.original_work_item_id !== workItem.id ||
      verification?.retry_receipt_id !== retryReceipt.retry_receipt_id ||
      !nonempty(verification?.verification_ref)) {
    return freeze({ ...context, status: 'EXECUTED_UNVERIFIED', reason: 'ORIGINAL_WORK_OUTCOME_NOT_INDEPENDENTLY_VERIFIED', retry_receipt: retryReceipt, verification: verification ?? null });
  }
  return freeze({
    ...context, status: 'VERIFIED', retry_receipt: retryReceipt, verification,
    outcome: 'ORIGINAL_WORK_COMPLETED_AND_INDEPENDENTLY_VERIFIED',
  });
}
