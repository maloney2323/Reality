export const PROMOTION_STATES=Object.freeze(['candidate','sandbox','verified_candidate','shadow','canary','limited','general','degraded','quarantined','deprecated','retired']);
import { createPublicKey, verify as verifySignature } from 'node:crypto';

export const PROMOTION_OWNER_APPROVAL_VERSION = 'reality-owner-promotion-approval-v0.1';

function nonEmpty(value) { return typeof value === 'string' && value.trim().length > 0; }

// This exact payload must be signed by an externally controlled owner key.
// Model-created approval text and untrusted caller-selected public keys do
// not satisfy the human-authorization boundary.
export function canonicalPromotionApprovalMessage(approval) {
  const body = {
    schema: PROMOTION_OWNER_APPROVAL_VERSION,
    decision: 'APPROVE_SHADOW_PROMOTION',
    owner_id: approval?.owner_id || null,
    candidate_id: approval?.candidate_id || null,
    capability_signature: approval?.capability_signature || null,
    promotion_ref: approval?.promotion_ref || null,
    evaluation_digest: approval?.evaluation_digest || null,
    verification_ref: approval?.verification_ref || null,
    constitution_hash: approval?.constitution_hash || null,
    release_target: 'SHADOW_ONLY',
    issued_at: approval?.issued_at || null,
    expires_at: approval?.expires_at || null,
    nonce: approval?.nonce || null,
  };
  return JSON.stringify(body);
}

export function authorizePromotion({evaluation,independentVerification,constitution,promotion}={}) {
  if(evaluation?.passed!==true) return {approved:false,reason:'EVALUATION_FAILED'};
  if(independentVerification?.verified!==true || independentVerification?.independent!==true ||
      !nonEmpty(independentVerification?.verification_ref)) {
    return {approved:false,reason:'INDEPENDENT_VERIFICATION_REQUIRED'};
  }
  if(!constitution?.immutable_rules?.requireRollback || !nonEmpty(constitution?.constitution_hash)) {
    return {approved:false,reason:'CONSTITUTION_ROLLBACK_RULE_MISSING'};
  }
  if(promotion?.approved!==true) return {approved:false,reason:'PROMOTION_AUTHORIZATION_REQUIRED'};
  if(!nonEmpty(promotion?.promotion_ref) || !nonEmpty(promotion?.candidate_id) ||
      !nonEmpty(promotion?.capability_signature) || !nonEmpty(evaluation?.evidence_digest) ||
      !nonEmpty(promotion?.rollbackVersion)) {
    return {approved:false,reason:'PROMOTION_EVIDENCE_BINDING_REQUIRED'};
  }

  const approval = promotion.human_approval;
  if(!approval || approval.schema!==PROMOTION_OWNER_APPROVAL_VERSION ||
      approval.decision!=='APPROVE_SHADOW_PROMOTION' ||
      approval.release_target!=='SHADOW_ONLY' ||
      !nonEmpty(approval.owner_id) || !nonEmpty(approval.nonce) ||
      approval.candidate_id!==promotion.candidate_id ||
      approval.capability_signature!==promotion.capability_signature ||
      approval.promotion_ref!==promotion.promotion_ref ||
      approval.evaluation_digest!==evaluation.evidence_digest ||
      approval.verification_ref!==independentVerification.verification_ref ||
      approval.constitution_hash!==constitution.constitution_hash) {
    return {approved:false,reason:'OWNER_APPROVAL_SCOPE_MISMATCH'};
  }

  const issued=Date.parse(approval.issued_at);
  const expires=Date.parse(approval.expires_at);
  const now=Date.now();
  const MAX_VALIDITY_MS=7*24*60*60*1000;
  if(!Number.isFinite(issued) || !Number.isFinite(expires) ||
      issued>now || expires<=now || expires<=issued || expires-issued>MAX_VALIDITY_MS) {
    return {approved:false,reason:'OWNER_APPROVAL_EXPIRED_OR_INVALID'};
  }

  // The pinned public key must be provisioned by the deployment operator,
  // never taken from the promotion request or the model's generated context.
  const trustedPublicKey = process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY;
  if(!nonEmpty(trustedPublicKey) || !nonEmpty(approval.signature)) {
    return {approved:false,reason:'TRUSTED_OWNER_SIGNATURE_REQUIRED'};
  }
  let authentic=false;
  try {
    const signature=Buffer.from(approval.signature,'base64');
    authentic=signature.length===64 && verifySignature(null,
      Buffer.from(canonicalPromotionApprovalMessage(approval)),
      createPublicKey(trustedPublicKey),
      signature);
  } catch {
    authentic=false;
  }
  if(!authentic) return {approved:false,reason:'OWNER_SIGNATURE_INVALID'};

  // Admission is only to a shadow release. A human-signed proposal does not
  // authorize production deployment, mutation, or the customer's original
  // task. Each needs its own external execution gate and readback.
  return {
    approved:true,state:'shadow',
    promotion_ref:promotion.promotion_ref,
    candidate_id:promotion.candidate_id,
    capability_signature:promotion.capability_signature,
    approval_owner_id:approval.owner_id,
    approval_nonce:approval.nonce,
    approval_expires_at:approval.expires_at,
    rollback_version:promotion.rollbackVersion,
    review_date:promotion.reviewDate||null,
    production_deploy_authorized:false,
    customer_task_execution_authorized:false,
    receipt_status:'SIGNED_OWNER_APPROVAL_VALIDATED_FOR_SHADOW_ONLY',
  };
}
// Separate per-stage owner approval. The earlier shadow-only signature is NOT
// authorization to enter canary, limited, or general availability.
export const PROMOTION_STAGE_APPROVAL_VERSION = 'reality-stage-advance-owner-approval-v0.1';

