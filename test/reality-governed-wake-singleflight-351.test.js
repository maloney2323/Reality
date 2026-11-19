import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const worker=readFileSync(new URL(
 '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
const boundary=readFileSync(new URL(
 '../src/reality-governed-shift-boundary-v1.js',import.meta.url),'utf8');
const lease=readFileSync(new URL(
 '../supabase/migrations/20261119040000_bounded_preview_shift_worker_wake.sql',
 import.meta.url),'utf8');
const cron=readFileSync(new URL(
 '../supabase/migrations/20261119040500_remove_idle_standing_discovery_wake.sql',
 import.meta.url),'utf8');

test('only an authenticated preview worker can reach the durable wake claim',()=>{
 const authentication=worker.indexOf("if(process.env.VERCEL_ENV!=='preview'||!validSecret(");
 const claim=worker.indexOf("'reality_claim_governed_shift_worker_run_v1'");
 const actualRun=worker.indexOf("'reality_record_signed_worker_actual_run_v1'");
 assert.ok(authentication>=0 && claim>authentication && actualRun>claim);
 assert.match(worker,/WAKE_COALESCED_ACTIVE_OR_COOLDOWN/);
 assert.match(worker,/worker_started:false,work_completed:false/);
});
test('only allowlisted, service-role transport can claim and release leases',()=>{
 assert.match(boundary,/claim_governed_shift_worker_run_v1/);
 assert.match(boundary,/release_governed_shift_worker_run_v1/);
 assert.match(lease,/SECURITY INVOKER/);
 assert.match(lease,/REVOKE ALL ON FUNCTION public\.reality_claim_governed_shift_worker_run_v1\(uuid\)/);
 assert.match(lease,/GRANT EXECUTE ON FUNCTION public\.reality_claim_governed_shift_worker_run_v1\(uuid\)/);
 assert.match(lease,/TO service_role;/);
 assert.match(lease,/ENABLE ROW LEVEL SECURITY/);
});
test('worker releases only its own lease and falls back to bounded expiry',()=>{
 assert.match(lease,/ON CONFLICT \(worker_key\) DO UPDATE SET/);
 assert.match(lease,/WHERE current_lease\.lease_expires_at<=v_now/);
 assert.match(lease,/AND current_lease\.next_wake_at<=v_now/);
 assert.match(lease,/claim\.claim_id=p_claim_id/);
 assert.match(lease,/interval '6 minutes'/);
 assert.match(lease,/interval '4 minutes'/);
 assert.match(worker,/'reality_release_governed_shift_worker_run_v1'/);
 assert.ok(worker.indexOf("'reality_release_governed_shift_worker_run_v1'")>
           worker.indexOf('}finally{'));
});
test('preview scheduler patch is fail-closed on exact command drift',()=>{
 assert.match(cron,/jobname='reality-riley-preview-original-execution-wake-v1'/);
 assert.match(cron,/md5\(v_job\.command\)<>/);
 assert.match(cron,/UNEXPECTED_STANDING_GRANT|PREVIEW_WORKER_COMMAND_DRIFT/);
 assert.match(cron,/cron\.alter_job/);
 assert.match(cron,/INDEPENDENT|READBACK_FAILED_ROLLBACK/);
 assert.ok(cron.includes("schedule=>'*/5 * * * *'"));
 assert.match(cron,/owner_capability_employee_schedule_v1/);
 assert.match(cron,/eligible_shift\.permitted/);
});
