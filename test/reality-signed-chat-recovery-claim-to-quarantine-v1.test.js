import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sql=read('../supabase/migrations/20261122004500_signed_chat_gap_existing_capability_queue_v1.sql');
const model=read('../src/reality-chat-new-development-worker-v1.js');
const worker=read('../api/reality/governed-employee-shift-worker.js');
const boundary=read('../src/reality-governed-shift-boundary-v1.js');
const broker=read('../supabase/functions/reality-chat-recovery-quarantine-broker-v1/index.ts');
const publisher=read('../src/reality-chat-recovery-quarantine-publisher-v1.js');
test('existing trusted queue accepts independently authenticated chat gap without inventing Universe events',()=>{
 for(const x of ['source_kind','SIGNED_CHAT_DEVELOPMENT_RECOVERY',
  'UNIVERSE_VERIFIED_GAP','original_work_event_id is not null',
  'goal_transition_event_id is not null','gap_event_id is not null',
  'original_work_event_id is null','goal_transition_event_id is null',
  'gap_event_id is null',
  "w.message_sha256=pg_catalog.encode(pg_catalog.sha256(",
  "m.role='user'","m.user_id=w.owner_id",
  "w.development->>'phase'='CI_VERIFIED'",
  "'goal_gap_source_sha256'=w.message_sha256",
  "source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'",
  'genuine_capability_signed_chat_gap_identity_v1'])
  assert.ok(sql.includes(x),x);
 assert.doesNotMatch(sql,/work:[a-f0-9]{32}(?!\$)/);
 assert.doesNotMatch(sql,/INSERT INTO public\.reality_chat_messages|INSERT INTO public\.universe_events/i);
 assert.match(sql,/on conflict do nothing/);
});
test('typed spec is frozen, source hashed and trust cannot be self-certified',()=>{
 for(const x of ["'schema','reality-recovery-compiler-capability-spec-v1'",
  "'checkpoint',checkpoint","'blocker_receipt_sha256'",
  "'required_interfaces'","'quarantine_policy'","'rollback'",
  "'independent-full-original-goal-feature-acceptance'",
  "'permissions_expansion',false","'full_goal_accepted',false",
  "'installation_authorized',false","'original_job_completed',false",
  "source_kind"])assert.ok(sql.includes(x),x);
 assert.match(sql,/extensions\.digest\(specs::text,'sha256'\)/);
 assert.match(sql,/verified_capability_receipt_releases_v1/);
 assert.match(sql,/existing_registry_compatible_receipts/);
 assert.match(sql,/SIGNED_CHAT_RECOVERY_COMPATIBILITY_REVIEW_REQUIRED/);
});
test('signed claim is atomic, unique, bounded and names same original, not new owner job',()=>{
 for(const x of ["where source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'",
  "'SIGNED_CHAT_RECOVERY_SPEC_FROZEN'","for update skip locked",
  "clock_timestamp()+interval '3 minutes'",
  "'SIGNED_CHAT_RECOVERY_MODEL_CLAIMED'",
  "'SIGNED_CHAT_RECOVERY_SOURCE_LEASED'",
  "'recovery_mode',true","'claim_id',claim",
  "'original_work_id',q.original_work_id"])assert.ok(sql.includes(x),x);
 assert.doesNotMatch(sql,/reality_admit_chat_new_development_v1|authorize_employee_shift_v1/);
});
test('existing model generator runs recovery mode from same work and persists bounded untrusted source only',()=>{
 assert.match(worker,/reality_admit_next_signed_chat_recovery_spec_v1/);
 assert.match(worker,/recoveryMode:true/);
 assert.match(model,/reality_claim_next_signed_chat_recovery_candidate_v1/);
 assert.match(model,/reality_record_signed_chat_recovery_draft_v1/);
 assert.match(model,/reality_mark_signed_chat_recovery_unverified_v1/);
 assert.match(model,/SIGNED_CHAT_RECOVERY_CODE_DRAFT_GENERATED/);
 assert.match(sql,/negative_capability_memory/);
 assert.match(sql,/same_candidate_retry_forbidden/);
 assert.match(boundary,/admit_next_signed_chat_recovery_spec_v1/);
});
test('quarantine transport writes only fenced draft branch and performs provider GET reconciliation',()=>{
 for(const x of [
  'SIGNED_CHAT_RECOVERY_QUARANTINE_CANDIDATE_READ',
  'reality_fence_signed_chat_recovery_publish_v1',
  'reality_record_signed_chat_recovery_quarantine_v1',
  "branch:'reality/chat-recovery/'+s.trigger_id",
  "artifact:'evidence/reality-chat-recovery/'+s.trigger_id+'.json'",
  "draft:true","RECOVERY_FENCED_PROVIDER_EFFECT_UNVERIFIED_NO_REPLAY",
  "source_installed:false","installation_authorized:false",
  "full_goal_accepted"]) {
   if(x==='full_goal_accepted')assert.ok(sql.includes(x));
   else assert.ok(broker.includes(x),x);
  }
 assert.match(publisher,/stage_signed_chat_recovery_quarantine/);
 assert.match(worker,/stageNextSignedChatRecoveryQuarantine/);
 assert.doesNotMatch(broker,/\/merges|\/deployments|github\.com\/[^'"]*\/releases/);
 assert.match(sql,/SIGNED_CHAT_RECOVERY_CANDIDATE_QUARANTINED/);
 assert.match(sql,/quarantine_receipt_sha256/);
});
test('no client or model can claim or publish through SQL RPC',()=>{
 for(const name of [
  'reality_admit_next_signed_chat_recovery_spec_v1',
  'reality_claim_next_signed_chat_recovery_candidate_v1',
  'reality_record_signed_chat_recovery_draft_v1',
  'reality_mark_signed_chat_recovery_unverified_v1',
  'reality_read_next_signed_chat_recovery_publish_v1',
  'reality_fence_signed_chat_recovery_publish_v1',
  'reality_record_signed_chat_recovery_quarantine_v1'
 ]){
  assert.ok(sql.includes('function public.'+name),name);
  assert.match(sql,new RegExp('revoke all on function public\\.'+name));
  assert.match(sql,new RegExp('grant execute on function public\\.'+name));
  assert.ok(boundary.includes(name.replace(/^reality_/,''))||broker.includes(name),name);
 }
 assert.match(sql,/current_user<>'service_role'/);
});
