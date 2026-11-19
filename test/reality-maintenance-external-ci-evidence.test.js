import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/migrations/20261119200000_maintenance_external_frozen_evidence_v1.sql',import.meta.url),'utf8');
test('external regression is one immutable evidence entry under the same incident',()=>{
 assert.match(sql,/PRIMARY KEY\(maintenance_id\)/);
 assert.match(sql,/ON CONFLICT\(maintenance_id\) DO NOTHING/);
 assert.match(sql,/EXTERNAL_FROZEN_EVIDENCE_IMMUTABLE_CONFLICT/);
 assert.match(sql,/e\.receipt_sha256=p_source_epoch_receipt_sha256/);
 assert.match(sql,/m\.claimed_shift_id=p_shift_id/);
 assert.match(sql,/m\.original_customer_work_id IS NULL/);
});
test('no source-change or unapproved maintenance can borrow CI authority',()=>{
 assert.match(sql,/e\.epoch_status='SOURCE_EPOCH_ATTESTED_EXECUTABLE_RED_REQUIRED'/);
 assert.match(sql,/w\.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'/);
 assert.match(sql,/w\.state='ACTIVE'/);
 assert.match(sql,/scope->>'maintenance_id'=m\.incident_id::text/);
 assert.match(sql,/scope->>'independent_review_receipt_sha256'=m\.independent_review_receipt_sha256/);
});
test('observed external GitHub red/green is not a signed CI repair, install or completed original',()=>{
 assert.match(sql,/GITHUB_HISTORICAL_RED_GREEN_STAGED_AWAITING_SIGNED_REVIEW/);
 assert.match(sql,/EXTERNAL_REGRESSION_STAGED_INDEPENDENT_SIGNED_REVIEW_REQUIRED/);
 assert.match(sql,/independent_ci_red_attested',false/);
 assert.match(sql,/original_job_completed',false/);
 assert.match(sql,/installation_authorized',false/);
 assert.doesNotMatch(sql,/\bUPDATE reality_internal|\bDELETE FROM|cron\.schedule|net\.http_post/i);
});
test('private service-only staging and read-only original continuity view',()=>{
 assert.match(sql,/FROM PUBLIC,anon,authenticated/);
 assert.match(sql,/TO service_role/);
 assert.match(sql,/reality_read_owner_maintenance_external_regression_evidence_v1/);
 assert.match(sql,/OWNER_MAINTENANCE_EXTERNAL_CI_EVIDENCE_READ_ONLY/);
});
