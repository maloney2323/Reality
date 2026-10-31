// Reality Upgrade Discovery v0.1 — explanation, not authority.
// This deterministic projection consumes ONLY server-reobserved evidence
// and the existing Recovery v1 state. Never accept untrusted browser or LLM
// text as an independent failure, a verified gap, or approval to mutate code.
import {verifySelfImprovementJournal}
 from './reality-governed-self-improvement-spine-v1.0.js';
import {strategyFromConstitutionalJournal}
 from './reality-self-repair-strategy-v1.0.js';
import {continueGovernedSelfImprovement}
 from './reality-governed-self-improvement-driver-v1.0.js';

// Feed provider-attested operational failures into the EXISTING discovered
// upgrades category, with exact original work ID. This projection never
// creates an independent job, raises the retry cap, or issues an installation.
export function projectVerifiedSelfRepairOpportunity({state}={}){
 const strategy=strategyFromConstitutionalJournal(state);
 const work=strategy.discovered_work;
 return Object.freeze({
  source:'REALITY_CONSTITUTIONAL_PROVIDER_JOURNAL',
  discovery_status:strategy.evidence_refs.length?
   'SOURCE_VERIFIED_REPAIR_DISCOVERY':'INDEPENDENT_FAILURE_REQUIRED',
  discovered_work:work,
  repair_strategy:strategy.strategy,
  recurring_failure_count:strategy.recurring_failures.length,
  root_cause_hypotheses:strategy.root_cause_hypotheses,
  evidence_refs:strategy.evidence_refs,
  original_work_id:state.scope.original_work_id,
  new_job_created:false,
  installation_authorized:false,
  original_job_completed:false,
  model_install_authority:false,
 });
}
// This is a connection to the existing constitutional driver, not another
// self-upgrading state machine. A discovery is a hypothesis, never a warrant.
// Only trusted adapters with independent provider readback can advance work.
export async function continueVerifiedRealityUpgrade({
 originalWorkId,discovery,state,adapters,maxTransitions=12,
}={}){
 if(!WORK.test(String(originalWorkId||''))||
    state?.scope?.original_work_id!==originalWorkId)
  fail('UPGRADE_CONTINUATION_ORIGINAL_WORK_CHANGED');
 verifySelfImprovementJournal(state);
 if(state.scope.target_environment!=='ISOLATED_PREVIEW')
  fail('UPGRADE_CONTINUATION_PRODUCTION_NOT_ALLOWED');
 if(discovery?.original_job_completed!==false||
    discovery?.capability_installed!==false||
    discovery?.authorization_granted!==false||
    discovery?.sandbox_executed!==false)
  fail('UPGRADE_CONTINUATION_UNTRUSTED_DISCOVERY');
 if(discovery.status==='NO_NEW_UPGRADE_NEEDED')
  return Object.freeze({status:'NO_UPGRADE_REQUIRED_CONTINUE_ORIGINAL_WORK',
   original_work_id:originalWorkId,phase:state.phase,
   original_job_completed:false,installation_authorized:false});
 if(discovery.status==='DIAGNOSIS_REQUIRED'||
    discovery.status==='REPAIR_EXISTING_CAPABILITY')
  return Object.freeze({status:'INDEPENDENT_GAP_CONFIRMATION_REQUIRED',
   original_work_id:originalWorkId,phase:state.phase,
   original_job_completed:false,installation_authorized:false});
 if(discovery.status!=='CAPABILITY_GAP_CANDIDATE'||
    discovery.kind!=='MISSING_INSTRUMENT_NEEDS_INDEPENDENT_VERIFICATION'||
    !/^[a-z][a-z0-9._-]{2,90}$/.test(String(discovery.needed_upgrade||''))||
    !Array.isArray(discovery.evidence_refs)||!discovery.evidence_refs.length)
  fail('UPGRADE_CONTINUATION_VERIFIED_DISCOVERY_REQUIRED');
 if(!adapters||typeof adapters.observeMissingCapability!=='function'||
    typeof adapters.verifyIndependentReceipt!=='function'||
    typeof adapters.persistCheckpoint!=='function')
  fail('UPGRADE_CONTINUATION_TRUSTED_ADAPTERS_REQUIRED');
 if(state.phase==='DISCOVERING'){
  const observe=adapters.observeMissingCapability;
  adapters={...adapters,async observeMissingCapability(context){
   const receipt=await observe(context);
   if(receipt?.kind!=='GAP_CONFIRMED'||
      receipt.capability_id!==discovery.needed_upgrade||
      !Array.isArray(receipt.failure_refs)||!receipt.failure_refs.length||
      !receipt.verification_suite_ref)
    fail('UPGRADE_CONTINUATION_PROVIDER_GAP_NOT_CONFIRMED');
   // The existing constitutional driver independently verifies this receipt,
   // persists the transition, and reads back its hash before model generation.
   return receipt;
  }};
 }else if(state.confirmed_gap?.capability_id!==discovery.needed_upgrade)
  fail('UPGRADE_CONTINUATION_CAPABILITY_MISMATCH');
 const result=await continueGovernedSelfImprovement({state,adapters,maxTransitions});
 if(result?.state?.scope?.original_work_id!==originalWorkId)
  fail('UPGRADE_CONTINUATION_DRIVER_SCOPE_CHANGED');
 return Object.freeze({status:result.status,original_work_id:originalWorkId,
  phase:result.state.phase,checkpoint_hash:result.state.head_hash,
  correction_attempts:result.state.attempt_count,
  owner_action_required:result.owner_action_required===true,
  original_job_completed:result.original_job_completed===true,
  // The authoritative state and the persisted, attested journal remain in the
  // original constitutional driver; this layer never fabricates settlement.
  driver:result});
}

