// Signed worker capability delivery is a separate evidence gate from
// classification, approval, executor claims, verification and settlement.
// An installed preview cannot be called "activated" until the *scheduled*
// worker independently attests to the same release and approved capability.
// This module neither changes aliases, invokes tools, nor grants authority.
const SHA=/^[a-f0-9]{40}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/;
const KEY=/^[A-Z][A-Z0-9_]{3,110}$/;
const REF=/^[A-Za-z0-9][A-Za-z0-9/_-]{3,145}$/;
const safe=(status,detail={})=>Object.freeze({
 schema:'reality-signed-worker-capability-delivery-v1',
 status,...detail,
 read_only:true,approval_granted_by_evaluator:false,
 activation_authorized_by_evaluator:false,
 executor_invoked:false,external_effect_performed:false,
 repair_executed:false,installation_authorized:false,
 original_job_completed:false,production_changed:false,
 new_shift_started:false
});

// This is emitted from the *actual signed worker execution process*.
// The attestation is runtime identity, NOT a Vercel alias or CI verdict.
// Missing or unverified system env fails closed (never fabricate a commit).
export function attestSignedWorkerLoadedCapabilities({
 wake,graph,env=process.env,registeredActionKeys=[]
}={}){
 const keys=Array.isArray(registeredActionKeys)?
  [...new Set(registeredActionKeys)]:[];
 if(wake?.status!=='SHIFT_WORKER_PULSE_DURABLY_RECORDED'||
  graph?.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||
  !UUID.test(wake.shift_id||'')||
  !UUID.test(graph.shift_id||'')||
  !UUID.test(graph.owner_id||'')||
  wake.shift_id!==graph.shift_id||
  graph.installation_authorized!==false||
  graph.production_changed!==false||
  !Array.isArray(registeredActionKeys)||registeredActionKeys.length>32||
  keys.some(x=>!KEY.test(x)))
  return safe('SIGNED_WORKER_CAPABILITY_SCOPE_UNVERIFIED');
 const releaseSha=String(env.VERCEL_GIT_COMMIT_SHA||'');
 const branch=String(env.VERCEL_GIT_COMMIT_REF||'');
 if(env.VERCEL_ENV!=='preview'||!SHA.test(releaseSha)||
  !REF.test(branch)||branch.includes('..')||branch.includes('//'))
  return safe('SIGNED_WORKER_RUNNING_RELEASE_UNVERIFIED',{
   owner_id:graph.owner_id,shift_id:graph.shift_id
  });
 return safe('SIGNED_WORKER_RELEASE_AND_REGISTERED_ACTIONS_OBSERVED',{
  owner_id:graph.owner_id,shift_id:graph.shift_id,
  running_release_sha:releaseSha,running_release_ref:branch,
  registered_capability_keys:Object.freeze(keys),
  registered_capability_count:keys.length,
  // Still requires independent alias binding and exact owner release approval.
  scheduled_worker_alias_verified:false,
  candidate_release_activated:false,
  model_tool_permission_granted:false
 });
}

