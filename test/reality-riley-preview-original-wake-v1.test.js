import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync(new URL(
 '../supabase/migrations/20261107_riley_preview_original_execution_wake_v1.sql',
 import.meta.url),'utf8');

test('isolated wake is a bounded scheduler notification, not new execution authority',()=>{
 assert.match(sql,/select cron\.schedule\(/);
 assert.match(sql,/'reality-riley-preview-original-execution-wake-v1'/);
 assert.match(sql,/'\* \* \* \* \*'/);
 assert.match(sql,/s\.status='AWAITING_EXACT_ORIGINAL_WORK'/);
 assert.match(sql,/s\.authorized_at is not null/);
 assert.match(sql,/s\.closed_at is null/);
 assert.match(sql,/step\.state='SOURCE_CHECKED'/);
 assert.match(sql,/step\.source_status='OPEN_ISSUE'/);
 assert.match(sql,/step\.proof_sha256~/);
 assert.match(sql,/where eligible_shift\.permitted/);
 assert.doesNotMatch(sql,/\b(?:insert|update|delete|truncate|grant|alter|drop)\s+(?:into\s+|table\s+|on\s+)?reality_internal\./i);
});
test('only the protected Reality preview receives the service-to-service pulse',()=>{
 assert.match(sql,/https:\/\/reality-git-fix-reality-gover-c8a922-maloney2323-5310s-projects\.vercel\.app\/api\/reality\/governed-employee-shift-worker/);
 assert.doesNotMatch(sql,/https:\/\/reality-blond\.vercel\.app|\/api\/reality\/shift['"]/);
 assert.match(sql,/body := '\{\}'::jsonb/);
 assert.match(sql,/timeout_milliseconds := 45000/);
 assert.match(sql,/x-vercel-protection-bypass/);
});
test('required secrets come from Vault and missing values prevent HTTP dispatch',()=>{
 assert.match(sql,/from vault\.decrypted_secrets/);
 assert.match(sql,/reality_riley_preview_worker_token_20261107/);
 assert.match(sql,/reality_riley_preview_vercel_bypass_20261107/);
 assert.match(sql,/credential\.worker_token~'\^\[a-f0-9\]\{64\}\$'/);
 assert.match(sql,/credential\.vercel_bypass~'\^\[A-Za-z0-9\]\{32\}\$'/);
 assert.doesNotMatch(sql,/Bearer [0-9a-f]{64}/);
 assert.doesNotMatch(sql,/x-vercel-protection-bypass['"],?\s*['"][A-Za-z0-9]{32}/);
});
