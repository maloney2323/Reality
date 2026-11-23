import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
const db=readFileSync(new URL('../src/reality-governed-shift-boundary-v1.js',import.meta.url),'utf8');
const sql=readFileSync(new URL('../sql/reality-final-loop-signed-worker-release-wakes-v1.sql',import.meta.url),'utf8');

test('actual signed worker gates commit and capability receipt to isolated preview',()=>{
 assert.match(worker,/REALITY_SIGNED_WORKER_RELEASE_ATTESTATION_ENABLED==='true'/);
 assert.match(worker,/REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED!=='true'/);
 assert.match(worker,/db\.project!==process\.env\.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF/);
 assert.match(worker,/signedWorkerReleaseOperatingLane\.operating_lane!=='NORMAL_SIGNED_SHIFT'/);
 assert.match(worker,/signedWorkerCapabilityDelivery\.status!==/);
 assert.match(worker,/p_worker_run_id:actualWorkerRunId/);
 assert.match(worker,/p_release_sha:signedWorkerCapabilityDelivery\.running_release_sha/);
 assert.match(worker,/p_registered_capabilities:registeredRecoveryActionKeys/);
 assert.match(worker,/signed_worker_durable_release_wake:signedWorkerDurableReleaseWake/);
});
test('service-role RPC names are statically allowlisted, not model-selected',()=>{
 assert.match(db,/\|record_signed_worker_release_wake_v1\|read_signed_worker_release_wakes_v1\|/);
});
test('persisted actual-run identity is not a release or work settlement',()=>{
 assert.match(sql,/PRIMARY KEY\s+REFERENCES reality_internal\.signed_worker_actual_runs_v1\(run_id\)/);
 assert.match(sql,/r\.status='STARTED'/);
 assert.match(sql,/r\.status='COMPLETED'/);
 assert.match(sql,/r\.worker_stage='WORKER_RESPONSE_PUBLICATION'/);
 assert.match(sql,/ON CONFLICT \(worker_run_id\) DO NOTHING/);
 assert.match(sql,/SIGNED_RELEASE_WAKE_ALREADY_RECORDED_NO_REPLAY/);
 assert.match(sql,/release_activated',false/);
 assert.match(sql,/original_job_completed',false/);
 assert.match(sql,/REVOKE ALL ON FUNCTION[\s\S]*FROM PUBLIC,anon,authenticated/);
});
