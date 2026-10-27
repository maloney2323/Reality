import { createExecutionReceipt, canExecute, classifyWorkItemExecutionEffect } from './reality-governed-work-runtime-v0.1.js';
import { verifyBoundExecutionApproval } from './reality-authority-v1.0.js';
import { evaluateGoalExecutionBoundary } from './reality-goal-execution-boundary-v0.1.js';
import { verifyFreshGoalExecutionAdmission } from './reality-fresh-goal-execution-admission-v0.1.js';
import { fingerprintApprovedWorkItem } from './reality-authority-v1.0.js';
import { validUuid } from './reality-private-chat-store-v0.1.js';

export const GOVERNED_EXECUTION_ENGINE_VERSION = 'reality-governed-execution-engine-v0.1';

function text(v){return typeof v==='string'&&v.trim()?v.trim():'';}
function hashable(v){return JSON.stringify(v ?? null);}
function receiptId(workItem, authorization){return 'execution:'+Buffer.from(hashable([workItem?.work_item_id,authorization?.authorization_id])).toString('base64url').slice(0,32);}

export async function executeAuthorizedWork({
  workItem,
  workflowId,
  authorization,
  serverApprovalProof=null,
  serverFreshGoalAdmission=null,
  serverSingleUseReservation=null,
  reservationStore=null,
  connector,
  independentVerifier,
  requestSummary = null,
  requestFingerprint = null,
} = {}) {
  if (!workItem?.work_item_id) throw new Error('WORK_ITEM_REQUIRED');
  if (workItem.workflow_id !== workflowId) throw new Error('WORKFLOW_MISMATCH');
  // Fail closed even when another caller bypasses the HTTP handler.
  // Goal-state changes require a separate verified user-origin authority
  // transition; this generic work executor never mints one.
  const goalBoundary=evaluateGoalExecutionBoundary({workItem,authorization});
  if(goalBoundary.status==='BLOCKED'){
    return Object.freeze({
      engine_version:GOVERNED_EXECUTION_ENGINE_VERSION,
      status:'BLOCKED',blocked_reason:goalBoundary.reason,
      goal_authority_boundary:goalBoundary,
      execution:null,verification:null,outcome:null,
    });
  }
  const effect=classifyWorkItemExecutionEffect(workItem);
  // This second guard applies even when an internal caller bypasses the HTTP
  // endpoint. Untrusted model/client authorizations cannot mint server proof.
  if(workItem.connector&&effect.consequential){
    const verified=verifyBoundExecutionApproval({
      proof:serverApprovalProof,workItem,authorization,
    });
    if(!verified.valid)return Object.freeze({
      engine_version:GOVERNED_EXECUTION_ENGINE_VERSION,
      status:'BLOCKED',blocked_reason:verified.reason,
      goal_authority_boundary:goalBoundary,
      execution:null,verification:null,outcome:null,
    });
    // All connector effects are now gated at the exported ENGINE boundary,
    // not merely by HTTP middleware. The legacy generic-cookie execute route
    // cannot supply an authenticated source-linked user-goal admission.
    const grounding=verifyFreshGoalExecutionAdmission({
      admission:serverFreshGoalAdmission,workItem,authorization,
      serverApprovalProof,
    });
    if(grounding.status!=='FRESH_GOAL_ATTESTED')return Object.freeze({
      engine_version:GOVERNED_EXECUTION_ENGINE_VERSION,
      status:'BLOCKED',blocked_reason:grounding.reason,
      goal_authority_boundary:goalBoundary,
      goal_grounding_admission:grounding,
      execution:null,verification:null,outcome:null,
    });
  }
  if (!connector?.execute || !independentVerifier?.verify) throw new Error('EXECUTION_AND_VERIFICATION_BRIDGE_REQUIRED');

  const gate = canExecute({workItem, authorization});
  if (!gate.allowed) {
    return Object.freeze({
      engine_version:GOVERNED_EXECUTION_ENGINE_VERSION,
      status:'BLOCKED',
      blocked_reason:gate.reason,
      execution:null,
      verification:null,
      outcome:null,
    });
  }

  const execution = createExecutionReceipt({workItem, authorization, requestSummary, requestFingerprint});
  if (execution.execution_state !== 'AUTHORIZED') throw new Error('EXECUTION_RECEIPT_NOT_AUTHORIZED');

  // The database owns one-time admission. An HMAC alone is replayable.
  // The older generic /execute endpoint has no scoped DB reservation and
  // therefore cannot reach a consequential provider call.
  const requiresReservation=Boolean(workItem.connector&&effect.consequential);
  if(requiresReservation){
    const r=serverSingleUseReservation;
    const valid=Boolean(r?.status==='RESERVED_NOT_DISPATCHED'&&
      validUuid(r.reservation_id)&&
      r.principal_id===authorization?.principal&&
      r.principal_id===serverFreshGoalAdmission?.principal_id&&
      r.conversation_id===serverFreshGoalAdmission?.conversation_id&&
      r.policy_id===serverFreshGoalAdmission?.action_policy_id&&
      r.work_fingerprint===fingerprintApprovedWorkItem(workItem)&&
      typeof reservationStore?.begin==='function'&&
      typeof reservationStore?.settle==='function');
    if(!valid)return Object.freeze({
      engine_version:GOVERNED_EXECUTION_ENGINE_VERSION,
      status:'BLOCKED',blocked_reason:'EXECUTION_DURABLE_SINGLE_USE_RESERVATION_REQUIRED',
      execution:null,verification:null,outcome:null,
    });
    try{
      const consumed=await reservationStore.begin({reservationId:r.reservation_id});
      if(consumed?.status!=='DISPATCHING'||consumed.reservation_id!==r.reservation_id||
         consumed.single_use_claim_consumed!==true)
        throw Error('EXECUTION_RESERVATION_DISPATCH_READBACK_MISSING');
    }catch(error){
      return Object.freeze({
        engine_version:GOVERNED_EXECUTION_ENGINE_VERSION,
        status:'BLOCKED',blocked_reason:
          error?.message||'EXECUTION_RESERVATION_DISPATCH_UNAVAILABLE',
        execution:null,verification:null,outcome:null,
      });
    }
  }

  let providerResult,executed,verification;
  let providerFailureStage='PROVIDER_WRITE';
  try{
    providerResult=await connector.execute({workItem,authorization,execution});
    executed=Object.freeze({
      ...execution,execution_state:'EXECUTED',
      response_observation:providerResult?.observation??null,
      provider_execution_id:providerResult?.providerExecutionId??null,
      completed_at:new Date().toISOString(),
    });
    providerFailureStage='INDEPENDENT_PROVIDER_READBACK';
    verification=await independentVerifier.verify({
      workItem,authorization,execution:executed,providerResult,
    });
  }catch(error){
    // Do not expose raw GitHub responses, request headers, credentials,
    // user-scoped IDs or arbitrary exception strings. Preserve only a
    // bounded diagnostic category and which provider phase failed.
    const providerMessage=String(error?.message||'');
    const http=providerMessage.match(/^GITHUB_CONNECTOR_(401|403|404|409|422|429|500|502|503)$/);
    const failureCode=http?'GITHUB_HTTP_'+http[1]:
      providerMessage==='PERSONAL_GITHUB_PROVIDER_CREATE_RESPONSE_UNCERTAIN'?
       'GITHUB_CREATE_RESPONSE_INVALID':
      providerMessage==='PERSONAL_GITHUB_PROVIDER_ID_MISSING'?
       'GITHUB_READBACK_ID_MISSING':'PROVIDER_OR_NETWORK_ERROR';
    // Once DISPATCHING was committed, a network failure cannot be retried
    // blindly. The provider may have performed the effect despite a timeout.
    let settlement='UNCERTAIN_OUTCOME_NOT_DURABLY_SETTLED';
    if(requiresReservation){
      try{
        const receipt=await reservationStore.settle({
          reservationId:serverSingleUseReservation.reservation_id,
          outcome:'UNCERTAIN',
          verificationReceiptRef:'reality:execution:'+execution.execution_id,
        });
        settlement=receipt?.status==='UNCERTAIN'?'UNCERTAIN':settlement;
      }catch{ /* still consumed; never auto-retry */ }
    }
    return Object.freeze({
      engine_version:GOVERNED_EXECUTION_ENGINE_VERSION,
      status:'UNRESOLVED',blocked_reason:'PROVIDER_EFFECT_OR_READBACK_UNCERTAIN_NO_RETRY',
      reservation_state:settlement,
      provider_failure_stage:providerFailureStage,
      provider_failure_code:failureCode,
      // Provider POST claims are diagnostic only, NEVER independently verified.
      unverified_provider_claim:providerResult?.observation?.number?
       Object.freeze({issue_number:providerResult.observation.number}):null,
      execution:Object.freeze({...execution,execution_state:'OUTCOME_UNCERTAIN'}),
      verification:null,
      outcome:Object.freeze({outcome_state:'UNRESOLVED',verified:false,
        independent:false,provider_effect_may_have_occurred:true,
        no_automatic_retry:true}),
    });
  }

  // A successful self-report or same-adapter check is not independent verification.
  // Never elevate external execution to a verified outcome without an explicit
  // independent read-back assertion from the designated verifier.
  const verified = verification?.verified === true && verification?.independent === true;
  const outcome = Object.freeze({
    outcome_state:verified?'VERIFIED_OUTCOME':'UNRESOLVED',
    verified,
    verification_basis:verification?.basis ?? null,
    independent:verification?.independent === true,
    observed_state:verification?.observedState ?? null,
    mismatch:verification?.mismatch ?? null,
  });

  let reservationSettlement=null;
  if(requiresReservation){
    const settledOutcome=verified?'VERIFIED':'UNRESOLVED';
    try{
      reservationSettlement=await reservationStore.settle({
        reservationId:serverSingleUseReservation.reservation_id,
        outcome:settledOutcome,
        verificationReceiptRef:String(verification?.verification_id||
          'reality:execution:'+execution.execution_id).slice(0,240),
      });
      if(reservationSettlement?.status!==settledOutcome)
        throw Error('EXECUTION_RESERVATION_SETTLEMENT_READBACK_MISSING');
    }catch{
      // Cannot claim a durable verified result if the ledger settlement
      // failed after the provider was invoked. Reconcile, never auto-retry.
      return Object.freeze({
        engine_version:GOVERNED_EXECUTION_ENGINE_VERSION,
        status:'UNRESOLVED',
        blocked_reason:'EXECUTION_SETTLEMENT_UNCONFIRMED_NO_RETRY',
        execution:executed,verification,
        outcome:Object.freeze({...outcome,verified:false,
          outcome_state:'UNRESOLVED',
          no_automatic_retry:true}),
      });
    }
  }
  return Object.freeze({
    engine_version:GOVERNED_EXECUTION_ENGINE_VERSION,
    status:verified?'VERIFIED':'UNRESOLVED',
    execution:executed,
    verification,
    outcome,
    reservation_settlement:reservationSettlement,
  });
}
