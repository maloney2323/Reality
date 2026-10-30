import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnoseOriginal178Self,classifyFirst178Diagnosis}
 from '../src/reality-first178-self-diagnosis-v0.1.js';
const work='work:9b9578b3c65427589c4c6da68fe0fc87';
const conversation='11111111-2222-4333-8444-555555555555';
const original={original_work_id:work,conversation_id:conversation,
 issue_number:178,queue_id:'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'};
const exhausted={status:'EXHAUSTED_CORRECTION_ATTEMPTS',
 original_work_id:work,original_job_completed:false,
 installation_authorized:false,attempts_used:8,
 checkpoint_receipt_id:'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',
 checkpoint_hash:'f'.repeat(64)};
test('self diagnosis distinguishes failed repair from wrong browser conversation',async()=>{
 const r=await diagnoseOriginal178Self({
  session:{user_id:'owner'},resolve:async()=>original,
  readView:async()=>exhausted,
  selectedConversationId:'00000000-0000-4000-8000-000000000000',
 });
 assert.equal(r.status,'BLOCKED_REPAIR_BUDGET_EXHAUSTED');
 assert.equal(r.attempts_used,8);
 assert.equal(r.selected_conversation_matches_original,false);
 assert.equal(r.auto_retry_allowed,false);
 assert.equal(r.original_job_completed,false);
 assert.match(r.finding,/browser selected a different conversation/);
});
test('canonical goal readback failure produces a diagnostic, not a fake missing job',async()=>{
 const r=await diagnoseOriginal178Self({
  resolve:async()=>original,
  readView:async()=>{throw Error('FIRST_PROOF_OWNER_CONFIRMED_GOAL_REQUIRED')},
 });
 assert.equal(r.status,'ORIGINAL_SCOPE_READBACK_BLOCKED');
 assert.equal(r.failure_code,'FIRST_PROOF_OWNER_CONFIRMED_GOAL_REQUIRED');
 assert.equal(r.original_work_id,work);
 assert.equal(r.installation_authorized,false);
});
test('verified candidate requires distinct human approval, never inferred from diagnosis',()=>{
 const r=classifyFirst178Diagnosis({original,view:{
  status:'AWAITING_EXACT_OWNER_APPROVAL',original_work_id:work,
  installation_authorized:false,original_job_completed:false,
  candidate_artifact_hash:'a'.repeat(64),
 }});
 assert.equal(r.status,'EXACT_OWNER_APPROVAL_REQUIRED');
 assert.equal(r.owner_approval_inferred,false);
 assert.equal(r.auto_retry_allowed,false);
});
test('unknown, forged or foreign owner state cannot be diagnosed as completed',()=>{
 const x=classifyFirst178Diagnosis({original,view:{
  status:'ORIGINAL_JOB_INDEPENDENTLY_SETTLED',original_work_id:work,
  installation_authorized:true,original_job_completed:true,
 }});
 assert.equal(x.status,'ORIGINAL_STATE_UNVERIFIED');
 assert.equal(x.original_job_completed,false);
 assert.equal(classifyFirst178Diagnosis({original:null}).status,
 'CANONICAL_ORIGINAL_NOT_VERIFIED');
});
