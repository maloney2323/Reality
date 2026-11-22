import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateExactUniqueDevelopmentPatch}
 from '../src/reality-chat-new-development-worker-v1.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sql=read('../supabase/migrations/20261122005500_signed_chat_recovery_source_revision_retry_v1.sql');
const worker=read('../api/reality/governed-employee-shift-worker.js');
const model=read('../src/reality-chat-new-development-worker-v1.js');
const boundary=read('../src/reality-governed-shift-boundary-v1.js');
test('independent exact-source validator allows one valid frozen edit',()=>{
 const src='export function original(){return "old";}\n';
 const v=validateExactUniqueDevelopmentPatch(src,{
  find:'function original(){return "old";}',
  replace:'function original(){return "new";}',
  reason:'Repair a bounded existing source operation'
 });
 assert.equal(v.ok,true);
 assert.equal(v.reason,'EXACT_UNIQUE_FROZEN_PATCH_VERIFIED');
 assert.equal(v.proposed,'export function original(){return "new";}\n');
});
test('reject fabricated, duplicate, malformed and identical model patches',()=>{
 const src='const actualUniqueValue = 123456;\nconst repeatedBlock = "a";\nconst repeatedBlock = "a";\n';
 const data=[
  {find:'const notInFrozenSource = 123456;',replace:'const notInFrozenSource = 123457;',reason:'Bounded update to frozen source'},
  {find:'const repeatedBlock = "a";',replace:'const repeatedBlock = "b";',reason:'Bounded update to frozen source'},
  {find:'const actualUniqueValue = 123456;',replace:'const actualUniqueValue = 123456;',reason:'Bounded update to frozen source'},
  {find:'const actualUniqueValue = 123456;',replace:'const bad = "\\0";',reason:'Bounded update to frozen source'}
 ];
 for(const choice of data)assert.equal(
  validateExactUniqueDevelopmentPatch(src,choice).ok,false);
});
test('one verifier-guided model correction, never open ended or model authority',()=>{
 assert.match(model,/role:'patch_correction'/);
 assert.match(model,/if\(!checked\.ok&&recoveryMode\)/);
 assert.match(model,/MODEL_REPEATED_INVALID_PATCH/);
 assert.match(model,/JSON\.stringify\(patch\.choice\)/);
 assert.match(model,/validateExactUniqueDevelopmentPatch\(text,patch\.choice\)/);
 assert.match(model,/if\(!checked\.ok\)\s*fail\('MODEL_BOUNDED_UNIQUE_CODE_CHANGE_NOT_VERIFIED'\)/);
 assert.match(model,/Buffer\.from\(text,'utf8'\)\.length!==bytes\.length/);
 assert.match(model,/text\.includes\('\\0'\)/);
});
test('prior failure memory cannot requeue the same source release or replay arbitrary errors',()=>{
 for(const x of [
  "current_user<>'service_role'",
  "phase='SIGNED_CHAT_RECOVERY_MODEL_REJECTED'",
  "'MODEL_BOUNDED_UNIQUE_CODE_CHANGE_NOT_VERIFIED'",
  "source_env_fingerprint'",
  'is distinct from p_release_sha',
  "recovery_revision_count')::integer,0)=0",
  "qualified_candidate is null",
  "quarantine_receipt_sha256 is null",
  "w.message_sha256=pg_catalog.encode(pg_catalog.sha256(",
  "w.development->>'phase'='CI_VERIFIED'",
  "w.development->>'original_work_id'=q.original_work_id",
  "recovery_spec_sha256 is distinct from",
  "SIGNED_CHAT_RECOVERY_SAME_ORIGINAL_REQUEUED_ON_CHANGED_RELEASE",
  "negative_capability_memory",
  "'max_retries_after_revision',1",
  "'installation_authorized',false","'original_job_completed',false",
  "'production_changed',false"
 ]) assert.ok(sql.includes(x),x);
 assert.match(sql,/revoke all on function public\.reality_requeue_signed_chat_recovery_after_upgrade_v1/);
 assert.match(sql,/grant execute on function public\.reality_requeue_signed_chat_recovery_after_upgrade_v1/);
 assert.doesNotMatch(sql,/INSERT INTO reality_internal\.genuine_capability_queue_v1|INSERT INTO public\.reality_chat_messages|new_shift_started',true/i);
});
test('same existing signed worker uses one changed source revision and existing model executor',()=>{
 assert.match(worker,/reality_requeue_signed_chat_recovery_after_upgrade_v1/);
 assert.match(worker,/p_release_sha:process\.env\.VERCEL_GIT_COMMIT_SHA/);
 assert.match(worker,/generateNextSignedChatDevelopmentDraft\(\{\s*db,env:process\.env,fetchImpl:fetch,recoveryMode:true/);
 assert.match(boundary,/requeue_signed_chat_recovery_after_upgrade_v1/);
});
