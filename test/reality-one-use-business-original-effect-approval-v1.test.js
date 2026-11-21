import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifyExactBusinessEffectPacket,exactOwnerEffectReceiptReadback}
 from '../api/reality/personal-exact-business-effect-approval.js';

const owner='11111111-1111-4111-8111-111111111111';
const original='work:'+'a'.repeat(32);
const body={original_work_id:original,job_class:'customer_relations',
 effect_type:'CUSTOMER_SEND',target_ref:'customer@example.org',
 payload_text:'This is a proposed exact customer update, not sent.'};
const hash='sha256:'+'b'.repeat(64);
const good={
 status:'EXACT_BUSINESS_EFFECT_OWNER_REVIEW_STAGED',
 owner_id:owner,packet_id:'22222222-2222-4222-8222-222222222222',
 shift_id:'33333333-3333-4333-8333-333333333333',
 original_work_id:original,job_class:body.job_class,effect_type:body.effect_type,
 target_ref:body.target_ref,payload_sha256:hash,
 source_epoch_fingerprint:'c'.repeat(64),
 registered_execution_adapter:'reality_registered_customer_send_v1',
 proposal_fingerprint:'sha256:'+'d'.repeat(64),
 owner_approval_ready:true,owner_approval_granted:false,
 execution_authorized:false,effect_reserved:false,original_job_completed:false,
 new_shift_started:false,production_changed:false
};
test('one exact packet can be staged only with matching owner, original, class, effect, target and digest',()=>{
 assert.equal(verifyExactBusinessEffectPacket(good,owner,body,hash),true);
 for(const patch of [
  {owner_id:'44444444-4444-4444-8444-444444444444'},
  {original_work_id:'work:'+'0'.repeat(32)},{job_class:'marketing'},
  {effect_type:'PROCUREMENT_COMMIT'},{target_ref:'other@example.org'},
  {payload_sha256:'sha256:'+'a'.repeat(64)},
  {execution_authorized:true},{effect_reserved:true},
  {owner_approval_granted:true},{original_job_completed:true},
  {production_changed:true},{new_shift_started:true}
 ])assert.equal(verifyExactBusinessEffectPacket({...good,...patch},owner,body,hash),false);
});
test('owner approval and worker reservation are separate and one-use; no shadow original table',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261122002000_one_use_business_effect_approval_reservation_v1.sql',import.meta.url),'utf8');
 assert.match(sql,/owner_business_original_effect_approvals_v1/);
 assert.match(sql,/AWAITING_EXACT_OWNER_APPROVAL/);
 assert.match(sql,/APPROVED_ONE_USE_NOT_EXECUTED/);
 assert.match(sql,/PROVIDER_EFFECT_RESERVED_RECONCILE_ONLY/);
 assert.match(sql,/governed_preview_shift_worker_leases_v1/);
 assert.match(sql,/source_epoch_fingerprint/);
 assert.match(sql,/reality_owner_approve_exact_business_original_effect_v1/);
 assert.match(sql,/reality_claim_approved_business_original_effect_v1/);
 assert.match(sql,/reality_read_owner_exact_business_effect_preflight_v1/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/revoke all on function/);
 assert.doesNotMatch(sql,/\bcreate table.*?(?:original_jobs|job_history|another_shift)/i);
});
test('payload stays private, hashed and pinned to same exact proposed effect',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261122003000_business_effect_exact_payload_persistence_v1.sql',import.meta.url),'utf8');
 assert.match(sql,/effect_payload text/);
 assert.match(sql,/sha256\(pg_catalog.convert_to\(effect_payload,'UTF8'\)\)/);
 assert.match(sql,/p_payload_sha256 is distinct from/);
 assert.match(sql,/p_effect_payload,v->>'registered_executor_adapter'/);
 assert.match(sql,/drop function if exists public\.reality_stage_exact_business_original_effect_review_v1/);
 assert.doesNotMatch(sql,/grant\s+execute\s+on\s+function[^;]*\bto\s+authenticated/i);
});
test('Reality Chat requires two explicit owner clicks and cannot claim or execute from browser',()=>{
 const ui=readFileSync(new URL('../reality-chat-continuous-qualification-v1.js',import.meta.url),'utf8');
 const endpoint=readFileSync(new URL('../api/reality/personal-exact-business-effect-approval.js',import.meta.url),'utf8');
 assert.match(ui,/PREPARE_EXACT_BUSINESS_EFFECT/);
 assert.match(ui,/APPROVE_EXACT_BUSINESS_EFFECT/);
 assert.match(ui,/Approve exactly this one effect/);
 assert.match(ui,/stage\.addEventListener\('click'/);
 assert.match(ui,/approve\.addEventListener\('click'/);
 assert.doesNotMatch(ui,/claim_approved_business_original_effect_v1/);
 assert.match(endpoint,/assertSameOrigin\(req\)/);
 assert.match(endpoint,/authenticatedChatSession/);
 assert.match(endpoint,/VERCEL_ENV!=='preview'/);
 assert.match(endpoint,/model_execution_authorized:false/);
 assert.match(endpoint,/effect_executed:false/);
 assert.doesNotMatch(endpoint,/reality_claim_approved_business_original_effect_v1/);
});

test('signed worker recognizes next owner-approved original but cannot claim when no registered handler is connected',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261122004000_signed_worker_next_approved_business_effect_v1.sql',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const boundary=readFileSync(new URL('../src/reality-governed-shift-boundary-v1.js',import.meta.url),'utf8');
 assert.match(sql,/governed_preview_shift_worker_leases_v1/);
 assert.match(sql,/APPROVED_ONE_USE_NOT_EXECUTED/);
 assert.match(sql,/reality_read_owner_exact_business_effect_preflight_v1/);
 assert.match(sql,/registered_execution_adapter/);
 assert.match(sql,/effect_reserved',false/);
 assert.match(sql,/handler_installed_and_verified_by_read',false/);
 assert.doesNotMatch(sql,/\b(update|insert into|delete from)\s+reality_internal\./i);
 assert.match(worker,/reality_read_next_signed_business_effect_handoff_v1/);
 assert.match(worker,/p_worker_run_id:actualWorkerRunId/);
 assert.match(worker,/EXACT_APPROVED_BUSINESS_EFFECT_REGISTERED_HANDLER_REQUIRED/);
 assert.match(worker,/exact_approved_business_effect_handoff:exactApprovedBusinessEffectHandoff/);
 assert.doesNotMatch(worker,/reality_claim_approved_business_original_effect_v1/);
 assert.match(boundary,/read_next_signed_business_effect_handoff_v1/);
});

test('independent owner receipt readback resolves lost approval response without second approval click',()=>{
 const packet='22222222-2222-4222-8222-222222222222';
 const receipt={
  status:'OWNER_EXACT_BUSINESS_EFFECT_RECEIPT_READBACK',
  owner_id:owner,packet_id:packet,shift_id:'33333333-3333-4333-8333-333333333333',
  original_work_id:original,proposal_fingerprint:'sha256:'+'c'.repeat(64),
  authority_state:'APPROVED_ONE_USE_NOT_EXECUTED',
  approval_request_id:'44444444-4444-4444-8444-444444444444',
  approval_receipt_sha256:'sha256:'+'d'.repeat(64),
  approval_verified:true,effect_reserved:false,read_only:true,
  execution_authorized_by_read:false,provider_effect_performed:false,
  original_job_completed:false,production_changed:false
 };
 assert.equal(exactOwnerEffectReceiptReadback(receipt,owner,packet),true);
 assert.equal(exactOwnerEffectReceiptReadback({...receipt,owner_id:packet},owner,packet),false);
 assert.equal(exactOwnerEffectReceiptReadback({...receipt,approval_verified:false},owner,packet),false);
 assert.equal(exactOwnerEffectReceiptReadback({...receipt,effect_reserved:true},owner,packet),false);
 assert.equal(exactOwnerEffectReceiptReadback({...receipt,provider_effect_performed:true},owner,packet),false);
 assert.equal(exactOwnerEffectReceiptReadback({...receipt,
  status:'EXACT_BUSINESS_EFFECT_OWNER_PACKET_NOT_FOUND',approval_verified:false,
  effect_reserved:false},owner,packet),true);
});
test('owner receipt status is read-only and never discloses exact payload or grants provider permissions',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261122005000_owner_business_effect_approval_independent_readback_v1.sql',import.meta.url),'utf8');
 const endpoint=readFileSync(new URL('../api/reality/personal-exact-business-effect-approval.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../reality-chat-continuous-qualification-v1.js',import.meta.url),'utf8');
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/EXACT_BUSINESS_EFFECT_OWNER_PACKET_NOT_FOUND/);
 assert.doesNotMatch(sql,/'effect_payload',p\.effect_payload/);
 assert.match(sql,/execution_authorized_by_read',false/);
 assert.match(endpoint,/exactOwnerEffectReceiptReadback\(confirm,owner,body.packet_id\)/);
 assert.match(endpoint,/independent_approval_readback_verified:true/);
 assert.match(ui,/Check saved effect approval status/);
 assert.match(ui,/approval_verified===true/);
 assert.doesNotMatch(ui,/claim_approved_business_original_effect_v1/);
});
