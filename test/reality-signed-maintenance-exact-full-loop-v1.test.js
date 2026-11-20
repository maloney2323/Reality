import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {continueExactOwnerApprovedMaintenanceInstall}
 from '../src/reality-signed-maintenance-approved-install-bridge-v1.js';
import {shiftRpc} from '../src/reality-governed-shift-boundary-v1.js';
import {independentlyReconcileSignedMaintenanceInstall}
 from '../src/reality-signed-maintenance-postinstall-verification-bridge-v1.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const db={project:'reality-benchmark',strictSecrets:true,
 url:'https://reality-benchmark.supabase.co',
 secretKey:'signed-service-secret-key-not-an-actual-secret'};
const env={VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'reality-benchmark'};
const id='05d1e1a9-8f9e-43a5-94ba-acd367cc2611';
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
function transport(payload){const calls=[];return {calls,
 fetchImpl:async(url,options)=>{
  calls.push({url,options});
  assert.equal(options.method,'POST');
  assert.equal(options.redirect,'error');
  assert.equal(options.headers.apikey,db.secretKey);
  assert.equal(options.headers.authorization,'Bearer '+db.secretKey);
  assert.ok(options.signal instanceof AbortSignal);
  return {ok:true,json:async()=>payload};
 }};}
const base={source_installed:false,original_job_completed:false,
 production_changed:false,new_shift_started:false};
