import test from 'node:test';
import assert from 'node:assert/strict';
import {attestSignedWorkerLoadedCapabilities as attest,
 assessSignedWorkerCapabilityActivation as assess,
 deliverOnceApprovedSignedWorkerCapability as deliver}
 from '../src/reality-signed-worker-capability-delivery-v1.js';

const owner='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const shift='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const old='1'.repeat(40), next='2'.repeat(40);
const branch='feature/governed-capability-preview';
const action='REQUALIFY_EXISTING_CONTINUITY_SOURCE';
const wake={status:'SHIFT_WORKER_PULSE_DURABLY_RECORDED',shift_id:shift};
const graph={status:'UNIFIED_OWNER_JOB_CONTROL_READY',
 owner_id:owner,shift_id:shift,installation_authorized:false,
 production_changed:false};
const env=(sha=next)=>({VERCEL_ENV:'preview',
 VERCEL_GIT_COMMIT_SHA:sha,VERCEL_GIT_COMMIT_REF:branch});
const signed=(sha=next,actions=[action])=>attest({
 wake,graph,env:env(sha),registeredActionKeys:actions
});
const candidate={sha:next,branch,shift_id:shift,
 capability_key:action,environment:'ISOLATED_PREVIEW',
 provider_deployment_ready:true,preview_only:true,production_changed:false,
 operating_lane:'NORMAL_SIGNED_SHIFT',source_staging_only:false,
 isolated_database_independently_verified:true,
 owner_packet_handler_registered:true};
const ci={status:'INDEPENDENT_FROZEN_CI_PASSED',release_sha:next,
 independently_verified:true,test_source_pinned:true,run_id:2026};
const approval={status:'EXACT_PREVIEW_RELEASE_OWNER_APPROVED',
 owner_id:owner,shift_id:shift,release_sha:next,capability_key:action,
 target_environment:'ISOLATED_PREVIEW',receipt_sha256:'sha256:'+'c'.repeat(64),
 approved_at:'2026-11-22T20:00:00Z',production_change_permitted:false};
const alias={independently_observed:true,provider:'VERCEL',
 resolved_release_sha:next,resolved_branch:branch,
 preview_only:true,project_verified:true};
const check=(over={})=>assess({
 attestation:signed(),candidate,ci,approval,alias,
 targetActionKey:action,...over
});

test('signed worker attests the loaded version and real capability types only',()=>{
 const a=signed();
 assert.equal(a.status,'SIGNED_WORKER_RELEASE_AND_REGISTERED_ACTIONS_OBSERVED');
 assert.equal(a.running_release_sha,next);
 assert.deepEqual(a.registered_capability_keys,[action]);
 assert.equal(a.candidate_release_activated,false);
 assert.equal(a.model_tool_permission_granted,false);
 assert.equal(a.original_job_completed,false);
 assert.equal(a.installation_authorized,false);
});

test('missing/forged runtime identity and shift fail closed',()=>{
 assert.equal(attest({wake,graph,env:{VERCEL_ENV:'preview'},
  registeredActionKeys:[action]}).status,
 'SIGNED_WORKER_RUNNING_RELEASE_UNVERIFIED');
 assert.equal(attest({wake:{...wake,shift_id:owner},graph,env:env(),
  registeredActionKeys:[action]}).status,
 'SIGNED_WORKER_CAPABILITY_SCOPE_UNVERIFIED');
 assert.equal(attest({wake,graph,env:env(),registeredActionKeys:['foo']}).status,
 'SIGNED_WORKER_CAPABILITY_SCOPE_UNVERIFIED');
 assert.equal(check({attestation:{...signed(),candidate_release_activated:true}}).status,
 'SIGNED_WORKER_RUNTIME_ATTESTATION_MISSING');
});

