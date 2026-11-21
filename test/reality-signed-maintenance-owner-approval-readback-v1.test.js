import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifiedExactOwnerInstallReadback,
 EXACT_APPROVAL_READ_TIMEOUT_MS,EXACT_APPROVAL_WRITE_TIMEOUT_MS,maxDuration}
 from '../api/reality/signed-maintenance-exact-install-approval.js';
import {shiftRpc,isShiftDatabaseTransportUnreachable}
 from '../src/reality-governed-shift-boundary-v1.js';

const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const otherOwner='00000000-0000-4000-8000-000000000000';
const receipt='sha256:'+'a'.repeat(64);
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('owner-scoped approval GET distinguishes recorded decision from an unverified outcome',()=>{
 const s=verifiedExactOwnerInstallReadback({
  status:'EXACT_OWNER_MAINTENANCE_INSTALL_DECISION_RECORDED',
  owner_id:owner,decision_state:'APPROVED',
  shift_id:'ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce',
  source_ref:'https://github.com/maloney2323/Reality/pull/308',
  original_job_completed:false,production_changed:false,
  approval_receipt_sha256:receipt,installation_authorized:true,
  repair_installed:false,independent_postinstall_receipt_sha256:null
 },owner);
 assert.equal(s.status,'EXACT_SIGNED_OWNER_APPROVAL_RECORDED_READBACK');
 assert.equal(s.owner_approval_recorded,true);
 assert.equal(s.approval_receipt_sha256,receipt);
 assert.equal(s.installation_authorized,true);
 assert.equal(s.repair_installed,false);
 assert.equal(s.postinstall_verified,false);
 assert.equal(s.retry_owner_approval,false);
});

test('recorded decision may be verified separately but never implies customer-job completion',()=>{
 const s=verifiedExactOwnerInstallReadback({
  status:'EXACT_OWNER_MAINTENANCE_INSTALL_DECISION_RECORDED',
  owner_id:owner,decision_state:'VERIFIED',
  shift_id:'ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce',
  source_ref:'https://github.com/maloney2323/Reality/pull/308',
  original_job_completed:false,production_changed:false,
  approval_receipt_sha256:receipt,installation_authorized:true,
  repair_installed:true,installed_commit_sha:'a'.repeat(40),
  independent_postinstall_receipt_sha256:'sha256:'+'b'.repeat(64)
 },owner);
 assert.equal(s.postinstall_verified,true);
 assert.equal(s.repair_installed,true);
 assert.equal(s.original_job_completed,false);
 assert.equal(s.independent_postinstall_receipt_sha256,'sha256:'+'b'.repeat(64));
 assert.equal(s.installed_commit_sha,'a'.repeat(40));
});

test('owner mismatch, invalid receipt, and unknown phase fail closed rather than claiming approval',()=>{
 const c={status:'EXACT_OWNER_MAINTENANCE_INSTALL_DECISION_RECORDED',
  owner_id:owner,decision_state:'APPROVED',installation_authorized:true,
  shift_id:'ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce',
  source_ref:'https://github.com/maloney2323/Reality/pull/308',
  original_job_completed:false,production_changed:false,
  approval_receipt_sha256:receipt};
 assert.equal(verifiedExactOwnerInstallReadback(c,otherOwner),null);
 assert.equal(verifiedExactOwnerInstallReadback({...c,approval_receipt_sha256:'bad'},owner),null);
 assert.equal(verifiedExactOwnerInstallReadback({...c,decision_state:'INVALID'},owner),null);
 assert.equal(verifiedExactOwnerInstallReadback({...c,installation_authorized:false},owner),null);
});

