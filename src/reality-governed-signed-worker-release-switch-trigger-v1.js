// Independent control-plane trigger for an existing signed preview worker.
// This is never invoked by an LLM or by the worker being replaced.
// The actual provider write is delegated to the established one-use,
// owner-approved signed-worker capability delivery executor.
import {deliverOnceApprovedSignedWorkerCapability,qualifiedWorkerRuntime,matchesWorkerReleaseAuthority}
 from './reality-signed-worker-capability-delivery-v1.js';

const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const HOST=/^[a-z0-9-]{6,145}\.vercel\.app$/;
const KEY=/^[A-Z][A-Z0-9_]{3,110}$/;
const SPEC='/api/reality/governed-employee-shift-worker';
const response=(status,other={})=>Object.freeze({
 schema:'reality-governed-signed-worker-release-switch-trigger-v1',
 status,...other,
 new_shift_started:false,owner_approval_granted_by_trigger:false,
 original_job_completed:false,production_changed:false,
 model_tool_permission_granted:false,
 scheduled_worker_new_release_observed:false
});
const validSchedule=s=>s?.status==='GOVERNED_SCHEDULE_INDEPENDENTLY_READ'&&
 Number.isSafeInteger(s.job_id)&&s.job_id>0&&s.active===true&&
 typeof s.host==='string'&&HOST.test(s.host)&&
 s.endpoint_path===SPEC&&s.method==='POST'&&
 s.provider==='SUPABASE_PG_CRON'&&s.credential_values_exposed===false&&
 s.signed_worker_target_verified===true;
const sameSchedule=(a,b)=>validSchedule(b)&&
 a.job_id===b.job_id&&a.host===b.host&&
 a.endpoint_path===b.endpoint_path&&
 a.method===b.method&&a.schedule===b.schedule;

/**
 * The release switch is NOT the classifier. The classifier supplies an
 * advisory next action; this independent service boundary reads exact
 * current pg_cron configuration, pins a qualified release and owner claim,
 * and invokes the existing governed delivery executor at most once.
 *
 * readSchedule, observeAlias, claimApprovedRelease, assignAlias must be
 * hardwired service/provider adapters, never LLM-produced functions.
 * ReleaseCandidate must be independently qualified by the control plane.
 */
