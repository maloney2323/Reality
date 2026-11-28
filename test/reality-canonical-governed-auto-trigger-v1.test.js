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

test('categorized review reuses exact preflight, prior maintenance budget and existing event transport',()=>{
 const sql=readFileSync(new URL('../sql/reality-final-loop-canonical-governed-auto-trigger-transport-v1.sql',import.meta.url),'utf8');
 const upgrade=readFileSync(new URL('../sql/reality-final-loop-categorized-qualification-v1.sql',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const bridge=readFileSync(new URL('../src/reality-final-loop-signed-worker-bridge-v1.js',import.meta.url),'utf8');
 const notify='CREATE OR REPLACE FUNCTION reality_internal.notify_final_loop_governed_trigger_v1(';
 const end='REVOKE ALL ON FUNCTION reality_internal.notify_final_loop_governed_trigger_v1(uuid) FROM PUBLIC,anon,authenticated,service_role;';
 assert.equal(sql.split(notify).length,2);
 assert.equal(upgrade.split(notify).length,2);
 assert.equal(sql.slice(sql.indexOf(notify),sql.indexOf(end)+end.length),
  upgrade.slice(upgrade.indexOf(notify),upgrade.indexOf(end)+end.length));
 assert.match(upgrade,/current_user NOT IN \('service_role','postgres'\)/);
 assert.match(upgrade,/RETURN reality_internal\.read_final_loop_child_approval_preflight_v1\(p_shift_id\)/);
 assert.match(upgrade,/reality_internal\.read_final_loop_child_approval_preflight_v1\(c.shift_id\)->'plans'/);
 assert.match(upgrade,/and not o.original_final_receipt_verified\) as review_scope_qualified/);
 assert.match(upgrade,/when d.review_scope_qualified then 'VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'/);
 assert.match(upgrade,/'maintenance_recovery_next_action'/);
 assert.match(upgrade,/'remaining_attempts'/);
 assert.match(upgrade,/'new_attempt_authorized',false/);
 assert.match(sql,/a\.claim_id=release_claim[\s\S]*?a\.capability_key='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'/);
 assert.match(sql,/accepted_review_scope'->>'execution_authorized'='false'/);
 assert.match(sql,/to_regprocedure\('public\.reality_claim_final_loop_child_review_v1\(uuid,uuid,jsonb\)'\)/);
 assert.doesNotMatch(upgrade,/CREATE TABLE|CREATE TRIGGER|cron\.schedule\(|cron\.unschedule\(|cron\.alter_job\(/i);
 assert.match(bridge,/const acceptedReview=e.event_kind==='QUALIFIER_PROOF_CHANGED'/);
 assert.match(worker,/claimedEventId:governedWakeScope.event_id,stagedActions:finalLoopStagedActionRoutes/);
 const selection=worker.slice(worker.indexOf("workerStage='EXACT_CLAIMED_EVENT_CAPABILITY_SELECTION'"),worker.indexOf("workerStage='EXACT_CLAIMED_REVIEW_CAPABILITY_DISPATCH'"));
 assert.match(selection,/routeVerifiedFinalLoopResumeTrigger\(/);
 assert.match(selection,/selectEngineeringDispatchScope\(/);
 assert.match(selection,/ingressScope!=='EXACT_CLAIMED_REVIEW_CAPABILITY_ONLY'/);
 const router=readFileSync(new URL('../src/reality-evidence-driven-capability-router-v1.js',import.meta.url),'utf8');
 assert.match(router,/trigger.reason!=='CURRENT_CATEGORIZED_REVIEW_SCOPE_REQUIRED'/);
 assert.match(worker,/final_loop_categorized_review_trigger:finalLoopCategorizedReviewTrigger/);
});
