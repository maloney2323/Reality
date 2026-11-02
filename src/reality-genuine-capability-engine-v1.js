// Reality Genuine Capability Engine v1.
// Only independently observed missing abilities of a *real, already-authorized*
// original job may initiate synthesis. No issue number, model approval, or
// customer-specific workflow is embedded in this engine.
//
// Existing governed driver owns model generation, independent sandbox,
// constitutional checkpoint, one-time owner promotion, registration, resumption,
// and final settlement. This adapter closes the missing provider-evidence bridge.
import {createHash} from 'node:crypto';
import {continueOriginalJobFromVerifiedCapabilityGap}
 from './reality-execution-self-repair-handoff-v1.0.js';

export const GENUINE_CAPABILITY_ENGINE_VERSION='reality-genuine-capability-engine-v1';
const WORK=/^work:[a-f0-9]{32}$/;
const CAP=/^[a-z][a-z0-9._-]{2,90}$/;
const HASH=/^[a-f0-9]{64}$/;
const fail=code=>{throw Error('GENUINE_CAPABILITY_'+code)};
const sorted=x=>x===null||typeof x!=='object'?x:
 Array.isArray(x)?x.map(sorted):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,sorted(x[k])]));
const sha=x=>createHash('sha256').update(JSON.stringify(sorted(x))).digest('hex');
const source=x=>typeof x==='string'&&(
 /^https:\/\/github\.com\/maloney2323\/Reality\/actions\/runs\/[1-9][0-9]*$/.test(x)||
 /^vercel:provider-verified:[A-Za-z0-9_.:/-]{8,340}$/.test(x)||
 // Typed receipts from a separately trusted connector adapter, not URLs or
 // free-text claims. This permits businesses beyond this GitHub repository.
 /^reality:provider-verified:[a-z][a-z0-9_-]{2,40}:[A-Za-z0-9_.:/-]{12,340}$/.test(x));
const noSideEffect=x=>x?.external_action_performed===false&&
 x?.provider_effect_may_have_occurred!==true&&x?.no_automatic_retry!==true;
const scoped=(x,work)=>x?.original_work_id===work&&
 x?.independently_verified===true&&
 x?.evidence_kind==='OBSERVED_FAILURE'&&
 x?.blocker_class==='MISSING_INSTRUMENT'&&
 CAP.test(x?.capability_id)&&source(x?.source_ref)&&
 typeof x?.verification_suite_ref==='string'&&
 x.verification_suite_ref.length>12&&noSideEffect(x);

function scopeCheck(scope,work){
 if(!WORK.test(work)||scope?.original_work_id!==work||
  !scope.owner_id||!scope.goal_id||!scope.continuity_root_id||
  !scope.worldline_id||!scope.goal_transition_receipt_ref||
  !scope.goal_evidence_ref||scope.target_environment!=='ISOLATED_PREVIEW'||
  !scope.governance_kernel_hash)fail('ORIGINAL_GOAL_SCOPE_REQUIRED');
}
function stableFailure(f){
 return {
  original_work_id:f.original_work_id,
  evidence_kind:f.evidence_kind,blocker_class:f.blocker_class,
  capability_id:f.capability_id,source_ref:f.source_ref,
  verification_suite_ref:f.verification_suite_ref,
  external_action_performed:false,provider_effect_may_have_occurred:false,
 };
}
function proofCheck(proof,observed){
 if(proof?.independently_verified!==true||
  proof?.reproduced_failure!==true||
  proof?.original_work_id!==observed.original_work_id||
  proof?.capability_id!==observed.capability_id||
  proof?.source_ref!==observed.source_ref||
  proof?.verification_suite_ref!==observed.verification_suite_ref||
  !HASH.test(proof.frozen_suite_sha256)||
  typeof proof.provider_run_ref!=='string'||
  !source(proof.provider_run_ref)||
  typeof proof.frozen_failure_ref!=='string'||
  proof.frozen_failure_ref.length<12||
  !noSideEffect(proof))
  fail('FROZEN_INDEPENDENT_REPRODUCTION_REQUIRED');
 return Object.freeze({
  version:GENUINE_CAPABILITY_ENGINE_VERSION,
  kind:'GENUINE_MISSING_CAPABILITY',
  original_work_id:observed.original_work_id,
  capability_id:observed.capability_id,
  original_failure_ref:observed.source_ref,
  frozen_failure_ref:proof.frozen_failure_ref,
  frozen_suite_sha256:proof.frozen_suite_sha256,
  verified_provider_run_ref:proof.provider_run_ref,
  verification_suite_ref:observed.verification_suite_ref,
  evidence_hash:sha({observed:stableFailure(observed),
   suite_hash:proof.frozen_suite_sha256,provider_ref:proof.provider_run_ref}),
  install_authorized:false,production_changed:false,
 });
}