export const REALITY_UPGRADE_DISCOVERY_VERSION='reality-upgrade-discovery-v0.1';
const WORK=/^work:[a-f0-9]{32}$/;
const CI=/^https:\/\/github\.com\/maloney2323\/Reality\/actions\/runs\/[1-9][0-9]*$/;
const fail=reason=>{throw Error(reason)};
const item=(status,kind,reason,needed,action,evidenceRefs=[])=>Object.freeze({
 version:REALITY_UPGRADE_DISCOVERY_VERSION,
 status,kind,reason,needed_upgrade:needed,next_action:action,
 evidence_refs:Object.freeze([...evidenceRefs]),
 authorization_granted:false,
 sandbox_executed:false,
 github_write_executed:false,
 capability_installed:false,
 original_job_completed:false,
});
export function projectRealityUpgradeDiscovery({
 originalWorkId,providerEvidence,cognitionState,
}={}){
 if(!WORK.test(String(originalWorkId||''))||
    providerEvidence?.original_work_id!==originalWorkId||
    providerEvidence?.original_job_completed!==false||
    providerEvidence?.external_action_performed!==false||
    providerEvidence?.execution_authorized!==false||
    typeof providerEvidence?.recovery_receipt_id!=='string'||
    !providerEvidence.recovery_receipt_id)
  fail('UPGRADE_DISCOVERY_ORIGINAL_WORK_EVIDENCE_REQUIRED');
 const refs=[providerEvidence.recovery_receipt_id];
 const passed=providerEvidence.status==='LATER_SUCCESSFUL_CI_RUN_INDEPENDENTLY_OBSERVED';
 const notYet=providerEvidence.status==='NO_LATER_VERIFIED_SUCCESS_IN_BOUNDED_PROVIDER_WINDOW';
 if(!passed&&!notYet)
  fail('UPGRADE_DISCOVERY_PROVIDER_STATUS_NOT_VERIFIED');
 if(passed){
  const run=providerEvidence.later_success?.run_url;
  if(!CI.test(String(run||'')))
   fail('UPGRADE_DISCOVERY_PROVIDER_PASS_REF_NOT_VERIFIED');
  if(!['NO_CAPABILITY_GAP','CAPABILITY_ALREADY_REGISTERED'].includes(cognitionState?.state))
   fail('UPGRADE_DISCOVERY_PROVIDER_AND_COGNITION_CONTRADICT');
  return item('NO_NEW_UPGRADE_NEEDED','EXISTING_FIX_OR_TRANSIENT_FAILURE',
   'A later run of the same workflow passed. This does not establish the root cause or close the original job.',
   null,'Verify the source-level correction and original-job acceptance before settlement.',
   [...refs,run]);
 }
 if(cognitionState?.state==='NO_CAPABILITY_GAP'||
    cognitionState?.state==='CAPABILITY_ALREADY_REGISTERED')
  return item('DIAGNOSIS_REQUIRED','UNCLASSIFIED_OR_EXISTING_CAPABILITY_FAILURE',
   'Historical failures were observed, but there is no independently established missing capability.',
   null,'Investigate root cause, current provider/permission state, and whether an existing capability needs repair.',
   refs);
 // A v1 gap with frozen failure references is a proposed instrument
 // to investigate. It is NOT sufficient for a verified, owner-authorized
 // upgrade; the actual sandbox and warrant remain separate required stages.
 if(cognitionState?.state==='AWAITING_AUTHORIZATION'&&
    cognitionState?.gap?.state==='GAP_CONFIRMED'&&
    cognitionState?.gap?.work_item_id===originalWorkId&&
    typeof cognitionState.gap.capability_id==='string'&&
    /^[a-z][a-z0-9._-]{2,90}$/.test(cognitionState.gap.capability_id)&&
    Array.isArray(cognitionState.gap.frozen_historical_failure_refs)&&
    cognitionState.gap.frozen_historical_failure_refs.length>0&&
    cognitionState?.experiment?.state==='SANDBOX_PROPOSED'&&
    cognitionState?.original_work_executed===false&&
    cognitionState?.job_completed===false){
  const cap=cognitionState.gap.capability_id;
  return item('CAPABILITY_GAP_CANDIDATE','MISSING_INSTRUMENT_NEEDS_INDEPENDENT_VERIFICATION',
   'Recovery v1 identified a proposed missing instrument with frozen failure references. The instrument is not yet independently verified or installed.',
   cap,'Independently reproduce the missing instrument, verify the capability contract, then request isolated sandbox authorization.',
   [...refs,...cognitionState.gap.frozen_historical_failure_refs.slice(0,5)]);
 }
 fail('UPGRADE_DISCOVERY_UNSUPPORTED_OR_UNVERIFIED_CAPABILITY_STATE');
}

