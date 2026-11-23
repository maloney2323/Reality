import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectFinalLoopSignedWorkerOperatingLane as inspect}
 from '../src/reality-signed-worker-operating-lane-v1.js';

const sha='a'.repeat(40);
const ref='feature/isolated-final-loop';
const isolated='a'.repeat(20),shared='b'.repeat(20);
const config=(over={})=>({
 VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_SHA:sha,
 VERCEL_GIT_COMMIT_REF:ref,
 REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED:'true',
 REALITY_FINAL_LOOP_PR_SOURCE_PLAN_STAGING_ENABLED:'true',
 REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED:'true',
 REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF:isolated,
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:isolated,
 REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF:shared,
 REALITY_FINAL_LOOP_CHILD_APPROVAL_PREPARATION_ENABLED:'true',
 ...over
});
const check=(over={},project=isolated)=>inspect({env:config(over),dbProject:project});

test('staging-only release never qualifies as normal scheduled worker',()=>{
 const r=check({REALITY_FINAL_LOOP_PREVIEW_SOURCE_PLAN_WAKE_ONLY:'true'});
 assert.equal(r.status,'SOURCE_STAGING_ONLY_NOT_NORMAL_SCHEDULED_WORKER');
 assert.equal(r.operating_lane,'STAGING_ONLY');
 assert.equal(r.release_activation_verified,false);
 assert.equal(r.worker_execution_authorized,false);
});

test('runtime identity must come from actual preview process',()=>{
 assert.equal(check({VERCEL_GIT_COMMIT_SHA:''}).status,
  'SIGNED_WORKER_RUNTIME_RELEASE_IDENTITY_UNVERIFIED');
 assert.equal(check({VERCEL_ENV:'production'}).status,
  'SIGNED_WORKER_RUNTIME_RELEASE_IDENTITY_UNVERIFIED');
 assert.equal(check({VERCEL_GIT_COMMIT_REF:'../evil'}).status,
  'SIGNED_WORKER_RUNTIME_RELEASE_IDENTITY_UNVERIFIED');
});

test('source-only or shared benchmark config never proves isolated execution',()=>{
 assert.equal(check({REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED:'false'}).status,
  'FINAL_LOOP_WORKER_ISOLATED_DATABASE_NOT_CONFIGURED');
 assert.equal(check({},shared).status,
  'FINAL_LOOP_WORKER_ISOLATED_DATABASE_IDENTITY_UNVERIFIED');
 assert.equal(check({REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF:isolated}).status,
  'FINAL_LOOP_WORKER_ISOLATED_DATABASE_IDENTITY_UNVERIFIED');
});

test('missing owner packet handler fails closed',()=>{
 assert.equal(check({REALITY_FINAL_LOOP_CHILD_APPROVAL_PREPARATION_ENABLED:'false',
  REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED:'false'}).status,
  'FINAL_LOOP_WORKER_OWNER_PACKET_HANDLER_DISABLED');
});

test('qualifying configuration is still NOT release, independent DB proof or work',()=>{
 const r=check();
 assert.equal(r.status,'FINAL_LOOP_WORKER_OWNER_PACKET_LANE_CONFIGURED_NOT_ACTIVATED');
 assert.equal(r.running_release_sha,sha);
 assert.equal(r.database_project,isolated);
 assert.equal(r.owner_packet_preparation_configured,true);
 for(const field of ['independent_database_isolation_verified',
  'independent_scheduler_release_observed','release_activation_verified',
  'owner_approval_granted','child_execution_authorized',
  'original_job_completed','production_changed'])
  assert.equal(r[field],false,field);
});
