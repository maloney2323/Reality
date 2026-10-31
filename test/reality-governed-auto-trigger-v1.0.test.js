import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {
 capabilityFromSourcePath,registerOriginalJobCapabilityAutoTrigger,
 claimOriginalJobCapabilityAutoTrigger,
} from '../src/reality-governed-auto-trigger-v1.0.js';
const project='hvkfreoagbrphwghjajw',url='https://'+project+'.supabase.co';
const owner=randomUUID(),conv=randomUUID(),event=randomUUID(),goalEvent=randomUUID(),trigger=randomUUID(),claim=randomUUID();
const original='work:'+'a'.repeat(32);
const env={VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
 REALITY_PERSONAL_CHAT_SUPABASE_URL:url,
 REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY:'sb_publishable_testonly',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:project,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:project,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:url,
 REALITY_UNIVERSE_PERSISTENCE_KEY:'non-real-db-secret-unit-test'};
const session={user_id:owner,config:{url}};
const evidence={independently_verified:true,source_sha:'c'.repeat(40),
 source_path:'src/reality-extensions/reality-general-execution-receipt.mjs',
 original_provider_failed_run_id:41177409146};
test('a real missing extension maps to an exact governed capability, never an arbitrary path',()=>{
 assert.equal(capabilityFromSourcePath(evidence.source_path),'reality_general_execution_receipt');
 for(const path of ['../exec.mjs','api/reality/personal-chat.js','src/reality-extensions/../danger.mjs','src/reality-extensions/Danger.mjs'])
  assert.throws(()=>capabilityFromSourcePath(path),/GOVERNED_AUTO_TRIGGER_SOURCE_PATH_UNVERIFIED/);
});
test('an original work receipt automatically enqueues once, with no installation authorization',async()=>{
 let observed=0;
 const result=await registerOriginalJobCapabilityAutoTrigger({
  session,conversationId:conv,originalWorkId:original,
  originalWorkEventId:event,goalTransitionEventId:goalEvent,evidence,env,
  invoke:async (_db,name,input)=>{
   observed++;
   assert.equal(name,'reality_enqueue_governed_auto_trigger_v1');
   assert.equal(input.p_owner_id,owner);
   assert.equal(input.p_conversation_id,conv);
   assert.equal(input.p_original_work_id,original);
   assert.equal(input.p_original_work_event_id,event);
   assert.equal(input.p_goal_transition_event_id,goalEvent);
   assert.equal(input.p_capability_id,'reality_general_execution_receipt');
   return {trigger_id:trigger,source_event_id:event,
    original_work_id:original,phase:'PENDING_VERIFIED_GAP_REOBSERVATION',
    installation_authorized:false,original_job_completed:false,
    production_changed:false,new_customer_job_created:false};
  },
 });
 assert.equal(observed,1);
 assert.equal(result.status,'PENDING_VERIFIED_GAP_REOBSERVATION');
 assert.equal(result.original_work_id,original);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.new_customer_job_created,false);
});
test('worker claims at most one original event; claim is not a model grant',async()=>{
 const result=await claimOriginalJobCapabilityAutoTrigger({
  session,triggerId:trigger,originalWorkId:original,env,
  invoke:async (_db,name,input)=>{
   assert.equal(name,'reality_claim_governed_auto_trigger_v1');
   assert.equal(input.p_owner_id,owner);
   return {trigger_id:trigger,claim_id:claim,original_work_id:original,
    original_work_event_id:event,phase:'CLAIMED_FOR_INDEPENDENT_INVESTIGATION',
    reobserve_before_generation:true,installation_authorized:false,
    original_job_completed:false,new_customer_job_created:false,production_changed:false};
  },
 });
 assert.equal(result.model_generation_authorized,false);
 assert.equal(result.original_job_completed,false);
 assert.equal(result.claim_id,claim);
});
test('unauthenticated, foreign scope, forged evidence and false success are rejected',async()=>{
 const common={session,conversationId:conv,originalWorkId:original,
  originalWorkEventId:event,goalTransitionEventId:goalEvent,evidence,env};
 const bad=[
  {...common,session:{...session,user_id:'fake'}},
  {...common,env:{...env,VERCEL_ENV:'production'}},
  {...common,originalWorkId:'work:'+'f'.repeat(33)},
  {...common,evidence:{...evidence,independently_verified:false}},
  {...common,evidence:{...evidence,source_sha:'unknown'}},
 ];
 for(const input of bad)await assert.rejects(
  registerOriginalJobCapabilityAutoTrigger({...input,invoke:async()=>{throw Error('MUST_NOT_CALL')}}),
  /GOVERNED_AUTO_TRIGGER_/);
 await assert.rejects(registerOriginalJobCapabilityAutoTrigger({
  ...common,invoke:async()=>({trigger_id:trigger,source_event_id:event,
   original_work_id:original,phase:'PENDING_VERIFIED_GAP_REOBSERVATION',
   installation_authorized:true,original_job_completed:false,
   production_changed:false,new_customer_job_created:false}),
 }),/GOVERNED_AUTO_TRIGGER_DURABLE_PROVIDER_RECEIPT_MISMATCH/);
});
