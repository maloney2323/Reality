import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=x=>readFileSync(new URL(x,import.meta.url),'utf8');
const publisher=read('../src/reality-chat-new-development-publisher-v1.js');
const edge=read('../supabase/functions/reality-chat-new-development-broker-v1/index.ts');
test('signed worker may request existing original CI readback from either isolated preview branch family',()=>{
 assert.match(publisher,/const BRANCH=\/\^\(\?:reality\|repair\)/);
 assert.match(edge,/const BRANCH=\/\^\(\?:reality\|repair\)/);
 assert.match(publisher,/env\.VERCEL_ENV!=='preview'/);
 assert.match(publisher,/db\.project!==env\.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF/);
 assert.match(publisher,/db\.url!=='https:\/\/'\+db\.project\+'\.supabase\.co'/);
 assert.match(publisher,/!SHA\.test\(env\.VERCEL_GIT_COMMIT_SHA/);
 assert.match(publisher,/env\.VERCEL_GIT_COMMIT_REF\.includes\('\.\.'\)/);
 assert.match(publisher,/env\.VERCEL_GIT_COMMIT_REF\.includes\('\/\/'\)/);
 assert.match(edge,/req\.headers\.get\('authorization'\)!=='Bearer '\+secret/);
 assert.match(edge,/const allowed=new Set/);
});
test('on repair/* preview, only already staged CI readback may proceed; no source writing',()=>{
 assert.match(edge,/const SOURCE_STAGING_BRANCH=\/\^reality/);
 assert.match(edge,/if\(s\.phase!=='CANDIDATE_STAGED'&&\s*\(!SOURCE_STAGING_BRANCH\.test\(body\.base_branch\)\|\|\s*s\.release_sha!==body\.base_sha\)\)/);
 assert.match(edge,/if\(s\.phase==='CANDIDATE_STAGED'\)\s*return await verifyCI\(s,project\.origin,secret,token\)/);
 assert.match(edge,/return await stage\(s,project\.origin,secret,token,body\.base_branch\)/);
 assert.match(edge,/head\.data\.files\[0\]\?\.filename!==artifact/);
 assert.match(edge,/sourceRead\.data\.parents\[0\]\?\.sha!==s\.release_sha/);
 assert.match(edge,/reality_record_chat_new_development_ci_v1/);
 assert.doesNotMatch(publisher,/reality_owner_approve|reality_admit_chat|reality_install|reality_settle/);
});
test('reconciliation response cannot grant installation or original completion',()=>{
 assert.match(publisher,/status,source_installed:false,installation_authorized:false/);
 assert.match(publisher,/original_job_completed:false,production_changed:false/);
 assert.match(edge,/status,source_installed:false,installation_authorized:false/);
 assert.match(edge,/original_job_completed:false,production_changed:false/);
 assert.match(edge,/feature_acceptance_verified:false/);
});