// Every adapter here is a real provider boundary supplied by the caller.
// The model must never supply observeOriginalFailure, reproduceFrozenFailure,
// inspectRegisteredCapability, or authorize its own promotion.
export function createGenuineCapabilityEngine({
 observeOriginalFailure,reobserveOriginalFailure,reproduceFrozenFailure,
 inspectRegisteredCapability,arbitrateAndReceipt=null,
 adapters=null,createAdapters=null,
 runRepair=continueOriginalJobFromVerifiedCapabilityGap,
}={}){
 for(const [name,fn] of Object.entries({
  observeOriginalFailure,reobserveOriginalFailure,reproduceFrozenFailure,
  inspectRegisteredCapability,runRepair})){
  if(typeof fn!=='function')fail('TRUSTED_ADAPTER_MISSING_'+name.toUpperCase());
 }
 if(typeof createAdapters!=='function'&&createAdapters!==null)
  fail('TRUSTED_ADAPTER_FACTORY_INVALID');
 if(arbitrateAndReceipt!==null&&typeof arbitrateAndReceipt!=='function')
  fail('ARBITRAGE_RECEIPT_ADAPTER_INVALID');
 function checkDrivers(a){
  for(const name of ['observeMissingCapability','generateCandidate',
   'runIsolatedSandbox','persistCheckpoint','verifyIndependentReceipt']){
   if(typeof a?.[name]!=='function')
    fail('TRUSTED_DRIVER_ADAPTER_MISSING_'+name.toUpperCase());
  }
 }
 if(!createAdapters)checkDrivers(adapters);
 async function run({originalWorkId,scope,expectedFailure=null,currentState=null,maxTransitions=12}={}){
  scopeCheck(scope,originalWorkId);
  if(!Number.isInteger(maxTransitions)||maxTransitions<1||maxTransitions>50)
   fail('TRANSITION_BUDGET_INVALID');
  // This is NOT a generic retry after an uncertain external side effect.
  const observed=await observeOriginalFailure(Object.freeze({
   original_work_id:originalWorkId,scope,
  }));
  if(!scoped(observed,originalWorkId))
   return Object.freeze({status:'NOT_A_VERIFIED_CAPABILITY_GAP',
    original_work_id:originalWorkId,model_generated:false,installed:false,
    owner_action_required:false,original_job_completed:false});
  // Runtime independent verifier's nominated gap must match the trusted
  // provider's independently observed original failure.
  if(expectedFailure!==null&&
     (!scoped(expectedFailure,originalWorkId)||
      sha(stableFailure(expectedFailure))!==sha(stableFailure(observed))))
    fail('RUNTIME_FAILURE_AND_PROVIDER_EVIDENCE_DISAGREE');
  const reobserved=await reobserveOriginalFailure(Object.freeze(stableFailure(observed)));
  if(!scoped(reobserved,originalWorkId)||
   sha(stableFailure(observed))!==sha(stableFailure(reobserved)))
   fail('ORIGINAL_PROVIDER_FAILURE_CHANGED');
  const existing=await inspectRegisteredCapability(Object.freeze({
   original_work_id:originalWorkId,capability_id:observed.capability_id,
   owner_id:scope.owner_id,worldline_id:scope.worldline_id,
  }));
  if(existing?.independently_verified!==true||
   existing.original_work_id!==originalWorkId||
   existing.capability_id!==observed.capability_id)
   fail('INDEPENDENT_CAPABILITY_REGISTRY_READBACK_REQUIRED');
  if(existing.status==='ACTIVE')
   return Object.freeze({status:'CAPABILITY_ALREADY_PRESENT_REASSESS_JOB',
    original_work_id:originalWorkId,capability_id:observed.capability_id,
    model_generated:false,installed:false,
    original_job_completed:false});
  if(existing.status!=='ABSENT')fail('CAPABILITY_REGISTRY_STATUS_UNRESOLVED');
  const reproduced=await reproduceFrozenFailure(Object.freeze({
   original_work_id:originalWorkId,
   source_ref:observed.source_ref,
   verification_suite_ref:observed.verification_suite_ref,
   capability_id:observed.capability_id,
   original_goal_id:scope.goal_id,
   execution_authorized:false,
  }));
  const gap=proofCheck(reproduced,observed);
  // A verified missing capability is necessary, but NOT sufficient,
  // to call OpenAI. The controller must first prove reuse and authorized
  // protocol integration have been evaluated and write a bitemporal receipt.
  if(!arbitrateAndReceipt)fail('DURABLE_CAPABILITY_ARBITRAGE_REQUIRED');
  const arbitration=await arbitrateAndReceipt(Object.freeze({
   original_work_id:originalWorkId,owner_id:scope.owner_id,
   goal_id:scope.goal_id,capability_id:gap.capability_id,
   verified_frozen_failure_ref:gap.frozen_failure_ref,
   frozen_suite_sha256:gap.frozen_suite_sha256,
   known_capability_status:existing.status,
   installation_authorized:false,
  }));
  if(arbitration?.original_work_id!==originalWorkId||
     arbitration?.owner_id!==scope.owner_id||
     arbitration?.goal_id!==scope.goal_id||
     arbitration?.capability_id!==gap.capability_id||
     arbitration?.verified_frozen_failure_ref!==gap.frozen_failure_ref||
     arbitration?.persisted!==true||
     arbitration?.independently_verified!==true||
     arbitration?.signature_verified!==true||
     arbitration?.source!=='REALITY_BITEMPORAL_CONTINUITY'||
     arbitration?.reused_capabilities_checked!==true||
     arbitration?.authorized_integrations_checked!==true||
     !['REUSE','INTEGRATE','BUILD'].includes(arbitration?.selected_tier)||
     !HASH.test(arbitration?.receipt_hash)||
     !HASH.test(arbitration?.pre_state_hash)||
     !HASH.test(arbitration?.post_state_hash)||
     typeof arbitration?.valid_time!=='string'||
     !Number.isFinite(Date.parse(arbitration.valid_time))||
     typeof arbitration?.transaction_time!=='string'||
     !Number.isFinite(Date.parse(arbitration.transaction_time))||
     !arbitration?.receipt_ref||
     arbitration?.installation_authorized!==false)
    fail('SIGNED_BITEMPORAL_ARBITRAGE_RECEIPT_REQUIRED');
  if(arbitration.selected_tier==='BUILD'&&
     (arbitration?.reusable_candidate_count!==0||
      arbitration?.authorized_compatible_integration_count!==0||
      arbitration?.why_reuse_not_viable!=='NO_COMPATIBLE_REGISTERED_CAPABILITY'||
      arbitration?.why_integration_not_viable!=='NO_AUTHORIZED_COMPATIBLE_INTEGRATION'))
    fail('BUILD_ARBITRAGE_NEGATIVE_EVIDENCE_REQUIRED');
  if(arbitration.selected_tier==='REUSE'||
     arbitration.selected_tier==='INTEGRATE')
    return Object.freeze({
     status:arbitration.selected_tier==='REUSE'?
      'REGISTERED_CAPABILITY_REUSE_REQUIRES_ORIGINAL_REASSESSMENT':
      'AUTHORIZED_INTEGRATION_REQUIRES_ORIGINAL_REASSESSMENT',
     original_work_id:originalWorkId,
     capability_id:gap.capability_id,arbitrage_receipt_ref:arbitration.receipt_ref,
     model_generated:false,installation_authorized:false,
     original_job_completed:false,production_changed:false,
    });
  // The frozen provider failure is now a *capability* problem, not merely a
  // failed workflow. Existing constitutional driver performs model synthesis,
  // correction and tests with finite retries, saving/readbacking each state.
  const input=Object.freeze({...stableFailure(observed),
   independently_verified:true,
   frozen_failure_ref:gap.frozen_failure_ref,
   frozen_suite_sha256:gap.frozen_suite_sha256});
  const activeAdapters=createAdapters?
    await createAdapters(Object.freeze({scope,confirmed_gap:gap,
     original_work_id:originalWorkId,installed:false})):adapters;
  checkDrivers(activeAdapters);
  const continuation=await runRepair({
   originalWorkId,scope,originalJobFailure:input,currentState,
   providerReobserve:async request=>{
    if(request.original_work_id!==originalWorkId||
     request.source_ref!==gap.original_failure_ref||
     request.capability_id!==gap.capability_id||
     request.verification_suite_ref!==gap.verification_suite_ref)
     fail('REOBSERVATION_ORIGINAL_WORK_CHANGED');
    const fresh=await reobserveOriginalFailure(request);
    if(!scoped(fresh,originalWorkId)||
     sha(stableFailure(fresh))!==sha(stableFailure(observed)))
     fail('REOBSERVATION_DIFFERENT_FAILURE');
    return Object.freeze({...fresh,frozen_failure_ref:gap.frozen_failure_ref});
   },
   capabilityRegistry:[],adapters:activeAdapters,maxTransitions,
  });
  if(continuation?.original_work_id!==originalWorkId||
   continuation.original_goal_id!==scope.goal_id||
   continuation.new_job_created!==false)
   fail('DRIVER_ORIGINAL_JOB_IDENTITY_CHANGED');
  return Object.freeze({
   version:GENUINE_CAPABILITY_ENGINE_VERSION,
   status:continuation.status,original_work_id:originalWorkId,
   new_job_created:false,
   capability_id:gap.capability_id,confirmed_gap:gap,
   arbitrage_receipt_ref:arbitration.receipt_ref,
   capability_phase:continuation.capability_phase,
   owner_action_required:continuation.owner_action_required===true,
   model_cannot_authorize_install:true,
   installation_authorized:continuation.installation_authorized===true,
   original_job_completed:continuation.original_job_completed===true,
   production_changed:false,
   // Full driver state is returned to trusted persistence, not a public chat.
   state:continuation.state,
  });
 }
 return Object.freeze({run,version:GENUINE_CAPABILITY_ENGINE_VERSION});
}

