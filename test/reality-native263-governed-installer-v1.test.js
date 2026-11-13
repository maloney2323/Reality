import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync(new URL(
 '../supabase/migrations/20261112000005_native263_exact_installer_intent_fence_v1.sql',
 import.meta.url),'utf8');
const edge=readFileSync(new URL(
 '../supabase/functions/reality-governed-native263-installer-v1/index.ts',
 import.meta.url),'utf8');

test('no owner approval never permits an installer provider write',()=>{
 const gate=sql.slice(sql.indexOf('create or replace function public.reality_claim_exact_native263_install_v1('),
 sql.indexOf('create or replace function public.reality_attest_exact_native263_installed_source_v1('));
 assert.match(gate,/current_user<>'service_role'/);
 assert.match(gate,/c\.state='STAGED_UNAPPROVED'/);
 assert.match(gate,/EXACT_NATIVE263_OWNER_INSTALL_APPROVAL_REQUIRED_NO_WRITE/);
 assert.match(gate,/c\.state<>'OWNER_APPROVED'/);
 assert.match(gate,/j\.exact_approval_receipt_ref is distinct from v_expected_ref/);
 assert.match(gate,/j\.installed is distinct from false/);
 assert.match(gate,/j\.production_changed is distinct from false/);
 assert.match(gate,/c\.install_intent_recorded_at is not null/);
 assert.match(gate,/c\.installed_commit_sha is not null/);
 assert.match(gate,/w\.state='ACTIVE'/);
 assert.match(gate,/state='INSTALL_INTENT_FENCED'/);
 assert.match(gate,/status','EXACT_NATIVE263_OWNER_APPROVED_INSTALL_INTENT_FENCED'/);
 assert.match(gate,/INSTALL_INTENT_FENCED' then/);
 assert.match(gate,/READBACK_ONLY/);
 assert.doesNotMatch(gate,/UPDATE\s+reality_internal\.riley_unattended_repair_originals_v1/i);
});
test('exact source effect receipt requires independent original/provider evidence',()=>{
 const stage=sql.slice(sql.indexOf('create or replace function public.reality_attest_exact_native263_installed_source_v1('));
 assert.match(stage,/current_user<>'service_role'/);
 assert.match(stage,/p_blob_sha<>'dda8e71d44cca6745312bcbd000089d5a0b01d54'/);
 assert.match(stage,/approval_receipt_id is null/);
 assert.match(stage,/c\.install_intent_recorded_at is null/);
 assert.match(stage,/c\.state not in \('INSTALL_INTENT_FENCED','SOURCE_INSTALLED'\)/);
 assert.match(stage,/state='SOURCE_INSTALLED'/);
 assert.match(stage,/original_job_completed',false/);
 assert.match(stage,/production_changed',false/);
 assert.doesNotMatch(sql,/grant execute on function public\.reality_claim_exact_native263_install_v1\(\)\s+to authenticated/);
 assert.doesNotMatch(sql,/grant execute on function public\.reality_claim_exact_native263_install_v1\(\)\s+to anon/);
});
test('provider uses exact method path and original SHA, never installs before DB warrant',()=>{
 const handler=edge.slice(edge.indexOf('Deno.serve(async req=>'));
 assert.match(handler,/await rpc\('reality_claim_exact_native263_install_v1',\{\},key\)/);
 assert.match(handler,/EXACT_NATIVE263_OWNER_INSTALL_APPROVAL_REQUIRED_NO_WRITE/);
 assert.match(handler,/claim\.installation_authorized!==true/);
 assert.match(handler,/checkCurrent\(token\),checkCandidate\(token\)/);
 assert.match(handler,/current\.blob!==OLD_BLOB/);
 assert.match(handler,/ref\.json\?\.object\?\.sha!==current\.head/);
 assert.match(handler,/branch:BRANCH,sha:OLD_BLOB,content:candidate\.base64/);
 assert.match(handler,/read\.head!==commit\|\|read\.blob!==NEW_BLOB/);
 assert.match(handler,/reality_attest_exact_native263_installed_source_v1/);
 assert.match(handler,/NATIVE263_SOURCE_INSTALLED_DEPLOYMENT_NOT_YET_VERIFIED/);
 assert.match(handler,/NATIVE263_EXISTING_INSTALL_INTENT_RECONCILE_READBACK_ONLY/);
 assert.match(handler,/NATIVE263_INSTALL_PROVIDER_EFFECT_UNCERTAIN_NO_RETRY/);
 assert.match(edge,/const BRANCH='reality\/isolated-openai-governance-gateway-20261108'/);
 assert.match(edge,/const PATH='src\/reality-riley-service-original-runtime-v1.js'/);
 assert.match(edge,/const NEW_BLOB='dda8e71d44cca6745312bcbd000089d5a0b01d54'/);
 assert.match(edge,/const OLD_BLOB='aaf22a1f69a2c3e91e18641cf1ef40d16a563bc0'/);
 assert.match(edge,/method==='PUT'&&path===write/);
 assert.match(edge,/method==='GET'&&\[ref,current,candidate\]\.includes\(path\)/);
 assert.doesNotMatch(handler,/req\.body\..*(?:branch|sha|path|token)/);
});
test('no false installation receipt or owner approval is created by migration',()=>{
 assert.doesNotMatch(sql,/create or replace function public\.reality_owner_approve/);
 assert.doesNotMatch(sql,/update\s+reality_internal\.native263_exact_install_warrants_v1\s+set state='OWNER_APPROVED'/);
 assert.doesNotMatch(sql,/create\s+table.*(?:production|finance|universe)/i);
 assert.doesNotMatch(sql,/grant .* to public/);
 assert.match(edge,/original_final_receipt_recorded:false/);
 assert.match(edge,/deployment_verified:false/);
});
