import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sql=read('../supabase/migrations/20261122023000_chat_development_full_goal_completion_preflight_v1.sql');
const api=read('../api/reality/personal-chat-development-completion-preflight.js');
const boundary=read('../src/reality-governed-shift-boundary-v1.js');
const ui=read('../reality-chat-continuous-qualification-v1.js');
test('independent completion preflight follows any saved owner original, never hardcodes a job',()=>{
 for(const s of ['chat_work_handoffs_v1','reality_chat_messages',
  'governed_original_install_reviews_v1','riley_unattended_repair_originals_v1',
  'governed_original_independent_final_receipts_v1','owner_id=p_owner_id',
  "m.role='user'","m.user_id=h.owner_id","m.request_id=h.request_id",
  "h.development->>'source_sha256'=h.message_sha256",
  "SYNTAX_AND_SOURCE_IDENTITY_ONLY",
  "feature_acceptance_requires_full_original_goal", "general_install_lineage_compatible",
  "same_original_install_review_bound", "independent_final_receipt_recorded"]) assert.ok(sql.includes(s),s);
 assert.doesNotMatch(sql,/work:[a-f0-9]{32}(?!\$)|issues\/[0-9]+|pull\/[0-9]+/);
 assert.doesNotMatch(sql,/\bINSERT INTO\b|\bUPDATE reality_internal\.|\bDELETE FROM\b/i);
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/revoke all on function public\.reality_read_owner_chat_development_completion_preflight_v1/);
 assert.match(sql,/to service_role/);
});
test('no syntax-only CI acceptance, no reused unrelated Riley installer, no approval or settlement',()=>{
 for(const s of ["'feature_acceptance_independently_verified',false",
 "'owner_install_approval_ready',false","'installation_authorized',false",
 "'original_job_completed_by_read',false","'execution_authorized',false",
 "'production_changed',false",
 "'RUN_FULL_GOAL_FEATURE_ACCEPTANCE_AND_CONNECT_COMPATIBLE_ORIGINAL_INSTALL_ADAPTER'"])
 assert.ok(sql.includes(s),s);
 assert.match(sql,/i.original_work_id=h.development->>'original_work_id'/);
 assert.match(sql,/r.original_work_id=h.development->>'original_work_id'/);
 assert.match(sql,/f.original_work_id=h.development->>'original_work_id'/);
});
test('authenticated Chat readback is owner-scoped with no client-selected id or authority writes',()=>{
 assert.match(boundary,/read_owner_chat_development_completion_preflight_v1/);
 assert.match(api,/authenticatedChatSession\(req,res\)/);
 assert.match(api,/Object\.keys\(req\.query\|\|\{\}\)\.length/);
 assert.match(api,/db\.project!==process\.env\.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF/);
 assert.match(api,/p_owner_id:session\.user_id/);
 assert.match(api,/feature_acceptance_independently_verified!==false/);
 assert.doesNotMatch(api,/owner_approve|reality_admit_chat|reality_claim|reality_install|reality_settle/);
});
test('existing Chat Work shows actual next missing gate with no inert owner approval control',()=>{
 assert.match(ui,/Existing original · full-goal completion/);
 assert.match(ui,/loadChatOriginalCompletion/);
 assert.match(ui,/NEXT_GATE_IMPOSSIBLE_TO_INFER_AUTOMATIC_AUTHORITY|x\.next_gate/);
 assert.match(ui,/Existing generalized installer belongs to a different original-work lineage/);
 assert.match(ui,/No feature-level acceptance, installation approval, final completion or production change/);
 assert.doesNotMatch(ui,/REALITY_SKIP_APPROVAL/);
});