// This is the exact callback expected by executeAuthorizedWork's
// onVerifiedCapabilityGap hook. It never rewrites the executor's failed
// result as success: the separately durable constitutional job owns settlement.
export function createGenuineCapabilityExecutionHandoff({
 engine,scope,persistAndReadback,
}={}){
 if(typeof engine?.run!=='function'||typeof persistAndReadback!=='function')
  fail('DURABLE_EXECUTION_HANDOFF_ADAPTERS_REQUIRED');
 scopeCheck(scope,scope.original_work_id);
 return async function onVerifiedCapabilityGap(request){
  if(request?.original_work_id!==scope.original_work_id||
   request?.authorization_continues_unchanged!==true||
   request?.production_write_permitted!==false||
   request?.customer_job_completed!==false||
   typeof request?.original_execution_receipt!=='string'||
   !scoped(request?.independent_failure,scope.original_work_id))
   fail('ORIGINAL_EXECUTION_FAILURE_BOUNDARY_INVALID');
  const result=await engine.run({
   originalWorkId:scope.original_work_id,scope,
   expectedFailure:request.independent_failure,
  });
  const receipt=await persistAndReadback(Object.freeze({
   original_work_id:scope.original_work_id,
   original_execution_receipt:request.original_execution_receipt,
   status:result.status,
   capability_phase:result.capability_phase||null,
   constitutional_state_hash:result.state?.head_hash||null,
   frozen_gap_hash:result.confirmed_gap?.evidence_hash||null,
   no_new_job:true,execution_not_yet_settled:true,
  }));
  if(receipt?.independently_verified!==true||
    receipt.original_work_id!==scope.original_work_id||
    receipt.original_execution_receipt!==request.original_execution_receipt||
    receipt.status!==result.status||
    receipt.execution_not_yet_settled!==true)
   fail('DURABLE_ORIGINAL_REPAIR_HANDOFF_READBACK_REQUIRED');
  return Object.freeze({
   status:result.status,
   original_work_id:scope.original_work_id,
   new_job_created:false,
   owner_action_required:result.owner_action_required===true,
   original_job_completed:false,
   installation_authorized_by_handoff:false,
   reconciliation_receipt_ref:receipt.receipt_ref||null,
  });
 };
}