export async function triggerOneGovernedSignedWorkerReleaseSwitch({
 env=process.env,ownerId,shiftId,capabilityKey,
 releaseCandidate,ci,ownerApproval,
 readSchedule,claimApprovedRelease,observeAlias,assignAlias
}={}){
 if(env.VERCEL_ENV!=='preview'||
  env.REALITY_GOVERNED_RELEASE_SWITCH_TRIGGER_ENABLED!=='true'||
  env.REALITY_SIGNED_CAPABILITY_DELIVERY_ENABLED!=='true'||
  !UUID.test(ownerId||'')||!UUID.test(shiftId||'')||
  !KEY.test(capabilityKey||'')||
  [readSchedule,claimApprovedRelease,observeAlias,assignAlias]
   .some(fn=>typeof fn!=='function'))
  return response('GOVERNED_RELEASE_SWITCH_SERVICE_BOUNDARY_NOT_READY',{
   provider_write_attempted:false
  });
 let scheduled;
 try{scheduled=await readSchedule()}catch{
  return response('GOVERNED_RELEASE_SWITCH_SCHEDULE_READ_UNAVAILABLE',{
   provider_write_attempted:false
  });
 }
 if(!validSchedule(scheduled))
  return response('GOVERNED_RELEASE_SWITCH_SCHEDULE_NOT_VERIFIED',{
   provider_write_attempted:false
  });
 // Branch aliases are deployment discovery addresses, not stable release
 // channels. Auto-assignment may silently undo a successful manual alias
 // repoint. A dedicated stable alias must first be installed and explicitly
 // made the cron target under its own fenced/approved migration.
 if(scheduled.host.startsWith('reality-git-')||
  scheduled.branch_automanaged===true||
  scheduled.dedicated_stable_release_alias!==true)
  return response('GOVERNED_RELEASE_SWITCH_STABLE_ALIAS_MIGRATION_REQUIRED',{
   current_schedule_host:scheduled.host,
   next_governed_action:'AUTHORIZE_FENCED_STABLE_WORKER_ALIAS_AND_CRON_BINDING',
   provider_write_attempted:false
  });
 if(!releaseCandidate||!SHA.test(releaseCandidate.sha||'')||
  releaseCandidate.shift_id!==shiftId||
  releaseCandidate.capability_key!==capabilityKey||
  releaseCandidate.scheduled_alias!==scheduled.host||
  releaseCandidate.operating_lane!=='NORMAL_SIGNED_SHIFT'||
  releaseCandidate.source_staging_only!==false||
  !qualifiedWorkerRuntime(releaseCandidate,env)||
  releaseCandidate.owner_packet_handler_registered!==true||
  releaseCandidate.preview_only!==true||
  releaseCandidate.provider_deployment_ready!==true||
  releaseCandidate.production_changed!==false)
  return response('GOVERNED_RELEASE_SWITCH_QUALIFIED_EXECUTION_RELEASE_MISSING',{
   next_governed_action:'QUALIFY_NORMAL_WORKER_AND_ISOLATED_DB',
   provider_write_attempted:false
  });
 if(ci?.status!=='INDEPENDENT_FROZEN_CI_PASSED'||
  ci.release_sha!==releaseCandidate.sha||
  ci.independently_verified!==true||ci.test_source_pinned!==true||
  !Number.isSafeInteger(ci.run_id)||ci.run_id<1)
  return response('GOVERNED_RELEASE_SWITCH_PINNED_CI_MISSING',{
   provider_write_attempted:false
  });
 if(ownerApproval?.status!=='EXACT_PREVIEW_RELEASE_OWNER_APPROVED'||
  ownerApproval.owner_id!==ownerId||
  ownerApproval.shift_id!==shiftId||
  ownerApproval.release_sha!==releaseCandidate.sha||
  ownerApproval.capability_key!==capabilityKey||
  ownerApproval.scheduled_alias!==scheduled.host||
  !matchesWorkerReleaseAuthority(releaseCandidate,ownerApproval)||
  !HASH.test(ownerApproval.receipt_sha256||'')||
  ownerApproval.production_change_permitted!==false)
  return response('GOVERNED_RELEASE_SWITCH_EXACT_OWNER_APPROVAL_REQUIRED',{
   next_governed_action:'PRESENT_PINNED_RELEASE_AND_CRON_TARGET_FOR_OWNER_APPROVAL',
   provider_write_attempted:false
  });
 // The existing delivery path independently re-reads the Vercel alias,
 // atomically claims the owner-authorized one-use database grant, fences
 // against alias drift, writes once and independently observes the result.
 const delivery=await deliverOnceApprovedSignedWorkerCapability({
  env,ownerId,shiftId,targetReleaseSha:releaseCandidate.sha,
  targetReleaseRef:releaseCandidate.branch,capabilityKey,
  scheduledAlias:scheduled.host,releaseCandidate,ci,
  claimApprovedRelease,observeAlias,assignAlias
 });
 if(delivery.status!=='SIGNED_CAPABILITY_DELIVERY_ALIAS_VERIFIED_AWAITING_WORKER_WAKE'&&
    delivery.status!=='SIGNED_CAPABILITY_DELIVERY_ALIAS_ALREADY_TARGET_NO_REPLAY')
  return response('GOVERNED_RELEASE_SWITCH_DELIVERY_NOT_CONFIRMED',{
   delivery_status:delivery.status,
   next_governed_action:delivery.next_governed_action||
    'RECONCILE_EXACT_RELEASE_DELIVERY',
   provider_write_attempted:delivery.provider_assignment_attempted===true
  });
 let after;
 try{after=await readSchedule()}catch{
  return response('GOVERNED_RELEASE_SWITCH_POSTDELIVERY_SCHEDULE_READ_UNAVAILABLE',{
   provider_write_attempted:delivery.provider_assignment_attempted===true,
   next_governed_action:'READ_SCHEDULE_WITHOUT_REPLAY'
  });
 }
 if(!sameSchedule(scheduled,after))
  return response('GOVERNED_RELEASE_SWITCH_SCHEDULE_DRIFT_NO_REPLAY',{
   provider_write_attempted:delivery.provider_assignment_attempted===true,
   next_governed_action:'RECONCILE_POSTDELIVERY_SCHEDULE_WITHOUT_REPLAY'
  });
 return response('GOVERNED_RELEASE_SWITCH_DELIVERED_AWAITING_SIGNED_WORKER_WAKE',{
  provider_write_attempted:delivery.provider_assignment_attempted===true,
  scheduled_alias:scheduled.host,
  delivery_status:delivery.status,
  target_release_sha:releaseCandidate.sha,
  next_governed_action:'VERIFY_NEXT_ACTUAL_SIGNED_WORKER_RELEASE_AND_HANDLER'
 });
}