// An independent release reviewer may evaluate a qualified candidate against
// provider CI, owner approval, current Vercel alias and the signed worker's
// own release receipt. No provider write or authorization is performed here.
export function assessSignedWorkerCapabilityActivation({
 attestation,candidate,ci,approval,alias,targetActionKey
}={}){
 const base={
  schema:'reality-governed-capability-activation-review-v1',
  read_only:true,release_change_performed:false,alias_repointed:false,
  capability_usable_by_llm:false,execution_authorized:false,
  owner_approval_granted:false,repair_executed:false,
  original_job_completed:false,production_changed:false
 };
 const ret=(status,nextAction,details={})=>Object.freeze({
  ...base,status,next_governed_action:nextAction,...details
 });
 if(attestation?.schema!=='reality-signed-worker-capability-delivery-v1'||
  attestation.status!=='SIGNED_WORKER_RELEASE_AND_REGISTERED_ACTIONS_OBSERVED'||
  !UUID.test(attestation.owner_id||'')||
  !UUID.test(attestation.shift_id||'')||
  !SHA.test(attestation.running_release_sha||'')||
  !REF.test(attestation.running_release_ref||'')||
  !Array.isArray(attestation.registered_capability_keys)||
  attestation.registered_capability_keys.some(x=>!KEY.test(x))||
  attestation.read_only!==true||
  attestation.original_job_completed!==false||
  attestation.production_changed!==false||
  attestation.candidate_release_activated!==false||
  !KEY.test(targetActionKey||''))
  return ret('SIGNED_WORKER_RUNTIME_ATTESTATION_MISSING',
   'GET_SIGNED_CURRENT_WORKER_RELEASE_AND_REGISTRY');
 if(!candidate||!SHA.test(candidate.sha||'')||
  !REF.test(candidate.branch||'')||
  candidate.preview_only!==true||
  candidate.provider_deployment_ready!==true||
  candidate.environment!=='ISOLATED_PREVIEW'||
  candidate.operating_lane!=='NORMAL_SIGNED_SHIFT'||
  candidate.source_staging_only!==false||
  candidate.isolated_database_independently_verified!==true||
  candidate.owner_packet_handler_registered!==true||
  !UUID.test(candidate.shift_id||'')||
  candidate.shift_id!==attestation.shift_id||
  !KEY.test(candidate.capability_key||'')||
  candidate.capability_key!==targetActionKey||
  candidate.production_changed!==false)
  return ret('QUALIFIED_CAPABILITY_PREVIEW_EVIDENCE_MISSING',
   'INDEPENDENTLY_QUALIFY_PINNED_PREVIEW_RELEASE');
 if(ci?.status!=='INDEPENDENT_FROZEN_CI_PASSED'||
  ci.release_sha!==candidate.sha||
  ci.independently_verified!==true||
  ci.test_source_pinned!==true||
  !Number.isSafeInteger(ci.run_id)||ci.run_id<=0)
  return ret('CANDIDATE_RELEASE_INDEPENDENT_CI_UNVERIFIED',
   'RUN_INDEPENDENT_PINNED_CAPABILITY_ACCEPTANCE');
 if(approval?.status!=='EXACT_PREVIEW_RELEASE_OWNER_APPROVED'||
  approval.owner_id!==attestation.owner_id||
  approval.shift_id!==attestation.shift_id||
  approval.release_sha!==candidate.sha||
  approval.capability_key!==targetActionKey||
  approval.target_environment!=='ISOLATED_PREVIEW'||
  !HASH.test(approval.receipt_sha256||'')||
  !Number.isFinite(Date.parse(approval.approved_at||''))||
  approval.production_change_permitted!==false)
  return ret('QUALIFIED_RELEASE_REQUIRES_EXACT_OWNER_ACTIVATION_AUTHORITY',
   'PRESENT_EXACT_CAPABILITY_RELEASE_AND_SCOPE_FOR_OWNER_APPROVAL',{
    qualified_release_sha:candidate.sha,
    target_capability:targetActionKey
   });
 if(!alias||alias.independently_observed!==true||
  alias.provider!=='VERCEL'||
  !SHA.test(alias.resolved_release_sha||'')||
  !REF.test(alias.resolved_branch||'')||
  alias.preview_only!==true||
  alias.project_verified!==true)
  return ret('SCHEDULED_WORKER_PROVIDER_ALIAS_UNVERIFIED',
   'INDEPENDENTLY_READ_SCHEDULED_WORKER_ALIAS_RELEASE');
 if(alias.resolved_release_sha!==candidate.sha||
  alias.resolved_branch!==candidate.branch)
  return ret('APPROVED_CAPABILITY_NOT_DELIVERED_TO_SCHEDULED_WORKER',
   'GOVERNED_EXACT_PREVIEW_RELEASE_ACTIVATION_REQUIRED',{
    approved_release_sha:candidate.sha,
    observed_scheduled_release_sha:alias.resolved_release_sha,
    alias_change_authorized_by_evaluator:false
   });
 if(attestation.running_release_sha!==candidate.sha||
  attestation.running_release_ref!==candidate.branch)
  return ret('SCHEDULED_WORKER_NOT_YET_ATTESTED_APPROVED_RELEASE',
   'OBSERVE_NEXT_ACTUAL_SIGNED_WORKER_WAKE',{
    approved_release_sha:candidate.sha,
    observed_worker_release_sha:attestation.running_release_sha
   });
 if(!attestation.registered_capability_keys.includes(targetActionKey))
  return ret('APPROVED_RELEASE_LOADED_HANDLER_NOT_REGISTERED',
   'REGISTER_AND_INDEPENDENTLY_TEST_EXACT_CAPABILITY_ADAPTER',{
    approved_release_sha:candidate.sha,target_capability:targetActionKey
   });
 return ret('APPROVED_CAPABILITY_LOADED_AWAITING_SIGNED_EXECUTOR_CLAIM',
  'CLAIM_EXACT_GOVERNED_ACTION_AND_INDEPENDENTLY_VERIFY_OUTCOME',{
   observed_worker_release_sha:attestation.running_release_sha,
   verified_capability_key:targetActionKey,
   release_identity_matches:true,
   // This attests presence, not permission to invoke the LLM or the handler.
   capability_usable_by_llm:false
  });
}


