import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sql=read('../supabase/migrations/20261122034000_signed_chat_original_full_goal_gap_receipt_v1.sql');
const worker=read('../api/reality/governed-employee-shift-worker.js');
const boundary=read('../src/reality-governed-shift-boundary-v1.js');
test('signed worker writes one source-and-CI-bound goal-gap receipt without new work or authority',()=>{
 for(const term of [
  "current_user<>'service_role'","join public.reality_chat_messages",
  "m.user_id=h.owner_id","m.conversation_id=h.conversation_id",
  "h.development->>'source_sha256'=h.message_sha256",
  "h.development->>'original_work_id' ~ '^work:[a-f0-9]{32}$'",
  "'SYNTAX_AND_SOURCE_IDENTITY_ONLY'","'CI_VERIFIED'",
  "not (h.development->'evidence' ? 'goal_gap_receipt_sha256')",
  "for update of h skip locked","extensions.digest",
  "goal_gap_same_original_work_id","goal_gap_source_sha256",
  "INDEPENDENT_FULL_GOAL_FEATURE_TEST_AND_COMPATIBLE_SAME_ORIGINAL_INSTALL_ADAPTER_REQUIRED",
  "'feature_acceptance_verified',false",
  "'original_job_completed',false",
  "'installation_authorized',false",
  "'production_changed',false"])assert.ok(sql.includes(term),term);
 assert.doesNotMatch(sql,/INSERT INTO|DELETE FROM|ALTER TABLE|GRANT .* TO authenticated|SECURITY DEFINER/i);
 assert.doesNotMatch(sql,/work:[a-f0-9]{32}(?!\$)/);
 assert.match(sql,/revoke all on function public\.reality_record_next_chat_development_goal_gap_v1/);
 assert.match(sql,/to service_role/);
});
test('existing signed worker automatically invokes guarded gap transition once per wake',()=>{
 assert.match(worker,/workerStage='CHAT_DEVELOPMENT_FULL_GOAL_ACCEPTANCE_GAP'/);
 assert.match(worker,/reality_record_next_chat_development_goal_gap_v1/);
 assert.match(worker,/goalGapRecorded=\s*chatFeatureGap\?\.status===/);
 assert.match(worker,/const newDevelopmentAdvanced=recoverySourceProgress\|\|/);
 assert.match(worker,/recoveryDraftProgress\|\|recoverySpecProgress\|\|goalGapRecorded\|\|/);
 assert.match(worker,/goalGapRecorded\?chatFeatureGap:/);
 assert.match(boundary,/record_next_chat_development_goal_gap_v1/);
 assert.doesNotMatch(sql,/reality_owner_approve_general_original_install_v1/);
});