test('verified absent decision is not authority, and a missing scope is not readiness',()=>{
 const ready=verifiedExactOwnerInstallReadback({
  status:'EXACT_OWNER_MAINTENANCE_INSTALL_APPROVAL_READY',owner_id:owner,
  owner_approval_ready:true,installation_authorized:false,
  repair_installed:false,original_job_completed:false,
  production_changed:false,new_shift_started:false,
  maintenance_id:'05d1e1a9-8f9e-43a5-94ba-acd367cc2611',
  shift_id:'ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce',
  source_ref:'https://github.com/maloney2323/Reality/pull/308',
  target_branch:'reality/chat-direct-work-handoff-20261115',
  target_path:'src/reality-qualified-source-requalification-v1.js',
  target_head_sha:'c'.repeat(40),expected_old_blob_sha:'d'.repeat(40),
  candidate_source_blob_sha:'e'.repeat(40),
  candidate_commit_sha:'f'.repeat(40),
  artifact_receipt_sha256:'sha256:'+'a'.repeat(64),
  case_ci_receipt_sha256:'sha256:'+'b'.repeat(64),
  target_review_receipt_sha256:'sha256:'+'c'.repeat(64)
 },owner);
 assert.equal(ready.status,'EXACT_SIGNED_OWNER_APPROVAL_NOT_RECORDED_READBACK');
 assert.equal(ready.owner_approval_recorded,false);
 assert.equal(ready.exact_review.source_ref,'https://github.com/maloney2323/Reality/pull/308');
 assert.equal(ready.exact_review.shift_id,'ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce');
 assert.equal(ready.retry_owner_approval,false);
 assert.equal(verifiedExactOwnerInstallReadback({
  status:'EXACT_OWNER_MAINTENANCE_INSTALL_APPROVAL_READY',owner_id:otherOwner,
  owner_approval_ready:true,installation_authorized:false
 },owner),null);
 const missing=verifiedExactOwnerInstallReadback({
  status:'NO_EXACT_OWNER_MAINTENANCE_INSTALL_DECISION_READY',
  owner_approval_ready:false,installation_authorized:false
 },owner);
 assert.equal(missing.status,'EXACT_SIGNED_OWNER_APPROVAL_SCOPE_UNAVAILABLE');
 assert.equal(missing.installation_authorized,false);
});

