import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/migrations/20261119193000_maintenance_ci_continue_after_epoch_v1.sql',import.meta.url),'utf8');
test('warranted maintenance work advances after prior source epoch observation',()=>{
 assert.match(sql,/NOT EXISTS\(/);
 assert.match(sql,/reality_internal\.signed_maintenance_ci_source_epochs_v1 epoch/);
 assert.match(sql,/epoch\.maintenance_id=m\.incident_id/);
 assert.match(sql,/m\.independent_frozen_test_receipt_sha256 IS NULL/);
});
test('the source epoch remains durable; no blind retry, mutation or new authority',()=>{
 assert.match(sql,/w\.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'/);
 assert.match(sql,/w\.state='ACTIVE'/);
 assert.match(sql,/scope->>'maintenance_id'=m\.incident_id::text/);
 assert.match(sql,/run\.status='STARTED'/);
 assert.match(sql,/m\.independent_review_receipt_sha256/);
 assert.match(sql,/m\.original_customer_work_id IS NULL/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.reality_read_signed_maintenance_ci_preflight_v1\(uuid,uuid\) FROM PUBLIC,anon,authenticated/);
 assert.doesNotMatch(sql,/\bINSERT INTO|\bUPDATE reality_internal|\bDELETE FROM|cron\.schedule|net\.http_post/i);
});
