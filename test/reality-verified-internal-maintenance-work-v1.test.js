import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL(
 '../supabase/migrations/20261117_verified_internal_maintenance_work_queue_v15.sql',
 import.meta.url),'utf8');
test('same independently signed incident becomes internal work, never a new customer original',()=>{
 assert.match(sql,/create table if not exists reality_internal\.owner_internal_maintenance_jobs_v1/);
 assert.match(sql,/incident_id uuid primary key references reality_internal\.owner_shift_continuity_incidents_v1/);
 assert.match(sql,/on conflict\(incident_id\) do nothing/);
 assert.match(sql,/r\.incident_id=i\.incident_id and r\.owner_id=i\.owner_id/);
 assert.match(sql,/b\.incident_id=i\.incident_id and b\.owner_id=i\.owner_id/);
 assert.match(sql,/shift\.shift_id=i\.shift_id and shift\.owner_id=i\.owner_id/);
 assert.match(sql,/b\.original_claim_count=0/);
 assert.match(sql,/b\.prior_inquiry_count>=2/);
 assert.match(sql,/r\.previously_reviewed_sha256<>r\.current_provider_sha256/);
 assert.match(sql,/i\.assigned_function_id<>i\.reviewer_function_id/);
 assert.match(sql,/b\.receipt_sha256~'\^sha256:/);
 assert.match(sql,/r\.receipt_sha256~'\^sha256:/);
 assert.doesNotMatch(sql,/insert into reality_internal\.governed_employee_original_claims_v1/);
 assert.doesNotMatch(sql,/reality_authorize_employee_shift_v1/);
});
test('internal maintenance is real pending work but not a fabricated successful repair',()=>{
 assert.match(sql,/OPEN_NEEDS_BUSINESS_WORK_ROOT_CAUSE/);
 assert.match(sql,/OPEN_NEEDS_FROZEN_SOURCE_REPRODUCTION/);
 assert.match(sql,/check\(original_job_completed=false\)/);
 assert.match(sql,/check\(installation_authorized_by_discovery=false\)/);
 assert.match(sql,/check\(external_action_authorized_by_discovery=false\)/);
 assert.match(sql,/check\(production_changed=false\)/);
 assert.match(sql,/original_customer_work_id text check/);
 assert.match(sql,/independent_frozen_test_receipt_sha256 text check/);
 assert.match(sql,/repaired_capability_receipt_sha256 text check/);
});
test('worker uses existing signed watchdog without creating background schedulers or widening authority',()=>{
 assert.match(sql,/jobname='reality-governed-wake-watchdog-v1'/);
 assert.match(sql,/schedule='\* \* \* \* \*'/);
 assert.match(sql,/and command like '%observe_qualified_employee_work_blockers_v1%'/);
 assert.match(sql,/and command like '%watchdog_guarded_preview_self_repair_v1%'/);
 assert.match(sql,/position\('observe_verified_internal_maintenance_work_v1' in old_command\)=0/);
 assert.match(sql,/perform cron\.alter_job\(j_id,command=>old_command\|\|/);
 assert.doesNotMatch(sql,/cron\.schedule\(/);
 assert.doesNotMatch(sql,/grant execute[^;]+to (anon|authenticated)/is);
});
test('owner readback is truly owner-scoped, source-receipted and cannot grant customer settlement',()=>{
 assert.match(sql,/create or replace function public\.reality_read_owner_internal_maintenance_v1\(p_owner_id uuid\)/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/where owner_id=p_owner_id/);
 assert.match(sql,/'internal_work_id','maintenance:'\|\|m\.incident_id::text/);
 assert.match(sql,/'independent_review_receipt_sha256',m\.independent_review_receipt_sha256/);
 assert.match(sql,/'original_customer_job_completed',false/);
 assert.match(sql,/'shift_started_by_read',false/);
 assert.match(sql,/'customer_jobs_completed_by_read',0/);
 assert.match(sql,/grant execute on function public\.reality_read_owner_internal_maintenance_v1\(uuid\)\s+to service_role/);
});
