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
test('shift records exact read-only provider evidence for the existing governed capability cycle, without its own OpenAI key',()=>{
 assert.match(edge,/async function researchSourceWithoutStopping/);
 assert.match(edge,/GOVERNED_RESEARCH_ORIGINAL_JOB_QUALIFICATION_REQUIRED/);
 assert.match(edge,/EXISTING_REALITY_GENUINE_CAPABILITY_ENGINE/);
 assert.match(edge,/evidence_not_a_verified_capability_gap:true/);
 assert.match(edge,/original_job_goal_binding_verified:false/);
 assert.match(edge,/frozen_failure_reproduced:false,model_invoked:false/);
 assert.match(edge,/governed_cycle_dispatched:false/);
 assert.match(edge,/installation_authorized:false,original_job_completed:false/);
 assert.match(edge,/proof=await researchSourceWithoutStopping\(proof\)/);
 assert.doesNotMatch(edge,/api\.openai\.com|Deno\.env\.get\('OPENAI_API_KEY'\)|REALITY_SHIFT_RESEARCH_MODEL/);
 assert.doesNotMatch(edge,/reality_owner_approve_qualified_preview_v1|github\.com\/repos\/maloney2323\/Reality\/dispatches/);
});
test('source readback evidence cannot bypass the existing owner-scoped frozen original-job intake',()=>{
 const intake=read('src/reality-genuine-capability-live-intake-v1.js');
 const bridge=read('src/reality-genuine-capability-generation-bridge-v1.js');
 assert.match(intake,/original_execution_receipt/);
 assert.match(intake,/owner_confirmed!==true/);
 assert.match(intake,/independently_verified===true/);
 assert.match(intake,/MISSING_INSTRUMENT/);
 assert.match(intake,/PENDING_FROZEN_REPRODUCTION/);
 assert.match(bridge,/INDEPENDENT_PINNED_FROZEN_REPRODUCTION_REQUIRED/);
 assert.match(bridge,/createRealityPinnedPreviewGenerationAdapters/);
 assert.match(edge,/j\.run_id===Number\(match\[2\]\)/);
 assert.match(edge,/provider_failure_readback_verified=true/);
 assert.match(edge,/return \{\.\.\.proof,research\}/);
 assert.match(edge,/reality_settle_employee_shift_step_v1/);
 assert.doesNotMatch(migration,/p_owner_id/);
 assert.match(migration,/current_user<>'service_role'/);
});
