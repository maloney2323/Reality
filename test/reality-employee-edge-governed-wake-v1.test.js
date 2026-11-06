import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const edge=readFileSync(new URL(
 '../supabase/functions/reality-governed-employee-shift-wake-v1/index.ts',
 import.meta.url),'utf8');
const sql=readFileSync(new URL(
 '../supabase/migrations/20261106020000_riley_shift_capability_wake_gate_v1.sql',
 import.meta.url),'utf8');
const server=readFileSync(new URL(
 '../src/reality-governed-employee-shift-worker-v1.js',import.meta.url),'utf8');
test('independent Supabase employee cron connects existing original work to Reality shared wake',()=>{
 assert.match(edge,/reality_reconcile_employee_shift_original_v1/);
 assert.match(edge,/reality_read_shift_capability_wake_v1/);
 assert.match(edge,/wakeExactCapability\(original\)/);
 assert.match(edge,/EXACT_SHIFT_CAPABILITY_WAKE_ELIGIBLE/);
 assert.match(edge,/EXISTING_CAPABILITY_WAKE_TRANSPORT_CONFIRMED/);
 assert.match(edge,/CAPABILITY_WAKE_REQUIRES_RECONCILIATION/);
 assert.match(server,/wakeExistingRileyCapabilityJob/);
});
test('employee shift source does not create a fresh job or approve an installation',()=>{
 assert.match(edge,/EXISTING_AUTHORIZED_ORIGINAL_REUSED_READ_ONLY/);
 assert.match(edge,/q\.existing_job_only!==true/);
 assert.match(edge,/q\.installation_authorized!==false/);
 assert.match(edge,/q\.original_job_completed!==false/);
 assert.match(edge,/original\.new_customer_job_created!==false/);
 assert.match(edge,/q\.source_proof_sha256!==original\.shift_observation_proof_sha256/);
 assert.match(edge,/q\.source_event_id/);
 assert.match(edge,/worker_acknowledged:false/);
 assert.match(edge,/REALITY_GITHUB_BROKER_TOKEN/);
 assert.doesNotMatch(edge,/owner_approve_qualified_preview|owner_approve_install|OWNER_APPROVE_EXACT/);
});
test('provider wake may write only deterministic isolated trigger path after readback',()=>{
 assert.match(edge,/const CAP_BRANCH='feature\/reality-general-capability-engine-20261101'/);
 assert.match(edge,/reality-genuine-triggers\//);
 assert.match(edge,/trigger_id:trigger,source_event_id:q\.source_event_id/);
 assert.match(edge,/atob\(String\(got\.content/);
 assert.match(edge,/if\(!\(await check\(\)\)\)/);
 assert.match(edge,/if\(!existing\)/);
 assert.match(edge,/content:btoa\(bytes\)/);
 assert.match(edge,/method='GET'/);
 assert.doesNotMatch(edge,/GitHub.*install.*production/i);
});
test('service-only SQL eligibility rejects already settled work and transient claims',()=>{
 assert.match(sql,/security invoker/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/grant execute on function public\.reality_read_shift_capability_wake_v1/);
 assert.match(sql,/from public,anon,authenticated/);
 assert.match(sql,/q\.claim_id is null/);
 assert.match(sql,/q\.phase in/);
 assert.match(sql,/genuine_independent_final_receipts_v1/);
 assert.match(sql,/goal_publication_epochs/);
 assert.match(sql,/not exists\(/);
 assert.match(sql,/owner_authorized_investigation/);
 assert.match(sql,/owner_authorized_installation/);
 assert.doesNotMatch(sql,/\b(insert|update|delete)\s+(?:into|reality_internal|public)/i);
});
