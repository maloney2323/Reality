// Frozen acceptance for the actual missing second-stage worker handoff.
// Run UNCHANGED against the parent commit (expected RED) and the proposed
// repair commit (expected GREEN). Does not authorize install or settle work.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
test('signed employee wake actually executes an independent baseline after source recheck',()=>{
 const worker=read('api/reality/governed-employee-shift-worker.js');
 assert.match(worker,/advanceOneSignedInternalMaintenanceJob\(\{/);
 assert.match(worker,/reproduceOneSignedMaintenanceFailureBaseline\(\{/);
 assert.match(worker,/signed_maintenance_failure_baseline:maintenanceFailureBaseline/);
 assert.match(worker,/workerRunId:actualWorkerRunId/);
});
test('new baseline worker rejects invented CI pass, repair and customer settlement',()=>{
 const implementation=read('src/reality-signed-maintenance-failure-baseline-v1.js');
 assert.match(implementation,/SIGNED_MAINTENANCE_BASELINE_SOURCE_EPOCH_CHANGED/);
 assert.match(implementation,/executable_frozen_ci_red_verified:false/);
 assert.match(implementation,/model_code_generated:false,repair_executed:false/);
 assert.match(implementation,/original_job_completed:false,new_customer_work_created:false/);
 assert.match(implementation,/installation_authorized:false,production_changed:false/);
});
test('durable second signed-run reproduction is real, owner scoped and independent',()=>{
 const sql=read('supabase/migrations/20261117_signed_internal_maintenance_failure_baseline_v18.sql');
 assert.match(sql,/m0\.claimed_worker_run_id<>p_worker_run_id/);
 assert.match(sql,/join reality_internal\.signed_worker_actual_runs_v1 run/);
 assert.match(sql,/last_source_sha256=p_provider_sha256/);
 assert.match(sql,/b\.original_claim_count=0 and prior_inquiry_count>=2/);
 assert.match(sql,/v_claims<>0 or v_inquiries<b\.prior_inquiry_count/);
 assert.match(sql,/r\.previously_reviewed_sha256<>current_provider_sha256/);
 assert.match(sql,/failure_baseline_observed_at/);
 assert.match(sql,/reconcile_stale_internal_maintenance_baseline_v1/);
 assert.doesNotMatch(sql,/insert into reality_internal\.governed_employee_shifts_v1/);
 assert.doesNotMatch(sql,/grant execute[^;]+to (anon|authenticated)/is);
});
