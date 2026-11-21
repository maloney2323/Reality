import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectOwnerCapabilityWorkspace as project}
 from '../api/reality/personal-capabilities.js';
const owner='11111111-2222-4333-8444-555555555555';
const sha='sha256:'+'a'.repeat(64);
const feed={
 status:'OWNER_GAP_INTAKE_RECONCILED',ok:true,owner_id:owner,
 read_only:true,work_started:false,production_changed:false,
 counts:{current_candidates:0,verified_current_gaps:0,
  governed_active_queue:0,independently_tested_candidates:0},
 items:[]
};
const grant={
 status:'OWNER_STANDING_ROUTINE_DELEGATION_READ_ONLY',
 owner_id:owner,owner_scope_verified:true,read_only:true,
 enabled:true,currently_active:true,
 scope:'EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1',
 external_actions_authorized:false,
 installation_authorized:false,
 shift_execution_authorized:false,
 production_changed:false
};
const verified={
 phase:'OPERATIONAL_CONTINUITY_VERIFIED_EXTERNAL_FIX',
 error_summary:'ERROR: GAP_FEED_OWNER_SERVICE_ROLE_REQUIRED',
 failure_count:8,last_observed_at:'2026-11-17T12:23:00Z',
 assigned_employee:'Taylor',independent_reviewer:'Quinn',
 investigation_scope:'Diagnose original scheduler role boundary',
 independent_test_requirement:'Independently test post-repair worker records',
 scheduler_dispatched_after_failure:true,
 operational_continuity_verified:true,
 operational_recovery_receipt_sha256:sha,
 operational_recovery_verified_at:'2026-11-17T12:52:19Z',
 operational_recovery_attribution:'EXTERNALLY_CORRECTED_NOT_SELF_REPAIRED',
 autonomous_self_repair_proven:false,
 independently_verified_repaired:false
};
const health={
 status:'OWNER_SIGNED_WORKER_RECOVERY_EVIDENCE_READ_ONLY',
 owner_id:owner,owner_scope_verified:true,read_only:true,
 standing_grant_active:true,
 last_scheduler_status:'succeeded',
 last_scheduler_check_at:'2026-11-17T12:54:00Z',
 last_scheduler_success_at:'2026-11-17T12:54:00Z',
 scheduler_dispatch_success_not_worker_proof:true,
 current_capability_investigations_scheduled:5,
 operational_recoveries_verified:1,
 autonomous_self_repair_proven:false,
 incidents:[verified],incident_count:1,
 next_action:'No new repair of the historical failure needed; future recurrence reopens.',
 execution_authorized_by_read:false,
 installation_authorized:false,production_changed:false
};
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
test('a separately reconciled operating recovery is visible without claiming self-repair or a new job',()=>{
 const r=project({ownerId:owner,feed,grant,workerHealth:health});
 const progress=r.worker_progress;
 assert.equal(progress.operational_recoveries_verified,1);
 assert.equal(progress.autonomous_self_repair_proven,false);
 assert.equal(progress.incidents[0].operational_continuity_verified,true);
 assert.equal(progress.incidents[0].operational_recovery_receipt_sha256,sha);
 assert.equal(progress.incidents[0].operational_recovery_attribution,
  'EXTERNALLY_CORRECTED_NOT_SELF_REPAIRED');
 assert.equal(progress.incidents[0].independently_verified_repaired,false);
 assert.equal(r.jobs_created_by_read,0);
});
test('forged or wrong-owner verification receipt is withheld',()=>{
 for(const altered of [
  {...verified,operational_recovery_receipt_sha256:null},
  {...verified,operational_recovery_attribution:'AUTONOMOUS_REPAIR'},
  {...verified,operational_continuity_verified:false},
  {...verified,autonomous_self_repair_proven:true}
 ]){
  assert.throws(()=>project({ownerId:owner,feed,grant,workerHealth:{
   ...health,incidents:[altered]
  }}),/WORKER_RECOVERY_OWNER_OR_PROOF_UNVERIFIED/);
 }
 assert.throws(()=>project({ownerId:owner,feed,grant,workerHealth:{
  ...health,owner_id:'00000000-0000-4000-8000-000000000000'
 }}),/WORKER_RECOVERY_OWNER_OR_PROOF_UNVERIFIED/);
});
test('the existing watchdog checks cron success plus signed worker receipts; never invents repair permission',()=>{
 const migrate=read('supabase/migrations/20261117_worker_operational_continuity_verification_v1.sql');
 const scope=read('supabase/migrations/20261117_owner_worker_recovery_status_readback_v2.sql');
 const ui=read('reality-capability-workspace-v1.js');
 assert.match(migrate,/employee_temporal_inquiries_v1/);
 assert.match(migrate,/provider_proof_sha256/);
 assert.match(migrate,/cron.job_run_details/);
 assert.match(migrate,/successes<3/);
 assert.match(migrate,/RECURRENT_FAILURE_REOPENED/);
 assert.match(migrate,/OPERATIONAL_CONTINUITY_VERIFIED_EXTERNAL_FIX/);
 assert.match(migrate,/EXTERNALLY_CORRECTED_NOT_SELF_REPAIRED/);
 assert.match(migrate,/original_job_executed',false/);
 assert.match(migrate,/self_repaired',false/);
 assert.match(migrate,/cron.alter_job/);
 assert.doesNotMatch(migrate,/cron\.schedule\(/);
 assert.match(scope,/autonomous_self_repair_proven',false/);
 assert.match(ui,/OPERATIONAL RECOVERY VERIFIED/);
 assert.match(ui,/No additional authorization|No new repair|No further repair|Next:/);
});
