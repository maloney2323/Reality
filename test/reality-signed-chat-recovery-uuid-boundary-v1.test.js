import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {independentlyReviewOneSignedChatRecoveryTarget}
 from '../src/reality-signed-chat-recovery-target-review-v1.js';
import {stageNextSignedChatRecoveryQuarantine}
 from '../src/reality-chat-recovery-quarantine-publisher-v1.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const reviewer=read('../src/reality-signed-chat-recovery-target-review-v1.js');
const broker=read('../supabase/functions/reality-chat-recovery-quarantine-broker-v1/index.ts');
const publisher=read('../src/reality-chat-recovery-quarantine-publisher-v1.js');
const proof=read('./ci/reality-signed-chat-recovery-quarantine-source-proof-v1.test.mjs');
const valid='11111111-1111-4111-8111-111111111111';
const wrong='11111111-1111-4111-8111--111111111111';
const canonical=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
test('canonical UUID must pass every formerly contradictory signed recovery guard',()=>{
 assert.equal(canonical.test(valid),true);
 assert.equal(canonical.test(wrong),false);
 for(const [name,source] of Object.entries({reviewer,broker,publisher,proof})){
  assert.ok(source.includes(canonical.toString()),name);
  assert.ok(!source.includes("/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}-[a-f0-9]{12}$/i"),
   name+' must not contain double-dash UUID syntax');
 }
});
test('actual same-run reviewer invokes service-only claim on standard canonical UUID',async()=>{
 const project='a'.repeat(20),called=[];
 const result=await independentlyReviewOneSignedChatRecoveryTarget({
  db:{strictSecrets:true,project},
  env:{VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project},
  workerRunId:valid,
  fetchImpl:async()=>{throw Error('network must not be called on empty claim')},
  callRpc:async(_db,name,payload)=>{
   called.push([name,payload]);
   return {status:'NO_SIGNED_CHAT_RECOVERY_CANDIDATE_TARGET_REVIEW_READY',
    installation_authorized:false,original_job_completed:false,
    production_changed:false,new_shift_started:false};
  }
 });
 assert.deepEqual(called,[['reality_claim_next_signed_chat_recovery_target_review_v1',
  {p_worker_run_id:valid}]]);
 assert.equal(result.status,'NO_SIGNED_CHAT_RECOVERY_CANDIDATE_TARGET_REVIEW_READY');
});
test('quarantine publisher validates REAL canonical trigger id without granting authority',async()=>{
 const project='a'.repeat(20);
 const result=await stageNextSignedChatRecoveryQuarantine({
  db:{strictSecrets:true,project,url:'https://'+project+'.supabase.co',
   secretKey:'x'.repeat(32)},
  env:{VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
   VERCEL_GIT_COMMIT_REF:'repair/verified-original-worker',
   VERCEL_GIT_COMMIT_SHA:'a'.repeat(40)},
  fetchImpl:async()=>({
   ok:true,json:async()=>({
    status:'SIGNED_CHAT_RECOVERY_QUARANTINE_PROVIDER_RECEIPTED',
    original_work_id:'work:'+'c'.repeat(32),
    trigger_id:valid,
    quarantine_receipt_sha256:'sha256:'+'d'.repeat(64),
    artifact_commit_sha:'e'.repeat(40),
    pr_url:'https://github.com/maloney2323/Reality/pull/917',
    provider_readback_verified:true,
    source_installed:false,independent_ci_verified:false,
    feature_acceptance_verified:false,installation_authorized:false,
    original_job_completed:false,production_changed:false,
    new_shift_started:false
   })
  })
 });
 assert.equal(result.status,'SIGNED_CHAT_RECOVERY_QUARANTINE_PROVIDER_RECEIPTED');
 assert.equal(result.trigger_id,valid);
 assert.equal(result.source_installed,false);
 assert.equal(result.original_job_completed,false);
});
