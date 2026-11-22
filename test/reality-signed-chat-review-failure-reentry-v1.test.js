import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {independentlyReviewOneSignedChatRecoveryTarget}
 from '../src/reality-signed-chat-recovery-target-review-v1.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sql=read('../supabase/migrations/20261122020300_signed_chat_review_failure_and_expired_lease_v1.sql');
const worker=read('../api/reality/governed-employee-shift-worker.js');
const boundary=read('../src/reality-governed-shift-boundary-v1.js');
const canonical='11111111-1111-4111-8111-111111111111',
 other='22222222-2222-4222-8222-222222222222';
const hash='sha256:'+'c'.repeat(64);
test('source-provider error stores an evidence-class receipt rather than abandoning a claimed review',async()=>{
 const project='a'.repeat(20),calls=[];
 const result=await independentlyReviewOneSignedChatRecoveryTarget({
  db:{strictSecrets:true,project},
  env:{VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
   REALITY_GITHUB_TOKEN:'x'.repeat(42)},
  workerRunId:canonical,
  fetchImpl:async()=>({ok:false,json:async()=>null}),
  callRpc:async(_db,name,payload)=>{
   calls.push({name,payload});
   if(name==='reality_claim_next_signed_chat_recovery_target_review_v1')
    return {status:'SIGNED_CHAT_RECOVERY_INDEPENDENT_TARGET_REVIEW_LEASED',
     trigger_id:canonical,owner_id:other,source_message_id:canonical,
     review_id:other,worker_run_id:canonical,
     original_work_id:'work:'+'a'.repeat(32),
     base_sha:'b'.repeat(40),source_blob_sha:'c'.repeat(40),
     candidate_sha256:hash,spec_sha256:hash,blocker_receipt_sha256:hash,
     target_path:'src/reality-chat-new-development-worker-v1.js',
     source_ref:'supabase:reality_chat_messages:'+canonical,
     source_entrypoints:[
      'api/reality/governed-employee-shift-worker.js',
      'api/reality/generalized-original-install-review.js',
      'api/reality/generalized-owner-install-approval.js'],
     source_installed:false,installation_authorized:false,
     original_job_completed:false,production_changed:false,new_shift_started:false};
   if(name==='reality_record_signed_chat_recovery_target_review_failure_v1')
    return {status:'SIGNED_CHAT_RECOVERY_INDEPENDENT_REVIEW_REQUEUED_AFTER_SOURCE_FAILURE',
     failure_receipt_sha256:hash};
   throw Error('unexpected RPC '+name);
  }
 });
 assert.equal(result.status,'SIGNED_CHAT_RECOVERY_TARGET_PROVIDER_READBACK_UNVERIFIED');
 assert.equal(result.blocker_code,'PINNED_GITHUB_READ_UNVERIFIED');
 assert.equal(result.durable_failure_receipt_sha256,hash);
 assert.deepEqual(calls.map(x=>x.name),[
  'reality_claim_next_signed_chat_recovery_target_review_v1',
  'reality_record_signed_chat_recovery_target_review_failure_v1']);
 assert.deepEqual(calls[1].payload,{
  p_trigger_id:canonical,p_review_id:other,p_worker_run_id:canonical,
  p_failure_code:'PINNED_GITHUB_READ_UNVERIFIED'});
 assert.equal(result.installation_authorized,false);
 assert.equal(result.original_job_completed,false);
});
test('unverifiable database receipt does not falsely authorize recovery or replay the write',async()=>{
 const project='a'.repeat(20),calls=[];
 const result=await independentlyReviewOneSignedChatRecoveryTarget({
  db:{strictSecrets:true,project},
  env:{VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
   REALITY_GITHUB_TOKEN:'x'.repeat(42)},
  workerRunId:canonical,
  fetchImpl:async()=>({ok:false,json:async()=>null}),
  callRpc:async(_db,name)=>{
   calls.push(name);
   if(name==='reality_record_signed_chat_recovery_target_review_failure_v1')
    throw Error('provider database receipt lost');
   return {status:'SIGNED_CHAT_RECOVERY_INDEPENDENT_TARGET_REVIEW_LEASED',
    trigger_id:canonical,owner_id:other,source_message_id:canonical,
    review_id:other,worker_run_id:canonical,
    original_work_id:'work:'+'a'.repeat(32),base_sha:'b'.repeat(40),
    source_blob_sha:'c'.repeat(40),candidate_sha256:hash,
    spec_sha256:hash,blocker_receipt_sha256:hash,
    target_path:'src/reality-chat-new-development-worker-v1.js',
    source_ref:'supabase:reality_chat_messages:'+canonical,
    source_entrypoints:[
     'api/reality/governed-employee-shift-worker.js',
     'api/reality/generalized-original-install-review.js',
     'api/reality/generalized-owner-install-approval.js'],
    source_installed:false,installation_authorized:false,
    original_job_completed:false,production_changed:false,new_shift_started:false};
  }
 });
 assert.equal(result.status,'SIGNED_CHAT_RECOVERY_TARGET_PROVIDER_READBACK_UNVERIFIED');
 assert.equal(result.durable_failure_receipt_sha256,undefined);
 assert.equal(calls.length,2);
});
test('expired review is reclaimed once on later real worker, with source identity, anti-thrash, and terminal escalation',()=>{
 for(const term of [
  'reality_reconcile_expired_signed_chat_target_review_v1',
  "phase='SIGNED_CHAT_RECOVERY_TARGET_REVIEW_CLAIMED'",
  "is distinct from p_worker_run_id::text",
  "qualification_receipt->'target_review_lease'->>'expires_at'",
  "q.recovery_spec_sha256",
  "w.message_sha256=pg_catalog.encode(pg_catalog.sha256(",
  "w.development->>'phase'='CI_VERIFIED'",
  "w.development->>'original_work_id'=q.original_work_id",
  "n:=coalesce((q.qualification_receipt->>'target_review_retry_count')::integer,0)+1",
  "n<2 then 'SIGNED_CHAT_RECOVERY_DRAFT_GENERATED'",
  "'SIGNED_CHAT_RECOVERY_TARGET_REVIEW_UNVERIFIED'",
  "target_review_failure_history",
  "STRUCTURED_PROVIDER_OR_SOURCE_ESCALATION_REQUIRED",
  "installation_authorized',false",
  "original_job_completed',false",
  "production_changed',false"
 ]) assert.ok(sql.includes(term),term);
 assert.match(worker,/reality_reconcile_expired_signed_chat_target_review_v1/);
 assert.match(worker,/workerRunId:actualWorkerRunId/);
 assert.match(boundary,/reconcile_expired_signed_chat_target_review_v1/);
 assert.match(boundary,/record_signed_chat_recovery_target_review_failure_v1/);
 assert.doesNotMatch(sql,/INSERT INTO.*(reality_chat_messages|genuine_capability_queue_v1|governed_employee_shifts_v1)/i);
});
test('service-only recovery cannot silently become a privileged approval',()=>{
 for(const name of [
  'reality_record_signed_chat_recovery_target_review_failure_v1',
  'reality_reconcile_expired_signed_chat_target_review_v1']){
  assert.ok(sql.includes('function public.'+name));
  assert.ok(sql.includes('revoke all on function public.'+name));
  assert.ok(sql.includes('grant execute on function public.'+name));
 }
 assert.match(sql,/current_user<>'service_role'/);
 assert.doesNotMatch(sql,/installation_authorized',true|original_job_completed',true|production_changed',true/);
});
