import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL(
 '../supabase/migrations/20261119194000_watchdog_exact_original_authority_v1.sql',import.meta.url
),'utf8');
const body=sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION reality_internal.observe_qualified_employee_work_blockers_v1'));
const originalLoop=body.slice(body.indexOf('for sh in'),body.indexOf("return 'SOURCE_BACKED_QUALIFIED_EMPLOYEE_WORK_INCIDENTS_OBSERVED_'"));
test('autonomous watchdog never mistakes research or maintenance-only shift for authorized original admission',()=>{
 assert.match(originalLoop,/join reality_internal\.governed_employee_completion_warrants_v1 original_warrant/);
 assert.match(originalLoop,/original_warrant\.shift_id=s\.shift_id/);
 assert.match(originalLoop,/original_warrant\.owner_id=s\.owner_id/);
 assert.match(originalLoop,/original_warrant\.plan_fingerprint=s\.plan_fingerprint/);
 assert.match(originalLoop,/original_warrant\.mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'/);
 assert.match(originalLoop,/original_warrant\.state='ACTIVE'/);
 assert.match(originalLoop,/original_warrant\.authorized_at is not null/);
});
test('qualifying inquiries must belong to an exact original-warrant source step, not a generic PR or research item',()=>{
 const matches=[...originalLoop.matchAll(/scoped->>'source_ref'=i\.source_ref/g)];
 assert.equal(matches.length,2,'both inquiry-count and representative-source sample must be authorized');
 assert.equal((originalLoop.match(/scoped->>'step_index'=signed_step\.step_index::text/g)||[]).length,2);
 assert.equal((originalLoop.match(/signed_step\.step_index between 2 and 5/g)||[]).length,2);
 assert.equal((originalLoop.match(/warrant\.mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'/g)||[]).length,2);
 assert.match(originalLoop,/not exists\(\s*select 1 from reality_internal\.governed_employee_original_claims_v1 original/);
});
test('real blocked evidence job diagnosis remains unchanged and requires source-backed proof',()=>{
 const evidence=body.slice(body.indexOf('for j in'),body.indexOf('for sh in'));
 assert.match(evidence,/BLOCKED_SOURCE_CHANGED/);
 assert.match(evidence,/QUALIFIED_EVIDENCE_JOB_BLOCKED/);
 assert.match(evidence,/q\.qualification_receipt_sha256/);
});
test('watchdog correction does not create work, issue permissions, alter historical incidents or mark jobs completed',()=>{
 assert.match(sql,/QUALIFIED_WORK_OBSERVER_WATCHDOG_REQUIRED/);
 assert.match(sql,/where reality_internal\.owner_shift_continuity_incidents_v1\.phase='DETECTED'/);
 assert.doesNotMatch(sql,/\bDELETE FROM|\bUPDATE reality_internal\.governed_employee_shifts_v1|\bGRANT\s+EXECUTE|cron\.schedule|net\.http_post/i);
 assert.doesNotMatch(originalLoop,/original_job_completed\s*=\s*true/);
});
