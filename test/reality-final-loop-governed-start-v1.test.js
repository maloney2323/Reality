import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {finalLoopEventTriggerEnabled,parseFinalLoopGovernedWake,
 verifyFinalLoopGovernedWakeScope,readFinalLoopGovernedShiftStart} from '../src/reality-governed-auto-trigger-v1.0.js';
const owner='11111111-1111-4111-8111-111111111111',shift='22222222-2222-4222-8222-222222222222';
const fingerprint='sha256:'+'a'.repeat(64);
const db={strictSecrets:true,project:'isolated',url:'https://isolated.supabase.co'};
const env={VERCEL_ENV:'preview',REALITY_FINAL_LOOP_EVENT_TRIGGER_ENABLED:'true',
 REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED:'true',REALITY_FINAL_LOOP_SHARED_CONTINUITY_GUARD_ENABLED:'true',
 REALITY_FINAL_LOOP_EVENT_RESUME_SHADOW_ENABLED:'true',REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED:'true',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'isolated',REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF:'isolated',
 REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF:'shared'};
const scope={owner_id:owner,shift_id:shift,plan_fingerprint:fingerprint};
const graph={...scope,status:'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED',completion_bound:true,
 execution_scope_from_owner_warrant_only:true,new_job_created:false,installation_authorized:false,production_changed:false};
test('event transport is isolated and uses the exact existing shift only',()=>{
 assert.equal(finalLoopEventTriggerEnabled(db,env),true);
 for(const change of [{VERCEL_ENV:'production'},{REALITY_FINAL_LOOP_EVENT_TRIGGER_ENABLED:'false'},
  {REALITY_FINAL_LOOP_PREVIEW_SOURCE_PLAN_WAKE_ONLY:'true'},{REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF:'isolated'},
  {REALITY_FINAL_LOOP_SHARED_CONTINUITY_GUARD_ENABLED:'false'}])
  assert.equal(finalLoopEventTriggerEnabled(db,{...env,...change}),false);
 const headers={'x-reality-governed-owner-id':owner,'x-reality-governed-shift-id':shift,
  'x-reality-governed-plan-fingerprint':fingerprint};
 assert.deepEqual(parseFinalLoopGovernedWake(headers),scope);
 assert.throws(()=>parseFinalLoopGovernedWake({...headers,'x-reality-governed-shift-id':'other'}));
 assert.equal(verifyFinalLoopGovernedWakeScope(scope,graph),true);
 for(const bad of [{...graph,owner_id:shift},{...graph,shift_id:owner},{...graph,installation_authorized:true},
  {...graph,plan_fingerprint:'sha256:'+'b'.repeat(64)}])
  assert.equal(verifyFinalLoopGovernedWakeScope(scope,bad),false);
});
test('durable queued start is not execution; only later same-shift pulse is observed',async()=>{
 const receipt={...scope,status:'GOVERNED_START_WAKE_QUEUED',read_only:true,
  execution_authorized:false,installation_authorized:false,original_job_completed:false,production_changed:false,
  network_request_id:42,queued_at:'2026-11-24T12:00:00Z'};
 const run=r=>readFinalLoopGovernedShiftStart({db,ownerId:owner,shift:{shift_id:shift,plan_fingerprint:fingerprint,
  planned_end_at:'infinity'},env,invoke:async(_db,name,args)=>{
   assert.equal(name,'reality_read_final_loop_governed_start_v1');assert.equal(args.p_shift_id,shift);return r;}});
 const q=await run(receipt);assert.equal(q.wake_queued,true);assert.equal(q.worker_observed,false);
 assert.equal(q.original_job_completed,false);assert.equal(q.execution_authorized_by_trigger,false);
 const observed=await run({...receipt,status:'GOVERNED_START_WORKER_OBSERVED',last_worker_seen_at:'2026-11-24T12:00:01Z'});
 assert.equal(observed.worker_observed,true);
 for(const bad of [{...receipt,owner_id:shift},{...receipt,execution_authorized:true},
  {...receipt,status:'GOVERNED_START_WORKER_OBSERVED',last_worker_seen_at:'2026-11-24T11:59:59Z'}])
  assert.equal((await run(bad)).status,'GOVERNED_START_READBACK_UNVERIFIED');
});
test('Chat preserves one explicit exact start and truthful queued readback',()=>{
 const ui=readFileSync(new URL('../reality-chat-employee-shift-card-v1.js',import.meta.url),'utf8');
 assert.match(ui,/panel\.insertBefore\(block,composer\)/);
 assert.match(ui,/Authorize & Start Shift/);assert.match(ui,/Schedule for later \(optional\)/);
 assert.match(ui,/expected_fingerprint:p\.expected_fingerprint/);
 assert.match(ui,/triggerMessage\(after\.governed_auto_trigger\)/);
 assert.doesNotMatch(ui,/workPanel\.prepend\(block\)/);
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(worker,/verifyFinalLoopGovernedWakeScope\(governedWakeScope/);
 assert.match(worker,/GOVERNED_AUTO_TRIGGER_WAKE_SCOPE_CHANGED/);
 const sql=readFileSync(new URL('../sql/reality-final-loop-governed-auto-trigger-transport-v1.sql',import.meta.url),'utf8');
 assert.doesNotMatch(sql,/cron\.job|cron\.schedule/);
 assert.match(sql,/lease_expires_at>now_at THEN RETURN NULL/);
 assert.match(sql,/AFTER UPDATE OF released_at/);
});
