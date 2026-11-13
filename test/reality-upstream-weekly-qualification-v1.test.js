// Contract for the EXISTING signed weekly planner and current employee shift.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('unattended planner classifies source BEFORE durable snapshot readback',()=>{
 const edge=read('supabase/functions/reality-next-week-employee-planning-v1/index.ts');
 assert.match(edge,/function qualifyCurrentSource\(/);
 assert.match(edge,/const issues=rawIssues\.map\(item=>\(\{/);
 assert.match(edge,/qualification:qualifyCurrentSource\(item,graph\)/);
 assert.match(edge,/const digest=await sha256\(JSON\.stringify\(issues\)\)/);
 assert.match(edge,/CURRENT_OWNER_OBJECTIVE_NEEDS_EXACT_TASK/);
 assert.match(edge,/PRIOR_ORIGINAL_SETTLED_NO_REPLAY/);
 assert.match(edge,/GITHUB_CURRENT_OPEN_ISSUE_READBACK/);
 assert.match(edge,/executable_original:false,execution_authorized:false/);
 assert.match(edge,/installation_authorized:false/);
 assert.match(edge,/reality_authenticate_employee_shift_wake_v1/);
 assert.match(edge,/NEXT_WEEK_SOURCE_SNAPSHOT_INDEPENDENTLY_READ_BACK/);
});

test('stored qualification is checked without new source, shift or install authority',()=>{
 const sql=read('supabase/migrations/20261113_weekly_source_upstream_qualification_v1.sql');
 assert.match(sql,/array\['issue_number','issue_url','qualification','title'\]/);
 assert.match(sql,/CURRENT_SOURCE_INSPECTED_BEFORE_OWNER_DISCOVERY/);
 assert.match(sql,/LEGACY_SOURCE_INSPECTION_PENDING/);
 assert.match(sql,/employee_source_investigation_assignments/);
 assert.match(sql,/GITHUB_CURRENT_OPEN_ISSUE_READBACK/);
 assert.match(sql,/x->'qualification'->'execution_authorized' is distinct from 'false'::jsonb/);
 assert.match(sql,/x->'qualification'->'installation_authorized' is distinct from 'false'::jsonb/);
 assert.match(sql,/x->'qualification'->'executable_original' is distinct from 'false'::jsonb/);
});

test('upstream inspection reaches Home and the existing authorized shift intake',()=>{
 const api=read('api/reality/personal-employee-roster.js');
 const home=read('reality-home-employee-brief-v1.js');
 const intake=read('src/reality-existing-shift-integrated-intake-v1.js');
 assert.match(api,/upstream_source_qualification:qualification/);
 assert.match(api,/EMPLOYEE_UPSTREAM_SOURCE_PROOF_UNVERIFIED/);
 assert.match(home,/UPSTREAM_PROVIDER_SOURCES_QUALIFIED_FOR_INVESTIGATION/);
 assert.match(home,/precheckedByEmployee/);
 assert.match(intake,/WEEKLY_SOURCE_UPSTREAM_QUALIFICATION_UNVERIFIED/);
 assert.match(intake,/employee_investigation_tasks_organized/);
 assert.match(intake,/source_provider_checked_upstream/);
 assert.match(intake,/original_jobs_created:false/);
 assert.match(intake,/installation_authorized:false/);
 assert.match(intake,/current_shift_scope_extended:false/);
});
