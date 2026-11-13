import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {continueOnceApprovedNative263Install} from
 '../src/reality-native263-approved-install-continuation-v1.js';
const WORK='work:873a6e74fd14c6beacc9042dd8021dfc';
const SHIFT='9460cfff-937a-4105-9093-2e41ab39a950';
const OWNER='85eeae0b-2988-43c4-b20c-590fb51da70d';
const HASH='sha256:459e2bbe9a9d9c7037c87542a9cdbebf06f77a6d368d72769c79fdbef7947f48';
const db={url:'https://hvkfreoagbrphwghjajw.supabase.co',
 project:'hvkfreoagbrphwghjajw',secretKey:'unit-only-supabase-service-key-123456789',
 strictSecrets:true};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:db.project};
const stage={status:'EXACT_NATIVE263_WARRANT_READBACK',
 original_work_id:WORK,shift_id:SHIFT,owner_id:OWNER,
 candidate_artifact_sha256:HASH,state:'STAGED_UNAPPROVED',
 exact_approval_receipt_recorded:false,source_installed:false,
 original_final_receipt_recorded:false,production_changed:false};
test('unapproved existing shift remains strictly read-only and never posts installer',async()=>{
 let calls=0;
 const result=await continueOnceApprovedNative263Install({
  db,env,fetchImpl:async(url,opt)=>{
   calls++;
   assert.match(url,/reality_read_native263_exact_install_warrant_v1$/);
   assert.equal(opt.method,'POST');
   return {ok:true,json:async()=>stage};
  }});
 assert.equal(calls,1);
 assert.equal(result.status,'EXACT_OWNER_APPROVAL_NOT_YET_GRANTED_NO_INSTALL');
 assert.equal(result.installation_authorized,false);
 assert.equal(result.source_installed,false);
 assert.equal(result.original_job_completed,false);
});
test('one recorded exact owner approval triggers existing signed worker installer automatically',async()=>{
 let claims=0,installs=0;
 const receipt={...stage,state:'OWNER_APPROVED',
  exact_approval_receipt_recorded:true};
 const result=await continueOnceApprovedNative263Install({
  db,env,fetchImpl:async(url,opt)=>{
   if(url.endsWith('/reality_read_native263_exact_install_warrant_v1')){
    claims++;return {ok:true,json:async()=>receipt};
   }
   installs++;
   assert.equal(url,db.url+'/functions/v1/reality-governed-native263-installer-v1');
   assert.equal(opt.body,'{"version":1,"action":"execute_exact_approved_native263_install"}');
   assert.equal(opt.headers.authorization,'Bearer '+db.secretKey);
   return {ok:true,json:async()=>({
    status:'NATIVE263_SOURCE_INSTALLED_DEPLOYMENT_NOT_YET_VERIFIED',
    original_work_id:WORK,shift_id:SHIFT,
    installation_authorized:true,source_installed:true,
    installed_commit_sha:'a'.repeat(40),
    original_job_completed:false,production_changed:false
   })};
  }});
 assert.equal(claims,1);assert.equal(installs,1);
 assert.equal(result.status,'EXACT_NATIVE263_SOURCE_INSTALLED_AWAITING_DEPLOYMENT_READBACK');
 assert.equal(result.source_installed,true);
 assert.equal(result.original_job_completed,false);
});
test('fenced prior installation or installed source never replays GitHub PUT',async()=>{
 for(const state of ['INSTALL_INTENT_FENCED','SOURCE_INSTALLED',
  'DEPLOYMENT_VERIFIED','ORIGINAL_EXECUTING','ORIGINAL_SETTLED','EFFECT_UNCERTAIN']){
  let calls=0;
  const result=await continueOnceApprovedNative263Install({
   db,env,fetchImpl:async(url)=>{
    calls++;
    assert.match(url,/reality_read_native263_exact_install_warrant_v1$/);
    return {ok:true,json:async()=>({...stage,state,
      exact_approval_receipt_recorded:true,source_installed:state!=='INSTALL_INTENT_FENCED'})};
   }});
  assert.equal(calls,1);
  assert.match(result.status,/READBACK_ONLY/);
 }
});
test('cannot cross original, project, owner or production boundary',async()=>{
 for(const changes of [
  {env:{...env,VERCEL_ENV:'production'}},
  {db:{...db,strictSecrets:false}},
  {db:{...db,project:'wrong'}},
 ]){
  await assert.rejects(()=>continueOnceApprovedNative263Install({
   db,env,...changes,fetchImpl:()=>{throw Error('must not reach')}
  }),/NATIVE263_AUTO_INSTALL_EXACT_ISOLATED_SIGNED_WORKER_SERVICE_REQUIRED/);
 }
 for(const changed of [
  {original_work_id:'work:'+'0'.repeat(32)},
  {owner_id:'00000000-0000-4000-8000-000000000000'},
  {candidate_artifact_sha256:'sha256:'+'0'.repeat(64)},
  {production_changed:true}
 ]){
  await assert.rejects(()=>continueOnceApprovedNative263Install({
   db,env,fetchImpl:async()=>({ok:true,json:async()=>({...stage,...changed})})
  }),/NATIVE263_AUTO_INSTALL_EXACT_OWNER_RECEIPT_MISMATCH/);
 }
});
test('authenticated owner click is one atomic original and warrant approval, default closed',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261112000007_native263_authenticated_exact_chat_approval_v1.sql',
  import.meta.url),'utf8');
 const api=readFileSync(new URL(
  '../api/reality/native263-owner-install-approval.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../reality-chat-simple.html',import.meta.url),'utf8');
 const ui=readFileSync(new URL(
  '../reality-native263-install-approval-ui-v1.js',import.meta.url),'utf8');
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(sql,/same_original_continuation_and_receipt_verified boolean not null default false/);
 assert.match(sql,/state text not null default 'BLOCKED_AWAITING_VERIFIED_CONTINUATION'/);
 assert.match(sql,/security definer set search_path=''/);
 assert.match(sql,/v_owner uuid:=auth\.uid\(\)/);
 assert.match(sql,/auth\.jwt\(\)->>'role'/);
 assert.match(sql,/AUTHENTICATED_OWNER_EXPLICIT_REALITY_CHAT_CLICK/);
 assert.match(sql,/NATIVE263_INSTALL_APPROVAL_BLOCKED_UNVERIFIED_FINAL_CONTINUATION/);
 assert.match(sql,/update reality_internal\.native263_exact_install_warrants_v1/);
 assert.match(sql,/update reality_internal\.riley_unattended_repair_originals_v1/);
 assert.match(sql,/grant execute on function public\.reality_owner_approve_native263_exact_install_v1\(text,text,text,text,uuid\)\s+to authenticated/);
 assert.doesNotMatch(sql,/grant execute on function public\.reality_owner_approve_native263_exact_install_v1\(text,text,text,text,uuid\)\s+to anon/);
 assert.match(api,/authenticatedChatSession\(req,res\)/);
 assert.match(api,/assertSameOrigin\(req\)/);
 assert.match(api,/authorization:'Bearer '\+session\.access_token/);
 assert.match(api,/p_intent:INTENT,p_confirmation:CONFIRM/);
 assert.match(api,/retry_owner_approval:false/);
 assert.doesNotMatch(api,/createLiveGeneralRepairService|ownerApproveAndQueue/);
 assert.match(html,/id="native263ApproveInstall"[^>]*disabled/);
 assert.match(html,/reality-native263-install-approval-ui-v1.js/);
 assert.match(ui,/data\.owner_approval_ready===true/);
 assert.match(ui,/same_original_continuation_and_receipt_verified===true/);
 assert.match(ui,/button\.addEventListener\('click'/);
 assert.match(ui,/request_id:crypto\.randomUUID\(\)/);
 assert.match(worker,/continueOnceApprovedNative263Install/);
 assert.match(worker,/native_exact_owner_approved_auto_install:nativeOwnerApprovedInstallation/);
});
