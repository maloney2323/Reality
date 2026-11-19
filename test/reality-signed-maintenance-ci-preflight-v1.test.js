import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {assertShiftReadback,shiftRpc}
 from '../src/reality-governed-shift-boundary-v1.js';

const shift='22222222-3333-4444-8555-666666666666';
const run='55555555-6666-4777-8888-999999999999';
const source=readFileSync(new URL(
 '../src/reality-governed-shift-boundary-v1.js',import.meta.url),'utf8');
const worker=readFileSync(new URL(
 '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
const sqlPath=new URL(
 '../supabase/migrations/20261119161500_signed_maintenance_ci_preflight_v1.sql',
 import.meta.url);
const hash='sha256:'+'a'.repeat(64);
const shiftItem=(i)=>({
 shift_id:'11111111-2222-4333-8444-'+String(i).padStart(12,'0'),
 status:'ENDED_READ_ONLY',plan_fingerprint:hash,
 steps:Array.from({length:8},(_,j)=>({
  step_index:j+1,state:'QUEUED',proof_sha256:null
 }))
});
const readback=(n)=>({
 status:'OWNER_SCOPED_EMPLOYEE_SHIFT_READBACK',
 work_installation_authorized_by_read:false,
 production_changed:false,verified_human_hours_saved:null,
 shifts:Array.from({length:n},(_,i)=>shiftItem(i+1))
});

test('signed shift reader accepts all 7 real shift records, but rejects unbounded history',()=>{
 assert.equal(assertShiftReadback(readback(7)).shifts.length,7);
 assert.equal(assertShiftReadback(readback(25)).shifts.length,25);
 assert.throws(()=>assertShiftReadback(readback(26)),
  /SHIFT_INDEPENDENT_READBACK_INVALID/);
 assert.throws(()=>assertShiftReadback({
  ...readback(7),production_changed:true
 }),/SHIFT_INDEPENDENT_READBACK_INVALID/);
});

test('existing shared signed transport admits exactly one service-only maintenance CI preflight',async()=>{
 assert.match(source,/read_signed_maintenance_ci_preflight_v1/);
 const db={url:'https://fixture.supabase.co',secretKey:'test-only'};
 const response=await shiftRpc(db,'reality_read_signed_maintenance_ci_preflight_v1',{
  p_shift_id:shift,p_worker_run_id:run
 },{fetchImpl:async(url,opts)=>{
  assert.equal(url,'https://fixture.supabase.co/rest/v1/rpc/reality_read_signed_maintenance_ci_preflight_v1');
  assert.equal(opts.method,'POST');
  assert.match(opts.body,/p_worker_run_id/);
  return {ok:true,json:async()=>({status:'NO_SIGNED_MAINTENANCE_FROZEN_CI_SCOPE'})};
 }});
 assert.equal(response.status,'NO_SIGNED_MAINTENANCE_FROZEN_CI_SCOPE');
 await assert.rejects(shiftRpc(db,'reality_maintenance_autoinstall_v1',{},{
  fetchImpl:async()=>{throw Error('FORBIDDEN')}
 }),/SHIFT_RPC_NOT_ALLOWLISTED/);
});

test('frozen migration requires same signed run and exact active maintenance warrant without authorization escalation',()=>{
 assert.equal(existsSync(sqlPath),true,'CI preflight migration missing');
 const sql=readFileSync(sqlPath,'utf8');
 for(const required of [
  'reality_read_signed_maintenance_ci_preflight_v1',
  "current_user<>'service_role'",
  "run.status='STARTED'",
  "w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'",
  "w.state='ACTIVE'",
  'sh.plan_fingerprint=w.plan_fingerprint',
  "scope->>'maintenance_id'=m.incident_id::text",
  "scope->>'origin_shift_id'=m.origin_shift_id::text",
  "scope->>'source_ref'=m.source_ref",
  "scope->>'independent_review_receipt_sha256'=m.independent_review_receipt_sha256",
  "m.handling_state='FAILURE_BASELINE_REPRODUCED_NEEDS_CI_RED'",
  'm.independent_failure_baseline_receipt_sha256',
  'm.independent_frozen_test_receipt_sha256 IS NULL',
  'm.exact_install_approval_receipt_sha256 IS NULL',
  'm.repaired_capability_receipt_sha256 IS NULL',
  "REVOKE ALL ON FUNCTION public.reality_read_signed_maintenance_ci_preflight_v1(uuid,uuid) FROM PUBLIC",
  "GRANT EXECUTE ON FUNCTION public.reality_read_signed_maintenance_ci_preflight_v1(uuid,uuid) TO service_role"
 ]) assert.ok(sql.includes(required),required);
 assert.doesNotMatch(sql,/\b(insert into|update reality_internal|delete from|cron.schedule|net.http_post)\b/i);
});

test('existing signed worker reads CI preflight in same wake and does not misstate RED, repair or original job completion',()=>{
 const i=worker.indexOf("workerStage='SIGNED_INTERNAL_MAINTENANCE_INDEPENDENT_FAILURE_BASELINE'");
 const j=worker.indexOf("workerStage='SAME_QUALIFIED_EVIDENCE_SOURCE_REQUALIFICATION'");
 assert.ok(i>=0 && j>i);
 const section=worker.slice(i,j);
 assert.match(section,/reproduceOneSignedMaintenanceFailureBaseline/);
 assert.match(section,/reality_read_signed_maintenance_ci_preflight_v1/);
 assert.match(section,/p_shift_id:wakeReceipt.shift_id/);
 assert.match(section,/p_worker_run_id:actualWorkerRunId/);
 assert.match(section,/executable_frozen_ci_red_verified:false/);
 assert.match(section,/repair_executed:false/);
 assert.match(section,/original_job_completed:false/);
 assert.match(worker,/signed_maintenance_ci_preflight:signedMaintenanceCiPreflight/);
});
