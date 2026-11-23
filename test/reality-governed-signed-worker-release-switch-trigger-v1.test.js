import test from 'node:test';
import assert from 'node:assert/strict';
import {triggerOneGovernedSignedWorkerReleaseSwitch as trigger}
 from '../src/reality-governed-signed-worker-release-switch-trigger-v1.js';

const owner='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const shift='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const old='1'.repeat(40),next='2'.repeat(40);
const branch='feature/qualified-final-loop';
const capability='PREPARE_FINAL_LOOP_CHILD_OWNER_PACKET';
const stable='reality-governed-worker-preview.vercel.app';
const claimId='cccccccc-cccc-4ccc-cccc-cccccccccccc';
const ci={status:'INDEPENDENT_FROZEN_CI_PASSED',release_sha:next,
 independently_verified:true,test_source_pinned:true,run_id:2026};
const schedule={status:'GOVERNED_SCHEDULE_INDEPENDENTLY_READ',
 job_id:7,provider:'SUPABASE_PG_CRON',active:true,
 host:stable,schedule:'*/5 * * * *',method:'POST',
 endpoint_path:'/api/reality/governed-employee-shift-worker',
 credential_values_exposed:false,signed_worker_target_verified:true,
 dedicated_stable_release_alias:true,branch_automanaged:false};
const candidate={sha:next,branch,shift_id:shift,
 capability_key:capability,scheduled_alias:stable,
 environment:'ISOLATED_PREVIEW',preview_only:true,
 provider_deployment_ready:true,production_changed:false,
 operating_lane:'NORMAL_SIGNED_SHIFT',source_staging_only:false,
 isolated_database_independently_verified:true,
 owner_packet_handler_registered:true};
const approval={status:'EXACT_PREVIEW_RELEASE_OWNER_APPROVED',
 owner_id:owner,shift_id:shift,release_sha:next,
 capability_key:capability,scheduled_alias:stable,
 target_environment:'ISOLATED_PREVIEW',
 receipt_sha256:'sha256:'+'a'.repeat(64),
 production_change_permitted:false};
const oldAlias={provider:'VERCEL',independently_observed:true,
 preview_only:true,project_verified:true,
 resolved_release_sha:old,resolved_branch:'repair/old-maintenance'};
const nextAlias={...oldAlias,resolved_release_sha:next,resolved_branch:branch};
const claim={status:'EXACT_SIGNED_CAPABILITY_DELIVERY_CLAIMED',
 owner_id:owner,shift_id:shift,release_sha:next,release_ref:branch,
 capability_key:capability,scheduled_alias:stable,
 previous_release_sha:old,
 previous_release_ref:oldAlias.resolved_branch,
 independent_ci_run_id:ci.run_id,target_environment:'ISOLATED_PREVIEW',
 one_use_service_claim:true,owner_approved_exact_release:true,
 claim_id:claimId,approval_receipt_sha256:'sha256:'+'b'.repeat(64),
 production_change_permitted:false};
const env={VERCEL_ENV:'preview',REALITY_SIGNED_CAPABILITY_DELIVERY_ENABLED:'true',
 REALITY_GOVERNED_RELEASE_SWITCH_TRIGGER_ENABLED:'true'};
