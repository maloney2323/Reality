import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectOwnerIncidentChatBriefing,incidentChatUniverseObservations}
 from '../src/reality-owner-operational-incident-chat-v1.js';
const owner='11111111-2222-4333-8444-555555555555';
const incident='22222222-3333-4444-8555-666666666666';
const rId='33333333-4444-4555-8666-777777777777';
const runId='44444444-5555-4666-8777-888888888888';
const claimId='55555555-6666-4777-8888-999999999999';
const hash=s=>'sha256:'+s.repeat(64);
const source={
 status:'OWNER_SIGNED_WORKER_RECOVERY_EVIDENCE_READ_ONLY',
 owner_id:owner,owner_scope_verified:true,read_only:true,
 execution_authorized_by_read:false,installation_authorized:false,
 production_changed:false,scheduler_dispatch_success_not_worker_proof:true,
 autonomous_self_repair_proven:false,
 incident_count:1,next_action:'Check exact preview repair receipt.',
 last_scheduler_status:'failed',
 incidents:[{
  incident_id:incident,phase:'DETECTED',
  error_summary:'ERROR: GAP_FEED_OWNER_SERVICE_ROLE_REQUIRED',
  last_observed_at:'2026-11-17T12:23:00Z',
  failure_count:3,assigned_employee:null,independent_reviewer:null,
  investigation_scope:null,independent_test_requirement:null,
  scheduler_dispatched_after_failure:false,
  independently_verified_repaired:false,autonomous_self_repair_proven:false,
  operational_continuity_verified:false
 }]
};
const repairItem={
 repair_id:rId,incident_id:incident,
 phase:'INDEPENDENT_WORKER_AND_ORIGINAL_VERIFIED',
 repair_kind:'EXACT_PREVIEW_SCHEDULER_OWNER_FEED_ROLE_MISMATCH',
 preview_only:true,production_changed:false,
 scope_verified:true,before_sha256:hash('a'),after_sha256:hash('b'),
 repair_receipt_sha256:hash('c'),
 repair_applied_at:'2026-11-17T12:24:00Z',
 worker_run_id:runId,
 original_capability_claim_id:claimId,
 original_work_receipt_sha256:hash('d'),
 verified_at:'2026-11-17T12:26:00Z',
 next_action:'A genuine owner-scheduled investigation resumed in preview with source-backed proof.'
};
const repair={
 status:'OWNER_PREVIEW_OPERATIONAL_AUTO_REPAIR_READ_ONLY',
 owner_id:owner,owner_scope_verified:true,read_only:true,
 items:[repairItem],count:1,production_changed:false,
 new_job_authorized_by_read:false,
 install_authorized_by_read:false,
 historical_external_correction_not_reclassified:true
};
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('only exact independently verified signed worker PLUS same original grants scoped self-repair success',()=>{
 const x=projectOwnerIncidentChatBriefing({ownerId:owner,source,autoRepair:repair});
 assert.equal(x.items[0].self_repair_completed,true);
 assert.equal(x.items[0].original_scheduled_inquiry_resumed_and_verified,true);
 assert.equal(x.items[0].original_customer_job_completed_by_repair,false);
 assert.equal(x.items[0].self_repair_scope,
  'KNOWN_SAFE_PREVIEW_SCHEDULER_PERMISSION_GATE_ONLY');
 assert.match(x.items[0].stage,/VERIFIED/);
 assert.match(x.items[0].outcome,/automatically corrected/);
 assert.equal(x.items[0].bounded_preview_self_repair.worker_run_id,runId);
 const observations=incidentChatUniverseObservations(x);
 assert.equal(observations[0].self_repair_proven,true);
 assert.equal(observations[0].original_job_completed,false);
 assert.equal(x.original_job_authorized_by_chat,false);
 assert.equal(x.installation_authorized,false);
});
test('an applied patch without real worker and original receipts is NOT completed',()=>{
 const repairing={...repair,items:[{
  ...repairItem,phase:'PATCH_APPLIED_AWAITING_WORKER',
  worker_run_id:null,original_capability_claim_id:null,
  original_work_receipt_sha256:null,verified_at:null
 }]};
 const x=projectOwnerIncidentChatBriefing({
  ownerId:owner,source,autoRepair:repairing
 });
 assert.equal(x.items[0].self_repair_completed,false);
 assert.equal(x.items[0].bounded_preview_self_repair_cycle_proven,false);
 assert.match(x.items[0].stage,/pending/);
});
test('forged owner, receipt and production effects must fail closed',()=>{
 const tampered=[
  {...repair,owner_id:'66666666-7777-4888-8999-aaaaaaaaaaaa'},
  {...repair,items:[{...repairItem,worker_run_id:null}]},
  {...repair,items:[{...repairItem,original_work_receipt_sha256:null}]},
  {...repair,items:[{...repairItem,production_changed:true}]},
  {...repair,items:[{...repairItem,preview_only:false}]},
  {...repair,items:[{...repairItem,repair_receipt_sha256:'bogus'}]},
  {...repair,install_authorized_by_read:true}
 ];
 for(const attempt of tampered)assert.throws(()=>projectOwnerIncidentChatBriefing({
  ownerId:owner,source,autoRepair:attempt
 }),/OPERATIONAL_CHAT_OWNER_INCIDENT_PROOF_REQUIRED/);
});
test('historical external correction does not get reclassified without a new independent repair receipt',()=>{
 const x=projectOwnerIncidentChatBriefing({ownerId:owner,source});
 assert.equal(x.items[0].self_repair_completed,false);
 assert.equal(x.bounded_preview_auto_repair.count,0);
});
test('same existing watchdog, exact preview only, single known recipe, actual independent final proof',()=>{
 const primary=read('supabase/migrations/20261117_preview_watchdog_actual_self_repair_v1.sql');
 const second=read('supabase/migrations/20261117_preview_watchdog_actual_self_repair_v2.sql');
 const wired=read('supabase/migrations/20261117_watchdog_autorepair_trigger_and_owner_readback_v1.sql');
 const broker=read('src/reality-governed-shift-boundary-v1.js');
 const chat=read('reality-chat-operational-incident-briefing-v1.js');
 assert.match(primary,/GAP_FEED_OWNER_SERVICE_ROLE_REQUIRED/);
 assert.match(primary,/cron\.alter_job\(j\.jobid,command=>next_command\)/);
 assert.match(primary,/REPAIR_APPLIED_AWAITING_INDEPENDENT_SIGNED_WORKER_AND_ORIGINAL_PROOF/);
 assert.match(primary,/current_user<>'postgres'/);
 assert.match(primary,/credential.worker_token/);
 assert.match(primary,/INQUIRY_SCHEDULED_REQUIRES_INDEPENDENT_GAP_PROOF/);
 assert.match(second,/t\.claim_id=a\.original_capability_claim_id/);
 assert.match(second,/t\.claimed_at<a\.repair_applied_at/);
 assert.match(second,/r\.started_at<=clock_timestamp\(\)/);
 assert.match(second,/t\.inquiry_source_proof_sha256/);
 assert.match(wired,/watchdog_guarded_preview_self_repair_v1/);
 assert.match(wired,/owner_routine_delegations_v1/);
 assert.doesNotMatch(wired,/cron\.schedule\(/);
 assert.match(broker,/read_owner_preview_worker_auto_repair_v1/);
 assert.match(chat,/Automatic preview recovery/);
});
