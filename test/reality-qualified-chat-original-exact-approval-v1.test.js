import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sql=read('../supabase/migrations/20261121205000_qualified_chat_original_exact_approval_bridge_v1.sql');
const continuity=read('../supabase/migrations/20261121210500_qualified_chat_original_continuity_return_v1.sql');
const api=read('../api/reality/personal-qualified-chat-original-approval.js');
const panel=read('../reality-chat-continuous-qualification-v1.js');
const boundary=read('../src/reality-governed-shift-boundary-v1.js');

test('qualified original is sourced from one saved owner Chat message and signed Continuity route',()=>{
 for(const x of [
 'owner_continuity_qualification_routes_v1','owner_continuous_qualification_inbox_v1',
 'chat_work_handoffs_v1','reality_chat_messages',
 'r.intake_family','SAVED_CHAT_INTENT_NEEDS_GOVERNED_CLASSIFICATION',
 "m.role='user'","m.request_id=h.request_id","m.conversation_id=h.conversation_id",
 'source_ref','last_checked_at','message_sha256',
 'pg_catalog.sha256'
 ])assert.ok(sql.includes(x),x);
 assert.match(sql,/unique\(owner_id,message_id\)/);
 assert.match(sql,/on conflict \(owner_id,message_id\) do nothing/);
 assert.doesNotMatch(sql,/issues\/378|issues\/263|reality\/native263|authorize_employee_shift_v1/);
});
test('exact authenticated owner approval uses installed original-admission RPC transactionally',()=>{
 assert.match(sql,/reality_owner_approve_qualified_chat_original_v1/);
 assert.match(sql,/for update/);
 assert.match(sql,/reality_read_owner_qualified_chat_original_source_v1/);
 assert.match(sql,/public\.reality_admit_chat_new_development_v1/);
 assert.match(sql,/ORIGINAL_ADMITTED_IN_EXISTING_CHAT_WORK_ADAPTER/);
 for(const x of [
 "'model_execution_authorized',false","'new_shift_started',false",
 "'installation_authorized',false","'original_job_completed',false"
 ])assert.ok(sql.includes(x));
 assert.doesNotMatch(sql,/INSERT INTO reality_internal\.governed_employee_original_claims_v1/i);
 assert.doesNotMatch(sql,/UPDATE reality_internal\.governed_employee_completion_warrants_v1/i);
});
test('database role and owner source are independently checked, never inferred from model text',()=>{
 assert.match(sql,/current_user<>'service_role'/);
 for(const n of [
 'reality_read_owner_qualified_chat_original_source_v1',
 'reality_stage_qualified_chat_original_review_v1',
 'reality_owner_approve_qualified_chat_original_v1',
 'reality_read_owner_qualified_chat_original_reviews_v1'
 ]){
  assert.ok(sql.includes('revoke all on function public.'+n));
  assert.ok(sql.includes('grant execute on function public.'+n));
  assert.ok(boundary.includes(n.replace(/^reality_/,'')));
 }
 assert.match(api,/authenticatedChatSession\(req,res\)/);
 assert.match(api,/assertSameOrigin\(req\)/);
 assert.match(api,/inspectSavedChatWork\(/);
 assert.match(api,/exactQualifiedChatReview\(packet,owner\)/);
 assert.match(api,/reality_owner_approve_qualified_chat_original_v1/);
 assert.match(api,/EXACT_OWNER_ADMISSION_COMMITTED_READBACK_UNCERTAIN/);
 assert.match(api,/retry_owner_approval:false/);
});
test('Chat only offers actionable approval after verified scope from stored source',()=>{
 assert.match(panel,/Signed Chat originals · exact approval/);
 assert.match(panel,/INSPECT_QUALIFIED_CHAT_ORIGINAL/);
 assert.match(panel,/checkedPacket\(p,item\)/);
 assert.match(panel,/Approve exact original admission/);
 assert.match(panel,/APPROVE_EXACT_QUALIFIED_CHAT_ORIGINAL/);
 assert.match(panel,/approvalUncertain=true/);
 assert.match(panel,/Original admitted:/);
 assert.match(panel,/No original admitted/);
 assert.doesNotMatch(panel,/authorize_employee_shift_v1|OWNER_APPROVE_EXACT_VERIFIED_ISOLATED_CAPABILITY/);
});

test('real signed worker sends exact owner admission back into SAME Continuity, preserving approval',()=>{
 for(const x of [
  'reality_reconcile_continuity_qualification_routes_v1',
  'owner_qualified_chat_original_review_packets_v1',
  'QUALIFIED_CHAT_ORIGINAL_AWAITING_EXACT_OWNER_APPROVAL',
  'QUALIFIED_CHAT_ORIGINAL_ADMITTED_PENDING_GOVERNED_EXECUTION',
  'EXISTING_SIGNED_CHAT_ORIGINAL_RECONCILE_WORKER',
  'EXISTING_SIGNED_CHAT_WORKER_RECHECK_ORIGINAL_SOURCE_SCOPE_AND_ACCEPTANCE',
  'PRESENT_EXISTING_EXACT_OWNER_ADMISSION_CARD_IN_REALITY_CHAT',
  'QUALIFIED_CHAT_ORIGINAL_AWAITING_EXACT_OWNER_APPROVAL',
  'chat_work_handoffs_v1',
  'reality_chat_messages'
 ])assert.ok(continuity.includes(x),'missing same-source return: '+x);
 assert.match(continuity,/r.status='STARTED'/);
 assert.match(continuity,/SOURCE_EPOCH_REVALIDATION_REQUIRED/);
 assert.match(continuity,/new_original_admitted',false/);
 assert.match(continuity,/owner_approval_granted',false/);
 assert.match(continuity,/installation_authorized',false/);
 assert.doesNotMatch(continuity,/INSERT INTO reality_internal\.governed_employee_original_claims_v1/i);
 assert.doesNotMatch(continuity,/reality_authorize_employee_shift_v1/i);
 assert.ok(continuity.length<20000,'duplicate SQL replacement content detected');
});
