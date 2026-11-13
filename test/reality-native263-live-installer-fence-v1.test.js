import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkNative263LiveOwnerApprovalFence} from
 '../src/reality-native263-live-installer-fence-bridge-v1.js';
const SHIFT='9460cfff-937a-4105-9093-2e41ab39a950';
const WORK='work:873a6e74fd14c6beacc9042dd8021dfc';
const db={url:'https://hvkfreoagbrphwghjajw.supabase.co',
 project:'hvkfreoagbrphwghjajw',strictSecrets:true,
 secretKey:'isolated_service_role_test_key_long_enough'};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:db.project};
const warrant={status:'EXACT_NATIVE263_OWNER_WARRANT_STAGED_INSTALL_BLOCKED',
 original_work_id:WORK,shift_id:SHIFT,owner_approval_ready:false,
 installation_authorized:false,original_job_completed:false};
const denial={status:'EXACT_NATIVE263_OWNER_INSTALL_APPROVAL_REQUIRED_NO_WRITE',
 original_work_id:WORK,shift_id:SHIFT,installation_authorized:false,
 source_installed:false,deployment_verified:false,
 original_final_receipt_recorded:false,original_job_completed:false,
 production_changed:false};
test('current trusted Reality shift verifies live installer denial without a write',async()=>{
 let called=0;
 const x=await checkNative263LiveOwnerApprovalFence({
  db,env,warrant,fetchImpl:async(url,opts)=>{
   called++;
   assert.equal(url,db.url+'/functions/v1/reality-governed-native263-installer-v1');
   assert.equal(opts.method,'POST');
   assert.equal(opts.headers.authorization,'Bearer '+db.secretKey);
   assert.equal(opts.body,'{"version":1,"action":"execute_exact_approved_native263_install"}');
   return {ok:true,json:async()=>denial};
  }});
 assert.equal(called,1);
 assert.equal(x.status,'NATIVE263_EXACT_OWNER_APPROVAL_SERVICE_FENCE_LIVE_VERIFIED');
 assert.equal(x.real_edge_service_readback_verified,true);
 assert.equal(x.exact_owner_approval_required,true);
 assert.equal(x.source_installed,false);
 assert.equal(x.automatic_deployment_verified,false);
 assert.equal(x.original_execution_resumed,false);
 assert.equal(x.original_final_receipt_recorded,false);
 assert.equal(x.installation_authorized,false);
 assert.equal(x.original_job_completed,false);
});
test('no live provider call when owner approval or original identity differs',async()=>{
 for(const bad of [
  {warrant:{...warrant,original_work_id:'work:'+'0'.repeat(32)}},
  {warrant:{...warrant,installation_authorized:true}},
  {warrant:{...warrant,owner_approval_ready:true}},
  {env:{...env,VERCEL_ENV:'production'}},
  {db:{...db,strictSecrets:false}}
 ]){
  await assert.rejects(()=>checkNative263LiveOwnerApprovalFence({
   db,env,warrant,...bad,fetchImpl:()=>{throw Error('must not reach')}
  }),/NATIVE263_LIVE_INSTALL_DENIAL_SIGNED_PREAPPROVAL_SCOPE_REQUIRED/);
 }
});
test('false installer success or false denial fails closed',async()=>{
 for(const x of [
  {...denial,installation_authorized:true},
  {...denial,source_installed:true},
  {...denial,original_job_completed:true},
  {...denial,shift_id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'},
  {...denial,status:'NATIVE263_SOURCE_INSTALLED_DEPLOYMENT_NOT_YET_VERIFIED'}
 ]){
  await assert.rejects(()=>checkNative263LiveOwnerApprovalFence({
   db,env,warrant,fetchImpl:async()=>({ok:true,json:async()=>x})
  }),/NATIVE263_LIVE_INSTALL_DENIAL_LIVE_SERVICE_DENIAL_OR_OWNER_AUTHORITY_DRIFT/);
 }
});
test('worker surfaces the installed service proof separately from approval',()=>{
 const s=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(s,/checkNative263LiveOwnerApprovalFence/);
 assert.match(s,/native_live_installer_approval_fence:nativeInstallerApprovalFence/);
 assert.match(s,/NATIVE263_EXACT_INSTALLER_LIVE_DENIAL_UNVERIFIED/);
});
