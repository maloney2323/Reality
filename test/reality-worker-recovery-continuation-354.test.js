import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync(new URL(
 '../supabase/migrations/20261119134500_reconcile_signed_worker_recovery_5min_v1.sql',
 import.meta.url),'utf8');
const worker=readFileSync(new URL(
 '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');

test('existing bounded scheduler retained and trusted baseline drift is fenced',()=>{
 assert.match(sql,/schedule='\*\/5 \* \* \* \*'/);
 assert.match(sql,/REALITY_RECOVERY_SCHEDULE_DRIFT_FAIL_CLOSED/);
 assert.match(sql,/REALITY_RECOVERY_FUNCTION_DRIFT_FAIL_CLOSED/);
 assert.doesNotMatch(sql,/cron\.alter_job|cron\.schedule\(|net\.http_post\(/);
});
test('recovery health needs post-assignment model plan and signed worker proof',()=>{
 assert.match(sql,/v\.assigned_at is null/);
 assert.match(sql,/a\.status='COMPLETED'/);
 assert.match(sql,/a\.worker_stage='WORKER_RESPONSE_PUBLICATION'/);
 assert.match(sql,/a\.started_at>v\.assigned_at/);
 assert.match(sql,/pulse\.owner_id=v\.owner_id/);
 assert.match(sql,/sh\.authorized_at is not null/);
 assert.match(sql,/pulse\.last_worker_completed_at>v\.assigned_at/);
 assert.match(sql,/if not found then continue;end if;/);
});
test('separate current cron verification and other employee inquiry stay read-only',()=>{
 assert.match(sql,/if successes<3/);
 assert.match(sql,/d\.status='failed'/);
 assert.match(sql,/d\.runid>v\.last_failed_runid/);
 assert.match(sql,/t\.finished_at>v\.assigned_at/);
 assert.match(sql,/inquiry_is_generic_worker_health_not_incident_diagnosis/);
 assert.match(sql,/current_missing_capability_verified',false/);
 assert.match(sql,/independent_employee_review_conclusion_claimed',false/);
 assert.match(sql,/EXTERNALLY_CORRECTED_NOT_SELF_REPAIRED/);
 assert.match(sql,/CONTINUITY_INDEPENDENTLY_VERIFIED_NO_SELF_REPAIR_CLAIM/);
 assert.doesNotMatch(sql,/insert into reality_internal\.governed_employee_shifts_v1/i);
});
test('active-shift incident triage still invokes Reality-owned investigation',()=>{
 const at=worker.indexOf('const operationalRecoveryResult=');
 const after=worker.indexOf("workerStage='SCHEDULED_CAPABILITY_EMPLOYEE_INQUIRY'",at);
 assert.ok(at>0 && after>at);
 const sub=worker.slice(at,after);
 assert.match(sub,/await scheduleOneStandingOperationalRecovery\(/);
 assert.doesNotMatch(sub,/ACTIVE_SIGNED_SHIFT_CONTROLS_RECOVERY/);
});