test('unapproved same-shift installer does not write or fabricate owner authority',async()=>{
 const t=transport({...base,status:'NO_EXACT_OWNER_APPROVED_MAINTENANCE_INSTALL',
  installation_authorized:false});
 const r=await continueExactOwnerApprovedMaintenanceInstall({
  db,env,fetchImpl:t.fetchImpl});
 assert.equal(r.status,'NO_EXACT_OWNER_APPROVED_MAINTENANCE_INSTALL');
 assert.equal(r.source_installed,false);
 assert.equal(t.calls.length,1);
 assert.equal(JSON.parse(t.calls[0].options.body).action,
  'execute_previously_owner_approved_maintenance_install');
});
test('exact approved maintenance installer returns source receipt, not customer completion',async()=>{
 const t=transport({...base,
  status:'EXACT_OWNER_APPROVED_MAINTENANCE_SOURCE_INSTALLED_NEEDS_INDEPENDENT_ACCEPTANCE',
  maintenance_id:id,shift_id:shift,installed_commit_sha:'a'.repeat(40),
  installation_authorized:true,source_installed:true});
 const r=await continueExactOwnerApprovedMaintenanceInstall({
  db,env,fetchImpl:t.fetchImpl});
 assert.equal(r.source_installed,true);
 assert.equal(r.installation_authorized,true);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.production_changed,false);
 assert.equal(r.shift_id,shift);
});
test('unsigned/production installer cannot call privileged service or approve anything',async()=>{
 let called=0;
 const r=await continueExactOwnerApprovedMaintenanceInstall({
  db,env:{...env,VERCEL_ENV:'production'},
  fetchImpl:async()=>{called++;}});
 assert.equal(called,0);
 assert.equal(r.source_installed,false);
 assert.equal(r.original_job_completed,false);
});
test('postinstall CI and Vercel corroboration is a SEPARATE signed provider receipt',async()=>{
 const t=transport({
  status:'SAME_SIGNED_SHIFT_INTERNAL_MAINTENANCE_INDEPENDENTLY_VERIFIED',
  maintenance_id:id,shift_id:shift,installed_commit_sha:'a'.repeat(40),
  independent_postinstall_receipt_sha256:'sha256:'+'f'.repeat(64),
  repair_verified:true,original_job_completed:false,
  production_changed:false,new_shift_started:false});
 const r=await independentlyReconcileSignedMaintenanceInstall({
  db,env,fetchImpl:t.fetchImpl});
 assert.equal(r.repair_verified,true);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.production_changed,false);
 assert.equal(t.calls.length,1);
 assert.equal(JSON.parse(t.calls[0].options.body).action,
  'verify_and_reconcile_owner_approved_maintenance_install');
});
test('postinstall success cannot be forged by a claim of original business completion',async()=>{
 const t=transport({status:'SAME_SIGNED_SHIFT_INTERNAL_MAINTENANCE_INDEPENDENTLY_VERIFIED',
  maintenance_id:id,shift_id:shift,installed_commit_sha:'a'.repeat(40),
  independent_postinstall_receipt_sha256:'sha256:'+'f'.repeat(64),
  repair_verified:true,original_job_completed:true,production_changed:false,
  new_shift_started:false});
 const r=await independentlyReconcileSignedMaintenanceInstall({
  db,env,fetchImpl:t.fetchImpl});
 assert.equal(r.repair_verified,false);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.status,'SIGNED_MAINTENANCE_POSTINSTALL_AUTHORITY_DRIFT');
});
test('Reality Chat exact approval requires fresh signed read, explicit click and no silent retry',()=>{
 const ui=read('reality-chat-maintenance-continuation-v1.js');
 const api=read('api/reality/signed-maintenance-exact-install-approval.js');
 assert.match(ui,/installApprove\.addEventListener\('click',async/);
 assert.match(ui,/const fresh=await read\(\)/);
 assert.match(ui,/!approvedScope\?\.exactInstallCard/);
 assert.match(ui,/crypto\.randomUUID\(\)/);
 assert.match(ui,/installUncertain=true/);
 assert.match(ui,/\/api\/reality\/signed-maintenance-exact-install-approval/);
 assert.match(api,/authenticatedChatSession\(req,res\)/);
 assert.match(api,/assertSameOrigin\(req\)/);
 assert.match(api,/reality_read_owner_signed_maintenance_install_decision_v1/);
 assert.match(api,/reality_record_owner_signed_maintenance_install_decision_v1/);
 assert.match(api,/p_owner_id:session\.user_id/);
 assert.match(api,/installation_completed:false/);
 assert.match(api,/no_third_confirmation:true/);
 assert.doesNotMatch(api,/start_shift|reality_start_owner_shift/i);
});
test('signed existing worker automatically executes only owner-approved installer and independent verifier',()=>{
 const w=read('api/reality/governed-employee-shift-worker.js');
 const a=w.indexOf('EXACT_OWNER_APPROVED_MAINTENANCE_AUTOMATIC_INSTALL');
 const b=w.indexOf('EXACT_SIGNED_MAINTENANCE_INDEPENDENT_POSTINSTALL_VERIFICATION');
 const c=w.indexOf('SIGNED_MAINTENANCE_FINAL_RECEIPT_RECONCILIATION');
 assert.ok(a>0&&b>a&&c>b);
 assert.match(w,/signedMaintenanceApprovedInstall\.source_installed!==true/);
 assert.match(w,/continueExactOwnerApprovedMaintenanceInstall/);
 assert.match(w,/independentlyReconcileSignedMaintenanceInstall/);
 assert.match(w,/signed_maintenance_approved_auto_install:signedMaintenanceApprovedInstall/);
 assert.match(w,/signed_maintenance_independent_postinstall:signedMaintenanceIndependentPostinstall/);
});
test('privileged GitHub installer is exact-once fenced and reconcilable by GET, not retried',()=>{
 const entry=read('supabase/functions/reality-governed-general-original-installer-v1/index.ts');
 const guarded=read('supabase/functions/reality-governed-general-original-installer-v1/maintenance.ts');
 assert.match(entry,/installApprovedMaintenance\(base,key\)/);
 assert.match(guarded,/reality_read_signed_maintenance_approved_install_scope_v1/);
 assert.match(guarded,/reality_claim_signed_maintenance_approved_install_v1/);
 assert.match(guarded,/force:false/);
 assert.match(guarded,/if\(x\.phase!=='APPROVED'\)return await reconcile/);
 assert.match(guarded,/FENCED_PROVIDER_EFFECT_UNCERTAIN_NO_RETRY/);
 assert.match(guarded,/checked\(token,x\.source_path,x\.candidate_commit_sha\)/);
 assert.ok(guarded.indexOf('reality_claim_signed_maintenance_approved_install_v1')<
  guarded.indexOf("'/git/refs/heads/'+BRANCH,'PATCH'"));
 assert.match(guarded,/x\.target_branch===BRANCH/);
 assert.match(guarded,/source_installed:false,\.\.\.rest,original_job_completed:false/);
 assert.match(guarded,/base!=='https:\/\/'\+PROJECT\+'\.supabase\.co'/);
});
test('independent verifier requires real installed source, push workflow and Vercel app result before recording',()=>{
 const entry=read('supabase/functions/reality-governed-general-original-postinstall-verifier-v1/index.ts');
 const p=read('supabase/functions/reality-governed-general-original-postinstall-verifier-v1/maintenance.ts');
 assert.match(entry,/independentlyAcceptInstalledMaintenance\(url\.origin,key\)/);
 assert.match(p,/reality_read_signed_maintenance_postinstall_scope_v1/);
 assert.match(p,/run\.head_sha|head_sha===s\.installed_commit_sha/);
 assert.match(p,/x\.event==='push'/);
 assert.match(p,/x\.app\?\.slug==='vercel'/);
 assert.match(p,/providerStatus\?\.state==='success'/);
 assert.match(p,/x\.context==='Vercel'/);
 assert.match(p,/x\.target_url/);
 assert.match(p,/source\(token,s\.source_path,s\.installed_commit_sha\)/);
 assert.match(p,/reality_record_signed_maintenance_independent_postinstall_v1/);
 assert.match(p,/original_job_completed:false/);
 assert.match(p,/repair_verified:false,\.\.\.extra,/);
});
test('database preserves real signed original job identities and rejects duplicate permission',()=>{
 const sql=read('supabase/migrations/20261120214500_signed_existing_maintenance_exact_owner_install_v1.sql');
 const post=read('supabase/migrations/20261120215000_signed_existing_maintenance_independent_postinstall_v1.sql');
 const next=read('supabase/migrations/20261120215200_signed_install_continue_next_maintenance_v2.sql');
 for(const needle of [
  'target_review_worker_run_id<>art.observed_worker_run_id',
  "w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'",
  'owner_signed_maintenance_install_decisions_v1',
  "current_user<>'service_role'",
  'reality_read_owner_signed_maintenance_install_decision_v1',
  'reality_record_owner_signed_maintenance_install_decision_v1',
  'reality_claim_signed_maintenance_approved_install_v1',
  "state='FENCED'",
  'approval_receipt_sha256',
  'TO service_role',
  'FROM PUBLIC,anon,authenticated'
 ])assert.ok(sql.includes(needle),needle);
 assert.match(post,/source_case_ci_receipt_sha256/);
 assert.match(post,/independent_ci_run_id/);
 assert.match(post,/independent_vercel_check_id/);
 assert.match(post,/phase='INTERNAL_REPAIR_VERIFIED_CLOSED'/);
 assert.match(post,/original_job_completed',false/);
 assert.match(next,/WHERE x\.state IN\('APPROVED','FENCED','INSTALLED'\)/);
 assert.doesNotMatch(sql,/INSERT INTO reality_internal\.governed_employee_shifts_v1/);
});


test('actual exact owner review and approval RPCs are in the original allowlist, not silently swallowed',async()=>{
 const entries=[
  ['reality_read_owner_signed_maintenance_install_decision_v1',
   {p_owner_id:'85eeae0b-2988-43c4-b20c-590fb51da70d'}],
  ['reality_record_owner_signed_maintenance_install_decision_v1',{
   p_owner_id:'85eeae0b-2988-43c4-b20c-590fb51da70d',
   p_shift_id:shift,p_maintenance_id:id,
   p_request_id:'a1111111-1111-4111-8111-111111111111',
   p_candidate_commit_sha:'6'.repeat(40),
   p_target_review_receipt_sha256:'sha256:'+'9'.repeat(64),
   p_intent:'OWNER_APPROVE_EXACT_SIGNED_ISOLATED_MAINTENANCE_REPAIR'
  }]
 ];
 for(const [name,params] of entries){
  let calls=0;
  const out=await shiftRpc(db,name,params,{fetchImpl:async(url,opt)=>{
   calls++;
   assert.equal(url,db.url+'/rest/v1/rpc/'+name);
   assert.equal(opt.method,'POST');
   assert.equal(opt.headers.authorization,'Bearer '+db.secretKey);
   assert.deepEqual(JSON.parse(opt.body),params);
   return {ok:true,json:async()=>({status:'FIXTURE_AUTHORITY_NOT_GRANTED'})};
  }});
  assert.equal(calls,1,'both exact one-use RPC paths must be reachable');
  assert.equal(out.status,'FIXTURE_AUTHORITY_NOT_GRANTED');
 }
 await assert.rejects(shiftRpc(db,'reality_unauthorized_install_rpc_v1',{}),
  /SHIFT_RPC_NOT_ALLOWLISTED/);
});
test('legacy five-shift presentation cannot block seven owner-authenticated shifts from exact approval',()=>{
 const api=read('api/reality/personal-governed-employee-shift.js');
 const continuity=read('src/reality-owner-internal-maintenance-continuity-v1.js');
 const brief=read('src/reality-shift-conversation-brief-v1.js');
 const recover=read('src/reality-employee-recovery-route-v1.js');
 assert.match(brief,/shifts\.length>5/);
 assert.match(recover,/shifts\.length>5/);
 assert.match(api,/const presentationShifts=read\.shifts\.slice\(0,5\)/);
 assert.match(api,/presentationShifts,handoffs,new Date\(\),shift_source_native_receipts/);
 assert.match(api,/diagnoseRealityEmployeeRecovery\(\{shifts:presentationShifts,handoffs\}\)/);
 assert.match(api,/projectOwnerInternalMaintenanceContinuity\(\s*maintenance,\{ownerId:session\.user_id,shifts:read\.shifts\}\)/);
 assert.match(continuity,/shifts\.length>25/);
});
