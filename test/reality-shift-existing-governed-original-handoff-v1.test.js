import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261104_shift_existing_governed_original_readback_v1.sql');
const edge=read('supabase/functions/reality-governed-employee-shift-wake-v1/index.ts');
const genuine=read('src/reality-genuine-capability-generation-bridge-v1.js');

test('the SQL migration is one complete function with an intact pinned GitHub source',()=>{
 assert.equal(sql.split('create or replace function public.reality_reconcile_employee_shift_original_v1()').length-1,1);
 assert.equal(sql.split('end $fn$;').length-1,1);
 assert.equal(sql.split('EXACT_ORIGINAL_JOB_FINAL_RECEIPT_MATCH').length-1,1);
 assert.ok(sql.includes("issues/[1-9][0-9]*$'"));
 assert.ok(!sql.includes('to service_role;\n    and '));
});

test('shift links only independently hashed source evidence to existing, current-owner original job',()=>{
 for(const x of [
  /reality_internal\.governed_employee_shift_steps_v1/,
  /t\.state='SOURCE_CHECKED'/,
  /t\.source_status='OPEN_ISSUE'/,
  /t\.proof->>'kind'='GITHUB_SOURCE_READBACK'/,
  /t\.proof->>'source_url'=t\.source_ref/,
  /t\.proof->>'provider_checked'='true'/,
  /t\.proof_sha256='sha256:'/,
  /e\.entity_type='reality_original_source_backed_repair_work'/,
  /e\.epistemic_status='VERIFIED'/,
  /e\.payload->>'owner_id'=s\.owner_id::text/,
  /e\.provenance->>'principal_id'=s\.owner_id::text/,
  /e\.payload->>'owner_authorized_investigation'='true'/,
  /e\.payload->>'owner_authorized_installation'='false'/,
  /q\.original_work_event_id=e\.event_id/,
  /q\.original_work_id=e\.payload->>'original_work_id'/,
  /epoch\.last_transition_event_id=q\.goal_transition_event_id/,
  /genuine_independent_final_receipts_v1/,
  /v_existing_count=1/
 ])assert.match(sql,x);
});
test('a settled or ambiguous job is never automatically selected and no model or new job is created',()=>{
 assert.match(sql,/q\.phase in \('PENDING_FROZEN_REPRODUCTION'/);
 assert.match(sql,/ISOLATED_INSTALLED_PROBATION/);
 assert.doesNotMatch(sql,/q\.phase in \([^)]*SETTLED_ISOLATED/);
 assert.match(sql,/AMBIGUOUS_ORIGINAL_SCOPE_NO_AUTOMATIC_SELECTION/);
 assert.match(sql,/NO_ELIGIBLE_ORIGINAL_JOB_FROM_SHIFT_OBSERVATION/);
 assert.match(sql,/governed_cycle_dispatched_by_shift',false/);
 assert.match(sql,/model_invoked_by_shift',false/);
 assert.match(sql,/new_customer_job_created',false/);
 assert.match(sql,/installation_authorized',false/);
 assert.doesNotMatch(sql,/INSERT\s+INTO|dispatches|api\.openai\.com|OPENAI_API_KEY/i);
});
test('independent settlement remains the sole path to actual original-job completion',()=>{
 assert.match(sql,/r\.verified_at>=s\.authorized_at/);
 assert.match(sql,/q\.phase='SETTLED_ISOLATED'/);
 assert.match(sql,/EXACT_ORIGINAL_JOB_FINAL_RECEIPT_MATCH/);
 assert.match(sql,/ORIGINAL_JOB_RECEIPT_VERIFIED/);
 assert.match(sql,/EXACT_SHIFT_ORIGINAL_RECEIPT_RECONCILED/);
 assert.match(sql,/verified_settlement_event_id/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/planned_end_at>v_now/);
});
test('worker uses the existing queue readback, not another LLM agent',()=>{
 assert.match(edge,/reality_reconcile_employee_shift_original_v1/);
 assert.match(edge,/GOVERNED_ORIGINAL_LINK_PROOF_UNTRUSTED/);
 assert.match(edge,/EXISTING_AUTHORIZED_ORIGINAL_REUSED_READ_ONLY/);
 assert.match(edge,/original\.governed_original_work_id/);
 assert.match(edge,/existing_governed_queue_reused/);
 assert.match(edge,/new_research_agent_started:false/);
 assert.match(edge,/original\.governed_cycle_dispatched_by_shift!==false/);
 assert.match(edge,/original\.model_invoked_by_shift!==false/);
 assert.match(edge,/original\.new_customer_job_created!==false/);
 assert.doesNotMatch(edge,/api\.openai\.com|OPENAI_API_KEY|REALITY_SHIFT_RESEARCH_MODEL/);
 assert.match(genuine,/createRealityPinnedPreviewGenerationAdapters/);
});
