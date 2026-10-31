// Bridges a genuinely blocked EXISTING job to the ONE constitutional
// self-repair driver. This is NOT a second task or a new authority source.
// Only independently re-observed missing instruments may trigger generation.
// Transient network errors, stale evidence and missing user approval are not
// capability gaps and cannot grant self-modification rights.
import {createGovernedSelfImprovement,verifySelfImprovementJournal}
 from './reality-governed-self-improvement-spine-v1.0.js';
import {continueGovernedSelfImprovement}
 from './reality-governed-self-improvement-driver-v1.0.js';
import {triageOperationalBlocker}
 from './reality-upgrade-discovery-v0.1.js';

export const EXECUTION_REPAIR_HANDOFF_VERSION='reality-execution-self-repair-handoff-v1.0';
const WORK=/^work:[a-f0-9]{32}$/;
const CAP=/^[a-z][a-z0-9._-]{2,90}$/;
const fail=why=>{throw Error('EXECUTION_SELF_REPAIR_'+why)};
const allowedEvidence=x=>typeof x==='string'&&(
 /^https:\/\/github\.com\/maloney2323\/Reality\/(?:actions\/runs\/[1-9]\d*|issues\/[1-9]\d*)$/.test(x)||
 /^vercel:provider-verified:[A-Za-z0-9_.:/-]{8,340}$/.test(x));
const noEffect=x=>x?.external_action_performed===false&&
 x?.provider_effect_may_have_occurred!==true&&
 x?.no_automatic_retry!==true;

export async function continueOriginalJobFromVerifiedCapabilityGap({
 originalWorkId,
 scope,
 originalJobFailure,
 providerReobserve,
 currentState=null,
 capabilityRegistry=[],
 adapters,
 runDriver=continueGovernedSelfImprovement,
 maxTransitions=12,
}={}){
 if(!WORK.test(originalWorkId)||!scope||
   scope.original_work_id!==originalWorkId||
   scope.target_environment!=='ISOLATED_PREVIEW'||
   typeof scope.goal_transition_receipt_ref!=='string'||
   !scope.goal_transition_receipt_ref||
   !scope.owner_id||!scope.goal_id||
   !adapters||typeof providerReobserve!=='function')
  fail('SAME_ORIGINAL_AUTHENTICATED_GOAL_REQUIRED');
 if(originalJobFailure?.original_work_id!==originalWorkId||
   originalJobFailure?.independently_verified!==true||
   originalJobFailure?.evidence_kind!=='OBSERVED_FAILURE'||
   originalJobFailure?.blocker_class!=='MISSING_INSTRUMENT'||
   !CAP.test(originalJobFailure.capability_id)||
   !allowedEvidence(originalJobFailure.source_ref)||
   typeof originalJobFailure.verification_suite_ref!=='string'||
   !originalJobFailure.verification_suite_ref||
   !noEffect(originalJobFailure))
  fail('SAFE_INDEPENDENT_MISSING_INSTRUMENT_REQUIRED');
 // Reobserve using a trusted provider adapter, never just a remembered model
 // opinion or arbitrary client-supplied issue title.
 const observed=await providerReobserve(Object.freeze({
   original_work_id:originalWorkId,
   source_ref:originalJobFailure.source_ref,
   capability_id:originalJobFailure.capability_id,
   verification_suite_ref:originalJobFailure.verification_suite_ref,
 }));
 if(observed?.independently_verified!==true||
    observed?.evidence_kind!=='OBSERVED_FAILURE'||
    observed?.blocker_class!=='MISSING_INSTRUMENT'||
    observed?.original_work_id!==originalWorkId||
    observed?.source_ref!==originalJobFailure.source_ref||
    observed?.capability_id!==originalJobFailure.capability_id||
    observed?.verification_suite_ref!==originalJobFailure.verification_suite_ref||
    !noEffect(observed))
   fail('REOBSERVED_CAPABILITY_GAP_NOT_ESTABLISHED');

 const diagnosis=triageOperationalBlocker({
  originalWorkId,observation:observed,capabilityRegistry,
 });
 if(diagnosis.status!=='CAPABILITY_GAP_CANDIDATE'||
   diagnosis.needed_upgrade!==observed.capability_id)
  return Object.freeze({
   status:'DIAGNOSIS_ONLY_NO_NEW_CAPABILITY',
   original_work_id:originalWorkId,
   diagnostic_status:diagnosis.status,
   new_job_created:false,owner_approval_minted:false,
   installation_authorized:false,original_job_completed:false,
  });
 const state=currentState||createGovernedSelfImprovement({scope});
 verifySelfImprovementJournal(state);
 if(state.scope.owner_id!==scope.owner_id||
    state.scope.goal_id!==scope.goal_id||
    state.scope.original_work_id!==originalWorkId||
    state.scope.goal_transition_receipt_ref!==scope.goal_transition_receipt_ref||
    state.scope.continuity_root_id!==scope.continuity_root_id||
    state.scope.worldline_id!==scope.worldline_id)
  fail('ORIGINAL_JOURNAL_SCOPE_CHANGED');
 const trusted=adapters.observeMissingCapability;
 if(typeof trusted!=='function'||
    typeof adapters.persistCheckpoint!=='function'||
    typeof adapters.verifyIndependentReceipt!=='function')
  fail('TRUSTED_EXISTING_DRIVER_ADAPTERS_REQUIRED');
 const linked={...adapters,async observeMissingCapability(request){
   if(request.scope?.original_work_id!==originalWorkId)
    fail('PROVIDER_RECEIPT_DIFFERENT_WORK');
   const receipt=await trusted(Object.freeze({
    ...request,original_failure:observed,
    original_work_id:originalWorkId,
    frozen_verification_suite_ref:observed.verification_suite_ref,
   }));
   if(receipt?.kind!=='GAP_CONFIRMED'||
      receipt.original_work_id!==originalWorkId||
      receipt.capability_id!==observed.capability_id||
      !Array.isArray(receipt.failure_refs)||
      !receipt.failure_refs.includes(observed.source_ref)||
      receipt.verification_suite_ref!==observed.verification_suite_ref)
    fail('PROVIDER_CONFIRMED_DIFFERENT_GAP');
   return receipt;
 }};
 const done=await runDriver({state,adapters:linked,maxTransitions});
 if(!done?.state||done.state.scope?.original_work_id!==originalWorkId||
    done.state.scope?.owner_id!==scope.owner_id||
    done.state.scope?.goal_id!==scope.goal_id)
  fail('REPAIR_DRIVER_SWITCHED_ORIGINAL_JOB');
 verifySelfImprovementJournal(done.state);
 return Object.freeze({
  status:done.status,
  original_work_id:originalWorkId,
  source_failure_ref:observed.source_ref,
  diagnosed_missing_capability:observed.capability_id,
  capability_phase:done.state.phase,
  original_goal_id:scope.goal_id,
  original_journal_head_hash:done.state.head_hash,
  new_job_created:false,
  model_self_authorized:false,
  owner_action_required:done.owner_action_required===true,
  original_job_completed:done.status==='ORIGINAL_JOB_INDEPENDENTLY_SETTLED'&&
    done.original_job_completed===true,
  installation_authorized:done.state.phase==='PROMOTION_AUTHORIZED'||
    ['CAPABILITY_REGISTERED','ORIGINAL_JOB_RESUMED','SETTLED'].includes(done.state.phase),
  // Do NOT turn a generated candidate or sandbox pass into an installed
  // improvement. The durable constitutional driver remains the source.
  state:done.state,
 });
}
