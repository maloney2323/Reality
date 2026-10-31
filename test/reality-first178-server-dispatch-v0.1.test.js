import test from 'node:test';
import assert from 'node:assert/strict';
import {
 verifyFirst178DispatchAuthorization,dispatchFirst178ApprovedOriginal,
} from '../api/reality/personal-first-upgrade-178-dispatch.js';

const branch='feature/first178-live-single-claim-execution-20261029';
const work='work:9b9578b3c65427589c4c6da68fe0fc87';
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:branch,
 VERCEL_GIT_COMMIT_SHA:'a'.repeat(40),
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw',
 REALITY_FIRST178_DISPATCH_SECRET:'a'.repeat(64),CRON_SECRET:'b'.repeat(64)};
const db={strictSecrets:true,secretKey:'service-credential-not-real',
 url:'https://hvkfreoagbrphwghjajw.supabase.co',
 project:'hvkfreoagbrphwghjajw'};
const proof={minted_once:true,nonce:'a'.repeat(64),queue_id:'8811cc00-77cc-4a18-a61c-391eb7a4bff1',
 checkpoint_receipt_id:'372ed47b-13b0-567d-b2b8-fbc691208e18',
 original_work_id:work,installation_authorized:false};
test('POST webhook requires dedicated scoped service secret and is never a browser action',()=>{
 assert.equal(verifyFirst178DispatchAuthorization({method:'POST',env,
  headers:{authorization:'Bearer '+env.REALITY_FIRST178_DISPATCH_SECRET}}),true);
 for(const headers of [
  {authorization:'Bearer '+env.CRON_SECRET},
  {authorization:'Bearer '+env.REALITY_FIRST178_DISPATCH_SECRET,origin:'https://example.com'},
  {authorization:'Bearer '+env.REALITY_FIRST178_DISPATCH_SECRET,cookie:'auth=session'},
  {authorization:'Bearer '+'z'.repeat(64)},
  {},
 ]){
  assert.throws(()=>verifyFirst178DispatchAuthorization({method:'POST',env,headers}),
    /^Error: FIRST178_DISPATCH_/);
 }
 assert.throws(()=>verifyFirst178DispatchAuthorization({method:'POST',
  env:{...env,VERCEL_ENV:'production'},
  headers:{authorization:'Bearer '+env.REALITY_FIRST178_DISPATCH_SECRET}}),
 /FIRST178_DISPATCH_EXACT_ISOLATED_PREVIEW_REQUIRED/);
});
test('GET cron requires CRON_SECRET, and preview-only guard denies production schedule',()=>{
 assert.equal(verifyFirst178DispatchAuthorization({method:'GET',env,
  headers:{authorization:'Bearer '+env.CRON_SECRET}}),true);
 assert.throws(()=>verifyFirst178DispatchAuthorization({method:'GET',env,
  headers:{authorization:'Bearer '+env.REALITY_FIRST178_DISPATCH_SECRET}}),
  /FIRST178_DISPATCH_INVALID_SERVICE_DISPATCH_SECRET/);
 assert.throws(()=>verifyFirst178DispatchAuthorization({method:'GET',env:{
  ...env,VERCEL_ENV:'production'
 },headers:{authorization:'Bearer '+env.CRON_SECRET}}),
  /FIRST178_DISPATCH_EXACT_ISOLATED_PREVIEW_REQUIRED/);
});
test('trusted dispatcher mints and consumes one original-job nonce IN PROCESS',async()=>{
 let minted=0,executed=0;
 const outcome=await dispatchFirst178ApprovedOriginal({env,
  configReader:()=>({url:db.url}),dbReader:()=>db,
  call:async(actualDb,name,input)=>{
   minted++;assert.equal(actualDb,db);
   assert.equal(name,'reality_mint_first178_background_handoff_v1');
   assert.deepEqual(input,{});return proof;
  },
  worker:async({nonce,env:workerEnv})=>{
   executed++;
   assert.equal(nonce,proof.nonce);
   assert.equal(workerEnv,env);
   return {status:'AWAITING_OWNER_APPROVAL',
    original_work_id:work,owner_approval_required:true,
    checkpoint_receipt_id:proof.checkpoint_receipt_id,
    installation_authorized:false,capability_installed:false,
    original_job_completed:false,production_changed:false};
  },
 });
 assert.equal(minted,1);assert.equal(executed,1);
 assert.equal(outcome.status,'AWAITING_OWNER_APPROVAL');
 assert.equal(outcome.verified_server_dispatch,true);
 assert.equal(outcome.installation_authorized,undefined);
 assert.equal(outcome.installed,false);
 assert.equal(outcome.original_job_completed,false);
 assert.equal(JSON.stringify(outcome).includes(proof.nonce),false);
});
test('unauthorized original job, stale queue, or false provider proof never invokes worker',async()=>{
 for(const faulty of [
  {original_work_id:'work:'+'f'.repeat(32)},
  {minted_once:false},{installation_authorized:true},
  {nonce:'short'},{queue_id:'foreign'},
  {checkpoint_receipt_id:'not-an-event'},
 ]){
  let executed=0;
  await assert.rejects(dispatchFirst178ApprovedOriginal({env,
   configReader:()=>({url:db.url}),dbReader:()=>db,
   call:async()=>({...proof,...faulty}),
   worker:async()=>{executed++;throw Error('FORBIDDEN');},
  }),/FIRST178_DISPATCH_DATABASE_ONE_SHOT_DISPATCH_NOT_VERIFIED/);
  assert.equal(executed,0);
 }
});
test('no fallback to public project or unauthorized completion claim',async()=>{
 let mint=0;
 await assert.rejects(dispatchFirst178ApprovedOriginal({env,
  configReader:()=>({url:'https://wrong-project.supabase.co'}),
  dbReader:()=>db,call:async()=>{mint++;}
 }),/FIRST178_DISPATCH_SCOPED_SERVICE_DATABASE_REQUIRED/);
 assert.equal(mint,0);
 for(const faulty of [
  {original_work_id:'work:'+'f'.repeat(32)},{capability_installed:true},
  {original_job_completed:true},{installation_authorized:true},
  {production_changed:true},
 ]){
  await assert.rejects(dispatchFirst178ApprovedOriginal({env,
    configReader:()=>({url:db.url}),dbReader:()=>db,
    call:async()=>proof,
    worker:async()=>({status:'AWAITING_OWNER_APPROVAL',
     original_work_id:work,installation_authorized:false,
     capability_installed:false,original_job_completed:false,
     production_changed:false,...faulty}),
   }),/FIRST178_DISPATCH_ORIGINAL_JOB_WORKER_RESULT_UNVERIFIED/);
 }
});
