import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const collector=readFileSync(new URL('../src/reality-governed-employee-shift-worker-v1.js',import.meta.url),'utf8');
const sql=readFileSync(new URL('../supabase/migrations/20261119185000_pr_review_exact_original_warrant_v1.sql',import.meta.url),'utf8');
test('GitHub verified PR-draft state is in immutable source evidence, unknown stays unknown',()=>{
 assert.match(collector,/draft:typeof data\.draft==='boolean'\?data\.draft:null/);
 assert.match(collector,/kind:'PULL_REQUEST_CHANGESET_OBSERVED'/);
 assert.match(collector,/changed_file_count:total/);
 assert.match(collector,/review_coverage=total!==null&&total<=8&&files\.length===total/);
});
test('an active maintenance warrant cannot confer original-job review authority',()=>{
 assert.match(sql,/governed_employee_completion_warrants_v1 w/);
 assert.match(sql,/w\.plan_fingerprint=s\.plan_fingerprint/);
 assert.match(sql,/w\.mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'/);
 assert.match(sql,/w\.state='ACTIVE'/);
 assert.match(sql,/item->>'source_ref'=t\.source_ref/);
 assert.match(sql,/item->>'step_index'=t\.step_index::text/);
});
test('draft, oversized and partial provider sources fail closed before consuming attempts',()=>{
 assert.match(sql,/provider_evidence'->>'draft'='false'/);
 assert.match(sql,/provider_evidence'->>'review_coverage'='BOUNDED_CHANGED_FILES_READ'/);
 assert.match(sql,/changed_file_count'\) ~ '\^\[1-8\]\$'/);
 assert.match(sql,/jsonb_array_length\(t\.proof->'provider_evidence'->'files'\)/);
 const fn=sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION'));
 assert.ok(fn.indexOf("t.proof->'provider_evidence'->>'draft'='false'") <
   fn.indexOf('insert into reality_internal.riley_pr_review_originals_v1'));
});
test('the original work identity and bounded recovery behavior are retained',()=>{
 assert.match(sql,/on conflict \(shift_id,source_ref\) do nothing/);
 assert.match(sql,/preflight_recovery_count=0/);
 assert.match(sql,/j\.model_response_id is null/);
 assert.match(sql,/j\.provider_comment_id is null/);
 assert.match(sql,/attempts=attempts\+1/);
 assert.doesNotMatch(sql,/cron\.schedule\(|net\.http_post\(/);
});
test('service role only; no new authorization or installation is granted',()=>{
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.reality_claim_authorized_riley_pr_review_v1\(\) FROM PUBLIC,anon,authenticated/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.reality_claim_authorized_riley_pr_review_v1\(\) TO service_role/);
 assert.match(sql,/installation_authorized',false/);
 assert.match(sql,/production_changed',false/);
});
