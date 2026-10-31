import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {autoPrepareOriginalJobCandidate}
 from '../src/reality-governed-auto-trigger-candidate-v1.0.js';
const job='work:'+'a'.repeat(32),id=randomUUID(),claimId=randomUUID();
const env={VERCEL_ENV:'preview',REALITY_GOVERNED_AUTO_TRIGGER_ENABLED:'true'};
const trigger={status:'PENDING_VERIFIED_GAP_REOBSERVATION',
 trigger_id:id,original_work_id:job,installation_authorized:false,
 original_job_completed:false};
const ready={status:'EXACT_CANDIDATE_AWAITING_SIGNED_OWNER_INSTALL_APPROVAL',
 original_work_id:job,independent_readback_verified:true,
 candidate_artifact_hash:'b'.repeat(64),
 constitutional_checkpoint_hash:'c'.repeat(64),
 owner_installation_approved:false,original_job_completed:false,
 production_changed:false,independent_test_run_id:123,
 original_provider_failed_run_id:456,source_files:['src/reality-extensions/example.mjs']};
const claimed={original_work_id:job,phase:'CLAIMED_FOR_INDEPENDENT_INVESTIGATION',
 claim_id:claimId,installation_authorized:false,original_job_completed:false};
test('trigger automatically prepares verified candidate for ONE separate owner approval on SAME job',async()=>{
 let stages=[];
 const result=await autoPrepareOriginalJobCandidate({
  session:{user_id:randomUUID()},trigger,originalWorkId:job,
  issueNumber:188,env,
  prepare:async x=>{stages.push('verify_and_checkpoint');assert.equal(x.expectedOriginalWorkId,job);return ready},
  claim:async x=>{stages.push('atomic_claim');assert.equal(x.originalWorkId,job);assert.equal(x.triggerId,id);return claimed},
 });
 assert.deepEqual(stages,['verify_and_checkpoint','atomic_claim']);
 assert.equal(result.original_work_id,job);
 assert.equal(result.status,'AUTO_TRIGGER_VERIFIED_REPAIR_AWAITING_OWNER_INSTALL_APPROVAL');
 assert.equal(result.owner_action_required,true);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.original_job_completed,false);
 assert.equal(result.new_customer_job_created,false);
});
test('unverified or foreign candidate cannot consume the one-time trigger',async()=>{
 for(const broken of [
  {...ready,independent_readback_verified:false},
  {...ready,original_work_id:'work:'+'c'.repeat(32)},
  {...ready,owner_installation_approved:true},
  {...ready,original_job_completed:true},
  {...ready,constitional_checkpoint_hash:'wrong',constitutional_checkpoint_hash:null},
 ]){
  let claimedCount=0;
  await assert.rejects(autoPrepareOriginalJobCandidate({
   session:{user_id:randomUUID()},trigger,originalWorkId:job,issueNumber:188,env,
   prepare:async()=>broken,claim:async()=>{claimedCount++;return claimed},
  }),/AUTO_TRIGGER_CANDIDATE_INDEPENDENT_CONSTITUTIONAL_READBACK_REQUIRED/);
  assert.equal(claimedCount,0);
 }
});
test('no owner-approved original source means no candidate preparation',async()=>{
 let count=0;
 for(const t of [null,{...trigger,installation_authorized:true},
  {...trigger,status:'CLAIMED_FOR_INDEPENDENT_INVESTIGATION'},
  {...trigger,original_work_id:'work:'+'f'.repeat(32)}]){
  await assert.rejects(autoPrepareOriginalJobCandidate({
   session:{user_id:randomUUID()},trigger:t,originalWorkId:job,issueNumber:188,env,
   prepare:async()=>{count++;return ready},
  }),/AUTO_TRIGGER_CANDIDATE_OWNER_SOURCE_BACKED_UNCLAIMED_TRIGGER_REQUIRED/);
 }
 assert.equal(count,0);
});
test('candidate provider failure leaves one-time claim unconsumed for reconcilable retry',async()=>{
 let claims=0;
 await assert.rejects(autoPrepareOriginalJobCandidate({
  session:{user_id:randomUUID()},trigger,originalWorkId:job,issueNumber:188,env,
  prepare:async()=>{throw Error('INDEPENDENT_PROVIDER_UNAVAILABLE')},
  claim:async()=>{claims++},
 }),/INDEPENDENT_PROVIDER_UNAVAILABLE/);
 assert.equal(claims,0);
});
