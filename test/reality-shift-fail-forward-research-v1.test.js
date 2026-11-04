import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const migration=read('supabase/migrations/20261104_shift_fail_forward_research_v1.sql');
const edge=read('supabase/functions/reality-governed-employee-shift-wake-v1/index.ts');
const server=read('src/reality-governed-employee-shift-worker-v1.js');

test('a provider lease exhaustion cannot halt the entire employee shift',()=>{
 assert.match(migration,/set state='BLOCKED_PROVIDER'/);
 assert.match(migration,/set status='RUNNING',last_progress_at=v_now/);
 assert.match(migration,/STEP_BLOCKED_SHIFT_CONTINUES/);
 assert.doesNotMatch(migration,/set status='ESCALATED'/);
 assert.match(migration,/RETRY_EXHAUSTED_UNVERIFIED/);
 assert.match(edge,/STEP_BLOCKED_SHIFT_CONTINUES/);
 assert.match(server,/STEP_BLOCKED_SHIFT_CONTINUES/);
});
test('waiting for exact original job does not disable future signed worker pulses',()=>{
 assert.match(migration,/where status in \('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK','ESCALATED'\)/);
 assert.match(migration,/if v_step\.step_index>=6 then/);
 assert.match(migration,/EXACT_ORIGINAL_JOB_AUTHORITY_REQUIRED/);
 assert.match(migration,/SHIFT_FINAL_REPORT_NOT_DUE/);
 assert.match(migration,/planned_end_at>v_now/);
});
test('read-only OpenAI source research cannot authorize installation or settle business jobs',()=>{
 assert.match(edge,/async function researchSourceWithoutStopping/);
 assert.match(edge,/https:\/\/api\.openai\.com\/v1\/responses/);
 assert.match(edge,/Deno\.env\.get\('OPENAI_API_KEY'\)/);
 assert.match(edge,/ROOT_CAUSE|root_cause_hypotheses/);
 assert.match(edge,/model_findings_are_hypotheses:true/);
 assert.match(edge,/owner_approval_granted:false/);
 assert.match(edge,/original_job_completed:false,production_changed:false/);
 assert.match(edge,/OPENAI_RESEARCH_PROPOSED_UNVERIFIED/);
 assert.match(edge,/OPENAI_RESEARCH_KEY_UNAVAILABLE/);
 assert.match(edge,/RESEARCH_RETRY_REQUIRED_NONBLOCKING/);
 assert.match(edge,/proof=await researchSourceWithoutStopping\(proof\)/);
 assert.doesNotMatch(edge,/github\.com\/repos\/maloney2323\/Reality\/dispatches/);
 assert.doesNotMatch(edge,/reality_owner_approve_qualified_preview_v1/);
});
test('provider evidence remains source-pinned and model outage cannot prevent settlement of source check',()=>{
 assert.match(edge,/j\.run_id===Number\(match\[2\]\)/);
 assert.match(edge,/provider_failure_readback_verified=true/);
 assert.match(edge,/SOURCE_RESEARCH_STARTED/);
 assert.match(edge,/research\.status='RESEARCH_RETRY_REQUIRED_NONBLOCKING'/);
 assert.match(edge,/return \{\.\.\.proof,research\}/);
 assert.match(edge,/reality_settle_employee_shift_step_v1/);
 assert.doesNotMatch(migration,/p_owner_id/);
 assert.match(migration,/current_user<>'service_role'/);
});