export function canonicalStageAdvanceApprovalMessage(approval) {
  return JSON.stringify({
    schema: PROMOTION_STAGE_APPROVAL_VERSION,
    decision: 'APPROVE_STAGE_TRANSITION',
    owner_id: approval?.owner_id || null,
    candidate_id: approval?.candidate_id || null,
    capability_signature: approval?.capability_signature || null,
    promotion_ref: approval?.promotion_ref || null,
    from_state: approval?.from_state || null,
    to_state: approval?.to_state || null,
    evidence_digest: approval?.evidence_digest || null,
    verification_ref: approval?.verification_ref || null,
    constitution_hash: approval?.constitution_hash || null,
    issued_at: approval?.issued_at || null,
    expires_at: approval?.expires_at || null,
    nonce: approval?.nonce || null,
  });
}

export function advancePromotion({currentState,evidence,thresholds={},authorization}={}) {
  const order=['shadow','canary','limited','general'];
  const i=order.indexOf(currentState);
  if(i<0) throw new Error('PROMOTION_STATE_INVALID');
  if(i===order.length-1) return {state:currentState,action:'HOLD',reason:'ALREADY_GENERAL'};
  const next=order[i+1];

  // A self-scored evaluation or unsupported readback cannot authorize a
  // stage promotion even if the model reports measurable improvement.
  if(evidence?.passed!==true || evidence?.independent!==true ||
      !nonEmpty(evidence?.verification_ref) || !nonEmpty(evidence?.evidence_digest)) {
    return {state:currentState,action:'HOLD',reason:'INDEPENDENT_STAGE_EVIDENCE_REQUIRED'};
  }
  const benefit=evidence.observedBenefit;
  const minimum=thresholds.minimumBenefit??0;
  if(typeof benefit!=='number'||!Number.isFinite(benefit) ||
      typeof minimum!=='number'||!Number.isFinite(minimum)||minimum<0) {
    return {state:currentState,action:'HOLD',reason:'INVALID_BENEFIT_METRIC'};
  }
  if(benefit<minimum) return {state:currentState,action:'HOLD',reason:'BENEFIT_THRESHOLD_NOT_MET'};

  const approval=authorization?.human_approval;
  if(!approval || approval.schema!==PROMOTION_STAGE_APPROVAL_VERSION ||
      approval.decision!=='APPROVE_STAGE_TRANSITION' ||
      !nonEmpty(authorization?.candidate_id) ||
      !nonEmpty(authorization?.capability_signature) ||
      !nonEmpty(authorization?.promotion_ref) ||
      !nonEmpty(authorization?.constitution_hash) ||
      !nonEmpty(approval.owner_id) || !nonEmpty(approval.nonce) ||
      approval.candidate_id!==authorization.candidate_id ||
      approval.capability_signature!==authorization.capability_signature ||
      approval.promotion_ref!==authorization.promotion_ref ||
      approval.constitution_hash!==authorization.constitution_hash ||
      approval.from_state!==currentState || approval.to_state!==next ||
      approval.evidence_digest!==evidence.evidence_digest ||
      approval.verification_ref!==evidence.verification_ref) {
    return {state:currentState,action:'HOLD',reason:'STAGE_OWNER_APPROVAL_REQUIRED'};
  }

  const issued=Date.parse(approval.issued_at);
  const expires=Date.parse(approval.expires_at);
  const now=Date.now();
  if(!Number.isFinite(issued)||!Number.isFinite(expires)||issued>now||
      expires<=now||expires<=issued||expires-issued>7*24*60*60*1000) {
    return {state:currentState,action:'HOLD',reason:'STAGE_OWNER_APPROVAL_EXPIRED'};
  }
  const publicKey=process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY;
  if(!nonEmpty(publicKey)||!nonEmpty(approval.signature)) {
    return {state:currentState,action:'HOLD',reason:'TRUSTED_STAGE_OWNER_KEY_REQUIRED'};
  }
  let valid=false;
  try {
    const signature=Buffer.from(approval.signature,'base64');
    valid=signature.length===64 && verifySignature(null,
      Buffer.from(canonicalStageAdvanceApprovalMessage(approval)),
      createPublicKey(publicKey),signature);
  } catch {
    valid=false;
  }
  if(!valid) return {state:currentState,action:'HOLD',reason:'STAGE_OWNER_SIGNATURE_INVALID'};

  // This pure planner never mutates production state. The actual transition
  // executor must independently read current state, atomically consume nonce,
  // revalidate the evidence, and witness the resulting change. Returning
  // target_state is not proof that the upgrade has been promoted.
  return {
    state:currentState,
    action:'AUTHORIZED_TRANSITION_PENDING_EXECUTION',
    target_state:next,
    candidate_id:authorization.candidate_id,
    capability_signature:authorization.capability_signature,
    promotion_ref:authorization.promotion_ref,
    owner_id:approval.owner_id,
    approval_nonce:approval.nonce,
    evidence_digest:evidence.evidence_digest,
    verification_ref:evidence.verification_ref,
    production_deploy_authorized:false,
    customer_task_execution_authorized:false,
    durable_nonce_consumption_required:true,
    independent_transition_readback_required:true,
  };
}
export function lifecycleAction({capability,observations={}}={}) {
  if(observations.safetyIncident===true) return {state:'quarantined',action:'ROLLBACK'};
  if(observations.degraded===true) return {state:'degraded',action:'REVALIDATE'};
  if(observations.superseded===true) return {state:'deprecated',action:'RETIRE_AFTER_MIGRATION'};
  return {state:capability?.status||'verified',action:'MONITOR'};
}
