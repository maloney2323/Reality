import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const edge=readFileSync(new URL('../supabase/functions/reality-chat-new-development-broker-v1/index.ts',import.meta.url),'utf8');
const worker=readFileSync(new URL('../src/reality-chat-new-development-publisher-v1.js',import.meta.url),'utf8');
test('recorded staged original may reconcile old frozen release CI, no new source writes',()=>{
 assert.match(edge,/if\(s\.phase!=='CANDIDATE_STAGED'&&s\.release_sha!==body\.base_sha\)/);
 assert.match(edge,/if\(s\.phase==='CANDIDATE_STAGED'\)\s*return await verifyCI\(s,project\.origin,secret,token\)/);
 assert.match(edge,/return await stage\(s,project\.origin,secret,token,body\.base_branch\)/);
 assert.match(edge,/if\(!cleanScope\(s\)\)/);
 assert.doesNotMatch(edge,/if\(!cleanScope\(s\)\|\|s\.release_sha!==body\.base_sha\)/);
 assert.match(worker,/base_sha:env\.VERCEL_GIT_COMMIT_SHA/);
});
test('frozen staged CI candidate independently matches GitHub PR, origin release and syntax review',()=>{
 assert.match(edge,/prs\.data\?\.draft!==true/);
 assert.match(edge,/prs\.data\?\.head\?\.repo\?\.full_name!==REPO/);
 assert.match(edge,/prs\.data\?\.base\?\.repo\?\.full_name!==REPO/);
 assert.match(edge,/head\.data\?\.sha!==commit/);
 assert.match(edge,/head\.data\.parents\[0\]\?\.sha/);
 assert.match(edge,/sourceRead\.data\.parents\[0\]\?\.sha!==s\.release_sha/);
 assert.match(edge,/sourceRead\.data\.files\[0\]\?\.filename!==e\.target_path/);
 assert.match(edge,/proof\.data\?\.sha!==e\.artifact_blob_sha/);
 assert.match(edge,/frozen\.data\?\.sha!==e\.source_blob_sha/);
 assert.match(edge,/r\.head_sha===commit/);
 assert.match(edge,/r\.status==='completed'&&r\.conclusion==='success'/);
 assert.match(edge,/checked\?\.length!==1/);
 assert.match(edge,/reality_record_chat_new_development_ci_v1/);
 assert.match(edge,/ci_scope:receipt\.ci_scope/);
 assert.match(edge,/feature_acceptance_verified:false/);
});
test('staged reconciliation never invokes model generation, new admission, install or settlement',()=>{
 const ci=edge.slice(edge.indexOf('async function verifyCI('),edge.indexOf('\nDeno.serve(',edge.indexOf('async function verifyCI(')));
 assert.doesNotMatch(ci,/\b(?:PUT|PATCH|DELETE)\b|\/git\/refs|\/pulls','POST'|\/contents\/[^']+,'PUT'|reality_owner_approve|reality_admit_chat|reality_install|reality_settle/);
 // All CI readback statuses use the common no-effect response envelope.
 assert.match(edge,/status,source_installed:false,installation_authorized:false/);
 assert.match(edge,/original_job_completed:false,production_changed:false/);
 const stage=edge.slice(edge.indexOf('async function stage('),edge.indexOf('async function verifyCI('));
 assert.match(stage,/reality_fence_chat_new_development_publish_v1/);
 assert.match(stage,/gh\(token,'\/contents\/'\+target,'PUT'/);
});