// Independent service-only install adapter for the next signed worker release.
// The caller MUST provide trusted implementations of claimApprovedRelease,
// observeAlias, and assignAlias; no LLM-generated callback or dynamic endpoint
// may be registered here. A one-use service claim, pinned CI and known old
// alias are prerequisites to a single provider assignment.
// This function does not grant a job warrant or certify the resumed original.
export async function deliverOnceApprovedSignedWorkerCapability({
 env=process.env,ownerId,shiftId,targetReleaseSha,targetReleaseRef,
 capabilityKey,scheduledAlias,releaseCandidate,ci,
 claimApprovedRelease,observeAlias,assignAlias
}={}){
 const base=(status,detail={})=>Object.freeze({
  schema:'reality-signed-worker-delivery-executor-v1',
  status,...detail,
  original_job_completed:false,production_changed:false,
  model_tool_permission_granted:false,new_shift_started:false,
  signed_worker_new_release_observed:false,
  independent_original_settlement_verified:false
 });
 if(env.VERCEL_ENV!=='preview'||
  env.REALITY_SIGNED_CAPABILITY_DELIVERY_ENABLED!=='true'||
  !UUID.test(ownerId||'')||!UUID.test(shiftId||'')||
  !SHA.test(targetReleaseSha||'')||!REF.test(targetReleaseRef||'')||
  !KEY.test(capabilityKey||'')||
  typeof scheduledAlias!=='string'||
  !/^[a-z0-9-]{6,145}\.vercel\.app$/.test(scheduledAlias)||
  typeof claimApprovedRelease!=='function'||
  typeof observeAlias!=='function'||
  typeof assignAlias!=='function')
  return base('SIGNED_CAPABILITY_DELIVERY_SERVICE_BOUNDARY_UNVERIFIED',{
   provider_assignment_attempted:false
  });
 if(releaseCandidate?.sha!==targetReleaseSha||
  releaseCandidate.branch!==targetReleaseRef||
  releaseCandidate.shift_id!==shiftId||
  releaseCandidate.capability_key!==capabilityKey||
  releaseCandidate.preview_only!==true||
  releaseCandidate.provider_deployment_ready!==true||
  releaseCandidate.environment!=='ISOLATED_PREVIEW'||
  releaseCandidate.production_changed!==false||
  // A READY staging-only preview would replace normal shift processing with
  // a restricted diagnostic lane. Never point the existing cron at it.
  releaseCandidate.operating_lane!=='NORMAL_SIGNED_SHIFT'||
  releaseCandidate.source_staging_only!==false||
  releaseCandidate.isolated_database_independently_verified!==true||
  releaseCandidate.owner_packet_handler_registered!==true||
  ci?.status!=='INDEPENDENT_FROZEN_CI_PASSED'||
  ci.release_sha!==targetReleaseSha||
  ci.independently_verified!==true||
  ci.test_source_pinned!==true||
  !Number.isSafeInteger(ci.run_id)||ci.run_id<=0)
  return base('SIGNED_CAPABILITY_DELIVERY_PINNED_CI_OR_RELEASE_UNVERIFIED',{
   provider_assignment_attempted:false
  });
 // A provider-created READY preview is not the scheduled alias.
 let oldAlias;
 try{oldAlias=await observeAlias(scheduledAlias)}
 catch{return base('SIGNED_CAPABILITY_DELIVERY_PROVIDER_READ_UNAVAILABLE',{
  provider_assignment_attempted:false
 })}
 if(oldAlias?.provider!=='VERCEL'||
  oldAlias.independently_observed!==true||
  oldAlias.preview_only!==true||
  oldAlias.project_verified!==true||
  !SHA.test(oldAlias.resolved_release_sha||'')||
  !REF.test(oldAlias.resolved_branch||''))
  return base('SIGNED_CAPABILITY_DELIVERY_OLD_ALIAS_UNVERIFIED',{
   provider_assignment_attempted:false
  });
 if(oldAlias.resolved_release_sha===targetReleaseSha&&
   oldAlias.resolved_branch===targetReleaseRef)
  return base('SIGNED_CAPABILITY_DELIVERY_ALIAS_ALREADY_TARGET_NO_REPLAY',{
   provider_assignment_attempted:false,
   next_governed_action:'OBSERVE_ACTUAL_SIGNED_WORKER_WAKE_ON_SAME_SHIFT'
  });
 // This must be a database-backed atomic one-use installer authorization,
 // not a classifier/PR/CI model claim. The exact old alias commit acts as
 // an optimistic-concurrency fence. A failed claim NEVER calls Vercel.
 let claim;
 try{claim=await claimApprovedRelease({
  owner_id:ownerId,shift_id:shiftId,
  release_sha:targetReleaseSha,release_ref:targetReleaseRef,
  capability_key:capabilityKey,scheduled_alias:scheduledAlias,
  previous_release_sha:oldAlias.resolved_release_sha,
  previous_release_ref:oldAlias.resolved_branch,
  independent_ci_run_id:ci.run_id
 })}catch{return base('SIGNED_CAPABILITY_DELIVERY_OWNER_CLAIM_UNAVAILABLE',{
  provider_assignment_attempted:false
 })}
 if(claim?.status!=='EXACT_SIGNED_CAPABILITY_DELIVERY_CLAIMED'||
  claim.owner_id!==ownerId||claim.shift_id!==shiftId||
  claim.release_sha!==targetReleaseSha||
  claim.release_ref!==targetReleaseRef||
  claim.capability_key!==capabilityKey||
  claim.scheduled_alias!==scheduledAlias||
  claim.previous_release_sha!==oldAlias.resolved_release_sha||
  claim.previous_release_ref!==oldAlias.resolved_branch||
  claim.independent_ci_run_id!==ci.run_id||
  claim.target_environment!=='ISOLATED_PREVIEW'||
  claim.one_use_service_claim!==true||
  claim.owner_approved_exact_release!==true||
  !UUID.test(claim.claim_id||'')||
  !HASH.test(claim.approval_receipt_sha256||'')||
  claim.production_change_permitted!==false)
  return base('SIGNED_CAPABILITY_DELIVERY_EXACT_OWNER_AUTHORITY_MISSING',{
   provider_assignment_attempted:false,
   next_governed_action:'PRESENT_PINNED_RELEASE_IN_REALITY_CHAT_FOR_EXACT_APPROVAL'
  });
 // A final independent alias re-read prevents an obsolete approved claim
 // from overwriting a new worker release if another actor raced us.
 let before;
 try{before=await observeAlias(scheduledAlias)}
 catch{return base('SIGNED_CAPABILITY_DELIVERY_PREWRITE_ALIAS_UNVERIFIED',{
  provider_assignment_attempted:false
 })}
 if(before?.independently_observed!==true||
  before.provider!=='VERCEL'||
  before.resolved_release_sha!==oldAlias.resolved_release_sha||
  before.resolved_branch!==oldAlias.resolved_branch)
  return base('SIGNED_CAPABILITY_DELIVERY_OLD_ALIAS_DRIFT_NO_WRITE',{
   provider_assignment_attempted:false
  });
 let attempt;
 try{
  attempt=await assignAlias({
   alias:scheduledAlias,release_sha:targetReleaseSha,
   release_ref:targetReleaseRef,
   owner_id:ownerId,shift_id:shiftId,
   capability_key:capabilityKey,claim_id:claim.claim_id
  })
 }catch{
  // Never replay a potentially successful write. Independent GET only.
  return base('SIGNED_CAPABILITY_DELIVERY_PROVIDER_EFFECT_UNKNOWN_NO_REPLAY',{
   provider_assignment_attempted:true,
   next_governed_action:'INDEPENDENTLY_READ_SCHEDULED_ALIAS_WITHOUT_RETRY'
  });
 }
 // Do not equate HTTP 200 or alias API ack with actual worker activation.
 if(attempt?.provider!=='VERCEL'||attempt.alias!==scheduledAlias||
  attempt.release_sha!==targetReleaseSha||
  attempt.claim_id!==claim.claim_id)
  return base('SIGNED_CAPABILITY_DELIVERY_PROVIDER_RESULT_UNVERIFIED_NO_REPLAY',{
   provider_assignment_attempted:true
  });
 let after;
 try{after=await observeAlias(scheduledAlias)}
 catch{return base('SIGNED_CAPABILITY_DELIVERY_POSTWRITE_READ_UNAVAILABLE_NO_REPLAY',{
  provider_assignment_attempted:true
 })}
 if(after?.provider!=='VERCEL'||after.independently_observed!==true||
  after.preview_only!==true||after.project_verified!==true||
  after.resolved_release_sha!==targetReleaseSha||
  after.resolved_branch!==targetReleaseRef)
  return base('SIGNED_CAPABILITY_DELIVERY_PROVIDER_EFFECT_UNVERIFIED_NO_REPLAY',{
   provider_assignment_attempted:true,
   next_governed_action:'RECONCILE_PROVIDER_ALIAS_EFFECT_WITHOUT_REPLAY'
  });
 return base('SIGNED_CAPABILITY_DELIVERY_ALIAS_VERIFIED_AWAITING_WORKER_WAKE',{
  provider_assignment_attempted:true,
  independent_alias_verified:true,
  approved_release_sha:targetReleaseSha,
  claim_id:claim.claim_id,
  next_governed_action:'OBSERVE_SAME_SIGNED_SHIFT_RELEASE_AND_HANDLER'
 });
}
