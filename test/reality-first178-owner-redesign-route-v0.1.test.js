import test from 'node:test';
import assert from 'node:assert/strict';
import {authorizeAndRunOriginal178Redesign}
 from '../api/reality/personal-first-upgrade-178-redesign.js';
const work='work:9b9578b3c65427589c4c6da68fe0fc87';
const owner='11111111-1111-4111-8111-111111111111';
const convo='22222222-2222-4222-8222-222222222222';
const queue='33333333-3333-4333-8333-333333333333';
const receipt='44444444-4444-4444-8444-444444444444';
const state={status:'EXHAUSTED_CORRECTION_ATTEMPTS',
 original_work_id:work,queue_id:queue,attempt_limit:8,attempts_used:8,
 installation_authorized:false,original_job_completed:false,
 last_failure_kind:'REGRESSION',
 last_failure_evidence_ref:'vercel:provider-verified:sbx_12345678901234567890123456',
 checkpoint_hash:'a'.repeat(64),checkpoint_receipt_id:receipt};
const action={intent:'AUTHORIZE_ONE_ORIGINAL_178_SOURCE_REDESIGN_ATTEMPT',
 original_work_id:work,checkpoint_hash:state.checkpoint_hash,
 checkpoint_receipt_id:receipt,owner_confirms_one_attempt:true,
 owner_confirms_installation:false};
const env={VERCEL_ENV:'preview',
 VERCEL_GIT_COMMIT_REF:'feature/first178-live-single-claim-execution-20261029'};
const original={original_work_id:work,queue_id:queue,conversation_id:convo};
function setup(override={}){
 let grants=0,runs=0;
 const inputs={session:{user_id:owner},env,
  view:async()=>state,resolve:async()=>original,
  dbReader:()=>({}),call:async(_db,fn,arg)=>{
   if(fn==='reality_authorize_first178_one_redesign_v1'){
    grants++;
    assert.equal(arg.p_owner_id,owner);
    assert.equal(arg.p_failure_evidence_ref,state.last_failure_evidence_ref);
    assert.equal(arg.p_owner_confirms_one_attempt,true);
   }else{
    assert.equal(fn,'reality_read_first178_one_redesign_v1');
   }
   return {reserved_once:true,reservation_id:'55555555-5555-4555-8555-555555555555',
    original_work_id:work,queue_id:queue,
    checkpoint_hash:state.checkpoint_hash,checkpoint_receipt_id:receipt,
    owner_confirmed:true,authorization_scope:'ONE_ORIGINAL178_REDESIGN_ATTEMPT',
    installation_authorized:false,job_completed:false};
  },
  run:async()=>{runs++;return {
   status:'AWAITING_OWNER_APPROVAL',original_work_id:work,
   attempt_count:9,installation_authorized:false,original_job_completed:false}},
  action,...override,
 };
 return {inputs,get grants(){return grants},get runs(){return runs}};
}
test('owner confirms one repair attempt, one atomic reservation and same driver, no installation',async()=>{
 const p=setup();
 const result=await authorizeAndRunOriginal178Redesign(p.inputs);
 assert.equal(p.grants,1);assert.equal(p.runs,1);
 assert.equal(result.status,'AWAITING_OWNER_APPROVAL');
 assert.equal(result.original_history_preserved,true);
 assert.equal(result.owner_confirmation_consumed,true);
 assert.equal(result.another_attempt_authorized,false);
});
test('without exact owner intent never reserve or run',async()=>{
 for(const bad of [
  {...action,owner_confirms_one_attempt:false},
  {...action,owner_confirms_installation:true},
  {...action,original_work_id:'work:'+'0'.repeat(32)},
  {...action,checkpoint_hash:'0'.repeat(64)},
 ]){
  const p=setup({action:bad});
  await assert.rejects(authorizeAndRunOriginal178Redesign(p.inputs),
   /EXPLICIT_BOUND_OWNER_REDESIGN_CONSENT_REQUIRED/);
  assert.equal(p.grants,0);assert.equal(p.runs,0);
 }
});
test('unverified original checkpoint prevents attempted reservation',async()=>{
 const p=setup({view:async()=>({...state,attempt_limit:7})});
 await assert.rejects(authorizeAndRunOriginal178Redesign(p.inputs),
 /EIGHT_FAILED_ATTEMPTS_NOT_SOURCE_VERIFIED/);
 assert.equal(p.grants,0);
});
test('an uncertain execution does not auto-repeat or claim completion',async()=>{
 const p=setup({run:async()=>{throw Error('PROVIDER_NETWORK_TIMEOUT')}});
 const result=await authorizeAndRunOriginal178Redesign(p.inputs);
 assert.equal(p.grants,1);
 assert.equal(result.status,'REDESIGN_RESERVED_EXECUTION_NEEDS_READBACK');
 assert.equal(result.do_not_repeat_grant,true);
 assert.equal(result.original_job_completed,false);
});