// Intake-side triage for authenticated, independently recorded blockers.
// A failure reason is not automatically a missing capability. The trusted
// caller must bind observation to original work and supply independent proof.
// This projection never creates a verified capability warrant by itself.
export function triageOperationalBlocker({
 originalWorkId,observation,capabilityRegistry=[],
}={}){
 if(!WORK.test(String(originalWorkId||''))||
    observation?.original_work_id!==originalWorkId||
    observation?.independently_verified!==true||
    observation?.evidence_kind!=='OBSERVED_FAILURE'||
    typeof observation?.source_ref!=='string'||
    observation.source_ref.length<8)
  fail('UPGRADE_DISCOVERY_VERIFIED_BLOCKER_REQUIRED');
 if(!Array.isArray(capabilityRegistry))fail('UPGRADE_DISCOVERY_REGISTRY_INVALID');
 const ref=observation.source_ref;
 const cls=observation.blocker_class;
 const known=new Set(capabilityRegistry.map(c=>c?.id).filter(x=>typeof x==='string'));
 const baseline=kind=>item('NO_NEW_UPGRADE_NEEDED',kind,
  'An upgrade does not resolve this blocker; address its underlying cause.',
  null,kind==='AUTHORIZATION_MISSING'?'Request the missing exact action approval.':
  kind==='TRANSIENT_PROVIDER_FAILURE'?'Reconcile provider status without replaying uncertain writes.':
  'Refresh evidence and recheck existing implementation.',[ref]);
 if(cls==='AUTHORIZATION_MISSING'||cls==='TRANSIENT_PROVIDER_FAILURE'||
    cls==='STALE_EVIDENCE')return baseline(cls);
 if(cls==='EXISTING_CAPABILITY_DEFECT')
  return item('REPAIR_EXISTING_CAPABILITY','EXISTING_CAPABILITY_DEFECT',
   'An observed regression affects an existing instrument. Repair and reverify rather than create a duplicate capability.',
   typeof observation.capability_id==='string'?observation.capability_id:null,
   'Investigate the existing implementation and run historical regressions in isolation.',[ref]);
 if(cls==='MISSING_INSTRUMENT'){
  const id=observation.capability_id;
  if(!/^[a-z][a-z0-9._-]{2,90}$/.test(String(id||''))||
     typeof observation?.verification_suite_ref!=='string'||
     observation.verification_suite_ref.length<8)
   fail('UPGRADE_DISCOVERY_MISSING_INSTRUMENT_CONTRACT_REQUIRED');
  if(known.has(id))
   return item('DIAGNOSIS_REQUIRED','REGISTERED_CAPABILITY_CONFLICT',
    'The capability is already registered. An unavailable instrument may instead reflect a configuration or execution failure.',
    null,'Check registration, version, permissions and current deployment before proposing an upgrade.',[ref]);
  return item('CAPABILITY_GAP_CANDIDATE','MISSING_INSTRUMENT_NEEDS_INDEPENDENT_VERIFICATION',
   'A source-linked missing instrument is a candidate for independent capability-gap confirmation.',
   id,'Confirm the missing capability against frozen failures and a verification suite; no authorization or code write has been granted.',[ref]);
 }
 return item('DIAGNOSIS_REQUIRED','UNCLASSIFIED_BLOCKER',
  'The observed failure cannot yet be attributed to a specific missing capability.',
  null,'Gather more independent evidence; do not synthesize or promote an upgrade.',[ref]);
}
