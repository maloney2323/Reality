// Independent authenticated release control plane. Never scheduled inside
// the employee worker and never exposed to underlying LLM tool invocation.
// Read-only inspection is separate from a one-use explicitly owner-approved
// release switch. This endpoint cannot touch cron or mint owner authority.
import crypto from 'node:crypto';
import {authenticatedChatSession,assertSameOrigin} from '../../src/reality-private-chat-auth-v0.1.js';
import {shiftDatabase} from '../../src/reality-governed-shift-boundary-v1.js';
import {createTrustedSignedWorkerReleaseControlPlaneAdapters,releaseFailureReceipt}
 from '../../src/reality-governed-signed-worker-control-plane-adapters-v1.js';
import {qualifyCurrentIsolatedSignedWorkerRelease}
 from '../../src/reality-governed-release-independent-qualification-v1.js';
import {triggerOneGovernedSignedWorkerReleaseSwitch}
 from '../../src/reality-governed-signed-worker-release-switch-trigger-v1.js';
export const maxDuration=60;
const HASH=/^sha256:[a-f0-9]{64}$/;
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
// Separate authenticated-owner channel. Never accept owner identity, target,
 // provider credential or authority from a browser or the model.
export function validOwnerReleaseIntent(req){
 const b=req.body;
 if(req.method!=='POST'||Object.keys(req.query||{}).length||
  typeof req.headers?.host!=='string'||req.headers.origin!=='https://'+req.headers.host||
  !/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')||
  (req.headers['sec-fetch-site']&&req.headers['sec-fetch-site']!=='same-origin')||
  !b||Object.getPrototypeOf(b)!==Object.prototype)return false;
 const keys=Object.keys(b).sort().join(',');
 return (keys==='intent'&&b.intent==='OWNER_PREPARE_EXACT_RELEASE')||
  (keys==='intent,proposal_fingerprint,request_id'&&b.intent==='OWNER_APPROVE_EXACT_RELEASE'&&
   UUID.test(b.request_id||'')&&HASH.test(b.proposal_fingerprint||''));
}
export function ownerReleaseScopeMatches(session,db,env){
 return env.VERCEL_ENV==='preview'&&
  env.REALITY_RELEASE_CONTROL_RUNTIME_TOPOLOGY==='CANONICAL_BENCHMARK_PREVIEW'&&
  env.REALITY_RELEASE_CHAT_OWNER_ENABLED==='true'&&
  UUID.test(session?.user_id||'')&&session.user_id===env.REALITY_SIGNED_WORKER_RELEASE_OWNER_ID&&
  UUID.test(env.REALITY_SIGNED_WORKER_RELEASE_SHIFT_ID||'')&&db?.strictSecrets===true&&
  db.project===env.REALITY_RELEASE_CONTROL_DB_PROJECT_REF&&
  db.project===env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF&&
  db.project===env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF&&
  db.url===session.config?.url;
}
async function approveOwnerPacket(session,packet){
 // Existing SECURITY DEFINER RPC requires the authenticated user's JWT
 // and locks the exact unexpired packet. No service-role approval.
 const response=await fetch(session.config.url+'/rest/v1/rpc/reality_owner_approve_governed_signed_worker_release_v1',{
  method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000),
  headers:{apikey:session.config.key,Authorization:'Bearer '+session.access_token,
   'Content-Type':'application/json',Accept:'application/json'},
  body:JSON.stringify({p_request_id:packet.request_id,p_proposal_fingerprint:packet.proposal_fingerprint})
 });
 if(!response.ok)throw Error('OWNER_RELEASE_APPROVAL_RESPONSE_UNVERIFIED');
 return response.json();
}
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
 const ownerChannel=['OWNER_PREPARE_EXACT_RELEASE','OWNER_APPROVE_EXACT_RELEASE'].includes(req.body?.intent);
 const ownerApprove=ownerChannel&&req.body.intent==='OWNER_APPROVE_EXACT_RELEASE';
 if(env.VERCEL_ENV!=='preview'||(!ownerChannel&&
   !authorizedReleaseOperator(req.headers?.authorization,env.REALITY_RELEASE_CONTROL_OPERATOR_TOKEN)))
  return result(res,403,'GOVERNED_RELEASE_CONTROL_OPERATOR_AUTH_REQUIRED');
 if(ownerChannel&&!validOwnerReleaseIntent(req))
  return result(res,403,'GOVERNED_RELEASE_CHAT_EXACT_OWNER_ACTION_REQUIRED');
 if(!ownerChannel&&(Object.keys(req.query||{}).length||
  !req.body||typeof req.body!=='object'||
  Array.isArray(req.body)||Object.getPrototypeOf(req.body)!==Object.prototype||
  Object.keys(req.body).join(',')!=='intent'||
  !['INSPECT','PREPARE_EXACT_RELEASE','SWITCH_EXACT_APPROVED_RELEASE'].includes(req.body.intent)))
  return result(res,400,'GOVERNED_RELEASE_CONTROL_INTENT_INVALID');
 let adapters=null;
 try{
  let session=null;
  if(ownerChannel){
   assertSameOrigin(req);
   if(env.REALITY_RELEASE_CHAT_OWNER_ENABLED!=='true')return result(res,403,'GOVERNED_RELEASE_CHAT_NOT_ENABLED');
   session=await authenticatedChatSession(req,res,{env});
   if(!session)return result(res,401,'GOVERNED_RELEASE_CHAT_SIGN_IN_REQUIRED');
  }
  const db=shiftDatabase(env);
  if(ownerChannel&&!ownerReleaseScopeMatches(session,db,env))
   return result(res,403,'GOVERNED_RELEASE_CHAT_OWNER_SCOPE_DENIED');
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
    connection_recovery_checkpoint:proof.connection_recovery_checkpoint??null,
    next_governed_action:proof.provider_failure?.next_governed_action??'RECONCILE_EXISTING_QUALIFICATION_REQUIREMENT',
    release_switch_attempted:false
   });
  if(!UUID.test(env.REALITY_SIGNED_WORKER_RELEASE_OWNER_ID||'')||
   !UUID.test(env.REALITY_SIGNED_WORKER_RELEASE_SHIFT_ID||'')||
   !SHA.test(env.REALITY_SIGNED_WORKER_TARGET_RELEASE_SHA||'')||
   !KEY.test(env.REALITY_SIGNED_WORKER_TARGET_CAPABILITY_KEY||''))
   return result(res,503,'GOVERNED_RELEASE_PINNED_OWNER_OR_CAPABILITY_MISSING');
  const readApproval=()=>adapters.readApprovedRelease({
   owner_id:env.REALITY_SIGNED_WORKER_RELEASE_OWNER_ID,
   shift_id:env.REALITY_SIGNED_WORKER_RELEASE_SHIFT_ID,
   release_sha:env.REALITY_SIGNED_WORKER_TARGET_RELEASE_SHA,
   scheduled_alias:env.REALITY_SIGNED_WORKER_STABLE_ALIAS,
   capability_key:env.REALITY_SIGNED_WORKER_TARGET_CAPABILITY_KEY
  });
  let approval=await readApproval();
  if(approval?.status==='SIGNED_RELEASE_EXACT_OWNER_APPROVAL_NOT_FOUND'){
   // A qualified but unapproved release must produce a durable owner packet
   // using the existing controller, not simply report a missing approval.
   // The DB rejects a missing authorized shift and stale/different packets.
   const packet=await adapters.prepareExactRelease({
    qualification:proof,schedule,currentAlias
   });
   if(!ownerApprove)return result(res,409,packet.status,{
    release_preparation:packet,release_switch_attempted:false,
    next_governed_action:packet.status==='SIGNED_RELEASE_EXACT_OWNER_PACKET_PREPARED'?
     'PRESENT_EXACT_OWNER_RELEASE_PACKET':
     'RECONCILE_EXISTING_RELEASE_PACKET_WITHOUT_REPLAY'
   });
   // Requalification must reproduce the exact displayed immutable packet.
   if(packet.status!=='SIGNED_RELEASE_EXACT_OWNER_PACKET_PREPARED'||
      packet.request_id!==req.body.request_id||
      packet.proposal_fingerprint!==req.body.proposal_fingerprint)
    return result(res,409,'GOVERNED_RELEASE_CHAT_PACKET_CHANGED_NO_APPROVAL',{release_switch_attempted:false});
   const approved=await approveOwnerPacket(session,packet);
   if(approved?.status!=='EXACT_PREVIEW_RELEASE_OWNER_APPROVED'||
      approved.owner_id!==session.user_id||approved.shift_id!==packet.shift_id||
      approved.release_sha!==packet.release_sha||approved.release_ref!==packet.release_ref||
      approved.scheduled_alias!==packet.scheduled_alias||approved.capability_key!==packet.capability_key||
      approved.production_change_permitted!==false||approved.release_changed!==false||
      !HASH.test(approved.receipt_sha256||''))
    return result(res,409,'GOVERNED_RELEASE_CHAT_APPROVAL_UNVERIFIED_NO_REPLAY',{release_switch_attempted:false});
   approval=await readApproval();
   if(approval?.receipt_sha256!==approved.receipt_sha256)
    return result(res,409,'GOVERNED_RELEASE_CHAT_APPROVAL_READBACK_UNVERIFIED_NO_REPLAY',{release_switch_attempted:false});
  }else if(ownerApprove){
   return result(res,409,'GOVERNED_RELEASE_CHAT_EXISTING_APPROVAL_RECONCILE_NO_REPLAY',{release_switch_attempted:false});
  }
  if(approval?.status!=='EXACT_PREVIEW_RELEASE_OWNER_APPROVED')
   return result(res,409,'GOVERNED_RELEASE_EXACT_OWNER_APPROVAL_PENDING',{
    release_switch_attempted:false
   });
  if(req.body.intent==='PREPARE_EXACT_RELEASE'||req.body.intent==='OWNER_PREPARE_EXACT_RELEASE')
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
   signed_worker_new_release_observed:false,
   ...(ownerApprove?{owner_approval_receipt_sha256:approval.receipt_sha256}:{})
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