test('a deploy-ready candidate with independent CI is not owner activation authority',()=>{
 const v=check({approval:null});
 assert.equal(v.status,
  'QUALIFIED_RELEASE_REQUIRES_EXACT_OWNER_ACTIVATION_AUTHORITY');
 assert.equal(v.next_governed_action,
  'PRESENT_EXACT_CAPABILITY_RELEASE_AND_SCOPE_FOR_OWNER_APPROVAL');
 assert.equal(v.owner_approval_granted,false);
 assert.equal(v.release_change_performed,false);
});

test('preview readiness cannot substitute for independent pinned CI',()=>{
 const x=check({ci:{...ci,release_sha:old}});
 assert.equal(x.status,'CANDIDATE_RELEASE_INDEPENDENT_CI_UNVERIFIED');
 assert.equal(x.capability_usable_by_llm,false);
});

test('an approval for another exact release is unusable',()=>{
 const v=check({approval:{...approval,release_sha:old}});
 assert.equal(v.status,
  'QUALIFIED_RELEASE_REQUIRES_EXACT_OWNER_ACTIVATION_AUTHORITY');
 assert.equal(v.owner_approval_granted,false);
});

test('independent provider alias readback must be available',()=>{
 const v=check({alias:{...alias,independently_observed:false}});
 assert.equal(v.status,'SCHEDULED_WORKER_PROVIDER_ALIAS_UNVERIFIED');
 assert.equal(v.alias_repointed,false);
});

test('old scheduled worker alias blocks delivery even if preview is ready',()=>{
 const v=check({alias:{...alias,resolved_release_sha:old}});
 assert.equal(v.status,'APPROVED_CAPABILITY_NOT_DELIVERED_TO_SCHEDULED_WORKER');
 assert.equal(v.observed_scheduled_release_sha,old);
 assert.equal(v.next_governed_action,
  'GOVERNED_EXACT_PREVIEW_RELEASE_ACTIVATION_REQUIRED');
 assert.equal(v.alias_change_authorized_by_evaluator,false);
});

test('correct alias alone is not proof the signed worker ran new release',()=>{
 const v=check({attestation:signed(old)});
 assert.equal(v.status,'SCHEDULED_WORKER_NOT_YET_ATTESTED_APPROVED_RELEASE');
 assert.equal(v.next_governed_action,'OBSERVE_NEXT_ACTUAL_SIGNED_WORKER_WAKE');
 assert.equal(v.original_job_completed,false);
});

test('matching installed code still needs its registered action handler',()=>{
 const v=check({attestation:signed(next,[])});
 assert.equal(v.status,'APPROVED_RELEASE_LOADED_HANDLER_NOT_REGISTERED');
 assert.equal(v.next_governed_action,
  'REGISTER_AND_INDEPENDENTLY_TEST_EXACT_CAPABILITY_ADAPTER');
 assert.equal(v.capability_usable_by_llm,false);
});

test('fully matched preview remains governed; no implied LLM tool rights or settlement',()=>{
 const v=check();
 assert.equal(v.status,
  'APPROVED_CAPABILITY_LOADED_AWAITING_SIGNED_EXECUTOR_CLAIM');
 assert.equal(v.release_identity_matches,true);
 assert.equal(v.verified_capability_key,action);
 assert.equal(v.next_governed_action,
  'CLAIM_EXACT_GOVERNED_ACTION_AND_INDEPENDENTLY_VERIFY_OUTCOME');
 for(const field of ['release_change_performed','alias_repointed',
  'capability_usable_by_llm','execution_authorized','owner_approval_granted',
  'repair_executed','original_job_completed','production_changed'])
  assert.equal(v[field],false,field);
});

