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
  originalWorkId = null,
  onVerifiedCapabilityGap = null,
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
    const safeDenial=error?.safeGitHubDenial;
    const githubFailureDetail=providerMessage==='GITHUB_CONNECTOR_403'&&
      typeof safeDenial==='string'&&
      /^(SSO_AUTHORIZATION_REQUIRED|SECONDARY_RATE_LIMIT|PRIMARY_RATE_LIMIT|TOKEN_REPOSITORY_OR_ISSUES_SCOPE_DENIED|NETWORK_ACCESS_POLICY|REPOSITORY_WRITE_UNAVAILABLE|GITHUB_WRITE_POLICY_RESTRICTED|FORBIDDEN_REASON_NOT_DISCLOSED)$/.test(safeDenial)?
       safeDenial:null;
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
      provider_failure_detail:githubFailureDetail,
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
  // A trusted internally executing job may encounter a genuine missing
  // instrument. Do not wait for a customer to browse an upgrades dashboard.
  // Only the independent verifier can nominate a source-backed gap. Never
  // launch repair after a connector write, provider uncertainty or a missing
  // authorization: the outside world may already have changed.
  let selfRepair=null;
  const eligible=verified===false&&
    !requiresReservation&&workItem.connector==null&&
    typeof originalWorkId==='string'&&
    /^work:[a-f0-9]{32}$/.test(originalWorkId)&&
    workItem.work_item_id===originalWorkId&&
    verification?.independent===true&&
    verification?.verified===false&&
    verification?.independently_verified===true&&
    verification?.evidence_kind==='OBSERVED_FAILURE'&&
    verification?.blocker_class==='MISSING_INSTRUMENT'&&
    verification?.original_work_id===originalWorkId&&
    verification?.external_action_performed===false&&
    verification?.provider_effect_may_have_occurred!==true&&
    verification?.no_automatic_retry!==true&&
    typeof onVerifiedCapabilityGap==='function';
  if(eligible){
    try{
      const response=await onVerifiedCapabilityGap(Object.freeze({
        original_work_id:originalWorkId,
        original_execution_receipt:executed.execution_id,
        independent_failure:verification,
        authorization_continues_unchanged:true,
        production_write_permitted:false,
        customer_job_completed:false,
      }));
      if(response?.original_work_id!==originalWorkId||
         response?.new_job_created!==false||
         response?.original_job_completed===true)
        throw Error('REPAIR_NOT_YET_CUSTOMER_SETTLED');
      selfRepair=Object.freeze({
        status:response.status||'REPAIR_HANDOFF_RECORDED',
        original_work_id:originalWorkId,
        new_job_created:false,
        owner_action_required:response.owner_action_required===true,
        original_job_completed:false,
      });
    }catch{
      // Preserve the real failed job. A repair handoff failure is neither
      // completion nor authority to repeat an uncertain action.
      selfRepair=Object.freeze({
        status:'REPAIR_HANDOFF_NEEDS_RECONCILIATION',
        original_work_id:originalWorkId,
        new_job_created:false,original_job_completed:false,
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
    ...(selfRepair?{self_repair:selfRepair}:{}),
  });
}
