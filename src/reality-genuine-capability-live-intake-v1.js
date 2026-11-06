// Genuine Capability Engine: live ORIGINAL-job intake.
// Called by the trusted server after executeAuthorizedWork's independent
// verifier, never by user JSON, a chat model, or a scheduled guessing pass.
// This creates only a durable discovery trigger. Installation is separate.
import {createHash} from 'node:crypto';
import {createCapabilityValuePassport} from './reality-genuine-capability-value-passport-v1.js';

export const GENUINE_CAPABILITY_LIVE_INTAKE_VERSION='v1';
const WORK=/^work:[a-f0-9]{32}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HASH=/^[a-f0-9]{64}$/;
const CAP=/^[a-z][a-z0-9._-]{2,90}$/;
const refuse=code=>{throw Error('GENUINE_CAPABILITY_INTAKE_'+code)};
const canonical=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(canonical):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])]));
const digest=x=>createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
const allowedSource=x=>typeof x==='string'&&(
 /^https:\/\/github\.com\/maloney2323\/Reality\/actions\/runs\/[1-9][0-9]*$/.test(x)||
 /^vercel:provider-verified:[A-Za-z0-9_.:/-]{8,340}$/.test(x)||
 /^reality:provider-verified:[a-z][a-z0-9_-]{2,40}:[A-Za-z0-9_.:/-]{12,340}$/.test(x));