test('only the signed POST can record an approval; GET and Check status are read-only',()=>{
 const api=read('api/reality/signed-maintenance-exact-install-approval.js');
 const ui=read('reality-chat-maintenance-continuation-v1.js');
 assert.match(api,/if\(req\.method==='GET'\)/);
 assert.match(api,/authenticatedChatSession\(req,res\)/);
 assert.match(api,/assertSameOrigin\(req\)/);
 assert.match(api,/const verified=verifiedExactOwnerInstallReadback\(card,session\.user_id\)/);
 assert.ok(api.indexOf("if(req.method==='GET')")<
  api.indexOf("stage='RECORD_EXACT_OWNER_DECISION'"));
 assert.match(api,/reality_record_owner_signed_maintenance_install_decision_v1/);
 assert.match(api,/retry_owner_approval:false/);
 assert.match(api,/REALITY_EXACT_INSTALL_APPROVAL_OUTCOME_UNVERIFIED/);
 assert.match(api,/failed_stage:stage,failure_category:category/);
 assert.match(ui,/async function checkExactOwnerApprovalStatus/);
 assert.match(ui,/method:'GET',credentials:'same-origin'/);
 assert.match(ui,/renderExactReviewFromNarrowReadback/);
 assert.match(ui,/void checkExactOwnerApprovalStatus\(\)/);
 assert.doesNotMatch(ui,/await refresh\(\);\s*feedback\.textContent=approvedScope\?\.exactInstallCard/);
 assert.match(ui,/void checkExactOwnerApprovalStatus\(\)/);
 assert.match(ui,/A background refresh MUST NOT unlock a failed\/unknown owner POST/);
 assert.match(ui,/installUncertain=true/);
 assert.doesNotMatch(ui,/setInterval\([^]*?installApprove\.click\(\)/);
});

test('approved PREVIEW decision transport has separate bounded budgets and never retries the write',()=>{
 const api=read('api/reality/signed-maintenance-exact-install-approval.js');
 assert.equal(maxDuration,60);
 assert.equal(EXACT_APPROVAL_READ_TIMEOUT_MS,15000);
 assert.equal(EXACT_APPROVAL_WRITE_TIMEOUT_MS,20000);
 assert.match(api,/reality_read_owner_signed_maintenance_install_decision_v1'[\s\S]*timeoutMs:EXACT_APPROVAL_READ_TIMEOUT_MS/);
 assert.match(api,/reality_record_owner_signed_maintenance_install_decision_v1'[\s\S]*timeoutMs:EXACT_APPROVAL_WRITE_TIMEOUT_MS/);
 assert.match(api,/Never automatically resend an ambiguous decision/);
 assert.match(api,/retry_owner_approval:false/);
 assert.doesNotMatch(api,/\bsetTimeout\([^]*?fetch\([^]*?method:'POST'/);
});
test('owner decision SQL error is fail-closed, with HTTP/SQLSTATE only and no retry',async()=>{
 const db={url:'https://example.supabase.co',secretKey:'nonsecret-fixture-key'};
 const calls=[];
 const rpc='reality_record_owner_signed_maintenance_install_decision_v1';
 const oldWarn=console.warn;
 const notices=[];
 try{
  console.warn=(...x)=>notices.push(x);
  const error=await shiftRpc(db,rpc,{test_only:true},{
   timeoutMs:EXACT_APPROVAL_WRITE_TIMEOUT_MS,
   fetchImpl:async(url,options)=>{
    calls.push({url,options});
    return {ok:false,status:500,json:async()=>({
     code:'P0001',message:'PRIVATE_DATABASE_EXCEPTION_DO_NOT_LOG',
     hint:'PRIVATE_DATA_DO_NOT_LOG'})};
   }
  }).catch(e=>e);
  assert.equal(error.message,'SHIFT_DATABASE_RPC_'+rpc+'_UNAVAILABLE');
  assert.equal(isShiftDatabaseTransportUnreachable(error),true);
  assert.equal(calls.length,1);
  assert.ok(calls[0].options.signal instanceof AbortSignal);
  assert.equal(calls[0].options.method,'POST');
  assert.equal(calls[0].options.redirect,'error');
  assert.deepEqual(notices,[['REALITY_EXACT_APPROVAL_DB_REJECTED',500,'P0001']]);
  assert.ok(!JSON.stringify(notices).includes('PRIVATE'));
 }finally{console.warn=oldWarn}
});
test('owner decision verified response is accepted as one RPC; no automatic second write',async()=>{
 const db={url:'https://example.supabase.co',secretKey:'nonsecret-fixture-key'};
 let calls=0;
 const r=await shiftRpc(db,'reality_record_owner_signed_maintenance_install_decision_v1',
  {test_only:true},{
   timeoutMs:EXACT_APPROVAL_WRITE_TIMEOUT_MS,
   fetchImpl:async(url,options)=>{
    calls++;
    assert.equal(options.method,'POST');
    assert.ok(options.signal instanceof AbortSignal);
    return {ok:true,status:200,json:async()=>({status:'APPROVAL_FIXTURE_ONLY'})};
   }
  });
 assert.equal(r.status,'APPROVAL_FIXTURE_ONLY');
 assert.equal(calls,1);
});

test('persisted approval migration fixes operator precedence without widening authorization',()=>{
 const ddl=read('supabase/migrations/20261121010403_fix_exact_owner_maintenance_approval_hash_operator_precedence_v1.sql');
 assert.match(ddl,/\(card->>'target_head_sha'\)\|\|'\|'\|\|\(card->>'artifact_receipt_sha256'\)/);
 assert.doesNotMatch(ddl,/[^()]card->>'target_head_sha'\|\|'\|'\|\|card->>'artifact_receipt_sha256'/);
 assert.match(ddl,/current_user<>'service_role'/);
 assert.match(ddl,/EXACT_OWNER_MAINTENANCE_INSTALL_ALREADY_DECIDED_NO_REPLAY/);
 assert.match(ddl,/OWNER_APPROVE_EXACT_SIGNED_ISOLATED_MAINTENANCE_REPAIR/);
 assert.match(ddl,/UPDATE reality_internal\.owner_internal_maintenance_jobs_v1/);
 assert.doesNotMatch(ddl,/SECURITY DEFINER|GRANT ALL TO PUBLIC|DROP TABLE|TRUNCATE/);
});

test('narrow exact approval GET cannot turn a wrong-owner or stale artifact into a decision',()=>{
 const data={
  status:'EXACT_OWNER_MAINTENANCE_INSTALL_APPROVAL_READY',owner_id:owner,
  owner_approval_ready:true,installation_authorized:false,
  repair_installed:false,original_job_completed:false,
  production_changed:false,new_shift_started:false,
  maintenance_id:'05d1e1a9-8f9e-43a5-94ba-acd367cc2611',
  shift_id:'ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce',
  source_ref:'https://github.com/maloney2323/Reality/pull/308',
  target_branch:'reality/chat-direct-work-handoff-20261115',
  target_path:'src/reality-qualified-source-requalification-v1.js',
  target_head_sha:'c'.repeat(40),expected_old_blob_sha:'d'.repeat(40),
  candidate_source_blob_sha:'e'.repeat(40),candidate_commit_sha:'f'.repeat(40),
  artifact_receipt_sha256:'sha256:'+'a'.repeat(64),
  case_ci_receipt_sha256:'sha256:'+'b'.repeat(64),
  target_review_receipt_sha256:'sha256:'+'c'.repeat(64)
 };
 assert.equal(verifiedExactOwnerInstallReadback(data,otherOwner),null);
 assert.equal(verifiedExactOwnerInstallReadback({...data,source_ref:'https://other.example'},owner),null);
 assert.equal(verifiedExactOwnerInstallReadback({...data,target_path:'src/../x.js'},owner),null);
 assert.equal(verifiedExactOwnerInstallReadback({...data,target_review_receipt_sha256:'unverified'},owner),null);
 assert.equal(verifiedExactOwnerInstallReadback({...data,repair_installed:true},owner),null);
 assert.equal(verifiedExactOwnerInstallReadback({...data,installation_authorized:true},owner),null);
});

test('installed maintenance readback proves the installed commit without fabricating independent acceptance',()=>{
 const s=verifiedExactOwnerInstallReadback({
  status:'EXACT_OWNER_MAINTENANCE_INSTALL_DECISION_RECORDED',
  owner_id:owner,shift_id:'ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce',
  source_ref:'https://github.com/maloney2323/Reality/pull/308',
  original_job_completed:false,production_changed:false,
  decision_state:'INSTALLED',
  approval_receipt_sha256:receipt,installation_authorized:true,
  repair_installed:true,installed_commit_sha:'8'.repeat(40),
  independent_postinstall_receipt_sha256:null
 },owner);
 assert.equal(s.decision_state,'INSTALLED');
 assert.equal(s.postinstall_verified,false);
 assert.equal(s.installed_commit_sha,'8'.repeat(40));
 assert.equal(s.independent_postinstall_receipt_sha256,null);
 assert.equal(s.retry_owner_approval,false);
});
test('unknown installed commit and ungrounded verifier receipt cannot appear as a milestone',()=>{
 const b={status:'EXACT_OWNER_MAINTENANCE_INSTALL_DECISION_RECORDED',
  owner_id:owner,shift_id:'ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce',
  source_ref:'https://github.com/maloney2323/Reality/pull/308',
  original_job_completed:false,production_changed:false,
  decision_state:'INSTALLED',approval_receipt_sha256:receipt,
  installation_authorized:true,repair_installed:true,
  independent_postinstall_receipt_sha256:null};
 assert.equal(verifiedExactOwnerInstallReadback({...b,installed_commit_sha:null},owner),null);
 assert.equal(verifiedExactOwnerInstallReadback({...b,installed_commit_sha:'a'.repeat(39)},owner),null);
 assert.equal(verifiedExactOwnerInstallReadback({...b,decision_state:'VERIFIED',
  installed_commit_sha:'a'.repeat(40),
  independent_postinstall_receipt_sha256:null},owner),null);
 assert.equal(verifiedExactOwnerInstallReadback({...b,installed_commit_sha:'a'.repeat(40),
  original_job_completed:true},owner),null);
});

test('installed PR #308 post-install receipt SQL hashes exact fields without undefined text JSON operators',()=>{
 const ddl=read('supabase/migrations/20261121014359_fix_signed_maintenance_postinstall_receipt_hash_operator_precedence_v1.sql');
 const start=ddl.indexOf("result_hash:='sha256:'");
 const end=ddl.indexOf("UPDATE reality_internal.owner_signed_maintenance_install_decisions_v1",start);
 assert.ok(start>0&&end>start);
 const hash=ddl.slice(start,end);
 const fields=['shift_id','approval_receipt_sha256','target_review_receipt_sha256','case_ci_receipt_sha256'];
 let stripped=hash;
 for(const field of fields){
  const grouped="(s->>'"+field+"')";
  assert.ok(hash.includes(grouped),'JSON field must be grouped: '+field);
  stripped=stripped.replace(grouped,'');
 }
 assert.doesNotMatch(stripped,/s->>/,'no unparenthesized JSON text extraction in receipt digest');
 assert.match(ddl,/current_user<>'service_role'/);
 assert.match(ddl,/FOR UPDATE/);
 assert.match(ddl,/AND state='INSTALLED'/);
 assert.match(ddl,/repaired_capability_receipt_sha256 IS NULL/);
 assert.match(ddl,/original_job_completed',false/);
 assert.doesNotMatch(ddl,/SECURITY DEFINER|GRANT ALL TO PUBLIC|DROP TABLE|TRUNCATE/);
});
