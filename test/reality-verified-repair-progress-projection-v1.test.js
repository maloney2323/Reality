import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectVerifiedOwnerRepairWorkProgress}
 from '../src/reality-verified-repair-progress-projection-v1.js';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const handoff='02420d84-2220-4019-a78a-9b3e68fefcde';
const fp='sha256:f6505fe12743016d3b8dd36e48acb9295c4836d703880359317174441e15754b';
const approval='sha256:7944e64530f9ed93cd03f808ddd51bd232e4d0007368ec7f5369d0714069a8e5';
const card={
 status:'EXACT_OWNER_REPAIR_WORK_SCOPE_DECISION_RECORDED',
 owner_id:owner,shift_id:shift,handoff_id:handoff,
 source_ref:'https://github.com/maloney2323/Reality/pull/211',
 work_order_fingerprint:fp,
 approval_receipt_sha256:approval,
 approved_at:'2026-11-21T05:07:49.059436Z',
 continued_at:'2026-11-21T05:10:10.869544Z',
 owner_approval_ready:false,owner_work_scope_approved:true,
 continuation_state:'SOURCE_RECHECKED',
 installation_authorized:false,production_changed:false,
 original_job_completed:false,new_shift_started:false,read_only:true
};
test('the actual signed #211 recheck is reported as completed, CI still missing',()=>{
 const r=projectVerifiedOwnerRepairWorkProgress(card,owner);
 assert.equal(r.status,'SOURCE_RECHECKED_AWAITING_NEW_INDEPENDENT_FROZEN_CI');
 assert.equal(r.scope_approval_receipted,true);
 assert.equal(r.source_recheck_verified,true);
 assert.equal(r.next_independent_test_receipt_verified,false);
 assert.equal(r.independent_frozen_tests_completed,false);
 assert.equal(r.next_actor,'REALITY');
 assert.equal(r.owner_action_required,false);
 assert.equal(r.next_action,'REGISTER_AND_RUN_CASE_SPECIFIC_INDEPENDENT_FROZEN_CI');
 assert.equal(r.blocker,'NEW_INDEPENDENT_FROZEN_CI_NOT_RECORDED_IN_THIS_WORK_HANDOFF');
 assert.equal(r.source_verified_at,'2026-11-21T05:10:10.869Z');
 assert.equal(r.last_verified_event_time,r.source_verified_at);
 assert.equal(r.installation_authorized,false);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.production_changed,false);
 assert.equal(r.new_shift_started,false);
});
test('new owner decision requires click, but source-qualified work is not considered running',()=>{
 const r=projectVerifiedOwnerRepairWorkProgress({
  ...card,status:'EXACT_OWNER_REPAIR_WORK_SCOPE_APPROVAL_READY',
  continuation_state:'PREPARED',
  approval_receipt_sha256:null,approved_at:null,continued_at:null,
  owner_approval_ready:true,owner_work_scope_approved:false,
  created_at:'2026-11-21T05:05:09Z'
 },owner);
 assert.equal(r.status,'AWAITING_EXACT_OWNER_WORK_SCOPE_APPROVAL');
 assert.equal(r.next_actor,'OWNER');
 assert.equal(r.owner_action_required,true);
 assert.equal(r.source_recheck_verified,false);
 assert.equal(r.last_verified_event_time,'2026-11-21T05:05:09.000Z');
});
test('approved but not yet rechecked does not claim source verification',()=>{
 const r=projectVerifiedOwnerRepairWorkProgress({
  ...card,continuation_state:'APPROVED',continued_at:null
 },owner);
 assert.equal(r.status,'OWNER_SCOPE_APPROVED_WAITING_FOR_SIGNED_SOURCE_RECHECK');
 assert.equal(r.source_recheck_verified,false);
 assert.equal(r.next_actor,'REALITY');
 assert.equal(r.owner_action_required,false);
});
test('a forged owner, missing source or contradictory receipt never becomes verified progress',()=>{
 for(const bad of [
  {...card,owner_id:shift},
  {...card,source_ref:'https://evil.example/211'},
  {...card,installation_authorized:true},
  {...card,work_order_fingerprint:'sha256:bad'},
  {...card,read_only:false}
 ]){
  const r=projectVerifiedOwnerRepairWorkProgress(bad,owner);
  assert.equal(r.status,'OWNER_WORK_PROGRESS_UNVERIFIED');
  assert.equal(r.source_recheck_verified,false);
  assert.equal(r.original_job_completed,false);
  assert.equal(r.installation_authorized,false);
 }
 const stale=projectVerifiedOwnerRepairWorkProgress({
  ...card,continued_at:'2026-11-21T05:01:00Z'
 },owner);
 assert.equal(stale.status,'OWNER_WORK_PROGRESS_RECEIPT_CONTRADICTORY');
 assert.equal(stale.source_recheck_verified,false);
});
test('Chat renders exact sourced last activity, blocker and Reality next action on owner GET',()=>{
 const server=readFileSync(new URL(
  '../api/reality/owner-repair-scope-approval.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL(
  '../reality-chat-repair-scope-approval-v1.js',import.meta.url),'utf8');
 assert.match(server,/verified_operational_progress:projectVerifiedOwnerRepairWorkProgress\(/);
 assert.match(ui,/renderOperationalProgress\(c\)/);
 assert.match(ui,/Last verified activity:/);
 assert.match(ui,/What is stopping completion:/);
 assert.match(ui,/Next: Reality must register and run case-specific independent frozen tests/);
 assert.match(ui,/reality:chat-work-opened/);
 assert.doesNotMatch(ui,/setInterval\(/);
 assert.doesNotMatch(ui,/independent_frozen_tests_completed:true/);
});
