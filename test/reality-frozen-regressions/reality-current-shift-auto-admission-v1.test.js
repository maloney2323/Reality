// Frozen, independently executed acceptance for the currently missing
// weekly-investigation -> same owner-authorized shift ORIGINAL handoff.
import test from 'node:test';
import assert from 'node:assert/strict';
import {runAuthorizedShiftSourceRepairAutoTrigger}
 from '../../src/reality-governed-auto-trigger-v1.0.js';
const shift='9460cfff-937a-4105-9093-2e41ab39a950';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const source='https://github.com/maloney2323/Reality/issues/185';
const proof='sha256:'+'b'.repeat(64);
const graph={status:'UNIFIED_OWNER_JOB_CONTROL_READY',
 shift_id:shift,owner_id:owner,
 plan_fingerprint:'sha256:'+'a'.repeat(64),
 jobs:[{source_ref:source,source_step_index:3,
  original_kind:'SOURCE_REVIEW_NOT_YET_AN_EXECUTABLE_ORIGINAL',
  original_work_id:null,phase:'NOT_ADMITTED',
  source_proof_sha256:proof,independent_source_proof_verified:true}]};
const investigation={source_ref:source,issue_number:185,
 employee:'Riley',investigation_receipt_ref:
 'supabase:weekly_employee_investigation_receipts_v1:'+
 'e84de330-6b52-43ae-873d-c11893bed74c',
 investigation_status:'CURRENT_SOURCE_INSPECTED_EXACT_TASK_REQUIRES_TEST',
 provider_evidence_sha256:'sha256:'+'c'.repeat(64)};
const failedRun={id:4242424242,status:'completed',conclusion:'failure',
 head_sha:'d'.repeat(40),
 head_repository:{full_name:'maloney2323/Reality'},
 html_url:'https://github.com/maloney2323/Reality/actions/runs/4242424242',
 name:'Reality current-shift original qualification acceptance'};
test('owner-signed source investigation is admitted only with current independent failing acceptance',async()=>{
 let claims=0;
 const result=await runAuthorizedShiftSourceRepairAutoTrigger({
  graph,investigation,
  independentFrozenFailure:{run:failedRun,
   test_path:'test/reality-frozen-regressions/reality-current-shift-auto-admission-v1.test.js',
   test_sha256:'e'.repeat(64),source_verified:true,failed_test_verified:true,
   failure_signature:'CURRENT_SHIFT_AUTO_ADMISSION_MISSING'},
  admit:async request=>{
   claims++;
   assert.equal(request.p_source_ref,source);
   assert.equal(request.p_shift_id,shift);
   assert.equal(request.p_owner_id,owner);
   assert.equal(request.p_frozen_failure_run_id,4242424242);
   return {status:'EXACT_OWNER_SHIFT_REPAIR_ORIGINAL_ADMITTED',
    source_ref:source,shift_id:shift,owner_id:owner,
    original_work_id:'work:'+'f'.repeat(32),
    installation_authorized:false,production_changed:false,
    original_job_completed:false};
  }
 });
 assert.equal(result.status,'EXACT_OWNER_SHIFT_REPAIR_ORIGINAL_ADMITTED');
 assert.equal(result.original_work_id,'work:'+'f'.repeat(32));
 assert.equal(claims,1);
});
test('no failed current acceptance or mismatched source means no admission',async()=>{
 let admitted=0;
 const admit=async()=>{admitted++;throw Error('should not admit')};
 await assert.rejects(()=>runAuthorizedShiftSourceRepairAutoTrigger({
  graph:{...graph,jobs:[]},investigation,
  independentFrozenFailure:{run:failedRun,test_path:'x',test_sha256:'e'.repeat(64),
   source_verified:true,failed_test_verified:true,
   failure_signature:'CURRENT_SHIFT_AUTO_ADMISSION_MISSING'},admit}),/AUTO_TRIGGER_/);
 await assert.rejects(()=>runAuthorizedShiftSourceRepairAutoTrigger({
  graph,investigation,
  independentFrozenFailure:{run:{...failedRun,conclusion:'success'},
   test_path:'test/reality-frozen-regressions/reality-current-shift-auto-admission-v1.test.js',
   test_sha256:'e'.repeat(64),source_verified:true,
   failed_test_verified:true,
   failure_signature:'CURRENT_SHIFT_AUTO_ADMISSION_MISSING'},admit}),/AUTO_TRIGGER_/);
 assert.equal(admitted,0);
});
