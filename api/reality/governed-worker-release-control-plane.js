// Independent authenticated release control plane. Never scheduled inside
// the employee worker and never exposed to underlying LLM tool invocation.
// Read-only inspection is separate from a one-use explicitly owner-approved
// release switch. This endpoint cannot touch cron or mint owner authority.
import crypto from 'node:crypto';
import {shiftDatabase} from '../../src/reality-governed-shift-boundary-v1.js';
import {createTrustedSignedWorkerReleaseControlPlaneAdapters,releaseFailureReceipt}
 from '../../src/reality-governed-signed-worker-control-plane-adapters-v1.js';
import {qualifyCurrentIsolatedSignedWorkerRelease}
 from '../../src/reality-governed-release-independent-qualification-v1.js';
import {triggerOneGovernedSignedWorkerReleaseSwitch}
 from '../../src/reality-governed-signed-worker-release-switch-trigger-v1.js';
export const maxDuration=30;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/;
const KEY=/^[A-Z][A-Z0-9_]{3,110}$/;
export function authorizedReleaseOperator(authorization,secret){
 if(typeof authorization!=='string'||typeof secret!=='string'||
  !/^[a-f0-9]{64}$/.test(secret)||!authorization.startsWith('Bearer '))
  return false;
 const candidate=authorization.slice(7);
 return /^[a-f0-9]{64}$/.test(candidate)&&
  crypto.timingSafeEqual(Buffer.from(candidate),Buffer.from(secret));
}
const result=(res,code,status,extra={})=>res.status(code).json({
 status,...extra,production_changed:false,original_job_completed:false,
 owner_approval_granted_by_controller:false,new_shift_started:false
});
export default async function handler(req,res){
 res.setHeader('Cache-Control','private,no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST')
  return res.status(405).setHeader('Allow','POST').json({
   status:'GOVERNED_RELEASE_CONTROL_POST_ONLY'});
 // The target SHA/branch remain explicitly pinned. For a transport release
 // only, the current provider deployment ID is authoritative; a deploy
 // cannot contain its own as-yet-unassigned ID at build time.
 const env=process.env.REALITY_SIGNED_WORKER_TARGET_CAPABILITY_KEY==='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'?
  {...process.env,REALITY_SIGNED_WORKER_TARGET_DEPLOYMENT_ID:process.env.VERCEL_DEPLOYMENT_ID}:process.env;
 if(env.VERCEL_ENV!=='preview'||
   !authorizedReleaseOperator(req.headers?.authorization,
    env.REALITY_RELEASE_CONTROL_OPERATOR_TOKEN))
  return result(res,403,'GOVERNED_RELEASE_CONTROL_OPERATOR_AUTH_REQUIRED');
 if(Object.keys(req.query||{}).length||
  !req.body||typeof req.body!=='object'||
  Array.isArray(req.body)||Object.getPrototypeOf(req.body)!==Object.prototype||
  Object.keys(req.body).join(',')!=='intent'||
  !['INSPECT','PREPARE_EXACT_RELEASE','SWITCH_EXACT_APPROVED_RELEASE'].includes(req.body.intent))
  return result(res,400,'GOVERNED_RELEASE_CONTROL_INTENT_INVALID');
 let adapters=null;
 try{
  const db=shiftDatabase(env);
  adapters=createTrustedSignedWorkerReleaseControlPlaneAdapters({
   env,db,fetchImpl:fetch,inspectionOnly:req.body.intent==='INSPECT'
  });
  if(adapters.ready!==true)
   return result(res,503,'RELEASE_CONTROL_TRUSTED_ADAPTERS_NOT_READY');
  if(req.body.intent==='INSPECT'&&db.project===env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF){
   const direction=await adapters.readDirection({ownerId:env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_OWNER_ID,
    shiftId:env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_SHIFT_ID});
   return result(res,200,direction.status,{direction,read_only:true,release_switch_attempted:false});
  }
  const schedule=await adapters.readSchedule();
  const currentAlias=await adapters.observeAlias(schedule.host);
  const current={
   job_id:schedule.job_id,scheduled_host:schedule.host,
   cron_active:schedule.active,
   running_alias_release_sha:currentAlias.resolved_release_sha,
   branch_automanaged:schedule.branch_automanaged,
   dedicated_stable_release_alias:schedule.dedicated_stable_release_alias
  };
  if(req.body.intent==='INSPECT')
   return result(res,200,
    schedule.dedicated_stable_release_alias===true?
     'GOVERNED_RELEASE_SCHEDULE_AND_ALIAS_INDEPENDENTLY_READ':
     'GOVERNED_RELEASE_STABLE_ALIAS_MIGRATION_REQUIRED',{
      current,read_only:true,release_switch_attempted:false,
      next_governed_action:schedule.dedicated_stable_release_alias===true?
       'QUALIFY_ISOLATED_RELEASE_AND_EXACT_OWNER_APPROVAL':
       'MIGRATE_CRON_TO_DEDICATED_STABLE_ALIAS_WITH_FENCED_OWNER_AUTHORITY'
     });
  // A branch-managed alias can be reassigned automatically by Vercel.
  // No capability installation while the old cron binding remains.
  if(schedule.dedicated_stable_release_alias!==true||
    schedule.branch_automanaged!==false)
   return result(res,409,
    'GOVERNED_RELEASE_STABLE_ALIAS_MIGRATION_REQUIRED',{
     current,release_switch_attempted:false
    });
  const canonical=env.REALITY_RELEASE_CONTROL_RUNTIME_TOPOLOGY==='CANONICAL_BENCHMARK_PREVIEW';
  const direction=canonical?await adapters.readDirection({ownerId:env.REALITY_SIGNED_WORKER_RELEASE_OWNER_ID,
    shiftId:env.REALITY_SIGNED_WORKER_RELEASE_SHIFT_ID}):null;
  const proof=await qualifyCurrentIsolatedSignedWorkerRelease({
   env,dbProject:db.project,db,fetchImpl:fetch,direction
  });
  if(proof.status!==(canonical?'QUALIFIED_EXACT_CANONICAL_SIGNED_WORKER_RELEASE_READ_ONLY':
    'QUALIFIED_EXACT_ISOLATED_SIGNED_WORKER_RELEASE_READ_ONLY'))
   return result(res,409,'GOVERNED_RELEASE_INDEPENDENT_QUALIFICATION_BLOCKED',{
    qualification_status:proof.status,
    provider_failure:proof.provider_failure??null,
    next_governed_action:proof.provider_failure?.next_governed_action??'RECONCILE_EXISTING_QUALIFICATION_REQUIREMENT',
    release_switch_attempted:false
   });
  if(!UUID.test(env.REALITY_SIGNED_WORKER_RELEASE_OWNER_ID||'')||
   !UUID.test(env.REALITY_SIGNED_WORKER_RELEASE_SHIFT_ID||'')||
   !SHA.test(env.REALITY_SIGNED_WORKER_TARGET_RELEASE_SHA||'')||
   !KEY.test(env.REALITY_SIGNED_WORKER_TARGET_CAPABILITY_KEY||''))
   return result(res,503,'GOVERNED_RELEASE_PINNED_OWNER_OR_CAPABILITY_MISSING');
  const approval=await adapters.readApprovedRelease({
   owner_id:env.REALITY_SIGNED_WORKER_RELEASE_OWNER_ID,
   shift_id:env.REALITY_SIGNED_WORKER_RELEASE_SHIFT_ID,
   release_sha:env.REALITY_SIGNED_WORKER_TARGET_RELEASE_SHA,
   scheduled_alias:env.REALITY_SIGNED_WORKER_STABLE_ALIAS,
   capability_key:env.REALITY_SIGNED_WORKER_TARGET_CAPABILITY_KEY
  });
  if(approval?.status==='SIGNED_RELEASE_EXACT_OWNER_APPROVAL_NOT_FOUND'){
   // A qualified but unapproved release must produce a durable owner packet
   // using the existing controller, not simply report a missing approval.
   // The DB rejects a missing authorized shift and stale/different packets.
   const packet=await adapters.prepareExactRelease({
    qualification:proof,schedule,currentAlias
   });
   return result(res,409,packet.status,{
    release_preparation:packet,release_switch_attempted:false,
    next_governed_action:packet.status==='SIGNED_RELEASE_EXACT_OWNER_PACKET_PREPARED'?
     'PRESENT_EXACT_OWNER_RELEASE_PACKET':
     'RECONCILE_EXISTING_RELEASE_PACKET_WITHOUT_REPLAY'
   });
  }
  if(approval?.status!=='EXACT_PREVIEW_RELEASE_OWNER_APPROVED')
   return result(res,409,'GOVERNED_RELEASE_EXACT_OWNER_APPROVAL_PENDING',{
    release_switch_attempted:false
   });
  if(req.body.intent==='PREPARE_EXACT_RELEASE')
   return result(res,200,'GOVERNED_RELEASE_EXISTING_EXACT_APPROVAL_READ',{
    release_switch_attempted:false,
    next_governed_action:'SWITCH_EXACT_APPROVED_RELEASE_UNDER_EXISTING_ONE_USE_CLAIM'
   });
  // Only the existing governed delivery executor can consume the exact
  // one-use database claim before one provider alias POST.
  const action=await triggerOneGovernedSignedWorkerReleaseSwitch({
   env,ownerId:env.REALITY_SIGNED_WORKER_RELEASE_OWNER_ID,
   shiftId:env.REALITY_SIGNED_WORKER_RELEASE_SHIFT_ID,
   capabilityKey:env.REALITY_SIGNED_WORKER_TARGET_CAPABILITY_KEY,
   releaseCandidate:proof.candidate,ci:proof.ci,ownerApproval:approval,
   readSchedule:adapters.readSchedule,
   observeAlias:adapters.observeAlias,
   claimApprovedRelease:adapters.claimApprovedRelease,
   assignAlias:adapters.assignAlias
  });
  let governedTrigger=null;
  if(action.status==='GOVERNED_RELEASE_SWITCH_DELIVERED_AWAITING_SIGNED_WORKER_WAKE'&&
   canonical&&env.REALITY_SIGNED_WORKER_TARGET_CAPABILITY_KEY==='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'){
   try{governedTrigger=await adapters.recordObservedReviewDelivery();}
   catch(error){governedTrigger={status:'REVIEW_RELEASE_ALIAS_OBSERVATION_UNVERIFIED_NO_REPLAY',wake_queued:false,provider_failure:releaseFailureReceipt(error)??adapters.readLastProviderFailure()};}
  }
  return result(res,200,action.status,{
   governed_trigger_observation:governedTrigger,
   delivery_status:action.delivery_status??null,
   provider_failure:adapters.readLastProviderFailure(),
   provider_write_attempted:action.provider_write_attempted===true,
   next_governed_action:action.next_governed_action??
    'READ_ACTUAL_SIGNED_WORKER_RELEASE_WAKE',
   signed_worker_new_release_observed:false
  });
 }catch(error){
  // Never return raw provider exceptions, request URLs, bodies or credentials.
  const failure=releaseFailureReceipt(error)??adapters?.readLastProviderFailure()??null;
  return result(res,503,'GOVERNED_RELEASE_CONTROL_INDEPENDENT_READ_OR_CLAIM_FAILED',{
   provider_failure:failure,
   next_governed_action:failure?.next_governed_action??'READ_PROVIDER_AND_DATABASE_STATE_WITHOUT_REPLAY'
  });
 }
}
