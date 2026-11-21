import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/migrations/20261119150000_owner_operational_continuity_inventory_v1.sql',import.meta.url),'utf8');
test('reader repairs are guarded and expose owner-wide history without changing authority',()=>{
 assert.match(sql,/OWNER_SHIFT_READER_DRIFT_FAIL_CLOSED/);
 assert.match(sql,/EVIDENCE_JOB_READER_DRIFT_FAIL_CLOSED/);
 assert.match(sql,/order by created_at desc limit 25\)/);
 assert.match(sql,/order by qualified_at desc limit 100/);
 assert.match(sql,/SHIFT_SERVICE_ONLY/);
 assert.match(sql,/QUALIFIED_EVIDENCE_WORK_OWNER_SERVICE_REQUIRED/);
});
test('shared inventory groups existing sources and does not turn calendar into consent',()=>{
 assert.match(sql,/reality_read_owner_operational_continuity_v1/);
 assert.match(sql,/OPERATIONAL_CONTINUITY_OWNER_SERVICE_REQUIRED/);
 assert.match(sql,/owner_employee_operating_schedule_v1/);
 assert.match(sql,/owner_qualified_employee_evidence_jobs_v1/);
 assert.match(sql,/owner_internal_maintenance_jobs_v1/);
 assert.match(sql,/governed_employee_completion_warrants_v1/);
 assert.match(sql,/EXECUTABLE_INDEPENDENT_FROZEN_CI_RED_REQUIRED/);
 assert.match(sql,/calendar_does_not_grant_execution',true/);
 assert.match(sql,/evidence_work_does_not_imply_customer_original_completed',true/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.reality_read_owner_operational_continuity_v1\(uuid\) FROM PUBLIC/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.reality_read_owner_operational_continuity_v1\(uuid\) TO service_role/);
});
test('inventory adds no writes, new authority, extra wake, or false completion',()=>{
 const code=sql.slice(sql.indexOf('-- A read-only lens'));
 assert.doesNotMatch(code,/\b(insert into|update reality_internal|delete from|cron\.schedule|net\.http_post|cron\.alter_job)\b/i);
 assert.match(code,/original_customer_job_completed',false/);
 assert.match(code,/installation_authorized',false/);
 assert.match(code,/production_changed',false/);
 assert.match(code,/created_new_work',false/);
});