function fixture(over={}){
 let aliasReadCount=0,claims=0,writes=0,scheduleReads=0;
 const args={env,ownerId:owner,shiftId:shift,
  capabilityKey:capability,releaseCandidate:candidate,ci,
  ownerApproval:approval,
  readSchedule:async()=>{scheduleReads++;return schedule},
  observeAlias:async()=>{aliasReadCount++;return aliasReadCount===3?nextAlias:oldAlias},
  claimApprovedRelease:async()=>{claims++;return claim},
  assignAlias:async()=>{writes++;return {provider:'VERCEL',alias:stable,
   release_sha:next,claim_id:claimId}},...over};
 return {args,counts:()=>({aliasReadCount,claims,writes,scheduleReads})};
}
test('the currently scheduled Git branch alias cannot be silently repointed',async()=>{
 const f=fixture({readSchedule:async()=>({...schedule,
  host:'reality-git-repair-branch-123.vercel.app',
  dedicated_stable_release_alias:false,branch_automanaged:true})});
 const r=await trigger(f.args);
 assert.equal(r.status,'GOVERNED_RELEASE_SWITCH_STABLE_ALIAS_MIGRATION_REQUIRED');
 assert.equal(f.counts().claims,0);
 assert.equal(f.counts().writes,0);
});
test('no direct switch without an explicitly enabled independent control plane',async()=>{
 const f=fixture({env:{...env,REALITY_GOVERNED_RELEASE_SWITCH_TRIGGER_ENABLED:'false'}});
 const r=await trigger(f.args);
 assert.equal(r.status,'GOVERNED_RELEASE_SWITCH_SERVICE_BOUNDARY_NOT_READY');
 assert.equal(f.counts().scheduleReads,0);
 assert.equal(f.counts().writes,0);
});
test('unverified schedule and wrong target never reach release installer',async()=>{
 for(const s of [
  {...schedule,active:false},
  {...schedule,credential_values_exposed:true},
  {...schedule,signed_worker_target_verified:false}
 ]){
  const f=fixture({readSchedule:async()=>s});
  assert.equal((await trigger(f.args)).status,
   'GOVERNED_RELEASE_SWITCH_SCHEDULE_NOT_VERIFIED');
  assert.equal(f.counts().writes,0);
 }
 const bad=fixture({releaseCandidate:{...candidate,scheduled_alias:'another.vercel.app'}});
 assert.equal((await trigger(bad.args)).status,
  'GOVERNED_RELEASE_SWITCH_QUALIFIED_EXECUTION_RELEASE_MISSING');
 assert.equal(bad.counts().writes,0);
});
test('staging-only or non-isolated release never reaches owner claim or Vercel',async()=>{
 for(const bad of [
  {source_staging_only:true,operating_lane:'STAGING_ONLY'},
  {isolated_database_independently_verified:false},
  {owner_packet_handler_registered:false}
 ]){
  const f=fixture({releaseCandidate:{...candidate,...bad}});
  assert.equal((await trigger(f.args)).status,
   'GOVERNED_RELEASE_SWITCH_QUALIFIED_EXECUTION_RELEASE_MISSING');
  assert.equal(f.counts().claims,0);
  assert.equal(f.counts().writes,0);
 }
});
test('a different release approval is not a release authority',async()=>{
 const f=fixture({ownerApproval:{...approval,release_sha:old}});
 const r=await trigger(f.args);
 assert.equal(r.status,'GOVERNED_RELEASE_SWITCH_EXACT_OWNER_APPROVAL_REQUIRED');
 assert.equal(f.counts().claims,0);
 assert.equal(f.counts().writes,0);
});
test('a real one-use claim and postwrite provider read still do not prove live activation',async()=>{
 const f=fixture();
 const r=await trigger(f.args);
 assert.equal(r.status,'GOVERNED_RELEASE_SWITCH_DELIVERED_AWAITING_SIGNED_WORKER_WAKE');
 assert.equal(r.provider_write_attempted,true);
 assert.equal(r.scheduled_worker_new_release_observed,false);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.production_changed,false);
 assert.equal(f.counts().writes,1);
 assert.equal(f.counts().claims,1);
 assert.equal(f.counts().scheduleReads,2);
});
test('unknown provider write effect stops with no automatic replay',async()=>{
 const f=fixture({assignAlias:async()=>{throw Error('timeout after effect')}});
 const r=await trigger(f.args);
 assert.equal(r.status,'GOVERNED_RELEASE_SWITCH_DELIVERY_NOT_CONFIRMED');
 assert.equal(r.delivery_status,'SIGNED_CAPABILITY_DELIVERY_PROVIDER_EFFECT_UNKNOWN_NO_REPLAY');
 assert.equal(r.provider_write_attempted,true);
 assert.equal(r.scheduled_worker_new_release_observed,false);
});
test('postdelivery schedule drift is not treated as activation',async()=>{
 let count=0;
 const f=fixture({readSchedule:async()=>{count++;return count===2?
  {...schedule,host:'other-worker.vercel.app'}:schedule}});
 const r=await trigger(f.args);
 assert.equal(r.status,'GOVERNED_RELEASE_SWITCH_SCHEDULE_DRIFT_NO_REPLAY');
 assert.equal(r.original_job_completed,false);
 assert.equal(f.counts().writes,1);
});
