import { canonicalJson, sha256Hex } from '../action-gate/canonical.js';

export const EXECUTION_RECEIPT_VERSION='reality-execution-receipt-v0.1';
export const VERIFICATION_RECEIPT_VERSION='reality-verification-receipt-v0.1';

const req=(v,n)=>{if(typeof v!=='string'||!v.trim())throw new Error(n+' is required');return v.trim();};

export async function persistExecutionReceipt({ service, receipt }) {
  if (!service?.entities?.RealityIndependentExecutionReceiptV01) throw new Error('EXECUTION_RECEIPT_ENTITY_UNAVAILABLE');
  const existing = await service.entities.RealityIndependentExecutionReceiptV01.filter({ receipt_id:receipt.receipt_id }, 'created_date', 2, 0);
  if (Array.isArray(existing) && existing.length > 0) throw new Error('EXECUTION_RECEIPT_DUPLICATE');
  return service.entities.RealityIndependentExecutionReceiptV01.create(receipt);
}

export async function persistIndependentVerificationReceipt({ service, receipt }) {
  if (!service?.entities?.RealityIndependentVerificationReceiptV01) throw new Error('VERIFICATION_RECEIPT_ENTITY_UNAVAILABLE');
  const existing = await service.entities.RealityIndependentVerificationReceiptV01.filter({ receipt_id:receipt.receipt_id }, 'created_date', 2, 0);
  if (Array.isArray(existing) && existing.length > 0) throw new Error('VERIFICATION_RECEIPT_DUPLICATE');
  return service.entities.RealityIndependentVerificationReceiptV01.create(receipt);
}

export async function createExecutionReceipt({warrant_id,action_digest,resource_id,executor_id,execution_state,execution_result,executed_at}) {
  const payload={
    schema:EXECUTION_RECEIPT_VERSION,
    warrant_id:req(warrant_id,'warrant_id'),
    action_digest:req(action_digest,'action_digest'),
    resource_id:req(resource_id,'resource_id'),
    executor_id:req(executor_id,'executor_id'),
    execution_state:req(execution_state,'execution_state'),
    execution_result:execution_result??null,
    executed_at:req(executed_at,'executed_at'),
  };
  return Object.freeze({
    ...payload,
    receipt_id:'execution:'+crypto.randomUUID(),
    integrity_digest:await sha256Hex(canonicalJson(payload)),
    authority_effect:false,
    verification_effect:false,
  });
}

export async function createIndependentVerificationReceipt({execution_receipt_ref,action_digest,resource_id,verification_method,observed_state,expected_state,verification_result,verified_at,verifier_id}) {
  const payload={
    schema:VERIFICATION_RECEIPT_VERSION,
    execution_receipt_ref:req(execution_receipt_ref,'execution_receipt_ref'),
    action_digest:req(action_digest,'action_digest'),
    resource_id:req(resource_id,'resource_id'),
    verification_method:req(verification_method,'verification_method'),
    observed_state:observed_state??null,
    expected_state:expected_state??null,
    verification_result:req(verification_result,'verification_result'),
    verified_at:req(verified_at,'verified_at'),
    verifier_id:req(verifier_id,'verifier_id'),
  };
  return Object.freeze({
    ...payload,
    receipt_id:'verification:'+crypto.randomUUID(),
    integrity_digest:await sha256Hex(canonicalJson(payload)),
    authority_effect:false,
    execution_effect:false,
    independent_of_execution_claim:true,
  });
}

export function verifyExecutionReceiptBinding({ execution_receipt, action_digest, resource_id }) {
  if (!execution_receipt) return { valid:false, reason_code:'EXECUTION_RECEIPT_MISSING' };
  if (execution_receipt.action_digest !== action_digest) return { valid:false, reason_code:'EXECUTION_ACTION_DIGEST_MISMATCH' };
  if (execution_receipt.resource_id !== resource_id) return { valid:false, reason_code:'EXECUTION_RESOURCE_MISMATCH' };
  return { valid:true, reason_code:'EXECUTION_RECEIPT_BOUND' };
}

export function closeWorkEvidenceState({authorization_state,execution_receipt,verification_receipt}) {
  if(authorization_state!=='AUTHORIZED') return 'NOT_AUTHORIZED';
  if(!execution_receipt || execution_receipt.execution_state!=='EXECUTED') return 'AUTHORIZED_NOT_EXECUTED';
  if(!verification_receipt) return 'EXECUTED_NOT_VERIFIED';
  if(verification_receipt.verification_result==='VERIFIED') return 'VERIFIED';
  if(verification_receipt.verification_result==='CONTRADICTED') return 'EXECUTED_CONTRADICTED_BY_VERIFICATION';
  return 'EXECUTED_INCONCLUSIVE';
}