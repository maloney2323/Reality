import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifyOwnerSignedHandoffHealth}
 from '../api/reality/personal-handoff-health.js';
import {shiftRpc} from '../src/reality-governed-shift-boundary-v1.js';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const scope={
 handoff_id:'02420d84-2220-4019-a78a-9b3e68fefcde',
 source_ref:'https://github.com/maloney2323/Reality/pull/211',
 state:'SOURCE_RECHECKED',work_scope_approved:true,
 independent_frozen_ci_after_approval_verified:false,
 status:'APPROVED_SOURCE_RECHECKED_NEXT_INDEPENDENT_CI',
 next_action:'EXECUTE_NEW_INDEPENDENT_CASE_SPECIFIC_FROZEN_CI'
};
const maintenance=[
 {source_ref:'https://github.com/maloney2323/Reality/pull/307',
  older_handoff_phase:'NEEDS_CASE_SPECIFIC_FROZEN_RED',
  status:'REPAIR_NEEDS_CASE_SPECIFIC_FROZEN_CI_OR_SOURCE_REQUALIFICATION',
  next_action:'RUN_CASE_SPECIFIC_FROZEN_RED_AND_RECHECK_SOURCE'},
 {source_ref:'https://github.com/maloney2323/Reality/pull/308',
  older_handoff_phase:'NEEDS_CASE_SPECIFIC_FROZEN_RED',
  status:'REPAIR_INDEPENDENTLY_VERIFIED_PREVIEW_ONLY',
  installation_state:'VERIFIED',
  independent_install_verified_at:'2026-11-21T01:45:09Z',
  next_action:'RECONCILE_SEPARATE_ORIGINAL_JOB_ACCEPTANCE'}
];
const live={
 status:'SIGNED_OWNER_SHIFT_HANDOFF_HEALTH_READ_ONLY',
 owner_id:owner,checked_at:'2026-11-21T05:20:00Z',
 shift_id:shift,shift_status:'AWAITING_EXACT_ORIGINAL_WORK',
 worker_status:'SCHEDULED_WORKER_RECENT_WAKE_COMPLETED',
 worker_wake_count:560,
 employee_independently_verified_evidence_jobs:60,
 employee_evidence_jobs_unsettled:0,
 employee_evidence_is_not_customer_completion:true,
 maintenance_handoffs:maintenance,repair_scope:scope,
 original_claim_count:0,original_independent_final_receipt_count:0,
 original_work_status:'CANONICAL_OWNER_BUSINESS_ORIGINAL_NOT_ADMITTED',
 original_next_action:'QUALIFY_SOURCE_BACKED_OWNER_BUSINESS_WORK_WITHOUT_WIDENING_WARRANT',
 universe_verified_event_rows:3,
 ceo_operational_decision_handoff:'NOT_INDEPENDENTLY_ATTESTED_BY_THIS_READ',
 past_present_future_handoff:'SEPARATE_OWNER_TIME_HORIZON_READ_ONLY',
 read_only:true,installation_authorized:false,
 production_changed:false,original_job_completed:false,new_shift_started:false
};
test('owner full handoff map preserves true receipt hierarchy and missing original',()=>{
 const v=verifyOwnerSignedHandoffHealth(live,owner);
 assert.ok(v);
 assert.equal(v.maintenance_handoffs[1].status,'REPAIR_INDEPENDENTLY_VERIFIED_PREVIEW_ONLY');
 assert.equal(v.maintenance_handoffs[1].older_handoff_phase,
  'NEEDS_CASE_SPECIFIC_FROZEN_RED');
 assert.equal(v.repair_scope.status,'APPROVED_SOURCE_RECHECKED_NEXT_INDEPENDENT_CI');
 assert.equal(v.repair_scope.independent_frozen_ci_after_approval_verified,false);
 assert.equal(v.original_independent_final_receipt_count,0);
 assert.equal(v.employee_independently_verified_evidence_jobs,60);
 assert.equal(v.ceo_operational_decision_handoff,
  'NOT_INDEPENDENTLY_ATTESTED_BY_THIS_READ');
 assert.equal(v.original_job_completed,false);
});
test('cross-owner or forged statuses cannot become trusted customer completion',()=>{
 for(const wrong of [
  {...live,owner_id:shift},
  {...live,installation_authorized:true},
  {...live,original_job_completed:true},
  {...live,production_changed:true},
  {...live,employee_independently_verified_evidence_jobs:-1},
  {...live,maintenance_handoffs:[{...maintenance[0],
   source_ref:'https://example.com/pull/307'}]},
  {...live,repair_scope:{...scope,independent_frozen_ci_after_approval_verified:true}},
  {...live,original_work_status:'FULL_LOOP_COMPLETE'},
  {...live,ceo_operational_decision_handoff:'CEO_FULL_LOOP_VERIFIED'},
  {...live,checked_at:'wrong'}
 ])assert.equal(verifyOwnerSignedHandoffHealth(wrong,owner),null);
});
test('empty original shift cannot be misreported as completed',()=>{
 const v=verifyOwnerSignedHandoffHealth({
  status:'NO_CURRENT_SIGNED_MAINTENANCE_SHIFT_HANDOFF',
  owner_id:owner,read_only:true,
  handoffs:[],original_job_completed:false,
  installation_authorized:false,production_changed:false
 },owner);
 assert.ok(v);
});
test('exact service-only health read RPC allowed and neighbors blocked',async()=>{
 const db={url:'https://example.supabase.co',
  secretKey:'inert-test-only-key'};
 let count=0;
 const fetchImpl=async(u,opts)=>{
  count++;
  assert.equal(u,db.url+'/rest/v1/rpc/reality_read_owner_shift_handoff_health_v1');
  assert.deepEqual(JSON.parse(opts.body),{p_owner_id:owner});
  return{ok:true,json:async()=>live};
 };
 await shiftRpc(db,'reality_read_owner_shift_handoff_health_v1',
  {p_owner_id:owner},{fetchImpl});
 assert.equal(count,1);
 await assert.rejects(shiftRpc(db,'reality_read_owner_shift_handoff_health_v1_install',
  {p_owner_id:owner},{fetchImpl}),/SHIFT_RPC_NOT_ALLOWLISTED/);
 assert.equal(count,1);
});
test('Chat receives owner-only health read and shows actual gaps, never invents CEO execution',()=>{
 const ui=readFileSync(new URL('../reality-chat-handoff-health-v1.js',
  import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261121053000_owner_signed_handoff_health_v1.sql',
  import.meta.url),'utf8');
 assert.match(html,/reality-chat-handoff-health-v1\.js/);
 assert.match(ui,/personal-handoff-health/);
 assert.match(ui,/Original customer work/);
 assert.match(ui,/Reality CEO and Past \/ Present \/ Future/);
 assert.match(ui,/case-specific independent tests/);
 assert.match(ui,/independently verified maintenance installation/);
 assert.match(sql,/t\.install_state='VERIFIED' AND t\.independently_verified_at IS NOT NULL/);
 assert.match(sql,/h\.owner_id=p_owner_id AND h\.shift_id=v_shift\.shift_id/);
 assert.match(sql,/owner_qualified_employee_evidence_jobs_v1/);
 assert.match(sql,/governed_original_independent_final_receipts_v1/);
 assert.match(sql,/public\.universe_events/);
 assert.doesNotMatch(sql,/\b(?:INSERT INTO|DELETE FROM|UPDATE reality_internal)\b/i);
});

test('same signed worker exposes bounded owner-reconciled all-handoff health and cannot stop shift if read fails',()=>{
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(worker,/reality_read_owner_shift_handoff_health_v1/);
 assert.match(worker,/signed_owner_handoff_health:signedOwnerHandoffHealth/);
 assert.match(worker,/SIGNED_OWNER_HANDOFF_HEALTH_UNVERIFIED/);
 assert.match(worker,/h\.installation_authorized===false/);
 assert.match(worker,/h\.original_job_completed===false/);
 assert.match(worker,/h\.production_changed===false/);
 assert.match(worker,/catch\{\/\* Signed execution continues; no guessed work status\. \*\/\}/);
});
