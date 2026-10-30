import test from 'node:test';
import assert from 'node:assert/strict';
import {runOriginal178DelegatedWorker}
 from '../api/reality/personal-first-upgrade-178-background.js';

const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const conversation='592a7ab6-290f-43c3-82d0-1aaa9179fb65';
const queue='8811cc00-77cc-4a18-a61c-391eb7a4bff1';
const receipt='372ed47b-13b0-567d-b2b8-fbc691208e18';
const work='work:9b9578b3c65427589c4c6da68fe0fc87';
const nonce='a'.repeat(64);
const env={VERCEL_ENV:'preview',
 VERCEL_GIT_COMMIT_REF:'feature/first178-live-single-claim-execution-20261029',
 VERCEL_GIT_COMMIT_SHA:'b'.repeat(40),
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw'};
const db={url:'https://hvkfreoagbrphwghjajw.supabase.co',
 project:'hvkfreoagbrphwghjajw',secretKey:'service-role-only-test-key',
 strictSecrets:true};
const proof={verified:true,delegation:'EXISTING_OWNER_AUTHORIZED_ORIGINAL_JOB',
 owner_id:owner,conversation_id:conversation,queue_id:queue,
 checkpoint_receipt_id:receipt,original_work_id:work,
 installation_authorized:false,production_changed:false};
const result={status:'AWAITING_OWNER_APPROVAL',original_work_id:work,
 installation_authorized:false,capability_installed:false,
 original_job_completed:false,production_changed:false};
const defaults={env,configReader:()=>({url:db.url}),
 dbReader:()=>db,nonce};
test('original job #178 continues service-side from a consumed exact owner delegation',async()=>{
 let consumed=0,called=0;
 const r=await runOriginal178DelegatedWorker({...defaults,
  consume:async (actual,name,input)=>{
   consumed++;assert.equal(actual,db);
   assert.equal(name,'reality_consume_first178_background_handoff_v1');
   assert.deepEqual(input,{p_nonce:nonce});return proof;
  },
  execute:async ({session,conversationId,env:runtime})=>{
   called++;
   assert.equal(session.user_id,owner);
   assert.equal(session.authorization_origin,'ONCE_ONLY_ORIGINAL_WORK_DELEGATION');
   assert.equal(session.config.url,db.url);
   assert.equal(conversationId,conversation);
   assert.equal(runtime,env);
   assert.equal(session.access_token,undefined);
   return result;
  },
 });
 assert.equal(consumed,1);assert.equal(called,1);
 assert.equal(r.original_work_id,work);
 assert.equal(r.delegated_server_side,true);
 assert.equal(r.installation_authorized,false);
 assert.equal(r.original_job_completed,false);
});
test('no nonce, wrong target or nonpreview release cannot consume delegation',async()=>{
 let called=0;
 const opts={...defaults,consume:async()=>{called++;return proof;},
  execute:async()=>{called++;return result;}};
 await assert.rejects(runOriginal178DelegatedWorker({...opts,nonce:'invalid'}),
  /FIRST178_BACKGROUND_ONE_TIME_NONCE_REQUIRED/);
 await assert.rejects(runOriginal178DelegatedWorker({...opts,
  env:{...env,VERCEL_ENV:'production'}}),
  /FIRST178_BACKGROUND_ISOLATED_PREVIEW_REQUIRED/);
 await assert.rejects(runOriginal178DelegatedWorker({...opts,
  env:{...env,VERCEL_GIT_COMMIT_REF:'main'}}),
  /FIRST178_BACKGROUND_ISOLATED_PREVIEW_REQUIRED/);
 assert.equal(called,0);
});
test('foreign owner scope, work and fabricated installation are rejected',async()=>{
 for(const bad of [
  {original_work_id:'work:'+'f'.repeat(32)},
  {owner_id:'foreign-owner'},
  {verified:false},
  {delegation:'MODEL_SAYS_APPROVED'},
  {checkpoint_receipt_id:null},
  {installation_authorized:true},
  {production_changed:true}
 ]){
  let ran=false;
  await assert.rejects(runOriginal178DelegatedWorker({...defaults,
   consume:async()=>({...proof,...bad}),
   execute:async()=>{ran=true;return result;}}),
  /FIRST178_BACKGROUND_INDEPENDENT_ONCE_ONLY_DELEGATION_REJECTED/);
  assert.equal(ran,false);
 }
});
test('even trusted worker cannot claim installation, production changes or a settled original job',async()=>{
 for(const fabricated of [
  {installation_authorized:true},{capability_installed:true},
  {original_job_completed:true},{production_changed:true},
  {original_work_id:'work:'+'0'.repeat(32)}
 ]){
  await assert.rejects(runOriginal178DelegatedWorker({...defaults,
   consume:async()=>proof,
   execute:async()=>({...result,...fabricated})}),
  /FIRST178_BACKGROUND_DELEGATED_EXECUTION_RESULT_INVALID/);
 }
});
