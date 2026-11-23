// Independent Final Loop release witness. A Vercel READY deployment,
// alias assignment, or worker HTTP success is never release activation.
// A completed signed run establishes the actual process identity; cron
// causality is a distinct proof and must not be inferred from a timestamp.
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const KEY=/^[A-Z][A-Z0-9_]{3,110}$/;
const REF=/^[A-Za-z0-9][A-Za-z0-9/_-]{3,145}$/;
const HOST=/^[a-z0-9-]{6,145}\.vercel\.app$/;
const base=Object.freeze({
 schema:'reality-independent-signed-worker-release-observer-v1',
 read_only:true,owner_approval_granted_by_observer:false,
 scheduled_worker_release_activated:false,
 execution_authorized:false,model_tool_permission_granted:false,
 original_job_completed:false,production_changed:false,
 new_shift_started:false
});
const ret=(status,more={})=>Object.freeze({...base,status,...more});
export function verifyActuallyCompletedSignedWorkerRelease({
 schedule,alias,candidate,ci,approval,wakeReadback,activationTime,
 cronInvocation
}={}){
 if(schedule?.status!=='GOVERNED_SCHEDULE_INDEPENDENTLY_READ'||
  !Number.isSafeInteger(schedule.job_id)||schedule.job_id<1||
  schedule.active!==true||schedule.method!=='POST'||
  schedule.endpoint_path!=='/api/reality/governed-employee-shift-worker'||
  !HOST.test(schedule.host||'')||
  schedule.dedicated_stable_release_alias!==true||
  schedule.branch_automanaged!==false||
  schedule.credential_values_exposed!==false||
  schedule.signed_worker_target_verified!==true)
  return ret('INDEPENDENT_SCHEDULE_SCOPE_NOT_VERIFIED');
 if(candidate?.environment!=='ISOLATED_PREVIEW'||
  candidate.preview_only!==true||
  candidate.provider_deployment_ready!==true||
  candidate.operating_lane!=='NORMAL_SIGNED_SHIFT'||
  candidate.source_staging_only!==false||
  candidate.isolated_database_independently_verified!==true||
  candidate.owner_packet_handler_registered!==true||
  candidate.production_changed!==false||
  !UUID.test(candidate.shift_id||'')||
  !SHA.test(candidate.sha||'')||
  !REF.test(candidate.branch||'')||
  !KEY.test(candidate.capability_key||'')||
  candidate.scheduled_alias!==schedule.host)
  return ret('INDEPENDENT_QUALIFIED_RELEASE_NOT_VERIFIED');
 if(ci?.status!=='INDEPENDENT_FROZEN_CI_PASSED'||
  ci.independently_verified!==true||
  ci.test_source_pinned!==true||
  ci.release_sha!==candidate.sha||
  !Number.isSafeInteger(ci.run_id)||ci.run_id<1)
  return ret('INDEPENDENT_RELEASE_CI_MISSING');
 if(approval?.status!=='EXACT_PREVIEW_RELEASE_OWNER_APPROVED'||
  !UUID.test(approval.owner_id||'')||
  approval.shift_id!==candidate.shift_id||
  approval.release_sha!==candidate.sha||
  approval.capability_key!==candidate.capability_key||
  approval.scheduled_alias!==schedule.host||
  approval.target_environment!=='ISOLATED_PREVIEW'||
  approval.production_change_permitted!==false||
  !HASH.test(approval.receipt_sha256||''))
  return ret('EXACT_OWNER_RELEASE_AUTHORITY_MISSING');
 if(alias?.provider!=='VERCEL'||alias.independently_observed!==true||
  alias.project_verified!==true||alias.preview_only!==true||
  alias.alias!==schedule.host||
  alias.resolved_release_sha!==candidate.sha||
  alias.resolved_branch!==candidate.branch)
  return ret('SCHEDULED_PROVIDER_ALIAS_NOT_AT_APPROVED_RELEASE');
 if(!Number.isFinite(Date.parse(activationTime||''))||
  Date.parse(activationTime)<Date.parse(approval.approved_at||'')||
  Date.parse(activationTime)>Date.now())
  return ret('VERIFIED_RELEASE_ACTIVATION_EPOCH_MISSING');
 if(wakeReadback?.status!=='SIGNED_RELEASE_COMPLETED_WORKER_WAKES_READ_ONLY'||
  wakeReadback.read_only!==true||
  wakeReadback.shift_id!==candidate.shift_id||
  wakeReadback.release_activated!==false||
  !Array.isArray(wakeReadback.wakes)||wakeReadback.wakes.length>10)
  return ret('INDEPENDENT_COMPLETED_WORKER_RECEIPT_READBACK_MISSING');
 const matches=wakeReadback.wakes.filter(w=>
  UUID.test(w?.worker_run_id||'')&&
  w.owner_id===approval.owner_id&&w.shift_id===approval.shift_id&&
  w.running_release_sha===candidate.sha&&
  w.running_release_ref===candidate.branch&&
  w.operating_lane==='NORMAL_SIGNED_SHIFT'&&
  HASH.test(w.release_receipt_sha256||'')&&
  Number.isFinite(Date.parse(w.recorded_at||''))&&
  Number.isFinite(Date.parse(w.finished_at||''))&&
  Date.parse(w.recorded_at)>=Date.parse(activationTime)&&
  Date.parse(w.finished_at)>=Date.parse(w.recorded_at)&&
  Array.isArray(w.registered_capabilities)&&
  w.registered_capabilities.includes(candidate.capability_key)
 );
 if(matches.length!==1)
  return ret('APPROVED_RELEASE_SIGNED_HANDLER_WAKE_NOT_YET_OBSERVED',{
   expected_release_sha:candidate.sha,
   expected_capability_key:candidate.capability_key,
   completed_matching_wake_count:matches.length
  });
 const observed=matches[0];
 const cronBound=cronInvocation?.status===
  'SIGNED_CRON_DISPATCH_BOUND_TO_WORKER_RUN'&&
  cronInvocation.independently_verified===true&&
  cronInvocation.job_id===schedule.job_id&&
  cronInvocation.worker_run_id===observed.worker_run_id&&
  cronInvocation.scheduled_host===schedule.host;
 if(!cronBound)
  return ret('ACTUAL_SIGNED_RELEASE_WAKE_OBSERVED_CRON_CAUSALITY_PENDING',{
   actual_worker_release_verified:true,
   matching_worker_run_id:observed.worker_run_id,
   observed_release_sha:observed.running_release_sha,
   observed_capability_key:candidate.capability_key,
   scheduled_invocation_verified:false,
   next_governed_action:'INDEPENDENTLY_BIND_PG_CRON_DISPATCH_TO_SIGNED_RUN'
  });
 return ret('SCHEDULED_SIGNED_WORKER_RELEASE_AND_HANDLER_INDEPENDENTLY_VERIFIED',{
  actual_worker_release_verified:true,
  matching_worker_run_id:observed.worker_run_id,
  observed_release_sha:observed.running_release_sha,
  observed_capability_key:candidate.capability_key,
  scheduled_invocation_verified:true,
  scheduled_worker_release_activated:true,
  next_governed_action:'CLAIM_EXACT_ORIGINAL_ACTION_AND_VERIFY_OUTCOME'
 });
}
