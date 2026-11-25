import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {finalLoopEventTriggerEnabled,parseFinalLoopGovernedWake,verifyCanonicalGovernedWakeDelivery} from '../src/reality-governed-auto-trigger-v1.0.js';
const owner='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',shift='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',event='cccccccc-cccc-4ccc-cccc-cccccccccccc',nonce='dddddddd-dddd-4ddd-dddd-dddddddddddd',sha='a'.repeat(40),project='abcdefghijklmnopqrst';
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_SHA:sha,REALITY_RELEASE_CONTROL_RUNTIME_TOPOLOGY:'CANONICAL_BENCHMARK_PREVIEW',
 REALITY_FINAL_LOOP_EVENT_TRIGGER_ENABLED:'true',REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED:'true',REALITY_FINAL_LOOP_SHARED_CONTINUITY_GUARD_ENABLED:'true',REALITY_FINAL_LOOP_EVENT_RESUME_SHADOW_ENABLED:'true',
 REALITY_FINAL_LOOP_SHARED_BENCHMARK_STAGING_ENABLED:'true',REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED:'false',
 REALITY_FINAL_LOOP_SHARED_BENCHMARK_OWNER_ID:owner,REALITY_FINAL_LOOP_SHARED_BENCHMARK_SHIFT_ID:shift,REALITY_RELEASE_CONTROL_DB_PROJECT_REF:project,
 REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF:project,REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF:'bcdefghijklmnopqrstu',
 REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED:'false',REALITY_FINAL_LOOP_PARENT_DELIVERY_ENABLED:'false'};
const db={strictSecrets:true,project,url:'https://'+project+'.supabase.co'};
const headers={'x-reality-governed-owner-id':owner,'x-reality-governed-shift-id':shift,'x-reality-governed-plan-fingerprint':'sha256:'+'b'.repeat(64),
 'x-reality-governed-event-id':event,'x-reality-governed-wake-nonce':nonce,'x-reality-governed-wake-kind':'RESUME','x-reality-governed-release-sha':sha};
test('canonical transport is opt-in and fenced to the existing owner packet lane',()=>{
 assert.equal(finalLoopEventTriggerEnabled(db,env),true);
 for(const bad of [{REALITY_FINAL_LOOP_EVENT_TRIGGER_ENABLED:'false'},{REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED:'true'},{REALITY_FINAL_LOOP_PARENT_DELIVERY_ENABLED:'true'},{REALITY_RELEASE_CONTROL_DB_PROJECT_REF:'wrong'},{REALITY_FINAL_LOOP_SHARED_BENCHMARK_SHIFT_ID:''}])
  assert.equal(finalLoopEventTriggerEnabled(db,{...env,...bad}),false);
});
test('canonical delivery requires exact event nonce, original shift and current release',()=>{
 const scope=parseFinalLoopGovernedWake(headers);
 assert.equal(verifyCanonicalGovernedWakeDelivery(scope,env),true);
 assert.equal(verifyCanonicalGovernedWakeDelivery({...scope,release_sha:'b'.repeat(40)},env),false);
 assert.equal(verifyCanonicalGovernedWakeDelivery({...scope,shift_id:owner},env),false);
 assert.equal(verifyCanonicalGovernedWakeDelivery({...scope,kind:'START'},env),false);
 assert.throws(()=>parseFinalLoopGovernedWake({...headers,'x-reality-governed-wake-nonce':undefined}));
});
test('transport consumes existing event only after real lease and release witness, before worker actions',()=>{
 const sql=readFileSync(new URL('../sql/reality-final-loop-canonical-governed-auto-trigger-transport-v1.sql',import.meta.url),'utf8');
 assert.match(sql,/run\.status='COMPLETED'/);
 assert.match(sql,/QUALIFY_DISTINCT_RECOVERY_EVIDENCE_AND_EXACT_BUDGET_NO_REPLAY/);
 assert.match(sql,/recovery_terminal_history'->>'remaining_attempts'='0'/);
 assert.match(sql,/recovery_terminal_history'->>'replay_permitted'='false'/);
 assert.match(sql,/recovery_terminal_history'->>'new_attempt_authorized'='false'/);
 assert.match(sql,/governed_wake_worker_run_id IS NULL/);
 assert.match(sql,/governed_wake_nonce=p_nonce/);
 assert.match(sql,/CANONICAL_GOVERNED_WAKE_MISSING_STALE_OR_CONSUMED/);
 assert.doesNotMatch(sql,/cron\.schedule\(|cron\.unschedule\(|cron\.alter_job\(/);
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.ok(worker.indexOf("reality_claim_canonical_governed_wake_v1")>worker.indexOf("SIGNED_WORKER_REAL_PROCESS_START_NOT_DURABLE"));
 assert.ok(worker.indexOf("reality_claim_canonical_governed_wake_v1")<worker.indexOf("FINAL_LOOP_SOURCE_PLAN_PREVIEW_ONLY"));
 assert.match(worker,/UNGOVERNED_PERIODIC_WAKE_IGNORED/);
});