function stableFailure(f){
 return {original_work_id:f.original_work_id,evidence_kind:f.evidence_kind,
  blocker_class:f.blocker_class,capability_id:f.capability_id,
  source_ref:f.source_ref,verification_suite_ref:f.verification_suite_ref,
  independently_verified:true,external_action_performed:false,
  provider_effect_may_have_occurred:false,no_automatic_retry:false};
}
function admissible(f,work){
 return WORK.test(work)&&f?.original_work_id===work&&
  f.independently_verified===true&&f.independent===true&&f.verified===false&&
  f.evidence_kind==='OBSERVED_FAILURE'&&
  f.blocker_class==='MISSING_INSTRUMENT'&&
  CAP.test(f.capability_id)&&allowedSource(f.source_ref)&&
  typeof f.verification_suite_ref==='string'&&f.verification_suite_ref.length>=13&&
  f.external_action_performed===false&&f.provider_effect_may_have_occurred!==true&&
  f.no_automatic_retry!==true;
}
export function createGenuineCapabilityLiveIntake({
 readOriginalOwnerGoal,readOriginalProviderFailure,
 persistGapAndReadback,enqueueExactGap,signalUnattendedWorker,
}={}){
 for(const [name,fn] of Object.entries({
  readOriginalOwnerGoal,readOriginalProviderFailure,persistGapAndReadback,
  enqueueExactGap,signalUnattendedWorker})){
  if(typeof fn!=='function')refuse('TRUSTED_ADAPTER_MISSING_'+name.toUpperCase());
 }
 return async function onVerifiedCapabilityGap(request){
  const work=request?.original_work_id;
  const observed=request?.independent_failure;
  if(!admissible(observed,work)||
   typeof request.original_execution_receipt!=='string'||
   !request.original_execution_receipt.startsWith('execution:')||
   request.authorization_continues_unchanged!==true||
   request.production_write_permitted!==false||
   request.customer_job_completed!==false)
   refuse('EXECUTION_RECEIPT_OR_GAP_NOT_TRUSTED');
  const owner=await readOriginalOwnerGoal(Object.freeze({
   original_work_id:work,execution_receipt:request.original_execution_receipt}));
  if(owner?.original_work_id!==work||owner?.goal_active!==true||
   owner?.owner_confirmed!==true||owner?.original_job_settled!==false||
   !UUID.test(owner.owner_id)||!UUID.test(owner.conversation_id)||
   !UUID.test(owner.goal_transition_event_id)||!UUID.test(owner.original_work_event_id)||
   !owner.goal_id||!owner.continuity_root_id||!owner.worldline_id)
   refuse('ACTIVE_OWNER_GOAL_AND_ORIGINAL_WORK_REQUIRED');
  const current=await readOriginalProviderFailure(Object.freeze({
   original_work_id:work,capability_id:observed.capability_id,
   source_ref:observed.source_ref,
   original_execution_receipt:request.original_execution_receipt,
   owner_id:owner.owner_id}));
  if(!admissible(current,work)||
   digest(stableFailure(current))!==digest(stableFailure(observed)))
   refuse('INDEPENDENT_PROVIDER_FAILURE_CHANGED');
  // The provider must give a genuinely frozen, separately reproducible test
  // before a model is permitted to generate source. Intake only records a
  // candidate for that next verification; it does not treat a provider claim
  // as an independent frozen-test pass.
  const stable=Object.freeze({
   original_work_id:work,original_execution_receipt:request.original_execution_receipt,
   owner_id:owner.owner_id,conversation_id:owner.conversation_id,
   goal_id:owner.goal_id,goal_transition_event_id:owner.goal_transition_event_id,
   original_work_event_id:owner.original_work_event_id,
   continuity_root_id:owner.continuity_root_id,worldline_id:owner.worldline_id,
   observed_failure:stableFailure(current),
   provider_failure_hash:digest(stableFailure(current)),
   value_passport:createCapabilityValuePassport({
    originalWorkId:work,capabilityId:current.capability_id,
    originalWorkEventId:owner.original_work_event_id,
    providerFailureRef:current.source_ref,
    originalBusinessEvidence:owner.original_business_evidence,
   }),
   installation_authorized:false,original_job_completed:false,
   production_changed:false,
  });
  const evidence=await persistGapAndReadback(stable);
  if(evidence?.independently_verified!==true||
   !UUID.test(evidence.event_id)||evidence.original_work_id!==work||
   evidence.provider_failure_hash!==stable.provider_failure_hash||
   evidence.owner_id!==owner.owner_id||
   evidence.goal_transition_event_id!==owner.goal_transition_event_id||
   evidence.installation_authorized!==false||
   evidence.original_job_completed!==false)
   refuse('DURABLE_PROVIDER_GAP_EVENT_READBACK_REQUIRED');
  const queued=await enqueueExactGap(Object.freeze({
   gap_event_id:evidence.event_id,original_work_id:work,
   source_hash:stable.provider_failure_hash}));
  if(queued?.phase!=='PENDING_FROZEN_REPRODUCTION'||
   !UUID.test(queued.trigger_id)||queued.original_work_id!==work||
   queued.source_event_id!==evidence.event_id||
   queued.installation_authorized!==false||
   queued.original_job_completed!==false||
   queued.new_customer_job_created!==false)
   refuse('ATOMIC_REAL_GAP_QUEUE_READBACK_REQUIRED');
  // Dispatch carries only the opaque trigger ID. The signed worker must
  // independently claim current owner goal + evidence and cannot install.
  let wakeStatus='WORKER_WAKE_NEEDS_RECONCILIATION';
  try{
   const wake=await signalUnattendedWorker(Object.freeze({
    trigger_id:queued.trigger_id,
    original_work_id:work,source_event_id:evidence.event_id,
    installation_authorized:false,
   }));
   if(wake?.dispatched===true&&wake?.original_work_id===work&&
      wake.trigger_id===queued.trigger_id&&wake.installation_authorized===false)
    wakeStatus='WORKER_WAKE_DISPATCHED';
  }catch{ /* queue is durable; scheduler retries; never fabricate wakeup */ }
  return Object.freeze({
   status:'GENUINE_CAPABILITY_GAP_DURABLY_QUEUED',
   wake_status:wakeStatus,original_work_id:work,
   trigger_id:queued.trigger_id,
   original_failure_receipt:evidence.event_id,
   value_passport_source_event_id:evidence.event_id,
   value_passport_status:stable.value_passport.qualification_status,
   owner_action_required:false,new_job_created:false,
   installation_authorized:false,original_job_completed:false,
   production_changed:false,
  });
 };
}