test('arbitrary signed capability types and owner shifts use the same contract',()=>{
 const custom='RECONCILE_PROVIDER_EFFECT_WITHOUT_REPLAY';
 const otherOwner='dddddddd-dddd-4ddd-dddd-dddddddddddd';
 const customWake={...wake,shift_id:otherOwner};
 const customGraph={...graph,owner_id:otherOwner,shift_id:otherOwner};
 const customAtt=attest({wake:customWake,graph:customGraph,env:env(),
  registeredActionKeys:[custom]});
 const v=assess({attestation:customAtt,
  candidate:{...candidate,shift_id:otherOwner,capability_key:custom},
  ci,approval:{...approval,owner_id:otherOwner,shift_id:otherOwner,
   capability_key:custom},alias,targetActionKey:custom});
 assert.equal(v.status,
  'APPROVED_CAPABILITY_LOADED_AWAITING_SIGNED_EXECUTOR_CLAIM');
 assert.equal(v.capability_usable_by_llm,false);
});


const aliasName='governed-worker-preview.vercel.app';
const claimId='eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee';
const validOldAlias={provider:'VERCEL',independently_observed:true,
 preview_only:true,project_verified:true,
 resolved_release_sha:old,resolved_branch:'repair/old-worker-branch'};
const validNewAlias={...validOldAlias,resolved_release_sha:next,
 resolved_branch:branch};
const authorizedClaim={status:'EXACT_SIGNED_CAPABILITY_DELIVERY_CLAIMED',
 owner_id:owner,shift_id:shift,release_sha:next,release_ref:branch,
 capability_key:action,scheduled_alias:aliasName,
 previous_release_sha:old,
 previous_release_ref:validOldAlias.resolved_branch,
 independent_ci_run_id:ci.run_id,target_environment:'ISOLATED_PREVIEW',
 one_use_service_claim:true,owner_approved_exact_release:true,
 claim_id:claimId,approval_receipt_sha256:'sha256:'+'a'.repeat(64),
 production_change_permitted:false};
