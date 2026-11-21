import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifiedExactOwnerInstallReadback}
 from '../api/reality/signed-maintenance-exact-install-approval.js';

const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const otherOwner='00000000-0000-4000-8000-000000000000';
const receipt='sha256:'+'a'.repeat(64);
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('owner-scoped approval GET distinguishes recorded decision from an unverified outcome',()=>{
 const s=verifiedExactOwnerInstallReadback({
  status:'EXACT_OWNER_MAINTENANCE_INSTALL_DECISION_RECORDED',
  owner_id:owner,decision_state:'APPROVED',
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
  approval_receipt_sha256:receipt,installation_authorized:true,
  repair_installed:true,independent_postinstall_receipt_sha256:'sha256:'+'b'.repeat(64)
 },owner);
 assert.equal(s.postinstall_verified,true);
 assert.equal(s.repair_installed,true);
 assert.equal(Object.hasOwn(s,'original_job_completed'),false);
});

test('owner mismatch, invalid receipt, and unknown phase fail closed rather than claiming approval',()=>{
 const c={status:'EXACT_OWNER_MAINTENANCE_INSTALL_DECISION_RECORDED',
  owner_id:owner,decision_state:'APPROVED',installation_authorized:true,
  approval_receipt_sha256:receipt};
 assert.equal(verifiedExactOwnerInstallReadback(c,otherOwner),null);
 assert.equal(verifiedExactOwnerInstallReadback({...c,approval_receipt_sha256:'bad'},owner),null);
 assert.equal(verifiedExactOwnerInstallReadback({...c,decision_state:'INVALID'},owner),null);
 assert.equal(verifiedExactOwnerInstallReadback({...c,installation_authorized:false},owner),null);
});

test('verified absent decision is not authority, and a missing scope is not readiness',()=>{
 const ready=verifiedExactOwnerInstallReadback({
  status:'EXACT_OWNER_MAINTENANCE_INSTALL_APPROVAL_READY',owner_id:owner,
  owner_approval_ready:true,installation_authorized:false
 },owner);
 assert.equal(ready.status,'EXACT_SIGNED_OWNER_APPROVAL_NOT_RECORDED_READBACK');
 assert.equal(ready.owner_approval_recorded,false);
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
 assert.match(ui,/installUncertain\|\|approvedScope\?\.exactInstallCard/);
 assert.match(ui,/void checkExactOwnerApprovalStatus\(\)/);
 assert.match(ui,/A background refresh MUST NOT unlock a failed\/unknown owner POST/);
 assert.match(ui,/installUncertain=true/);
 assert.doesNotMatch(ui,/setInterval\([^]*?installApprove\.click\(\)/);
});
