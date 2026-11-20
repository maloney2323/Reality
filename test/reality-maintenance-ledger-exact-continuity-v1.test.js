import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assertShiftReadback} from '../src/reality-governed-shift-boundary-v1.js';

const sha='sha256:'+ 'a'.repeat(64);
const shiftId='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
function verifiedMaintenanceReadback(){
 return {
  status:'OWNER_SCOPED_EMPLOYEE_SHIFT_READBACK',
  work_installation_authorized_by_read:false,
  production_changed:false,
  verified_human_hours_saved:null,
  shifts:[{
   shift_id:shiftId,plan_fingerprint:sha,status:'ENDED_WITH_VERIFIED_JOB',
   steps:Array.from({length:8},(_,i)=>({
    step_index:i+1,
    state:i<5?'SOURCE_CHECKED':i<7?
      'INTERNAL_MAINTENANCE_RECEIPTS_VERIFIED':'REPORTED',
    proof_sha256:sha
   }))
  }]
 };
}
test('signed shift readback accepts a verified internal-maintenance terminal step without claiming customer work',()=>{
 const receipt=verifiedMaintenanceReadback();
 assert.equal(assertShiftReadback(receipt),receipt);
 assert.equal(receipt.shifts[0].steps[5].state,
  'INTERNAL_MAINTENANCE_RECEIPTS_VERIFIED');
});
test('signed readback still rejects invented repair completion states',()=>{
 const receipt=verifiedMaintenanceReadback();
 receipt.shifts[0].steps[5].state='MODEL_PATCH_ASSUMED_SUCCESS';
 assert.throws(()=>assertShiftReadback(receipt),
  /SHIFT_INDEPENDENT_READBACK_INVALID/);
});
test('migration fences both conditional steps behind exact independent maintenance receipts',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261119224500_maintenance_ledger_exact_receipt_continuation_v1.sql',
  import.meta.url),'utf8');
 assert.match(sql,/if jsonb_array_length\(v_verified_sources\)<>v_total/);
 assert.match(sql,/m\.repaired_capability_receipt_sha256/);
 assert.match(sql,/m\.exact_install_approval_receipt_sha256/);
 assert.match(sql,/m\.original_job_completed=false/);
 assert.match(sql,/v_step_index in 6\.\.7/);
 assert.match(sql,/and state='AWAITING_EXACT_WORK'/);
 assert.match(sql,/MAINTENANCE_CONTINUITY_STAGE_DRIFT/);
});
