import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';

const root=process.env.REALITY_REGRESSION_ROOT;
assert.ok(root&&/^[a-z0-9_-]+$/.test(root),'pinned independent source checkout required');
const source=resolve(root,'src/reality-governed-employee-shift-worker-v1.js');
const migration=resolve(root,
 'supabase/migrations/20261119185000_pr_review_exact_original_warrant_v1.sql');

test('GitHub source reader preserves authoritative draft state before PR review admission',()=>{
 const code=readFileSync(source,'utf8');
 assert.match(code,/draft:typeof data\.draft==='boolean'\?data\.draft:null/,
  'draft/unknown provider state must be recorded; OPEN_PULL_REQUEST alone is insufficient');
 assert.match(code,/changed_file_count:total/);
});

test('source-qualified PR original requires distinct active owner original-final-receipt warrant',()=>{
 assert.equal(existsSync(migration),true,
  'source-bound original-job warrant must exist before PR execution');
 const sql=readFileSync(migration,'utf8');
 assert.match(sql,/w\.mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'/);
 assert.match(sql,/w\.plan_fingerprint=s\.plan_fingerprint/);
 assert.match(sql,/w\.state='ACTIVE'/);
 assert.match(sql,/item->>'source_ref'=t\.source_ref/);
});

test('bounded PR review requires non-draft, complete changed file proof before claim',()=>{
 assert.equal(existsSync(migration),true,'source gate migration is mandatory');
 const sql=readFileSync(migration,'utf8');
 assert.match(sql,/provider_evidence'->>'draft'='false'/);
 assert.match(sql,/provider_evidence'->>'review_coverage'='BOUNDED_CHANGED_FILES_READ'/);
 assert.match(sql,/changed_file_count'\) ~ '\^\[1-8\]\$'/);
 const gate=sql.indexOf("t.proof->'provider_evidence'->>'draft'='false'");
 const claim=sql.indexOf('insert into reality_internal.riley_pr_review_originals_v1');
 assert.ok(gate>=0&&claim>gate,'reject ineligible PR before consuming claim attempts');
});