const deliveryArgs=(more={})=>({
 env:{...env(),'REALITY_SIGNED_CAPABILITY_DELIVERY_ENABLED':'true'},
 ownerId:owner,shiftId:shift,
 targetReleaseSha:next,targetReleaseRef:branch,capabilityKey:action,
 scheduledAlias:aliasName,releaseCandidate:candidate,ci,
 claimApprovedRelease:async()=>authorizedClaim,
 observeAlias:async()=>validOldAlias,
 assignAlias:async()=>({provider:'VERCEL',alias:aliasName,
  release_sha:next,claim_id:claimId}),
 ...more
});
test('delivery is disabled without the explicit signed installer feature gate',async()=>{
 let claims=0,writes=0;
 const v=await deliver(deliveryArgs({
  env:env(),claimApprovedRelease:async()=>{claims++;return authorizedClaim},
  assignAlias:async()=>{writes++}
 }));
 assert.equal(v.status,'SIGNED_CAPABILITY_DELIVERY_SERVICE_BOUNDARY_UNVERIFIED');
 assert.equal(claims,0);assert.equal(writes,0);
});
test('owner claim absent: never call provider alias mutation',async()=>{
 let writes=0;
 const v=await deliver(deliveryArgs({
  claimApprovedRelease:async()=>({...authorizedClaim,owner_approved_exact_release:false}),
  assignAlias:async()=>{writes++}
 }));
 assert.equal(v.status,'SIGNED_CAPABILITY_DELIVERY_EXACT_OWNER_AUTHORITY_MISSING');
 assert.equal(writes,0);
 assert.equal(v.original_job_completed,false);
});
test('existing alias at target is read only, never a repeated write',async()=>{
 let claims=0,writes=0;
 const v=await deliver(deliveryArgs({
  observeAlias:async()=>validNewAlias,
  claimApprovedRelease:async()=>{claims++;return authorizedClaim},
  assignAlias:async()=>{writes++}
 }));
 assert.equal(v.status,'SIGNED_CAPABILITY_DELIVERY_ALIAS_ALREADY_TARGET_NO_REPLAY');
 assert.equal(claims,0);assert.equal(writes,0);
});
test('wrong pinned CI stops before owner claim or any effect',async()=>{
 let calls=0;
 const v=await deliver(deliveryArgs({
  ci:{...ci,release_sha:old},
  claimApprovedRelease:async()=>{calls++;return authorizedClaim}
 }));
 assert.equal(v.status,'SIGNED_CAPABILITY_DELIVERY_PINNED_CI_OR_RELEASE_UNVERIFIED');
 assert.equal(calls,0);
});
test('prewrite provider drift fences already claimed release',async()=>{
 let reads=0,writes=0;
 const v=await deliver(deliveryArgs({
  observeAlias:async()=>++reads===1?validOldAlias:validNewAlias,
  assignAlias:async()=>{writes++}
 }));
 assert.equal(v.status,'SIGNED_CAPABILITY_DELIVERY_OLD_ALIAS_DRIFT_NO_WRITE');
 assert.equal(writes,0);
});
test('provider write timeout is uncertain effect, never replay',async()=>{
 let attempts=0,reads=0;
 const v=await deliver(deliveryArgs({
  observeAlias:async()=>{reads++;return validOldAlias},
  assignAlias:async()=>{attempts++;throw Error('provider timeout')}
 }));
 assert.equal(v.status,
  'SIGNED_CAPABILITY_DELIVERY_PROVIDER_EFFECT_UNKNOWN_NO_REPLAY');
 assert.equal(v.provider_assignment_attempted,true);
 assert.equal(attempts,1);assert.equal(reads,2);
 assert.equal(v.original_job_completed,false);
});
test('provider response does not bypass independent alias proof',async()=>{
 let reads=0;
 const v=await deliver(deliveryArgs({
  observeAlias:async()=>{reads++;return validOldAlias}
 }));
 assert.equal(v.status,
  'SIGNED_CAPABILITY_DELIVERY_PROVIDER_EFFECT_UNVERIFIED_NO_REPLAY');
 assert.equal(reads,3);
});
test('even independently verified alias activation waits for signed worker',async()=>{
 let reads=0,writes=0;
 const v=await deliver(deliveryArgs({
  observeAlias:async()=>++reads>=3?validNewAlias:validOldAlias,
  assignAlias:async()=>{writes++;return{
   provider:'VERCEL',alias:aliasName,release_sha:next,claim_id:claimId
  }}
 }));
 assert.equal(v.status,
  'SIGNED_CAPABILITY_DELIVERY_ALIAS_VERIFIED_AWAITING_WORKER_WAKE');
 assert.equal(v.independent_alias_verified,true);
 assert.equal(v.signed_worker_new_release_observed,false);
 assert.equal(v.original_job_completed,false);
 assert.equal(v.model_tool_permission_granted,false);
 assert.equal(writes,1);assert.equal(reads,3);
});


test('staging-only candidate cannot be installed even with matching CI and owner claim',async()=>{
 let claims=0,writes=0;
 const r=await deliver(deliveryArgs({
  releaseCandidate:{...candidate,operating_lane:'STAGING_ONLY',
   source_staging_only:true},
  claimApprovedRelease:async()=>{claims++;return authorizedClaim},
  assignAlias:async()=>{writes++}
 }));
 assert.equal(r.status,'SIGNED_CAPABILITY_DELIVERY_PINNED_CI_OR_RELEASE_UNVERIFIED');
 assert.equal(r.provider_assignment_attempted,false);
 assert.equal(claims,0);assert.equal(writes,0);
});
test('unverified database isolation or unregistered packet handler bars cutover',async()=>{
 for(const bad of [
  {isolated_database_independently_verified:false},
  {owner_packet_handler_registered:false}
 ]){
  let writes=0;
  const r=await deliver(deliveryArgs({
   releaseCandidate:{...candidate,...bad},
   assignAlias:async()=>{writes++}
  }));
  assert.equal(r.status,'SIGNED_CAPABILITY_DELIVERY_PINNED_CI_OR_RELEASE_UNVERIFIED');
  assert.equal(writes,0);
 }
});
