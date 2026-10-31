// ACTUAL connector between the existing constitutional driver and the
// generic provider-backed installer, registry, original-work executor,
// and immutable settlement. The owner approval originates in authenticated
// UI/Continuity, never in a model or cron. Every stage reobserves providers.
import {verifySelfImprovementJournal}
 from './reality-governed-self-improvement-spine-v1.0.js';
import {continueGovernedSelfImprovement}
 from './reality-governed-self-improvement-driver-v1.0.js';
import {installVerifiedGenericPreviewExtension}
 from './reality-general-isolated-install-v1.0.js';
import {createGeneralPreviewCapabilityRegistry}
 from './reality-general-preview-capability-registry-v1.0.js';
import {createGenericVerifiedOriginalWorkSettlement}
 from './reality-general-original-work-settlement-v1.0.js';
import {createGeneralConstitutionalCheckpointService}
 from './reality-general-constitutional-checkpoint-v1.0.js';
const fail=x=>{throw Error('GENERAL_REPAIR_CONTINUATION_'+x)};
export async function continueExactlyApprovedGeneralRepair({
 state,ticket,session,db,branch,writeToken,
 conversationId,originalWorkEvidenceRef,promotionCheckpointReceiptId,
 env=process.env,
 verifyOwnerApproval,verifyFrozenAcceptance,observePreviouslyInstalled,
 executeOriginalWork,verifyOriginalExecution,
 verifyIndependentReceipt,persistCheckpoint,
 fetchImpl=fetch,maxTransitions=6,
}={}){
 verifySelfImprovementJournal(state);
 const scope=state.scope;
 if(state.phase!=='PROMOTION_AUTHORIZED'||
  scope?.target_environment!=='ISOLATED_PREVIEW'||
  scope.owner_id!==session?.user_id||
  ticket?.environment!=='ISOLATED_PREVIEW'||
  ticket?.original_work_id!==scope.original_work_id||
  ticket?.goal_id!==scope.goal_id||
  ticket?.owner_id!==scope.owner_id||
  ticket?.repository_branch!==branch||
  state.candidate?.artifact_hash!==state.sandbox_receipt?.artifact_hash||
  state.promotion_authorization?.artifact_hash!==state.candidate?.artifact_hash||
  state.promotion_authorization?.consumed_once!==true||
  !db?.strictSecrets)
  fail('SAME_ORIGINAL_OWNER_GOAL_APPROVED_SCOPE_REQUIRED');
 for(const [name,fn] of Object.entries({
  verifyOwnerApproval,verifyFrozenAcceptance,executeOriginalWork,
  verifyOriginalExecution,verifyIndependentReceipt,
 })){
  if(typeof fn!=='function')fail('TRUSTED_PROVIDER_MISSING_'+name.toUpperCase());
 }
 const checkpointWriter=typeof persistCheckpoint==='function'?persistCheckpoint:
  createGeneralConstitutionalCheckpointService({
   session,conversationId,originalWorkId:scope.original_work_id,
   originalWorkEvidenceRef,db,env,
  }).persistCheckpoint;
 const same=ctx=>{
  if(ctx?.scope?.owner_id!==scope.owner_id||
   ctx.scope.goal_id!==scope.goal_id||
   ctx.scope.original_work_id!==scope.original_work_id||
   ctx.scope.worldline_id!==scope.worldline_id||
   ctx.scope.continuity_root_id!==scope.continuity_root_id||
   ctx.candidate_artifact_hash!==state.candidate.artifact_hash)
   fail('CONSTITUTIONAL_ORIGINAL_WORK_SCOPE_CHANGED');
 };
 const scopedReceipt=(kind,receipt,extra={})=>Object.freeze({
  ...receipt,...extra,kind,
  owner_id:scope.owner_id,goal_id:scope.goal_id,
  original_work_id:scope.original_work_id,
  continuity_root_id:scope.continuity_root_id,
  worldline_id:scope.worldline_id,
  target_environment:'ISOLATED_PREVIEW',
  production_changed:false,
 });
 const registry=createGeneralPreviewCapabilityRegistry({
  db,scope,artifactHash:state.candidate.artifact_hash,fetchImpl,
 });
 const settlement=createGenericVerifiedOriginalWorkSettlement({
  session,scope,db,verifyOriginalExecution,
 });
 const adapters={
  persistCheckpoint:checkpointWriter,
  verifyIndependentReceipt,
  async registerAndReobserve(ctx){
   same(ctx);
   const approval=ctx.promotion_authorization;
   const sandbox=ctx.sandbox_receipt;
   if(approval?.evidence_ref!==state.promotion_authorization.evidence_ref||
    approval?.reservation_ref!==state.promotion_authorization.reservation_ref||
    !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(
     String(promotionCheckpointReceiptId||''))||
    !state.journal.some(item=>item.kind==='SANDBOX_VERIFIED'&&
      item.body?.verified_by==='TRUSTED_PROVIDER_ADAPTER'&&
      item.body?.trusted_attestation_ref&&
      item.body?.artifact_hash===state.candidate.artifact_hash))
    fail('ORIGINAL_APPROVAL_AND_ATTESTED_SANDBOX_REQUIRED');
   // Source installation and independent CI happen in separate provider
   // transactions. Once installed, NEVER re-run a GitHub write on a retry.
   const installed=typeof observePreviouslyInstalled==='function'?
    await observePreviouslyInstalled(Object.freeze({
     original_work_id:scope.original_work_id,artifact_hash:ctx.candidate.artifact_hash,
     candidate:ctx.candidate,branch,
     repository_base_sha:ticket.repository_base_sha,
     reservation_ref:approval.reservation_ref,
    })):
    await installVerifiedGenericPreviewExtension({
     ticket,candidate:ctx.candidate,
     sandbox:{...sandbox,independently_verified:true},
     approval,verifyOwnerApproval,branch,writeToken,fetchImpl,
    });
   if(installed?.kind!=='ISOLATED_GITHUB_SOURCE_INSTALLED'||
      installed.provider_bytes_readback_verified!==true||
      installed.artifact_hash!==ctx.candidate.artifact_hash||
      installed.original_work_id!==scope.original_work_id)
    fail('INSTALLED_SOURCE_PROVIDER_READBACK_REQUIRED');
   // Must be a NEW provider readback at the installed commit, proving the
   // frozen ORIGINAL acceptance and unchanged governance tests actually ran.
   const acceptance=await verifyFrozenAcceptance(Object.freeze({
    installed_commit_sha:installed.installed_commit_sha,
    original_work_id:scope.original_work_id,
    candidate_artifact_hash:installed.artifact_hash,
    frozen_regression_sha256:ticket.frozen_regression_sha256,
    original_failure_evidence_hash:ticket.confirmed_gap_evidence_hash,
    installed_branch:branch,
   }));
   if(acceptance?.complete!==true||
      acceptance?.independent_provider_readback!==true||
      acceptance?.installed_commit_sha!==installed.installed_commit_sha)
    fail('INDEPENDENT_INSTALLED_ACCEPTANCE_PENDING');
   const result=await registry.recordAndReadback({
    installed,acceptance,
    approval:{...approval,checkpoint_receipt_id:promotionCheckpointReceiptId},
   });
   return scopedReceipt('CAPABILITY_REGISTERED',result,{
    authorization_ref:approval.evidence_ref,
    target_worldline_id:scope.worldline_id,
    registry_receipt_ref:result.registry_receipt_ref,
    evidence_ref:result.registry_receipt_ref,
    evidence_hash:result.evidence_hash,
   });
  },
  async resumeOriginalWork(ctx){
   same(ctx);
   const registered=ctx.registration;
   if(registered?.kind!=='CAPABILITY_REGISTERED'||
    registered.verified!==true||
    registered.original_work_id!==scope.original_work_id||
    registered.artifact_hash!==state.candidate.artifact_hash||
    !registered.registry_receipt_ref)
    fail('SOURCE_REGISTERED_AND_READBACK_REQUIRED');
   const execution=await executeOriginalWork(Object.freeze({
    owner_id:scope.owner_id,goal_id:scope.goal_id,
    original_work_id:scope.original_work_id,
    registered_capability_ref:registered.registry_receipt_ref,
    installed_commit_sha:registered.installed_commit_sha,
    approved_artifact_hash:registered.artifact_hash,
    original_failure_evidence_hash:ticket.confirmed_gap_evidence_hash,
   }));
   if(execution?.original_work_id!==scope.original_work_id||
    execution?.owner_id!==scope.owner_id||
    execution?.installed_commit_sha!==registered.installed_commit_sha||
    execution?.real_execution_observed!==true||
    execution?.independent_provider_readback!==true||
    execution?.observed_outcome!=='SUCCEEDED'||
    !execution?.executor_run_ref||
    !/^[0-9a-f]{64}$/.test(String(execution?.evidence_hash||'')))
    fail('ACTUAL_PROVIDER_EXECUTION_REQUIRED');
   const independent=await verifyOriginalExecution(Object.freeze({
    owner_id:scope.owner_id,original_work_id:scope.original_work_id,
    goal_id:scope.goal_id,
    installed_commit_sha:registered.installed_commit_sha,
    registry_receipt_ref:registered.registry_receipt_ref,
    executor_run_ref:execution.executor_run_ref,
    expected_execution_evidence_hash:execution.evidence_hash,
   }));
   if(independent?.verified!==true||
    independent?.independent_provider_readback!==true||
    independent?.original_work_id!==scope.original_work_id||
    independent?.executor_run_ref!==execution.executor_run_ref||
    independent?.evidence_hash!==execution.evidence_hash||
    independent?.observed_outcome!=='SUCCEEDED')
    fail('ORIGINAL_WORK_INDEPENDENT_PROVIDER_REOBSERVATION_REQUIRED');
   return scopedReceipt('ORIGINAL_JOB_RESUMED',execution,{
    registration_ref:registered.registry_receipt_ref,
    evidence_ref:execution.executor_run_ref,
    evidence_hash:execution.evidence_hash,
   });
  },
  async settleAndReobserve(ctx){
   same(ctx);
   if(ctx.registration?.kind!=='CAPABILITY_REGISTERED'||
    ctx.resumption?.kind!=='ORIGINAL_JOB_RESUMED')
    fail('REGISTERED_CAPABILITY_AND_RESUMPTION_REQUIRED');
   const checked=await settlement.recordAndReadback({
    registration:ctx.registration,execution:ctx.resumption,
   });
   return scopedReceipt('ORIGINAL_JOB_SETTLED',checked,{
    resumption_ref:ctx.resumption.executor_run_ref,
    settlement_receipt_ref:checked.settlement_receipt_ref,
    evidence_ref:checked.settlement_receipt_ref,
    evidence_hash:checked.evidence_hash,
   });
  },
 };
 // The SAME append-only constitutional journal controls each transition;
 // this function cannot skip to SETTLED or infer owner consent.
 return continueGovernedSelfImprovement({
  state,adapters,maxTransitions,
 });
}
