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
