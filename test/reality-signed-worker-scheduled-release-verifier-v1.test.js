import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyActuallyCompletedSignedWorkerRelease as verify}
 from '../src/reality-signed-worker-scheduled-release-verifier-v1.js';

const sha='a'.repeat(40),old='b'.repeat(40);
const owner='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const shift='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const run='cccccccc-cccc-4ccc-cccc-cccccccccccc';
const branch='feature/final-loop-accepted';
const aliasHost='reality-governed-worker-preview.vercel.app';
const capability='PREPARE_FINAL_LOOP_CHILD_OWNER_PACKET';
const at=delta=>new Date(Date.now()+delta).toISOString();
const approved=at(-200000),activated=at(-120000),start=at(-90000),finish=at(-70000);
const schedule={status:'GOVERNED_SCHEDULE_INDEPENDENTLY_READ',job_id:7,
 active:true,method:'POST',
 endpoint_path:'/api/reality/governed-employee-shift-worker',
 host:aliasHost,dedicated_stable_release_alias:true,
 branch_automanaged:false,credential_values_exposed:false,
 signed_worker_target_verified:true};
const candidate={sha,branch,shift_id:shift,capability_key:capability,
 scheduled_alias:aliasHost,environment:'ISOLATED_PREVIEW',
 preview_only:true,provider_deployment_ready:true,
 operating_lane:'NORMAL_SIGNED_SHIFT',source_staging_only:false,
 isolated_database_independently_verified:true,
 owner_packet_handler_registered:true,production_changed:false};
const ci={status:'INDEPENDENT_FROZEN_CI_PASSED',release_sha:sha,
 independently_verified:true,test_source_pinned:true,run_id:123};
const approval={status:'EXACT_PREVIEW_RELEASE_OWNER_APPROVED',owner_id:owner,
 shift_id:shift,release_sha:sha,capability_key:capability,
 scheduled_alias:aliasHost,target_environment:'ISOLATED_PREVIEW',
 production_change_permitted:false,receipt_sha256:'sha256:'+'1'.repeat(64),
 approved_at:approved};
const alias={provider:'VERCEL',independently_observed:true,
 project_verified:true,preview_only:true,alias:aliasHost,
 resolved_release_sha:sha,resolved_branch:branch};
const wake={worker_run_id:run,owner_id:owner,shift_id:shift,
 running_release_sha:sha,running_release_ref:branch,
 operating_lane:'NORMAL_SIGNED_SHIFT',
 registered_capabilities:[capability],
 release_receipt_sha256:'sha256:'+'2'.repeat(64),
 recorded_at:start,finished_at:finish};
const wakeReadback={status:'SIGNED_RELEASE_COMPLETED_WORKER_WAKES_READ_ONLY',
 read_only:true,shift_id:shift,release_activated:false,wakes:[wake]};
const check=(x={})=>verify({
 schedule,alias,candidate,ci,approval,wakeReadback,
 activationTime:activated,...x
});
test('actual completed wake is not enough to self-certify cron dispatch',()=>{
 const x=check();
 assert.equal(x.status,'ACTUAL_SIGNED_RELEASE_WAKE_OBSERVED_CRON_CAUSALITY_PENDING');
 assert.equal(x.actual_worker_release_verified,true);
 assert.equal(x.scheduled_worker_release_activated,false);
 assert.equal(x.scheduled_invocation_verified,false);
 assert.equal(x.model_tool_permission_granted,false);
});
test('exact separate cron-to-run evidence can satisfy deployment proof, not work',()=>{
 const x=check({cronInvocation:{
  status:'SIGNED_CRON_DISPATCH_BOUND_TO_WORKER_RUN',
  independently_verified:true,job_id:7,worker_run_id:run,
  scheduled_host:aliasHost}});
 assert.equal(x.status,'SCHEDULED_SIGNED_WORKER_RELEASE_AND_HANDLER_INDEPENDENTLY_VERIFIED');
 assert.equal(x.scheduled_worker_release_activated,true);
 assert.equal(x.original_job_completed,false);
 assert.equal(x.execution_authorized,false);
});
test('staging-only, unisolated or nonapproved code never qualifies',()=>{
 for(const bad of [
  {operating_lane:'STAGING_ONLY',source_staging_only:true},
  {isolated_database_independently_verified:false},
  {owner_packet_handler_registered:false}
 ])assert.equal(check({candidate:{...candidate,...bad}}).status,
  'INDEPENDENT_QUALIFIED_RELEASE_NOT_VERIFIED');
 assert.equal(check({approval:{...approval,release_sha:old}}).status,
  'EXACT_OWNER_RELEASE_AUTHORITY_MISSING');
});
test('provider alias at a different commit fails before considering wake',()=>{
 assert.equal(check({alias:{...alias,resolved_release_sha:old}}).status,
  'SCHEDULED_PROVIDER_ALIAS_NOT_AT_APPROVED_RELEASE');
});
test('incorrect or stale process evidence cannot prove the intended release',()=>{
 assert.equal(check({wakeReadback:{...wakeReadback,wakes:[{...wake,
  running_release_sha:old}]}}).status,
  'APPROVED_RELEASE_SIGNED_HANDLER_WAKE_NOT_YET_OBSERVED');
 assert.equal(check({wakeReadback:{...wakeReadback,wakes:[{...wake,
  recorded_at:at(-300000)}]}}).status,
  'APPROVED_RELEASE_SIGNED_HANDLER_WAKE_NOT_YET_OBSERVED');
 assert.equal(check({wakeReadback:{...wakeReadback,wakes:[{...wake,
  registered_capabilities:[]}]}}).status,
  'APPROVED_RELEASE_SIGNED_HANDLER_WAKE_NOT_YET_OBSERVED');
});
test('multiple legitimate five-minute wakes remain valid; newest is selected',()=>{
 const newer={...wake,worker_run_id:'dddddddd-dddd-4ddd-dddd-dddddddddddd',
  recorded_at:at(-40000),finished_at:at(-30000)};
 const x=check({wakeReadback:{...wakeReadback,wakes:[wake,newer]}});
 assert.equal(x.status,'ACTUAL_SIGNED_RELEASE_WAKE_OBSERVED_CRON_CAUSALITY_PENDING');
 assert.equal(x.matching_worker_run_id,newer.worker_run_id);
});
