// One owner approval -> one existing constitutional driver -> exact
// installation -> actual original-job resumption -> independent settlement.
// This module grants NOTHING. Every receipt is provider-reobserved and
// persisted into the same hash-linked original owner Continuity journal.
import {verifySelfImprovementJournal,acceptGovernedObservation}
 from './reality-governed-self-improvement-spine-v1.0.js';
import {continueGovernedSelfImprovement}
 from './reality-governed-self-improvement-driver-v1.0.js';

const fail=code=>{throw Error('FIRST178_COMPLETE_'+code)};
const sha64=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const exactOriginal=x=>typeof x==='string'&&/^work:[a-f0-9]{32}$/.test(x);
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(x);
const checked=(x,code)=>{if(!x)fail(code);return x};
export function describeOriginal178OwnerApproval({state,queue,session}={}){
 verifySelfImprovementJournal(state);
 if(state.phase!=='AWAITING_OWNER_APPROVAL'||
    !state.sandbox_receipt?.independent_tests_passed||
    !state.sandbox_receipt?.frozen_regression_passed||
    !state.sandbox_receipt?.governance_preserved||
    state.sandbox_receipt?.artifact_hash!==state.candidate?.artifact_hash||
    !sha64(state.candidate?.artifact_hash)||
    !exactOriginal(state.scope.original_work_id)||
    state.scope.owner_id!==session?.user_id||
    queue?.phase!=='AWAITING_OWNER_APPROVAL'||
    queue.original_work_id!==state.scope.original_work_id||
    queue.goal_id!==state.scope.goal_id||
    !uuid(queue.queue_id)||
    queue.report?.checkpoint_hash!==state.head_hash||
    !uuid(queue.report?.checkpoint_receipt_id)||
    queue.report?.installation_authorized!==false)
  fail('INDEPENDENTLY_VERIFIED_EXACT_OWNER_JOB_REQUIRED');
 return Object.freeze({
  status:'AWAITING_EXACT_OWNER_APPROVAL',
  original_work_id:state.scope.original_work_id,
  queue_id:queue.queue_id,goal_id:state.scope.goal_id,
  candidate_artifact_hash:state.candidate.artifact_hash,
  checkpoint_hash:state.head_hash,
  checkpoint_receipt_id:queue.report.checkpoint_receipt_id,
  frozen_verifier_run_ref:state.sandbox_receipt.verifier_run_ref,
  target:'ISOLATED_PREVIEW_ONLY',
  approval_required:true,installation_authorized:false,
  capability_installed:false,original_job_completed:false,
 });
}
// All adapters are trusted server implementations, NOT browser/model inputs.
// Before reserving the exact human approval, validate that every remaining
// provider function is present. A missing service cannot consume approval.
export async function finishOriginal178AfterExactApproval({
 state,queue,session,ownerAction,adapters,
}={}){
 const ready=describeOriginal178OwnerApproval({state,queue,session});
 const action=ownerAction||{};
 if(action.intent!=='APPROVE_EXACT_VERIFIED_178_UPGRADE_AND_FINISH'||
    action.owner_confirms_installation!==true||
    action.original_work_id!==ready.original_work_id||
    action.candidate_artifact_hash!==ready.candidate_artifact_hash||
    action.checkpoint_hash!==ready.checkpoint_hash||
    action.checkpoint_receipt_id!==ready.checkpoint_receipt_id)
  fail('EXACT_HUMAN_INSTALLATION_CONSENT_REQUIRED');
 for(const name of [
  'reserveExactOwnerApproval','verifyIndependentReceipt',
  'persistCheckpoint','registerAndReobserve','resumeOriginalWork',
  'settleAndReobserve',
 ]){
  if(typeof adapters?.[name]!=='function')
   fail('TRUSTED_'+name.toUpperCase()+'_NOT_CONNECTED');
 }
 // Return from this function is NOT itself evidence of installation.
 // In particular, the reservation must be externally checked against
 // the same owner, work, candidate hash and checkpoint.
 const receipt=await adapters.reserveExactOwnerApproval(Object.freeze({
  owner_id:session.user_id,goal_id:ready.goal_id,
  original_work_id:ready.original_work_id,queue_id:ready.queue_id,
  artifact_hash:ready.candidate_artifact_hash,
  checkpoint_hash:ready.checkpoint_hash,
  checkpoint_receipt_id:ready.checkpoint_receipt_id,
  environment:'ISOLATED_PREVIEW',
  authority:'OWNER_APPROVED_EXACT_INSTALLATION_ONLY',
 }));
 checked(receipt?.kind==='PROMOTION_AUTHORIZED'&&
  receipt.owner_id===session.user_id&&
  receipt.original_work_id===ready.original_work_id&&
  receipt.artifact_hash===ready.candidate_artifact_hash&&
  receipt.approval_origin==='AUTHENTICATED_OWNER_EXPLICIT_ACTION'&&
  receipt.consumed_once===true&&
  typeof receipt.reservation_ref==='string'&&
  receipt.installation_target==='ISOLATED_PREVIEW',
  'ATOMIC_OWNER_RESERVATION_READBACK_INVALID');
 const authorized=await acceptGovernedObservation(state,receipt,{
  verifyProvider:adapters.verifyIndependentReceipt,
 });
 const recorded=await adapters.persistCheckpoint(authorized);
 if(recorded?.persisted!==true||
    recorded?.independent_readback_verified!==true||
    recorded?.checkpoint_hash!==authorized.head_hash||
    recorded.original_work_id!==ready.original_work_id)
  fail('AUTHORITATIVE_APPROVAL_CONTINUITY_CHECKPOINT_MISSING');
 // This is the SAME existing driver. Its three provider adapters MUST
 // reobserve actual installed code, the original execution, and settlement.
 const result=await continueGovernedSelfImprovement({
  state:authorized,maxTransitions:8,
  adapters:{
   verifyIndependentReceipt:adapters.verifyIndependentReceipt,
   persistCheckpoint:adapters.persistCheckpoint,
   registerAndReobserve:adapters.registerAndReobserve,
   resumeOriginalWork:adapters.resumeOriginalWork,
   settleAndReobserve:adapters.settleAndReobserve,
  },
 });
 if(result.status!=='ORIGINAL_JOB_INDEPENDENTLY_SETTLED'||
    result.state.phase!=='SETTLED'||
    result.state.scope.original_work_id!==ready.original_work_id||
    result.state.candidate.artifact_hash!==ready.candidate_artifact_hash||
    result.state.registration?.status!=='ACTIVE'||
    result.state.resumption?.real_execution_observed!==true||
    result.state.settlement?.independent_outcome_verified!==true||
    result.state.settlement?.durable_settlement_readback!==true||
    result.original_job_completed!==true)
  fail('UNSETTLED_PROVIDER_OUTCOME_MUST_RECONCILE');
 return Object.freeze({
  status:'ORIGINAL_JOB_INDEPENDENTLY_SETTLED',
  original_work_id:ready.original_work_id,
  goal_id:ready.goal_id,queue_id:ready.queue_id,
  installed_candidate_sha256:ready.candidate_artifact_hash,
  registry_receipt_ref:result.state.registration.registry_receipt_ref,
  executor_run_ref:result.state.resumption.executor_run_ref,
  settlement_receipt_ref:result.state.settlement.settlement_receipt_ref,
  continuity_head_hash:result.state.head_hash,
  installed_in:'ISOLATED_PREVIEW',
  original_job_completed:true,
  independently_verified:true,production_changed:false,
 });
}
