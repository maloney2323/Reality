export const RECEIPT_CONTROLLER_VERSION = '0.1.0';

const RECEIPT_TYPES = Object.freeze([
  'ASK',
  'WORK',
  'HYPOTHESIS',
  'INVESTIGATION',
  'OBSERVATION',
  'RECONCILIATION',
  'AUTHORITY',
  'EXECUTION',
  'VERIFICATION',
  'OUTCOME',
]);

export function createReceipt({
  type,
  chainId,
  parentReceiptId = null,
  subject = null,
  claim = null,
  source = null,
  observation = null,
  inference = null,
  hypothesis = null,
  authority = null,
  stateBefore = null,
  stateAfter = null,
  reconciliation = null,
  decision = null,
  reason = null,
} = {}) {
  if (!RECEIPT_TYPES.includes(type)) throw new Error('RECEIPT_TYPE_NOT_ALLOWED');
  if (!chainId) throw new Error('CHAIN_ID_REQUIRED');

  return Object.freeze({
    receipt_version: RECEIPT_CONTROLLER_VERSION,
    receipt_id: `rcpt:${crypto.randomUUID()}`,
    receipt_type: type,
    chain_id: chainId,
    parent_receipt_id: parentReceiptId,
    subject,
    claim,
    source,
    observation,
    inference,
    hypothesis,
    authority,
    state_before: stateBefore,
    state_after: stateAfter,
    reconciliation,
    decision,
    reason,
    created_at: new Date().toISOString(),
    epistemic_status: type === 'HYPOTHESIS' ? 'HYPOTHESIS' : type === 'OBSERVATION' ? 'OBSERVED' : 'UNRESOLVED',
  });
}

export function assertReceiptCannotUpgradeStatus(receipt, requestedStatus) {
  if (!receipt || !requestedStatus) throw new Error('RECEIPT_AND_STATUS_REQUIRED');
  if (requestedStatus === 'TRUTH' && !['RECONCILIATION', 'VERIFICATION', 'OUTCOME'].includes(receipt.receipt_type)) {
    return { allowed: false, reason: 'EPISTEMIC_STATUS_UPGRADE_NOT_PERMITTED' };
  }
  return { allowed: true };
}

export const RECEIPT_TYPES_LIST = RECEIPT_TYPES;
